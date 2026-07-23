import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  if (!rateLimit(request, { key: "recursos-qa-lista", limit: 40, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const url = new URL(request.url);
  const participanteId = url.searchParams.get("participanteId") ?? "";

  if (!UUID_RE.test(participanteId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_qa_lista", {
    p_participante_id: participanteId,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo consultar las preguntas." }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    id: string;
    texto: string;
    autor_apodo: string | null;
    votos: number;
    estado: string;
    destacada: boolean;
    yo_vote: boolean;
    es_mia: boolean;
  }>;

  return NextResponse.json({
    preguntas: rows.map((row) => ({
      id: row.id,
      texto: row.texto,
      autorApodo: row.autor_apodo,
      votos: row.votos,
      estado: row.estado,
      destacada: row.destacada,
      yoVote: row.yo_vote,
      esMia: row.es_mia,
    })),
  });
}
