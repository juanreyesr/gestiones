import { after, NextResponse } from "next/server";
import { avisoDeEvento, verificarWebhook } from "@/lib/server/paypal";
import { aplicarPagoPayPal } from "@/lib/server/pagos-citas";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { avisarPago } from "@/lib/server/telegram-avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de PayPal (suscrito en developer.paypal.com a PAYMENT.CAPTURE.COMPLETED
 * y PAYMENT.CAPTURE.REFUNDED). Solo se avisa por Telegram si PayPal confirma
 * la firma; se responde 200 y el aviso se manda despues. El pago tambien se
 * aplica a la cita del paciente (ver lib/server/pagos-citas.ts).
 */
export async function POST(request: Request) {
  let evento: { id: string; event_type: string; resource?: Record<string, unknown> };
  try {
    evento = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const token = await verificarWebhook(request.headers, evento);
  if (!token) {
    return NextResponse.json({ error: "Firma no válida." }, { status: 401 });
  }

  after(async () => {
    const aviso = await avisoDeEvento(evento, token);
    if (!aviso) return;
    const admin = getSupabaseAdmin();
    const resultado = admin ? await aplicarPagoPayPal(admin, aviso).catch(() => null) : null;
    await avisarPago(aviso, resultado);
  });
  return NextResponse.json({ ok: true });
}
