import { getSupabaseClient } from "@/lib/supabase";
import type { CompromisoRow } from "./types";
import { mapCompromiso } from "./sesiones";

type RawCompromisoConPaciente = {
  id: string;
  sesion_id: string;
  paciente_id: string;
  tipo: "compromiso" | "tarea";
  descripcion: string;
  cumplido: boolean;
  cumplido_en_sesion_id: string | null;
  orden: number;
  gestionesjj_pacientes?: { nombre: string } | null;
};

export type CompromisoPendiente = CompromisoRow & { pacienteNombre: string | null };

export async function fetchCompromisosPendientes(pacienteId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CompromisoPendiente[], error: "Faltan las variables de Supabase." };

  let query = supabase
    .from("gestionesjj_compromisos")
    .select(
      "id,sesion_id,paciente_id,tipo,descripcion,cumplido,cumplido_en_sesion_id,orden,gestionesjj_pacientes!gestionesjj_compromisos_paciente_id_fkey(nombre)"
    )
    .eq("cumplido", false)
    .order("created_at", { ascending: false });

  if (pacienteId) {
    query = query.eq("paciente_id", pacienteId);
  }

  const { data, error } = await query;
  if (error) return { data: [] as CompromisoPendiente[], error: error.message };

  const rows = ((data ?? []) as unknown as RawCompromisoConPaciente[]).map((row) => ({
    ...mapCompromiso(row),
    pacienteNombre: row.gestionesjj_pacientes?.nombre ?? null,
  }));

  return { data: rows, error: null };
}

export async function toggleCompromisoCumplido(id: string, cumplido: boolean, sesionId?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_compromisos")
    .update({ cumplido, cumplido_en_sesion_id: cumplido ? (sesionId ?? null) : null })
    .eq("id", id);

  return { error: error?.message ?? null };
}
