import crypto from "node:crypto";
import type { TipoEvaluacion } from "@/lib/control-revision";
import { appUrl } from "./telegram";

// Enlace firmado del boton "Enviar felicitación por WhatsApp" de Telegram.
// La URL de un boton de Telegram queda fija al enviar el aviso (7:00 p. m.),
// asi que el saludo ("Buenos días / tardes / noches") no puede ir dentro.
// El boton abre /api/wa/felicitacion con los datos firmados; esa ruta arma el
// mensaje con la hora de ese momento y redirige a WhatsApp. La firma (HMAC con
// CRON_SECRET) impide cambiar el numero o el texto desde fuera.

export type DatosFelicitacion = {
  telefono: string | null;
  trato: string | null;
  tipo: TipoEvaluacion;
  cursos: string[];
  /** Felicitacion (a tiempo) o agradecimiento (entrego tarde); sin dato, felicitacion. */
  clase?: "felicitacion" | "agradecimiento";
  /** Vencimiento (ms desde epoch): el enlace deja de servir a los 60 dias. */
  vence: number;
};

const VIGENCIA_MS = 60 * 86_400_000;

function llave() {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return null;
  // Llave derivada: el secreto del cron no se usa tal cual para otra cosa.
  return crypto.createHmac("sha256", secreto).update("gestionesjj:wa-felicitacion").digest();
}

const firmar = (datos: string, clave: Buffer) => crypto.createHmac("sha256", clave).update(datos).digest("base64url");

/** URL firmada del boton; null si falta configuracion (se usa el enlace fijo). */
export function urlFelicitacion(datos: Omit<DatosFelicitacion, "vence">) {
  const clave = llave();
  const base = appUrl("/api/wa/felicitacion");
  if (!clave || !base) return null;
  const d = Buffer.from(JSON.stringify({ ...datos, vence: Date.now() + VIGENCIA_MS }), "utf8").toString("base64url");
  return `${base}?d=${d}&s=${firmar(d, clave)}`;
}

/** Valida la firma y el vencimiento; null si el enlace no es valido. */
export function leerFelicitacion(d: string | null, s: string | null): DatosFelicitacion | null {
  const clave = llave();
  if (!clave || !d || !s) return null;
  const esperada = Buffer.from(firmar(d, clave));
  const recibida = Buffer.from(s);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  try {
    const datos = JSON.parse(Buffer.from(d, "base64url").toString("utf8")) as DatosFelicitacion;
    if (typeof datos.vence !== "number" || datos.vence < Date.now()) return null;
    if (datos.tipo !== "parcial" && datos.tipo !== "final") return null;
    if (!Array.isArray(datos.cursos) || !datos.cursos.every((c) => typeof c === "string")) return null;
    if (datos.clase !== undefined && datos.clase !== "felicitacion" && datos.clase !== "agradecimiento") return null;
    return datos;
  } catch {
    return null;
  }
}
