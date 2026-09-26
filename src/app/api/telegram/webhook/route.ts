import { after, NextResponse } from "next/server";
import { comparaSeguro, isTelegramConfigured } from "@/lib/server/telegram";
import { procesarUpdate, type TelegramUpdate } from "@/lib/server/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook del bot. Telegram manda aqui cada mensaje y cada toque de boton,
 * con el header X-Telegram-Bot-Api-Secret-Token que se fijo al registrar el
 * webhook: si no coincide con TELEGRAM_WEBHOOK_SECRET, se ignora la peticion.
 * Se responde 200 de inmediato y se procesa despues (after) para que
 * Telegram no reintente el mismo update por lentitud.
 */
export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const recibido = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!comparaSeguro(recibido, process.env.TELEGRAM_WEBHOOK_SECRET!)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (update && typeof update.update_id === "number") {
    after(() => procesarUpdate(update).catch(() => undefined));
  }

  return NextResponse.json({ ok: true });
}
