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

/** El estudiante guarda su ficha de perfil (fecha de nacimiento, país y las tres preguntas de reflexión). */
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
  const quienSoy = textoOpcional(body?.reflexionQuienSoy, MAX_TEXTO);
  const proposito = textoOpcional(body?.reflexionProposito, MAX_TEXTO);
  const recuerdo = textoOpcional(body?.reflexionRecuerdo, MAX_TEXTO);
  if (!pais.ok || !quienSoy.ok || !proposito.ok || !recuerdo.ok) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { error } = await admin
    .from("gestionesjj_estudiantes")
    .update({
      fecha_nacimiento: fechaNacimiento || null,
      pais: pais.valor,
      reflexion_quien_soy: quienSoy.valor,
      reflexion_proposito: proposito.valor,
      reflexion_recuerdo: recuerdo.valor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.estudianteId);
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar tu perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
