import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  if (!rateLimit(request, { key: "encuestas-info", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: "Enlace inválido." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_encuesta_info", { p_token: token });
  if (error) {
    return NextResponse.json({ error: "No se pudo consultar la encuesta." }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as { campana_id: string; titulo: string; anio: number; activa: boolean } | null;
  if (!row) {
    return NextResponse.json({ error: "Esta encuesta no existe." }, { status: 404 });
  }
  if (!row.activa) {
    return NextResponse.json({ error: "Esta encuesta ya no está disponible." }, { status: 410 });
  }

  return NextResponse.json({ titulo: row.titulo, anio: row.anio });
}
