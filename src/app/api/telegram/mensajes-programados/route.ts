import { NextResponse } from "next/server";
import { enviarMensajesProgramados } from "@/lib/server/mensajes-programados";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mensajes programados de Gestion de pendientes. Lo llama pg_cron cada minuto
 * (migracion 046), solo cuando hay alguno vencido, con
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
  const enviados = await enviarMensajesProgramados(admin, config);

  return NextResponse.json({ status: config?.chatId ? "ok" : "sin_vincular", enviados });
}
