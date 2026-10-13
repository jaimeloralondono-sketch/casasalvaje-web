// POST /api/concierge  { messages: [{ role: "user"|"assistant", content: "..." }] }  ->  texto en streaming.
// El chat del concierge para huéspedes (concierge.html). Responde con Claude usando la ficha de la casa.
// Necesita ANTHROPIC_API_KEY en las variables de entorno de Netlify; sin ella responde 503 y la página ofrece WhatsApp.
import Anthropic from "@anthropic-ai/sdk";
import { FICHA_WEB } from "../lib/ficha.mjs";
import { agendaDeLaWeb } from "../lib/agenda.mjs";

const MAX_TURNOS = 20, MAX_LARGO = 1500;

const texto = (t, status) => new Response(t, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

function ahoraCartagena() {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date());
}

export default async (req) => {
  if (req.method !== "POST") return texto("Método no permitido", 405);
  if (!process.env.ANTHROPIC_API_KEY) return texto("sin-clave", 503);

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return texto("JSON inválido", 400); }
  const msgs = Array.isArray(cuerpo?.messages) ? cuerpo.messages.slice(-MAX_TURNOS) : [];
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const limpios = msgs.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, MAX_LARGO).trim() }))
    .filter((m) => m.content);
  if (!limpios.length || limpios[limpios.length - 1].role !== "user") return texto("Falta el mensaje", 400);
  // La hora va en el último turno, no en el system, para no romper la caché del prompt.
  const ultimo = limpios[limpios.length - 1];
  ultimo.content = `[Ahora en Cartagena: ${ahoraCartagena()}]\n${ultimo.content}`;

  const agenda = await agendaDeLaWeb(process.env.URL || new URL(req.url).origin);
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 12000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },   // piensa antes de responder; "low" era más rápido pero más plano
    system: [{ type: "text", text: FICHA_WEB, cache_control: { type: "ephemeral" } }, ...(agenda ? [{ type: "text", text: agenda }] : [])],
    messages: limpios,
  });

  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") ctrl.enqueue(enc.encode(ev.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") ctrl.enqueue(enc.encode("\n[[REFUSAL]]"));
      } catch (e) {
        console.error("concierge:", e?.status || "", e?.message || e);
        ctrl.enqueue(enc.encode("\n[[ERROR]]"));
      } finally {
        ctrl.close();
      }
    },
    cancel() { stream.abort(); },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
};

export const config = { path: "/api/concierge" };
