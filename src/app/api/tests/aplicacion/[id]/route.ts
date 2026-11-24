import { after, NextResponse } from "next/server";
import { definicion } from "@/lib/evaluaciones/registro";
import { definicionServidor } from "@/lib/evaluaciones/registro-servidor";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { esc, notificar } from "@/lib/server/telegram";
import { aplicacionDe } from "@/lib/server/tests/aplicaciones";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { testPorId } from "@/lib/tests/catalogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SIN_CACHE = { "Cache-Control": "no-store" };

/** Estado de la aplicación, opciones públicas y avance guardado (nunca puntuaciones). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ estado: "sin-sesion" }, { status: 401, headers: SIN_CACHE });
  const { id } = await params;
  const { fila } = await aplicacionDe(u.id, id);
  if (!fila) return NextResponse.json({ estado: "invalido" }, { headers: SIN_CACHE });
  return NextResponse.json(
    {
      estado: fila.completada_at ? "completa" : "ok",
      instrumento: fila.instrumento,
      consentimiento: Boolean(fila.consentimiento_at),
      opciones: definicion(fila.instrumento)?.opcionesPublicas(fila.opciones) ?? {},
      borrador: !fila.completada_at && fila.borrador ? (definicionServidor(fila.instrumento)?.limpiarBorrador(fila.borrador, fila.opciones) ?? null) : null,
    },
    { headers: SIN_CACHE }
  );
}

/** Guardado automático del avance. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(request, { key: "tests-borrador", limit: 90, windowMs: 60_000 })) return rateLimitResponse();
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await params;
  const { admin, fila } = await aplicacionDe(u.id, id);
  if (!admin || !fila) return NextResponse.json({ error: "Test no válido." }, { status: 422 });
  if (fila.completada_at) return NextResponse.json({ estado: "completa" }, { headers: SIN_CACHE });
  if (!fila.consentimiento_at) return NextResponse.json({ error: "Primero acepta el consentimiento." }, { status: 422 });
  const body = (await request.json().catch(() => null)) as unknown;
  const borrador = definicionServidor(fila.instrumento)?.limpiarBorrador(body, fila.opciones);
  if (!borrador) return NextResponse.json({ error: "Instrumento no disponible." }, { status: 422 });
  const { error } = await admin
    .from("tests_aplicaciones")
    .update({ borrador, borrador_at: new Date().toISOString() })
    .eq("id", fila.id)
    .is("completada_at", null);
  if (error) return NextResponse.json({ error: "No se pudo guardar el avance." }, { status: 422 });
  return NextResponse.json({ estado: "guardado" }, { headers: SIN_CACHE });
}

/** Envío de las respuestas completas (validadas según el instrumento de la aplicación). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(request, { key: "tests-enviar", limit: 10, windowMs: 60_000 })) return rateLimitResponse();
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await params;
  const { admin, fila } = await aplicacionDe(u.id, id);
  if (!admin || !fila) return NextResponse.json({ error: "Test no válido." }, { status: 422 });
  if (fila.completada_at) return NextResponse.json({ estado: "completa" });
  if (!fila.consentimiento_at) return NextResponse.json({ error: "Primero acepta el consentimiento." }, { status: 422 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  const def = definicionServidor(fila.instrumento);
  if (!def) return NextResponse.json({ error: "Instrumento no disponible." }, { status: 422 });
  const v = def.validar(body, fila.opciones);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  const alerta = v.alertaSeguridad > 0;
  const { data, error } = await admin
    .from("tests_aplicaciones")
    .update({ datos: { ...v.datos, enviado: new Date().toISOString() }, completada_at: new Date().toISOString(), alerta, borrador: null })
    .eq("id", fila.id)
    .is("completada_at", null)
    .select("id");
  if (error) return NextResponse.json({ error: "No se pudieron guardar tus respuestas." }, { status: 422 });
  if (!data?.length) return NextResponse.json({ estado: "completa" });
  if (alerta) {
    after(() =>
      notificar(
        "tests_alertas",
        [
          "🚨 <b>Tests en línea: alerta de seguridad</b>",
          `${esc(u.nombre)} marcó la pregunta de seguridad en «${esc(testPorId(fila.instrumento)?.nombre ?? fila.instrumento)}».`,
          `Correo: ${esc(u.correo)}${u.telefono ? ` · Teléfono: ${esc(u.telefono)}` : ""}`,
          "Se le mostraron los recursos de ayuda inmediata. Considera contactarle.",
        ].join("\n")
      )
    );
  }
  return NextResponse.json({ estado: "guardado" });
}
