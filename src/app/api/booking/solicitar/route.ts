import { after, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getStoredTokens, isGoogleConfigured, queryFreeBusy } from "@/lib/server/google-calendar";
import { avisarSolicitudCita } from "@/lib/server/telegram-avisos";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!rateLimit(request, { key: "booking-solicitar", limit: 5, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    nombre?: string;
    telefono?: string;
    email?: string | null;
    motivo?: string | null;
    inicio?: string;
    consentimiento?: boolean;
    yaEsPaciente?: boolean;
    primeraSesion?: boolean;
    darSeguimiento?: boolean;
    empresa?: string; // honeypot: las personas nunca lo llenan
  } | null;

  if (!body || typeof body.nombre !== "string" || typeof body.telefono !== "string" || typeof body.inicio !== "string") {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  // Bot detectado: responder como exito sin guardar nada.
  if (body.empresa && body.empresa.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const inicioDate = new Date(body.inicio);
  if (Number.isNaN(inicioDate.getTime())) {
    return NextResponse.json({ error: "Horario inválido." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El agendamiento no está disponible." }, { status: 503 });
  }

  // La lista de horarios ya resta lo ocupado en Google Calendar, pero pudo
  // quedar vieja (la pagina se abrio antes de que se agendara algo afuera).
  // Se vuelve a verificar aqui, justo antes de guardar la solicitud.
  if (await ocupadoEnGoogle(supabase, inicioDate)) {
    return NextResponse.json({ error: "Ese horario ya no está disponible. Por favor elija otro." }, { status: 409 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_solicitar_cita", {
    p_nombre: body.nombre,
    p_telefono: body.telefono,
    p_email: body.email ?? null,
    p_motivo: body.motivo ?? null,
    p_inicio: inicioDate.toISOString(),
    p_consentimiento: body.consentimiento ?? false,
    p_ya_es_paciente: body.yaEsPaciente ?? false,
    p_primera_sesion: body.primeraSesion ?? false,
    p_dar_seguimiento: body.darSeguimiento ?? false,
  });

  if (error) {
    // Los mensajes de la RPC ya vienen en espanol y son seguros de mostrar.
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  after(() => avisarSolicitudCita(data as string).catch(() => undefined));

  return NextResponse.json({ ok: true, solicitudId: data as string });
}

/** true si el horario choca con un evento ocupado de Google Calendar. */
async function ocupadoEnGoogle(supabase: NonNullable<ReturnType<typeof getSupabaseClient>>, inicio: Date) {
  if (!isGoogleConfigured()) return false;
  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado !== "conectado") return false;

  // El fin del bloque sale de los propios horarios publicos de ese dia
  // (duracion configurada); si no se encuentra, la RPC rechazara igual.
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(inicio);
  const { data } = await supabase.rpc("gestionesjj_public_slots", { p_desde: dia, p_hasta: dia });
  const slot = ((data ?? []) as { inicio: string; fin: string }[]).find(
    (s) => new Date(s.inicio).getTime() === inicio.getTime(),
  );
  if (!slot) return false;

  const { busy, error } = await queryFreeBusy(inicio.toISOString(), new Date(slot.fin).toISOString());
  if (error) return false; // si Google falla no se bloquea el agendamiento
  const fin = new Date(slot.fin).getTime();
  return busy.some((b) => new Date(b.inicio).getTime() < fin && inicio.getTime() < new Date(b.fin).getTime());
}
