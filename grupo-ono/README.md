# Grupo ONO · sitio corporativo

Sitio estático de Grupo ONO (ONO Hosomaki Bar en Bogotá y Casa Salvaje en Cartagena). Vive en esta carpeta, aparte del sitio de Casa Salvaje.

Páginas: `index.html` (portada con el logo que se dibuja, manifiesto, un capítulo por marca, accesos a empleo y contacto), `empleo.html`, `contacto.html`, `datos.html`, `gracias.html`. El logo está redibujado en vector en `img/logo-grupo-ono.svg` y va en línea dentro de cada página.

En Netlify: sitio nuevo desde este mismo repo, **Base directory = `grupo-ono`**, sin comando de build, publish = `.` (lo dice `netlify.toml`). Los formularios `trabaja-con-nosotros` (con hoja de vida en PDF) y `contacto` llegan a Netlify Forms; activa las notificaciones por correo en Site settings → Forms.

Pendientes antes de publicar:
- Enlace (web o Instagram) y dirección de ONO Bogotá (`index.html`, comentario PENDIENTE).
- Razón social, NIT y correo de datos personales en `datos.html` (revisión legal).
- Dominio: el código reconoce `grupo-ono.com`, `grupoono.com` y `.com.co`; si es otro, ajústalo en `grupo.js` (`hosted`).
