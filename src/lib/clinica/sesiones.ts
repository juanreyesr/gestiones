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
  seguimientoIds: string[];
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

  // Trasladar a esta sesión los compromisos/tareas previos que se decidió seguir
  // (permanecen sin cumplir, pero ahora "cuelgan" de la sesión actual).
  if (input.seguimientoIds.length > 0) {
    const { error } = await supabase
      .from("gestionesjj_compromisos")
      .update({ sesion_id: input.sesionId })
      .in("id", input.seguimientoIds);
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

export async function eliminarSesion(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_sesiones").delete().eq("id", sesionId);
  return { error: error?.message ?? null };
}

export type ItemSesion = { id?: string; descripcion: string };

export type SesionEditableInput = {
  fechaIso: string;
  modalidad: SesionModalidad | null;
  tema: string | null;
  notas: string | null;
  resumen: string | null;
  seguimiento: string | null;
  compromisos: ItemSesion[];
  tareas: ItemSesion[];
};

type SupabaseCliente = NonNullable<ReturnType<typeof getSupabaseClient>>;

/**
 * Sincroniza los compromisos/tareas de una sesión con la lista editada:
 * inserta los nuevos, actualiza los existentes y borra los quitados,
 * preservando el estado "cumplido" de los que permanecen.
 */
async function syncCompromisos(
  supabase: SupabaseCliente,
  sesionId: string,
  pacienteId: string,
  compromisos: ItemSesion[],
  tareas: ItemSesion[]
): Promise<string | null> {
  const deseados = [
    ...compromisos.map((item, index) => ({ ...item, tipo: "compromiso" as const, orden: index })),
    ...tareas.map((item, index) => ({ ...item, tipo: "tarea" as const, orden: index })),
  ].filter((item) => item.descripcion.trim().length > 0);

  const { data: existentes, error: existErr } = await supabase
    .from("gestionesjj_compromisos")
    .select("id")
    .eq("sesion_id", sesionId);
  if (existErr) return existErr.message;

  const existentesIds = new Set(((existentes ?? []) as { id: string }[]).map((row) => row.id));
  const conservadosIds = new Set(deseados.filter((item) => item.id).map((item) => item.id as string));

  const aBorrar = [...existentesIds].filter((id) => !conservadosIds.has(id));
  if (aBorrar.length > 0) {
    const { error } = await supabase.from("gestionesjj_compromisos").delete().in("id", aBorrar);
    if (error) return error.message;
  }

  for (const item of deseados.filter((d) => d.id)) {
    const { error } = await supabase
      .from("gestionesjj_compromisos")
      .update({ descripcion: item.descripcion.trim(), tipo: item.tipo, orden: item.orden })
      .eq("id", item.id as string);
    if (error) return error.message;
  }

  const nuevos = deseados
    .filter((d) => !d.id)
    .map((item) => ({
      sesion_id: sesionId,
      paciente_id: pacienteId,
      tipo: item.tipo,
      descripcion: item.descripcion.trim(),
      orden: item.orden,
    }));
  if (nuevos.length > 0) {
    const { error } = await supabase.from("gestionesjj_compromisos").insert(nuevos);
    if (error) return error.message;
  }

  return null;
}

/** Crea una sesión pasada ya finalizada, con la fecha que indique el terapeuta. */
export async function crearSesionManual(pacienteId: string, input: SesionEditableInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_sesiones")
    .insert({
      paciente_id: pacienteId,
      estado: "finalizada",
      modalidad: input.modalidad,
      tema: input.modalidad === "tema_nuevo" ? input.tema : input.tema || null,
      notas: input.notas,
      resumen: input.resumen,
      seguimiento: input.seguimiento,
      resumen_origen: "manual",
      iniciada_at: input.fechaIso,
      finalizada_at: input.fechaIso,
    })
    .select("id")
    .single();

  if (error || !data) return { id: null as string | null, error: error?.message ?? "No se pudo crear la sesión." };

  const syncErr = await syncCompromisos(supabase, data.id as string, pacienteId, input.compromisos, input.tareas);
  return { id: data.id as string, error: syncErr };
}

/** Edita una sesión existente (fecha, contenido y compromisos/tareas). */
export async function editarSesion(sesionId: string, pacienteId: string, input: SesionEditableInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_sesiones")
    .update({
      modalidad: input.modalidad,
      tema: input.modalidad === "tema_nuevo" ? input.tema : input.tema || null,
      notas: input.notas,
      resumen: input.resumen,
      seguimiento: input.seguimiento,
      iniciada_at: input.fechaIso,
      finalizada_at: input.fechaIso,
    })
    .eq("id", sesionId);

  if (error) return { error: error.message };

  const syncErr = await syncCompromisos(supabase, sesionId, pacienteId, input.compromisos, input.tareas);
  return { error: syncErr };
}
