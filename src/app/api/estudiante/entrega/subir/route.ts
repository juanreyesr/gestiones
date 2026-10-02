import crypto from "node:crypto";
import { after, NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import {
  BUCKET_ENTREGAS,
  UUID_RE,
  carpetaEntrega,
  nombreSeguro,
  registrarEntrega,
  validarArchivo,
  validarTareaParaEntrega,
} from "@/lib/server/entregas";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { avisarEntrega } from "@/lib/server/telegram-avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El estudiante sube un archivo para una tarea dentro del request. Solo sirve
 * para archivos chicos (Vercel corta el cuerpo en ~4.5 MB); la plataforma usa
 * /entrega/preparar + /entrega/confirmar. Se conserva por compatibilidad con
 * pestañas abiertas antes del cambio.
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
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 422 });
  }
  const errorArchivo = validarArchivo(archivo.name, archivo.size);
  if (errorArchivo) return NextResponse.json({ error: errorArchivo }, { status: 422 });

  const tarea = await validarTareaParaEntrega(admin, actividadId, auth.estudianteId);
  if (!tarea.ok) return NextResponse.json({ error: tarea.error }, { status: tarea.status });

  const path = `${carpetaEntrega(actividadId, auth.estudianteId)}/${crypto.randomUUID()}-${nombreSeguro(archivo.name)}`;
  const { error: uploadError } = await admin.storage.from(BUCKET_ENTREGAS).upload(path, archivo, {
    contentType: archivo.type || undefined,
  });
  if (uploadError) {
    return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
  }

  const registro = await registrarEntrega(admin, {
    actividadId,
    estudianteId: auth.estudianteId,
    fechaLimite: tarea.fechaLimite,
    path,
    nombre: archivo.name,
    mime: archivo.type || null,
  });
  if (!registro.ok) {
    await admin.storage.from(BUCKET_ENTREGAS).remove([path]);
    return NextResponse.json({ error: registro.error }, { status: registro.status });
  }

  const { cursoId } = tarea;
  after(() =>
    avisarEntrega({
      actividadId,
      estudianteId: auth.estudianteId,
      cursoId,
      archivoNombre: archivo.name,
      tardia: registro.tardia,
    }).catch(() => undefined),
  );

  return NextResponse.json({ ok: true, tardia: registro.tardia });
}
