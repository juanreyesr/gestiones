import { NextResponse } from "next/server";
import { cifrarContrasena, generarContrasena } from "@/lib/server/estudiante-crypto";
import { requireOwner } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Genera una contraseña nueva para un estudiante (se perdió la anterior, o
 * el owner quiere renovarla). Nunca se intenta recuperar la contraseña
 * vieja: se reemplaza y se devuelve la nueva una sola vez para reimprimir
 * su ficha.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiantes-regenerar", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const estudianteId = typeof body?.estudianteId === "string" ? body.estudianteId : "";
  if (!UUID_RE.test(estudianteId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const { data: estudiante, error: estudianteError } = await admin
    .from("gestionesjj_estudiantes")
    .select("id, auth_user_id, correo")
    .eq("id", estudianteId)
    .maybeSingle();
  if (estudianteError || !estudiante?.auth_user_id) {
    return NextResponse.json({ error: "No se encontró la cuenta del estudiante." }, { status: 404 });
  }

  const contrasena = generarContrasena();
  const { valor: contrasenaCifrada, error: cifradoError } = cifrarContrasena(contrasena);
  if (cifradoError) return NextResponse.json({ error: cifradoError }, { status: 500 });

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(estudiante.auth_user_id, {
    password: contrasena,
  });
  if (updateAuthError) return NextResponse.json({ error: updateAuthError.message }, { status: 500 });

  const { error: updateError } = await admin
    .from("gestionesjj_estudiantes")
    .update({ contrasena_cifrada: contrasenaCifrada, debe_cambiar_contrasena: true, updated_at: new Date().toISOString() })
    .eq("id", estudianteId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ correo: estudiante.correo, contrasena });
}
