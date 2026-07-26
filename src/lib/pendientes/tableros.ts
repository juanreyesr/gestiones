import { getSupabaseClient } from "@/lib/supabase";
import type { GrupoRow, TableroRow } from "./types";

const SIN_SUPABASE = "Faltan las variables de Supabase.";

// ============================================================
// TABLEROS
// ============================================================

export async function fetchTableros() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as TableroRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_pendientes_tableros")
    .select("*")
    .order("archivado")
    .order("orden")
    .order("created_at");

  if (error) return { data: [] as TableroRow[], error: error.message };
  return { data: (data ?? []) as TableroRow[], error: null };
}

export async function insertTablero(payload: { nombre: string; descripcion?: string | null; color?: string; orden?: number }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_pendientes_tableros")
    .insert(payload)
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateTablero(
  id: string,
  payload: Partial<Pick<TableroRow, "nombre" | "descripcion" | "color" | "orden" | "archivado">>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_pendientes_tableros").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteTablero(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_pendientes_tableros").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/**
 * Crea un tablero con sus tres grupos iniciales, como hace Monday al abrir un
 * tablero nuevo: nadie deberia encontrarse una pantalla vacia sin saber por
 * donde empezar.
 */
export async function insertTableroConGrupos(payload: { nombre: string; descripcion?: string | null; color?: string }) {
  const { id, error } = await insertTablero(payload);
  if (error || !id) return { id: null as string | null, error: error ?? "No se pudo crear el tablero." };

  const gruposIniciales = [
    { nombre: "Esta semana", color: "#00c875", orden: 0 },
    { nombre: "Próximamente", color: "#fdab3d", orden: 1 },
    { nombre: "En espera", color: "#7e8397", orden: 2 },
  ];

  const { error: gruposError } = await insertGrupos(gruposIniciales.map((g) => ({ ...g, tablero_id: id })));
  return { id, error: gruposError };
}

// ============================================================
// GRUPOS
// ============================================================

export async function fetchGrupos(tableroId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as GrupoRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_pendientes_grupos")
    .select("*")
    .eq("tablero_id", tableroId)
    .order("orden")
    .order("created_at");

  if (error) return { data: [] as GrupoRow[], error: error.message };
  return { data: (data ?? []) as GrupoRow[], error: null };
}

export async function insertGrupo(payload: { tablero_id: string; nombre: string; color?: string; orden?: number }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: SIN_SUPABASE };

  const { data, error } = await supabase.from("gestionesjj_pendientes_grupos").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

async function insertGrupos(payload: Array<{ tablero_id: string; nombre: string; color?: string; orden?: number }>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_pendientes_grupos").insert(payload);
  return { error: error?.message ?? null };
}

export async function updateGrupo(
  id: string,
  payload: Partial<Pick<GrupoRow, "nombre" | "color" | "orden" | "colapsado">>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_pendientes_grupos").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteGrupo(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_pendientes_grupos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Reescribe el campo "orden" de una lista completa de grupos tras arrastrar. */
export async function reordenarGrupos(ids: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const resultados = await Promise.all(
    ids.map((id, indice) => supabase.from("gestionesjj_pendientes_grupos").update({ orden: indice }).eq("id", id)),
  );
  const fallo = resultados.find((r) => r.error);
  return { error: fallo?.error?.message ?? null };
}
