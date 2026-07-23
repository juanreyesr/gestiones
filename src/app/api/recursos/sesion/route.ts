import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIN_RE = /^\d{6}$/;

export async function GET(request: Request) {
  if (!rateLimit(request, { key: "recursos-sesion", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const url = new URL(request.url);
  const pin = url.searchParams.get("pin") ?? "";

  if (!PIN_RE.test(pin)) {
    return NextResponse.json({ error: "El PIN debe tener 6 dígitos." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_sesion_por_pin", { p_pin: pin });
  if (error) {
    return NextResponse.json({ error: "No se pudo consultar el PIN." }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as { sesion_id: string; estado: string; recurso_titulo: string } | null;
  if (!row) {
    return NextResponse.json({ error: "El PIN no es válido o la sesión ya terminó." }, { status: 404 });
  }

  return NextResponse.json({
    sesionId: row.sesion_id,
    estado: row.estado,
    recursoTitulo: row.recurso_titulo,
  });
}
