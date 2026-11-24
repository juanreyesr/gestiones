import { after, NextResponse } from "next/server";
import { avisoDeEvento, verificarWebhook } from "@/lib/server/paypal";
import { aplicarPagoPayPal } from "@/lib/server/pagos-citas";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { avisarPago } from "@/lib/server/telegram-avisos";
import { confirmarPago, marcarReembolso, PREFIJO_CUSTOM_ID } from "@/lib/server/tests/compras";
import { confirmarPagoPorWhatsApp } from "@/lib/server/whatsapp-pagos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de PayPal (suscrito en developer.paypal.com a PAYMENT.CAPTURE.COMPLETED
 * y PAYMENT.CAPTURE.REFUNDED). Solo se avisa por Telegram si PayPal confirma
 * la firma; se responde 200 y el aviso se manda despues. El pago tambien se
 * aplica a la cita del paciente (ver lib/server/pagos-citas.ts) y, si hay
 * plantilla de pago, se le confirma por WhatsApp (lib/server/whatsapp-pagos.ts).
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
    const admin = getSupabaseAdmin();
    // Pagos de la plataforma de tests (/tests): se confirman ahí y nunca se aplican a una cita.
    const recurso = evento.resource ?? {};
    const customId = typeof recurso.custom_id === "string" ? recurso.custom_id : "";
    if (evento.event_type === "PAYMENT.CAPTURE.COMPLETED" && customId.startsWith(PREFIJO_CUSTOM_ID)) {
      const monto = recurso.amount as { value?: string; currency_code?: string } | undefined;
      const valor = monto?.value ? Number(monto.value) : NaN;
      if (admin) {
        await confirmarPago(admin, customId.slice(PREFIJO_CUSTOM_ID.length), {
          captureId: typeof recurso.id === "string" ? recurso.id : null,
          valor: Number.isFinite(valor) ? valor : null,
          moneda: monto?.currency_code ?? null,
        }).catch(() => null);
      }
      return;
    }
    const aviso = await avisoDeEvento(evento, token);
    if (!aviso) return;
    if (aviso.tipo === "reembolsado" && admin && aviso.capturaOriginalId) {
      const deTests = await marcarReembolso(admin, aviso.capturaOriginalId).catch(() => false);
      if (deTests) return;
    }
    const resultado = admin ? await aplicarPagoPayPal(admin, aviso).catch(() => null) : null;
    const whatsapp =
      admin && resultado?.aplicado
        ? await confirmarPagoPorWhatsApp(admin, aviso, resultado.aplicado).catch(() => null)
        : null;
    await avisarPago(aviso, resultado, whatsapp);
  });
  return NextResponse.json({ ok: true });
}
