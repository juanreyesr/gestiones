import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  return NextResponse.json({ ok: true, solicitudId: data as string });
}
