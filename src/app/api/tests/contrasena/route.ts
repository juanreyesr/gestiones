import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { cifrarContrasena, errorContrasena, iniciarSesion, usuarioActual, verificarContrasena } from "@/lib/server/tests/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cambio de contraseña (pide la actual). Cierra las demás sesiones y renueva la de este dispositivo. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "tests-contrasena", limit: 5, windowMs: 10 * 60_000 })) return rateLimitResponse();
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { actual?: unknown; nueva?: unknown } | null;
  const actual = typeof b?.actual === "string" ? b.actual : "";
  const nueva = typeof b?.nueva === "string" ? b.nueva : "";
  const err = errorContrasena(nueva);
  if (err) return NextResponse.json({ error: err }, { status: 422 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const { data } = await admin.from("tests_usuarios").select("password_hash,sesion_version").eq("id", u.id).maybeSingle();
  const fila = data as { password_hash: string; sesion_version: number } | null;
  if (!fila || !(await verificarContrasena(actual, fila.password_hash))) return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 422 });
  const version = fila.sesion_version + 1;
  const { error } = await admin.from("tests_usuarios").update({ password_hash: await cifrarContrasena(nueva), sesion_version: version }).eq("id", u.id);
  if (error) return NextResponse.json({ error: "No se pudo cambiar." }, { status: 500 });
  await iniciarSesion(u.id, version);
  return NextResponse.json({ ok: true });
}
