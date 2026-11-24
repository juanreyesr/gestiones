import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/server/tests/sesion";

export const runtime = "nodejs";

export async function POST() {
  await cerrarSesion();
  return NextResponse.json({ ok: true });
}
