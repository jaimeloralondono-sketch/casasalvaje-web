// POST /api/whatsapp  <- webhook de Bird (evento whatsapp.received).
// Responde por WhatsApp con Claude usando la misma ficha que el chat de la web. Atiende dos líneas:
// - la del concierge (+57 318 282 4124): ahí escriben solo el bot y Jaime;
// - la de reservas de la casa (+57 310 828 6602), si está en WHATSAPP_RESERVAS: ahí el bot solo toma reservas de mesa,
//   las guarda en el panel /reservas/admin y le pasa la conversación al equipo para que confirme.
// Es una función "background": Netlify responde 202 a Bird de inmediato y aquí hay tiempo para pensar la respuesta.
//
// Variables de entorno en Netlify:
//   ANTHROPIC_API_KEY     clave de Claude (la misma del chat de la web)
//   BIRD_API_KEY          clave de la API de Bird (bk_us1_... o bk_eu1_...), con permiso de WhatsApp
//   BIRD_WEBHOOK_SECRET   el secreto whsec_... que Bird muestra una sola vez al crear el webhook
//   WHATSAPP_PRUEBA       opcional: números separados por coma; si existe, el bot solo responde a esos números
//   WHATSAPP_APAGADO      opcional: "1" para que el bot no responda a nadie (el equipo sigue por la app)
//   WHATSAPP_RESERVAS     opcional: el número de reservas de la casa, p. ej. +573108286602; en esa línea el bot solo toma reservas
import { createHmac, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { FICHA_WHATSAPP, FICHA_RESERVAS } from "../lib/ficha.mjs";
import { leerReserva, guardarReserva } from "../lib/reservas.mjs";
import { agendaDeLaWeb } from "../lib/agenda.mjs";

const HORAS_SILENCIO = 6;   // si alguien del equipo escribió desde la app en estas horas, el bot no se mete
const ETIQUETA = { name: "origen", value: "concierge-bot" };

function firmaValida(cuerpo, h, secreto) {
  const id = h.get("webhook-id"), ts = h.get("webhook-timestamp"), firmas = h.get("webhook-signature") || "";
  if (!id || !ts || !secreto?.startsWith("whsec_")) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const esperada = createHmac("sha256", Buffer.from(secreto.slice(6), "base64")).update(`${id}.${ts}.${cuerpo}`).digest();
  return firmas.split(" ").some((f) => {
    const s = Buffer.from(f.replace(/^v1,/, ""), "base64");
    return s.length === esperada.length && timingSafeEqual(s, esperada);
  });
}

function bird(ruta, opciones = {}) {
  const clave = process.env.BIRD_API_KEY || "";
  const region = (clave.match(/^bk_([a-z]{2}\d+)_/) || [])[1] || "us1";
  return fetch(`https://${region}.platform.bird.com${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", ...(opciones.headers || {}) },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`Bird ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return r.json();
  });
}

const digitos = (n) => String(n || "").replace(/\D/g, "");
const esBot = (m) => (m.tags || []).some((t) => t.name === ETIQUETA.name && t.value === ETIQUETA.value);
const textoDe = (m) => m.text?.body || m.interactive_reply?.title || (m.image || m.video || m.audio || m.document ? "[envió un archivo]" : m.location ? "[envió una ubicación]" : "");

function ahoraCartagena() {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date());
}

export default async (req) => {
  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers, process.env.BIRD_WEBHOOK_SECRET)) { console.warn("whatsapp: firma inválida"); return; }
  const ev = JSON.parse(cuerpo);
  if (ev.type !== "whatsapp.received" || ev.data?.direction !== "inbound") return;
  if (process.env.WHATSAPP_APAGADO === "1" || !process.env.ANTHROPIC_API_KEY || !process.env.BIRD_API_KEY) return;

  const d = ev.data, huesped = d.from || {}, casa = d.to?.phone_number;
  if (!casa || d.to?.group_id) return;   // los grupos los atiende el equipo
  const prueba = (process.env.WHATSAPP_PRUEBA || "").split(",").map((n) => n.replace(/[^\d+]/g, "")).filter(Boolean);
  if (prueba.length && !prueba.includes(huesped.phone_number)) return;
  const lineaReservas = !!digitos(process.env.WHATSAPP_RESERVAS) && digitos(casa) === digitos(process.env.WHATSAPP_RESERVAS);

  // La conversación reciente con este huésped, de la más vieja a la más nueva.
  const filtro = huesped.bsuid ? `bsuid=${encodeURIComponent(huesped.bsuid)}` : `phone_number=${encodeURIComponent(huesped.phone_number || "")}`;
  const lista = (await bird(`/v1/whatsapp/messages?${filtro}&limit=30`)).data || [];
  const desde = Date.now() - HORAS_SILENCIO * 3600e3;

  // Bird puede entregar el mismo evento dos veces: si ya contestamos este mensaje, no repetimos.
  if (lista.some((m) => m.direction === "outbound" && m.metadata?.responde_a === d.whatsapp_id)) return;
  // Si una persona del equipo contestó desde la app hace poco, o el bot ya pasó la conversación al equipo, el bot se calla.
  const reciente = lista.filter((m) => m.direction === "outbound" && Date.parse(m.created_at) > desde);
  if (reciente.some((m) => !esBot(m)) || reciente.some((m) => esBot(m) && m.metadata?.paso_a_equipo === "si")) return;

  const turnos = lista.slice().reverse()
    .filter((m) => Date.parse(m.created_at) > Date.now() - 48 * 3600e3)
    .map((m) => ({ role: m.direction === "inbound" ? "user" : "assistant", content: textoDe(m) }))
    .filter((t) => t.content)
    .slice(-16);
  if (!turnos.length || turnos[turnos.length - 1].role !== "user") turnos.push({ role: "user", content: textoDe(d) || "[mensaje sin texto]" });
  while (turnos.length && turnos[0].role !== "user") turnos.shift();
  const nombre = huesped.display_name ? ` El huésped se llama ${huesped.display_name} en WhatsApp.` : "";
  turnos[turnos.length - 1] = { role: "user", content: `[Ahora en Cartagena: ${ahoraCartagena()}.${nombre}]\n${turnos[turnos.length - 1].content}` };

  const agenda = await agendaDeLaWeb(process.env.URL || "https://www.casa-salvaje.com");
  const client = new Anthropic();
  const resp = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 12000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high" },   // en WhatsApp nadie espera en pantalla: que piense a fondo
    system: [{ type: "text", text: lineaReservas ? FICHA_RESERVAS : FICHA_WHATSAPP, cache_control: { type: "ephemeral" } }, ...(agenda ? [{ type: "text", text: agenda }] : [])],
    messages: turnos,
  });
  if (resp.stop_reason === "refusal") return;   // que lo atienda una persona
  let texto = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  let paso = null;
  texto = texto.replace(/\[\[HUMANO:\s*([\s\S]*?)\]\]/, (_, r) => { paso = r.trim(); return ""; }).trim();
  // En la línea de reservas: la solicitud completa se guarda en el panel y el equipo la confirma por este chat.
  let reserva = null;
  texto = texto.replace(/\[\[RESERVA:\s*([\s\S]*?)\]\]/, (_, j) => { reserva = lineaReservas ? leerReserva(j.trim()) : null; return ""; }).trim();
  if (reserva) {
    const fila = await guardarReserva(reserva, huesped.phone_number || huesped.bsuid);
    paso = `Reserva ${fila.lugar} ${fila.fecha} ${fila.hora}, ${fila.personas} personas, a nombre de ${fila.nombre || "sin nombre"}`;
  }
  if (!texto) return;

  await bird("/v1/whatsapp/messages", {
    method: "POST",
    body: JSON.stringify({
      from: casa,
      to: huesped.phone_number || huesped.bsuid,
      text: { body: texto.slice(0, 4000) },
      tags: [ETIQUETA],
      metadata: { responde_a: d.whatsapp_id, paso_a_equipo: paso ? "si" : "no", ...(paso ? { pedido: paso.slice(0, 200) } : {}) },
    }),
  });
  if (paso) console.log("whatsapp: pasa al equipo:", huesped.phone_number || huesped.bsuid, "-", paso);
};

export const config = { path: "/api/whatsapp" };
