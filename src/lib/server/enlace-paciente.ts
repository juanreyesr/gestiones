import crypto from "node:crypto";
import { appUrl } from "./telegram";

// Boton "Escribirle por WhatsApp" de Telegram (enviar mensaje a <paciente>):
// abre /api/wa/paciente?t=<id>.<firma>, que arma "Buenos días/tardes/noches,
// (nombre), te escribo para " con la hora del momento en que se toca y
// redirige a WhatsApp. La firma (HMAC con llave derivada de CRON_SECRET)
// impide usar la ruta con otros pacientes.

function llave() {
  const secreto = process.env.CRON_SECRET;
  return secreto ? crypto.createHmac("sha256", secreto).update("gestionesjj:wa-paciente").digest() : null;
}

const firma = (id: string, clave: Buffer) => crypto.createHmac("sha256", clave).update(id).digest("base64url").slice(0, 24);

/** URL firmada del boton; null si falta configuracion. */
export function urlMensajePaciente(pacienteId: string) {
  const clave = llave();
  const base = appUrl("/api/wa/paciente");
  if (!clave || !base) return null;
  return `${base}?t=${encodeURIComponent(`${pacienteId}.${firma(pacienteId, clave)}`)}`;
}

/** Id del paciente si el token es valido; null si no. */
export function pacienteDeToken(token: string | null) {
  const clave = llave();
  if (!clave || !token) return null;
  const [id, s] = token.split(".");
  if (!id || !s || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const esperada = Buffer.from(firma(id, clave));
  const recibida = Buffer.from(s);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida) ? id : null;
}
