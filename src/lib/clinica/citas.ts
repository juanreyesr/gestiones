import { getSupabaseClient } from "@/lib/supabase";
import type { CitaEstado, CitaModalidad, CitaRow, GcalSyncStatus } from "./types";

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
  gcal_event_id: string | null;
  gcal_sync_status: GcalSyncStatus | null;
  gestionesjj_pacientes?: { nombre: string } | null;
};

const CITA_COLUMNS =
  "id,paciente_id,contacto_nombre,contacto_telefono,contacto_email,inicio,fin,estado,origen,modalidad,motivo,notas,gcal_event_id,gcal_sync_status,gestionesjj_pacientes(nombre)";

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
    gcalEventId: row.gcal_event_id,
    gcalSyncStatus: row.gcal_sync_status,
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

export async function fetchProximaCitaDePaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as CitaRow | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_citas")
    .select(CITA_COLUMNS)
    .eq("paciente_id", pacienteId)
    .in("estado", ["pendiente", "confirmada"])
    .gte("inicio", new Date().toISOString())
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

export async function cambiarEstadoCita(id: string, estado: CitaEstado) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_citas").update({ estado }).eq("id", id);
  return { error: error ? formatCitaError(error) : null };
}

export async function eliminarCita(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_citas").delete().eq("id", id);
  return { error: error?.message ?? null };
}
