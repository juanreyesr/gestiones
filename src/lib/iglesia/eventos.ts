import { getSupabaseClient } from "@/lib/supabase";
import type { EventoRow, ParticipanteBorrador, ParticipanteRow, TipoEvento } from "./types";

const SIN_SUPABASE = "Faltan las variables de Supabase.";

export type EventoPayload = {
  tipo: TipoEvento;
  titulo: string;
  fecha: string;
  hora?: string | null;
  lugar?: string | null;
  direccion?: string | null;
  oficiante?: string | null;
  estado?: EventoRow["estado"];
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_correo?: string | null;
  asistentes_estimados?: number | null;
  programa?: string | null;
  notas?: string | null;
};

export async function fetchEventos() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EventoRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_eventos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) return { data: [] as EventoRow[], error: error.message };
  return { data: (data ?? []) as EventoRow[], error: null };
}

export async function fetchParticipantes(eventoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ParticipanteRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_evento_participantes")
    .select("*")
    .eq("evento_id", eventoId)
    .order("orden")
    .order("created_at");

  if (error) return { data: [] as ParticipanteRow[], error: error.message };
  return { data: (data ?? []) as ParticipanteRow[], error: null };
}

/** Participantes de varios eventos a la vez, para las tarjetas del listado. */
export async function fetchParticipantesDeEventos(eventoIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: {} as Record<string, ParticipanteRow[]>, error: SIN_SUPABASE };
  if (!eventoIds.length) return { data: {} as Record<string, ParticipanteRow[]>, error: null };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_evento_participantes")
    .select("*")
    .in("evento_id", eventoIds)
    .order("orden");

  if (error) return { data: {} as Record<string, ParticipanteRow[]>, error: error.message };

  const porEvento: Record<string, ParticipanteRow[]> = {};
  for (const fila of (data ?? []) as ParticipanteRow[]) {
    (porEvento[fila.evento_id] ??= []).push(fila);
  }
  return { data: porEvento, error: null };
}

export async function insertEvento(payload: EventoPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: SIN_SUPABASE };

  const { data, error } = await supabase.from("gestionesjj_iglesia_eventos").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateEvento(id: string, payload: Partial<EventoPayload>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_eventos").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteEvento(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_eventos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/**
 * Reemplaza la lista completa de participantes de un evento. El formulario
 * edita filas en memoria (agregar, quitar, reordenar) y al guardar se sustituye
 * el bloque entero: mas simple y sin riesgo de dejar huerfanos que llevar el
 * diff fila por fila para una lista que rara vez pasa de diez personas.
 */
export async function reemplazarParticipantes(eventoId: string, participantes: ParticipanteBorrador[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error: borrarError } = await supabase
    .from("gestionesjj_iglesia_evento_participantes")
    .delete()
    .eq("evento_id", eventoId);
  if (borrarError) return { error: borrarError.message };

  const filas = participantes
    .filter((participante) => participante.nombre.trim())
    .map((participante, indice) => ({
      evento_id: eventoId,
      rol: participante.rol,
      nombre: participante.nombre.trim(),
      documento: participante.documento.trim() || null,
      telefono: participante.telefono.trim() || null,
      notas: participante.notas.trim() || null,
      orden: indice,
    }));

  if (!filas.length) return { error: null };

  const { error } = await supabase.from("gestionesjj_iglesia_evento_participantes").insert(filas);
  return { error: error?.message ?? null };
}
