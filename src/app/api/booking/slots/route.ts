import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";
import { isGoogleConfigured, queryFreeBusy } from "@/lib/server/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function seTraslapan(aInicio: string, aFin: string, bInicio: string, bFin: string) {
  return new Date(aInicio) < new Date(bFin) && new Date(bInicio) < new Date(aFin);
}

export async function GET(request: Request) {
  if (!rateLimit(request, { key: "booking-slots", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const url = new URL(request.url);
  const desde = url.searchParams.get("desde") ?? "";
  const hasta = url.searchParams.get("hasta") ?? "";
  if (!DATE_RE.test(desde) || !DATE_RE.test(hasta)) {
    return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ slots: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_slots", {
    p_desde: desde,
    p_hasta: hasta,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo obtener la disponibilidad." }, { status: 500 });
  }

  let slots = ((data ?? []) as { inicio: string; fin: string }[]).map((slot) => ({
    inicio: slot.inicio,
    fin: slot.fin,
  }));

  // Si Google Calendar esta conectado, resta tambien sus eventos ocupados.
  // La ventana de freebusy se calcula desde los propios slots (ya vienen en UTC),
  // asi cubre correctamente cualquier zona horaria del consultorio.
  if (isGoogleConfigured() && slots.length > 0) {
    const inicios = slots.map((slot) => new Date(slot.inicio).getTime());
    const fines = slots.map((slot) => new Date(slot.fin).getTime());
    const { busy } = await queryFreeBusy(
      new Date(Math.min(...inicios)).toISOString(),
      new Date(Math.max(...fines)).toISOString()
    );
    if (busy.length > 0) {
      slots = slots.filter(
        (slot) => !busy.some((block) => seTraslapan(slot.inicio, slot.fin, block.inicio, block.fin))
      );
    }
  }

  return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
