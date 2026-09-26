import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { type AccionReserva, resolverReserva, sincronizarReservas } from "@/lib/server/reservas-google";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isTelegramConfigured, leerConfig } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Panel de Clinica → Solicitudes: buscar reservas nuevas en Google Calendar
 * ahora mismo, o resolver una (vincular a paciente, crear paciente, ignorar).
 * Es la misma logica que usan los botones de Telegram.
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as {
    accion?: AccionReserva | "sincronizar";
    id?: string;
    pacienteId?: string | null;
    datos?: { nombre?: string; telefono?: string; email?: string };
  } | null;

  const config = isTelegramConfigured() ? await leerConfig() : null;
  const configTelegram = config?.chatId ? config : null;

  if (body?.accion === "sincronizar") {
    const { nuevas, conectado } = await sincronizarReservas(admin, configTelegram);
    if (!conectado) return NextResponse.json({ error: "Google Calendar no está conectado." }, { status: 409 });
    return NextResponse.json({ nuevas });
  }

  if (!body?.id || !UUID_RE.test(body.id) || !["vincular", "crear", "ignorar"].includes(body.accion ?? "")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }
  if (body.pacienteId && !UUID_RE.test(body.pacienteId)) {
    return NextResponse.json({ error: "Paciente inválido." }, { status: 422 });
  }

  const recortar = (v: string | undefined, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const resultado = await resolverReserva(admin, auth.ownerId, body.id, body.accion as AccionReserva, {
    pacienteId: body.pacienteId ?? null,
    datos: body.datos
      ? {
          nombre: recortar(body.datos.nombre, 160),
          telefono: recortar(body.datos.telefono, 30),
          email: recortar(body.datos.email, 160),
        }
      : undefined,
    config: configTelegram,
  });

  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 409 });
  return NextResponse.json(resultado);
}
