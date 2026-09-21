import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  if (!rateLimit(request, { key: "cursos-asignacion-info", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ estado: "invalido" });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ estado: "error" });
  }

  const { data, error } = await supabase.rpc("gestionesjj_curso_asignacion_info", { p_token: token });
  const fila = (Array.isArray(data) ? data[0] : data) as
    | { curso_nombre: string; universidad_nombre: string; docente_nombre: string | null; activa: boolean }
    | null;

  if (error || !fila) {
    return NextResponse.json({ estado: "invalido" });
  }

  return NextResponse.json(
    {
      estado: fila.activa ? "activo" : "inactivo",
      cursoNombre: fila.curso_nombre,
      universidadNombre: fila.universidad_nombre,
      docenteNombre: fila.docente_nombre,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
