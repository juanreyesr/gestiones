import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gestionesjj-entregas";
const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB por archivo
const EXTENSIONES_PERMITIDAS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "jpg", "jpeg", "png", "zip"];

function extensionDe(nombre: string): string {
  const partes = nombre.split(".");
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "";
}

function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-140);
}

/**
 * El estudiante sube un archivo para una tarea. Revalida todo server-side
 * (nunca confía en lo que ya se le mostró en pantalla): inscripción activa,
 * acceso del curso, semana habilitada, visibilidad de la tarea y que la
 * entrega esté habilitada. La entrega tardía se acepta y solo se marca; el
 * docente decide si penaliza al calificar.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-entrega-subir", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const actividadId = formData?.get("actividadId");
  const archivo = formData?.get("archivo");

  if (typeof actividadId !== "string" || !UUID_RE.test(actividadId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 422 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 422 });
  }
  const extension = extensionDe(archivo.name);
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido. Usa: ${EXTENSIONES_PERMITIDAS.join(", ")}.` },
      { status: 422 },
    );
  }

  const { data: actividad, error: actividadError } = await admin
    .from("gestionesjj_curso_actividades")
    .select("semana_id, entrega_habilitada, fecha_limite, visible_estudiantes")
    .eq("id", actividadId)
    .maybeSingle();
  if (actividadError || !actividad || !actividad.entrega_habilitada || actividad.visible_estudiantes === "oculto") {
    return NextResponse.json({ error: "No se encontró la tarea." }, { status: 404 });
  }

  const { data: semana, error: semanaError } = await admin
    .from("gestionesjj_curso_semanas")
    .select("curso_id, habilitado_estudiantes")
    .eq("id", actividad.semana_id)
    .maybeSingle();
  if (semanaError || !semana || !semana.habilitado_estudiantes) {
    return NextResponse.json({ error: "No se encontró la tarea." }, { status: 404 });
  }

  const { data: curso, error: cursoError } = await admin
    .from("gestionesjj_cursos_impartidos")
    .select("acceso_estudiantes")
    .eq("id", semana.curso_id)
    .maybeSingle();
  if (cursoError || !curso || !curso.acceso_estudiantes) {
    return NextResponse.json({ error: "No se encontró la tarea." }, { status: 404 });
  }

  const { data: inscripcion, error: inscripcionError } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("id")
    .eq("curso_id", semana.curso_id)
    .eq("estudiante_id", auth.estudianteId)
    .eq("estado", "activo")
    .maybeSingle();
  if (inscripcionError || !inscripcion) {
    return NextResponse.json({ error: "No se encontró la tarea." }, { status: 404 });
  }

  const ahora = new Date();
  const tardia = Boolean(actividad.fecha_limite && ahora > new Date(actividad.fecha_limite));

  const { data: entregaExistente } = await admin
    .from("gestionesjj_curso_entregas")
    .select("id")
    .eq("actividad_id", actividadId)
    .eq("estudiante_id", auth.estudianteId)
    .maybeSingle();

  let entregaId = entregaExistente?.id as string | undefined;
  if (entregaId) {
    const { error: updateError } = await admin
      .from("gestionesjj_curso_entregas")
      .update({ entregado_en: ahora.toISOString(), tardia, updated_at: ahora.toISOString() })
      .eq("id", entregaId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    const { data: nuevaEntrega, error: insertError } = await admin
      .from("gestionesjj_curso_entregas")
      .insert({ actividad_id: actividadId, estudiante_id: auth.estudianteId, entregado_en: ahora.toISOString(), tardia })
      .select("id")
      .single();
    if (insertError || !nuevaEntrega) {
      return NextResponse.json({ error: insertError?.message ?? "No se pudo registrar la entrega." }, { status: 500 });
    }
    entregaId = nuevaEntrega.id as string;
  }

  const path = `entregas/${actividadId}/${auth.estudianteId}/${crypto.randomUUID()}-${nombreSeguro(archivo.name)}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, archivo, {
    contentType: archivo.type || undefined,
  });
  if (uploadError) {
    return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
  }

  const { error: archivoError } = await admin.from("gestionesjj_curso_entrega_archivos").insert({
    entrega_id: entregaId,
    archivo_path: path,
    archivo_nombre: archivo.name,
    archivo_mime: archivo.type || null,
  });
  if (archivoError) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: archivoError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tardia });
}
