import { NextResponse } from "next/server";
import { enlaceMensajePaciente } from "@/lib/clinica/mensaje-paciente";
import { pacienteDeToken } from "@/lib/server/enlace-paciente";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Boton "Escribirle por WhatsApp" de Telegram: saludo segun la hora al tocarlo y redirige a WhatsApp. */
export async function GET(request: Request) {
  const pacienteId = pacienteDeToken(new URL(request.url).searchParams.get("t"));
  const admin = getSupabaseAdmin();
  const { data: paciente } =
    pacienteId && admin
      ? await admin.from("gestionesjj_pacientes").select("nombre,telefono,pais").eq("id", pacienteId).maybeSingle()
      : { data: null };
  if (!paciente) {
    return new NextResponse("Enlace no válido o el paciente ya no existe.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.redirect(enlaceMensajePaciente(paciente as { nombre: string; telefono: string | null; pais: string | null }), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
