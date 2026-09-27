import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { resolverCoordenadas } from "@/lib/server/ubicacion-maps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Coordenadas del consultorio a partir del enlace de Google Maps guardado en
 * Configuracion (los enlaces cortos maps.app.goo.gl solo se pueden resolver
 * desde el servidor). No recibe URLs: lee la configuracion guardada.
 */
export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ coordenadas: null });
  const { data } = await admin.from("gestionesjj_disponibilidad").select("ubicacion_maps_url").limit(1).maybeSingle();
  const coordenadas = await resolverCoordenadas((data as { ubicacion_maps_url?: string | null } | null)?.ubicacion_maps_url ?? null);
  return NextResponse.json({ coordenadas }, { headers: { "Cache-Control": "no-store" } });
}
