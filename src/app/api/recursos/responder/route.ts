import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    participanteId?: string;
    preguntaId?: string;
    valor?: Record<string, unknown>;
  } | null;

  if (
    !body ||
    !UUID_RE.test(body.participanteId ?? "") ||
    !UUID_RE.test(body.preguntaId ?? "") ||
    typeof body.valor !== "object" ||
    body.valor === null
  ) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { error } = await supabase.rpc("gestionesjj_public_responder", {
    p_participante_id: body.participanteId,
    p_pregunta_id: body.preguntaId,
    p_valor: body.valor,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
