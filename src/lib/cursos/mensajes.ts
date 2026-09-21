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

export async function enviarMensajeDocente(estudianteId: string, contenido: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_estudiante_mensajes").insert({
    estudiante_id: estudianteId,
    remitente: "docente",
    contenido,
    leido_docente: true,
    leido_estudiante: false,
  });
  return { error: error?.message ?? null };
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
