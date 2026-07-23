import { getSupabaseClient } from "@/lib/supabase";
import type { RespuestaEncuestaPayload, RespuestaEncuestaRow } from "./types";

export async function fetchRespuestas(campanaIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as RespuestaEncuestaRow[], error: "Faltan las variables de Supabase." };
  if (campanaIds.length === 0) return { data: [] as RespuestaEncuestaRow[], error: null };

  const { data, error } = await supabase
    .from("gestionesjj_encuestas_respuestas")
    .select("*")
    .in("campana_id", campanaIds);

  if (error) return { data: [] as RespuestaEncuestaRow[], error: error.message };
  return { data: (data ?? []) as RespuestaEncuestaRow[], error: null };
}

export async function insertRespuestaRetroactiva(campanaId: string, payload: RespuestaEncuestaPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_encuestas_respuestas").insert({
    campana_id: campanaId,
    origen: "retroactiva",
    ...payload,
  });

  return { error: error?.message ?? null };
}

export async function deleteRespuesta(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_encuestas_respuestas").delete().eq("id", id);
  return { error: error?.message ?? null };
}
