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
 *  - WHATSAPP_PROVEEDOR        "meta" (por defecto), "360dialog" o "ycloud"
 *  - WHATSAPP_NUMERO           solo YCloud: numero de WhatsApp Business con codigo (+502...)
 *  - WHATSAPP_WEBHOOK_SECRET   solo YCloud: secreto del endpoint de webhook (firma YCloud-Signature)
 *  - WHATSAPP_API_URL          opcional: base distinta si un proveedor (BSP) da su propio endpoint
 *  - WHATSAPP_GRAPH_VERSION    opcional: version de la Graph API (por defecto v23.0)
 *
 * Proveedores (el cuerpo de la plantilla es el mismo en los tres):
 *  - 360dialog (https://docs.360dialog.com): base waba-v2.360dialog.io, cabecera
 *    D360-API-KEY. WHATSAPP_TOKEN es esa llave.
 *  - YCloud (https://docs.ycloud.com): POST /v2/whatsapp/messages/sendDirectly,
 *    cabecera X-API-Key, numeros en formato +E.164 y "from" con el numero propio.
 *    Sus webhooks tienen otro formato y se traducen en normalizarWebhookYCloud.
 */

export type Proveedor = "meta" | "360dialog" | "ycloud";

export function proveedorWhatsApp(): Proveedor {
  const valor = (process.env.WHATSAPP_PROVEEDOR ?? "").trim().toLowerCase();
  return valor === "360dialog" || valor === "ycloud" ? valor : "meta";
}

export function isWhatsAppConfigured() {
  const proveedor = proveedorWhatsApp();
  const destino =
    proveedor === "ycloud"
      ? process.env.WHATSAPP_NUMERO
      : proveedor === "360dialog" || process.env.WHATSAPP_API_URL || process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_TEMPLATE_CITA && destino);
}

const e164 = (numero: string) => `+${numero.replace(/\D/g, "")}`;

type RespuestaEnvio = { ok: true; id: string } | { ok: false; error: string };

/**
 * Envia un mensaje con el cuerpo de la Cloud API de Meta y lo adapta al
 * proveedor configurado. Devuelve el id del mensaje (wamid si esta disponible).
 */
async function postMensaje(mensaje: { to: string; type: string } & Record<string, unknown>): Promise<RespuestaEnvio> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, error: "Falta WHATSAPP_TOKEN." };
  const proveedor = proveedorWhatsApp();
  const propia = (process.env.WHATSAPP_API_URL ?? "").replace(/\/+$/, "");

  let url: string;
  let headers: Record<string, string>;
  let cuerpo: Record<string, unknown>;
  if (proveedor === "ycloud") {
    url = `${propia || "https://api.ycloud.com/v2"}/whatsapp/messages/sendDirectly`;
    headers = { "Content-Type": "application/json", "X-API-Key": token };
    cuerpo = { ...mensaje, from: e164(process.env.WHATSAPP_NUMERO ?? ""), to: e164(mensaje.to) };
  } else {
    const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
    url = propia
      ? `${propia}/messages`
      : proveedor === "360dialog"
        ? "https://waba-v2.360dialog.io/messages"
        : `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    headers =
      proveedor === "360dialog"
        ? { "Content-Type": "application/json", "D360-API-KEY": token }
        : { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    cuerpo = { messaging_product: "whatsapp", recipient_type: "individual", ...mensaje };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as {
      messages?: Array<{ id: string }>;
      id?: string;
      wamid?: string;
      status?: string;
      error?: { message?: string; code?: number | string };
      message?: string;
    } | null;
    const id = proveedor === "ycloud" ? (json?.wamid ?? json?.id) : json?.messages?.[0]?.id;
    if (!response.ok || !id || json?.status === "failed") {
      const detalle = json?.error?.message ?? json?.message ?? `WhatsApp respondió ${response.status}.`;
      return { ok: false, error: json?.error?.code ? `${detalle} (código ${json.error.code})` : detalle };
    }
    return { ok: true, id };
  } catch {
    return { ok: false, error: "No se pudo conectar con WhatsApp." };
  }
}

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
  const components: Record<string, unknown>[] = [
    { type: "body", parameters: params.cuerpo.map((text) => ({ type: "text", text })) },
    ...(params.payloadsBotones ?? []).map((payload, index) => ({
      type: "button",
      sub_type: "quick_reply",
      index: String(index),
      parameters: [{ type: "payload", payload }],
    })),
  ];
  return postMensaje({
    to: params.telefono,
    type: "template",
    template: {
      name: params.plantilla,
      language: { code: params.idioma || process.env.WHATSAPP_TEMPLATE_IDIOMA || "es" },
      components,
    },
  });
}

/**
 * Mensaje de texto libre. Solo se puede dentro de las 24 h siguientes a que
 * la persona escribio (ventana de atencion al cliente); ahi no tiene costo.
 */
export async function enviarTexto(telefono: string, texto: string): Promise<RespuestaEnvio> {
  return postMensaje({ to: telefono, type: "text", text: { body: texto } });
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
 * Valida la cabecera YCloud-Signature ("t=<unix>,s=<hmac>"): HMAC-SHA256 de
 * "<t>.<cuerpo crudo>" con el secreto del endpoint. Rechaza firmas de mas de
 * 5 minutos para evitar reenvios.
 */
export function firmaYCloudValida(cuerpoCrudo: string, cabecera: string | null, ahora = Date.now()) {
  const secreto = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secreto || !cabecera) return false;
  const partes = Object.fromEntries(
    cabecera.split(",").map((parte) => {
      const [clave, ...resto] = parte.trim().split("=");
      return [clave, resto.join("=")];
    }),
  );
  const t = partes.t;
  const firma = partes.s;
  if (!t || !firma || Math.abs(ahora / 1000 - Number(t)) > 300) return false;
  const hmac = createHmac("sha256", secreto).update(`${t}.${cuerpoCrudo}`, "utf8");
  const digest = hmac.digest();
  return comparaSeguro(firma, digest.toString("hex")) || comparaSeguro(firma, digest.toString("base64"));
}

type EventoYCloud = {
  type?: string;
  whatsappInboundMessage?: {
    id?: string;
    wamid?: string;
    from?: string;
    type?: string;
    button?: { payload?: string; text?: string };
    interactive?: { button_reply?: { id?: string; title?: string } };
  };
  whatsappMessage?: {
    id?: string;
    wamid?: string;
    status?: string;
    errorCode?: string | number;
    errorMessage?: string;
  };
};

/** Traduce un evento de YCloud al formato de webhook de la Cloud API que ya se procesa. */
export function normalizarWebhookYCloud(evento: EventoYCloud): WebhookWhatsApp {
  const value: NonNullable<NonNullable<NonNullable<WebhookWhatsApp["entry"]>[number]["changes"]>[number]["value"]> = {};
  const entrante = evento.whatsappInboundMessage;
  if (evento.type === "whatsapp.inbound_message.received" && entrante?.from) {
    value.messages = [
      {
        id: entrante.wamid ?? entrante.id ?? "",
        from: entrante.from.replace(/\D/g, ""),
        type: entrante.type ?? "",
        button: entrante.button,
        interactive: entrante.interactive,
      },
    ];
  }
  const saliente = evento.whatsappMessage;
  const estado = saliente?.status;
  if (
    evento.type === "whatsapp.message.updated" &&
    saliente &&
    (estado === "sent" || estado === "delivered" || estado === "read" || estado === "failed")
  ) {
    // Se guarda el wamid si YCloud lo devolvio al enviar, si no su id: se prueban ambos.
    const errores =
      estado === "failed" ? [{ code: Number(saliente.errorCode) || undefined, message: saliente.errorMessage }] : undefined;
    value.statuses = [saliente.wamid, saliente.id]
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id, status: estado, errors: errores }));
  }
  return { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value }] }] };
}
