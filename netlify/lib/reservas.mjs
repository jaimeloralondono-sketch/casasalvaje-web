// Solicitudes de reserva que toma el bot en el WhatsApp de reservas. Se guardan en Netlify Blobs ("reservas").
// El equipo las ve y les cambia el estado en /reservas/admin.
import { getStore } from "@netlify/blobs";

export const LUGARES = ["kanibal", "slvj", "club"];
export const ESTADOS = ["pendiente", "confirmada", "en-covermanager", "cancelada"];
const store = () => getStore("reservas");
const txt = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Lee la marca [[RESERVA: {...}]] del texto del bot. Devuelve los datos limpios o null.
export function leerReserva(json) {
  let r;
  try { r = JSON.parse(json); } catch { return null; }
  if (!r || typeof r !== "object") return null;
  const lugar = txt(r.lugar, 20).toLowerCase();
  const fecha = txt(r.fecha, 10), hora = txt(r.hora, 5);
  const personas = Math.round(Number(r.personas));
  if (!LUGARES.includes(lugar) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{1,2}:\d{2}$/.test(hora) || !(personas >= 1 && personas <= 60)) return null;
  return { lugar, fecha, hora, personas, nombre: txt(r.nombre, 80), ocasion: txt(r.ocasion, 120), notas: txt(r.notas, 300), idioma: txt(r.idioma, 10) };
}

export async function guardarReserva(datos, telefono) {
  const id = `${datos.fecha}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const fila = { id, ...datos, telefono: txt(telefono, 40), estado: "pendiente", creada: new Date().toISOString() };
  await store().setJSON(id, fila);
  return fila;
}

export async function listarReservas() {
  const s = store(), { blobs } = await s.list();
  const filas = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return filas.filter(Boolean).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

export async function cambiarEstado(id, estado) {
  if (!ESTADOS.includes(estado) || !/^[\w-]{6,80}$/.test(String(id || ""))) return null;
  const s = store(), fila = await s.get(id, { type: "json" });
  if (!fila) return null;
  fila.estado = estado; fila.actualizada = new Date().toISOString();
  await s.setJSON(id, fila);
  return fila;
}
