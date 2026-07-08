import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { getGoogleRedirectUri, isGoogleConfigured } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ");

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google Calendar no está configurado en el servidor." }, { status: 503 });
  }

  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const response = NextResponse.json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
  response.cookies.set("gestiones_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
