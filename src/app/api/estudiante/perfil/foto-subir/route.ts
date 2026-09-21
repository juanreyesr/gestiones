import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gestionesjj-perfiles";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTENSIONES_PERMITIDAS = ["jpg", "jpeg", "png", "webp"];

function extensionDe(nombre: string): string {
  const partes = nombre.split(".");
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "";
}

/** El estudiante sube o reemplaza su foto de perfil. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-perfil-foto-subir", limit: 10, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const archivo = formData?.get("foto");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Selecciona una foto." }, { status: 422 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto no puede pesar más de 5 MB." }, { status: 422 });
  }
  const extension = extensionDe(archivo.name);
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    return NextResponse.json({ error: `Usa una imagen: ${EXTENSIONES_PERMITIDAS.join(", ")}.` }, { status: 422 });
  }

  const { data: actual } = await admin
    .from("gestionesjj_estudiantes")
    .select("foto_path")
    .eq("id", auth.estudianteId)
    .maybeSingle();

  const path = `perfiles/${auth.estudianteId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, archivo, {
    contentType: archivo.type || undefined,
  });
  if (uploadError) {
    return NextResponse.json({ error: "No se pudo subir la foto." }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("gestionesjj_estudiantes")
    .update({ foto_path: path, updated_at: new Date().toISOString() })
    .eq("id", auth.estudianteId);
  if (updateError) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const anterior = (actual as { foto_path: string | null } | null)?.foto_path;
  if (anterior) await admin.storage.from(BUCKET).remove([anterior]);

  return NextResponse.json({ ok: true });
}
