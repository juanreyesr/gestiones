import { NextResponse } from "next/server";
import { descifrarContrasena } from "@/lib/server/estudiante-crypto";
import { requireOwner } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Fichas de credenciales de todo el curso, para el reporte en PDF: una
 * tarjeta por estudiante activo y con acceso ya otorgado.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiantes-fichas-curso", limit: 15, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const cursoId = typeof body?.cursoId === "string" ? body.cursoId : "";
  if (!UUID_RE.test(cursoId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const { data: inscripciones, error: inscripcionesError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("nombre, estudiante_id")
    .eq("curso_id", cursoId)
    .eq("estado", "activo");
  if (inscripcionesError) {
    return NextResponse.json({ error: inscripcionesError.message }, { status: 500 });
  }

  const conAcceso = (inscripciones ?? []).filter((i) => i.estudiante_id);
  const sinAcceso = (inscripciones ?? []).filter((i) => !i.estudiante_id).map((i) => i.nombre);

  const estudianteIds = conAcceso.map((i) => i.estudiante_id as string);
  if (!estudianteIds.length) {
    return NextResponse.json({ fichas: [], sinAcceso });
  }

  const { data: estudiantes, error: estudiantesError } = await admin
    .from("gestionesjj_estudiantes")
    .select("id, nombre, correo, contrasena_cifrada, debe_cambiar_contrasena")
    .in("id", estudianteIds);
  if (estudiantesError) {
    return NextResponse.json({ error: estudiantesError.message }, { status: 500 });
  }

  const fichas = (estudiantes ?? []).map((estudiante) => {
    const { texto: contrasena } = estudiante.contrasena_cifrada
      ? descifrarContrasena(estudiante.contrasena_cifrada)
      : { texto: null };
    return {
      nombre: estudiante.nombre as string,
      correo: estudiante.correo as string,
      contrasena: contrasena ?? "—",
      debeCambiarContrasena: Boolean(estudiante.debe_cambiar_contrasena),
    };
  });

  return NextResponse.json({ fichas, sinAcceso });
}
