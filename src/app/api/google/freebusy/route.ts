import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getStoredTokens, isGoogleConfigured, queryFreeBusy } from "@/lib/server/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json({ conectado: false, busy: [] });
  }
  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado !== "conectado") {
    return NextResponse.json({ conectado: false, busy: [] });
  }

  const url = new URL(request.url);
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");
  if (!desde || !hasta || Number.isNaN(Date.parse(desde)) || Number.isNaN(Date.parse(hasta))) {
    return NextResponse.json({ error: "Rango inválido." }, { status: 422 });
  }

  const { busy, error } = await queryFreeBusy(new Date(desde).toISOString(), new Date(hasta).toISOString());
  if (error) {
    return NextResponse.json({ conectado: true, busy: [], error });
  }
  return NextResponse.json({ conectado: true, busy });
}
