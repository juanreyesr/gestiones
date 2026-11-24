import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { aplicacionDe } from "@/lib/server/tests/aplicaciones";
import { VERSION_CONSENTIMIENTO } from "@/lib/tests/catalogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Registra que la persona aceptó el consentimiento del test (no es un diagnóstico). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await params;
  const { admin, fila } = await aplicacionDe(u.id, id);
  if (!admin || !fila) return NextResponse.json({ error: "Test no válido." }, { status: 422 });
  if (!fila.consentimiento_at) {
    await admin
      .from("tests_aplicaciones")
      .update({ consentimiento_at: new Date().toISOString(), consentimiento_version: VERSION_CONSENTIMIENTO })
      .eq("id", fila.id);
  }
  return NextResponse.json({ ok: true });
}
