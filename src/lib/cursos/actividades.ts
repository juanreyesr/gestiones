import { getSupabaseClient } from "@/lib/supabase";
import type { ActividadConSemanaRow, ActividadRow, CalificacionRow, TipoActividad } from "./types";

export async function fetchActividades(semanaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ActividadRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_actividades")
    .select("*")
    .eq("semana_id", semanaId)
    .order("created_at", { ascending: true });

  if (error) return { data: [] as ActividadRow[], error: error.message };
  return { data: (data ?? []) as ActividadRow[], error: null };
}

export async function fetchActividadesDeCurso(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ActividadConSemanaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_actividades")
    .select("*, gestionesjj_curso_semanas!inner(curso_id,numero)")
    .eq("gestionesjj_curso_semanas.curso_id", cursoId)
    .order("created_at", { ascending: true });

  if (error) return { data: [] as ActividadConSemanaRow[], error: error.message };
  return { data: (data ?? []) as unknown as ActividadConSemanaRow[], error: null };
}

export async function insertActividad(payload: {
  semana_id: string;
  tipo: TipoActividad;
  titulo: string;
  descripcion?: string | null;
  punteo?: number | null;
  entrega_proxima_semana?: boolean;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_curso_actividades").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateActividad(
  id: string,
  payload: {
    tipo?: TipoActividad;
    titulo?: string;
    descripcion?: string | null;
    punteo?: number | null;
    entrega_proxima_semana?: boolean;
  },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_curso_actividades")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteActividad(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_curso_actividades").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchCalificaciones(actividadId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CalificacionRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_calificaciones")
    .select("*")
    .eq("actividad_id", actividadId);

  if (error) return { data: [] as CalificacionRow[], error: error.message };
  return { data: (data ?? []) as CalificacionRow[], error: null };
}

export async function upsertCalificacion(payload: {
  actividad_id: string;
  estudiante_id: string;
  entregado: boolean;
  nota?: number | null;
  comentario?: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_curso_calificaciones")
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: "actividad_id,estudiante_id" });
  return { error: error?.message ?? null };
}

export type CalificacionDeCursoRow = CalificacionRow & {
  gestionesjj_curso_actividades: {
    id: string;
    titulo: string;
    tipo: TipoActividad;
    punteo: number | null;
    semana_id: string;
    gestionesjj_curso_semanas: { curso_id: string; numero: number } | null;
  } | null;
};

export async function fetchCalificacionesDeCurso(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CalificacionDeCursoRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_calificaciones")
    .select(
      "*, gestionesjj_curso_actividades!inner(id,titulo,tipo,punteo,semana_id,gestionesjj_curso_semanas!inner(curso_id,numero))",
    )
    .eq("gestionesjj_curso_actividades.gestionesjj_curso_semanas.curso_id", cursoId);

  if (error) return { data: [] as CalificacionDeCursoRow[], error: error.message };
  return { data: (data ?? []) as unknown as CalificacionDeCursoRow[], error: null };
}
