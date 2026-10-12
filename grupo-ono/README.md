# Grupo ONO · corporate site

Static site for Grupo ONO (ONO Hosomaki Bar in Bogotá and Casa Salvaje in Cartagena). It lives in this folder, separate from the Casa Salvaje site. English only.

Pages: `index.html` (hero with the self-drawing logo, manifesto, one chapter per brand, links to careers and contact), `careers.html`, `contact.html`, `privacy.html`, `thanks.html`. The logo is redrawn as a vector in `img/logo-grupo-ono.svg` and inlined in every page.

On Netlify: new site from this same repo, **Base directory = `grupo-ono`**, no build command, publish = `.` (set in `netlify.toml`). The `careers` (with a PDF CV) and `contact` forms go to Netlify Forms; turn on email notifications under Site settings → Forms.

To do before launch:
- ONO Bogotá website or Instagram link and address (`index.html`, TODO comment).
- Company legal name, NIT and data-rights email in `privacy.html` (legal review).
- Domain: the code recognises `grupo-ono.com`, `grupoono.com` and `.com.co`; if it's another one, update `hosted` in `grupo.js`.
