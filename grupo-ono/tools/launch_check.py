#!/usr/bin/env python3
"""Grupo ONO launch gate (design brief, section 8.6).

Run from the repo root or from inside grupo-ono:

    python3 grupo-ono/tools/launch_check.py --pre    # report only, always exits 0
    python3 grupo-ono/tools/launch_check.py --prod   # exits 1 while anything blocks launch

Blocking checks (--prod fails on any of them):
  * class="todo" (owner placeholder), "LAUNCH:" or "[DOMAIN]" in any *.html
  * the same image twice on one page: one img/ file or img/d/<slot>-<w> slot used by two
    <img>/<picture> elements, or two img/ files whose 16x16 greyscale thumbnails differ
    by a mean of less than 2 (0-255 scale); referenced img/ files must exist and open
  * any <img> without alt, width or height
  * any inline style attribute, fonts.googleapis / fonts.gstatic, a <text> element
    inside an <svg> (pages and *.svg files), or a <script src> in index.html
  * the private address that must never be published (brief, rule 2.5), in any site file

Everything else (OWNER and LEGAL notes, the opening-window review list, hygiene
warnings) is reported but never blocks. Standard library plus Pillow.
"""

import argparse
import bisect
import datetime as dt
import html
import os
import re
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

try:
    from PIL import Image, ImageOps
except ImportError:  # reported as a blocking problem by the duplicate check
    Image = None

SITE = Path(__file__).resolve().parent.parent
SKIP_TOP_DIRS = {"tools", "node_modules"}
TEXT_EXTS = {".html", ".css", ".js", ".svg", ".txt", ".md", ".toml", ".json",
             ".webmanifest", ".xml"}
TEXT_NAMES = {"_redirects", "_headers"}
NO_JS_PAGES = {"privacy.html", "thanks.html", "404.html"}

HASH_SIZE = 16          # thumbnail edge, px
DUP_THRESHOLD = 2.0     # mean absolute difference on 0-255 greyscale
OWNER_NEAR = 30         # lines between a placeholder and its OWNER comment
REVIEW_NEAR = 3         # lines between an opening-window date and its REVIEW comment
# Assembled so that this file never contains the address it guards against.
PRIVATE_NEEDLE = "jose" + "manuel"

# Image slot manifest shared with the derivative pipeline: img/d/<slot>-<width>.{avif,webp,jpg}
SLOTS = {
    "w-ono": "img/camp-ono-rojo.jpg, cropped",
    "w-cs": "img/puerta.jpg, cropped",
    "ono-main": "img/art/ono-anatomia-oni-tuna.jpg",
    "p-green-oni": "img/art/ono-oni-green-oni.jpg",
    "p-skin-tuna": "img/art/ono-skin-tuna.jpg",
    "p-waves": "img/art/ono-grabados-waves.jpg",
    "arch": "img/slvj-salon.jpg",
    "door-dom": "img/dom-galgo2.jpg",
    "door-kan": "img/kan-steak.jpg",
    "door-slvj": "img/slvj-neon.jpg, cropped",
    "door-onoctg": "img/art/ono-sellos-oni.jpg",
    "p-mosaico": "img/art/mosaico-jaguar.jpg",
    "p-miniatura": "img/art/miniatura-the-coupe.jpg",
    "p-rituales": "img/art/rituales-peacock.jpg",
    "p-tipografia": "img/art/tipografia-bad-habits.jpg",
    "careers-strip": "img/kanibal-salon.jpg",
    "logo-salvaje": "img/logo-salvaje-oro.png",
    "logo-ono-bone": "img/logo-ono.png, recoloured bone",
    # WebP fallbacks re-encoded at q55 under new names (img/d is cached immutable)
    "p-waves2": "img/art/ono-grabados-waves.jpg, WebP",
    "door-kan2": "img/kan-steak.jpg, WebP",
    "p-skin-tuna2": "img/art/ono-skin-tuna.jpg, WebP",
    "p-rituales2": "img/art/rituales-peacock.jpg, WebP",
    "p-tipografia2": "img/art/tipografia-bad-habits.jpg, WebP",
}
DERIV_RE = re.compile(r"^img/d/(?P<slot>.+)-(?P<w>\d+)\.(?P<ext>avif|webp|jpe?g|png)$", re.I)
EXT_RANK = {"jpg": 0, "jpeg": 0, "png": 1, "webp": 2, "avif": 3}

CHECKS = [
    ("todo", 'Owner placeholders still on the page (class="todo")'),
    ("launch", "LAUNCH: blocks still commented out"),
    ("domain", "[DOMAIN] placeholders"),
    ("dupes", "Same image twice on a page"),
    ("imgattr", "<img> missing alt, width or height"),
    ("style", "Inline style attributes"),
    ("gfonts", "Google Fonts references"),
    ("svgtext", "<text> inside <svg>"),
    ("script", "<script src> in index.html"),
    ("private", "Private address that must never be published (brief 2.5)"),
]

OPEN_TAG_RE = re.compile(r"<([a-zA-Z][\w:-]*)(\s[^<>]*)?>", re.S)
CLASS_RE = re.compile(r"""(?<![\w-])class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))""", re.I)
COMMENT_RE = re.compile(r"<!--(.*?)-->", re.S)
REVIEW_RE = re.compile(r"^REVIEW\s+(\d{4}-\d{2}-\d{2})")
WINDOW_RE = re.compile(r"Nov(?:–|&ndash;|&#8211;|&#x2013;)Dec 2026|November(?:–|&ndash;|&#8211;|&#x2013;)December 2026")
GFONTS_RE = re.compile(r"fonts\.(?:googleapis|gstatic)\.com", re.I)
STALE_COPY = [  # brief 2.3 and the content checklist in section 11
    (re.compile(r"until 1 ?am", re.I), '"Until 1 am"'),
    (re.compile(r"(?<![\w-])soon(?![\w-])", re.I), '"soon"'),
    (re.compile(r"Tuna, eel"), 'the unconfirmed fish list "Tuna, eel, ..."'),
    (re.compile(r"ono-atun|ono-oni-red-oni|slvj-grupo|look-twice"), "a dropped image"),
]


def shorten(text, limit=110):
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


class Doc:
    """A text file with fast offset-to-line lookup."""

    def __init__(self, path, root):
        self.path = path
        self.rel = path.relative_to(root).as_posix()
        self.raw = path.read_text(encoding="utf-8", errors="replace")
        self.starts = [0] + [m.end() for m in re.finditer("\n", self.raw)]
        self.lines = self.raw.split("\n")

    def line(self, pos):
        return bisect.bisect_right(self.starts, pos)

    def text_at(self, line):
        return self.lines[line - 1] if 0 < line <= len(self.lines) else ""


class PageParser(HTMLParser):
    """Collects images, inline styles, scripts and SVG text elements with line numbers."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.imgs, self.uses, self.styles, self.svg_text, self.scripts = [], [], [], [], []
        self._svg_depth = 0
        self._picture = None

    @staticmethod
    def _first_candidate(srcset):
        first = (srcset or "").strip().split(",")[0].strip()
        return first.split()[0] if first else None

    def _start(self, tag, attrs, self_closing):
        line = self.getpos()[0]
        a = {k: v for k, v in attrs}
        if "style" in a:
            self.styles.append((line, tag))
        if tag == "svg":
            if not self_closing:
                self._svg_depth += 1
        elif tag == "text" and self._svg_depth:
            self.svg_text.append(line)
        if tag == "script" and "src" in a:
            self.scripts.append((line, a.get("src") or ""))
        if tag == "picture" and not self_closing:
            self._picture = (line, [])
        elif tag == "source" and self._picture is not None:
            ref = self._first_candidate(a.get("srcset"))
            if ref:
                self._picture[1].append(ref)
        elif tag == "img":
            self.imgs.append((line, a))
            refs = [r for r in (a.get("src"), self._first_candidate(a.get("srcset"))) if r]
            if self._picture is not None:
                self._picture[1].extend(refs)
            elif refs:
                self.uses.append((line, refs))

    def handle_starttag(self, tag, attrs):
        self._start(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._start(tag, attrs, True)

    def handle_endtag(self, tag):
        if tag == "svg" and self._svg_depth:
            self._svg_depth -= 1
        elif tag == "picture" and self._picture is not None:
            if self._picture[1]:
                self.uses.append(self._picture)
            self._picture = None


def walk(root, exts=None, names=()):
    """Yield site files, skipping dot-folders and the top-level tools/ folder."""
    for dirpath, dirnames, filenames in os.walk(root):
        here = Path(dirpath)
        dirnames[:] = sorted(d for d in dirnames if not d.startswith(".")
                             and not (here == root and d in SKIP_TOP_DIRS))
        for name in sorted(filenames):
            p = here / name
            if (exts and p.suffix.lower() in exts) or name in names:
                yield p


def resolve(ref, page, root):
    """Map an src/srcset URL to (path relative to the site, absolute path), or None."""
    parts = urlsplit(ref.strip())
    if parts.scheme or parts.netloc or not parts.path:
        return None
    path = unquote(parts.path)
    base = root if path.startswith("/") else page.parent
    full = Path(os.path.normpath(base / path.lstrip("/")))
    try:
        return full.relative_to(root).as_posix(), full
    except ValueError:
        return None


def slot_label(ident):
    kind, name = ident
    if kind == "slot":
        src = SLOTS.get(name)
        return f"img/d/{name}-*" + (f" (from {src})" if src else "")
    return name


def thumbnail(path):
    """16x16 greyscale thumbnail (area average) as 256 bytes; transparency over white."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
            im = im.convert("RGBA")
            ground = Image.new("RGBA", im.size, (255, 255, 255, 255))
            ground.alpha_composite(im)
            im = ground
        return im.convert("L").resize((HASH_SIZE, HASH_SIZE), Image.Resampling.BOX).tobytes()


def mean_diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)


def check_images(doc, parser, root, problems, thumbs):
    """Duplicate images within one page, plus missing or unreadable img/ files."""
    ident_lines = defaultdict(list)   # identity -> lines of the <img>/<picture> uses
    ident_files = defaultdict(set)    # identity -> existing files referenced for it
    for line, refs in parser.uses:
        seen = set()
        for ref in refs:
            hit = resolve(ref, doc.path, root)
            if not hit or not hit[0].startswith("img/"):
                continue
            rel, full = hit
            if not full.is_file():
                problems["dupes"].append((doc.rel, line, f"referenced file is missing: {rel}"))
                continue
            m = DERIV_RE.match(rel)
            ident = ("slot", m["slot"]) if m else ("file", rel)
            ident_files[ident].add(full)
            if ident not in seen:
                seen.add(ident)
                ident_lines[ident].append(line)

    for ident, lines in ident_lines.items():
        if len(lines) > 1:
            where = ", ".join(str(n) for n in lines)
            problems["dupes"].append((doc.rel, lines[1],
                                      f"{slot_label(ident)} is shown {len(lines)} times (lines {where})"))

    if Image is None:
        if ident_lines:
            problems["dupes"].append((doc.rel, 0, "Pillow is not installed (pip install Pillow); "
                                                  "near-duplicate check not run"))
        return

    def pick(files):  # prefer the largest JPEG/PNG rendition of a slot
        def key(p):
            m = DERIV_RE.match(p.relative_to(root).as_posix())
            ext = p.suffix.lower().lstrip(".")
            return (EXT_RANK.get(ext, 9), -int(m["w"]) if m else 0)
        return sorted(files, key=key)[0]

    hashed = []
    for ident in ident_lines:
        path = pick(ident_files[ident])
        if path.suffix.lower() == ".svg":
            continue
        if path not in thumbs:
            try:
                thumbs[path] = thumbnail(path)
            except Exception as exc:  # noqa: BLE001 - any decode failure blocks
                thumbs[path] = exc
        if isinstance(thumbs[path], Exception):
            problems["dupes"].append((doc.rel, ident_lines[ident][0],
                                      f"cannot open {path.relative_to(root).as_posix()}: {thumbs[path]}"))
            continue
        hashed.append((ident, thumbs[path]))

    for i, (a, ta) in enumerate(hashed):
        for b, tb in hashed[i + 1:]:
            if set(ident_lines[a]) & set(ident_lines[b]):
                continue  # alternatives inside one <picture>
            d = mean_diff(ta, tb)
            if d < DUP_THRESHOLD:
                la, lb = ident_lines[a][0], ident_lines[b][0]
                problems["dupes"].append((doc.rel, max(la, lb),
                                          f"{slot_label(a)} (line {la}) and {slot_label(b)} (line {lb}) "
                                          f"look like the same picture (mean difference {d:.2f} < {DUP_THRESHOLD:g})"))


def scan(root):
    problems = defaultdict(list)   # check id -> [(file, line, message)]
    todos = []                     # (file, line, text, owner note or None)
    notes = []                     # (file, line, text): OWNER / LEGAL comments
    reviews = []                   # (file, line, date)
    window = []                    # (file, line, snippet, has REVIEW nearby)
    warnings = []                  # (file, line, message)
    today = dt.date.today()

    pages = [Doc(p, root) for p in walk(root, {".html"})]
    thumbs = {}
    for doc in pages:
        raw = doc.raw

        # Comments: OWNER / LEGAL notes and REVIEW dates.
        owner_lines = []
        for m in COMMENT_RE.finditer(raw):
            body = " ".join(m.group(1).split())
            line = doc.line(m.start())
            if re.match(r"OWNER\b", body) or re.match(r"LEGAL\b", body) or "SIGN-OFF" in body.upper():
                notes.append((doc.rel, line, body))
                if body.startswith("OWNER"):
                    owner_lines.append((line, body))
            r = REVIEW_RE.match(body)
            if r:
                reviews.append((doc.rel, line, r.group(1)))
                try:
                    if today >= dt.date.fromisoformat(r.group(1)):
                        warnings.append((doc.rel, line, f"review date {r.group(1)} has arrived: "
                                                        "re-check the opening window"))
                except ValueError:
                    warnings.append((doc.rel, line, f"REVIEW comment has an invalid date: {r.group(1)}"))
        review_lines = [ln for f, ln, _ in reviews if f == doc.rel]

        # Owner placeholders: any element whose class list contains "todo".
        for m in OPEN_TAG_RE.finditer(raw):
            c = CLASS_RE.search(m.group(2) or "")
            if not c or "todo" not in next(g for g in c.groups() if g is not None).split():
                continue
            tag, line = m.group(1).lower(), doc.line(m.start())
            close = raw.lower().find(f"</{tag}", m.end(), m.end() + 800)
            inner = raw[m.end(): close if close != -1 else m.end() + 120]
            text = shorten(html.unescape(re.sub(r"<[^>]+>", "", inner)), 90) or "(empty)"
            # Nearest OWNER note, preferring one that names the same thing (address, status, NIT...).
            words = {w for w in re.findall(r"[a-z]{3,}", text.lower())} - {"pending", "from", "owner"}
            near = [(not (words & set(re.findall(r"[a-z]{3,}", body.lower()))), abs(ln - line), ln, body)
                    for ln, body in owner_lines if abs(ln - line) <= OWNER_NEAR]
            owner = min(near)[2:] if near else None
            todos.append((doc.rel, line, text, owner))
            problems["todo"].append((doc.rel, line, text))
            if not re.search(r"\[[^\]]+\]", text):
                warnings.append((doc.rel, line, f"placeholder text is not bracketed: {text}"))
            if owner is None:
                warnings.append((doc.rel, line, f"placeholder has no OWNER comment within {OWNER_NEAR} lines"))

        # Literal markers.
        for needle, key in (("LAUNCH:", "launch"), ("[DOMAIN]", "domain")):
            seen = set()
            for m in re.finditer(re.escape(needle), raw):
                line = doc.line(m.start())
                if line not in seen:
                    seen.add(line)
                    problems[key].append((doc.rel, line, shorten(doc.text_at(line))))
        for line in sorted({doc.line(m.start()) for m in GFONTS_RE.finditer(raw)}):
            problems["gfonts"].append((doc.rel, line, shorten(doc.text_at(line))))

        # Opening window mentions (review on the REVIEW date).
        for m in WINDOW_RE.finditer(raw):
            line = doc.line(m.start())
            has_review = any(abs(ln - line) <= REVIEW_NEAR for ln in review_lines)
            window.append((doc.rel, line, m.group(0).replace("&ndash;", "–"), has_review))
            if not has_review and m.group(0).startswith("Nov") and not m.group(0).startswith("November"):
                warnings.append((doc.rel, line, "\"Nov–Dec 2026\" without a REVIEW comment "
                                                f"within {REVIEW_NEAR} lines"))

        # Copy and files the brief removed (outside comments, which may quote them on purpose).
        uncommented = COMMENT_RE.sub(lambda c: re.sub(r"[^\n]", " ", c.group(0)), raw)
        for rx, label in STALE_COPY:
            for m in rx.finditer(uncommented):
                line = doc.line(m.start())
                warnings.append((doc.rel, line, f"contains {label}: {shorten(doc.text_at(line), 80)}"))

        # Structure: images, inline styles, svg text, scripts.
        parser = PageParser()
        try:
            parser.feed(raw)
            parser.close()
        except Exception as exc:  # noqa: BLE001
            problems["imgattr"].append((doc.rel, 0, f"could not parse the page: {exc}"))
            continue
        for line, a in parser.imgs:
            missing = [k for k in ("alt", "width", "height")
                       if k not in a or (k != "alt" and not (a[k] or "").strip())]
            if missing:
                problems["imgattr"].append((doc.rel, line, f"missing {', '.join(missing)}: "
                                                           f"{shorten(a.get('src') or '(no src)', 70)}"))
        for line, tag in parser.styles:
            problems["style"].append((doc.rel, line, f"<{tag} style=…>"))
        for line in parser.svg_text:
            problems["svgtext"].append((doc.rel, line, "<text> element inside <svg>"))
        for line, src in parser.scripts:
            if doc.rel == "index.html":
                problems["script"].append((doc.rel, line, f'<script src="{src}">'))
            elif doc.rel in NO_JS_PAGES:
                warnings.append((doc.rel, line, f'loads <script src="{src}"> but should ship no JS (brief 8.1)'))
        check_images(doc, parser, root, problems, thumbs)

    # Stylesheets must not pull Google Fonts either.
    for p in walk(root, {".css"}):
        doc = Doc(p, root)
        for line in sorted({doc.line(m.start()) for m in GFONTS_RE.finditer(doc.raw)}):
            problems["gfonts"].append((doc.rel, line, shorten(doc.text_at(line))))

    # Standalone SVG files (logo, favicon): no live text.
    for p in walk(root, {".svg"}):
        doc = Doc(p, root)
        parser = PageParser()
        try:
            parser.feed(doc.raw)
            parser.close()
        except Exception:  # noqa: BLE001
            continue
        for line in parser.svg_text:
            problems["svgtext"].append((doc.rel, line, "<text> element in an SVG file"))

    # The private address, anywhere in the published folder.
    for p in walk(root, TEXT_EXTS, TEXT_NAMES):
        doc = Doc(p, root)
        for m in re.finditer(PRIVATE_NEEDLE, doc.raw, re.I):
            problems["private"].append((doc.rel, doc.line(m.start()),
                                        "remove it; add it only as a Netlify Forms notification recipient"))

    if not pages:
        problems["todo"].append(("(site)", 0, f"no *.html pages found under {root}"))
    return pages, problems, todos, notes, reviews, window, warnings


def by_file(rows):
    """Group (file, line, ...) rows by file, preserving file order and sorting by line."""
    out = defaultdict(list)
    for row in rows:
        out[row[0]].append(row)
    return [(f, sorted(out[f], key=lambda r: r[1])) for f in sorted(out, key=lambda f: (f != "index.html", f))]


def report(root, mode):
    pages, problems, todos, notes, reviews, window, warnings = scan(root)
    today = dt.date.today().isoformat()
    print(f"Grupo ONO launch check · --{mode} · {today}")
    print(f"Site: {root}")
    print(f"Pages ({len(pages)}): {', '.join(d.rel for d in pages) or 'none'}")

    print("\n== BLOCKING: --prod fails while any of these remain ==")
    total = 0
    failed = 0
    for key, title in CHECKS:
        rows = problems.get(key, [])
        total += len(rows)
        failed += bool(rows)
        print(f"\n{'FAIL' if rows else 'pass'}  {title}: {len(rows)}")
        if key == "todo":
            owner = {(f, ln): o for f, ln, _, o in todos}
            for f, items in by_file(rows):
                print(f"  {f}")
                for _, ln, text in items:
                    print(f"    {ln:>5}  {text}")
                    o = owner.get((f, ln))
                    if o:
                        print(f"           owner note, line {o[0]}: {shorten(o[1], 100)}")
            continue
        for f, items in by_file(rows):
            print(f"  {f}")
            for _, ln, msg in items:
                print(f"    {ln:>5}  {msg}" if ln else f"           {msg}")

    print(f"\n== OWNER AND LEGAL NOTES: {len(notes)} (not blocking; settle with the owner, then delete) ==")
    for f, items in by_file(notes):
        print(f"  {f}")
        for _, ln, body in items:
            print(f"    {ln:>5}  {shorten(body, 120)}")

    dates = sorted({d for _, _, d in reviews})
    print(f"\n== OPENING WINDOW: {len(window)} mention(s) of the ONO Cartagena window; "
          f"review on {', '.join(dates) or '2026-12-31'} ==")
    for f, items in by_file(window):
        print(f"  {f}")
        for _, ln, snippet, has_review in items:
            mark = "REVIEW comment nearby" if has_review else "no REVIEW comment nearby"
            print(f"    {ln:>5}  {snippet}  ({mark})")

    print(f"\n== WARNINGS: {len(warnings)} (not blocking) ==")
    for f, items in by_file(warnings):
        print(f"  {f}")
        for _, ln, msg in items:
            print(f"    {ln:>5}  {msg}")

    print("\n== RESULT ==")
    if total == 0:
        print("PASS: nothing blocks the production launch.")
        return 0
    summary = f"{total} blocking problem(s) in {failed} of {len(CHECKS)} checks"
    if mode == "prod":
        print(f"FAIL: {summary}. Fix them, then run --prod again.")
        return 1
    print(f"{summary}. Report only (--pre); --prod would exit 1.")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Grupo ONO launch gate (brief 8.6).")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--pre", action="store_true", help="report problems and exit 0 (default)")
    mode.add_argument("--prod", action="store_true", help="exit 1 if anything blocks the launch")
    ap.add_argument("--root", type=Path, default=SITE, help="site folder (default: %(default)s)")
    args = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(errors="replace")
    except AttributeError:
        pass
    root = args.root.resolve()
    if not root.is_dir():
        ap.error(f"not a folder: {root}")
    return report(root, "prod" if args.prod else "pre")


if __name__ == "__main__":
    sys.exit(main())
