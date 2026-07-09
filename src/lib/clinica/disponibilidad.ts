import { getSupabaseClient } from "@/lib/supabase";
import type { DisponibilidadConfig, HorarioSemanal } from "./types";

type RawDisponibilidad = {
  id: string;
  zona_horaria: string;
  duracion_min: number;
  buffer_min: number;
  antelacion_min_horas: number;
  antelacion_max_dias: number;
  agendamiento_publico: boolean;
  horario_semanal: HorarioSemanal;
};

const DEFAULT_CONFIG: DisponibilidadConfig = {
  id: null,
  zonaHoraria: "America/Guatemala",
  duracionMin: 50,
  bufferMin: 10,
  antelacionMinHoras: 12,
  antelacionMaxDias: 30,
  agendamientoPublico: false,
  horarioSemanal: {},
};

function mapConfig(row: RawDisponibilidad): DisponibilidadConfig {
  return {
    id: row.id,
    zonaHoraria: row.zona_horaria,
    duracionMin: row.duracion_min,
    bufferMin: row.buffer_min,
    antelacionMinHoras: row.antelacion_min_horas,
    antelacionMaxDias: row.antelacion_max_dias,
    agendamientoPublico: row.agendamiento_publico,
    horarioSemanal: row.horario_semanal ?? {},
  };
}

export async function fetchDisponibilidad() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: DEFAULT_CONFIG, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_disponibilidad")
    .select("id,zona_horaria,duracion_min,buffer_min,antelacion_min_horas,antelacion_max_dias,agendamiento_publico,horario_semanal")
    .limit(1)
    .maybeSingle();

  if (error) return { data: DEFAULT_CONFIG, error: error.message };
  if (!data) return { data: DEFAULT_CONFIG, error: null };
  return { data: mapConfig(data as unknown as RawDisponibilidad), error: null };
}

export async function guardarDisponibilidad(config: DisponibilidadConfig) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const payload = {
    zona_horaria: config.zonaHoraria,
    duracion_min: config.duracionMin,
    buffer_min: config.bufferMin,
    antelacion_min_horas: config.antelacionMinHoras,
    antelacion_max_dias: config.antelacionMaxDias,
    agendamiento_publico: config.agendamientoPublico,
    horario_semanal: config.horarioSemanal,
  };

  if (config.id) {
    const { error } = await supabase.from("gestionesjj_disponibilidad").update(payload).eq("id", config.id);
    return { id: config.id, error: error?.message ?? null };
  }

  const { data, error } = await supabase.from("gestionesjj_disponibilidad").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}
