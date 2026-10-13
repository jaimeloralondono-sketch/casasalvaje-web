// POST /api/blog/metricas { clave } -> { meses: { "2026-10": { articulo: { vista, reserva, whatsapp, lista } } } }
import { getStore } from "@netlify/blobs";
import { claveValida, json } from "../lib/tarjeta.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  let d;
  try {
    d = await req.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  if (!process.env.ADMIN_KEY) return json({ error: "Falta ADMIN_KEY en Netlify." }, 503);
  if (!claveValida(d.clave)) return json({ error: "Clave incorrecta." }, 401);
  const store = getStore("blog-metricas");
  const { blobs } = await store.list();
  const meses = {};
  for (const b of blobs) meses[b.key] = (await store.get(b.key, { type: "json" })) || {};
  return json({ meses });
};

export const config = { path: "/api/blog/metricas" };
