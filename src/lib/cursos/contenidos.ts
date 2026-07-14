import { getSupabaseClient } from "@/lib/supabase";
import type { CategoriaContenido, ContenidoRow } from "./types";

export async function fetchContenidos(semanaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ContenidoRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_contenidos")
    .select("*")
    .eq("semana_id", semanaId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { data: [] as ContenidoRow[], error: error.message };
  return { data: (data ?? []) as ContenidoRow[], error: null };
}

export async function insertContenido(payload: {
  semana_id: string;
  categoria: CategoriaContenido;
  titulo: string;
  descripcion?: string | null;
  archivo_path?: string | null;
  archivo_nombre?: string | null;
  archivo_mime?: string | null;
  url_externa?: string | null;
  orden?: number;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_curso_contenidos").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function deleteContenido(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_curso_contenidos").delete().eq("id", id);
  return { error: error?.message ?? null };
}
