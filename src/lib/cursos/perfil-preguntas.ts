import { getSupabaseClient } from "@/lib/supabase";

// Preguntas del perfil del estudiante (globales: el perfil es de la persona,
// no del curso). Las respuestas viven en gestionesjj_estudiantes.perfil_respuestas
// (id de pregunta -> texto). Ver migración 056.

export type PerfilPreguntaRow = {
  id: string;
  orden: number;
  texto: string;
  texto_en: string | null;
  texto_pt: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
};

export type DatosPerfilParaCompletitud = {
  foto_path: string | null;
  fecha_nacimiento: string | null;
  pais: string | null;
  perfil_respuestas: Record<string, string> | null;
};

/**
 * Misma regla que `gestionesjj_perfil_completo` en la base de datos: foto,
 * fecha de nacimiento, país y todas las preguntas activas respondidas.
 */
export function perfilCompleto(perfil: DatosPerfilParaCompletitud | null | undefined, preguntasActivas: Array<{ id: string }>) {
  if (!perfil) return false;
  if (!perfil.foto_path || !perfil.fecha_nacimiento || !perfil.pais?.trim()) return false;
  const respuestas = perfil.perfil_respuestas ?? {};
  return preguntasActivas.every((pregunta) => Boolean(respuestas[pregunta.id]?.trim()));
}

/** Qué le falta al perfil, para mostrarlo al docente. */
export function faltantesPerfil(perfil: DatosPerfilParaCompletitud | null | undefined, preguntasActivas: Array<{ id: string }>) {
  const faltan: string[] = [];
  if (!perfil?.foto_path) faltan.push("foto");
  if (!perfil?.fecha_nacimiento) faltan.push("fecha de nacimiento");
  if (!perfil?.pais?.trim()) faltan.push("país");
  const respuestas = perfil?.perfil_respuestas ?? {};
  const sinResponder = preguntasActivas.filter((pregunta) => !respuestas[pregunta.id]?.trim()).length;
  if (sinResponder) faltan.push(sinResponder === 1 ? "1 pregunta" : `${sinResponder} preguntas`);
  return faltan;
}

export async function fetchPreguntasPerfil(soloActivas = false) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as PerfilPreguntaRow[], error: "Faltan las variables de Supabase." };

  let query = supabase.from("gestionesjj_perfil_preguntas").select("*");
  if (soloActivas) query = query.eq("activa", true);
  const { data, error } = await query.order("orden").order("created_at");
  if (error) return { data: [] as PerfilPreguntaRow[], error: error.message };
  return { data: (data ?? []) as PerfilPreguntaRow[], error: null };
}

export async function insertPreguntaPerfil(payload: { texto: string; texto_en?: string | null; texto_pt?: string | null; orden: number }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_perfil_preguntas").insert(payload);
  return { error: error?.message ?? null };
}

export async function updatePreguntaPerfil(
  id: string,
  payload: { texto?: string; texto_en?: string | null; texto_pt?: string | null; orden?: number; activa?: boolean },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase
    .from("gestionesjj_perfil_preguntas")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** Borra la pregunta. Las respuestas que ya existían quedan guardadas en el perfil, pero ya no se muestran. */
export async function deletePreguntaPerfil(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_perfil_preguntas").delete().eq("id", id);
  return { error: error?.message ?? null };
}
