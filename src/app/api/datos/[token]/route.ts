import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "datos-token", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { token } = await params;
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ estado: "invalido" });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ estado: "invalido" });

  const { data, error } = await supabase.rpc("gestionesjj_public_datos_get", { p_token: token });
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return NextResponse.json({ estado: "invalido" });
  }
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(row, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "datos-token", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { token } = await params;
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ estado: "invalido" }, { status: 422 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, string | null> | null;
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "No disponible." }, { status: 503 });

  const opt = (key: string) => (typeof body[key] === "string" && body[key]!.trim() !== "" ? body[key] : null);

  const { data, error } = await supabase.rpc("gestionesjj_public_datos_save", {
    p_token: token,
    p_nombre: body.nombre ?? "",
    p_telefono: body.telefono ?? "",
    p_email: opt("email"),
    p_fecha_nacimiento: opt("fechaNacimiento"),
    p_genero: opt("genero"),
    p_ocupacion: opt("ocupacion"),
    p_escolaridad: opt("escolaridad"),
    p_estado_civil: opt("estadoCivil"),
    p_direccion: opt("direccion"),
    p_emergencia_nombre: opt("emergenciaNombre"),
    p_emergencia_telefono: opt("emergenciaTelefono"),
    p_emergencia_relacion: opt("emergenciaRelacion"),
    p_motivo_consulta: opt("motivoConsulta"),
    p_antecedentes_medicos: opt("antecedentesMedicos"),
    p_antecedentes_psicologicos: opt("antecedentesPsicologicos"),
    p_antecedentes_familiares: opt("antecedentesFamiliares"),
    p_medicacion_actual: opt("medicacionActual"),
    p_referido_por: opt("referidoPor"),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
  return NextResponse.json({ estado: data as string });
}
