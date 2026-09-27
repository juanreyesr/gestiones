import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { firmaValida, textoPredicasMes } from "@/lib/server/telegram-iglesia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Boton "Enviar por WhatsApp" de las predicas del mes en Telegram: arma el
 * mismo texto de "Texto para enviar" y redirige a WhatsApp con el mensaje
 * listo. Solo responde a enlaces firmados por el bot.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const periodo = params.get("mes") ?? "";
  const firma = params.get("firma") ?? "";
  const partes = periodo.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!partes || !firmaValida(periodo, firma)) {
    return NextResponse.json({ error: "Enlace no válido." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Servidor sin configurar." }, { status: 503 });
  const texto = await textoPredicasMes(admin, Number(partes[1]), Number(partes[2]));
  if (!texto) return NextResponse.json({ error: "Ese mes no tiene calendario de prédicas." }, { status: 404 });

  return NextResponse.redirect(`https://wa.me/?text=${encodeURIComponent(texto)}`, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
