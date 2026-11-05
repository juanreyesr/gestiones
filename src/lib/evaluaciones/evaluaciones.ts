import { getSupabaseClient } from "@/lib/supabase";

/** Funciones del panel del psicólogo (requieren su sesión; RLS owner-only). */

export type EvaluacionEstado = "abierta" | "completa" | "cerrada";

export type EvaluacionRow = {
  id: string;
  pacienteId: string;
  instrumento: string;
  token: string;
  respuestasPermitidas: number;
  estado: EvaluacionEstado;
  nota: string | null;
  createdAt: string;
};

export type EvaluacionRespuestaRow = {
  id: string;
  evaluacionId: string | null;
  pacienteId: string;
  instrumento: string;
  respondienteNombre: string;
  respondienteRelacion: string | null;
  fecha: string | null;
  datos: Record<string, unknown>;
  origen: "enlace" | "codigo";
  createdAt: string;
};

type RawEvaluacion = {
  id: string;
  paciente_id: string;
  instrumento: string;
  token: string;
  respuestas_permitidas: number;
  estado: EvaluacionEstado;
  nota: string | null;
  created_at: string;
};

type RawRespuesta = {
  id: string;
  evaluacion_id: string | null;
  paciente_id: string;
  instrumento: string;
  respondiente_nombre: string;
  respondiente_relacion: string | null;
  fecha: string | null;
  datos: Record<string, unknown>;
  origen: "enlace" | "codigo";
  created_at: string;
};

const mapEvaluacion = (r: RawEvaluacion): EvaluacionRow => ({
  id: r.id,
  pacienteId: r.paciente_id,
  instrumento: r.instrumento,
  token: r.token,
  respuestasPermitidas: r.respuestas_permitidas,
  estado: r.estado,
  nota: r.nota,
  createdAt: r.created_at,
});

const mapRespuesta = (r: RawRespuesta): EvaluacionRespuestaRow => ({
  id: r.id,
  evaluacionId: r.evaluacion_id,
  pacienteId: r.paciente_id,
  instrumento: r.instrumento,
  respondienteNombre: r.respondiente_nombre,
  respondienteRelacion: r.respondiente_relacion,
  fecha: r.fecha,
  datos: r.datos ?? {},
  origen: r.origen,
  createdAt: r.created_at,
});

const SIN_SUPABASE = "Faltan las variables de Supabase.";

export async function fetchEvaluacionesDePaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { evaluaciones: [] as EvaluacionRow[], respuestas: [] as EvaluacionRespuestaRow[], error: SIN_SUPABASE };
  const [ev, resp] = await Promise.all([
    supabase
      .from("gestionesjj_evaluaciones")
      .select("id,paciente_id,instrumento,token,respuestas_permitidas,estado,nota,created_at")
      .eq("paciente_id", pacienteId)
      .order("created_at", { ascending: false }),
    supabase
      .from("gestionesjj_evaluacion_respuestas")
      .select("id,evaluacion_id,paciente_id,instrumento,respondiente_nombre,respondiente_relacion,fecha,datos,origen,created_at")
      .eq("paciente_id", pacienteId)
      .order("created_at", { ascending: false }),
  ]);
  return {
    evaluaciones: ((ev.data ?? []) as RawEvaluacion[]).map(mapEvaluacion),
    respuestas: ((resp.data ?? []) as RawRespuesta[]).map(mapRespuesta),
    error: ev.error?.message ?? resp.error?.message ?? null,
  };
}

export async function asignarEvaluacion(pacienteId: string, instrumento: string, respuestasPermitidas: number, nota: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as EvaluacionRow | null, error: SIN_SUPABASE };
  const { data, error } = await supabase
    .from("gestionesjj_evaluaciones")
    .insert({
      paciente_id: pacienteId,
      instrumento,
      respuestas_permitidas: Math.min(6, Math.max(1, Math.round(respuestasPermitidas))),
      nota: nota.trim() || null,
    })
    .select("id,paciente_id,instrumento,token,respuestas_permitidas,estado,nota,created_at")
    .single();
  return { data: data ? mapEvaluacion(data as RawEvaluacion) : null, error: error?.message ?? null };
}

/** Cerrar el enlace (ya no acepta respuestas) o reabrirlo con un envío más. */
export async function cambiarEstadoEvaluacion(ev: EvaluacionRow, accion: "cerrar" | "reabrir", usadas: number) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const cambios =
    accion === "cerrar"
      ? { estado: "cerrada" }
      : { estado: "abierta", respuestas_permitidas: Math.min(6, Math.max(ev.respuestasPermitidas, usadas + 1)) };
  const { error } = await supabase.from("gestionesjj_evaluaciones").update(cambios).eq("id", ev.id);
  return { error: error?.message ?? null };
}

export async function eliminarEvaluacion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_evaluaciones").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Guarda en el expediente una respuesta recibida como código corto (WhatsApp). */
export async function guardarRespuestaPorCodigo(
  pacienteId: string,
  instrumento: string,
  respondienteNombre: string,
  respondienteRelacion: string,
  fecha: string,
  datos: Record<string, unknown>
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_evaluacion_respuestas").insert({
    paciente_id: pacienteId,
    instrumento,
    respondiente_nombre: respondienteNombre.trim().slice(0, 120) || "Sin nombre",
    respondiente_relacion: respondienteRelacion.trim().slice(0, 60) || null,
    fecha: fecha || null,
    datos,
    origen: "codigo",
  });
  return { error: error?.message ?? null };
}

export async function eliminarRespuesta(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_evaluacion_respuestas").delete().eq("id", id);
  return { error: error?.message ?? null };
}
