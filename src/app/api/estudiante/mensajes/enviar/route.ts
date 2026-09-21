import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CARACTERES = 4000;

/**
 * El estudiante envía un mensaje al docente. Como en el resto del área de
 * estudiantes, la escritura pasa por el servidor con service role: el
 * estudiante nunca tiene permisos directos sobre la tabla de mensajes.
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

  const body = (await request.json().catch(() => null)) as { contenido?: unknown } | null;
  const contenido = typeof body?.contenido === "string" ? body.contenido.trim() : "";
  if (!contenido) {
    return NextResponse.json({ error: "Escribe un mensaje." }, { status: 422 });
  }
  if (contenido.length > MAX_CARACTERES) {
    return NextResponse.json({ error: "El mensaje es demasiado largo." }, { status: 422 });
  }

  const { error } = await admin.from("gestionesjj_estudiante_mensajes").insert({
    estudiante_id: auth.estudianteId,
    remitente: "estudiante",
    contenido,
    leido_docente: false,
    leido_estudiante: true,
  });
  if (error) {
    return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
