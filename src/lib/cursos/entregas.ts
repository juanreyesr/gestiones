import { getSupabaseClient } from "@/lib/supabase";
import type { EntregaArchivoRow, EntregaRow } from "./types";

const BUCKET = "gestionesjj-entregas";

export type EntregaConArchivos = EntregaRow & { archivos: EntregaArchivoRow[] };

/** Entregas y sus archivos para una tarea, para que el docente las revise y califique. */
export async function fetchEntregasDeActividad(actividadId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EntregaConArchivos[], error: "Faltan las variables de Supabase." };

  const { data: entregas, error: entregasError } = await supabase
    .from("gestionesjj_curso_entregas")
    .select("*")
    .eq("actividad_id", actividadId);
  if (entregasError) return { data: [] as EntregaConArchivos[], error: entregasError.message };

  const entregaIds = (entregas ?? []).map((e) => e.id as string);
  if (!entregaIds.length) return { data: [], error: null };

  const { data: archivos, error: archivosError } = await supabase
    .from("gestionesjj_curso_entrega_archivos")
    .select("*")
    .in("entrega_id", entregaIds);
  if (archivosError) return { data: [] as EntregaConArchivos[], error: archivosError.message };

  const archivosPorEntrega = new Map<string, EntregaArchivoRow[]>();
  for (const archivo of (archivos ?? []) as EntregaArchivoRow[]) {
    const lista = archivosPorEntrega.get(archivo.entrega_id) ?? [];
    lista.push(archivo);
    archivosPorEntrega.set(archivo.entrega_id, lista);
  }

  const data = (entregas as EntregaRow[]).map((entrega) => ({
    ...entrega,
    archivos: archivosPorEntrega.get(entrega.id) ?? [],
  }));

  return { data, error: null };
}

export async function urlFirmadaEntrega(path: string, expiresSeconds = 300) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresSeconds);
  if (error) return { url: null as string | null, error: error.message };
  return { url: data?.signedUrl ?? null, error: null };
}
