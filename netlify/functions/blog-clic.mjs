// POST /api/blog/clic { t, a, p } -> anota una visita o un clic de reserva que llega desde un artículo del blog.
// t: "vista" (alguien abrió el artículo), "reserva" (botón Reservar), "whatsapp" o "lista" (lista de invitados).
// a: el artículo (nombre del archivo sin .html). Se guarda por mes en Netlify Blobs, sin datos personales.
import { getStore } from "@netlify/blobs";

const TIPOS = ["vista", "reserva", "whatsapp", "lista"];

export default async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  let d;
  try {
    d = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!TIPOS.includes(d.t) || !/^[a-z0-9-]{3,90}$/.test(d.a || "")) return new Response(null, { status: 400 });
  const mes = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7);
  const store = getStore("blog-metricas");
  const datos = (await store.get(mes, { type: "json" })) || {};
  const fila = (datos[d.a] = datos[d.a] || {});
  fila[d.t] = (fila[d.t] || 0) + 1;
  await store.setJSON(mes, datos);
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/blog/clic" };
