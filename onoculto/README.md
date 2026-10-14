# ONO Hosomaki Bar · onoculto.com

Sitio estático de ONO Bogotá en español e inglés. No tiene build: Netlify publica esta carpeta tal cual.

- `index.html`: la página de inicio (portada, concepto, la noche, menú, fiesta, galería, prensa, blog, ONO Cartagena y contacto).
- `ono.css`, `ono.js`: estilos; idioma ES/EN, menú a pantalla completa, aparición suave y galería ampliable.
- `blog/` (español) y `blog/en/` (inglés): 12 artículos cada uno. Se generan con `python3 onoculto/tools/build_blog.py`; el texto vive en `tools/blog_content.py`. El mismo comando rehace `sitemap.xml` y `robots.txt`.
- `img/`: fotos de Rodia Films (`r-*` de septiembre, `a-*` de agosto y julio), arte de campaña y renders de ONO Cartagena.

## Netlify

1. Add new site → Import an existing project → GitHub → `casasalvaje-web`.
2. Branch to deploy: `main`. Base directory: `onoculto`. Build command: vacío. Publish directory: `onoculto` (o `.`, que es lo que dice `netlify.toml`).
3. Deploy. Revisar la URL `*.netlify.app`.
4. Domain management → Add a domain → `onoculto.com` (y `www.onoculto.com`), y seguir las instrucciones de DNS de Netlify en el proveedor del dominio.

## Pendiente del dueño

- Confirmar que Kaori roll, Sakana umami y Black truffled están en la carta (salen del Recetario y costeo).
- Enlace de reservas de fiesta: hoy los botones de fiesta van a Instagram (busca `OWNER` en `index.html`).
- Confirmar si hay servicio de botella y mesas de fiesta (se mencionan en el blog).
- Confirmar con Rodia Films el uso web de las fotos y que las personas que aparecen lo autorizaron.
- Enlaces de Marie Claire y Revista Diners para la sección de prensa.
- Revisar la ventana de apertura de ONO Cartagena el 2026-12-31 (busca `REVIEW` en `index.html`).
