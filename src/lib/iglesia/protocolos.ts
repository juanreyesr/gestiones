import { getSupabaseClient } from "@/lib/supabase";

const SIN_SUPABASE = "Faltan las variables de Supabase.";

export type ProtocoloRow = {
  id: string;
  created_by: string;
  titulo: string;
  contenido: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchProtocolos() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ProtocoloRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase.from("gestionesjj_iglesia_protocolos").select("*").order("titulo");

  if (error) return { data: [] as ProtocoloRow[], error: error.message };
  return { data: (data ?? []) as ProtocoloRow[], error: null };
}

export async function insertProtocolo(payload: { titulo: string; contenido?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as ProtocoloRow | null, error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_protocolos")
    .insert(payload)
    .select("*")
    .single();

  return { data: (data as ProtocoloRow | null) ?? null, error: error?.message ?? null };
}

export async function updateProtocolo(id: string, payload: { titulo?: string; contenido?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_protocolos").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteProtocolo(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_protocolos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Copia un protocolo para partir de el sin tocar el original. */
export async function duplicarProtocolo(protocolo: ProtocoloRow) {
  return insertProtocolo({ titulo: `${protocolo.titulo} (copia)`, contenido: protocolo.contenido });
}
