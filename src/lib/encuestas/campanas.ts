import { getSupabaseClient } from "@/lib/supabase";
import type { CampanaConConteo } from "./types";

export async function fetchCampanas() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CampanaConConteo[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_encuestas_campanas")
    .select("*, gestionesjj_carreras(nombre), respuestas:gestionesjj_encuestas_respuestas(count)")
    .order("anio", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { data: [] as CampanaConConteo[], error: error.message };

  const rows: CampanaConConteo[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    ...(row as Omit<CampanaConConteo, "respuestasCount">),
    respuestasCount: (row.respuestas as Array<{ count: number }> | null)?.[0]?.count ?? 0,
  }));

  return { data: rows, error: null };
}

export async function insertCampana(payload: { titulo: string; anio: number; carrera_id: string | null; notas?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_encuestas_campanas")
    .insert({
      titulo: payload.titulo,
      anio: payload.anio,
      carrera_id: payload.carrera_id,
      notas: payload.notas ?? null,
    })
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateCampana(
  id: string,
  payload: { titulo?: string; anio?: number; carrera_id?: string | null; notas?: string | null; activa?: boolean },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_encuestas_campanas")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function deleteCampana(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_encuestas_campanas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchCarreras() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as Array<{ id: string; nombre: string }>, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_carreras").select("id,nombre").order("nombre");
  if (error) return { data: [] as Array<{ id: string; nombre: string }>, error: error.message };
  return { data: (data ?? []) as Array<{ id: string; nombre: string }>, error: null };
}
