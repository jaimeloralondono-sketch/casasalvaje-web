# Casa Salvaje · casasalvaje.com

Sitio estático de Casa Salvaje (Cartagena). Netlify lo publica tal cual: sin comando de build, carpeta de publicación = raíz.

## Horarios
Están en `index.html#horarios`. Cada tarjeta tiene el texto visible y, en `data-hours`, los mismos tramos en minutos desde medianoche por día (0 = domingo, "f" = domingo antes de lunes festivo); `site.js` calcula los festivos de Colombia, marca la fila de hoy y el estado "abierto ahora" en hora de Cartagena. Si cambia un horario, actualiza también el JSON-LD del `<head>` de `index.html` y la línea de horario de la página del mundo.

## Blog
`blog/index.html` lista los artículos; cada artículo existe en español y en inglés (cada uno con su URL, enlazados con `hreflang`). Para uno nuevo: copia un artículo de `blog/`, cambia título, descripción, canonical, `hreflang`, JSON-LD y cuerpo, agrega la tarjeta en `blog/index.html` y la URL en `sitemap.xml`.
