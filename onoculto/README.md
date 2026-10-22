# ONO Hosomaki Bar · onoculto.com

Sitio estático de ONO Bogotá en español e inglés. No tiene build: Netlify publica esta carpeta tal cual.

- `index.html`: la página de inicio (portada, concepto, la noche, menú, fiesta, galería, prensa, blog, ONO Cartagena y contacto).
- `ono.css`, `ono.js`: estilos; idioma ES/EN, menú a pantalla completa, aparición suave y galería ampliable.
- `blog/` (español) y `blog/en/` (inglés): 12 artículos cada uno. Se generan con `python3 onoculto/tools/build_blog.py`; el texto vive en `tools/blog_content.py`. El mismo comando rehace `sitemap.xml` y `robots.txt`.
- `_redirects`, `404.html`: redirecciones y página de error.
- `img/`: fotos de Rodia Films (`r-*` de septiembre, `a-*` de agosto y julio), arte de campaña y renders de ONO Cartagena.

## Netlify

1. Add new site → Import an existing project → GitHub → `casasalvaje-web`.
2. Branch to deploy: `main`. Base directory: `onoculto`. Build command: vacío. Publish directory: `onoculto` (o `.`, que es lo que dice `netlify.toml`).
3. Deploy. Revisar la URL `*.netlify.app`.
4. Domain management → Add a domain → `onoculto.com` (y `www.onoculto.com`), y seguir las instrucciones de DNS de Netlify en el proveedor del dominio.

## Enlaces externos

- Cena: CoverManager, `https://restaurante.covermanager.com/ono/`.
- Fiesta (mesas y botella, a partir de las 11 pm): Fourvenues, `https://web.fourvenues.com/es/ono`.
- Carta completa con precios: Menupp, `https://menupp.co/ono`.
- `_redirects` conserva las rutas del sitio anterior en Framer (`/about`, `/menu`, `/events`, `/contact`, `/book-dinner`, `/book-party`, `/old-home`) y agrega atajos cortos (`/reservar`, `/fiesta`, `/carta`). `404.html` es la página de error.

## Pendiente del dueño

- Confirmar con Rodia Films el uso web de las fotos y que las personas que aparecen lo autorizaron.
- Marie Claire y Revista Diners fueron menciones en sus cuentas de Instagram, no artículos web; por eso en prensa van solo los nombres. Si Jaime pasa el enlace de cada publicación, se enlazan.
- Revisar la ventana de apertura de ONO Cartagena el 2026-12-31 (busca `REVIEW` en `index.html`).
- El sitio anterior (Framer) tenía un píxel de Meta (`1003594065627012`). Si la pauta lo necesita, se agrega aquí junto con un aviso de cookies.
