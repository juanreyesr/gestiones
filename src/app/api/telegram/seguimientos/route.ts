import { NextResponse } from "next/server";
import { procesarSeguimientos } from "@/lib/server/seguimientos-evaluaciones";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seguimiento programado de evaluaciones. Lo llama pg_cron cada hora de 8:00 a
 * 20:00 (migración 063), solo cuando hay alguno vencido, con
 * Authorization: Bearer <CRON_SECRET>.
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
  const resultado = await procesarSeguimientos(admin, config);
  return NextResponse.json({ status: config?.chatId ? "ok" : "sin_vincular", ...resultado });
}
