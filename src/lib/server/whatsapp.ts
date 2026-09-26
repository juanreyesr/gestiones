import { createHmac } from "node:crypto";
import { comparaSeguro } from "./telegram";

/**
 * Cliente minimo de WhatsApp Business Platform (Cloud API):
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/
 *
 * Variables (solo servidor):
 *  - WHATSAPP_TOKEN            token de acceso (usuario del sistema de Meta Business)
 *  - WHATSAPP_PHONE_NUMBER_ID  id del numero conectado (no es el numero telefonico)
 *  - WHATSAPP_TEMPLATE_CITA    nombre de la plantilla aprobada del recordatorio
 *  - WHATSAPP_TEMPLATE_IDIOMA  idioma de la plantilla (por defecto "es")
 *  - WHATSAPP_VERIFY_TOKEN     texto libre para verificar el webhook
 *  - WHATSAPP_APP_SECRET       secreto de la app de Meta: valida la firma de cada webhook
 *  - WHATSAPP_API_URL          opcional: base distinta si un proveedor (BSP) da su propio endpoint
 *  - WHATSAPP_GRAPH_VERSION    opcional: version de la Graph API (por defecto v23.0)
 */

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_CITA,
  );
}

function urlMensajes() {
  const propia = (process.env.WHATSAPP_API_URL ?? "").replace(/\/+$/, "");
  if (propia) return `${propia}/messages`;
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  return `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

type RespuestaEnvio = { ok: true; id: string } | { ok: false; error: string };

/**
 * Envia una plantilla con parametros de cuerpo posicionales ({{1}}, {{2}}...)
 * y, opcionalmente, un payload por cada boton de respuesta rapida (en el
 * orden en que estan definidos en la plantilla).
 */
export async function enviarPlantilla(params: {
  telefono: string;
  plantilla: string;
  idioma?: string;
  cuerpo: string[];
  payloadsBotones?: string[];
}): Promise<RespuestaEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, error: "Falta WHATSAPP_TOKEN." };

  const components: Record<string, unknown>[] = [
    { type: "body", parameters: params.cuerpo.map((text) => ({ type: "text", text })) },
    ...(params.payloadsBotones ?? []).map((payload, index) => ({
      type: "button",
      sub_type: "quick_reply",
      index: String(index),
      parameters: [{ type: "payload", payload }],
    })),
  ];

  try {
    const response = await fetch(urlMensajes(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.telefono,
        type: "template",
        template: {
          name: params.plantilla,
          language: { code: params.idioma || process.env.WHATSAPP_TEMPLATE_IDIOMA || "es" },
          components,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string; code?: number };
    } | null;
    const id = json?.messages?.[0]?.id;
    if (!response.ok || !id) {
      const detalle = json?.error?.message ?? `WhatsApp respondió ${response.status}.`;
      return { ok: false, error: json?.error?.code ? `${detalle} (código ${json.error.code})` : detalle };
    }
    return { ok: true, id };
  } catch {
    return { ok: false, error: "No se pudo conectar con WhatsApp." };
  }
}

/**
 * Valida la cabecera X-Hub-Signature-256 ("sha256=<hmac>") que Meta agrega a
 * cada webhook, calculada sobre el cuerpo crudo con el secreto de la app.
 */
export function firmaValida(cuerpoCrudo: string, cabecera: string | null) {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !cabecera) return false;
  const esperada = `sha256=${createHmac("sha256", secreto).update(cuerpoCrudo, "utf8").digest("hex")}`;
  return comparaSeguro(cabecera, esperada);
}

// ============================================================
// Webhook: tipos minimos de lo que se usa
// ============================================================

export type WebhookWhatsApp = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          button?: { payload?: string; text?: string };
          interactive?: { button_reply?: { id?: string; title?: string } };
        }>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          errors?: Array<{ code?: number; title?: string; message?: string }>;
        }>;
      };
    }>;
  }>;
};

/**
 * Mensaje de texto libre. Solo se puede dentro de las 24 h siguientes a que
 * la persona escribio (ventana de atencion al cliente); ahi no tiene costo.
 */
export async function enviarTexto(telefono: string, texto: string): Promise<RespuestaEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, error: "Falta WHATSAPP_TOKEN." };
  try {
    const response = await fetch(urlMensajes(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefono,
        type: "text",
        text: { body: texto },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as { messages?: Array<{ id: string }> } | null;
    const id = json?.messages?.[0]?.id;
    return response.ok && id ? { ok: true, id } : { ok: false, error: `WhatsApp respondió ${response.status}.` };
  } catch {
    return { ok: false, error: "No se pudo conectar con WhatsApp." };
  }
}
