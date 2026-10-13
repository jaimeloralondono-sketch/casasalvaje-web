// POST /api/plan  { plan: { llegada, noches, personas, quedarse[], dia[], noche[], ocasion, nota, idioma } }  ->  JSON del plan en streaming (texto).
// "Arma tu plan" del concierge: Claude ordena lo que eligió el huésped en un plan día por día con la ficha de la casa.
// Necesita ANTHROPIC_API_KEY en Netlify; sin ella responde 503 y la página ofrece WhatsApp.
import Anthropic from "@anthropic-ai/sdk";
import { FICHA } from "../lib/ficha.mjs";
import { PLAN_REGLAS, limpiarPlan, pedidoPlan } from "../lib/plan.mjs";
import { agendaDeLaWeb } from "../lib/agenda.mjs";

const texto = (t, status) => new Response(t, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

function hoyCartagena() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day));
}

export default async (req) => {
  if (req.method !== "POST") return texto("Método no permitido", 405);
  if (!process.env.ANTHROPIC_API_KEY) return texto("sin-clave", 503);

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return texto("JSON inválido", 400); }
  const sel = limpiarPlan(cuerpo?.plan);
  if (!sel) return texto("Falta el plan", 400);

  const agenda = await agendaDeLaWeb(process.env.URL || new URL(req.url).origin);
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [{ type: "text", text: FICHA + PLAN_REGLAS, cache_control: { type: "ephemeral" } }, ...(agenda ? [{ type: "text", text: agenda }] : [])],
    messages: [{ role: "user", content: pedidoPlan(sel, hoyCartagena()) }],
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
        console.error("plan:", e?.status || "", e?.message || e);
        ctrl.enqueue(enc.encode("\n[[ERROR]]"));
      } finally {
        ctrl.close();
      }
    },
    cancel() { stream.abort(); },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
};

export const config = { path: "/api/plan" };
