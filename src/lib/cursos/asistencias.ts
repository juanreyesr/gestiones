import { getSupabaseClient } from "@/lib/supabase";
import type { AsistenciaConSemanaRow, AsistenciaRow, EstadoAsistencia } from "./types";

export async function fetchAsistencias(semanaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as AsistenciaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_asistencias")
    .select("*")
    .eq("semana_id", semanaId);

  if (error) return { data: [] as AsistenciaRow[], error: error.message };
  return { data: (data ?? []) as AsistenciaRow[], error: null };
}

export async function upsertAsistencia(payload: {
  semana_id: string;
  estudiante_id: string;
  estado: EstadoAsistencia;
  nota?: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_curso_asistencias")
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: "semana_id,estudiante_id" });
  return { error: error?.message ?? null };
}

export async function fetchAsistenciasDeCurso(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as AsistenciaConSemanaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_asistencias")
    .select("*, gestionesjj_curso_semanas!inner(curso_id,numero)")
    .eq("gestionesjj_curso_semanas.curso_id", cursoId);

  if (error) return { data: [] as AsistenciaConSemanaRow[], error: error.message };
  return { data: (data ?? []) as unknown as AsistenciaConSemanaRow[], error: null };
}
