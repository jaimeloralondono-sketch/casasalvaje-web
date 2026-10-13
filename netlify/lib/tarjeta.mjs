// Tarjetas de miembro de Casa Salvaje.
// Cada tarjeta viaja en un enlace firmado (/tarjeta?t=...): los datos del miembro
// en base64url más una firma HMAC con CARD_SECRET. No hay base de datos; quien
// tiene el enlace puede añadir su tarjeta a Apple Wallet o Google Wallet.
import crypto from "node:crypto";

export const MARCA = {
  nombre: "Casa Salvaje",
  fondo: "#1437B5", // cobalto
  texto: "#F3EBDD", // crema
  etiqueta: "#D9A441", // ámbar
  direccion: "Calle Santa Teresa #32-41, Centro Histórico, Cartagena",
  instagram: "https://www.instagram.com/casasalvaje.ctg",
  whatsapp: "https://wa.me/573108286602",
};

function secreto() {
  const s = process.env.CARD_SECRET;
  if (!s || s.length < 16) throw new Error("Falta CARD_SECRET (mínimo 16 caracteres).");
  return s;
}

function firma(datos) {
  return crypto.createHmac("sha256", secreto()).update(datos).digest("base64url").slice(0, 32);
}

function iguales(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// Limpia y valida lo que llega del panel. Devuelve { n, id, v, d } o lanza un error legible.
export function normalizar({ nombre, numero, nivel, desde }) {
  const n = String(nombre || "").trim().replace(/\s+/g, " ");
  const id = String(numero || "").trim().toUpperCase();
  const v = String(nivel || "Miembro").trim().replace(/\s+/g, " ");
  const d = String(desde || new Date().toISOString().slice(0, 7)).trim();
  if (!n || n.length > 40) throw new Error("El nombre es obligatorio y de máximo 40 caracteres.");
  if (!/^[A-Z0-9-]{1,12}$/.test(id)) throw new Error("El número solo puede tener letras, números y guiones (máximo 12).");
  if (v.length > 24) throw new Error("El nivel es de máximo 24 caracteres.");
  if (!/^\d{4}-\d{2}$/.test(d)) throw new Error("La fecha de ingreso va como AAAA-MM.");
  return { n, id, v, d };
}

export function crearToken(miembro) {
  const datos = Buffer.from(JSON.stringify(normalizar(miembro))).toString("base64url");
  return `${datos}.${firma(datos)}`;
}

export function leerToken(token) {
  const [datos, f] = String(token || "").split(".");
  if (!datos || !f || !iguales(f, firma(datos))) return null;
  try {
    const m = JSON.parse(Buffer.from(datos, "base64url").toString("utf8"));
    return normalizar({ nombre: m.n, numero: m.id, nivel: m.v, desde: m.d });
  } catch {
    return null;
  }
}

export function claveValida(clave) {
  const k = process.env.ADMIN_KEY;
  return Boolean(k) && iguales(clave || "", k);
}

export function sitio(req) {
  return (process.env.URL || new URL(req.url).origin).replace(/\/$/, "");
}

// "2026-10" -> "Oct 2026"
export function mesAno(d) {
  const [a, m] = d.split("-").map(Number);
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${meses[m - 1] || ""} ${a}`.trim();
}

// Las claves pueden pegarse en Netlify como PEM con saltos de línea, con "\n" literales o en base64.
export function pem(nombre) {
  let v = process.env[nombre];
  if (!v) return null;
  v = v.trim();
  if (!v.includes("-----BEGIN")) v = Buffer.from(v, "base64").toString("utf8");
  return v.replace(/\\n/g, "\n");
}

export function json(cuerpo, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function texto(mensaje, status) {
  return new Response(mensaje, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
