import { getSupabaseClient } from "@/lib/supabase";
import type { UniversidadRow } from "./types";

export async function fetchUniversidades() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as UniversidadRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_universidades")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) return { data: [] as UniversidadRow[], error: error.message };
  return { data: (data ?? []) as UniversidadRow[], error: null };
}

export async function insertUniversidad(payload: {
  nombre: string;
  siglas?: string | null;
  color?: string | null;
  logo_path?: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_universidades").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateUniversidad(
  id: string,
  payload: { nombre?: string; siglas?: string | null; color?: string | null; logo_path?: string | null },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_universidades")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteUniversidad(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_universidades").delete().eq("id", id);
  return { error: error?.message ?? null };
}
