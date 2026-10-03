import { NextResponse } from "next/server";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { horaGuatemala, mensajeFelicitacion } from "@/lib/control-revision-mensajes";
import { leerFelicitacion } from "@/lib/server/enlace-felicitacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Boton "Enviar felicitación por WhatsApp" del aviso de Telegram: arma el
 * mensaje con el saludo de la hora en que se toca (Buenos días / tardes /
 * noches) y redirige a WhatsApp. Solo acepta enlaces firmados por el servidor
 * (src/lib/server/enlace-felicitacion.ts).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const datos = leerFelicitacion(url.searchParams.get("d"), url.searchParams.get("s"));
  if (!datos) {
    return new NextResponse("Enlace no válido o vencido. Vuelve a enviar los avisos desde Control de revisión.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const mensaje = mensajeFelicitacion({ trato: datos.trato, tipo: datos.tipo, cursos: datos.cursos, hora: horaGuatemala() });
  return NextResponse.redirect(enlaceWhatsApp(datos.telefono, mensaje), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
