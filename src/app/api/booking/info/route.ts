import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!rateLimit(request, { key: "booking-info", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ activo: false, duracionMin: 50, zonaHoraria: "America/Guatemala" });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_booking_info");
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return NextResponse.json({ activo: false, duracionMin: 50, zonaHoraria: "America/Guatemala" });
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    activo: boolean;
    duracion_min: number;
    zona_horaria: string;
    consentimiento_texto: string | null;
  };

  return NextResponse.json(
    {
      activo: row.activo,
      duracionMin: row.duracion_min,
      zonaHoraria: row.zona_horaria,
      consentimientoTexto: row.consentimiento_texto,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
