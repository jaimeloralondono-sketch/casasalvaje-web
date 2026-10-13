import os
# Builds favicon.svg, favicon.ico (16/32/48), img/apple-touch-icon.png (180) and img/og-grupo.jpg (1200x630) for grupo-ono/.
import re, sys, io
from playwright.sync_api import sync_playwright
from PIL import Image
SP=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT=os.path.join(os.path.dirname(SP),"grupo-ono")+"/"; TMP=SP+"/tools/icons-tmp/"
PAPER="#F4EFE7"; BLACK="#0B0B0B"
logo=open(SP+"/logo_inline.svg").read()
inner=re.sub(r"^<svg[^>]*>","",logo).replace("</svg>","")
inner=re.sub(r"<title>.*?</title>","",inner)
ono=re.search(r'<g class="ono">.*?</g>',inner).group(0)

# One lattice O pane. Geometry snapped to the pixel grid at 16, 32 and 48px (edges on half pixels at 16, a 1px stroke).
fav='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0B0B0B"/><g fill="none" stroke="#F4EFE7" stroke-width="4"><rect x="18" y="6" width="28" height="52" rx="6"/><path d="M26 6V58M38 6V58"/></g></svg>'
open(OUT+"favicon.svg","w").write(fav+"\n")
# 16px frame: the verticals would merge, so the smallest frame is the pane alone with a slightly heavier stroke
fav16='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0B0B0B"/><g fill="none" stroke="#F4EFE7" stroke-width="%s"><rect x="18" y="8" width="28" height="48" rx="6"/>%s</g></svg>'

# apple touch icon: ONO lattice, ~144px wide on 180, stroke 10 units
s=144/660; vb=180/s
touch=('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="%.2f %.2f %.2f %.2f">'
       '<rect x="-1000" y="-1000" width="3000" height="3000" fill="%s"/>'
       '<g fill="none" stroke="%s" stroke-width="10" stroke-linejoin="round">%s</g></svg>')%(395-vb/2,459-vb/2,vb,vb,BLACK,PAPER,ono)
# share card: whole lockup, kept inside the central square so square crops keep it
og=('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="%s"/>'
    '<g transform="translate(600 315) scale(0.82) translate(-395 -422.6)" color="%s" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round">%s</g></svg>')%(BLACK,PAPER,inner)

def shot(page,svg,w,h,path,typ="png"):
    page.set_viewport_size({"width":w,"height":h})
    page.set_content('<html><body style="margin:0;background:transparent">'+svg.replace("<svg ",'<svg style="display:block;width:%dpx;height:%dpx" '%(w,h),1)+'</body></html>')
    kw={"path":path,"omit_background":typ=="png","clip":{"x":0,"y":0,"width":w,"height":h}}
    if typ=="jpeg": kw.update(type="jpeg",quality=88)
    page.screenshot(**kw)

with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    pg=b.new_page(device_scale_factor=1)
    for n in (16,32,48): shot(pg,fav,n,n,TMP+"fav%d.png"%n)
    shot(pg,fav16%("5",""),16,16,TMP+"fav16-pane.png")
    shot(pg,fav16%("4",'<path d="M27 8V56M37 8V56"/>'),16,16,TMP+"fav16-alt.png")
    shot(pg,touch,180,180,TMP+"touch.png")
    shot(pg,og,1200,630,OUT+"img/og-grupo.jpg","jpeg")
    b.close()
fr=[Image.open(TMP+"fav%d.png"%n).convert("RGBA") for n in (48,32,16)]
fr[0].save(OUT+"favicon.ico",format="ICO",sizes=[(48,48),(32,32),(16,16)],append_images=fr[1:])
Image.open(TMP+"touch.png").convert("RGB").save(OUT+"img/apple-touch-icon.png",optimize=True)
print("rendered")
