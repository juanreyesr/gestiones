import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { deleteTokens, getStoredTokens } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tokens = await getStoredTokens();
  if (tokens) {
    // Revocacion best-effort: aunque falle, borramos los tokens locales.
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokens.refresh_token)}`, {
      method: "POST",
    }).catch(() => null);
  }
  await deleteTokens();

  return NextResponse.json({ ok: true });
}
