import type { TipoEvaluacion } from "@/lib/control-revision";
import { esCursoDelCoordinador } from "@/lib/supervision";

// Avisos del control de revision (migracion 049): a las 7:00 p. m. del dia
// limite y el lunes siguiente llega a Telegram un mensaje por docente con el
// boton de WhatsApp listo: recordatorio a quien tiene evaluaciones pendientes y
// felicitacion a quien entrego todo a tiempo. Funciones puras: las usan el
// servidor (cron) y la vista.

/** "antes": envio manual previo a la fecha limite; "limite": el mismo dia; "lunes": despues de vencida. */
export type OcasionAviso = "antes" | "limite" | "lunes";

/** Ocasion segun la fecha de hoy: antes, el dia limite o ya vencida. */
export const ocasionPara = (fechaLimite: string, hoy: string): OcasionAviso =>
  hoy < fechaLimite ? "antes" : hoy === fechaLimite ? "limite" : "lunes";

/** Cursos que entran al control: presenciales, activos, con docente y que no sean del coordinador. */
export function entraAlControl(
  curso: { activo: boolean; virtual: boolean; anio: number; trimestre: number; docenteId: string | null },
  anio: number,
  trimestre: number,
  nombreDocente: string | null | undefined,
) {
  if (!curso.activo || curso.virtual || curso.anio !== anio || curso.trimestre !== trimestre || !curso.docenteId) {
    return false;
  }
  return !esCursoDelCoordinador(nombreDocente);
}

function sumarDias(iso: string, dias: number) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

/** Primer lunes estrictamente posterior a la fecha (si la fecha es lunes, el de la semana siguiente). */
export function lunesSiguiente(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return sumarDias(iso, ((8 - dia) % 7) || 7);
}

/** "sábado 3 de octubre" */
export function fechaEnTexto(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-GT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
    .format(new Date(Date.UTC(a, m - 1, d)))
    .replace(",", "");
}

export type CursoAviso = { curso: string; estado: "Pendiente" | "Entregado"; fechaRecepcion: string | null };

export type DocenteAviso = {
  docenteId: string;
  nombre: string;
  telefono: string | null;
  /** Como saludarlo ("querida Elly"); null = primer nombre. */
  trato: string | null;
  pendientes: string[];
  /** Entrego todos sus cursos a mas tardar el dia limite. */
  puntual: boolean;
  cursos: string[];
};

/** Agrupa los cursos por docente (un solo mensaje por docente aunque tenga varios cursos). */
export function agruparPorDocente(
  filas: Array<CursoAviso & { docenteId: string; nombre: string; telefono: string | null; trato?: string | null }>,
  fechaLimite: string,
): DocenteAviso[] {
  const porDocente = new Map<string, DocenteAviso>();
  for (const fila of filas) {
    const docente = porDocente.get(fila.docenteId) ?? {
      docenteId: fila.docenteId,
      nombre: fila.nombre,
      telefono: fila.telefono,
      trato: fila.trato ?? null,
      pendientes: [],
      puntual: true,
      cursos: [],
    };
    docente.cursos.push(fila.curso);
    if (fila.estado !== "Entregado") {
      docente.pendientes.push(fila.curso);
      docente.puntual = false;
    } else if (!fila.fechaRecepcion || fila.fechaRecepcion > fechaLimite) {
      docente.puntual = false;
    }
    porDocente.set(fila.docenteId, docente);
  }
  return [...porDocente.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? nombre;

/** Nombre corto para Telegram: primer nombre y primer apellido. */
export function nombreCorto(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length <= 2) return nombre.trim();
  // "Glenda Cecilia Corado Franco" -> "Glenda Corado"; "Elly Giron de Leon" -> "Elly Giron".
  const particula = partes.findIndex((p, i) => i > 1 && /^(de|del|la|las|los|y)$/i.test(p));
  if (particula > 0) return `${partes[0]} ${partes[particula - 1]}`;
  return `${partes[0]} ${partes.length >= 4 ? partes[2] : partes[1]}`;
}

function queEvaluacion(tipo: TipoEvaluacion, cursos: string[]) {
  const tipoTexto = tipo === "parcial" ? "parcial" : "final";
  if (cursos.length === 1) return `la evaluación ${tipoTexto} del curso *${cursos[0]}*`;
  return `las evaluaciones ${tipo === "parcial" ? "parciales" : "finales"} de los cursos:\n${cursos.map((c) => `• *${c}*`).join("\n")}\n`;
}

/** "¡Buenos días" / "¡Buenas tardes" / "¡Buenas noches" segun la hora (0-23) en Guatemala. */
export function saludoPorHora(hora: number) {
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Hora actual en Guatemala (0-23). */
export function horaGuatemala(fecha = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Guatemala", hour: "numeric", hourCycle: "h23" }).format(fecha),
  );
}

/**
 * Como se le habla al docente en el saludo ("querida Elly", "estimada Lcda. Corado"),
 * definido en su perfil. Sin trato se usa su primer nombre.
 */
const comoSaludar = (trato: string | null | undefined, nombre: string) => trato?.trim() || primerNombre(nombre);

export function mensajeRecordatorio(input: {
  nombre: string;
  trato?: string | null;
  tipo: TipoEvaluacion;
  cursos: string[];
  fechaLimite: string;
  ocasion: OcasionAviso;
}) {
  const que = queEvaluacion(input.tipo, input.cursos);
  const una = input.cursos.length === 1;
  const saludo = `¡Hola, ${comoSaludar(input.trato, input.nombre)}! 😊`;
  if (input.ocasion !== "lunes") {
    const cuando =
      input.ocasion === "limite"
        ? `hoy ${fechaEnTexto(input.fechaLimite)} es la fecha límite`
        : `el ${fechaEnTexto(input.fechaLimite)} es la fecha límite`;
    return [
      `${saludo} Espero que estés muy bien.`,
      "",
      `Te escribo para recordar que ${cuando} para entregar ${que}`.trimEnd() + (una ? "." : ""),
      "",
      `Si ya ${una ? "la tienes lista" : "las tienes listas"}, compártemel${una ? "a" : "as"} cuando puedas. Cualquier duda, con gusto te apoyo.`,
      "",
      "¡Muchas gracias! 🙌",
    ].join("\n");
  }
  return [
    `${saludo} Feliz inicio de semana.`,
    "",
    una
      ? `Te escribo para recordar que aún tengo pendiente ${que}, cuya fecha límite fue el ${fechaEnTexto(input.fechaLimite)}.`
      : `Te escribo para recordar que aún tengo pendientes ${que.trimEnd()}\n\nSu fecha límite fue el ${fechaEnTexto(input.fechaLimite)}.`,
    "",
    `¿Me ${una ? "la" : "las"} podrías enviar a la brevedad? Así podré revisar${una ? "la" : "las"} y enviarte la retroalimentación a tiempo. Si tienes algún inconveniente, avísame y lo vemos juntos.`,
    "",
    "¡Muchas gracias! 🙌",
  ].join("\n");
}

export function mensajeFelicitacion(input: {
  trato?: string | null;
  tipo: TipoEvaluacion;
  cursos: string[];
  /** Hora en Guatemala (0-23) para el saludo; por defecto, la actual. */
  hora?: number;
}) {
  const saludo = saludoPorHora(input.hora ?? horaGuatemala());
  const trato = input.trato?.trim();
  return [
    `¡${saludo}${trato ? `, ${trato}` : ""}! 🎉`,
    "",
    `Quiero felicitarte por entregar a tiempo ${queEvaluacion(input.tipo, input.cursos)}`.trimEnd() +
      (input.cursos.length === 1 ? "." : ""),
    "",
    "Esa puntualidad muestra el compromiso con los estudiantes y con la facultad, lo que nos ayuda a gestionar bien todo en equipo.",
    "",
    "¡Gracias por ese excelente trabajo! 👏",
  ].join("\n");
}
