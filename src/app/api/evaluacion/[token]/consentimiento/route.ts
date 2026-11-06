import { NextResponse } from "next/server";
import { consentimientoComoTexto, type Responsable } from "@/lib/clinica/consentimiento";
import { plantillaVigente } from "@/lib/clinica/consentimiento-plantillas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Firma del consentimiento informado desde el enlace de una evaluación, para
 * pacientes que aún no lo firmaron. El texto que queda como constancia se arma
 * aquí con la plantilla vigente y los datos del expediente (no se acepta el
 * que mande el navegador).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "evaluacion-consentir", limit: 10, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ error: "Enlace no válido." }, { status: 422 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.acepta !== true) {
    return NextResponse.json({ error: "Para continuar debe leer y aceptar el consentimiento informado." }, { status: 422 });
  }
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "No disponible." }, { status: 503 });

  const { data: info } = await supabase.rpc("gestionesjj_public_evaluacion_get", { p_token: token });
  const fila = (Array.isArray(info) ? info[0] : info) as {
    estado: string;
    consentimiento?: boolean | null;
    es_menor?: boolean | null;
    paciente_nombre?: string | null;
  } | null;
  if (!fila || fila.estado !== "ok") return NextResponse.json({ estado: fila?.estado ?? "invalido" });
  if (fila.consentimiento !== false) return NextResponse.json({ estado: "ya_firmado" });

  const esMenor = fila.es_menor === true;
  const recortar = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const responsables: Responsable[] =
    esMenor && Array.isArray(body.responsables)
      ? (body.responsables as unknown[])
          .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
          .map((r) => ({
            nombre: recortar(r.nombre, 120),
            tipoIdentificacion: recortar(r.tipoIdentificacion, 30),
            identificacion: recortar(r.identificacion, 40),
            parentesco: recortar(r.parentesco, 40),
            telefono: recortar(r.telefono, 30),
          }))
          .filter((r) => r.nombre !== "" || r.identificacion !== "")
          .slice(0, 2)
      : [];
  const identificacion = esMenor ? "" : recortar(body.identificacion, 40);
  const plantilla = await plantillaVigente(supabase);
  const texto = consentimientoComoTexto(
    { esMenor, pacienteNombre: fila.paciente_nombre ?? "", pacienteIdentificacion: identificacion, responsables },
    plantilla
  );

  const { data, error } = await supabase.rpc("gestionesjj_public_evaluacion_consentir", {
    p_token: token,
    p_version: plantilla.version,
    p_texto: texto,
    p_identificacion: identificacion || null,
    p_responsables: responsables,
    p_asentimiento_menor: esMenor ? body.asentimientoMenor === true : null,
    p_declara_tutela: esMenor ? body.declaraTutela === true : null,
    p_ip: getClientIp(request).slice(0, 64),
    p_user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ estado: data as string }, { headers: { "Cache-Control": "no-store" } });
}
