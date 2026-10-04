import { NextResponse } from "next/server";
import { archivoIcs, citaDeToken, leerCitaPublica } from "@/lib/server/cita-publica";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Archivo de calendario (.ics) de la cita, con recordatorio un dia antes. */
export async function GET(request: Request) {
  const citaId = citaDeToken(new URL(request.url).searchParams.get("t"));
  const admin = getSupabaseAdmin();
  const cita = citaId && admin ? await leerCitaPublica(admin, citaId) : null;
  if (!cita || cita.estado === "cancelada") {
    return new NextResponse("Enlace no válido o la cita ya no está vigente.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse(archivoIcs(cita), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita-juan-j-reyes.ics"',
      "Cache-Control": "no-store",
    },
  });
}
