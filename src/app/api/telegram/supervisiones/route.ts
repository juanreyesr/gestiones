import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { enviarRecordatoriosSupervision } from "@/lib/server/supervision-recordatorios";
import { comparaSeguro, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recordatorio de supervisiones 5 minutos antes. Lo llama pg_cron cada minuto
 * (migracion 040) con Authorization: Bearer <CRON_SECRET>. Va aparte de
 * /api/telegram/recordatorios (cada 10 minutos) porque ese intervalo no
 * alcanza para avisar 5 minutos antes.
 */
export async function POST(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secreto || !comparaSeguro(header, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isTelegramConfigured()) return NextResponse.json({ status: "no_configurado" });

  const config = await leerConfig();
  if (!config?.chatId) return NextResponse.json({ status: "sin_vincular" });

  const enviados = await enviarRecordatoriosSupervision(admin, config);

  // Limpieza: los registros de avisos de hace mas de 2 dias ya no sirven.
  const limite = new Date(Date.now() - 2 * 86_400_000).toISOString();
  await admin.from("gestionesjj_telegram_recordatorios_supervision").delete().lt("inicio", limite);

  return NextResponse.json({ status: "ok", enviados });
}
