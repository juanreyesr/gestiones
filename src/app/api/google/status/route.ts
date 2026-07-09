import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getStoredTokens, isGoogleConfigured } from "@/lib/server/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json({ configurado: false, conectado: false, googleEmail: null, estado: null });
  }

  const tokens = await getStoredTokens();
  return NextResponse.json({
    configurado: true,
    conectado: Boolean(tokens),
    googleEmail: tokens?.google_email ?? null,
    estado: tokens?.estado ?? null,
  });
}
