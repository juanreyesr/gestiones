import { getSupabaseClient } from "@/lib/supabase";
import type { PacienteEstado, PacientePayload, PacienteRow } from "./types";

type RawPaciente = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  ocupacion: string | null;
  escolaridad: string | null;
  estado_civil: string | null;
  direccion: string | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  emergencia_relacion: string | null;
  motivo_consulta: string | null;
  antecedentes_medicos: string | null;
  antecedentes_psicologicos: string | null;
  antecedentes_familiares: string | null;
  medicacion_actual: string | null;
  referido_por: string | null;
  notas_generales: string | null;
  estado: PacienteEstado;
  created_at: string;
  datos_token: string | null;
  datos_completados_at: string | null;
  consentimiento_aceptado_at: string | null;
};

const PACIENTE_COLUMNS =
  "id,nombre,telefono,email,fecha_nacimiento,genero,ocupacion,escolaridad,estado_civil,direccion,emergencia_nombre,emergencia_telefono,emergencia_relacion,motivo_consulta,antecedentes_medicos,antecedentes_psicologicos,antecedentes_familiares,medicacion_actual,referido_por,notas_generales,estado,created_at,datos_token,datos_completados_at,consentimiento_aceptado_at";

function mapPaciente(row: RawPaciente): PacienteRow {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email,
    fechaNacimiento: row.fecha_nacimiento,
    genero: row.genero,
    ocupacion: row.ocupacion,
    escolaridad: row.escolaridad,
    estadoCivil: row.estado_civil,
    direccion: row.direccion,
    emergenciaNombre: row.emergencia_nombre,
    emergenciaTelefono: row.emergencia_telefono,
    emergenciaRelacion: row.emergencia_relacion,
    motivoConsulta: row.motivo_consulta,
    antecedentesMedicos: row.antecedentes_medicos,
    antecedentesPsicologicos: row.antecedentes_psicologicos,
    antecedentesFamiliares: row.antecedentes_familiares,
    medicacionActual: row.medicacion_actual,
    referidoPor: row.referido_por,
    notasGenerales: row.notas_generales,
    estado: row.estado,
    createdAt: row.created_at,
    datosToken: row.datos_token,
    datosCompletadosAt: row.datos_completados_at,
    consentimientoAceptadoAt: row.consentimiento_aceptado_at,
  };
}

export async function fetchPacientes(busqueda?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as PacienteRow[], error: "Faltan las variables de Supabase." };

  let query = supabase.from("gestionesjj_pacientes").select(PACIENTE_COLUMNS).order("nombre");
  const term = busqueda?.trim();
  if (term) {
    query = query.or(`nombre.ilike.%${term}%,telefono.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return { data: [] as PacienteRow[], error: error.message };
  return { data: ((data ?? []) as unknown as RawPaciente[]).map(mapPaciente), error: null };
}

export async function fetchPaciente(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as PacienteRow | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_pacientes").select(PACIENTE_COLUMNS).eq("id", id).single();
  if (error) return { data: null as PacienteRow | null, error: error.message };
  return { data: mapPaciente(data as unknown as RawPaciente), error: null };
}

export async function upsertPaciente(id: string | null, payload: PacientePayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  if (id) {
    const { error } = await supabase.from("gestionesjj_pacientes").update(payload).eq("id", id);
    return { id, error: error?.message ?? null };
  }

  const { data, error } = await supabase.from("gestionesjj_pacientes").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function setEstadoPaciente(id: string, estado: PacienteEstado) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_pacientes").update({ estado }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deletePaciente(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_pacientes").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Garantiza un token para el enlace de datos generales y lo devuelve. */
export async function ensureDatosToken(id: string, tokenActual: string | null) {
  if (tokenActual) return { token: tokenActual, error: null };
  const supabase = getSupabaseClient();
  if (!supabase) return { token: null as string | null, error: "Faltan las variables de Supabase." };

  const nuevo = crypto.randomUUID();
  const { error } = await supabase.from("gestionesjj_pacientes").update({ datos_token: nuevo }).eq("id", id);
  return { token: error ? null : nuevo, error: error?.message ?? null };
}

/** Reabre el enlace de datos generales para que el paciente lo vuelva a llenar. */
export async function reactivarDatos(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase
    .from("gestionesjj_pacientes")
    .update({ datos_completados_at: null })
    .eq("id", id);
  return { error: error?.message ?? null };
}
