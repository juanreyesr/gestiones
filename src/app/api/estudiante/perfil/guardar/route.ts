import { NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXTO = 2000;
const MAX_PAIS = 80;

function textoOpcional(valor: unknown, max: number): { ok: true; valor: string | null } | { ok: false } {
  if (valor === null || valor === undefined || valor === "") return { ok: true, valor: null };
  if (typeof valor !== "string" || valor.length > max) return { ok: false };
  return { ok: true, valor: valor.trim() || null };
}

/**
 * El estudiante guarda su ficha de perfil: fecha de nacimiento, país y las
 * respuestas a las preguntas del perfil que define el docente (migración 056).
 * Solo se aceptan respuestas a preguntas activas; las respuestas guardadas a
 * preguntas ya desactivadas se conservan.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-perfil-guardar", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);

  const fechaNacimiento = body?.fechaNacimiento;
  if (fechaNacimiento !== null && fechaNacimiento !== undefined && fechaNacimiento !== "" && !FECHA_RE.test(fechaNacimiento)) {
    return NextResponse.json({ error: "Fecha de nacimiento inválida." }, { status: 422 });
  }

  const pais = textoOpcional(body?.pais, MAX_PAIS);
  const respuestasBody = body?.respuestas;
  if (!pais.ok || (respuestasBody !== undefined && (typeof respuestasBody !== "object" || respuestasBody === null || Array.isArray(respuestasBody)))) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const [{ data: preguntas, error: preguntasError }, { data: actual, error: actualError }] = await Promise.all([
    admin.from("gestionesjj_perfil_preguntas").select("id").eq("activa", true),
    admin.from("gestionesjj_estudiantes").select("perfil_respuestas").eq("id", auth.estudianteId).maybeSingle(),
  ]);
  if (preguntasError || actualError) {
    return NextResponse.json({ error: "No se pudo guardar tu perfil." }, { status: 500 });
  }

  const respuestas: Record<string, string> = { ...((actual?.perfil_respuestas as Record<string, string> | null) ?? {}) };
  for (const { id } of (preguntas ?? []) as Array<{ id: string }>) {
    const valor = textoOpcional((respuestasBody as Record<string, unknown> | undefined)?.[id], MAX_TEXTO);
    if (!valor.ok) return NextResponse.json({ error: "Una respuesta es demasiado larga." }, { status: 422 });
    if (valor.valor) respuestas[id] = valor.valor;
    else delete respuestas[id];
  }

  const { error } = await admin
    .from("gestionesjj_estudiantes")
    .update({
      fecha_nacimiento: fechaNacimiento || null,
      pais: pais.valor,
      perfil_respuestas: respuestas,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.estudianteId);
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar tu perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
