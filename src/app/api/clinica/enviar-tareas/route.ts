import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { isTelegramConfigured, leerConfig } from "@/lib/server/telegram";
import { enviarTareasPorTelegram } from "@/lib/server/telegram-enlaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limpiar = (items: unknown) =>
  Array.isArray(items)
    ? items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 30)
        .map((item) => item.slice(0, 500))
    : [];

/**
 * Cierre de sesion → "Enviar al paciente": manda al Telegram del owner los
 * compromisos y tareas con un boton de WhatsApp para reenviarlos al paciente.
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as {
    pacienteId?: string;
    compromisos?: unknown;
    tareas?: unknown;
  } | null;
  const compromisos = limpiar(body?.compromisos);
  const tareas = limpiar(body?.tareas);
  if (!body?.pacienteId) return NextResponse.json({ error: "Falta el paciente." }, { status: 400 });
  if (compromisos.length === 0 && tareas.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un compromiso o una tarea." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  const config = isTelegramConfigured() ? await leerConfig() : null;
  if (!admin || !config?.chatId) {
    return NextResponse.json({ error: "Telegram no está vinculado. Vincúlalo desde el panel." }, { status: 503 });
  }

  const { error } = await enviarTareasPorTelegram(admin, config.chatId, body.pacienteId, compromisos, tareas);
  if (error) return NextResponse.json({ error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
