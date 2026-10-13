// "Arma tu plan": las opciones del planificador del concierge y el pedido que se le hace a Claude.
// Lo usan /api/plan (netlify/functions/plan.mjs) y la vista previa del concierge. Sin imports a propósito:
// la vista previa copia este archivo tal cual.

export const PLAN_OPCIONES = {
  quedarse: {
    "casa-belle": ["Casa Belle, en el Centro", "Casa Belle, in the Old City"],
    "hotel-las-islas": ["Hotel Las Islas, en Barú", "Hotel Las Islas, in Barú"],
    "casa-enai": ["Casa Enai, isla privada en el Rosario", "Casa Enai, a private island in the Rosario"],
    "apartamento": ["Apartamento, la opción más económica", "Apartment, the budget option"],
    "otra-casa": ["Otra casa o villa", "Another house or villa"],
    "ya-tengo": ["Ya tengo dónde quedarme", "I already have a place"],
  },
  dia: {
    "yate-privado": ["Yate privado del concierge", "The concierge's private yacht"],
    "bote-islas": ["Bote a las Islas del Rosario", "Boat to the Rosario Islands"],
    "baru": ["Día de playa en Barú", "Beach day in Barú"],
    "atardecer": ["Atardecer en velero", "Sunset sail"],
    "buceo": ["Buceo o snorkel", "Diving or snorkeling"],
    "ciudad": ["Caminar la ciudad amurallada", "Walk the walled city"],
    "compras": ["Diseño y compras locales", "Local design & shopping"],
  },
  noche: {
    "kanibal": ["Cena de fuego en Kanibal", "Fire dinner at Kanibal"],
    "slvj": ["Sushi y banquete en SLVJ", "Sushi & feast at SLVJ"],
    "club": ["El club SLVJ", "The SLVJ club"],
    "omakase": ["Omakase en la barra", "Omakase at the bar"],
  },
  ocasion: {
    "ninguna": ["Solo porque sí", "Just because"],
    "cumple": ["Cumpleaños", "Birthday"],
    "aniversario": ["Aniversario", "Anniversary"],
    "despedida": ["Despedida", "Bachelor(ette)"],
    "luna-miel": ["Luna de miel", "Honeymoon"],
    "empresa": ["Empresa o grupo", "Company or group"],
  },
};

const IDIOMAS = { es: "español", en: "inglés", pt: "portugués", fr: "francés", it: "italiano", de: "alemán" };

export const PLAN_REGLAS = `

ARMA TU PLAN (planificador de casa-salvaje.com)
- Te llegan las elecciones de un huésped. Ordénalas en un plan día por día que fluya: mañana y tarde para el mar o la ciudad; la noche para Casa Salvaje.
- Respeta los horarios de la casa: el club solo de jueves a sábado; el domingo cerramos a las 7 pm (salvo domingo antes de festivo); el omakase solo el último martes del mes. Si algo elegido no cabe en esas fechas, propón la mejor alternativa y dilo en una nota.
- Casa Belle, Hotel Las Islas, Casa Enai, el apartamento y el yate privado los reserva el concierge de la casa (puerta "whatsapp"); si eligieron una casa, ponla como el lugar donde se quedan y cuenta en una frase por qué encaja. El yate privado sirve para el día en las islas o para el atardecer.
- Otras casas o villas, botes, islas, velero y buceo van con nuestro aliado Vacation Cartagena (puerta "vacation"). Nunca inventes nombres de botes o casas, precios, habitaciones ni disponibilidad.
- Cenas: puerta "kanibal" o "slvj". La noche y las mesas del club: puerta "club". Lo que necesite al concierge humano (ocasión especial, sorpresa, grupo grande, omakase): puerta "whatsapp".
- Caminar la ciudad, compras y planes sin reserva: puerta "ninguna"; recomienda con lo que sabes de Cartagena y marca "por confirmar" lo que pueda cambiar.
- Si hay una ocasión, pon un detalle de la casa en la noche principal y di que el concierge lo prepara.
- Si van al club, en notas: cover de $50.000 COP por persona, 25 años mínimo y vestimenta elegante (bermuda de lino sí, chanclas no).
- Como mucho 3 momentos por día. El detalle de cada momento, una o dos frases. Tono de la casa: cálido, seguro, frases cortas.

FORMATO: responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"titulo": "máx. 6 palabras", "intro": "una o dos frases", "dias": [{"fecha": "ej. Jueves 15 de octubre", "momentos": [{"momento": "Mañana | Tarde | Noche | Madrugada", "plan": "título corto", "detalle": "una o dos frases", "puerta": "kanibal | slvj | club | vacation | whatsapp | ninguna"}]}], "notas": ["máx. 3 notas prácticas"], "whatsapp": "el mensaje que el huésped le manda al concierge para reservar todo: en primera persona, en su idioma, con fechas, personas y lo elegido; máx. 700 caracteres"}
Todo el texto va en el idioma que se indica en el pedido; los valores de "puerta" van tal cual.`;

const lista = (v, grupo) => (Array.isArray(v) ? v : []).map(String).filter((k) => k in PLAN_OPCIONES[grupo]).slice(0, 6);
const entero = (v, min, max, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

// Deja solo lo que el planificador ofrece. Devuelve null si no eligieron nada.
export function limpiarPlan(p) {
  if (!p || typeof p !== "object") return null;
  const sel = {
    llegada: /^\d{4}-\d{2}-\d{2}$/.test(String(p.llegada || "")) ? String(p.llegada) : "",
    noches: entero(p.noches, 1, 7, 3),
    personas: entero(p.personas, 1, 40, 2),
    quedarse: lista(p.quedarse, "quedarse"),
    dia: lista(p.dia, "dia"),
    noche: lista(p.noche, "noche"),
    ocasion: String(p.ocasion || "ninguna") in PLAN_OPCIONES.ocasion ? String(p.ocasion || "ninguna") : "ninguna",
    nota: String(p.nota || "").replace(/\s+/g, " ").trim().slice(0, 300),
    idioma: String(p.idioma || "es") in IDIOMAS ? String(p.idioma || "es") : "es",
  };
  return sel.quedarse.length || sel.dia.length || sel.noche.length || sel.nota ? sel : null;
}

// Los días del viaje con lo que importa para la casa: club, domingo, omakase.
function dias(sel, hoy) {
  if (!sel.llegada) return null;
  const [y, m, d] = sel.llegada.split("-").map(Number);
  const inicio = Date.UTC(y, m - 1, d);
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (!(inicio >= hoyUTC - 864e5 && inicio <= hoyUTC + 400 * 864e5)) return null;
  const fmt = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const out = [];
  for (let i = 0; i < sel.noches; i++) {
    const f = new Date(inicio + i * 864e5), wd = f.getUTCDay(), notas = [];
    if (wd >= 4) notas.push("club abierto hasta las 3 am");
    if (wd === 0) notas.push("domingo: la casa cierra a las 7 pm");
    if (wd === 2 && new Date(f.getTime() + 7 * 864e5).getUTCMonth() !== f.getUTCMonth()) notas.push("último martes del mes: omakase");
    out.push(`- ${fmt.format(f)}${notas.length ? " (" + notas.join("; ") + ")" : ""}`);
  }
  return out;
}

// El pedido para Claude con las elecciones del huésped. `hoy` es la fecha de hoy en Cartagena.
export function pedidoPlan(sel, hoy) {
  const nombres = (grupo) => sel[grupo].map((k) => PLAN_OPCIONES[grupo][k][0]).join(", ") || "nada en especial";
  const d = dias(sel, hoy);
  return [
    `Arma el plan de este huésped. Escribe todo en ${IDIOMAS[sel.idioma]}.`,
    `Personas: ${sel.personas}. Noches: ${sel.noches}.`,
    d ? `Días del viaje:\n${d.join("\n")}` : `Fechas por definir: arma ${sel.noches} días como "Día 1", "Día 2"… y recuerda en notas que el club abre de jueves a sábado.`,
    `Dónde quedarse: ${nombres("quedarse")}.`,
    `De día: ${nombres("dia")}.`,
    `De noche: ${nombres("noche")}.`,
    `Ocasión: ${PLAN_OPCIONES.ocasion[sel.ocasion][0]}.`,
    sel.nota ? `Algo más que pidió el huésped: """${sel.nota}"""` : "",
  ].filter(Boolean).join("\n");
}
