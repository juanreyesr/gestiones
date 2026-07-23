import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  if (!rateLimit(request, { key: "recursos-qa-enviar", limit: 10, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const body = (await request.json().catch(() => null)) as { participanteId?: string; texto?: string } | null;

  if (!body || !UUID_RE.test(body.participanteId ?? "") || typeof body.texto !== "string" || !body.texto.trim()) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_qa_enviar", {
    p_participante_id: body.participanteId,
    p_texto: body.texto.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ id: data as string });
}
