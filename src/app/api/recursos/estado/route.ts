import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const participanteId = url.searchParams.get("participanteId") ?? "";

  if (!UUID_RE.test(participanteId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_estado_participante", {
    p_participante_id: participanteId,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo consultar el estado." }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    estado: string;
    sesion_titulo: string | null;
    pregunta_id: string | null;
    pregunta_tipo: string | null;
    pregunta_texto: string | null;
    pregunta_opciones: Array<{ id: string; texto: string }> | null;
    pregunta_escala_min: number | null;
    pregunta_escala_max: number | null;
    ya_respondio: boolean | null;
    participantes_count: number | null;
  } | null;

  if (!row) {
    return NextResponse.json({ estado: "cerrada" });
  }

  return NextResponse.json({
    estado: row.estado,
    sesionTitulo: row.sesion_titulo,
    pregunta: row.pregunta_id
      ? {
          id: row.pregunta_id,
          tipo: row.pregunta_tipo,
          texto: row.pregunta_texto,
          opciones: row.pregunta_opciones,
          escalaMin: row.pregunta_escala_min,
          escalaMax: row.pregunta_escala_max,
        }
      : null,
    yaRespondio: Boolean(row.ya_respondio),
    participantesCount: row.participantes_count ?? 0,
  });
}
