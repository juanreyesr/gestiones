import { NextResponse } from "next/server";
import { informeVencido, leerInformePaciente } from "@/lib/evaluaciones/informe-paciente";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_CACHE = { "Cache-Control": "no-store" };

/** Informe publicado para el paciente: solo la copia fija que publicó el psicólogo. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "informe-token", limit: 30, windowMs: 60_000 })) return rateLimitResponse();
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  // Primero los informes de una evaluación; si no, el informe de avance (evolución, migración 065).
  let informe = null;
  for (const rpc of ["gestionesjj_public_informe_get", "gestionesjj_public_informe_avance_get"]) {
    const { data, error } = await supabase.rpc(rpc, { p_token: token });
    const fila = (Array.isArray(data) ? data[0] : data) as { estado: string; contenido: unknown } | null;
    informe = !error && fila?.estado === "ok" ? leerInformePaciente(fila.contenido) : null;
    if (informe) break;
  }
  if (!informe) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  // Informes con vigencia (p. ej. intereses vocacionales, 6 meses): después el enlace se desactiva.
  if (informeVencido(informe)) return NextResponse.json({ estado: "vencido", vigenteHasta: informe.vigenteHasta }, { headers: SIN_CACHE });
  return NextResponse.json({ estado: "ok", informe }, { headers: SIN_CACHE });
}
