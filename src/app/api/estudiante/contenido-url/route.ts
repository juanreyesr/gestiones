import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const BUCKET = "gestionesjj-cursos";
const EXPIRES_SECONDS = 120;

/**
 * Entrega una URL firmada de corta duración para el archivo de un contenido,
 * solo si el estudiante que la pide está inscrito y activo en el curso, el
 * curso tiene acceso de estudiantes, la semana está habilitada y el
 * contenido no está marcado como oculto. El estudiante nunca tiene permisos
 * directos sobre el bucket: todo pasa por aquí.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-contenido-url", limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const contenidoId = typeof body?.contenidoId === "string" ? body.contenidoId : "";
  if (!UUID_RE.test(contenidoId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const { data: contenido, error: contenidoError } = await admin
    .from("gestionesjj_curso_contenidos")
    .select("archivo_path, visible_estudiantes, semana_id")
    .eq("id", contenidoId)
    .maybeSingle();
  if (contenidoError || !contenido || !contenido.archivo_path || contenido.visible_estudiantes === "oculto") {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: semana, error: semanaError } = await admin
    .from("gestionesjj_curso_semanas")
    .select("curso_id, habilitado_estudiantes")
    .eq("id", contenido.semana_id)
    .maybeSingle();
  if (semanaError || !semana || !semana.habilitado_estudiantes) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: curso, error: cursoError } = await admin
    .from("gestionesjj_cursos_impartidos")
    .select("acceso_estudiantes")
    .eq("id", semana.curso_id)
    .maybeSingle();
  if (cursoError || !curso || !curso.acceso_estudiantes) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: inscripcion, error: inscripcionError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("id")
    .eq("curso_id", semana.curso_id)
    .eq("estudiante_id", auth.estudianteId)
    .eq("estado", "activo")
    .maybeSingle();
  if (inscripcionError || !inscripcion) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(contenido.archivo_path, EXPIRES_SECONDS);
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
