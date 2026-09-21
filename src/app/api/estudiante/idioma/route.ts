import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDIOMAS_VALIDOS = ["es", "en", "pt"];

/** El estudiante guarda su idioma preferido de la plataforma (persiste entre dispositivos). */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-idioma", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as { idioma?: unknown } | null;
  const idioma = typeof body?.idioma === "string" ? body.idioma : "";
  if (!IDIOMAS_VALIDOS.includes(idioma)) {
    return NextResponse.json({ error: "Idioma no válido." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { error } = await admin
    .from("gestionesjj_estudiantes")
    .update({ idioma, updated_at: new Date().toISOString() })
    .eq("id", auth.estudianteId);
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el idioma." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
