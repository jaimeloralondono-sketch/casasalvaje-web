// La agenda de la casa, leída en vivo de la portada (sección #agenda de index.html).
// Así el concierge sabe qué hay esta semana apenas se actualiza la web, sin tocar la ficha.
// Se guarda 10 minutos en memoria; si la web no responde, el concierge sigue con la ficha.

const DURA = 10 * 60 * 1000;
let guardada = { texto: "", hasta: 0 };

// Texto plano de la sección de agenda, solo en español.
export function agendaDeHtml(html) {
  const i = html.indexOf('id="agenda"');
  if (i < 0) return "";
  const ini = html.indexOf("<li", i), fin = html.indexOf("</ul>", i);
  if (ini < 0) return "";
  let s = html.slice(ini, fin > ini ? fin : ini + 6000);
  s = s.replace(/<span class="(en|pt|fr|it|de)">[\s\S]*?<\/span>/g, "");
  s = s.replace(/<\/li>/g, "\n").replace(/<small>/g, " · ").replace(/<\/b>/g, ": ").replace(/<[^>]+>/g, " ");
  s = s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ");
  const filas = s.split("\n").map((l) => l.trim()).filter(Boolean);
  return filas.map((l) => "- " + l.replace(/\s+([:,.])/g, "$1").replace(/ (Quiero cupo|Reservar)$/, "")).join("\n").slice(0, 1500);
}

export async function agendaDeLaWeb(origen) {
  if (Date.now() < guardada.hasta) return guardada.texto;
  let texto = "";
  try {
    const r = await fetch(new URL("/index.html", origen), { signal: AbortSignal.timeout(2500) });
    if (r.ok) {
      const filas = agendaDeHtml(await r.text());
      if (filas) texto = `AGENDA DE LA CASA (de casa-salvaje.com, al día de hoy)\n${filas}\n- Usa estas fechas tal cual; si preguntan por algo que no está aquí, di que el equipo confirma la programación de esa semana.`;
    }
  } catch {}
  guardada = { texto, hasta: Date.now() + (texto ? DURA : 60 * 1000) };
  return texto;
}
