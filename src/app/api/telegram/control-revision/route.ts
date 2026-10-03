import { NextResponse } from "next/server";
import type { TipoEvaluacion } from "@/lib/control-revision";
import { ocasionPara } from "@/lib/control-revision-mensajes";
import { requireOwner } from "@/lib/server/auth";
import { enviarAvisosControlRevision, enviarAvisosPeriodo } from "@/lib/server/control-revision-avisos";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro, fechaLocal, isTelegramConfigured, leerConfig } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Avisos del control de revision de evaluaciones.
 * - pg_cron (migracion 049) la llama a las 7:00 p. m. de Guatemala con
 *   Authorization: Bearer <CRON_SECRET>: avisa el dia limite y el lunes siguiente.
 * - Desde la vista, el owner la llama con su token y { anio, trimestre, tipo }
 *   para mandar los avisos de ese periodo en el momento.
 */
export async function POST(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const esCron = !!secreto && comparaSeguro(header, `Bearer ${secreto}`);

  let ownerId: string | null = null;
  if (!esCron) {
    const auth = await requireOwner(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    ownerId = auth.ownerId;
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isTelegramConfigured()) {
    return esCron
      ? NextResponse.json({ status: "no_configurado" })
      : NextResponse.json({ error: "Telegram no está configurado." }, { status: 500 });
  }
  const config = await leerConfig();
  if (!config?.chatId) {
    return esCron
      ? NextResponse.json({ status: "sin_vincular" })
      : NextResponse.json({ error: "Telegram no está vinculado. Conéctalo desde el menú principal." }, { status: 400 });
  }

  if (esCron) {
    const enviados = await enviarAvisosControlRevision(admin, config);
    return NextResponse.json({ status: "ok", enviados });
  }

  const body = (await request.json().catch(() => null)) as {
    anio?: number;
    trimestre?: number;
    tipo?: string;
    docentes?: unknown;
  } | null;
  const anio = Number(body?.anio);
  const trimestre = Number(body?.trimestre);
  const tipo = body?.tipo;
  if (!Number.isInteger(anio) || ![1, 2, 3].includes(trimestre) || (tipo !== "parcial" && tipo !== "final")) {
    return NextResponse.json({ error: "Periodo no válido." }, { status: 400 });
  }
  // Docentes elegidos en la vista; sin lista se avisa a todos.
  const docentes =
    body?.docentes === undefined
      ? undefined
      : Array.isArray(body.docentes) && body.docentes.every((d) => typeof d === "string")
        ? (body.docentes as string[])
        : null;
  if (docentes === null || (docentes && !docentes.length)) {
    return NextResponse.json({ error: "Elige al menos un docente." }, { status: 400 });
  }

  const { data: periodo } = await admin
    .from("gestionesjj_control_revision_periodos")
    .select("anio,trimestre,tipo,fecha_limite")
    .eq("created_by", ownerId)
    .eq("anio", anio)
    .eq("trimestre", trimestre)
    .eq("tipo", tipo)
    .maybeSingle();
  if (!periodo) return NextResponse.json({ error: "Primero indica la fecha límite de entrega." }, { status: 400 });

  const fila = periodo as { anio: number; trimestre: number; tipo: TipoEvaluacion; fecha_limite: string };
  const ocasion = ocasionPara(fila.fecha_limite, fechaLocal());
  const res = await enviarAvisosPeriodo(admin, config.chatId, fila, ocasion, true, docentes);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ status: "ok", enviados: res.enviados });
}
