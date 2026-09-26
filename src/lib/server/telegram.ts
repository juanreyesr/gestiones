import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NOTIFICACIONES, type Preferencias, type TipoNotificacion } from "@/lib/telegram-tipos";
import { getSupabaseAdmin } from "./supabase-admin";

export { NOTIFICACIONES, type Preferencias, type TipoNotificacion };

/**
 * Cliente minimo de la Bot API de Telegram (https://core.telegram.org/bots/api)
 * y utilidades para avisarle al owner. Todo corre en el servidor: el token
 * del bot y el secreto del webhook nunca llegan al navegador.
 */

const ZONA = "America/Guatemala";
const MAX_TEXTO = 4096; // limite de la Bot API por mensaje

export type TelegramConfig = {
  ownerId: string;
  chatId: number | null;
  chatNombre: string | null;
  vinculadoEn: string | null;
  codigoHash: string | null;
  codigoExpira: string | null;
  preferencias: Preferencias;
  ultimoResumen: string | null;
};

export type BotonInline = { text: string; callback_data?: string; url?: string };

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);
}

// ============================================================
// Bot API
// ============================================================

export async function telegramApi<T = unknown>(
  metodo: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN." };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok: boolean; result?: T; description?: string }
      | null;
    if (!json?.ok) return { ok: false, error: json?.description ?? `Telegram respondió ${response.status}.` };
    return { ok: true, result: json.result as T };
  } catch {
    return { ok: false, error: "No se pudo conectar con Telegram." };
  }
}

export async function enviarMensaje(
  chatId: number,
  texto: string,
  opciones?: { botones?: BotonInline[][]; responderA?: number },
) {
  return telegramApi<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: recortar(texto),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(opciones?.botones ? { reply_markup: { inline_keyboard: opciones.botones } } : {}),
    ...(opciones?.responderA ? { reply_parameters: { message_id: opciones.responderA, allow_sending_without_reply: true } } : {}),
  });
}

export async function editarMensaje(chatId: number, messageId: number, texto: string, botones?: BotonInline[][]) {
  return telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: recortar(texto),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: botones ?? [] },
  });
}

let usuarioBotCache: string | null = null;

export async function obtenerUsuarioBot(): Promise<string | null> {
  if (usuarioBotCache) return usuarioBotCache;
  const res = await telegramApi<{ username?: string }>("getMe", {});
  if (res.ok && res.result.username) usuarioBotCache = res.result.username;
  return usuarioBotCache;
}

export const COMANDOS_BOT = [
  { command: "hoy", description: "Resumen del día" },
  { command: "citas", description: "Citas de los próximos 7 días" },
  { command: "solicitudes", description: "Solicitudes de cita por aprobar" },
  { command: "pendientes", description: "Pendientes vencidos y próximos" },
  { command: "nuevo", description: "Crear un pendiente: /nuevo texto" },
  { command: "mensajes", description: "Mensajes de estudiantes sin leer" },
  { command: "ayuda", description: "Qué puedo hacer" },
];

// ============================================================
// Configuracion guardada
// ============================================================

type RawConfig = {
  owner_id: string;
  chat_id: number | string | null;
  chat_nombre: string | null;
  vinculado_en: string | null;
  codigo_hash: string | null;
  codigo_expira: string | null;
  preferencias: Partial<Preferencias> | null;
  ultimo_resumen: string | null;
};

export function normalizarPreferencias(valor: Partial<Preferencias> | null | undefined): Preferencias {
  const resultado = {} as Preferencias;
  for (const item of NOTIFICACIONES) {
    const guardado = valor?.[item.id];
    resultado[item.id] = typeof guardado === "boolean" ? guardado : item.porDefecto;
  }
  return resultado;
}

export async function leerConfig(): Promise<TelegramConfig | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("gestionesjj_telegram_config")
    .select("owner_id,chat_id,chat_nombre,vinculado_en,codigo_hash,codigo_expira,preferencias,ultimo_resumen")
    .eq("id", 1)
    .maybeSingle();
  const row = data as RawConfig | null;
  if (!row) return null;
  return {
    ownerId: row.owner_id,
    // bigint llega como string o number segun el tamano; los chat_id privados caben en un number.
    chatId: row.chat_id === null ? null : Number(row.chat_id),
    chatNombre: row.chat_nombre,
    vinculadoEn: row.vinculado_en,
    codigoHash: row.codigo_hash,
    codigoExpira: row.codigo_expira,
    preferencias: normalizarPreferencias(row.preferencias),
    ultimoResumen: row.ultimo_resumen,
  };
}

// ============================================================
// Codigos de vinculacion y secretos
// ============================================================

export function generarCodigo() {
  // 18 bytes -> 24 caracteres base64url, dentro de lo que admite /start (1-64, A-Za-z0-9_-).
  return randomBytes(18).toString("base64url");
}

export function hashCodigo(codigo: string) {
  return createHash("sha256").update(codigo).digest("hex");
}

export function comparaSeguro(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ============================================================
// Notificaciones al owner
// ============================================================

/**
 * Avisa al owner por Telegram si el bot esta configurado, el chat esta
 * vinculado y ese tipo de aviso esta activo. Nunca lanza: una falla de
 * Telegram jamas debe romper la accion que la origino (por eso las rutas la
 * llaman dentro de after(), despues de responder).
 */
export async function notificar(
  tipo: TipoNotificacion,
  texto: string,
  opciones?: { botones?: BotonInline[][]; hilo?: { tipo: "mensaje_estudiante"; refId: string } },
) {
  try {
    if (!isTelegramConfigured()) return;
    const config = await leerConfig();
    if (!config?.chatId || !config.preferencias[tipo]) return;

    const res = await enviarMensaje(config.chatId, texto, { botones: opciones?.botones });
    if (res.ok && opciones?.hilo) {
      await getSupabaseAdmin()
        ?.from("gestionesjj_telegram_hilos")
        .insert({
          chat_id: config.chatId,
          message_id: res.result.message_id,
          tipo: opciones.hilo.tipo,
          ref_id: opciones.hilo.refId,
        });
    }
  } catch {
    // Silencioso a proposito: ver comentario de arriba.
  }
}

// ============================================================
// Formato
// ============================================================

/** Escapa texto de usuario para parse_mode HTML. */
export function esc(valor: string | null | undefined) {
  return (valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function recortar(texto: string, max = MAX_TEXTO) {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`;
}

export function fechaHora(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function hora(iso: string) {
  return new Intl.DateTimeFormat("es-GT", { timeZone: ZONA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** Fecha de hoy (o desplazada N dias) en Guatemala, como YYYY-MM-DD. */
export function fechaLocal(desplazamientoDias = 0) {
  const fecha = new Date(Date.now() + desplazamientoDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(fecha);
}

/** Inicio del dia local YYYY-MM-DD (Guatemala es UTC-6 todo el ano, sin horario de verano). */
export function inicioDiaIso(fechaYmd: string) {
  return new Date(`${fechaYmd}T00:00:00-06:00`).toISOString();
}

export function appUrl(ruta = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${ruta}` : null;
}
