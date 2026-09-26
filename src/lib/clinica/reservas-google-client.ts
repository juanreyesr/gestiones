import { getSupabaseClient } from "@/lib/supabase";

/** Reserva de Calendly (u otro sistema) detectada en Google Calendar, pendiente de revisar. */
export type ReservaGoogle = {
  id: string;
  inicio: string;
  fin: string;
  tipoEvento: string | null;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  motivo: string | null;
  notas: string | null;
  consentimiento: boolean;
  calendarioPrincipal: boolean;
};

type RawReserva = {
  id: string;
  inicio: string;
  fin: string;
  tipo_evento: string | null;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  motivo: string | null;
  notas: string | null;
  consentimiento: boolean;
  calendario_principal: boolean;
};

export async function fetchReservasPendientes() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ReservaGoogle[], error: "Faltan las variables de Supabase." };
  const { data, error } = await supabase
    .from("gestionesjj_google_reservas")
    .select("id,inicio,fin,tipo_evento,nombre,telefono,email,motivo,notas,consentimiento,calendario_principal")
    .eq("estado", "pendiente")
    .order("inicio")
    .limit(100);
  if (error) return { data: [] as ReservaGoogle[], error: error.message };
  return {
    data: ((data ?? []) as RawReserva[]).map((r) => ({
      id: r.id,
      inicio: r.inicio,
      fin: r.fin,
      tipoEvento: r.tipo_evento,
      nombre: r.nombre,
      telefono: r.telefono,
      email: r.email,
      motivo: r.motivo,
      notas: r.notas,
      consentimiento: r.consentimiento,
      calendarioPrincipal: r.calendario_principal,
    })),
    error: null,
  };
}

async function llamar<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: sesion } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = sesion.session?.access_token;
  if (!token) return { data: null, error: "Sesión no válida. Vuelve a iniciar." };
  try {
    const response = await fetch("/api/clinica/reservas-google", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok) return { data: null, error: json?.error ?? "No se pudo completar la operación." };
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "Error de conexión." };
  }
}

export function buscarReservasAhora() {
  return llamar<{ nuevas: number }>({ accion: "sincronizar" });
}

export function resolverReservaGoogle(input: {
  id: string;
  accion: "vincular" | "crear" | "ignorar";
  pacienteId?: string | null;
  datos?: { nombre: string; telefono: string; email: string };
}) {
  return llamar<{ mensaje: string; citaId: string | null; pacienteId: string | null }>(input);
}
