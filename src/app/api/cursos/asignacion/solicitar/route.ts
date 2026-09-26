import { after, NextResponse } from "next/server";
import { cifrarContrasena } from "@/lib/server/estudiante-crypto";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { avisarSolicitudCurso } from "@/lib/server/telegram-avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Alguien que escaneo el QR/abrio el enlace de un curso pide asignarse.
 * Nunca queda inscrito de inmediato: se guarda como solicitud pendiente
 * para que el docente la revise, le asigne carné y la apruebe.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "cursos-asignacion-solicitar", limit: 5, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    nombre?: string;
    correo?: string;
    contrasena?: string;
    empresa?: string; // honeypot: las personas nunca lo llenan
  } | null;

  if (!body || !UUID_RE.test(body.token ?? "")) {
    return NextResponse.json({ error: "Enlace inválido." }, { status: 422 });
  }

  // Bot detectado: responder como exito sin guardar nada.
  if (body.empresa && body.empresa.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const correo = typeof body.correo === "string" ? body.correo.trim().toLowerCase() : "";
  const contrasena = typeof body.contrasena === "string" ? body.contrasena : "";

  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 422 });
  }
  if (!CORREO_RE.test(correo)) {
    return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 422 });
  }
  if (contrasena.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });
  }

  const { data: curso, error: cursoError } = await admin
    .from("gestionesjj_cursos_impartidos")
    .select("id, autoasignacion_activa")
    .eq("autoasignacion_token", body.token)
    .maybeSingle();
  if (cursoError || !curso || !curso.autoasignacion_activa) {
    return NextResponse.json({ error: "Este curso no está aceptando solicitudes en este momento." }, { status: 404 });
  }

  const { data: yaInscrito } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("id")
    .eq("curso_id", curso.id)
    .eq("estado", "activo")
    .ilike("correo", correo)
    .maybeSingle();
  if (yaInscrito) {
    return NextResponse.json({ error: "Ya hay un estudiante inscrito en este curso con ese correo." }, { status: 409 });
  }

  const { data: pendiente } = await admin
    .from("gestionesjj_curso_solicitudes")
    .select("id")
    .eq("curso_id", curso.id)
    .eq("estado", "pendiente")
    .ilike("correo", correo)
    .maybeSingle();
  if (pendiente) {
    return NextResponse.json({ error: "Ya hay una solicitud pendiente con ese correo para este curso." }, { status: 409 });
  }

  const { valor: contrasenaCifrada, error: cifradoError } = cifrarContrasena(contrasena);
  if (cifradoError) return NextResponse.json({ error: cifradoError }, { status: 500 });

  const { error: insertError } = await admin.from("gestionesjj_curso_solicitudes").insert({
    curso_id: curso.id,
    nombre,
    correo,
    contrasena_cifrada: contrasenaCifrada,
  });
  if (insertError) {
    return NextResponse.json({ error: "No se pudo enviar la solicitud." }, { status: 500 });
  }

  const cursoId = curso.id as string;
  after(() => avisarSolicitudCurso({ cursoId, nombre, correo }).catch(() => undefined));

  return NextResponse.json({ ok: true });
}
