import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CARACTERES = 4000;
const BUCKET = "gestionesjj-mensajes-adjuntos";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB, igual que las entregas de tareas

function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-140);
}

/**
 * El estudiante envía un mensaje al docente, con texto y/o un archivo
 * adjunto. Como en el resto del área de estudiantes, la escritura pasa por
 * el servidor con service role: el estudiante nunca tiene permisos
 * directos sobre la tabla de mensajes ni sobre el bucket de adjuntos.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-mensajes-enviar", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const contenido = typeof formData?.get("contenido") === "string" ? (formData.get("contenido") as string).trim() : "";
  const archivo = formData?.get("archivo");
  const tieneArchivo = archivo instanceof File && archivo.size > 0;

  if (!contenido && !tieneArchivo) {
    return NextResponse.json({ error: "Escribe un mensaje o adjunta un archivo." }, { status: 422 });
  }
  if (contenido.length > MAX_CARACTERES) {
    return NextResponse.json({ error: "El mensaje es demasiado largo." }, { status: 422 });
  }
  if (tieneArchivo && (archivo as File).size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 422 });
  }

  let archivoPath: string | null = null;
  if (tieneArchivo) {
    const archivoFile = archivo as File;
    archivoPath = `mensajes/${auth.estudianteId}/${Date.now()}-${nombreSeguro(archivoFile.name)}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(archivoPath, archivoFile, {
      contentType: archivoFile.type || undefined,
    });
    if (uploadError) {
      return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    }
  }

  const { error } = await admin.from("gestionesjj_estudiante_mensajes").insert({
    estudiante_id: auth.estudianteId,
    remitente: "estudiante",
    contenido: contenido || null,
    archivo_path: archivoPath,
    archivo_nombre: tieneArchivo ? (archivo as File).name : null,
    archivo_mime: tieneArchivo ? (archivo as File).type || null : null,
    leido_docente: false,
    leido_estudiante: true,
  });
  if (error) {
    if (archivoPath) await admin.storage.from(BUCKET).remove([archivoPath]);
    return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
