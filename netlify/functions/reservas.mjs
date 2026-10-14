// POST /api/reservas { clave }                         -> { reservas: [...] }
// POST /api/reservas { clave, id, estado }             -> { reserva }   (pendiente | confirmada | en-covermanager | cancelada)
// Panel del equipo para las solicitudes que toma el bot en el WhatsApp de reservas.
import { claveValida, json } from "../lib/tarjeta.mjs";
import { listarReservas, cambiarEstado } from "../lib/reservas.mjs";

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
  if (d.id) {
    const reserva = await cambiarEstado(d.id, d.estado);
    return reserva ? json({ reserva }) : json({ error: "No se encontró la reserva o el estado no es válido." }, 400);
  }
  return json({ reservas: await listarReservas() });
};

export const config = { path: "/api/reservas" };
