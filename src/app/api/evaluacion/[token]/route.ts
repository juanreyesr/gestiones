import { after, NextResponse } from "next/server";
import { limpiarBorradorBBreve, validarBBreve } from "@/lib/evaluaciones/b-breve/codigo";
import { B_BREVE_RELACIONES } from "@/lib/evaluaciones/b-breve/contenido";
import { limpiarBorradorEapi, validarEapi } from "@/lib/evaluaciones/eapi/codigo";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { avisarEvaluacionRespondida } from "@/lib/server/telegram-avisos";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_CACHE = { "Cache-Control": "no-store" };

type RawGet = {
  estado: string;
  instrumento: string | null;
  ref: string | null;
  borrador?: unknown;
  opciones?: Record<string, unknown> | null;
};

const conDocs = (fila: RawGet) => fila.instrumento === "eapi" && fila.opciones?.docs === true;

/** Limpia el avance según el instrumento del enlace. */
function limpiarBorrador(fila: RawGet, datos: unknown) {
  if (fila.instrumento === "b-breve") return limpiarBorradorBBreve(datos);
  if (fila.instrumento === "eapi") return limpiarBorradorEapi(datos);
  return null;
}

async function leerEnlace(token: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { supabase: null, fila: null };
  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_get", { p_token: token });
  const fila = (Array.isArray(data) ? data[0] : data) as RawGet | null;
  return { supabase, fila: error ? null : fila };
}

/**
 * Formulario de evaluación por enlace (/evaluacion/<token>). Devuelve solo el
 * instrumento, sus opciones, el estado del enlace, el avance guardado y un
 * código de caso corto: nunca datos del expediente ni puntuaciones.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-token", limit: 30, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  const { fila } = await leerEnlace(token);
  if (!fila) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  return NextResponse.json(
    {
      estado: fila.estado,
      instrumento: fila.instrumento,
      ref: fila.ref,
      opciones: { docs: conDocs(fila) },
      // Avance guardado (solo con el enlace abierto), para continuar donde se quedó.
      borrador: fila.estado === "ok" && fila.borrador ? limpiarBorrador(fila, fila.borrador) : null,
    },
    { headers: SIN_CACHE }
  );
}

/** Guardado automático del avance mientras se responde. */
export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-borrador", limit: 90, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });

  const { supabase, fila } = await leerEnlace(token);
  if (!supabase || !fila || fila.estado === "invalido") return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });
  if (fila.estado !== "ok") return NextResponse.json({ estado: fila.estado }, { headers: SIN_CACHE });
  const borrador = limpiarBorrador(fila, body);
  if (!borrador) return NextResponse.json({ error: "Instrumento no disponible." }, { status: 422 });

  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_borrador", { p_token: token, p_borrador: borrador });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ estado: data as string }, { headers: SIN_CACHE });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-token-post", limit: 10, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });

  const { supabase, fila } = await leerEnlace(token);
  if (!supabase) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  if (!fila || fila.estado === "invalido") return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });
  if (fila.estado !== "ok") return NextResponse.json({ estado: fila.estado });

  // Validación según el instrumento del enlace (no según lo que diga el cuerpo).
  let nombre = "";
  let relacion = "";
  let fecha = "";
  let guardar: Record<string, unknown>;
  let alertaSeguridad = 0;
  if (fila.instrumento === "b-breve") {
    const v = validarBBreve(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });
    if (!v.datos.nombre) return NextResponse.json({ error: "Escriba el nombre de quien responde." }, { status: 422 });
    if (!(B_BREVE_RELACIONES as readonly string[]).includes(v.datos.relacion ?? "")) {
      return NextResponse.json({ error: "Seleccione su relación con el niño o niña." }, { status: 422 });
    }
    nombre = v.datos.nombre;
    relacion = v.datos.relacion ?? "";
    fecha = v.datos.fecha ?? "";
    guardar = { ...v.datos };
  } else if (fila.instrumento === "eapi") {
    const v = validarEapi(body, conDocs(fila));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });
    if (!v.datos.nombre) return NextResponse.json({ error: "Escriba su nombre." }, { status: 422 });
    nombre = v.datos.nombre;
    relacion = "Paciente";
    fecha = v.datos.fecha;
    guardar = { ...v.datos };
    alertaSeguridad = v.datos.safety;
  } else {
    return NextResponse.json({ error: "Instrumento no disponible." }, { status: 422 });
  }
  // El código de caso y la hora de envío los pone el servidor.
  guardar = { ...guardar, ref: fila.ref ?? "", enviado: new Date().toISOString() };

  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_responder", {
    p_token: token,
    p_nombre: nombre,
    p_relacion: relacion || null,
    p_fecha: fecha || null,
    p_datos: guardar,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  if (data === "guardado") {
    // Aviso por Telegram (y alerta si marcó el ítem de seguridad), después de responder.
    after(() => avisarEvaluacionRespondida(token, alertaSeguridad));
  }
  return NextResponse.json({ estado: data as string });
}
