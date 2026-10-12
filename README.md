# Casa Salvaje · casasalvaje.com

Sitio estático de Casa Salvaje (Cartagena). Netlify lo publica tal cual: sin comando de build, carpeta de publicación = raíz.

## Tarjetas de miembro (Apple Wallet y Google Wallet)

- `tarjetas/admin` (`tarjetas-admin.html`): panel interno. Con la clave del panel se crea el enlace de la tarjeta de un miembro y se envía por WhatsApp.
- `tarjeta?t=…` (`tarjeta.html`): página del miembro con la vista previa y los botones para añadirla a Apple Wallet o Google Wallet.
- Funciones en `netlify/functions` (Netlify instala `passkit-generator` desde `package.json`):
  - `POST /api/tarjeta/crear`: valida la clave y firma los datos del miembro.
  - `GET /api/tarjeta/apple?t=…`: genera el `.pkpass` firmado.
  - `GET /api/tarjeta/google?t=…`: redirige a "Guardar en Google Wallet".
- Imágenes del pase de Apple: `netlify/pase` (icon, logo y strip en @1x/@2x/@3x; el strip mide 375×123 pt). La imagen de Google Wallet es `img/tarjeta/hero.jpg` (1032×336).

Variables de entorno en Netlify (Site configuration → Environment variables):

| Variable | Qué es |
| --- | --- |
| `ADMIN_KEY` | Clave del panel de tarjetas. |
| `CARD_SECRET` | Texto aleatorio largo para firmar los enlaces. Si cambia, los enlaces ya enviados dejan de funcionar. |
| `APPLE_PASS_TYPE_ID` | Pass Type ID de Apple Developer, p. ej. `pass.com.casa-salvaje.miembro`. |
| `APPLE_TEAM_ID` | Team ID de la cuenta de Apple Developer. |
| `APPLE_SIGNER_KEY` | Clave privada del certificado del Pass Type ID (PEM o base64). |
| `APPLE_SIGNER_KEY_PASSPHRASE` | Contraseña de esa clave, si tiene. |
| `APPLE_SIGNER_CERT`, `APPLE_WWDR_CERT` | Certificado del Pass Type ID y certificado WWDR G4 de Apple (PEM). Son públicos: también pueden ir como `netlify/pase/certs/signerCert.pem` y `netlify/pase/certs/wwdr.pem`. |
| `GOOGLE_ISSUER_ID` | Issuer ID de la Google Pay & Wallet Console. |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_KEY` | Correo y clave privada (`private_key` del JSON) de la cuenta de servicio con acceso al emisor. |

Las funciones de Netlify admiten 4 KB de variables en total, así que conviene dejar los certificados públicos de Apple como archivos y en variables solo las claves privadas.
