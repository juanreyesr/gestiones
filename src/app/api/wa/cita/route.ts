import { NextResponse } from "next/server";
import { citaDeToken, enlaceConfirmacion, leerCitaPublica, tokenCita, urlPaginaCita } from "@/lib/server/cita-publica";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Boton "Confirmarle la cita por WhatsApp" (Telegram, al aprobar una
 * solicitud): arma el mensaje con el saludo de la hora en que se toca y la
 * fecha vigente de la cita (por si se reprogramo) y redirige a WhatsApp.
 */
export async function GET(request: Request) {
  const citaId = citaDeToken(new URL(request.url).searchParams.get("t"));
  const admin = getSupabaseAdmin();
  const cita = citaId && admin ? await leerCitaPublica(admin, citaId) : null;
  const token = cita ? tokenCita(cita.id) : null;
  if (!cita || !token) {
    return new NextResponse("Enlace no válido o la cita ya no existe.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.redirect(enlaceConfirmacion(cita, urlPaginaCita(token)), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
