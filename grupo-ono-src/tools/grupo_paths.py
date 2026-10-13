# Outline "GRUPO" in Cormorant Garamond 500, size 52, baseline 276, 38 units tracking between letters (none after the last),
# centred on x=395 by ink bounds. Prints the <path d> string.
import sys, uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
FONT=sys.argv[1]; SIZE=52; BASE=276; TRACK=38; CX=395
tt=TTFont(FONT); upm=tt['head'].unitsPerEm; s=SIZE/upm; gs=tt.getGlyphSet()
blob=hb.Blob.from_file_path(FONT); face=hb.Face(blob); font=hb.Font(face)
buf=hb.Buffer(); buf.add_str("GRUPO"); buf.guess_segment_properties()
hb.shape(font,buf,{"kern":True,"liga":False})
order=tt.getGlyphOrder()
glyphs=[]; x=0.0
for i,(info,pos) in enumerate(zip(buf.glyph_infos,buf.glyph_positions)):
    name=order[info.codepoint]; glyphs.append((name,x+pos.x_offset*s)); x+=pos.x_advance*s
    if i<len(buf.glyph_infos)-1: x+=TRACK
    print(name,pos.x_advance, file=sys.stderr)
# ink bounds
xmin=1e9;xmax=-1e9;ymin=1e9;ymax=-1e9
for name,gx in glyphs:
    bp=BoundsPen(gs); gs[name].draw(bp)
    if bp.bounds:
        a,b,c,d=bp.bounds; xmin=min(xmin,gx+a*s); xmax=max(xmax,gx+c*s); ymin=min(ymin,d); ymax=max(ymax,b)
shift=CX-(xmin+xmax)/2
print("ink width %.2f, shift %.2f, ink x %.2f..%.2f"%(xmax-xmin,shift,xmin+shift,xmax+shift),file=sys.stderr)
sp=SVGPathPen(gs, ntos=lambda v: ("%.1f"%v).rstrip("0").rstrip("."))
for name,gx in glyphs:
    tp=TransformPen(sp,(s,0,0,-s,gx+shift,BASE)); gs[name].draw(tp)
print(sp.getCommands())
