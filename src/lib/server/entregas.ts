import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reglas compartidas de las entregas de tareas del estudiante. Las usan la
 * subida clásica (/entrega/subir, archivo dentro del request) y la subida
 * directa a Storage (/entrega/preparar + /entrega/confirmar), que existe
 * porque Vercel corta el cuerpo de las funciones en ~4.5 MB: un audio largo
 * o un PDF pesado nunca llegaría por /subir.
 */

export const BUCKET_ENTREGAS = "gestionesjj-entregas";
export const MAX_BYTES_ENTREGA = 20 * 1024 * 1024; // 20 MB por archivo
export const EXTENSIONES_PERMITIDAS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "jpg", "jpeg", "png", "zip",
  // Notas de voz: grabadas en la plataforma (webm/ogg en Chrome/Android, m4a/mp4 en Safari/iPhone)
  // o subidas desde el teléfono (WhatsApp .ogg/.opus, notas de voz .m4a, .mp3, .wav).
  "webm", "ogg", "oga", "opus", "m4a", "mp4", "aac", "mp3", "wav",
];
export const UUID_RE = /^[0-9a-f-]{36}$/i;

export function extensionDe(nombre: string): string {
  const partes = nombre.split(".");
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "";
}

export function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-140);
}

/** Carpeta de Storage reservada a un estudiante para una tarea. */
export function carpetaEntrega(actividadId: string, estudianteId: string) {
  return `entregas/${actividadId}/${estudianteId}`;
}

/** Valida nombre y tamaño declarados del archivo. Devuelve el mensaje de error o null. */
export function validarArchivo(nombre: string, tamano: number): string | null {
  if (!nombre || !Number.isFinite(tamano) || tamano <= 0) return "Selecciona un archivo.";
  if (tamano > MAX_BYTES_ENTREGA) return "El archivo no puede pesar más de 20 MB.";
  if (!EXTENSIONES_PERMITIDAS.includes(extensionDe(nombre))) {
    return `Tipo de archivo no permitido. Usa: ${EXTENSIONES_PERMITIDAS.join(", ")}.`;
  }
  return null;
}

type Resultado<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };

/**
 * Revalida server-side (nunca confía en lo que ya se le mostró en pantalla):
 * inscripción activa, acceso del curso, semana habilitada, visibilidad de la
 * tarea y que la entrega esté habilitada.
 */
export async function validarTareaParaEntrega(
  admin: SupabaseClient,
  actividadId: string,
  estudianteId: string,
): Promise<Resultado<{ cursoId: string; fechaLimite: string | null }>> {
  const noEncontrada = { ok: false as const, status: 404, error: "No se encontró la tarea." };

  const { data: actividad, error: actividadError } = await admin
    .from("gestionesjj_curso_actividades")
    .select("semana_id, entrega_habilitada, fecha_limite, visible_estudiantes")
    .eq("id", actividadId)
    .maybeSingle();
  if (actividadError || !actividad || !actividad.entrega_habilitada || actividad.visible_estudiantes === "oculto") {
    return noEncontrada;
  }

  const { data: semana, error: semanaError } = await admin
    .from("gestionesjj_curso_semanas")
    .select("curso_id, habilitado_estudiantes")
    .eq("id", actividad.semana_id)
    .maybeSingle();
  if (semanaError || !semana || !semana.habilitado_estudiantes) return noEncontrada;

  const { data: curso, error: cursoError } = await admin
    .from("gestionesjj_cursos_impartidos")
    .select("acceso_estudiantes")
    .eq("id", semana.curso_id)
    .maybeSingle();
  if (cursoError || !curso || !curso.acceso_estudiantes) return noEncontrada;

  const { data: inscripcion, error: inscripcionError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("id")
    .eq("curso_id", semana.curso_id)
    .eq("estudiante_id", estudianteId)
    .eq("estado", "activo")
    .maybeSingle();
  if (inscripcionError || !inscripcion) return noEncontrada;

  return { ok: true, cursoId: semana.curso_id as string, fechaLimite: (actividad.fecha_limite as string | null) ?? null };
}

/**
 * Crea o actualiza la entrega del estudiante y registra el archivo ya subido
 * a Storage. La entrega tardía se acepta y solo se marca; el docente decide
 * si penaliza al calificar.
 */
export async function registrarEntrega(
  admin: SupabaseClient,
  input: {
    actividadId: string;
    estudianteId: string;
    fechaLimite: string | null;
    path: string;
    nombre: string;
    mime: string | null;
  },
): Promise<Resultado<{ tardia: boolean }>> {
  const ahora = new Date();
  const tardia = Boolean(input.fechaLimite && ahora > new Date(input.fechaLimite));

  const { data: entregaExistente } = await admin
    .from("gestionesjj_curso_entregas")
    .select("id")
    .eq("actividad_id", input.actividadId)
    .eq("estudiante_id", input.estudianteId)
    .maybeSingle();

  let entregaId = entregaExistente?.id as string | undefined;
  if (entregaId) {
    const { error } = await admin
      .from("gestionesjj_curso_entregas")
      .update({ entregado_en: ahora.toISOString(), tardia, updated_at: ahora.toISOString() })
      .eq("id", entregaId);
    if (error) return { ok: false, status: 500, error: error.message };
  } else {
    const { data: nueva, error } = await admin
      .from("gestionesjj_curso_entregas")
      .insert({
        actividad_id: input.actividadId,
        estudiante_id: input.estudianteId,
        entregado_en: ahora.toISOString(),
        tardia,
      })
      .select("id")
      .single();
    if (error || !nueva) return { ok: false, status: 500, error: error?.message ?? "No se pudo registrar la entrega." };
    entregaId = nueva.id as string;
  }

  const { error: archivoError } = await admin.from("gestionesjj_curso_entrega_archivos").insert({
    entrega_id: entregaId,
    archivo_path: input.path,
    archivo_nombre: input.nombre,
    archivo_mime: input.mime,
  });
  if (archivoError) return { ok: false, status: 500, error: archivoError.message };

  return { ok: true, tardia };
}
