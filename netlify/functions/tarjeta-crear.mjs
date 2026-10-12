// POST /api/tarjeta/crear { clave, nombre, numero, nivel, desde } -> { url } del enlace para el miembro.
import { claveValida, crearToken, json, sitio } from "../lib/tarjeta.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  let datos;
  try {
    datos = await req.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }
  if (!process.env.ADMIN_KEY || !process.env.CARD_SECRET) return json({ error: "Faltan ADMIN_KEY y CARD_SECRET en Netlify." }, 503);
  if (!claveValida(datos.clave)) return json({ error: "Clave incorrecta." }, 401);
  try {
    const t = crearToken(datos);
    return json({ url: `${sitio(req)}/tarjeta?t=${t}` });
  } catch (e) {
    return json({ error: e.message }, 400);
  }
};

export const config = { path: "/api/tarjeta/crear" };
