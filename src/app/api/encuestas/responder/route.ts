import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";
import type { RespuestaEncuestaPayload } from "@/lib/encuestas/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esArregloDeTextos(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim() !== "");
}

export async function POST(request: Request) {
  if (!rateLimit(request, { key: "encuestas-responder", limit: 10, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const body = (await request.json().catch(() => null)) as ({ token?: string } & Partial<RespuestaEncuestaPayload>) | null;

  if (
    !body ||
    !UUID_RE.test(body.token ?? "") ||
    typeof body.fuente_conocimiento !== "string" ||
    !esArregloDeTextos(body.razones_universidad) ||
    !esArregloDeTextos(body.razones_carrera) ||
    typeof body.primera_opcion !== "boolean" ||
    typeof body.quien_influyo !== "string" ||
    !esArregloDeTextos(body.expectativas_carrera) ||
    !esArregloDeTextos(body.expectativa_universidad) ||
    typeof body.satisfaccion_eleccion !== "number" ||
    body.satisfaccion_eleccion < 1 ||
    body.satisfaccion_eleccion > 5 ||
    typeof body.probabilidad_recomendar !== "number" ||
    body.probabilidad_recomendar < 0 ||
    body.probabilidad_recomendar > 10
  ) {
    return NextResponse.json({ error: "Completa todas las preguntas obligatorias." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { error } = await supabase.rpc("gestionesjj_public_encuesta_responder", {
    p_token: body.token,
    p_edad_rango: body.edad_rango ?? null,
    p_genero: body.genero ?? null,
    p_trabaja: body.trabaja ?? null,
    p_primera_generacion: body.primera_generacion ?? null,
    p_fuente_conocimiento: body.fuente_conocimiento,
    p_razones_universidad: body.razones_universidad,
    p_razones_universidad_otro: body.razones_universidad_otro ?? null,
    p_razones_carrera: body.razones_carrera,
    p_razones_carrera_otro: body.razones_carrera_otro ?? null,
    p_primera_opcion: body.primera_opcion,
    p_quien_influyo: body.quien_influyo,
    p_expectativas_carrera: body.expectativas_carrera,
    p_expectativa_universidad: body.expectativa_universidad,
    p_expectativa_abierta: body.expectativa_abierta ?? null,
    p_satisfaccion_eleccion: body.satisfaccion_eleccion,
    p_probabilidad_recomendar: body.probabilidad_recomendar,
    p_comentario: body.comentario ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo enviar la encuesta. Intenta de nuevo." }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
