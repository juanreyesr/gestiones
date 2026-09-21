import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { cifrarContrasena } from "@/lib/server/estudiante-crypto";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El propio estudiante cambia su contraseña (obligatorio en el primer
 * ingreso, opcional después). Se actualiza la cuenta real de Supabase Auth
 * y se recifra la copia guardada para que la ficha reimpresa siga
 * reflejando la contraseña vigente.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-cambiar-password", limit: 10, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const nuevaContrasena = typeof body?.nuevaContrasena === "string" ? body.nuevaContrasena : "";
  if (nuevaContrasena.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(auth.authUserId, {
    password: nuevaContrasena,
  });
  if (updateAuthError) return NextResponse.json({ error: updateAuthError.message }, { status: 500 });

  const { valor: contrasenaCifrada, error: cifradoError } = cifrarContrasena(nuevaContrasena);
  if (cifradoError) return NextResponse.json({ error: cifradoError }, { status: 500 });

  const { error: updateError } = await admin
    .from("gestionesjj_estudiantes")
    .update({ contrasena_cifrada: contrasenaCifrada, debe_cambiar_contrasena: false, updated_at: new Date().toISOString() })
    .eq("id", auth.estudianteId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
