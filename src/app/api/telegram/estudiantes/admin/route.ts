import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { botApi, leerConfigAvisos } from "@/lib/server/estudiantes-avisos";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMANDOS = [
  { command: "start", description: "Activar avisos (desde el Aula virtual)" },
  { command: "desactivar", description: "Dejar de recibir avisos" },
];

/**
 * Panel del owner: conectar el bot de estudiantes (token de @BotFather),
 * ver cuantos estudiantes tienen avisos y desconectarlo. El token se guarda
 * solo en el servidor (tabla sin acceso desde el navegador).
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { accion?: string; token?: string } | null;
  const accion = body?.accion ?? "estado";
  const config = await leerConfigAvisos(admin);

  if (accion === "conectar") {
    const token = (body?.token ?? "").trim();
    if (!/^\d{5,}:[\w-]{30,}$/.test(token)) {
      return NextResponse.json({ error: "Ese no parece un token de @BotFather (número:letras)." }, { status: 422 });
    }
    const yo = await botApi<{ username: string }>(token, "getMe", {});
    if (!yo.ok) return NextResponse.json({ error: `Telegram rechazó el token: ${yo.error}` }, { status: 422 });
    if (process.env.TELEGRAM_BOT_TOKEN && token === process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: "Ese es tu bot privado de GestionesJJ; crea uno nuevo para estudiantes." }, { status: 422 });
    }
    const secreto = randomBytes(24).toString("base64url");
    const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const webhook = await botApi(token, "setWebhook", {
      url: `${base}/api/telegram/estudiantes/webhook`,
      secret_token: secreto,
      allowed_updates: ["message", "my_chat_member"],
      drop_pending_updates: true,
    });
    if (!webhook.ok) return NextResponse.json({ error: `Telegram rechazó el webhook: ${webhook.error}` }, { status: 502 });
    await botApi(token, "setMyCommands", { commands: COMANDOS });
    await botApi(token, "setMyDescription", {
      description: "Avisos del Aula virtual de Juan J. Reyes: mensajes, clases nuevas, tareas y fechas de entrega de tu curso.",
    });
    const { error } = await admin.from("gestionesjj_estudiantes_avisos_config").upsert({
      id: true,
      bot_token: token,
      bot_username: yo.result.username,
      webhook_secret: secreto,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: "No se pudo guardar la configuración." }, { status: 500 });
    return NextResponse.json({ ok: true, username: yo.result.username });
  }

  if (accion === "desconectar") {
    if (config?.bot_token) await botApi(config.bot_token, "deleteWebhook", {});
    await admin
      .from("gestionesjj_estudiantes_avisos_config")
      .update({ bot_token: null, bot_username: null, webhook_secret: null, updated_at: new Date().toISOString() })
      .eq("id", true);
    await admin.from("gestionesjj_estudiante_telegram").delete().not("estudiante_id", "is", null);
    return NextResponse.json({ ok: true });
  }

  const [{ count: telegram }, { data: push }] = await Promise.all([
    admin.from("gestionesjj_estudiante_telegram").select("estudiante_id", { count: "exact", head: true }).not("chat_id", "is", null),
    admin.from("gestionesjj_estudiante_push").select("estudiante_id"),
  ]);
  return NextResponse.json({
    conectado: Boolean(config?.bot_token),
    username: config?.bot_username ?? null,
    telegram: telegram ?? 0,
    push: new Set((push ?? []).map((p) => p.estudiante_id as string)).size,
  });
}
