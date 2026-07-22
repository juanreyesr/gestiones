import { getSupabaseClient } from "@/lib/supabase";
import type { ParticipanteRow, RespuestaRow, SesionConRecurso, SesionRow } from "./types";

export async function crearSesion(recursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { sesionId: null as string | null, pin: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_crear_sesion", { p_recurso_id: recursoId });
  if (error) return { sesionId: null, pin: null, error: error.message };

  const row = (Array.isArray(data) ? data[0] : data) as { sesion_id: string; pin: string } | null;
  if (!row) return { sesionId: null, pin: null, error: "No se pudo crear la sesión." };

  return { sesionId: row.sesion_id, pin: row.pin, error: null };
}

export async function fetchSesion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as SesionRow | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_recurso_sesiones").select("*").eq("id", id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as SesionRow, error: null };
}

export async function activarPregunta(sesionId: string, preguntaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_recurso_sesiones")
    .update({ estado: "activa", pregunta_activa_id: preguntaId })
    .eq("id", sesionId);

  return { error: error?.message ?? null };
}

export async function cerrarSesion(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_recurso_sesiones")
    .update({ estado: "cerrada", pregunta_activa_id: null, cerrada_at: new Date().toISOString() })
    .eq("id", sesionId);

  return { error: error?.message ?? null };
}

export async function fetchHistorial(recursoId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as SesionConRecurso[], error: "Faltan las variables de Supabase." };

  let query = supabase
    .from("gestionesjj_recurso_sesiones")
    .select("*, gestionesjj_recursos(titulo,tipo)")
    .eq("estado", "cerrada")
    .order("cerrada_at", { ascending: false });

  if (recursoId) query = query.eq("recurso_id", recursoId);

  const { data, error } = await query;
  if (error) return { data: [] as SesionConRecurso[], error: error.message };
  return { data: (data ?? []) as unknown as SesionConRecurso[], error: null };
}

export async function fetchParticipantes(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ParticipanteRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recurso_participantes")
    .select("*")
    .eq("sesion_id", sesionId)
    .order("created_at");

  if (error) return { data: [] as ParticipanteRow[], error: error.message };
  return { data: (data ?? []) as ParticipanteRow[], error: null };
}

export async function fetchRespuestas(sesionId: string, preguntaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as RespuestaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recurso_respuestas")
    .select("*")
    .eq("sesion_id", sesionId)
    .eq("pregunta_id", preguntaId);

  if (error) return { data: [] as RespuestaRow[], error: error.message };
  return { data: (data ?? []) as RespuestaRow[], error: null };
}
