# Grupo ONO · website and launch checklist

Static site for Grupo ONO, the hospitality group behind ONO Hosomaki Bar (Bogotá) and Casa Salvaje (Cartagena). It is plain HTML and CSS with no build step, written in English only, and hosted on Netlify with Netlify Forms. Everything lives in this `grupo-ono/` folder. The repository root is the separate Casa Salvaje site, so leave it alone.

Pages: `index.html`, `careers.html`, `contact.html`, `privacy.html`, `thanks.html` and `404.html`. Shared files: `grupo.css`; `pages.css`; `print.css`; `forms.js` (careers and contact only); `fonts/` (self-hosted Archivo and Cormorant Garamond, with `OFL.txt`); `img/` (originals, see below); `img/d/` (responsive derivatives); `tools/launch_check.py`; `_redirects`; `netlify.toml`.

### Stylesheets

The brief asks for one `grupo.css` of at most 20 KB (6 KB gzip). The full component set does not fit that budget, so the CSS is split three ways:

- `grupo.css`: tokens, base, header, footer, elevation and every home-page component, plus reduced-motion and forced-colours rules. Every page loads it. Keep it at or under 20,480 bytes raw (`wc -c grupo-ono/grupo.css`).
- `pages.css`: the inner-page parts (page heads, prose, side columns, the thanks and 404 layouts, and the C20 form system). Only careers, contact, privacy, thanks and 404 load it, after `grupo.css`.
- `print.css`: the print fact sheet (brief 8.3), linked on every page with `media="print"`, so it never blocks rendering. The desktop grid in `grupo.css` and `pages.css` is declared for `(min-width:900px), print` (the six-column directory for `(min-width:56.25em), print`, which is 900px at the default font size), so paper reuses the desktop columns. On paper the home page leaves out the navigation, the hero Key, photos and posters (with their captions), the press-kit table (its download links cannot be followed on paper) and the CTA buttons (their links repeat the directory). The footer columns are left out on the home page too, because the directory and the press facts already list every handle, address and link. Links print their URL after the text, except WhatsApp, Instagram and email links, whose text already shows the number, handle or address. On the home page the press facts print in two columns under the boilerplate, and the Casa Salvaje worlds in the directory stay together on one page. `@page` sets 10 mm margins, so the page count does not depend on the print dialog: the home page prints on 4 pages, on A4 or Letter, with no text under 7.5 pt.

### Images

- `img/` holds three kinds of original. First, the press-kit files that the home page links for download. They include the two dining-room photos `slvj-salon.jpg` and `kanibal-salon.jpg`, whose guest releases the client confirmed on 13 Oct 2026. Second, `art/guest-list-heaven-has-a-guest-list.jpg`, kept for the press kit (brief 6.2) and now listed in it. Third, the masters that the derivatives in `img/d/` are cut from. Nothing links the masters, but they are kept on purpose, so re-exports can be made from them: `art/ono-grabados-waves.jpg`, `art/ono-sellos-oni.jpg`, `art/rituales-peacock.jpg`, `art/tipografia-bad-habits.jpg` and `slvj-neon.jpg` (`slvj-salon.jpg` and `kanibal-salon.jpg` are masters too).
- The WebP fallbacks for the slots whose AVIF uses quality 42 (`p-waves`, `door-kan`, `p-skin-tuna`, `p-rituales`, `p-tipografia`) were re-encoded at WebP quality 55, method 6. Because `img/d/` is cached as immutable, they live under new names: `img/d/<slot>2-<width>.webp`. AVIF and JPEG keep the original slot names.
- `img/d/logo-ono-bone-192.png` is the ONO brush logo, pre-coloured bone (#EFE4D6) on transparent, as a lazy image. It replaces the old CSS mask, which always loaded eagerly. In forced-colours mode the same file is used as a mask, so the logo draws in `CanvasText`.
- Only the two hero windows are eager with `fetchpriority="high"` on the home page. The exception is the careers strip (`careers.html`): it is that page's LCP image, so it stays eager and also carries `fetchpriority="high"`.
- The two fallback faces at the top of `grupo.css` (`Archivo Fallback`, `Archivo Narrow Fallback`) use Arial, Helvetica, Liberation Sans or Roboto (stock Android) resized to Archivo's measurements, so the page barely moves when Archivo arrives. Archivo loads with `font-display:swap`: on a slow first visit the text is redrawn once when the font lands, about 100 ms of work on a slow phone. `optional` would remove that redraw, but a slow first visit could then stay in the fallback. That is the owner's decision.
- There is no smooth scrolling. A link from another page such as `/#press` would scroll through the whole home page on load and download every photo on the way.
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
- **`_redirects`.** Keeps `/thanks`, sends `/press/*` (the press-kit links shared from the earlier version of the site) to `/contact.html#press`, and answers `/tools/*` and `/README.md` with the 404 page, because `publish = "."` would otherwise serve them.
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
- the private address from item 8 below, anywhere in the folder

The report lists every placeholder and every OWNER or LEGAL note with its file and line, plus each mention of the opening window. `--prod` must exit 0 before the production domain goes live.

## 1. Owner placeholders (these block the production launch)

The site can run on a preview URL until all of these are answered. Run `--pre` to see exactly where each one sits.

1. **ONO Bogotá photos:** 3–5 photos at least 2000px on the long edge. They replace the left hero window and the ONO chapter panel.
2. **Legal (answered 14 Oct 2026, see below; legal sign-off from Juan David Castro still pending):** company legal name(s) and NIT, registered address, data-rights email, phone, notification inbox or provider, CV and message retention in months, effective date, database validity, and whether each venue is a separate legal entity. These fill `privacy.html`, the consent text on both forms, the contact routing and the footer legal line. `privacy.html` also needs legal sign-off from Juan David Castro.
3. **People:** confirm that the Finance (Sebastián Patiño) and Legal (Juan David Castro) names may be published.
4. **Group partnerships and investors email (answered 14 Oct 2026):** the client chose the temporary press Gmail for this row and for data-rights requests too, until an address on grupo-ono.com exists.
5. **ONO Cartagena opening team:** the confirmed roles (`careers.html`). Hiring itself is confirmed (always hiring, and now for the ONO Cartagena opening); no specific role is.
6. **Hosomaki list:** bring back "Tuna, eel, salmon, hamachi and wagyu" only if it is confirmed for Bogotá.
7. **High-res images:** originals of `slvj-salon` and `puerta` at 2560px or wider, and the original campaign files.
8. **Personal Gmail address from the brief** (not the press address below): confirm the person's role. It is deliberately not written here, and the gate blocks it anywhere in this folder.
    - If it is the form inbox, add it as a Netlify Forms notification recipient (section 3).
    - If it is a person for the People ledger, supply their name, role and consent.
    - Either way, it is never published on the site.
9. **La Domenica's opening date** (does not block the launch): the site shows it as still to open, "Opening, date TBC" in the directory and "date to be confirmed" in the Casa Salvaje lead, the press facts and the boilerplate. Once the date is known, add it to the directory row, the door plate, the hero and press "Still to open" facts, the Casa Salvaje lead and the boilerplate (update the word count in its label). `--pre` lists the OWNER note on the directory row.

Fill each `<mark class="todo">` with the confirmed fact, then delete the mark and its OWNER comment.

**Temporary press email.** At the client's request, the press rows (`index.html#press` and `contact.html#press`) show jaimeloralondono@gmail.com, with a `mailto:` link whose subject is "Press enquiry". It is temporary: once press@grupo-ono.com exists, replace it in both places, in the visible text and in the `mailto:`.

**Answered on 13 Oct 2026.** These facts come from the client's approved fact sheet and Jaime's answers of 13 Oct 2026, and are now on the pages:

- ONO Bogotá: Calle 84A #9-11; onoculto.com; open since November 2025; Tuesday to Saturday, 7 pm – 3 am, guests 25 and over; "Tokyo spirit, Bogotá soul."; bookings at `restaurante.covermanager.com/ono/`, now the main ONO action, with @ono.culto second.
- La Domenica is not open yet: it shows "Opening", date to be confirmed (item 9 above).
- Production domain: grupo-ono.com, apex (section 2).
- Booking links, the same ones casa-salvaje.com uses: CoverManager (`casa-salvaje-cartagena/`, `kanibal-cartagena/`, `slvj-cartagena/`) for the restaurants and Fourvenues (`site.fourvenues.com/en/casa-salvaje`) for the nights. WhatsApp links carry the same booking message as casa-salvaje.com.
- Guest photo releases: `slvj-salon` and `kanibal-salon` are in the press kit, credited "Images: courtesy of Grupo ONO."
- Instagram: @grupo.ono, @ladomenica.ctg and @kanibal.ctg join the other accounts.
- Press coverage: AXXIS (19 Feb 2026); also Marie Claire and Revista Diners.

**Answered on 14 Oct 2026.** Jaime's answers, now on the pages (published before the lawyer's review, at his request):

- Data controller for the whole group (ONO and Casa Salvaje): ONOCULTO S.A.S., NIT 901.958.901-1, Calle 84A #9-11, Bogotá D.C. Footer line: "© 2026 ONOCULTO S.A.S. · NIT 901.958.901-1".
- Data-rights and investors/partnerships email: jaimeloralondono@gmail.com (temporary, like press). Phone: +57 318 282 4124.
- Retention: CVs 12 months, messages 24 months. The databases stay in force while ONOCULTO S.A.S. operates. Effective date: 14 Oct 2026.
- Form notifications go to that Gmail (Google LLC, United States), set up as in section 3.

## 2. Domain and launch

The production domain is `https://grupo-ono.com` (apex, no www). The head of `index.html`, `careers.html`, `contact.html` and `privacy.html` carries the canonical (each page points to itself), `og:url`, an absolute `og:image` (`/img/og-grupo-ono.jpg`, 1200×630), `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image`, all on that origin. The JSON-LD IRIs on `index.html`, `careers.html` and `contact.html` are absolute on the same origin. Share previews only work once the domain serves the site.

At launch:

1. In Netlify, under Domain management, add `grupo-ono.com` and make it the **primary domain**. The apex is the one origin; nothing on the site uses `www`.
2. Only then uncomment the last line of `_redirects`, replacing `<site>` with the Netlify site name: `https://<site>.netlify.app/*  https://grupo-ono.com/:splat  301!`. It stays commented until grupo-ono.com is attached as the primary domain; otherwise the Netlify URL would redirect to a domain that does not serve the site yet.
3. Run `--prod` until it exits 0, then deploy.
4. After the deploy, check the previews in the Facebook Sharing Debugger and the LinkedIn Post Inspector, run the JSON-LD through validator.schema.org, and send both forms once from the live site.

## 3. Form notifications

Netlify stores every submission, but nobody is emailed until this is set up. In the Netlify UI, go to **Site configuration → Notifications → Emails → New form submission**. Add one email notification for the form `careers` and one for `contact`, both sent to the confirmed inbox. This is configuration only: the address never goes into the code. Then update the privacy policy's "notification inbox / provider" placeholder to match.

## 4. Review on 2026-12-31: "Nov–Dec 2026"

ONO Cartagena's opening is announced as "Nov–Dec 2026" (written "November–December 2026" in running text). Every mention carries `<!-- REVIEW 2026-12-31: opening window -->`, and `--pre` lists them all with file and line. It also starts warning once that date arrives.

By 2026-12-31, or as soon as the date is confirmed:

- Replace each mention with the real date, written like "25 Sep 2026", or with a new window.
- Switch "□ Opening" to "■ Open" where it applies.
- Update the REVIEW comments.
