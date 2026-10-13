// GET /api/tarjeta/google?t=... -> redirige a "Guardar en Google Wallet" con un JWT firmado.
import crypto from "node:crypto";
import { MARCA, leerToken, mesAno, pem, sitio, texto } from "../lib/tarjeta.mjs";

const b64u = (x) => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
const local = (value) => ({ defaultValue: { language: "es", value } });

export default async (req) => {
  const miembro = leerToken(new URL(req.url).searchParams.get("t"));
  if (!miembro) return texto("Este enlace de tarjeta no es válido.", 404);

  const issuer = process.env.GOOGLE_ISSUER_ID;
  const email = process.env.GOOGLE_SA_EMAIL;
  const clave = pem("GOOGLE_SA_KEY");
  if (!issuer || !email || !clave) return texto("Google Wallet todavía no está configurado.", 503);

  const base = sitio(req);
  const classId = `${issuer}.casa_salvaje_miembro`;
  const objeto = {
    id: `${issuer}.miembro_${miembro.id.replace(/[^A-Z0-9_-]/g, "_")}`,
    classId,
    state: "ACTIVE",
    hexBackgroundColor: MARCA.fondo,
    logo: { sourceUri: { uri: `${base}/img/icon-512.png` }, contentDescription: local("Casa Salvaje") },
    cardTitle: local(MARCA.nombre),
    subheader: local(miembro.v),
    header: local(miembro.n),
    heroImage: { sourceUri: { uri: `${base}/img/tarjeta/hero.jpg` }, contentDescription: local("Jaguar en mosaico, Casa Salvaje") },
    barcode: { type: "QR_CODE", value: `CS-${miembro.id}`, alternateText: miembro.id },
    textModulesData: [
      { id: "numero", header: "Nº", body: miembro.id },
      { id: "desde", header: "Desde", body: mesAno(miembro.d) },
      { id: "direccion", header: "Dirección", body: MARCA.direccion },
    ],
    linksModuleData: {
      uris: [
        { id: "reservas", uri: MARCA.whatsapp, description: "Reservas por WhatsApp" },
        { id: "instagram", uri: MARCA.instagram, description: "Instagram" },
      ],
    },
  };

  const cabecera = { alg: "RS256", typ: "JWT" };
  const cuerpo = {
    iss: email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [base],
    payload: { genericClasses: [{ id: classId }], genericObjects: [objeto] },
  };
  const sinFirma = `${b64u(cabecera)}.${b64u(cuerpo)}`;
  const firma = crypto.createSign("RSA-SHA256").update(sinFirma).sign(clave).toString("base64url");

  return new Response(null, {
    status: 302,
    headers: { location: `https://pay.google.com/gp/v/save/${sinFirma}.${firma}`, "cache-control": "no-store" },
  });
};

export const config = { path: "/api/tarjeta/google" };
