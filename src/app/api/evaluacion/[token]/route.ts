import { NextResponse } from "next/server";
import { validarBBreve } from "@/lib/evaluaciones/b-breve/codigo";
import { B_BREVE_RELACIONES } from "@/lib/evaluaciones/b-breve/contenido";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_CACHE = { "Cache-Control": "no-store" };

type RawGet = { estado: string; instrumento: string | null; ref: string | null };

/**
 * Formulario de evaluación por enlace (/evaluacion/<token>). Devuelve solo el
 * instrumento, el estado del enlace y un código de caso corto: nunca datos del
 * expediente ni puntuaciones (los padres no ven calificaciones).
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-token", limit: 30, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });

  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_get", { p_token: token });
  const row = (Array.isArray(data) ? data[0] : data) as RawGet | null;
  if (error || !row) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  return NextResponse.json({ estado: row.estado, instrumento: row.instrumento, ref: row.ref }, { headers: SIN_CACHE });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-token-post", limit: 10, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "No disponible." }, { status: 503 });

  const { data: info } = await supabase.rpc("gestionesjj_public_evaluacion_get", { p_token: token });
  const fila = (Array.isArray(info) ? info[0] : info) as RawGet | null;
  if (!fila || fila.estado === "invalido") return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });
  if (fila.estado !== "ok") return NextResponse.json({ estado: fila.estado });

  // Validación según el instrumento del enlace (no según lo que diga el cuerpo).
  if (fila.instrumento !== "b-breve") {
    return NextResponse.json({ error: "Instrumento no disponible." }, { status: 422 });
  }
  const v = validarBBreve(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });
  const datos = v.datos;
  if (!datos.nombre) return NextResponse.json({ error: "Escriba el nombre de quien responde." }, { status: 422 });
  if (!(B_BREVE_RELACIONES as readonly string[]).includes(datos.relacion ?? "")) {
    return NextResponse.json({ error: "Seleccione su relación con el niño o niña." }, { status: 422 });
  }
  // El código de caso y la hora de envío los pone el servidor.
  const guardar = { ...datos, ref: fila.ref ?? "", enviado: new Date().toISOString() };

  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_responder", {
    p_token: token,
    p_nombre: datos.nombre,
    p_relacion: datos.relacion,
    p_fecha: datos.fecha || null,
    p_datos: guardar,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ estado: data as string });
}
