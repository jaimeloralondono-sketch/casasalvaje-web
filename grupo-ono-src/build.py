# Builds the pages in grupo-ono/ from the templates in tpl/ (shared header and footer, inline SVG logo).
# Usage: python3 grupo-ono-src/build.py   (run press_kit.py first if the press kit changed)
import sys, re, os
SP=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(os.path.dirname(SP),"grupo-ono")+"/"
logo=open(SP+"/logo_inline.svg").read(); anim=open(SP+"/logo_anim.svg").read()
head=open(SP+"/tpl/_head.html").read(); foot=open(SP+"/tpl/_foot.html").read()
# The live origin: og:url, canonical and og:image must be absolute (scrapers ignore relative paths).
SITE="https://grupo-ono.com"
def canon(p): return f'<link rel="canonical" href="{SITE}/{p}">\n'
def og(t,d,p):
    return ('<meta property="og:type" content="website">\n<meta property="og:site_name" content="Grupo ONO">\n'
            f'<meta property="og:title" content="{t}">\n<meta property="og:description" content="{d}">\n<meta property="og:url" content="{SITE}/{p}">\n{canon(p)}'
            f'<meta property="og:image" content="{SITE}/img/og-grupo.jpg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="The Grupo ONO line logo on black">\n<meta property="og:locale" content="en_US">\n<meta name="twitter:card" content="summary_large_image">\n')
pages={
 "index.html":("Grupo ONO · Hospitality in Bogotá and Cartagena","Grupo ONO is the house behind ONO Hosomaki Bar in Bogotá and Casa Salvaje in Cartagena: La Domenica, Kanibal, SLVJ and ONO Cartagena (opening late 2026).",og('Grupo ONO','The house behind ONO Hosomaki Bar in Bogotá and Casa Salvaje in Cartagena.',''),""),
 "careers.html":("Careers · Grupo ONO","Kitchen, bar, floor and office roles in Bogotá and Cartagena. Send your CV to Grupo ONO.",og('Work with us · Grupo ONO','Kitchen, bar, floor and host roles in Bogotá and Cartagena. Now hiring for ONO Cartagena.','careers.html'),' class="page"'),
 "contact.html":("Contact · Grupo ONO","Press, partnerships, private events and suppliers at Grupo ONO.",og('Press, partnerships &amp; events · Grupo ONO','Interviews, brand collaborations, private events and suppliers.','contact.html'),' class="page"'),
 "privacy.html":("Personal data policy · Grupo ONO","Grupo ONO personal data policy.",canon('privacy.html'),' class="page"'),
 "thanks.html":("Thank you · Grupo ONO","Thank you. It’s with us.",'<meta name="robots" content="noindex">\n',' class="page"'),
}
# The four doors on the home page set each Casa Salvaje world in its own lettering (as on casa-salvaje.com).
# A separate request, because text= subsets every family in it: only the letters of the three names, about 10 KB.
# If a door name changes, update text= to cover its letters (space and capitals included; Kanibal is set in
# uppercase by CSS, so its capitals A N I B L must be in the subset too).
DOOR_FONTS=('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500'
            '&family=Marcellus+SC&family=Instrument+Serif&text=La%20DomenicKblSVJANIB&display=swap">\n')
extra_head={"index.html":DOOR_FONTS}
# The press kit (built by press_kit.py into grupo-ono/press/): contact.html shows the ZIP's size, read from the file itself.
KIT=OUT+"press/grupo-ono-press-kit.zip"
if not os.path.exists(KIT): sys.exit("missing "+KIT+": run press_kit.py first")
mb=os.path.getsize(KIT)/1e6; KIT_SIZE=("%.1f MB"%mb if mb<9.95 else "%d MB"%round(mb))  # decimal MB, as macOS and browsers show it
# {# ... #} notes in the templates are for whoever edits them next (e.g. the press kit slot on contact): never published.
def strip_notes(s): return re.sub(r"[ \t]*\{#.*?#\}[ \t]*\n?", "", s, flags=re.S)
for f,(t,d,meta,bc) in pages.items():
    body=strip_notes(open(SP+"/tpl/"+f).read()).replace("{{LOGO_ANIM}}",anim).replace("{{PRESS_KIT_SIZE}}",KIT_SIZE)
    h=head.replace("{{TITLE}}",t).replace("{{DESC}}",d).replace("{{META}}",meta).replace("{{BODYCLASS}}",bc).replace("{{LOGO}}",logo).replace("{{FONTS_EXTRA}}",extra_head.get(f,""))
    h=h.replace('href="%s">'%f,'href="%s" aria-current="page">'%f)  # marks Careers/Contact in the menu and the sheet
    open(OUT+f,"w").write(h+"\n"+body+"\n"+foot.replace("{{LOGO}}",logo))
print("ok")
