import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import {
  COMANDOS_BOT,
  type Preferencias,
  enviarMensaje,
  generarCodigo,
  hashCodigo,
  isTelegramConfigured,
  leerConfig,
  normalizarPreferencias,
  obtenerUsuarioBot,
  telegramApi,
} from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIGENCIA_CODIGO_MS = 15 * 60_000;

type Accion = "estado" | "vincular" | "desvincular" | "prueba" | "preferencias";

/**
 * Panel de Telegram del owner: estado de la conexion, vincular el chat
 * (registra el webhook y genera un enlace de un solo uso), desvincular,
 * mensaje de prueba y preferencias de avisos.
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as { accion?: Accion; preferencias?: Partial<Preferencias> } | null;
  const accion = body?.accion ?? "estado";

  const faltan = [
    !process.env.TELEGRAM_BOT_TOKEN && "TELEGRAM_BOT_TOKEN",
    !process.env.TELEGRAM_WEBHOOK_SECRET && "TELEGRAM_WEBHOOK_SECRET",
    !process.env.SUPABASE_SECRET_KEY && "SUPABASE_SECRET_KEY",
  ].filter(Boolean) as string[];

  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) {
    return NextResponse.json({ configurado: false, faltan });
  }

  const config = await leerConfig();

  if (accion === "vincular") {
    const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const webhook = await telegramApi("setWebhook", {
      url: `${base}/api/telegram/webhook`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    if (!webhook.ok) {
      return NextResponse.json({ error: `Telegram rechazó el webhook: ${webhook.error}` }, { status: 502 });
    }
    await telegramApi("setMyCommands", { commands: COMANDOS_BOT });

    const usuario = await obtenerUsuarioBot();
    if (!usuario) return NextResponse.json({ error: "No se pudo leer el bot. Revisa TELEGRAM_BOT_TOKEN." }, { status: 502 });

    const codigo = generarCodigo();
    const { error } = await admin.from("gestionesjj_telegram_config").upsert({
      id: 1,
      owner_id: auth.ownerId,
      codigo_hash: hashCodigo(codigo),
      codigo_expira: new Date(Date.now() + VIGENCIA_CODIGO_MS).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: "No se pudo guardar la configuración." }, { status: 500 });

    return NextResponse.json({ enlace: `https://t.me/${usuario}?start=${codigo}`, usuario });
  }

  if (accion === "desvincular") {
    if (config?.chatId) {
      await enviarMensaje(config.chatId, "🔌 Este chat se desvinculó de GestionesJJ. Ya no recibirás avisos aquí.");
    }
    await admin
      .from("gestionesjj_telegram_config")
      .update({ chat_id: null, chat_nombre: null, vinculado_en: null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    return NextResponse.json({ ok: true });
  }

  if (accion === "prueba") {
    if (!config?.chatId) return NextResponse.json({ error: "Primero vincula tu Telegram." }, { status: 422 });
    const res = await enviarMensaje(config.chatId, "🔔 <b>Mensaje de prueba</b>\nLos avisos de GestionesJJ están llegando bien.");
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (accion === "preferencias") {
    if (!config) return NextResponse.json({ error: "Primero vincula tu Telegram." }, { status: 422 });
    const preferencias = normalizarPreferencias({ ...config.preferencias, ...(body?.preferencias ?? {}) });
    const { error } = await admin
      .from("gestionesjj_telegram_config")
      .update({ preferencias, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return NextResponse.json({ error: "No se pudieron guardar las preferencias." }, { status: 500 });
    return NextResponse.json({ preferencias });
  }

  // estado
  const [usuario, info] = await Promise.all([
    obtenerUsuarioBot(),
    telegramApi<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo", {}),
  ]);

  return NextResponse.json({
    configurado: true,
    faltan,
    usuario,
    vinculado: Boolean(config?.chatId),
    chatNombre: config?.chatNombre ?? null,
    vinculadoEn: config?.vinculadoEn ?? null,
    preferencias: normalizarPreferencias(config?.preferencias),
    webhook: info.ok
      ? { activo: Boolean(info.result.url), ultimoError: info.result.last_error_message ?? null }
      : { activo: false, ultimoError: info.error },
  });
}
