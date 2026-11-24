import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { AREAS_TESTS } from "@/lib/tests/catalogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cambia el permiso de contacto y los intereses de la persona. */
export async function POST(request: Request) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { aceptaContacto?: unknown; intereses?: unknown } | null;
  const ids = new Set(AREAS_TESTS.map((a) => a.id as string));
  const acepta = b?.aceptaContacto === true;
  const intereses = Array.isArray(b?.intereses) ? [...new Set(b.intereses.filter((x): x is string => typeof x === "string" && ids.has(x)))] : u.intereses;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const { error } = await admin
    .from("tests_usuarios")
    .update({ acepta_contacto: acepta, acepta_contacto_at: acepta ? new Date().toISOString() : null, intereses })
    .eq("id", u.id);
  if (error) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
