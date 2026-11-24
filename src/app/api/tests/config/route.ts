import { NextResponse } from "next/server";
import { isPayPalOrdenesConfigurado } from "@/lib/server/tests/compras";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Datos públicos para el botón de pago (el client-id de PayPal es público por diseño). */
export async function GET() {
  return NextResponse.json(
    { paypalClientId: isPayPalOrdenesConfigurado() ? process.env.PAYPAL_CLIENT_ID : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
