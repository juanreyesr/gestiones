import { NextResponse } from "next/server";
import { cifrarContrasena, generarContrasena } from "@/lib/server/estudiante-crypto";
import { requireOwner } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Da acceso de estudiante a una inscripción existente: crea (o reutiliza,
 * si ya existe alguien con ese correo en otro curso) la identidad global y
 * su cuenta real de Supabase Auth, y enlaza la inscripción del curso a esa
 * identidad. La contraseña nunca se guarda en texto plano: se cifra para
 * poder reimprimir la ficha más adelante, y se devuelve aquí una sola vez
 * para que el panel la muestre/imprima de inmediato.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiantes-crear", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const cursoEstudianteId = typeof body?.cursoEstudianteId === "string" ? body.cursoEstudianteId : "";
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const correo = typeof body?.correo === "string" ? body.correo.trim().toLowerCase() : "";
  const contrasenaInput = typeof body?.contrasena === "string" ? body.contrasena.trim() : "";

  if (!UUID_RE.test(cursoEstudianteId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }
  if (!nombre || !CORREO_RE.test(correo)) {
    return NextResponse.json({ error: "Nombre y correo válidos son obligatorios." }, { status: 422 });
  }

  const { data: inscripcion, error: inscripcionError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("id, estudiante_id")
    .eq("id", cursoEstudianteId)
    .maybeSingle();
  if (inscripcionError || !inscripcion) {
    return NextResponse.json({ error: "No se encontró la inscripción del estudiante." }, { status: 404 });
  }
  if (inscripcion.estudiante_id) {
    return NextResponse.json({ error: "Este estudiante ya tiene acceso." }, { status: 409 });
  }

  const { data: existente } = await admin
    .from("gestionesjj_estudiantes")
    .select("id, auth_user_id")
    .eq("correo", correo)
    .maybeSingle();

  if (existente) {
    // Ya existe la persona (por ejemplo, toma otro curso): solo enlazamos
    // esta inscripción a su cuenta, sin tocar su contraseña.
    const { error: updateError } = await admin
      .from("gestionesjj_curso_estudiantes")
      .update({ estudiante_id: existente.id })
      .eq("id", cursoEstudianteId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ estudianteId: existente.id, correo, contrasena: null, reutilizado: true });
  }

  const contrasena = contrasenaInput || generarContrasena();
  const { valor: contrasenaCifrada, error: cifradoError } = cifrarContrasena(contrasena);
  if (cifradoError) return NextResponse.json({ error: cifradoError }, { status: 500 });

  const { data: nuevoUsuario, error: crearUsuarioError } = await admin.auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: true,
  });
  if (crearUsuarioError || !nuevoUsuario.user) {
    return NextResponse.json({ error: crearUsuarioError?.message ?? "No se pudo crear la cuenta." }, { status: 500 });
  }

  const { data: estudianteCreado, error: insertError } = await admin
    .from("gestionesjj_estudiantes")
    .insert({
      created_by: auth.ownerId,
      auth_user_id: nuevoUsuario.user.id,
      nombre,
      correo,
      contrasena_cifrada: contrasenaCifrada,
      debe_cambiar_contrasena: true,
      activo: true,
    })
    .select("id")
    .single();

  if (insertError || !estudianteCreado) {
    await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
    return NextResponse.json({ error: insertError?.message ?? "No se pudo guardar el estudiante." }, { status: 500 });
  }

  const { error: linkError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .update({ estudiante_id: estudianteCreado.id })
    .eq("id", cursoEstudianteId);
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  return NextResponse.json({ estudianteId: estudianteCreado.id, correo, contrasena, reutilizado: false });
}
