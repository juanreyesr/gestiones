import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { cifrarContrasena, descifrarContrasena } from "@/lib/server/estudiante-crypto";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * El docente aprueba una solicitud de autoasignacion: crea (o reutiliza)
 * la identidad global y la cuenta real de Supabase Auth con la contraseña
 * que la persona eligio al pedir la asignacion, y crea la inscripcion al
 * curso con el carné que el docente le asigna aquí.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiantes-aprobar-solicitud", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const solicitudId = typeof body?.solicitudId === "string" ? body.solicitudId : "";
  const carne = typeof body?.carne === "string" ? body.carne.trim() : "";

  if (!UUID_RE.test(solicitudId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }
  if (!carne) {
    return NextResponse.json({ error: "Asigna un número de carné para aprobar." }, { status: 422 });
  }

  const { data: solicitud, error: solicitudError } = await admin
    .from("gestionesjj_curso_solicitudes")
    .select("id, curso_id, nombre, correo, contrasena_cifrada, estado")
    .eq("id", solicitudId)
    .maybeSingle();
  if (solicitudError || !solicitud) {
    return NextResponse.json({ error: "No se encontró la solicitud." }, { status: 404 });
  }
  if (solicitud.estado !== "pendiente") {
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta." }, { status: 409 });
  }

  const { texto: contrasena, error: descifradoError } = descifrarContrasena(solicitud.contrasena_cifrada);
  if (descifradoError || !contrasena) {
    return NextResponse.json({ error: descifradoError ?? "No se pudo leer la contraseña de la solicitud." }, { status: 500 });
  }

  const { data: existente } = await admin
    .from("gestionesjj_estudiantes")
    .select("id, auth_user_id")
    .eq("correo", solicitud.correo)
    .maybeSingle();

  let estudianteId: string;
  if (existente) {
    // Ya existe la persona (por ejemplo, toma otro curso): se reutiliza su
    // cuenta y no se le toca la contraseña que ya tenía.
    estudianteId = existente.id as string;
  } else {
    const { valor: contrasenaCifrada, error: cifradoError } = cifrarContrasena(contrasena);
    if (cifradoError) return NextResponse.json({ error: cifradoError }, { status: 500 });

    const { data: nuevoUsuario, error: crearUsuarioError } = await admin.auth.admin.createUser({
      email: solicitud.correo,
      password: contrasena,
      email_confirm: true,
    });
    if (crearUsuarioError || !nuevoUsuario.user) {
      return NextResponse.json({ error: crearUsuarioError?.message ?? "No se pudo crear la cuenta." }, { status: 500 });
    }

    const { data: estudianteCreado, error: insertEstudianteError } = await admin
      .from("gestionesjj_estudiantes")
      .insert({
        auth_user_id: nuevoUsuario.user.id,
        nombre: solicitud.nombre,
        correo: solicitud.correo,
        contrasena_cifrada: contrasenaCifrada,
        debe_cambiar_contrasena: false,
        activo: true,
      })
      .select("id")
      .single();
    if (insertEstudianteError || !estudianteCreado) {
      await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
      return NextResponse.json({ error: insertEstudianteError?.message ?? "No se pudo guardar el estudiante." }, { status: 500 });
    }
    estudianteId = estudianteCreado.id as string;
  }

  const { data: cursoEstudiante, error: insertInscripcionError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .insert({
      curso_id: solicitud.curso_id,
      nombre: solicitud.nombre,
      correo: solicitud.correo,
      carne,
      estudiante_id: estudianteId,
    })
    .select("id")
    .single();
  if (insertInscripcionError || !cursoEstudiante) {
    return NextResponse.json({ error: insertInscripcionError?.message ?? "No se pudo inscribir al estudiante." }, { status: 500 });
  }

  await admin.from("gestionesjj_curso_estudiante_eventos").insert({
    curso_id: solicitud.curso_id,
    estudiante_id: cursoEstudiante.id,
    tipo: "asignacion",
    nota: "Autoasignación aprobada por el docente.",
  });

  const { error: updateSolicitudError } = await admin
    .from("gestionesjj_curso_solicitudes")
    .update({ estado: "aprobada", carne, curso_estudiante_id: cursoEstudiante.id, resuelto_en: new Date().toISOString() })
    .eq("id", solicitudId);
  if (updateSolicitudError) {
    return NextResponse.json({ error: updateSolicitudError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
