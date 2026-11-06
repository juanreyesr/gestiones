import { after, NextResponse } from "next/server";
import { plantillaVigente } from "@/lib/clinica/consentimiento-plantillas";
import { modulosDeOpciones } from "@/lib/evaluaciones/eapi/codigo";
import { definicionServidor } from "@/lib/evaluaciones/registro-servidor";
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
  consentimiento?: boolean | null;
  es_menor?: boolean | null;
  paciente_nombre?: string | null;
  identificacion?: string | null;
  responsables?: unknown;
};

/** Escalas del EAPI asignadas al enlace (los enlaces anteriores usaban { docs: true }). */
const modulosEapi = (fila: RawGet) => modulosDeOpciones(fila.opciones);

/** Limpia el avance según el instrumento del enlace. */
function limpiarBorrador(fila: RawGet, datos: unknown) {
  return definicionServidor(fila.instrumento)?.limpiarBorrador(datos) ?? null;
}

async function leerEnlace(token: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { supabase: null, fila: null };
  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_get", { p_token: token });
  const fila = (Array.isArray(data) ? data[0] : data) as RawGet | null;
  return { supabase, fila: error ? null : fila };
}

/**
 * Formulario de evaluación por enlace (/evaluacion/<token>). Devuelve el
 * instrumento, sus opciones, el estado del enlace, el avance guardado y un
 * código de caso corto; nunca puntuaciones. Si el paciente aún no firmó el
 * consentimiento informado, devuelve también lo necesario para firmarlo
 * (plantilla vigente, nombre, si es menor y firmantes ya registrados).
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-token", limit: 30, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  const { fila } = await leerEnlace(token);
  if (!fila) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  // Enlaces sin la columna (migración anterior) se tratan como firmados.
  const sinConsentimiento = fila.estado === "ok" && fila.consentimiento === false;
  return NextResponse.json(
    {
      estado: fila.estado,
      consentimiento: sinConsentimiento
        ? {
            firmado: false,
            esMenor: fila.es_menor === true,
            pacienteNombre: fila.paciente_nombre ?? "",
            identificacion: fila.identificacion ?? "",
            responsables: Array.isArray(fila.responsables) ? fila.responsables.slice(0, 2) : [],
            plantilla: await plantillaVigente(),
          }
        : { firmado: true },
      instrumento: fila.instrumento,
      ref: fila.ref,
      opciones: fila.instrumento === "eapi" ? { modulos: modulosEapi(fila) } : {},
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
  const definicion = definicionServidor(fila.instrumento);
  if (!definicion) return NextResponse.json({ error: "Instrumento no disponible." }, { status: 422 });
  const v = definicion.validar(body, fila.opciones);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });
  const { nombre, relacion, alertaSeguridad } = v;
  // El código de caso y la hora de envío los pone el servidor; el nombre del
  // paciente, la fecha y la edad, la base de datos (desde el expediente).
  const guardar = { ...v.datos, ref: fila.ref ?? "", enviado: new Date().toISOString() };

  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_responder", {
    p_token: token,
    p_nombre: nombre,
    p_relacion: relacion || null,
    p_fecha: null,
    p_datos: guardar,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  if (data === "guardado") {
    // Aviso por Telegram (y alerta si marcó el ítem de seguridad), después de responder.
    after(() => avisarEvaluacionRespondida(token, alertaSeguridad));
  }
  return NextResponse.json({ estado: data as string });
}
