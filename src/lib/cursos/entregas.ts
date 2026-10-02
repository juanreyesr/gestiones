import { getSupabaseClient } from "@/lib/supabase";
import type { ActividadConSemanaRow, CalificacionRow, EntregaArchivoRow, EntregaRow, EstudianteRow } from "./types";

const BUCKET = "gestionesjj-entregas";

export type EntregaConArchivos = EntregaRow & { archivos: EntregaArchivoRow[] };

/**
 * Ojo con los IDs: gestionesjj_curso_entregas.estudiante_id apunta a la
 * identidad global del estudiante (gestionesjj_estudiantes.id), mientras que
 * las calificaciones y la lista del curso usan la inscripción
 * (gestionesjj_curso_estudiantes.id). Para cruzarlas se usa
 * EstudianteRow.estudiante_id, nunca EstudianteRow.id.
 */
async function adjuntarArchivos(entregas: EntregaRow[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EntregaConArchivos[], error: "Faltan las variables de Supabase." };

  const entregaIds = entregas.map((e) => e.id);
  if (!entregaIds.length) return { data: [] as EntregaConArchivos[], error: null };

  const { data: archivos, error: archivosError } = await supabase
    .from("gestionesjj_curso_entrega_archivos")
    .select("*")
    .in("entrega_id", entregaIds)
    .order("created_at");
  if (archivosError) return { data: [] as EntregaConArchivos[], error: archivosError.message };

  const archivosPorEntrega = new Map<string, EntregaArchivoRow[]>();
  for (const archivo of (archivos ?? []) as EntregaArchivoRow[]) {
    const lista = archivosPorEntrega.get(archivo.entrega_id) ?? [];
    lista.push(archivo);
    archivosPorEntrega.set(archivo.entrega_id, lista);
  }

  const data = entregas.map((entrega) => ({ ...entrega, archivos: archivosPorEntrega.get(entrega.id) ?? [] }));
  return { data, error: null };
}

/** Entregas y sus archivos para una tarea, para que el docente las revise y califique. */
export async function fetchEntregasDeActividad(actividadId: string) {
  return fetchEntregasDeActividades([actividadId]);
}

/** Entregas (con archivos) de varias tareas a la vez, p. ej. todas las de una semana. */
export async function fetchEntregasDeActividades(actividadIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EntregaConArchivos[], error: "Faltan las variables de Supabase." };
  if (!actividadIds.length) return { data: [] as EntregaConArchivos[], error: null };

  const { data: entregas, error } = await supabase
    .from("gestionesjj_curso_entregas")
    .select("*")
    .in("actividad_id", actividadIds)
    .order("entregado_en", { ascending: false });
  if (error) return { data: [] as EntregaConArchivos[], error: error.message };

  return adjuntarArchivos((entregas ?? []) as EntregaRow[]);
}

export type EntregaDeCurso = EntregaConArchivos & { actividad: ActividadConSemanaRow };

/** Todas las entregas del curso con su tarea y número de semana, para la bandeja de "Tareas por calificar". */
export async function fetchEntregasDeCurso(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EntregaDeCurso[], error: "Faltan las variables de Supabase." };

  const { data: entregas, error } = await supabase
    .from("gestionesjj_curso_entregas")
    .select(
      "*, gestionesjj_curso_actividades!inner(*, gestionesjj_curso_semanas!inner(curso_id,numero))",
    )
    .eq("gestionesjj_curso_actividades.gestionesjj_curso_semanas.curso_id", cursoId)
    .order("entregado_en", { ascending: false });
  if (error) return { data: [] as EntregaDeCurso[], error: error.message };

  const filas = (entregas ?? []) as unknown as Array<EntregaRow & { gestionesjj_curso_actividades: ActividadConSemanaRow }>;
  const { data: conArchivos, error: archivosError } = await adjuntarArchivos(
    filas.map((fila) => {
      const entrega: EntregaRow & { gestionesjj_curso_actividades?: unknown } = { ...fila };
      delete entrega.gestionesjj_curso_actividades;
      return entrega;
    }),
  );
  if (archivosError) return { data: [] as EntregaDeCurso[], error: archivosError };

  const actividadPorEntrega = new Map(filas.map((fila) => [fila.id, fila.gestionesjj_curso_actividades]));
  const data = conArchivos.map((entrega) => ({ ...entrega, actividad: actividadPorEntrega.get(entrega.id)! }));
  return { data, error: null };
}

/**
 * Entregas que todavía no tienen nota. Traduce el ID global de la entrega al
 * de la inscripción del curso para buscar su calificación.
 */
export function entregasSinNota<T extends EntregaRow>(
  entregas: T[],
  calificaciones: Pick<CalificacionRow, "actividad_id" | "estudiante_id" | "nota">[],
  estudiantes: Pick<EstudianteRow, "id" | "estudiante_id">[],
): T[] {
  const inscripcionPorGlobal = new Map(
    estudiantes.filter((e) => e.estudiante_id).map((e) => [e.estudiante_id as string, e.id]),
  );
  const conNota = new Set(
    calificaciones.filter((c) => c.nota !== null).map((c) => `${c.actividad_id}:${c.estudiante_id}`),
  );
  return entregas.filter((entrega) => {
    const inscripcion = inscripcionPorGlobal.get(entrega.estudiante_id);
    // Sin inscripción en la lista recibida (p. ej. retirado) no hay dónde calificarla.
    return Boolean(inscripcion) && !conNota.has(`${entrega.actividad_id}:${inscripcion}`);
  });
}

/** URL firmada de un archivo de entrega. Con `descargarComo` el navegador lo descarga en vez de abrirlo. */
export async function urlFirmadaEntrega(path: string, opciones: { expiresSeconds?: number; descargarComo?: string } = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, opciones.expiresSeconds ?? 300, opciones.descargarComo ? { download: opciones.descargarComo } : undefined);
  if (error) return { url: null as string | null, error: error.message };
  return { url: data?.signedUrl ?? null, error: null };
}

const EXTENSIONES_AUDIO = ["webm", "ogg", "oga", "opus", "m4a", "mp4", "aac", "mp3", "wav"];

/** True si el archivo es una nota de voz / audio (por tipo MIME o extensión). */
export function esAudioEntrega(archivo: Pick<EntregaArchivoRow, "archivo_mime" | "archivo_nombre">) {
  if (archivo.archivo_mime?.startsWith("audio/")) return true;
  const extension = (archivo.archivo_nombre ?? "").split(".").pop()?.toLowerCase() ?? "";
  // .mp4/.webm también pueden ser video; si el MIME dice video, no es nota de voz.
  return !archivo.archivo_mime?.startsWith("video/") && EXTENSIONES_AUDIO.includes(extension);
}

/**
 * Abre (o descarga) un archivo de entrega. La pestaña se abre ANTES de pedir
 * la URL firmada: si se abriera después del await, el navegador (sobre todo
 * Safari/iPhone) la bloquea como ventana emergente y no pasa nada al hacer clic.
 */
export async function abrirArchivoEntrega(archivo: EntregaArchivoRow, modo: "ver" | "descargar") {
  const ventana = modo === "ver" ? window.open("about:blank", "_blank") : null;
  const { url, error } = await urlFirmadaEntrega(archivo.archivo_path, {
    descargarComo: modo === "descargar" ? (archivo.archivo_nombre ?? "entrega") : undefined,
  });
  if (!url) {
    ventana?.close();
    return { error: error ?? "No se pudo abrir el archivo." };
  }
  if (ventana) {
    ventana.opener = null;
    ventana.location.href = url;
  } else {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.rel = "noopener";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }
  return { error: null };
}
