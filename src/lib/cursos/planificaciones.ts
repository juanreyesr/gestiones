import { getSupabaseClient } from "@/lib/supabase";
import type { PlanificacionRow, TipoPlanificacion } from "./types";

export async function fetchPlanificaciones(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as PlanificacionRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_planificaciones")
    .select("*")
    .eq("curso_id", cursoId)
    .order("created_at", { ascending: false });

  if (error) return { data: [] as PlanificacionRow[], error: error.message };
  return { data: (data ?? []) as PlanificacionRow[], error: null };
}

export async function insertPlanificacion(payload: {
  curso_id: string;
  tipo: TipoPlanificacion;
  titulo: string;
  descripcion?: string | null;
  archivo_path?: string | null;
  archivo_nombre?: string | null;
  archivo_mime?: string | null;
  url_externa?: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_planificaciones")
    .insert(payload)
    .select("id")
    .single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function deletePlanificacion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_curso_planificaciones").delete().eq("id", id);
  return { error: error?.message ?? null };
}
