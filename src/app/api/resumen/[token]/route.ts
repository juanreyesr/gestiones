import { NextResponse } from "next/server";
import type { EvaluacionRow } from "@/lib/evaluacion-helpers";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Lo que devuelve la RPC: la evaluacion ya despersonalizada (sin correo del
   docente ni observaciones escritas, y sin nombre salvo que el enlace lo
   habilite). Se completa aqui con los campos que el panel compartido espera. */
type FilaPublica = Omit<EvaluacionRow, "docente_correo" | "observaciones" | "created_at">;

type RespuestaRpc = {
  estado: "ok" | "inactivo" | "invalido";
  etiqueta: string | null;
  mostrar_docentes: boolean;
  evaluaciones: FilaPublica[] | null;
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "resumen-token", limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { token } = await params;
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ estado: "invalido" }, { headers: { "Cache-Control": "no-store" } });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_resumen_coordinacion", { p_token: token });
  if (error) {
    return NextResponse.json({ error: "No se pudo consultar el resumen." }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as RespuestaRpc | null;
  if (!row || row.estado !== "ok") {
    return NextResponse.json(
      { estado: row?.estado ?? "invalido" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const evaluaciones: EvaluacionRow[] = (row.evaluaciones ?? []).map((fila) => ({
    ...fila,
    docente_correo: null,
    observaciones: null,
    created_at: "",
  }));

  return NextResponse.json(
    {
      estado: "ok",
      etiqueta: row.etiqueta ?? "",
      mostrarDocentes: row.mostrar_docentes,
      evaluaciones,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
