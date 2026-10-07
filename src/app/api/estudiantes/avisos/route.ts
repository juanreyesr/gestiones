import { NextResponse } from "next/server";
import { procesarAvisosEstudiantes } from "@/lib/server/estudiantes-avisos";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * pg_cron (migracion 053) la llama cada minuto con Authorization: Bearer
 * <CRON_SECRET>: reenvia por Telegram y push las notificaciones nuevas de los
 * estudiantes, crea los recordatorios de vencimiento y cierra los avisos de
 * quien ya no tiene cursos activos.
 */
export async function POST(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secreto || !comparaSeguro(header, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ status: "no_configurado" });
  const resultado = await procesarAvisosEstudiantes(admin);
  return NextResponse.json({ status: "ok", ...resultado });
}
