import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIN_RE = /^\d{6}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string; apodo?: string } | null;

  if (!body || !PIN_RE.test(body.pin ?? "") || typeof body.apodo !== "string" || !body.apodo.trim()) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_unirse", {
    p_pin: body.pin,
    p_apodo: body.apodo.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as { participante_id: string; sesion_id: string } | null;
  if (!row) {
    return NextResponse.json({ error: "No se pudo unir a la sesión." }, { status: 500 });
  }

  return NextResponse.json({ participanteId: row.participante_id, sesionId: row.sesion_id });
}
