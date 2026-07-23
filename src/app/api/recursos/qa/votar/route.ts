import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  if (!rateLimit(request, { key: "recursos-qa-votar", limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const body = (await request.json().catch(() => null)) as { participanteId?: string; preguntaId?: string } | null;

  if (!body || !UUID_RE.test(body.participanteId ?? "") || !UUID_RE.test(body.preguntaId ?? "")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_qa_votar", {
    p_participante_id: body.participanteId,
    p_pregunta_qa_id: body.preguntaId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as { voto: boolean; votos: number } | null;
  return NextResponse.json({ voto: row?.voto ?? false, votos: row?.votos ?? 0 });
}
