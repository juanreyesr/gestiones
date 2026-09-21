import { getSupabaseClient } from "@/lib/supabase";
import type { SolicitudRow } from "./types";

/** Solicitudes de autoasignacion de un curso (todas, para ver el historial de rechazadas/aprobadas tambien). */
export async function fetchSolicitudes(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as SolicitudRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_solicitudes")
    .select("*")
    .eq("curso_id", cursoId)
    .order("created_at", { ascending: false });

  if (error) return { data: [] as SolicitudRow[], error: error.message };
  return { data: (data ?? []) as SolicitudRow[], error: null };
}

export async function rechazarSolicitud(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_curso_solicitudes")
    .update({ estado: "rechazada", resuelto_en: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "pendiente");
  return { error: error?.message ?? null };
}
