import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { capturarOrden } from "@/lib/server/tests/compras";
import { usuarioActual } from "@/lib/server/tests/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirma el pago aprobado en PayPal y devuelve la aplicación del test. */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "tests-captura", limit: 20, windowMs: 10 * 60_000 })) return rateLimitResponse();
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof b?.orderId === "string" && /^[A-Z0-9]{5,40}$/.test(b.orderId) ? b.orderId : null;
  if (!orderId) return NextResponse.json({ error: "Orden no válida." }, { status: 422 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const r = await capturarOrden(admin, u.id, orderId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ aplicacionId: r.aplicacionId });
}
