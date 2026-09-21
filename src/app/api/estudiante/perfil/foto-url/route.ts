import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "gestionesjj-perfiles";

/** El estudiante obtiene una URL firmada de corta duración para ver su propia foto. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-perfil-foto-url", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { data: estudiante } = await admin
    .from("gestionesjj_estudiantes")
    .select("foto_path")
    .eq("id", auth.estudianteId)
    .maybeSingle();
  const fotoPath = (estudiante as { foto_path: string | null } | null)?.foto_path;
  if (!fotoPath) {
    return NextResponse.json({ url: null });
  }

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(fotoPath, 120);
  if (error || !data) {
    return NextResponse.json({ error: "No se pudo abrir la foto." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
