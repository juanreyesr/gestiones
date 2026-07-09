import { getSupabaseClient } from "@/lib/supabase";
import type { SolicitudEstado, SolicitudRow } from "./types";

type RawSolicitud = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  motivo: string | null;
  inicio: string;
  fin: string;
  estado: SolicitudEstado;
  paciente_id: string | null;
  cita_id: string | null;
  created_at: string;
  ya_es_paciente: boolean;
  primera_sesion: boolean;
  dar_seguimiento: boolean;
};

const SOLICITUD_COLUMNS =
  "id,nombre,telefono,email,motivo,inicio,fin,estado,paciente_id,cita_id,created_at,ya_es_paciente,primera_sesion,dar_seguimiento";

function mapSolicitud(row: RawSolicitud): SolicitudRow {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email,
    motivo: row.motivo,
    inicio: row.inicio,
    fin: row.fin,
    estado: row.estado,
    pacienteId: row.paciente_id,
    citaId: row.cita_id,
    createdAt: row.created_at,
    yaEsPaciente: row.ya_es_paciente,
    primeraSesion: row.primera_sesion,
    darSeguimiento: row.dar_seguimiento,
  };
}

export async function fetchSolicitudes() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      pendientes: [] as SolicitudRow[],
      historial: [] as SolicitudRow[],
      error: "Faltan las variables de Supabase.",
    };
  }

  // Marca como expiradas las solicitudes pendientes cuya hora ya paso.
  await supabase
    .from("gestionesjj_solicitudes_cita")
    .update({ estado: "expirada" })
    .eq("estado", "pendiente")
    .lt("inicio", new Date().toISOString());

  const { data, error } = await supabase
    .from("gestionesjj_solicitudes_cita")
    .select(SOLICITUD_COLUMNS)
    .order("inicio")
    .limit(200);

  if (error) return { pendientes: [] as SolicitudRow[], historial: [] as SolicitudRow[], error: error.message };

  const rows = ((data ?? []) as unknown as RawSolicitud[]).map(mapSolicitud);
  const pendientes = rows.filter((row) => row.estado === "pendiente");
  const historial = rows
    .filter((row) => row.estado !== "pendiente")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);

  return { pendientes, historial, error: null };
}

export async function contarSolicitudesPendientes() {
  const supabase = getSupabaseClient();
  if (!supabase) return { count: 0, error: "Faltan las variables de Supabase." };

  const { count, error } = await supabase
    .from("gestionesjj_solicitudes_cita")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente")
    .gte("inicio", new Date().toISOString());

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
}

export async function aprobarSolicitud(solicitudId: string, pacienteId: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { citaId: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_aprobar_solicitud", {
    p_solicitud_id: solicitudId,
    p_paciente_id: pacienteId,
  });

  if (error) return { citaId: null as string | null, error: error.message };
  return { citaId: (data as string | null) ?? null, error: null };
}

export async function rechazarSolicitud(solicitudId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_solicitudes_cita")
    .update({ estado: "rechazada" })
    .eq("id", solicitudId)
    .eq("estado", "pendiente");

  return { error: error?.message ?? null };
}
