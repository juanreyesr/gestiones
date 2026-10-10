// Cumpleaños de docentes (fecha de nacimiento en Control de docentes,
// migracion 054). Funciones puras: las usan la alerta de Coordinacion (desde 7
// dias antes) y el aviso de Telegram del cron de las 7:00 a. m. (el dia del
// cumpleaños, con boton de WhatsApp). Todo en fechas YYYY-MM-DD de Guatemala.

import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { fechaEnTexto } from "@/lib/control-revision-mensajes";

export type DocenteCumple = {
  id: string;
  nombre: string;
  telefono: string | null;
  trato: string | null;
  femenino: boolean;
  fecha_nacimiento: string | null;
};

export type ProximoCumple<T extends DocenteCumple = DocenteCumple> = {
  docente: T;
  /** Fecha del cumpleaños (YYYY-MM-DD) en el año en que cae. */
  fecha: string;
  /** 0 = hoy. */
  diasFaltan: number;
  /** Años que cumple (null si la fecha no es razonable). */
  edad: number | null;
};

/** Dias de anticipacion de la alerta en Coordinacion. */
export const DIAS_ALERTA_CUMPLE = 7;

/** Hoy en Guatemala (YYYY-MM-DD), sin importar la zona del navegador. */
export const hoyGuatemala = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());

const esBisiesto = (anio: number) => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha del cumpleaños en ese año; los del 29 de febrero se celebran el 28 en años no bisiestos. */
function cumpleEnAnio(fechaNacimiento: string, anio: number) {
  const [, mes, dia] = fechaNacimiento.slice(0, 10).split("-").map(Number);
  const d = mes === 2 && dia === 29 && !esBisiesto(anio) ? 28 : dia;
  return `${anio}-${dos(mes)}-${dos(d)}`;
}

const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

/** Proximo cumpleaños (hoy incluido) y cuantos dias faltan. */
export function proximoCumple(fechaNacimiento: string, hoy: string) {
  const anioHoy = Number(hoy.slice(0, 4));
  let anio = anioHoy;
  let fecha = cumpleEnAnio(fechaNacimiento, anio);
  if (fecha < hoy) {
    anio += 1;
    fecha = cumpleEnAnio(fechaNacimiento, anio);
  }
  const edad = anio - Number(fechaNacimiento.slice(0, 4));
  return { fecha, diasFaltan: diasEntre(hoy, fecha), edad: edad > 0 && edad < 120 ? edad : null };
}

/** Docentes que cumplen años en los proximos `dias` (hoy incluido), del mas cercano al mas lejano. */
export function cumpleanosProximos<T extends DocenteCumple>(docentes: T[], hoy: string, dias = DIAS_ALERTA_CUMPLE) {
  const resultado: ProximoCumple<T>[] = [];
  for (const docente of docentes) {
    if (!docente.fecha_nacimiento) continue;
    const proximo = proximoCumple(docente.fecha_nacimiento, hoy);
    if (proximo.diasFaltan <= dias) resultado.push({ docente, ...proximo });
  }
  return resultado.sort((a, b) => a.diasFaltan - b.diasFaltan || a.docente.nombre.localeCompare(b.docente.nombre, "es"));
}

/** "17 de octubre" (sin año), para mostrar el cumpleaños en la lista. */
export function diaYMes(fechaNacimiento: string) {
  return fechaEnTexto(fechaNacimiento).replace(/^\S+\s/, "");
}

/** "Licda. Brigette Marroquin" */
export const nombreConTitulo = (d: { nombre: string; femenino: boolean }) => `${d.femenino ? "Licda." : "Lic."} ${d.nombre}`;

/** "sábado 17 de octubre" */
export const fechaEnTextoCumple = fechaEnTexto;

/** "hoy", "mañana", "en 5 días (sábado 17 de octubre)" */
export function cuandoCumple(diasFaltan: number, fecha: string) {
  if (diasFaltan === 0) return "hoy";
  if (diasFaltan === 1) return `mañana (${fechaEnTexto(fecha)})`;
  return `en ${diasFaltan} días (${fechaEnTexto(fecha)})`;
}

/**
 * Felicitacion por WhatsApp con el trato del perfil ("estimada Lcda. Brigette",
 * "querida Elly"); sin trato, su primer nombre. Como la de los pacientes, no
 * depende de la hora, asi el enlace puede ir fijo en el boton de Telegram.
 */
export function mensajeCumpleanosDocente(docente: { nombre: string; trato: string | null }) {
  const como = docente.trato?.trim() || docente.nombre.trim().split(/\s+/)[0] || "";
  return [
    `¡Feliz cumpleaños${como ? `, ${como}` : ""}! 🎉🎂`,
    "",
    "Espero que hoy pases un día muy especial junto a tus seres queridos. Gracias por tu compromiso y por todo lo que aportas a los estudiantes y a la facultad.",
    "",
    "Que Dios te bendiga grandemente en este nuevo año de vida y te llene de salud, alegría y muchos éxitos. ¡Disfruta mucho tu día! 🥳",
  ].join("\n");
}

/** Enlace de WhatsApp al docente con la felicitacion ya escrita (Guatemala si el numero no trae +codigo). */
export const enlaceCumpleanosDocente = (docente: { nombre: string; trato: string | null; telefono: string | null }) =>
  enlaceWhatsApp(docente.telefono, mensajeCumpleanosDocente(docente));
