import { getSupabaseClient } from "@/lib/supabase";
import type { MensajeRow } from "./types";

/**
 * Chat 1-a-1 con cada estudiante (un solo hilo global, no por curso: esta
 * app es de un solo docente). El docente escribe directo desde el
 * navegador, cubierto por las policies de owner de la tabla; el estudiante
 * nunca escribe aqui directo (ver comentario en la migracion 025).
 */
export async function fetchMensajes(estudianteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as MensajeRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_estudiante_mensajes")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .order("created_at", { ascending: true });

  if (error) return { data: [] as MensajeRow[], error: error.message };
  return { data: (data ?? []) as MensajeRow[], error: null };
}

const BUCKET_ADJUNTOS = "gestionesjj-mensajes-adjuntos";
export const MAX_BYTES_ADJUNTO = 20 * 1024 * 1024; // 20 MB, igual que las entregas de tareas

function sanitizarNombreAdjunto(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-140);
}

export async function enviarMensajeDocente(estudianteId: string, contenido: string, archivo?: File | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  if (archivo && archivo.size > MAX_BYTES_ADJUNTO) {
    return { error: "El archivo no puede pesar más de 20 MB." };
  }

  let archivoPath: string | null = null;
  if (archivo) {
    archivoPath = `mensajes/${estudianteId}/${Date.now()}-${sanitizarNombreAdjunto(archivo.name)}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET_ADJUNTOS).upload(archivoPath, archivo);
    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await supabase.from("gestionesjj_estudiante_mensajes").insert({
    estudiante_id: estudianteId,
    remitente: "docente",
    contenido: contenido || null,
    archivo_path: archivoPath,
    archivo_nombre: archivo?.name ?? null,
    archivo_mime: archivo?.type ?? null,
    leido_docente: true,
    leido_estudiante: false,
  });
  if (error && archivoPath) await supabase.storage.from(BUCKET_ADJUNTOS).remove([archivoPath]);
  return { error: error?.message ?? null };
}

/** URL firmada de corta duración para ver/descargar el adjunto de un mensaje (el owner ya tiene acceso directo por RLS del bucket). */
export async function urlFirmadaAdjuntoMensaje(archivoPath: string, expiresSeconds = 300) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.storage.from(BUCKET_ADJUNTOS).createSignedUrl(archivoPath, expiresSeconds);
  if (error || !data) return { url: null, error: error?.message ?? "No se pudo abrir el archivo." };
  return { url: data.signedUrl, error: null };
}

export async function marcarMensajesLeidosDocente(estudianteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_estudiante_mensajes")
    .update({ leido_docente: true })
    .eq("estudiante_id", estudianteId)
    .eq("remitente", "estudiante")
    .eq("leido_docente", false);
  return { error: error?.message ?? null };
}

/** Cuenta mensajes sin leer del estudiante, agrupados por estudiante_id (para el badge de la lista). */
export async function fetchMensajesNoLeidosPorEstudiante(estudianteIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: {} as Record<string, number>, error: "Faltan las variables de Supabase." };
  if (!estudianteIds.length) return { data: {} as Record<string, number>, error: null };

  const { data, error } = await supabase
    .from("gestionesjj_estudiante_mensajes")
    .select("estudiante_id")
    .in("estudiante_id", estudianteIds)
    .eq("remitente", "estudiante")
    .eq("leido_docente", false);

  if (error) return { data: {} as Record<string, number>, error: error.message };

  const conteo: Record<string, number> = {};
  for (const fila of (data ?? []) as Array<{ estudiante_id: string }>) {
    conteo[fila.estudiante_id] = (conteo[fila.estudiante_id] ?? 0) + 1;
  }
  return { data: conteo, error: null };
}
