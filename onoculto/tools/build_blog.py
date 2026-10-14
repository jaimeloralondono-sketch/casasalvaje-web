#!/usr/bin/env python3
"""Genera el blog de ONO (blog/*.html en español, blog/en/*.html en inglés), sitemap.xml y robots.txt.

Uso, desde la raíz del repo o desde onoculto/:  python3 onoculto/tools/build_blog.py
El contenido vive en tools/blog_content.py.
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from blog_content import POSTS, LINKS, DATE, DATE_ES, DATE_EN  # noqa: E402

SITE = "https://onoculto.com"
BOOK = "https://restaurante.covermanager.com/ono/"
IG = "https://www.instagram.com/ono.culto/"
SPOTIFY = "https://open.spotify.com/playlist/475mlQSTVBA7feZYBj5Mlt"
E = html.escape

T = {
 "es": {"dir": "blog/", "up": "../", "blog": "Blog", "home": "Inicio", "book": "Reservar", "read": "Sigue leyendo",
        "date": DATE_ES, "other": "en", "other_label": "English", "all": "Ver todo el blog",
        "idx_title": "Blog de ONO: sushi, hosomaki, música y noche en Bogotá",
        "idx_desc": "El blog de ONO Hosomaki Bar: sushi y hosomaki en Bogotá, el sonido Funktion-One, la fiesta de martes a sábado y la historia de Tokyo spirit, Bogotá soul.",
        "idx_h1": "Notas <em>del ritual</em>", "idx_lead": "Sushi, hosomaki, música y noche en Bogotá, contados desde ONO.",
        "cta_h": "Tu mesa te espera.", "cta_p": "Martes a sábado · 7 pm – 3 am · +25 · Calle 84A #9-11, Bogotá",
        "cta_b": "Reservar cena", "cta_f": "Fiesta por Instagram", "locale": "es_CO", "by": "Por ONO Hosomaki Bar"},
 "en": {"dir": "blog/en/", "up": "../../", "blog": "Blog", "home": "Home", "book": "Book", "read": "Keep reading",
        "date": DATE_EN, "other": "es", "other_label": "Español", "all": "See the whole blog",
        "idx_title": "ONO blog: sushi, hosomaki, music and nightlife in Bogotá",
        "idx_desc": "The ONO Hosomaki Bar blog: sushi and hosomaki in Bogotá, the Funktion-One sound, the party Tuesday to Saturday and the story of Tokyo spirit, Bogotá soul.",
        "idx_h1": "Notes <em>from the ritual</em>", "idx_lead": "Sushi, hosomaki, music and nightlife in Bogotá, told from ONO.",
        "cta_h": "Your table is waiting.", "cta_p": "Tuesday to Saturday · 7 pm – 3 am · 25+ · Calle 84A #9-11, Bogotá",
        "cta_b": "Book dinner", "cta_f": "Party via Instagram", "locale": "en_US", "by": "By ONO Hosomaki Bar"},
}


def url(lang, slug=""):
    return f"{SITE}/{T[lang]['dir']}{slug}"


def by_key(k):
    return next(p for p in POSTS if p["key"] == k)


def link_target(lang, target):
    if target.startswith("http") or target.startswith("."):
        return target
    return by_key(target)[lang]["slug"]


def render_body(lang, body):
    out = []
    links = sorted(LINKS[lang], key=lambda x: -len(x[0]))
    used = set()
    for block in body.strip().split("\n\n"):
        b = block.strip()
        if b.startswith("## "):
            out.append(f"<h2>{E(b[3:])}</h2>")
            continue
        quote = b.startswith("> ")
        text = E(b[2:] if quote else b)
        for phrase, target in links:
            p = E(phrase)
            if p in text and phrase not in used:
                href = link_target(lang, target)
                ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
                text = text.replace(p, f'<a href="{E(href)}"{ext}>{p}</a>', 1)
                used.add(phrase)
        out.append(f"<blockquote><p>{text}</p></blockquote>" if quote else f"<p>{text}</p>")
    return "\n        ".join(out)


def head(lang, title, desc, canon, alt_url, img, img_alt, kind, ld, up):
    t = T[lang]
    other = t["other"]
    es_url = canon if lang == "es" else alt_url
    en_url = canon if lang == "en" else alt_url
    return f"""<!doctype html>
<html lang="{lang}" data-lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="{canon}">
<link rel="alternate" hreflang="es" href="{es_url}">
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="x-default" href="{es_url}">
<meta property="og:type" content="{kind}">
<meta property="og:site_name" content="ONO Hosomaki Bar">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/img/{img}">
<meta property="og:image:alt" content="{E(img_alt)}">
<meta property="og:locale" content="{t['locale']}">
<meta property="og:locale:alternate" content="{T[other]['locale']}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{up}favicon.png" type="image/png">
<link rel="apple-touch-icon" href="{up}img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&amp;display=swap">
<link rel="stylesheet" href="{up}ono.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>"""


def header(lang, alt_href, up):
    t = T[lang]
    return f"""<body class="post-page">
<header class="nav solid" id="nav">
  <div class="wrap">
    <a class="logo" href="{up}" aria-label="ONO Hosomaki Bar"><img src="{up}img/logo-ono-rojo.png" width="1208" height="902" alt="ONO Hosomaki Bar"></a>
    <nav class="links blog-links" aria-label="Blog">
      <a href="{up}">{t['home']}</a>
      <a href="./">{t['blog']}</a>
    </nav>
    <a class="lang-link" href="{alt_href}" hreflang="{t['other']}" lang="{t['other']}">{t['other'].upper()}</a>
    <a class="brush sm" href="{BOOK}" target="_blank" rel="noopener">{t['book']}</a>
  </div>
</header>"""


def footer(lang, up):
    t = T[lang]
    return f"""<footer id="contacto">
  <div class="wrap">
    <div class="row">
      <a class="link" href="{IG}" target="_blank" rel="noopener">Instagram</a>
      <a class="link" href="{SPOTIFY}" target="_blank" rel="noopener">Spotify</a>
      <a class="link" href="{up}">ONO</a>
    </div>
    <p class="motto">Tokyo spirit, Bogotá soul.</p>
    <address>Calle 84A #9-11, Bogotá, Colombia</address>
    <div class="meta"><span>© 2026 ONO Hosomaki Bar · ONOCULTO S.A.S. · NIT 901.958.901-1</span></div>
  </div>
</footer>
</body>
</html>
"""


def card(lang, p, up, href):
    c = p[lang]
    return f"""<a class="post" href="{href}">
          <img src="{up}img/{p['img']}" width="{p['img_w']}" height="{p['img_h']}" alt="" loading="lazy" decoding="async">
          <span class="tag">{E(c['tag'])} · <time datetime="{DATE}">{T[lang]['date']}</time></span>
          <h3>{E(c['title'])}</h3>
          <p>{E(c['dek'])}</p>
        </a>"""


def build_post(lang, p):
    t = T[lang]
    c = p[lang]
    other = t["other"]
    up = t["up"]
    canon = url(lang, c["slug"])
    alt = url(other, p[other]["slug"])
    alt_href = ("en/" if lang == "es" else "../") + p[other]["slug"]
    ld = [{
        "@context": "https://schema.org", "@type": "BlogPosting", "headline": c["title"], "description": c["desc"],
        "image": f"{SITE}/img/{p['img']}", "datePublished": DATE, "dateModified": DATE, "inLanguage": lang,
        "mainEntityOfPage": canon,
        "author": {"@type": "Organization", "name": "ONO Hosomaki Bar", "url": SITE + "/"},
        "publisher": {"@type": "Organization", "name": "ONO Hosomaki Bar", "logo": {"@type": "ImageObject", "url": f"{SITE}/img/logo-ono-rojo.png"}},
        "about": {"@type": "Restaurant", "name": "ONO Hosomaki Bar", "url": SITE + "/",
                  "address": {"@type": "PostalAddress", "streetAddress": "Calle 84A #9-11", "addressLocality": "Bogotá", "addressCountry": "CO"}},
    }, {
        "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "ONO", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": url(lang)},
            {"@type": "ListItem", "position": 3, "name": c["title"], "item": canon}]
    }]
    more = [q for q in POSTS if q is not p][:3]
    cards = "\n        ".join(card(lang, q, up, q[lang]["slug"]) for q in more)
    page = head(lang, c["seo_title"] + " · ONO", c["desc"], canon, alt, p["img"], c["alt"], "article", ld, up)
    page += "\n" + header(lang, alt_href, up) + f"""
<main id="top">
  <article class="post-art">
    <header class="post-head wrap">
      <p class="eyebrow"><a href="./">Blog</a> · {E(c['tag'])} · <time datetime="{DATE}">{t['date']}</time></p>
      <h1>{E(c['title'])}</h1>
      <p class="dek">{E(c['dek'])}</p>
      <p class="by">{t['by']}</p>
    </header>
    <figure class="post-hero wrap"><img src="{up}img/{p['img']}" width="{p['img_w']}" height="{p['img_h']}" alt="{E(c['alt'])}" fetchpriority="high"></figure>
    <div class="post-body wrap">
        {render_body(lang, c['body'])}
    </div>
    <aside class="post-cta wrap">
      <div>
        <h2>{t['cta_h']}</h2>
        <p>{t['cta_p']}</p>
      </div>
      <div class="btns">
        <a class="brush" href="{BOOK}" target="_blank" rel="noopener">{t['cta_b']}</a>
        <a class="link" href="{IG}" target="_blank" rel="noopener">{t['cta_f']}</a>
      </div>
    </aside>
  </article>
  <section class="sec blog">
    <div class="wrap">
      <div class="head"><p class="eyebrow">{t['read']}</p></div>
      <div class="posts">
        {cards}
      </div>
      <a class="link more-blog" href="./">{t['all']} →</a>
    </div>
  </section>
</main>
""" + footer(lang, up)
    return page


def build_index(lang):
    t = T[lang]
    other = t["other"]
    up = t["up"]
    canon = url(lang)
    alt = url(other)
    alt_href = "en/" if lang == "es" else "../"
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": t["idx_title"], "url": canon, "inLanguage": lang,
          "publisher": {"@type": "Organization", "name": "ONO Hosomaki Bar", "url": SITE + "/"},
          "blogPost": [{"@type": "BlogPosting", "headline": p[lang]["title"], "url": url(lang, p[lang]["slug"]), "datePublished": DATE} for p in POSTS]}
    cards = "\n        ".join(card(lang, p, up, p[lang]["slug"]) for p in POSTS)
    page = head(lang, t["idx_title"], t["idx_desc"], canon, alt, POSTS[0]["img"], POSTS[0][lang]["alt"], "website", ld, up)
    page += "\n" + header(lang, alt_href, up) + f"""
<main id="top">
  <section class="sec blog blog-index">
    <div class="wrap">
      <div class="head">
        <p class="eyebrow">Blog</p>
        <h1>{t['idx_h1']}</h1>
        <p class="lead">{t['idx_lead']}</p>
      </div>
      <div class="posts">
        {cards}
      </div>
    </div>
  </section>
</main>
""" + footer(lang, up)
    return page


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("wrote", rel)


def main():
    for lang in ("es", "en"):
        for p in POSTS:
            write(T[lang]["dir"] + p[lang]["slug"], build_post(lang, p))
        write(T[lang]["dir"] + "index.html", build_index(lang))
    urls = [(SITE + "/", "1.0")] + [(url(l), "0.6") for l in ("es", "en")] + \
           [(url(l, p[l]["slug"]), "0.7") for p in POSTS for l in ("es", "en")]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"  <url><loc>{u}</loc><lastmod>{DATE}</lastmod><priority>{pr}</priority></url>" for u, pr in urls]
    sm.append("</urlset>")
    write("sitemap.xml", "\n".join(sm) + "\n")
    write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /tools/\n\nSitemap: {SITE}/sitemap.xml\n")


if __name__ == "__main__":
    main()
