import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { aplicacionPendiente, crearOrden, isPayPalOrdenesConfigurado } from "@/lib/server/tests/compras";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { testPorId } from "@/lib/tests/catalogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia la compra de un test. Si la persona ya pagó este test y no lo ha terminado,
 * devuelve esa aplicación para continuarla (no se cobra dos veces).
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "tests-compra", limit: 20, windowMs: 10 * 60_000 })) return rateLimitResponse();
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { instrumento?: unknown } | null;
  const test = testPorId(typeof b?.instrumento === "string" ? b.instrumento : null);
  if (!test) return NextResponse.json({ error: "Test no disponible." }, { status: 422 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible por el momento." }, { status: 503 });
  const pendiente = await aplicacionPendiente(admin, u.id, test.id);
  if (pendiente) return NextResponse.json({ aplicacionId: pendiente });
  if (!isPayPalOrdenesConfigurado()) return NextResponse.json({ error: "El pago en línea no está disponible en este momento." }, { status: 503 });
  const r = await crearOrden(admin, u.id, test.id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ orderId: r.orderId });
}
