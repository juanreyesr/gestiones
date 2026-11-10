import { NextResponse } from "next/server";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { citaDeTokenDatos, mensajeRecordatorioDatos } from "@/lib/server/datos-pendientes";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Botón «Enviar recordatorio por WhatsApp» (Telegram, un día antes de la
 * cita): arma el recordatorio de la hoja de datos con el saludo de la hora en
 * que se toca y «mañana»/«hoy» según la fecha vigente de la cita, y redirige a
 * WhatsApp.
 */
export async function GET(request: Request) {
  const citaId = citaDeTokenDatos(new URL(request.url).searchParams.get("t"));
  const admin = getSupabaseAdmin();
  const mensaje = citaId && admin ? await mensajeRecordatorioDatos(admin, citaId) : null;
  if (!mensaje) {
    return new NextResponse("Enlace no válido o la cita ya no existe.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.redirect(enlaceWhatsApp(mensaje.paciente.telefono, mensaje.texto, mensaje.paciente.pais), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
