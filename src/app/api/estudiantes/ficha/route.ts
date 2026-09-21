import { NextResponse } from "next/server";
import { descifrarContrasena } from "@/lib/server/estudiante-crypto";
import { requireOwner } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Reimprime la ficha de un estudiante: descifra su contraseña actual. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiantes-ficha", limit: 30, windowMs: 60_000 })) {
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
    .select("nombre, correo, contrasena_cifrada")
    .eq("id", estudianteId)
    .maybeSingle();
  if (estudianteError || !estudiante) {
    return NextResponse.json({ error: "No se encontró el estudiante." }, { status: 404 });
  }
  if (!estudiante.contrasena_cifrada) {
    return NextResponse.json({ error: "No hay contraseña guardada para este estudiante." }, { status: 404 });
  }

  const { texto: contrasena, error: descifradoError } = descifrarContrasena(estudiante.contrasena_cifrada);
  if (descifradoError || !contrasena) {
    return NextResponse.json({ error: descifradoError ?? "No se pudo recuperar la contraseña." }, { status: 500 });
  }

  return NextResponse.json({ nombre: estudiante.nombre, correo: estudiante.correo, contrasena });
}
