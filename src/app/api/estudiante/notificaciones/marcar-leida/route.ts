import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** El estudiante marca una notificación (o todas) como leída. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-notificaciones-marcar-leida", limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown; todas?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : null;
  const todas = body?.todas === true;

  if (!id && !todas) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }
  if (id && !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  let query = admin
    .from("gestionesjj_estudiante_notificaciones")
    .update({ leida: true })
    .eq("estudiante_id", auth.estudianteId)
    .eq("leida", false);
  if (id) query = query.eq("id", id);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
