import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gestionesjj-entregas";
const UUID_RE = /^[0-9a-f-]{36}$/i;
const EXPIRES_SECONDS = 120;

/** El estudiante revisa un archivo que él mismo entregó (nunca el de otro). */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-entrega-archivo-url", limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const archivoId = typeof body?.archivoId === "string" ? body.archivoId : "";
  if (!UUID_RE.test(archivoId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const { data: archivo, error: archivoError } = await admin
    .from("gestionesjj_curso_entrega_archivos")
    .select("archivo_path, entrega_id")
    .eq("id", archivoId)
    .maybeSingle();
  if (archivoError || !archivo) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: entrega, error: entregaError } = await admin
    .from("gestionesjj_curso_entregas")
    .select("estudiante_id")
    .eq("id", archivo.entrega_id)
    .maybeSingle();
  if (entregaError || !entrega || entrega.estudiante_id !== auth.estudianteId) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(archivo.archivo_path, EXPIRES_SECONDS);
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
