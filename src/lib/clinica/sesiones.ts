import { getSupabaseClient } from "@/lib/supabase";
import type { CompromisoRow, CompromisoTipo, ResumenOrigen, SesionModalidad, SesionRow } from "./types";

type RawCompromiso = {
  id: string;
  sesion_id: string;
  paciente_id: string;
  tipo: CompromisoTipo;
  descripcion: string;
  cumplido: boolean;
  cumplido_en_sesion_id: string | null;
  orden: number;
};

type RawSesion = {
  id: string;
  paciente_id: string;
  cita_id: string | null;
  estado: "en_curso" | "finalizada";
  modalidad: SesionModalidad | null;
  tema: string | null;
  notas: string | null;
  resumen: string | null;
  seguimiento: string | null;
  resumen_origen: ResumenOrigen | null;
  iniciada_at: string;
  finalizada_at: string | null;
  gestionesjj_compromisos?: RawCompromiso[];
};

const SESION_COLUMNS =
  "id,paciente_id,cita_id,estado,modalidad,tema,notas,resumen,seguimiento,resumen_origen,iniciada_at,finalizada_at";

export function mapCompromiso(row: RawCompromiso): CompromisoRow {
  return {
    id: row.id,
    sesionId: row.sesion_id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    descripcion: row.descripcion,
    cumplido: row.cumplido,
    cumplidoEnSesionId: row.cumplido_en_sesion_id,
    orden: row.orden,
  };
}

function mapSesion(row: RawSesion): SesionRow {
  const compromisos = (row.gestionesjj_compromisos ?? [])
    .map(mapCompromiso)
    .sort((a, b) => a.orden - b.orden);
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    citaId: row.cita_id,
    estado: row.estado,
    modalidad: row.modalidad,
    tema: row.tema,
    notas: row.notas,
    resumen: row.resumen,
    seguimiento: row.seguimiento,
    resumenOrigen: row.resumen_origen,
    iniciadaAt: row.iniciada_at,
    finalizadaAt: row.finalizada_at,
    compromisos,
  };
}

export async function fetchSesionesDePaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as SesionRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_sesiones")
    .select(`${SESION_COLUMNS},gestionesjj_compromisos!gestionesjj_compromisos_sesion_id_fkey(id,sesion_id,paciente_id,tipo,descripcion,cumplido,cumplido_en_sesion_id,orden)`)
    .eq("paciente_id", pacienteId)
    .order("iniciada_at", { ascending: false });

  if (error) return { data: [] as SesionRow[], error: error.message };
  return { data: ((data ?? []) as unknown as RawSesion[]).map(mapSesion), error: null };
}

export async function fetchSesionEnCurso(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as SesionRow | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_sesiones")
    .select(SESION_COLUMNS)
    .eq("paciente_id", pacienteId)
    .eq("estado", "en_curso")
    .order("iniciada_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null as SesionRow | null, error: error.message };
  return { data: data ? mapSesion(data as unknown as RawSesion) : null, error: null };
}

export async function iniciarSesion(pacienteId: string, citaId?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_sesiones")
    .insert({ paciente_id: pacienteId, cita_id: citaId ?? null })
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function setModalidadSesion(sesionId: string, modalidad: SesionModalidad, tema?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_sesiones")
    .update({ modalidad, tema: modalidad === "tema_nuevo" ? (tema ?? null) : null })
    .eq("id", sesionId);

  return { error: error?.message ?? null };
}

export async function guardarNotasSesion(sesionId: string, notas: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_sesiones").update({ notas }).eq("id", sesionId);
  return { error: error?.message ?? null };
}

export type FinalizarSesionInput = {
  sesionId: string;
  pacienteId: string;
  citaId: string | null;
  resumen: string;
  seguimiento: string | null;
  resumenOrigen: ResumenOrigen;
  notas: string;
  compromisos: string[];
  tareas: string[];
  compromisosCumplidosIds: string[];
};

export async function finalizarSesion(input: FinalizarSesionInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error: sesionError } = await supabase
    .from("gestionesjj_sesiones")
    .update({
      estado: "finalizada",
      finalizada_at: new Date().toISOString(),
      resumen: input.resumen,
      seguimiento: input.seguimiento,
      resumen_origen: input.resumenOrigen,
      notas: input.notas,
    })
    .eq("id", input.sesionId);

  if (sesionError) return { error: sesionError.message };

  const nuevos = [
    ...input.compromisos.map((descripcion, index) => ({
      sesion_id: input.sesionId,
      paciente_id: input.pacienteId,
      tipo: "compromiso" as const,
      descripcion,
      orden: index,
    })),
    ...input.tareas.map((descripcion, index) => ({
      sesion_id: input.sesionId,
      paciente_id: input.pacienteId,
      tipo: "tarea" as const,
      descripcion,
      orden: index,
    })),
  ].filter((item) => item.descripcion.trim().length > 0);

  if (nuevos.length > 0) {
    const { error } = await supabase.from("gestionesjj_compromisos").insert(nuevos);
    if (error) return { error: error.message };
  }

  if (input.compromisosCumplidosIds.length > 0) {
    const { error } = await supabase
      .from("gestionesjj_compromisos")
      .update({ cumplido: true, cumplido_en_sesion_id: input.sesionId })
      .in("id", input.compromisosCumplidosIds);
    if (error) return { error: error.message };
  }

  if (input.citaId) {
    await supabase
      .from("gestionesjj_citas")
      .update({ estado: "completada" })
      .eq("id", input.citaId)
      .eq("estado", "confirmada");
  }

  return { error: null };
}

export async function descartarSesion(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_sesiones").delete().eq("id", sesionId).eq("estado", "en_curso");
  return { error: error?.message ?? null };
}
