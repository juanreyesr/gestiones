import { NextResponse } from "next/server";
import { enlacePagoConsulta } from "@/lib/server/paypal";

export const dynamic = "force-dynamic";

/**
 * Enlace corto para compartir con pacientes: www.juanjreyes.org/pagar
 * redirige al enlace de pago de PayPal (PAYPAL_ENLACE_CONSULTA). Si cambia
 * el enlace en PayPal, lo compartido sigue funcionando.
 */
export function GET(request: Request) {
  const destino = enlacePagoConsulta() ?? new URL("/es/consulta", request.url).toString();
  return NextResponse.redirect(destino, 307);
}
