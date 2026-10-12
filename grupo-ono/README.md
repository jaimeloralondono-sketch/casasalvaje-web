# Grupo ONO · website and launch checklist

Static site for Grupo ONO, the hospitality group behind ONO Hosomaki Bar (Bogotá) and Casa Salvaje (Cartagena). It is plain HTML and CSS with no build step, written in English only, and hosted on Netlify with Netlify Forms. Everything lives in this `grupo-ono/` folder. The repository root is the separate Casa Salvaje site, so leave it alone.

Pages: `index.html`, `careers.html`, `contact.html`, `privacy.html`, `thanks.html` and `404.html`. Shared files: `grupo.css`; `pages.css`; `print.css`; `forms.js` (careers and contact only); `fonts/` (self-hosted Archivo and Cormorant Garamond, with `OFL.txt`); `img/` (originals, see below); `img/d/` (responsive derivatives); `tools/launch_check.py`; `_redirects`; `netlify.toml`.

### Stylesheets

The brief asks for one `grupo.css` of at most 20 KB (6 KB gzip). The full component set does not fit that budget, so the CSS is split three ways:

- `grupo.css`: tokens, base, header, footer, elevation and every home-page component, plus reduced-motion and forced-colours rules. Every page loads it. Keep it at or under 20,480 bytes raw (`wc -c grupo-ono/grupo.css`).
- `pages.css`: the inner-page parts (page heads, prose, side columns, the thanks and 404 layouts, and the C20 form system). Only careers, contact, privacy, thanks and 404 load it, after `grupo.css`.
- `print.css`: the print fact sheet (brief 8.3), linked on every page with `media="print"`, so it never blocks rendering. The desktop grid in `grupo.css` and `pages.css` is declared for `(min-width:900px), print`, so paper reuses the desktop columns. On paper the home page leaves out the navigation, the hero Key, photos and posters (with their captions), the press-kit table (its download links cannot be followed on paper) and the CTA buttons (their links repeat the directory). It prints on 3 A4 or Letter pages.

### Images

- `img/` holds three kinds of original. First, the press-kit files that the home page links for download. Second, `art/guest-list-heaven-has-a-guest-list.jpg`, kept for the press kit (brief 6.2) and now listed in it. Third, the masters that the derivatives in `img/d/` are cut from. Nothing links the masters, but they are kept on purpose, so re-exports can be made from them: `art/ono-grabados-waves.jpg`, `art/ono-sellos-oni.jpg`, `art/rituales-peacock.jpg`, `art/tipografia-bad-habits.jpg`, `kanibal-salon.jpg`, `slvj-neon.jpg` and `slvj-salon.jpg`. The last three show diners, so they stay out of the press kit until releases arrive (section 1, item 9).
- The WebP fallbacks for the slots whose AVIF uses quality 42 (`p-waves`, `door-kan`, `p-skin-tuna`, `p-rituales`, `p-tipografia`) were re-encoded at WebP quality 55, method 6. Because `img/d/` is cached as immutable, they live under new names: `img/d/<slot>2-<width>.webp`. AVIF and JPEG keep the original slot names.
- `img/d/logo-ono-bone-192.png` is the ONO brush logo, pre-coloured bone (#EFE4D6) on transparent, as a lazy image. It replaces the old CSS mask, which always loaded eagerly. In forced-colours mode the same file is used as a mask, so the logo draws in `CanvasText`.
- Only the two hero windows are eager with `fetchpriority="high"` on the home page. The exception is the careers strip (`careers.html`): it is that page's LCP image, so it stays eager and also carries `fetchpriority="high"`.
- `fonts/cormorant-garamond-600-caps.woff2` holds only capitals, digits and punctuation (7.5 KB). Every Cormorant use on the site is uppercase. If Cormorant is ever used for lowercase text, re-subset it from the Google Fonts original.

The site never shows an invented fact. Anything still unknown appears on the page as `<mark class="todo">[…]</mark>`, with an `<!-- OWNER: … -->` comment next to it.

## Preview locally

```sh
python3 -m http.server 8765 --directory grupo-ono   # from the repo root
```

Open <http://localhost:8765/>. Links are root-relative (`/careers.html`, `/#houses`), so the server must be rooted at `grupo-ono`. Form POSTs fail on this server, as expected. Test the forms on a Netlify deploy preview instead.

## Netlify

- **Site settings.** Base directory `grupo-ono`, no build command. `netlify.toml` sets publish `.`.
- **Forms.** `careers` (with an optional PDF CV) and `contact` post straight to Netlify Forms and land on `/thanks.html`. If the Forms page lists no forms after the first deploy, enable form detection there and redeploy.
- **`_redirects`.** Keeps `/thanks`, and answers `/tools/*` and `/README.md` with the 404 page, because `publish = "."` would otherwise serve them.
- **Caching.** `/fonts/*` and `/img/d/*` are cached for a year as `immutable`. Never overwrite one of those files with new content. Save the new version under a new name (for example `img/d/w-ono2-240.avif`) and update the HTML.

## Launch gate

```sh
python3 grupo-ono/tools/launch_check.py --pre    # report only, exits 0
python3 grupo-ono/tools/launch_check.py --prod   # exits 1 while anything blocks launch
```

It runs from the repo root or from inside `grupo-ono`, and needs Python 3.7+ and Pillow (`python3 -m pip install Pillow`).

`--prod` fails on any of the following:

- `class="todo"`, `LAUNCH:` or `[DOMAIN]` in any page
- the same image twice on one page (same file or derivative slot, or a 16×16 greyscale mean difference below 2), or a missing image file
- an `<img>` without `alt`, `width` or `height`
- an inline `style` attribute, Google Fonts, a `<text>` inside an `<svg>`, or a `<script src>` in `index.html`
- the private address from rule 10 below, anywhere in the folder

The report lists every placeholder and every OWNER or LEGAL note with its file and line, plus each mention of the opening window. `--prod` must exit 0 before the production domain goes live.

## 1. Owner placeholders (these block the production launch)

The site can run on a preview URL until all of these are answered. Run `--pre` to see exactly where each one sits.

1. **ONO Bogotá:** street address, website (if any), and 3–5 photos at least 2000px on the long edge. The address goes in the directory, the ONO chapter, the footer and the JSON-LD. The photos replace the left hero window and the ONO chapter panel.
2. **Legal:** company legal name(s) and NIT, registered address, data-rights email, phone, notification inbox or provider, CV and message retention in months, effective date, database validity, and whether each venue is a separate legal entity. These fill `privacy.html`, the consent text on both forms, the contact routing and the footer legal line. `privacy.html` also needs legal sign-off from Juan David Castro.
3. **La Domenica's status:** the facts say Casa Salvaje opened with four worlds on 25 Sep 2026, but casa-salvaje.com says "Coming soon".
4. **Production domain:** grupo-ono.com, grupoono.com and .com.co have all come up. The confirmed domain fills the LAUNCH blocks, the JSON-LD and `_redirects` (section 2).
5. **People:** confirm that the Finance (Sebastián Patiño) and Legal (Juan David Castro) names may be published.
6. **Group press and partnerships email:** none has been provided yet (`contact.html`).
7. **ONO Cartagena opening team:** the confirmed roles (`careers.html`).
8. **Hosomaki list:** bring back "Tuna, eel, salmon, hamachi and wagyu" only if it is confirmed for Bogotá.
9. **Images:** releases for the photos that show diners (`slvj-salon`, `kanibal-salon`; until then they stay out of the press kit), plus high-res originals (`slvj-salon` and `puerta` at 2560px or wider, and the original campaign files).
10. **Personal Gmail address from the brief:** confirm the person's role. It is deliberately not written here, and the gate blocks it anywhere in this folder.
    - If it is the form inbox, add it as a Netlify Forms notification recipient (section 3).
    - If it is a person for the People ledger, supply their name, role and consent.
    - Either way, it is never published on the site.
11. **Booking links:** direct CoverManager and Fourvenues URLs, if guests should bypass casa-salvaje.com.

Fill each `<mark class="todo">` with the confirmed fact, then delete the mark and its OWNER comment.

## 2. Domain and the LAUNCH block

Every page head carries a commented `<!-- LAUNCH: … -->` block containing the canonical, `og:url`, an absolute `og:image` (`/img/og-grupo-ono.jpg`, 1200×630), `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image`. Once the domain is confirmed:

1. In Netlify, under Domain management, add the domain and make it the **primary domain**. Use one origin everywhere: `https://www.<domain>` or `https://<domain>`.
2. In each page, replace `[DOMAIN]` with that host. Then delete the `<!-- LAUNCH: …` line and its closing `-->` so the tags go live. Each canonical points to its own page: `/`, `/careers.html`, `/contact.html`, `/privacy.html`.
3. In the JSON-LD on `index.html`, `careers.html` and `contact.html`, make the relative IRIs absolute (`/#org`, `/`, `/img/logo-grupo-ono-512.png`, `/#ono-bogota`, `/#casa-salvaje`).
4. In `_redirects`, uncomment the template: `https://<site>.netlify.app/*  https://www.<domain>/:splat  301!`.
5. Run `--prod` until it exits 0, then deploy.
6. After the deploy, check the previews in the Facebook Sharing Debugger and the LinkedIn Post Inspector, run the JSON-LD through validator.schema.org, and send both forms once from the live site.

## 3. Form notifications

Netlify stores every submission, but nobody is emailed until this is set up. In the Netlify UI, go to **Site configuration → Notifications → Emails → New form submission**. Add one email notification for the form `careers` and one for `contact`, both sent to the confirmed inbox. This is configuration only: the address never goes into the code. Then update the privacy policy's "notification inbox / provider" placeholder to match.

## 4. Review on 2026-12-31: "Nov–Dec 2026"

ONO Cartagena's opening is announced as "Nov–Dec 2026" (written "November–December 2026" in running text). Every mention carries `<!-- REVIEW 2026-12-31: opening window -->`, and `--pre` lists them all with file and line. It also starts warning once that date arrives.

By 2026-12-31, or as soon as the date is confirmed:

- Replace each mention with the real date, written like "25 Sep 2026", or with a new window.
- Switch "□ Opening" to "■ Open" where it applies.
- Update the REVIEW comments.
