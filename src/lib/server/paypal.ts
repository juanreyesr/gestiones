/**
 * Pagos de consultas con PayPal (enlace de pago "sin codigo" de PayPal).
 *
 *  - PAYPAL_ENLACE_CONSULTA (opcional): el enlace de pago creado en PayPal
 *    (https://www.paypal.com/ncp/payment/...). Sin la variable se usa el de la
 *    consulta (boton H2EFVWPKMF49W). /pagar redirige ahi, asi lo que se
 *    comparte es siempre www.juanjreyes.org/pagar.
 *  - PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET y PAYPAL_WEBHOOK_ID: app REST de
 *    developer.paypal.com y el webhook suscrito a /api/paypal/webhook. Con
 *    ellos se verifica que cada aviso venga de PayPal antes de mandarlo a
 *    Telegram (la pagina de "gracias" no avisa: cualquiera podria abrirla).
 *  - PAYPAL_ENV: "sandbox" para pruebas; por defecto "live".
 */

type EventoPayPal = {
  id: string;
  event_type: string;
  resource?: Record<string, unknown>;
};

export type AvisoPago = {
  tipo: "completado" | "reembolsado";
  monto: string | null;
  neto: string | null;
  captureId: string | null;
  pagador: string | null;
  correo: string | null;
  concepto: string | null;
};

/** Enlace de pago de la consulta creado en PayPal (mismo ID que su boton). */
const ENLACE_CONSULTA_POR_DEFECTO = "https://www.paypal.com/ncp/payment/H2EFVWPKMF49W";

export function enlacePagoConsulta() {
  const url = (process.env.PAYPAL_ENLACE_CONSULTA ?? "").trim() || ENLACE_CONSULTA_POR_DEFECTO;
  return /^https:\/\/(www\.)?paypal\.com\//.test(url) ? url : null;
}

export function isPayPalWebhookConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_WEBHOOK_ID);
}

function apiBase() {
  return process.env.PAYPAL_ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function tokenAcceso(): Promise<string | null> {
  const credenciales = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credenciales}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

/**
 * Verifica la firma del webhook con la API de PayPal
 * (POST /v1/notifications/verify-webhook-signature). Devuelve el token de
 * acceso si es valido, para reutilizarlo al consultar la orden.
 */
export async function verificarWebhook(headers: Headers, evento: unknown): Promise<string | null> {
  if (!isPayPalWebhookConfigured()) return null;
  const token = await tokenAcceso();
  if (!token) return null;
  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: evento,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS" ? token : null;
}

function montoTexto(valor: unknown) {
  const monto = valor as { value?: string; currency_code?: string } | undefined;
  return monto?.value ? `${monto.value} ${monto.currency_code ?? ""}`.trim() : null;
}

/** Nombre, correo y concepto salen de la orden (la captura no los trae). */
async function datosDeOrden(token: string, orderId: string) {
  try {
    const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const orden = (await res.json()) as {
      payer?: { name?: { given_name?: string; surname?: string }; email_address?: string };
      purchase_units?: { description?: string; items?: { name?: string; quantity?: string }[] }[];
    };
    const nombre = [orden.payer?.name?.given_name, orden.payer?.name?.surname].filter(Boolean).join(" ") || null;
    const unidad = orden.purchase_units?.[0];
    const concepto =
      unidad?.items?.map((item) => (item.quantity && item.quantity !== "1" ? `${item.name} ×${item.quantity}` : item.name)).join(", ") ||
      unidad?.description ||
      null;
    return { nombre, correo: orden.payer?.email_address ?? null, concepto };
  } catch {
    return null;
  }
}

/** Convierte el evento en el aviso para Telegram; null si no interesa. */
export async function avisoDeEvento(evento: EventoPayPal, token: string): Promise<AvisoPago | null> {
  const recurso = evento.resource ?? {};
  const tipo =
    evento.event_type === "PAYMENT.CAPTURE.COMPLETED"
      ? "completado"
      : evento.event_type === "PAYMENT.CAPTURE.REFUNDED"
        ? "reembolsado"
        : null;
  if (!tipo) return null;

  const orderId = (recurso.supplementary_data as { related_ids?: { order_id?: string } } | undefined)?.related_ids?.order_id;
  const orden = orderId ? await datosDeOrden(token, orderId) : null;
  const desglose = recurso.seller_receivable_breakdown as { net_amount?: unknown } | undefined;

  return {
    tipo,
    monto: montoTexto(recurso.amount),
    neto: tipo === "completado" ? montoTexto(desglose?.net_amount) : null,
    captureId: typeof recurso.id === "string" ? recurso.id : null,
    pagador: orden?.nombre ?? null,
    correo: orden?.correo ?? null,
    concepto: orden?.concepto ?? null,
  };
}
