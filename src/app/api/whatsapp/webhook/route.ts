import { after, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro } from "@/lib/server/telegram";
import {
  firmaValida,
  firmaYCloudValida,
  normalizarWebhookYCloud,
  proveedorWhatsApp,
  type WebhookWhatsApp,
} from "@/lib/server/whatsapp";
import { procesarWebhookWhatsApp } from "@/lib/server/whatsapp-citas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verificacion del webhook: Meta llama con hub.mode=subscribe,
 * hub.verify_token y hub.challenge, y espera recibir el challenge tal cual.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  const token = url.searchParams.get("hub.verify_token") ?? "";
  if (url.searchParams.get("hub.mode") === "subscribe" && esperado && comparaSeguro(token, esperado)) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "No autorizado." }, { status: 403 });
}

/**
 * Eventos de WhatsApp (estados de entrega y respuestas a los botones).
 *  - Meta / 360dialog: con WHATSAPP_APP_SECRET se valida la firma de Meta.
 *  - YCloud: con WHATSAPP_WEBHOOK_SECRET se valida YCloud-Signature y el
 *    evento se traduce al formato de la Cloud API.
 * Sin secreto configurado se acepta en su lugar ?token=<WHATSAPP_VERIFY_TOKEN>.
 * Se responde 200 de inmediato y se procesa despues, como pide Meta.
 */
export async function POST(request: Request) {
  const cuerpoCrudo = await request.text();
  const esYCloud = proveedorWhatsApp() === "ycloud";
  const tokenUrl = new URL(request.url).searchParams.get("token") ?? "";
  const verify = process.env.WHATSAPP_VERIFY_TOKEN;

  const autorizado = esYCloud
    ? process.env.WHATSAPP_WEBHOOK_SECRET
      ? firmaYCloudValida(cuerpoCrudo, request.headers.get("ycloud-signature"))
      : Boolean(verify && tokenUrl && comparaSeguro(tokenUrl, verify))
    : process.env.WHATSAPP_APP_SECRET
      ? firmaValida(cuerpoCrudo, request.headers.get("x-hub-signature-256"))
      : Boolean(verify && tokenUrl && comparaSeguro(tokenUrl, verify));
  if (!autorizado) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let cuerpo: WebhookWhatsApp;
  try {
    const json = JSON.parse(cuerpoCrudo);
    cuerpo = esYCloud ? normalizarWebhookYCloud(json) : (json as WebhookWhatsApp);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    after(async () => {
      try {
        await procesarWebhookWhatsApp(admin, cuerpo);
      } catch {
        // Un evento que falla no debe hacer que Meta reintente en bucle.
      }
    });
  }
  return NextResponse.json({ ok: true });
}
