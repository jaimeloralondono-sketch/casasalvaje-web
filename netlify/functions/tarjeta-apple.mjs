// GET /api/tarjeta/apple?t=... -> pase .pkpass firmado para Apple Wallet.
import fs from "node:fs";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { MARCA, leerToken, mesAno, pem, texto } from "../lib/tarjeta.mjs";

const ARCHIVOS = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "logo@3x.png", "strip.png", "strip@2x.png", "strip@3x.png"];

// Netlify copia netlify/pase/** junto a la función (included_files en netlify.toml).
function carpetaPase() {
  const opciones = [path.resolve("netlify/pase"), path.resolve(process.cwd(), "netlify/pase"), "/var/task/netlify/pase"];
  return opciones.find((p) => fs.existsSync(path.join(p, "icon.png")));
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

// Los certificados públicos pueden ir en variables o como archivo en netlify/pase/certs/.
function certificado(variable, archivo, dir) {
  const v = pem(variable);
  if (v) return v;
  const f = dir && path.join(dir, "certs", archivo);
  return f && fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

export default async (req) => {
  const miembro = leerToken(new URL(req.url).searchParams.get("t"));
  if (!miembro) return texto("Este enlace de tarjeta no es válido.", 404);

  const dir = carpetaPase();
  const certs = {
    wwdr: certificado("APPLE_WWDR_CERT", "wwdr.pem", dir),
    signerCert: certificado("APPLE_SIGNER_CERT", "signerCert.pem", dir),
    signerKey: pem("APPLE_SIGNER_KEY"),
    signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
  };
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID;
  const teamIdentifier = process.env.APPLE_TEAM_ID;
  if (!dir || !certs.wwdr || !certs.signerCert || !certs.signerKey || !passTypeIdentifier || !teamIdentifier) {
    return texto("Apple Wallet todavía no está configurado.", 503);
  }

  const archivos = {
    "pass.json": Buffer.from(
      JSON.stringify({
        formatVersion: 1,
        passTypeIdentifier,
        teamIdentifier,
        serialNumber: `CS-${miembro.id}`,
        organizationName: MARCA.nombre,
        description: "Tarjeta de miembro de Casa Salvaje",
        backgroundColor: rgb(MARCA.fondo),
        foregroundColor: rgb(MARCA.texto),
        labelColor: rgb(MARCA.etiqueta),
        sharingProhibited: true,
        storeCard: {},
      })
    ),
  };
  for (const f of ARCHIVOS) archivos[f] = fs.readFileSync(path.join(dir, f));

  const pase = new PKPass(archivos, certs);
  pase.headerFields.push({ key: "nivel", label: "NIVEL", value: miembro.v });
  pase.secondaryFields.push({ key: "miembro", label: "MIEMBRO", value: miembro.n });
  pase.auxiliaryFields.push(
    { key: "numero", label: "Nº", value: miembro.id },
    { key: "desde", label: "DESDE", value: mesAno(miembro.d), textAlignment: "PKTextAlignmentRight" }
  );
  pase.backFields.push(
    { key: "casa", label: "Casa Salvaje", value: "La Domenica · Kanibal · SLVJ · ONO" },
    { key: "direccion", label: "Dirección", value: MARCA.direccion },
    { key: "reservas", label: "Reservas", value: MARCA.whatsapp, attributedValue: `<a href="${MARCA.whatsapp}">WhatsApp</a>` },
    { key: "instagram", label: "Instagram", value: MARCA.instagram, attributedValue: `<a href="${MARCA.instagram}">@casasalvaje.ctg</a>` },
    { key: "nota", label: "Tarjeta personal", value: "Muéstrala al llegar. Es intransferible." }
  );
  pase.setBarcodes({ message: `CS-${miembro.id}`, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1", altText: miembro.id });

  return new Response(pase.getAsBuffer(), {
    headers: {
      "content-type": "application/vnd.apple.pkpass",
      "content-disposition": `attachment; filename="casa-salvaje-${miembro.id.toLowerCase()}.pkpass"`,
      "cache-control": "no-store",
    },
  });
};

export const config = { path: "/api/tarjeta/apple" };
