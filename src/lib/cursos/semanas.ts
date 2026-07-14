import { getSupabaseClient } from "@/lib/supabase";
import type { SemanaRow, TipoSesion } from "./types";

export async function fetchSemanas(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as SemanaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_curso_semanas")
    .select("*")
    .eq("curso_id", cursoId)
    .order("numero", { ascending: true });

  if (error) return { data: [] as SemanaRow[], error: error.message };
  return { data: (data ?? []) as SemanaRow[], error: null };
}

export async function insertSemana(payload: {
  curso_id: string;
  numero: number;
  titulo?: string | null;
  fecha?: string | null;
  tipo_sesion: TipoSesion;
  notas?: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_curso_semanas").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateSemana(
  id: string,
  payload: {
    numero?: number;
    titulo?: string | null;
    fecha?: string | null;
    tipo_sesion?: TipoSesion;
    notas?: string | null;
  },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_curso_semanas")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteSemana(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_curso_semanas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function siguienteNumero(semanas: SemanaRow[]): number {
  if (!semanas.length) return 1;
  return Math.max(...semanas.map((semana) => semana.numero)) + 1;
}
