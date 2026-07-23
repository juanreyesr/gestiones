import { getSupabaseClient } from "@/lib/supabase";
import type { EstadoQaPregunta, QaPreguntaOwnerRow } from "./types";

export async function fetchQaPreguntas(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as QaPreguntaOwnerRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_recurso_qa_preguntas")
    .select("*, gestionesjj_recurso_participantes(apodo)")
    .eq("sesion_id", sesionId)
    .neq("estado", "oculta")
    .order("destacada", { ascending: false })
    .order("votos", { ascending: false })
    .order("created_at");

  if (error) return { data: [] as QaPreguntaOwnerRow[], error: error.message };
  return { data: (data ?? []) as unknown as QaPreguntaOwnerRow[], error: null };
}

export async function updateQaPregunta(id: string, payload: { estado?: EstadoQaPregunta; destacada?: boolean }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_recurso_qa_preguntas").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function ocultarQaPregunta(id: string) {
  return updateQaPregunta(id, { estado: "oculta" });
}
