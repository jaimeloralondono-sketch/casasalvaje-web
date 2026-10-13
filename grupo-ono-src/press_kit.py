# Builds the Grupo ONO press kit into grupo-ono/press/:
#   grupo-ono-press-kit.zip   01-logos, 02-ono, 03-casa-salvaje, the fact sheet and a README
#   grupo-ono-fact-sheet.pdf  the same one-page A4 fact sheet, linked on its own from contact.html#press
# Usage: python3 grupo-ono-src/press_kit.py   (then run build.py, which writes the ZIP size into contact.html)
# Images are copied byte for byte from the repo's highest-resolution files (img/fondos/ for the art);
# only the ONO Cartagena renders are re-encoded, to drop the black letterbox band above each one.
import sys, os, shutil, zipfile, datetime
from PIL import Image
from playwright.sync_api import sync_playwright

SP = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SP) + "/"
OUT = REPO + "grupo-ono/press/"
STAGE = SP + "/press/build/"
KIT = STAGE + "kit/"
INK, PAPER = "#111111", "#F4EFE7"
CREDIT = "Images: courtesy of Grupo ONO"
PRESS_EMAIL = "jaimeloralondono@gmail.com"

# (file in the kit, source in the repo, caption for the README)
ONO = [
 ("ono-red-oni.jpg", "img/fondos/ono-oni-red-oni.jpg", "Unmask your Oni: red Oni mask with a white snake. Campaign art."),
 ("ono-green-oni.jpg", "img/fondos/ono-oni-green-oni.jpg", "Unmask your Oni: green Oni mask. Campaign art."),
 ("ono-oni-masks.jpg", "img/fondos/ono-oni-collection.jpg", "Unmask your Oni: twenty masks on a cream poster. Campaign art."),
 ("ono-beneath-the-skin-tuna.jpg", "img/fondos/ono-skin-tuna.jpg", "Beneath the skin: tattooed tuna. Campaign art."),
 ("ono-tokyo-stamp-oni.jpg", "img/fondos/ono-sellos-oni.jpg", "Tokyo stamps: an Oni mask on a postage stamp. Campaign art."),
 ("ono-engraving-waves.jpg", "img/fondos/ono-grabados-waves.jpg", "Engraving with herons and waves. Campaign art."),
 ("ono-anatomy-ono-roll.jpg", "img/fondos/ono-anatomia-ono-roll.jpg", "Anatomy of a roll: the ONO roll. Campaign art."),
 ("ono-anatomy-salmon-nigiri.jpg", "img/fondos/ono-anatomia-salmon-nigiri.jpg", "Anatomy of a nigiri: king salmon. Campaign art."),
]
RENDERS = [
 ("ono-cartagena-render-bar.jpg", "img/ono-r-barra.jpg", "Render of ONO Cartagena: the bar under the wooden beams."),
 ("ono-cartagena-render-red-room.jpg", "img/ono-r-rojo.jpg", "Render of ONO Cartagena: lit shoji panels and red screens over the DJ booth."),
 ("ono-cartagena-render-samurai.jpg", "img/ono-r-samurai.jpg", "Render of ONO Cartagena: samurai armour in the shoji-panel corridor."),
 ("ono-cartagena-render-geisha.jpg", "img/ono-r-geisha.jpg", "Render of ONO Cartagena: shoji panels and a geisha portrait."),
]
# The client confirmed image releases for the guests in these photos (13 Oct 2026), so the full-room shots are in.
CS = [
# The door image is not marked as a photograph: it has no camera data and may be a render. Add "Photograph." only once
# the client confirms it is one (renders must never pass as photos of the real facade).
 ("casa-salvaje-door.jpg", "img/puerta.jpg", "The wooden door on Calle Santa Teresa with the jaguar plaque."),
 ("casa-salvaje-slvj-table.jpg", "img/slvj-mesa.jpg", "An SLVJ table from above, set with illustrated plates. Photograph."),
 ("casa-salvaje-kanibal-table.jpg", "img/kanibal-mesa.jpg", "A Kanibal table from above, with plates to share. Photograph."),
 ("casa-salvaje-slvj-room.jpg", "img/slvj-salon.jpg", "The SLVJ dining room at night, under the fibre lamps and the neon. Photograph."),
 ("casa-salvaje-slvj-guests.jpg", "img/slvj-grupo.jpg", "Guests at SLVJ. Photograph."),
 ("casa-salvaje-kanibal-room.jpg", "img/kanibal-salon.jpg", "The Kanibal dining room, full, under the paper lamps. Photograph."),
 ("casa-salvaje-map.jpg", "img/mapa.jpg", "The house awaits: illustrated map of the Old City around Casa Salvaje."),
 ("casa-salvaje-after-dark.jpg", "img/fondos/after-dark-bad-habits.jpg", "After dark: a roaring leopard on black. Campaign art."),
 ("casa-salvaje-mosaic-jaguar.jpg", "img/fondos/mosaico-jaguar.jpg", "A mosaic jaguar on green tile, with a glass. Campaign art."),
 ("casa-salvaje-slvj-wild-edition.jpg", "img/fondos/wild-edition-jaguar.jpg", "SLVJ, The Wild Edition: the jaguar issue. Campaign art."),
 ("casa-salvaje-kanibal-steak.jpg", "img/fondos/kanibal-steak.jpg", "Kanibal glyphs: a steak marked in red. Campaign art."),
 ("casa-salvaje-la-domenica-lemon.jpg", "img/fondos/domenica-supersized-lemon.jpg", "La Domenica, Sundays supersized: the lemon. Campaign art."),
]
LOGOS = [
 ("ono-hosomaki-bar-logo.png", "img/logo-ono.png", "ONO Hosomaki Bar logo, black on transparent."),
 ("casa-salvaje-logo-gold.png", "img/logo-salvaje-oro.png", "Casa Salvaje logo, gold on transparent."),
]

def dims(p):
    with Image.open(p) as im: return im.size

def logo_svg(color, viewbox):
    """The site's line logo as a standalone file: explicit colour (no currentColor) and a tight canvas."""
    s = open(SP + "/logo_inline.svg").read()
    s = s.replace('<svg aria-hidden="true" focusable="false" viewBox="60 214 670 400"',
                  f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{viewbox.split()[2]}" height="{viewbox.split()[3]}"', 1)
    assert s.startswith('<svg xmlns'), "logo_inline.svg header changed: update press_kit.py"
    return s.replace("currentColor", color)

shutil.rmtree(STAGE, ignore_errors=True)
for d in ("01-logos", "02-ono", "03-casa-salvaje"): os.makedirs(KIT + d)
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    pg = b.new_page()
    # 1. Tight bounds of the drawing (geometry plus half the 4.5 stroke), with an even 6-unit margin.
    pg.set_content(f'<body style="margin:0">{logo_svg(INK, "60 214 670 400")}</body>')
    bb = pg.evaluate("(()=>{const r=document.querySelector('svg').getBBox();return [r.x,r.y,r.width,r.height]})()")
    m = 2.25 + 6
    vb = f"{bb[0]-m:.2f} {bb[1]-m:.2f} {bb[2]+2*m:.2f} {bb[3]+2*m:.2f}"
    open(KIT + "01-logos/grupo-ono-logo.svg", "w").write(logo_svg(INK, vb) + "\n")
    # 2. PNG renders, 2000 px wide, on transparent
    for name, col in (("grupo-ono-logo-ink.png", INK), ("grupo-ono-logo-paper.png", PAPER)):
        pg.set_viewport_size({"width": 2000, "height": 1400})
        pg.set_content('<html style="background:transparent"><body style="margin:0;background:transparent">'
                       f'<div id="l" style="width:2000px">{logo_svg(col, vb).replace("<svg ", "<svg style=\"display:block;width:100%;height:auto\" ", 1)}</div></body></html>')
        pg.locator("#l").screenshot(path=KIT + "01-logos/" + name, omit_background=True)
    # 3. Fact sheet: the template with the logo inlined, printed to A4
    html = open(SP + "/press/factsheet.html").read().replace("{{LOGO}}", logo_svg("currentColor", vb).replace(' xmlns="http://www.w3.org/2000/svg"', ' aria-hidden="true" focusable="false"'))
    open(SP + "/press/_factsheet.out.html", "w").write(html)
    pg.goto("file://" + SP + "/press/_factsheet.out.html")
    pg.evaluate("document.fonts.ready")
    fams = pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.style)")
    assert any("Cormorant" in f for f in fams) and any("Inter" in f for f in fams), f"fonts not loaded: {fams}"
    pg.pdf(path=KIT + "grupo-ono-fact-sheet.pdf", prefer_css_page_size=True, print_background=True, tagged=True)  # tagged: structure tree and /Lang for screen readers
    b.close()

# 4. Images: byte copies of the originals; the renders lose their black letterbox band (64 px of 490)
for d, rows in (("01-logos", LOGOS), ("02-ono", ONO), ("03-casa-salvaje", CS)):
    for name, src, _ in rows: shutil.copyfile(REPO + src, KIT + d + "/" + name)
for name, src, _ in RENDERS:
    with Image.open(REPO + src) as im:
        g = im.convert("L")
        top = next(y for y in range(im.height) if g.crop((0, y, im.width, y + 1)).getextrema()[1] > 40) + 2  # +2: past the soft edge
        im.crop((0, top, im.width, im.height)).save(KIT + "02-ono/" + name, quality=95, subsampling=0, optimize=True, progressive=True)

# 5. README
def block(d, rows):
    return "\n".join(f"  {n:<40}{'%dx%d' % dims(KIT + d + '/' + n):>11}  {c}" for n, c in [(r[0], r[2]) for r in rows])
lw, lh = dims(KIT + "01-logos/grupo-ono-logo-ink.png")
readme = f"""GRUPO ONO · PRESS KIT

{CREDIT}.
Press contact: {PRESS_EMAIL}
Website: https://grupo-ono.com

grupo-ono-fact-sheet.pdf   One-page fact sheet (A4): who we are, timeline, venues, press.

01-logos
  {'grupo-ono-logo.svg':<40}{'vector':>11}  Grupo ONO logo, ink ({INK}).
  {'grupo-ono-logo-ink.png':<40}{f'{lw}x{lh}':>11}  Grupo ONO logo, ink on transparent.
  {'grupo-ono-logo-paper.png':<40}{f'{lw}x{lh}':>11}  Grupo ONO logo, paper ({PAPER}) on transparent, for dark backgrounds.
{block('01-logos', LOGOS)}

02-ono  ONO: campaign art, and renders of ONO Cartagena
{block('02-ono', ONO)}

  The four files named ono-cartagena-render-*.jpg are RENDERS of ONO Cartagena,
  not photographs. ONO Cartagena opens inside Casa Salvaje in November – December 2026.
{block('02-ono', RENDERS)}

03-casa-salvaje  Casa Salvaje, Cartagena
{block('03-casa-salvaje', CS)}
"""
open(KIT + "README.txt", "w").write(readme)

# 6. ZIP (JPEG and PNG are already compressed: stored, not deflated), and the PDF next to it
zp = OUT + "grupo-ono-press-kit.zip"
if os.path.exists(zp): os.remove(zp)
now = datetime.datetime.now().timetuple()[:6]
with zipfile.ZipFile(zp, "w") as z:
    order = ["README.txt", "grupo-ono-fact-sheet.pdf"] + [d + "/" + f for d in ("01-logos", "02-ono", "03-casa-salvaje") for f in sorted(os.listdir(KIT + d))]
    for d in ("01-logos/", "02-ono/", "03-casa-salvaje/"):
        zi = zipfile.ZipInfo(d, now); zi.external_attr = 0o40755 << 16; z.writestr(zi, "")
    for arc in order:
        zi = zipfile.ZipInfo(arc, now); zi.external_attr = 0o644 << 16
        zi.compress_type = zipfile.ZIP_STORED if arc.endswith((".jpg", ".png")) else zipfile.ZIP_DEFLATED
        z.writestr(zi, open(KIT + arc, "rb").read())
shutil.copyfile(KIT + "grupo-ono-fact-sheet.pdf", OUT + "grupo-ono-fact-sheet.pdf")
size = os.path.getsize(zp)
print(f"zip {size} bytes ({size/1e6:.1f} MB), {len(order)} files; pdf {os.path.getsize(OUT + 'grupo-ono-fact-sheet.pdf')} bytes; logo viewBox {vb}")
