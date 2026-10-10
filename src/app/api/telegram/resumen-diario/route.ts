import { NextResponse } from "next/server";
import { comparaSeguro, enviarMensaje, fechaLocal, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";
import { avisoCumpleanosDocentes } from "@/lib/server/cumpleanos-docentes";
import { avisoCumpleanosPacientes } from "@/lib/server/cumpleanos-pacientes";
import { construirResumenDiario } from "@/lib/server/telegram-bot";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resumen diario y cumpleaños de pacientes y docentes por Telegram. Lo dispara Vercel
 * Cron (ver vercel.json), que envia Authorization: Bearer <CRON_SECRET>. Solo
 * manda los avisos una vez por dia aunque el cron se ejecute mas de una vez.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secreto || !comparaSeguro(header, `Bearer ${secreto}`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return NextResponse.json({ status: "no_configurado" });

  const config = await leerConfig();
  const hoy = fechaLocal();

  // Limpieza de hilos viejos (avisos de hace mas de 90 dias ya no se responden).
  await admin
    .from("gestionesjj_telegram_hilos")
    .delete()
    .lt("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString());

  if (!config?.chatId) return NextResponse.json({ status: "sin_vincular" });
  if (config.ultimoResumen === hoy) return NextResponse.json({ status: "ya_enviado" });

  const enviados: string[] = [];
  if (config.preferencias.cumpleanos_pacientes) {
    const cumpleanos = await avisoCumpleanosPacientes(admin);
    if (cumpleanos) {
      const res = await enviarMensaje(config.chatId, cumpleanos.texto, { botones: cumpleanos.botones });
      if (!res.ok) return NextResponse.json({ status: "error", error: res.error }, { status: 502 });
      enviados.push("cumpleanos");
    }
  }

  if (config.preferencias.cumpleanos_docentes) {
    const cumpleanos = await avisoCumpleanosDocentes(admin);
    if (cumpleanos) {
      const res = await enviarMensaje(config.chatId, cumpleanos.texto, { botones: cumpleanos.botones });
      if (!res.ok) {
        if (enviados.length) await admin.from("gestionesjj_telegram_config").update({ ultimo_resumen: hoy }).eq("id", 1);
        return NextResponse.json({ status: "error", error: res.error }, { status: 502 });
      }
      enviados.push("cumpleanos_docentes");
    }
  }

  if (config.preferencias.resumen_diario) {
    const resumen = await construirResumenDiario(admin);
    const res = await enviarMensaje(config.chatId, resumen.texto, { botones: resumen.botones });
    if (!res.ok) {
      // Si los cumpleaños ya salieron se marca el dia para no repetirlos.
      if (enviados.length) await admin.from("gestionesjj_telegram_config").update({ ultimo_resumen: hoy }).eq("id", 1);
      return NextResponse.json({ status: "error", error: res.error }, { status: 502 });
    }
    enviados.push("resumen");
  }

  // ultimo_resumen marca que los avisos de las 7:00 a. m. de hoy ya salieron.
  await admin.from("gestionesjj_telegram_config").update({ ultimo_resumen: hoy }).eq("id", 1);
  return NextResponse.json({ status: enviados.length ? "enviado" : "sin_avisos", enviados });
}
