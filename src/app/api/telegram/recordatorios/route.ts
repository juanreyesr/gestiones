import { NextResponse } from "next/server";
import { sincronizarReservas } from "@/lib/server/reservas-google";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";
import { enviarRecordatoriosCitas, enviarRecordatoriosGoogle } from "@/lib/server/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tareas de cada 10 minutos. Lo llama pg_cron de Supabase (migracion 034)
 * con Authorization: Bearer <CRON_SECRET>, el mismo secreto que protege el
 * resumen diario de Vercel Cron.
 *  - Recordatorios por Telegram de citas y compromisos de Google (si hay chat vinculado).
 *  - Deteccion de reservas de Calendly u otros sistemas en Google Calendar
 *    (siempre: el panel las muestra aunque Telegram no este vinculado).
 */
export async function POST(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secreto || !comparaSeguro(header, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ status: "no_configurado" });

  const config = isTelegramConfigured() ? await leerConfig() : null;
  const telegramActivo = Boolean(config?.chatId);

  const citas = telegramActivo ? await enviarRecordatoriosCitas(admin, config!) : 0;
  // Un fallo de Google no debe impedir los recordatorios de las citas.
  const compromisos = telegramActivo ? await enviarRecordatoriosGoogle(admin, config!).catch(() => 0) : 0;
  const reservas = await sincronizarReservas(admin, telegramActivo ? config : null).catch(() => ({ nuevas: 0 }));

  // Limpieza: los registros de avisos de hace mas de 2 dias ya no sirven.
  const limite = new Date(Date.now() - 2 * 86_400_000).toISOString();
  await admin.from("gestionesjj_telegram_recordatorios").delete().lt("inicio", limite);
  await admin.from("gestionesjj_telegram_recordatorios_google").delete().lt("inicio", limite);

  return NextResponse.json({
    status: telegramActivo ? "ok" : "sin_vincular",
    enviados: citas + compromisos,
    citas,
    compromisos,
    reservas: reservas.nuevas,
  });
}
