import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El estudiante elige "no volver a preguntarme" en el aviso de cambiar
 * contraseña: no cambia la contraseña, solo deja de pedirla en cada
 * ingreso. Sigue pudiendo cambiarla cuando quiera desde el panel.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-omitir-cambio-contrasena", limit: 10, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("gestionesjj_estudiantes")
    .update({ debe_cambiar_contrasena: false, updated_at: new Date().toISOString() })
    .eq("id", auth.estudianteId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
