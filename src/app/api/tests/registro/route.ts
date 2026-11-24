import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { cifrarContrasena, edadDe, errorContrasena, iniciarSesion } from "@/lib/server/tests/sesion";
import { AREAS_TESTS, EDAD_MINIMA, VERSION_CONSENTIMIENTO } from "@/lib/tests/catalogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** Crea la cuenta de la plataforma de tests (no es una cuenta de Supabase: ver migración 072). */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "tests-registro", limit: 5, windowMs: 10 * 60_000 })) return rateLimitResponse();
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const nombre = texto(b.nombre, 160);
  const correo = texto(b.correo, 200).toLowerCase();
  const contrasena = typeof b.contrasena === "string" ? b.contrasena : "";
  const fecha = typeof b.fechaNacimiento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.fechaNacimiento) ? b.fechaNacimiento : "";
  if (nombre.length < 2) return NextResponse.json({ error: "Escribe tu nombre completo." }, { status: 422 });
  if (!CORREO_RE.test(correo)) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 422 });
  const errC = errorContrasena(contrasena);
  if (errC) return NextResponse.json({ error: errC }, { status: 422 });
  if (!fecha) return NextResponse.json({ error: "Indica tu fecha de nacimiento." }, { status: 422 });
  const edad = edadDe(fecha);
  if (!Number.isFinite(edad) || edad > 110 || edad < 0) return NextResponse.json({ error: "Revisa tu fecha de nacimiento." }, { status: 422 });
  if (edad < EDAD_MINIMA) {
    return NextResponse.json({ error: `Los tests en línea son para personas de ${EDAD_MINIMA} años o más. Para menores, la evaluación se hace en consulta con sus padres o encargados.` }, { status: 422 });
  }
  if (b.consentimiento !== true) return NextResponse.json({ error: "Para crear tu cuenta debes aceptar el uso de tus datos." }, { status: 422 });
  const aceptaContacto = b.aceptaContacto === true;
  const ids = new Set(AREAS_TESTS.map((a) => a.id as string));
  const intereses = Array.isArray(b.intereses) ? [...new Set(b.intereses.filter((x): x is string => typeof x === "string" && ids.has(x)))] : [];

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible por el momento." }, { status: 503 });
  const ahora = new Date().toISOString();
  const { data, error } = await admin
    .from("tests_usuarios")
    .insert({
      nombre,
      correo,
      fecha_nacimiento: fecha,
      pais: texto(b.pais, 60) || null,
      telefono: texto(b.telefono, 40) || null,
      genero: texto(b.genero, 40) || null,
      ocupacion: texto(b.ocupacion, 120) || null,
      password_hash: await cifrarContrasena(contrasena),
      consentimiento_datos_at: ahora,
      consentimiento_version: VERSION_CONSENTIMIENTO,
      acepta_contacto: aceptaContacto,
      acepta_contacto_at: aceptaContacto ? ahora : null,
      intereses,
      ultimo_ingreso_at: ahora,
    })
    .select("id,sesion_version")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ya existe una cuenta con ese correo. Inicia sesión." }, { status: 409 });
    if (error.code === "42P01" || error.code === "PGRST205") return NextResponse.json({ error: "La plataforma aún no está habilitada." }, { status: 503 });
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
  const u = data as { id: string; sesion_version: number };
  if (!(await iniciarSesion(u.id, u.sesion_version))) return NextResponse.json({ error: "No se pudo iniciar la sesión." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
