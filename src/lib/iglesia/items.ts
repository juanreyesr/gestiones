import { getSupabaseClient } from "@/lib/supabase";
import type { ActualizacionRow, ItemEditable, ItemRow } from "./types";

const SIN_SUPABASE = "Faltan las variables de Supabase.";

// ============================================================
// ITEMS (pendientes y subtareas)
// ============================================================

/** Trae items y subitems del tablero de una sola vez: el tablero completo cabe holgadamente en memoria. */
export async function fetchItems(tableroId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ItemRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_items")
    .select("*")
    .eq("tablero_id", tableroId)
    .order("orden")
    .order("created_at");

  if (error) return { data: [] as ItemRow[], error: error.message };
  return { data: (data ?? []) as ItemRow[], error: null };
}

/** Pendientes con fecha limite de todos los tableros, para el resumen del area. */
export async function fetchItemsPendientes(limite = 200) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ItemRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_items")
    .select("*")
    .neq("estado", "listo")
    .is("item_padre_id", null)
    .order("fecha_limite", { nullsFirst: false })
    .limit(limite);

  if (error) return { data: [] as ItemRow[], error: error.message };
  return { data: (data ?? []) as ItemRow[], error: null };
}

export type ResumenTablero = { total: number; listos: number; vencidos: number };

/**
 * Conteos por tablero para las tarjetas del listado. Se traen solo las tres
 * columnas necesarias de todos los items principales y se agregan en memoria:
 * son pocos registros y evita una vista o un RPC extra en la base.
 */
export async function fetchResumenTableros(hoy: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: {} as Record<string, ResumenTablero>, error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_items")
    .select("tablero_id, estado, fecha_limite")
    .is("item_padre_id", null);

  if (error) return { data: {} as Record<string, ResumenTablero>, error: error.message };

  const resumen: Record<string, ResumenTablero> = {};
  for (const fila of data ?? []) {
    const clave = fila.tablero_id as string;
    const actual = (resumen[clave] ??= { total: 0, listos: 0, vencidos: 0 });
    actual.total += 1;
    if (fila.estado === "listo") actual.listos += 1;
    else if (fila.fecha_limite && (fila.fecha_limite as string) < hoy) actual.vencidos += 1;
  }
  return { data: resumen, error: null };
}

export async function insertItem(payload: {
  tablero_id: string;
  grupo_id: string;
  titulo: string;
  item_padre_id?: string | null;
  estado?: ItemRow["estado"];
  prioridad?: ItemRow["prioridad"];
  responsable?: string | null;
  fecha_inicio?: string | null;
  fecha_limite?: string | null;
  etiquetas?: string[];
  notas?: string | null;
  orden?: number;
  evento_id?: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as ItemRow | null, error: SIN_SUPABASE };

  const { data, error } = await supabase.from("gestionesjj_iglesia_items").insert(payload).select("*").single();
  return { data: (data as ItemRow | null) ?? null, error: error?.message ?? null };
}

export async function insertItems(
  payload: Array<{ tablero_id: string; grupo_id: string; titulo: string; orden?: number; evento_id?: string | null }>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  if (!payload.length) return { error: null };

  const { error } = await supabase.from("gestionesjj_iglesia_items").insert(payload);
  return { error: error?.message ?? null };
}

export async function updateItem(id: string, payload: ItemEditable) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_items").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteItem(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_items").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteItems(ids: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  if (!ids.length) return { error: null };

  const { error } = await supabase.from("gestionesjj_iglesia_items").delete().in("id", ids);
  return { error: error?.message ?? null };
}

/** Cambia una misma propiedad a varios items (barra de acciones en lote). */
export async function updateItemsEnLote(ids: string[], payload: ItemEditable) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  if (!ids.length) return { error: null };

  const { error } = await supabase.from("gestionesjj_iglesia_items").update(payload).in("id", ids);
  return { error: error?.message ?? null };
}

/**
 * Persiste el resultado de arrastrar: cada item recibe su grupo y su posicion.
 * La UI ya movio la fila localmente, esto solo confirma en la base.
 */
export async function reordenarItems(items: Array<{ id: string; grupo_id: string; orden: number }>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  if (!items.length) return { error: null };

  const resultados = await Promise.all(
    items.map((item) =>
      supabase
        .from("gestionesjj_iglesia_items")
        .update({ grupo_id: item.grupo_id, orden: item.orden })
        .eq("id", item.id),
    ),
  );
  const fallo = resultados.find((r) => r.error);
  return { error: fallo?.error?.message ?? null };
}

/** Duplica un item con sus subtareas, justo debajo del original. */
export async function duplicarItem(item: ItemRow, subitems: ItemRow[]) {
  const { data, error } = await insertItem({
    tablero_id: item.tablero_id,
    grupo_id: item.grupo_id,
    titulo: `${item.titulo} (copia)`,
    estado: item.estado,
    prioridad: item.prioridad,
    responsable: item.responsable,
    fecha_inicio: item.fecha_inicio,
    fecha_limite: item.fecha_limite,
    etiquetas: item.etiquetas,
    notas: item.notas,
    orden: item.orden + 1,
  });

  if (error || !data) return { error: error ?? "No se pudo duplicar el pendiente." };
  if (!subitems.length) return { error: null };

  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error: subError } = await supabase.from("gestionesjj_iglesia_items").insert(
    subitems.map((sub, indice) => ({
      tablero_id: sub.tablero_id,
      grupo_id: sub.grupo_id,
      item_padre_id: data.id,
      titulo: sub.titulo,
      estado: sub.estado,
      prioridad: sub.prioridad,
      responsable: sub.responsable,
      fecha_limite: sub.fecha_limite,
      orden: indice,
    })),
  );

  return { error: subError?.message ?? null };
}

// ============================================================
// ACTUALIZACIONES (hilo de comentarios de un item)
// ============================================================

export async function fetchActualizaciones(itemId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ActualizacionRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_actualizaciones")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) return { data: [] as ActualizacionRow[], error: error.message };
  return { data: (data ?? []) as ActualizacionRow[], error: null };
}

export async function insertActualizacion(itemId: string, texto: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase
    .from("gestionesjj_iglesia_actualizaciones")
    .insert({ item_id: itemId, texto });
  return { error: error?.message ?? null };
}

export async function deleteActualizacion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_actualizaciones").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Conteo de actualizaciones por item, para el globito de la fila. */
export async function fetchConteoActualizaciones(tableroId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: {} as Record<string, number>, error: SIN_SUPABASE };

  const { data: items, error: itemsError } = await supabase
    .from("gestionesjj_iglesia_items")
    .select("id")
    .eq("tablero_id", tableroId);

  if (itemsError) return { data: {} as Record<string, number>, error: itemsError.message };

  const ids = (items ?? []).map((item) => item.id as string);
  if (!ids.length) return { data: {} as Record<string, number>, error: null };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_actualizaciones")
    .select("item_id")
    .in("item_id", ids);

  if (error) return { data: {} as Record<string, number>, error: error.message };

  const conteo: Record<string, number> = {};
  for (const fila of data ?? []) {
    const key = fila.item_id as string;
    conteo[key] = (conteo[key] ?? 0) + 1;
  }
  return { data: conteo, error: null };
}
