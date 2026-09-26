import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";
import { enviarRecordatoriosCitas } from "@/lib/server/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recordatorios de cita por Telegram. Lo llama pg_cron de Supabase cada 10
 * minutos (migracion 034) con Authorization: Bearer <CRON_SECRET>, el mismo
 * secreto que protege el resumen diario de Vercel Cron.
 */
export async function POST(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secreto || !comparaSeguro(header, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return NextResponse.json({ status: "no_configurado" });

  const config = await leerConfig();
  if (!config?.chatId) return NextResponse.json({ status: "sin_vincular" });

  const enviados = await enviarRecordatoriosCitas(admin, config);

  // Limpieza: los registros de citas que pasaron hace mas de 2 dias ya no sirven.
  await admin
    .from("gestionesjj_telegram_recordatorios")
    .delete()
    .lt("inicio", new Date(Date.now() - 2 * 86_400_000).toISOString());

  return NextResponse.json({ status: "ok", enviados });
}
