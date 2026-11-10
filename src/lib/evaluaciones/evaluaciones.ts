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
  /** A quién va dirigido el enlace ("Mamá", "Cuidador 2"...). */
  etiqueta: string | null;
  /** Avance guardado automáticamente mientras se responde (null si aún no se abre o ya se envió). */
  borrador: Record<string, unknown> | null;
  borradorAt: string | null;
  /** Opciones del instrumento (EAPI: { docs: true } incluye el módulo TOC). */
  opciones: Record<string, unknown>;
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
  etiqueta: string | null;
  borrador: Record<string, unknown> | null;
  borrador_at: string | null;
  opciones: Record<string, unknown> | null;
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
  etiqueta: r.etiqueta,
  borrador: r.borrador,
  borradorAt: r.borrador_at,
  opciones: r.opciones ?? {},
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
      .select("id,paciente_id,instrumento,token,respuestas_permitidas,estado,nota,created_at,etiqueta,borrador,borrador_at,opciones")
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

/**
 * Asigna un instrumento: crea UN enlace por cada persona que va a responder
 * (cada uno admite un envío y guarda su propio avance).
 */
export async function asignarEvaluacion(
  pacienteId: string,
  instrumento: string,
  etiquetas: string[],
  nota: string,
  opciones: Record<string, unknown> = {}
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE, creadas: [] as { id: string; etiqueta: string | null }[] };
  const filas = etiquetas.slice(0, 4).map((etiqueta) => ({
    paciente_id: pacienteId,
    instrumento,
    respuestas_permitidas: 1,
    etiqueta: etiqueta.trim().slice(0, 60) || null,
    nota: nota.trim() || null,
    opciones,
  }));
  if (filas.length === 0) return { error: "Indica al menos una persona que responderá.", creadas: [] };
  const { data, error } = await supabase.from("gestionesjj_evaluaciones").insert(filas).select("id,etiqueta");
  return { error: error?.message ?? null, creadas: (data ?? []) as { id: string; etiqueta: string | null }[] };
}

// ============================================================
// Seguimiento programado (gestionesjj_evaluacion_seguimientos, migración 063)
// ============================================================

export type SeguimientoRow = {
  id: string;
  pacienteId: string;
  instrumento: string;
  opciones: Record<string, unknown>;
  etiqueta: string | null;
  cadaDias: number;
  proximaFecha: string;
  activo: boolean;
  ultimaEvaluacionId: string | null;
  ultimoAvisoAt: string | null;
  avisos: number;
  intentos: number;
  error: string | null;
};

type RawSeguimiento = {
  id: string;
  paciente_id: string;
  instrumento: string;
  opciones: Record<string, unknown> | null;
  etiqueta: string | null;
  cada_dias: number;
  proxima_fecha: string;
  activo: boolean;
  ultima_evaluacion_id: string | null;
  ultimo_aviso_at: string | null;
  avisos: number;
  intentos: number;
  error: string | null;
};

const mapSeguimiento = (r: RawSeguimiento): SeguimientoRow => ({
  id: r.id,
  pacienteId: r.paciente_id,
  instrumento: r.instrumento,
  opciones: r.opciones ?? {},
  etiqueta: r.etiqueta,
  cadaDias: r.cada_dias,
  proximaFecha: r.proxima_fecha,
  activo: r.activo,
  ultimaEvaluacionId: r.ultima_evaluacion_id,
  ultimoAvisoAt: r.ultimo_aviso_at,
  avisos: r.avisos,
  intentos: r.intentos,
  error: r.error,
});

export async function fetchSeguimientos(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return [] as SeguimientoRow[];
  const { data } = await supabase
    .from("gestionesjj_evaluacion_seguimientos")
    .select("id,paciente_id,instrumento,opciones,etiqueta,cada_dias,proxima_fecha,activo,ultima_evaluacion_id,ultimo_aviso_at,avisos,intentos,error")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as RawSeguimiento[]).map(mapSeguimiento);
}

/** Fecha local AAAA-MM-DD dentro de N días. */
export function fechaEnDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function crearSeguimiento(input: {
  pacienteId: string;
  instrumento: string;
  opciones: Record<string, unknown>;
  etiqueta: string | null;
  cadaDias: number;
  ultimaEvaluacionId: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_evaluacion_seguimientos").insert({
    paciente_id: input.pacienteId,
    instrumento: input.instrumento,
    opciones: input.opciones,
    etiqueta: input.etiqueta?.trim().slice(0, 60) || null,
    cada_dias: input.cadaDias,
    proxima_fecha: fechaEnDias(input.cadaDias),
    ultima_evaluacion_id: input.ultimaEvaluacionId,
  });
  return { error: error ? mensajeSeguimientoNoDisponible(error) : null };
}

/** Si la tabla aún no existe (migración 063 pendiente), un mensaje claro en vez del error técnico. */
function mensajeSeguimientoNoDisponible(error: { message: string; code?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message)
    ? "El seguimiento programado se activará cuando se aplique la migración 063 en Supabase (está en supabase/PENDIENTES.md)."
    : error.message;
}

export async function actualizarSeguimiento(id: string, cambios: { activo?: boolean; cadaDias?: number; proximaFecha?: string }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const fila: Record<string, unknown> = {};
  if (cambios.activo !== undefined) fila.activo = cambios.activo;
  if (cambios.cadaDias !== undefined) fila.cada_dias = cambios.cadaDias;
  if (cambios.proximaFecha !== undefined) fila.proxima_fecha = cambios.proximaFecha;
  // Reactivar o reprogramar también limpia el error y los intentos fallidos.
  if (cambios.activo || cambios.proximaFecha) Object.assign(fila, { intentos: 0, error: null });
  const { error } = await supabase.from("gestionesjj_evaluacion_seguimientos").update(fila).eq("id", id);
  return { error: error?.message ?? null };
}

export async function eliminarSeguimiento(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_evaluacion_seguimientos").delete().eq("id", id);
  return { error: error?.message ?? null };
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

export async function eliminarRespuesta(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_evaluacion_respuestas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ============================================================
// Notas e informe para el paciente (gestionesjj_evaluacion_informes)
// ============================================================

export type InformeRow = {
  respuestaId: string;
  notasPrivadas: string;
  notasPaciente: string;
  opciones: Record<string, unknown>;
  contenido: Record<string, unknown> | null;
  token: string | null;
  publicadoAt: string | null;
  updatedAt: string | null;
};

type RawInforme = {
  respuesta_id: string;
  notas_privadas: string | null;
  notas_paciente: string | null;
  opciones: Record<string, unknown> | null;
  contenido: Record<string, unknown> | null;
  token: string | null;
  publicado_at: string | null;
  updated_at: string | null;
};

const INFORME_COLUMNAS = "respuesta_id,notas_privadas,notas_paciente,opciones,contenido,token,publicado_at,updated_at";

const mapInforme = (r: RawInforme): InformeRow => ({
  respuestaId: r.respuesta_id,
  notasPrivadas: r.notas_privadas ?? "",
  notasPaciente: r.notas_paciente ?? "",
  opciones: r.opciones ?? {},
  contenido: r.contenido,
  token: r.token,
  publicadoAt: r.publicado_at,
  updatedAt: r.updated_at,
});

export async function fetchInforme(respuestaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as InformeRow | null, error: SIN_SUPABASE };
  const { data, error } = await supabase
    .from("gestionesjj_evaluacion_informes")
    .select(INFORME_COLUMNAS)
    .eq("respuesta_id", respuestaId)
    .maybeSingle();
  return { data: data ? mapInforme(data as RawInforme) : null, error: error?.message ?? null };
}

/** Informes (notas privadas, publicación) de varias respuestas a la vez, por id de respuesta. */
export async function fetchInformesDeRespuestas(respuestaIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase || !respuestaIds.length) return {} as Record<string, InformeRow>;
  const { data } = await supabase.from("gestionesjj_evaluacion_informes").select(INFORME_COLUMNAS).in("respuesta_id", respuestaIds);
  return Object.fromEntries(((data ?? []) as RawInforme[]).map((r) => [r.respuesta_id, mapInforme(r)]));
}

/** Alarma de una respuesta marcada como atendida (se guarda en opciones.alarmaAtendida del informe). */
export type AtencionAlarma = { at: string; nota: string };

export function atencionDe(informe: InformeRow | null | undefined): AtencionAlarma | null {
  const a = (informe?.opciones as { alarmaAtendida?: unknown } | undefined)?.alarmaAtendida;
  if (!a || typeof a !== "object") return null;
  const o = a as Record<string, unknown>;
  return typeof o.at === "string" ? { at: o.at, nota: typeof o.nota === "string" ? o.nota : "" } : null;
}

/**
 * Marca (o desmarca, con nota = null) la alarma de una respuesta como atendida.
 * guardarNotasInforme conserva las demás opciones del informe (las del informe al paciente).
 */
export async function marcarAlarmaAtendida(respuestaId: string, pacienteId: string, nota: string | null) {
  return guardarNotasInforme(respuestaId, pacienteId, {
    opciones: { alarmaAtendida: nota === null ? null : { at: new Date().toISOString(), nota: nota.trim().slice(0, 500) } },
  });
}

/** Guarda notas y opciones (crea la fila si no existe). */
export async function guardarNotasInforme(
  respuestaId: string,
  pacienteId: string,
  cambios: { notasPrivadas?: string; notasPaciente?: string; opciones?: Record<string, unknown> }
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as InformeRow | null, error: SIN_SUPABASE };
  const fila: Record<string, unknown> = { respuesta_id: respuestaId, paciente_id: pacienteId, updated_at: new Date().toISOString() };
  if (cambios.notasPrivadas !== undefined) fila.notas_privadas = cambios.notasPrivadas.slice(0, 10000) || null;
  if (cambios.notasPaciente !== undefined) fila.notas_paciente = cambios.notasPaciente.slice(0, 6000) || null;
  if (cambios.opciones !== undefined) {
    // Se combinan con las guardadas: el informe al paciente y la alarma atendida comparten la columna.
    const { data: actual } = await supabase.from("gestionesjj_evaluacion_informes").select("opciones").eq("respuesta_id", respuestaId).maybeSingle();
    fila.opciones = { ...((actual as { opciones?: Record<string, unknown> } | null)?.opciones ?? {}), ...cambios.opciones };
  }
  const { data, error } = await supabase
    .from("gestionesjj_evaluacion_informes")
    .upsert(fila, { onConflict: "respuesta_id" })
    .select(INFORME_COLUMNAS)
    .single();
  return { data: data ? mapInforme(data as RawInforme) : null, error: error?.message ?? null };
}

/**
 * Publica (o actualiza) el informe para el paciente: guarda una copia fija del
 * contenido y le asigna un enlace /informe/<token> (el mismo si ya tenía).
 */
export async function publicarInforme(respuestaId: string, pacienteId: string, contenido: Record<string, unknown>, tokenActual: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as InformeRow | null, error: SIN_SUPABASE };
  const { data, error } = await supabase
    .from("gestionesjj_evaluacion_informes")
    .upsert(
      {
        respuesta_id: respuestaId,
        paciente_id: pacienteId,
        contenido,
        token: tokenActual ?? crypto.randomUUID(),
        publicado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "respuesta_id" }
    )
    .select(INFORME_COLUMNAS)
    .single();
  return { data: data ? mapInforme(data as RawInforme) : null, error: error?.message ?? null };
}

/** Retira el informe publicado: el enlace deja de funcionar (las notas se conservan). */
export async function retirarInforme(respuestaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase
    .from("gestionesjj_evaluacion_informes")
    .update({ publicado_at: null, contenido: null, token: null, updated_at: new Date().toISOString() })
    .eq("respuesta_id", respuestaId);
  return { error: error?.message ?? null };
}

// ============================================================
// Informe de avance (evolución) para el paciente (gestionesjj_informes_avance,
// una fila por paciente; migración 065)
// ============================================================

export const FALTA_MIGRACION_AVANCE =
  "Para enviar el informe de avance falta aplicar la migración 065 en Supabase (está en supabase/PENDIENTES.md). El panel de evolución funciona igual.";
const AVANCE_COLUMNAS = "paciente_id,notas_paciente,opciones,contenido,token,publicado_at,updated_at";
const faltaTabla = (e: { code?: string; message: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message));
const errorAvance = (e: { code?: string; message: string } | null) => (e ? (faltaTabla(e) ? FALTA_MIGRACION_AVANCE : e.message) : null);
const mapAvance = (r: Omit<RawInforme, "respuesta_id" | "notas_privadas"> & { paciente_id: string }): InformeRow =>
  mapInforme({ ...r, respuesta_id: r.paciente_id, notas_privadas: null });
type RawAvance = Parameters<typeof mapAvance>[0];

export async function fetchInformeAvance(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as InformeRow | null, error: SIN_SUPABASE };
  const { data, error } = await supabase.from("gestionesjj_informes_avance").select(AVANCE_COLUMNAS).eq("paciente_id", pacienteId).maybeSingle();
  return { data: data ? mapAvance(data as RawAvance) : null, error: errorAvance(error) };
}

export async function guardarInformeAvance(pacienteId: string, cambios: { notasPaciente?: string; opciones?: Record<string, unknown> }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as InformeRow | null, error: SIN_SUPABASE };
  const fila: Record<string, unknown> = { paciente_id: pacienteId, updated_at: new Date().toISOString() };
  if (cambios.notasPaciente !== undefined) fila.notas_paciente = cambios.notasPaciente.slice(0, 6000) || null;
  if (cambios.opciones !== undefined) fila.opciones = cambios.opciones;
  const { data, error } = await supabase.from("gestionesjj_informes_avance").upsert(fila, { onConflict: "paciente_id" }).select(AVANCE_COLUMNAS).single();
  return { data: data ? mapAvance(data as RawAvance) : null, error: errorAvance(error) };
}

export async function publicarInformeAvance(pacienteId: string, contenido: Record<string, unknown>, tokenActual: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as InformeRow | null, error: SIN_SUPABASE };
  const ahora = new Date().toISOString();
  const { data, error } = await supabase
    .from("gestionesjj_informes_avance")
    .upsert({ paciente_id: pacienteId, contenido, token: tokenActual ?? crypto.randomUUID(), publicado_at: ahora, updated_at: ahora }, { onConflict: "paciente_id" })
    .select(AVANCE_COLUMNAS)
    .single();
  return { data: data ? mapAvance(data as RawAvance) : null, error: errorAvance(error) };
}

export async function retirarInformeAvance(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase
    .from("gestionesjj_informes_avance")
    .update({ publicado_at: null, contenido: null, token: null, updated_at: new Date().toISOString() })
    .eq("paciente_id", pacienteId);
  return { error: errorAvance(error) };
}
