import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { iniciarSesion, verificarContrasena } from "@/lib/server/tests/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inicio de sesión de la plataforma de tests (correo y contraseña). */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "tests-ingreso", limit: 10, windowMs: 10 * 60_000 })) return rateLimitResponse();
  const b = (await request.json().catch(() => null)) as { correo?: unknown; contrasena?: unknown } | null;
  const correo = typeof b?.correo === "string" ? b.correo.trim().toLowerCase().slice(0, 200) : "";
  const contrasena = typeof b?.contrasena === "string" ? b.contrasena.slice(0, 200) : "";
  const fallo = NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  if (!correo || !contrasena) return fallo;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible por el momento." }, { status: 503 });
  const { data } = await admin.from("tests_usuarios").select("id,password_hash,sesion_version").eq("correo", correo).maybeSingle();
  const u = data as { id: string; password_hash: string; sesion_version: number } | null;
  if (!u || !(await verificarContrasena(contrasena, u.password_hash))) return fallo;
  await admin.from("tests_usuarios").update({ ultimo_ingreso_at: new Date().toISOString() }).eq("id", u.id);
  if (!(await iniciarSesion(u.id, u.sesion_version))) return NextResponse.json({ error: "No se pudo iniciar la sesión." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
