# Grupo ONO · corporate site

Static site for Grupo ONO (ONO Hosomaki Bar in Bogotá and Casa Salvaje in Cartagena). It lives in this folder, separate from the Casa Salvaje site. English only, except on `careers.html`: one line inviting applicants to write in Spanish, and the consent sentence in both languages (marked `lang="es"`).

Pages: `index.html` (hero with the self-drawing logo, manifesto with the openings timeline, one chapter per brand, links to careers and contact), `careers.html`, `contact.html` (with the press block at `contact.html#press`), `privacy.html`, `thanks.html`. The logo is redrawn as a vector in `img/logo-grupo-ono.svg` and inlined in every page.

On Netlify: new site from this same repo, **Base directory = `grupo-ono`**, no build command, publish = `.` (set in `netlify.toml`). The `careers` (with a PDF CV) and `contact` forms go to Netlify Forms; turn on email notifications under Site settings → Forms.

Live domain: `https://grupo-ono.com`. Canonical links, `og:url` and `og:image` are absolute on that origin (`SITE` in the build script), so share previews only work once the domain serves the site.

To do before launch:
- Company legal name, NIT and data-rights email in `privacy.html` (legal review).
- Press email: `contact.html#press` uses jaimeloralondono@gmail.com for now, as the client asked. It is temporary: once email works on the domain, replace it with a press@ address there (e.g. `press@grupo-ono.com`), in both the visible text and the `mailto:` link.
