import { getSupabaseClient } from "@/lib/supabase";
import type { EstudianteEventoRow, EstudianteRow } from "./types";

export async function fetchEstudiantes(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EstudianteRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_estudiantes")
    .select("*")
    .eq("curso_id", cursoId)
    .order("nombre");

  if (error) return { data: [] as EstudianteRow[], error: error.message };
  return { data: (data ?? []) as EstudianteRow[], error: null };
}

export async function insertEstudiante(payload: { curso_id: string; nombre: string; correo?: string | null; carne?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_curso_estudiantes").insert(payload).select("id").single();
  if (error) return { id: null as string | null, error: error.message };

  const estudianteId = (data?.id as string | undefined) ?? null;
  if (estudianteId) {
    await supabase.from("gestionesjj_curso_estudiante_eventos").insert({
      curso_id: payload.curso_id,
      estudiante_id: estudianteId,
      tipo: "asignacion",
    });
  }
  return { id: estudianteId, error: null };
}

export async function retirarEstudiante(id: string, cursoId: string, nota?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const ahora = new Date().toISOString();
  const { error } = await supabase
    .from("gestionesjj_curso_estudiantes")
    .update({ estado: "retirado", retirado_en: ahora, updated_at: ahora })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabase.from("gestionesjj_curso_estudiante_eventos").insert({
    curso_id: cursoId,
    estudiante_id: id,
    tipo: "retiro",
    nota: nota || null,
  });
  return { error: null };
}

export async function reincorporarEstudiante(id: string, cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_curso_estudiantes")
    .update({ estado: "activo", retirado_en: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabase.from("gestionesjj_curso_estudiante_eventos").insert({
    curso_id: cursoId,
    estudiante_id: id,
    tipo: "reincorporacion",
  });
  return { error: null };
}

export async function deleteEstudiante(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_curso_estudiantes").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchEventos(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EstudianteEventoRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_estudiante_eventos")
    .select("*")
    .eq("curso_id", cursoId)
    .order("ocurrido_en", { ascending: true });

  if (error) return { data: [] as EstudianteEventoRow[], error: error.message };
  return { data: (data ?? []) as EstudianteEventoRow[], error: null };
}
