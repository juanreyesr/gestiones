import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Versión publicada (commit del despliegue). La usa AvisoVersionNueva para
 * detectar pestañas abiertas con una versión anterior de la plataforma.
 */
export function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
