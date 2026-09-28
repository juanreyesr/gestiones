# Instrucciones para Claude

## Comunicación
- Responder **siempre en español**, también en commits, descripciones de PR y comentarios de código.
- Respuestas puntuales y verificadas; al final, sugerir el siguiente paso lógico.

## Flujo de trabajo
- Cuando un PR propio esté en verde (despliegue de Vercel exitoso) y sin conflictos, marcarlo como listo y **fusionarlo sin preguntar** (squash).
- Antes de subir cambios: `npx tsc --noEmit -p .`, `pnpm lint` (0 errores) y `pnpm build`.

## Proyecto
- Next.js (App Router) + Supabase, desplegado en Vercel en `www.juanjreyes.org`.
- Sitio público estático: se genera con `node sitio-web/build.mjs` hacia `public/es` y `public/en`; no editar esos HTML a mano (ver `sitio-web/README.md`).
- `/admin` (GestionesJJ) y `/estudiante` (Aula virtual) bloquean el "atrás" del navegador (`src/lib/use-bloquear-atras.ts`); la salida al sitio es el botón "Página principal".
- Pagos: `/pagar` → enlace de PayPal; `/pago/gracias`; aviso por Telegram desde `/api/paypal/webhook` (ver README, "Pagos de consultas con PayPal").
