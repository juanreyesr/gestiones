import { NextResponse } from "next/server";
import { getGoogleRedirectUri, isGoogleConfigured, saveTokens } from "@/lib/server/google-calendar";

export const runtime = "nodejs";

function redirectHome(request: Request, resultado: "conectado" | "error") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const response = NextResponse.redirect(`${base.replace(/\/$/, "")}/?google=${resultado}`);
  response.cookies.set("gestiones_google_state", "", { maxAge: 0, path: "/" });
  return response;
}

function decodeIdTokenEmail(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string };
    return decoded.email ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return redirectHome(request, "error");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = /(?:^|;\s*)gestiones_google_state=([^;]+)/.exec(cookieHeader)?.[1];

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectHome(request, "error");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: getGoogleRedirectUri(),
    }),
  });

  if (!tokenResponse.ok) {
    return redirectHome(request, "error");
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };

  if (!tokens.refresh_token) {
    // Sin refresh token no hay sync duradero (prompt=consent deberia evitarlo).
    return redirectHome(request, "error");
  }

  const { error } = await saveTokens({
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresInSeconds: tokens.expires_in,
    googleEmail: decodeIdTokenEmail(tokens.id_token),
  });

  return redirectHome(request, error ? "error" : "conectado");
}
