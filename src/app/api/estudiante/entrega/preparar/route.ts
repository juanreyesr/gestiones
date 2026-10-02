import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import {
  BUCKET_ENTREGAS,
  UUID_RE,
  carpetaEntrega,
  nombreSeguro,
  validarArchivo,
  validarTareaParaEntrega,
} from "@/lib/server/entregas";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paso 1 de la subida directa: valida la tarea y el archivo declarado y
 * devuelve un permiso de subida firmado para UNA ruta dentro de la carpeta
 * del estudiante. El archivo viaja del navegador a Storage sin pasar por
 * Vercel (que corta los cuerpos en ~4.5 MB). Nada queda registrado hasta
 * /entrega/confirmar.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-entrega-preparar", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });

  const body = await request.json().catch(() => null);
  const actividadId = typeof body?.actividadId === "string" ? body.actividadId : "";
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const tamano = typeof body?.tamano === "number" ? body.tamano : Number.NaN;
  if (!UUID_RE.test(actividadId)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });

  const errorArchivo = validarArchivo(nombre, tamano);
  if (errorArchivo) return NextResponse.json({ error: errorArchivo }, { status: 422 });

  const tarea = await validarTareaParaEntrega(admin, actividadId, auth.estudianteId);
  if (!tarea.ok) return NextResponse.json({ error: tarea.error }, { status: tarea.status });

  const path = `${carpetaEntrega(actividadId, auth.estudianteId)}/${crypto.randomUUID()}-${nombreSeguro(nombre)}`;
  const { data, error } = await admin.storage.from(BUCKET_ENTREGAS).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
