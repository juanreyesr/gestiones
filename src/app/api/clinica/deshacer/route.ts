import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { deshacerReserva, deshacerSolicitud } from "@/lib/server/deshacer-solicitudes";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isTelegramConfigured, leerConfig } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Panel de Clinica → Solicitudes: "Deshacer" una solicitud o reserva ya resuelta. */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { tipo?: string; id?: string } | null;
  if (!body?.id || !UUID_RE.test(body.id) || (body.tipo !== "solicitud" && body.tipo !== "reserva")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  let resultado;
  if (body.tipo === "solicitud") {
    resultado = await deshacerSolicitud(admin, body.id);
  } else {
    const config = isTelegramConfigured() ? await leerConfig() : null;
    resultado = await deshacerReserva(admin, body.id, config?.chatId ? config : null);
  }
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 409 });
  return NextResponse.json(resultado);
}
