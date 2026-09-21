import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El estudiante marca como leídos los mensajes del docente al abrir el chat. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-mensajes-marcar-leido", limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { error } = await admin
    .from("gestionesjj_estudiante_mensajes")
    .update({ leido_estudiante: true })
    .eq("estudiante_id", auth.estudianteId)
    .eq("remitente", "docente")
    .eq("leido_estudiante", false);
  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
