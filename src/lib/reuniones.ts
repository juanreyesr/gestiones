import { getSupabaseClient } from "@/lib/supabase";

export type ReunionRow = {
  id: string;
  fecha: string;
  notas: string;
  borrador: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchReuniones() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ReunionRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { data: [] as ReunionRow[], error: error.message };
  return { data: (data ?? []) as ReunionRow[], error: null };
}

export async function insertReunion(payload: { fecha: string; notas: string; borrador: boolean }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .insert(payload)
    .select("id")
    .single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateReunion(id: string, payload: { fecha: string; notas: string; borrador: boolean }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteReunion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_reuniones_docentes").delete().eq("id", id);
  return { error: error?.message ?? null };
}
