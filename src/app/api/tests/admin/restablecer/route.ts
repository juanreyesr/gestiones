import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { cifrarContrasena } from "@/lib/server/tests/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Solo el propietario: genera una contraseña temporal para una persona de la plataforma
 * de tests (se la comparte por WhatsApp o correo). Cierra sus sesiones abiertas.
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = (await request.json().catch(() => null)) as { usuarioId?: unknown } | null;
  const usuarioId = typeof b?.usuarioId === "string" ? b.usuarioId : "";
  if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) return NextResponse.json({ error: "Persona no válida." }, { status: 422 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const { data } = await admin.from("tests_usuarios").select("sesion_version").eq("id", usuarioId).maybeSingle();
  if (!data) return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  // 10 caracteres legibles + un número garantizado (cumple la regla de letra y número).
  const temporal = `${randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 9)}${Math.floor(Math.random() * 10)}`;
  const { error } = await admin
    .from("tests_usuarios")
    .update({ password_hash: await cifrarContrasena(temporal), sesion_version: (data as { sesion_version: number }).sesion_version + 1 })
    .eq("id", usuarioId);
  if (error) return NextResponse.json({ error: "No se pudo restablecer." }, { status: 500 });
  return NextResponse.json({ temporal });
}
