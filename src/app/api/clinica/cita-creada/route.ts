import { after, NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { avisarDatosPendientesDeCitaNueva } from "@/lib/server/datos-pendientes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El panel avisa que creó o aprobó una cita: si es de hoy (o de mañana y ya
 * pasó el aviso de las 7:00 a. m.) y el paciente no ha llenado su hoja de
 * datos o no firmó el consentimiento, llega el aviso por Telegram de inmediato.
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as { citaId?: string } | null;
  if (!body?.citaId || !UUID_RE.test(body.citaId)) return NextResponse.json({ error: "Cita no válida." }, { status: 400 });
  const citaId = body.citaId;
  after(() => avisarDatosPendientesDeCitaNueva(citaId).catch(() => undefined));
  return NextResponse.json({ ok: true });
}
