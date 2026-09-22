import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const BUCKET = "gestionesjj-mensajes-adjuntos";
const EXPIRES_SECONDS = 120;

/**
 * Entrega una URL firmada de corta duración para el adjunto de un mensaje,
 * solo si el mensaje pertenece al hilo del propio estudiante (lo haya
 * enviado él o el docente).
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-mensajes-archivo-url", limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const mensajeId = typeof body?.mensajeId === "string" ? body.mensajeId : "";
  if (!UUID_RE.test(mensajeId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const { data: mensaje, error: mensajeError } = await admin
    .from("gestionesjj_estudiante_mensajes")
    .select("archivo_path, estudiante_id")
    .eq("id", mensajeId)
    .maybeSingle();
  if (mensajeError || !mensaje || !mensaje.archivo_path || mensaje.estudiante_id !== auth.estudianteId) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await admin.storage.from(BUCKET).createSignedUrl(mensaje.archivo_path, EXPIRES_SECONDS);
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
