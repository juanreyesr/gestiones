import { getSupabaseClient } from "@/lib/supabase";
import type { OpcionPregunta, PreguntaRow, RecursoConConteo, TipoPregunta, TipoRecurso } from "./types";

export async function fetchRecursos() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as RecursoConConteo[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recursos")
    .select("*, preguntas:gestionesjj_recurso_preguntas(count)")
    .order("updated_at", { ascending: false });

  if (error) return { data: [] as RecursoConConteo[], error: error.message };

  const rows: RecursoConConteo[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    ...(row as Omit<RecursoConConteo, "preguntasCount">),
    preguntasCount: (row.preguntas as Array<{ count: number }> | null)?.[0]?.count ?? 0,
  }));

  return { data: rows, error: null };
}

export async function insertRecurso(payload: { tipo: TipoRecurso; titulo: string; descripcion?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recursos")
    .insert({ tipo: payload.tipo, titulo: payload.titulo, descripcion: payload.descripcion ?? null })
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateRecurso(id: string, payload: { titulo?: string; descripcion?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_recursos")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function deleteRecurso(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_recursos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchPreguntas(recursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as PreguntaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recurso_preguntas")
    .select("*")
    .eq("recurso_id", recursoId)
    .order("orden");

  if (error) return { data: [] as PreguntaRow[], error: error.message };
  return { data: (data ?? []) as PreguntaRow[], error: null };
}

export async function insertPregunta(payload: {
  recurso_id: string;
  orden: number;
  tipo_pregunta: TipoPregunta;
  texto: string;
  opciones?: OpcionPregunta[] | null;
  escala_min?: number;
  escala_max?: number;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recurso_preguntas")
    .insert({
      recurso_id: payload.recurso_id,
      orden: payload.orden,
      tipo_pregunta: payload.tipo_pregunta,
      texto: payload.texto,
      opciones: payload.tipo_pregunta === "opcion_multiple" ? (payload.opciones ?? []) : null,
      escala_min: payload.escala_min ?? 1,
      escala_max: payload.escala_max ?? 5,
    })
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updatePregunta(
  id: string,
  payload: {
    texto?: string;
    opciones?: OpcionPregunta[] | null;
    escala_min?: number;
    escala_max?: number;
  },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_recurso_preguntas")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function deletePregunta(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_recurso_preguntas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function reordenarPreguntas(pares: Array<{ id: string; orden: number }>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  for (const par of pares) {
    const { error } = await supabase.from("gestionesjj_recurso_preguntas").update({ orden: par.orden }).eq("id", par.id);
    if (error) return { error: error.message };
  }

  return { error: null };
}
