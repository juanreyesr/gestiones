import { getSupabaseClient } from "@/lib/supabase";
import type { CitaEstado, CitaModalidad, CitaRow, GcalSyncStatus, Moneda } from "./types";

type RawCita = {
  id: string;
  paciente_id: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  inicio: string;
  fin: string;
  estado: CitaEstado;
  origen: "interna" | "publica";
  modalidad: CitaModalidad | null;
  motivo: string | null;
  notas: string | null;
  motivo_estado: string | null;
  gcal_event_id: string | null;
  gcal_sync_status: GcalSyncStatus | null;
  pagada: boolean | null;
  pagada_at: string | null;
  monto: number | string | null;
  moneda: Moneda | null;
  gestionesjj_pacientes?: { nombre: string } | null;
};

const CITA_COLUMNS =
  "id,paciente_id,contacto_nombre,contacto_telefono,contacto_email,inicio,fin,estado,origen,modalidad,motivo,notas,motivo_estado,gcal_event_id,gcal_sync_status,pagada,pagada_at,monto,moneda,gestionesjj_pacientes(nombre)";

function mapCita(row: RawCita): CitaRow {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    pacienteNombre: row.gestionesjj_pacientes?.nombre ?? null,
    contactoNombre: row.contacto_nombre,
    contactoTelefono: row.contacto_telefono,
    contactoEmail: row.contacto_email,
    inicio: row.inicio,
    fin: row.fin,
    estado: row.estado,
    origen: row.origen,
    modalidad: row.modalidad,
    motivo: row.motivo,
    notas: row.notas,
    motivoEstado: row.motivo_estado,
    gcalEventId: row.gcal_event_id,
    gcalSyncStatus: row.gcal_sync_status,
    pagada: row.pagada ?? false,
    pagadaAt: row.pagada_at,
    monto: row.monto === null || row.monto === undefined ? null : Number(row.monto),
    moneda: row.moneda,
  };
}

function formatCitaError(error: { code?: string; message: string }) {
  if (error.code === "23P01") {
    return "Ese horario se traslapa con otra cita activa. Elige otro horario.";
  }
  return error.message;
}

export async function fetchCitas(desdeIso: string, hastaIso: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CitaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_citas")
    .select(CITA_COLUMNS)
    .gte("inicio", desdeIso)
    .lt("inicio", hastaIso)
    .order("inicio");

  if (error) return { data: [] as CitaRow[], error: error.message };
  return { data: ((data ?? []) as unknown as RawCita[]).map(mapCita), error: null };
}

/**
 * Cita activa (pendiente/confirmada) mas cercana del paciente: incluye la de hoy
 * aunque ya haya empezado, para poder abrir su sesion durante la consulta.
 */
export async function fetchProximaCitaDePaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as CitaRow | null, error: "Faltan las variables de Supabase." };

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("gestionesjj_citas")
    .select(CITA_COLUMNS)
    .eq("paciente_id", pacienteId)
    .in("estado", ["pendiente", "confirmada"])
    .gte("inicio", inicioDia.toISOString())
    .order("inicio")
    .limit(1)
    .maybeSingle();

  if (error) return { data: null as CitaRow | null, error: error.message };
  return { data: data ? mapCita(data as unknown as RawCita) : null, error: null };
}

export type CitaPayload = {
  paciente_id: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  inicio: string;
  fin: string;
  estado: CitaEstado;
  modalidad: CitaModalidad;
  motivo: string | null;
  notas: string | null;
};

export async function crearCita(payload: CitaPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_citas").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error ? formatCitaError(error) : null };
}

export async function actualizarCita(id: string, payload: Partial<CitaPayload>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_citas").update(payload).eq("id", id);
  return { error: error ? formatCitaError(error) : null };
}

export async function cambiarEstadoCita(id: string, estado: CitaEstado, motivoEstado?: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const payload: { estado: CitaEstado; motivo_estado?: string | null } = { estado };
  if (estado === "cancelada" || estado === "no_asistio") {
    payload.motivo_estado = motivoEstado?.trim() || null;
  }

  const { error } = await supabase.from("gestionesjj_citas").update(payload).eq("id", id);
  return { error: error ? formatCitaError(error) : null };
}

export async function eliminarCita(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_citas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Citas atendidas (completadas) que aun no se marcan como pagadas; de un paciente o de todos. */
export async function fetchCitasSinPagar(pacienteId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CitaRow[], error: "Faltan las variables de Supabase." };

  let query = supabase
    .from("gestionesjj_citas")
    .select(CITA_COLUMNS)
    .eq("estado", "completada")
    .eq("pagada", false)
    .order("inicio");
  if (pacienteId) query = query.eq("paciente_id", pacienteId);

  const { data, error } = await query;
  if (error) return { data: [] as CitaRow[], error: error.message };
  return { data: ((data ?? []) as unknown as RawCita[]).map(mapCita), error: null };
}

export async function marcarCitaPagada(id: string, pagada: boolean) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_citas")
    .update({ pagada, pagada_at: pagada ? new Date().toISOString() : null })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** Citas que ya terminaron pero siguen pendientes/confirmadas: falta marcar si se atendieron. */
export async function fetchCitasSinCerrar() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CitaRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_citas")
    .select(CITA_COLUMNS)
    .in("estado", ["pendiente", "confirmada"])
    .lt("fin", new Date().toISOString())
    .order("inicio");

  if (error) return { data: [] as CitaRow[], error: error.message };
  return { data: ((data ?? []) as unknown as RawCita[]).map(mapCita), error: null };
}

/** Cambia el monto de una cita puntual (descuento, sesion mas larga, etc.). */
export async function actualizarMontoCita(id: string, monto: number | null, moneda: Moneda) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase
    .from("gestionesjj_citas")
    .update({ monto, moneda: monto === null ? null : moneda })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** Citas marcadas como pagadas desde el inicio del mes en curso (lo cobrado del mes). */
export async function fetchCobradasDelMes() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CitaRow[], error: "Faltan las variables de Supabase." };

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("gestionesjj_citas")
    .select(CITA_COLUMNS)
    .eq("pagada", true)
    .gte("pagada_at", inicioMes.toISOString())
    .order("pagada_at");

  if (error) return { data: [] as CitaRow[], error: error.message };
  return { data: ((data ?? []) as unknown as RawCita[]).map(mapCita), error: null };
}
