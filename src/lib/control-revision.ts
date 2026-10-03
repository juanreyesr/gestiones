import type { Trimestre } from "@/data/evaluacion";
import { getSupabaseClient } from "@/lib/supabase";

// Control de revision de evaluaciones de docentes (migracion 048). Sigue el
// formato institucional "Control revisión evaluaciones de docentes": una fila
// por curso del periodo, con la entrega del docente y la revision del
// coordinador. Las reglas automaticas de cada columna viven en `aplicarCambio`
// para que la vista y el Excel muestren siempre lo mismo.

export type TipoEvaluacion = "parcial" | "final";

export const TIPOS_EVALUACION: Array<{ value: TipoEvaluacion; label: string }> = [
  { value: "parcial", label: "Parcial" },
  { value: "final", label: "Final" },
];

export const REVISOR = "M.A. Juan Reyes";
export const CAMPUS_POR_DEFECTO = "Presencial Chimaltenango";

/** Rotulo de la columna de contenidos: el parcial cubre hasta la semana 6 y el final hasta la 12. */
export const tituloContenidos = (tipo: TipoEvaluacion) =>
  `Contenidos hasta semana ${tipo === "parcial" ? 6 : 12}`;

export const OPCIONES = {
  estado_entrega: ["Pendiente", "Entregado"],
  estatus_revision: ["En proceso", "Revisado"],
  retro_enviada: ["En proceso", "Enviada"],
  version_corregida: ["Pendiente", "Recibida"],
  version_final_aprobada: ["No", "Sí"],
  formato_oficial: ["Sí", "No"],
  contenidos_semana6: ["En revisión", "Sí", "No"],
  punteo_100: ["Sí", "No"],
  instrucciones_claras: ["En revisión", "Sí", "No"],
  aplicacion_caso: ["En revisión", "Sí", "No"],
  rubrica: ["En revisión", "OK", "No aplica"],
} as const;

export type CampoOpcion = keyof typeof OPCIONES;
export type CampoFecha = "fecha_recepcion" | "fecha_revision" | "fecha_retro" | "fecha_version_corregida" | "fecha_aprobacion";

/** Lo que se guarda por curso; null = celda vacia. */
export type EstadoRevision = {
  campus: string | null;
  fecha_recepcion: string | null;
  estado_entrega: "Pendiente" | "Entregado";
  revisor: string | null;
  fecha_revision: string | null;
  estatus_revision: string | null;
  retro_enviada: string | null;
  fecha_retro: string | null;
  version_corregida: string | null;
  fecha_version_corregida: string | null;
  version_final_aprobada: string | null;
  fecha_aprobacion: string | null;
  formato_oficial: string | null;
  contenidos_semana6: string | null;
  punteo_100: string | null;
  instrucciones_claras: string | null;
  aplicacion_caso: string | null;
  rubrica: string | null;
  observaciones: string | null;
};

export const ESTADO_VACIO: EstadoRevision = {
  campus: null,
  fecha_recepcion: null,
  estado_entrega: "Pendiente",
  revisor: null,
  fecha_revision: null,
  estatus_revision: null,
  retro_enviada: null,
  fecha_retro: null,
  version_corregida: null,
  fecha_version_corregida: null,
  version_final_aprobada: null,
  fecha_aprobacion: null,
  formato_oficial: null,
  contenidos_semana6: null,
  punteo_100: null,
  instrucciones_claras: null,
  aplicacion_caso: null,
  rubrica: null,
  observaciones: null,
};

/** Columnas pedagogicas que quedan "En revisión" hasta aprobar la version final. */
const PENDIENTES_DE_APROBACION = [
  ["contenidos_semana6", "Sí"],
  ["instrucciones_claras", "Sí"],
  ["aplicacion_caso", "Sí"],
  ["rubrica", "OK"],
] as const;

/**
 * Aplica un cambio hecho a mano y sus consecuencias automaticas:
 * - Entregado: arranca la revision (revisor, "En proceso", "Pendiente", "No",
 *   formato y punteo en "Sí", lo pedagogico "En revisión") y fecha de recepcion
 *   de hoy. Volver a Pendiente limpia todo lo de la revision.
 * - Revisado / Enviada / Recibida: ponen la fecha de hoy en su columna.
 * - Versión final aprobada = Sí: fecha de aprobacion y lo que estaba
 *   "En revisión" pasa a "Sí" (la rubrica a "OK"). Volver a No lo regresa.
 */
export function aplicarCambio(
  actual: EstadoRevision,
  campo: CampoOpcion | CampoFecha | "campus" | "observaciones",
  valor: string | null,
  hoy: string,
): EstadoRevision {
  const v = valor === "" ? null : valor;
  const nuevo: EstadoRevision = { ...actual, [campo]: v } as EstadoRevision;

  if (campo === "estado_entrega") {
    if (v === "Entregado") {
      return {
        ...nuevo,
        estado_entrega: "Entregado",
        fecha_recepcion: actual.fecha_recepcion ?? hoy,
        revisor: REVISOR,
        estatus_revision: actual.estatus_revision ?? "En proceso",
        retro_enviada: actual.retro_enviada ?? "En proceso",
        version_corregida: actual.version_corregida ?? "Pendiente",
        version_final_aprobada: actual.version_final_aprobada ?? "No",
        formato_oficial: actual.formato_oficial ?? "Sí",
        contenidos_semana6: actual.contenidos_semana6 ?? "En revisión",
        punteo_100: actual.punteo_100 ?? "Sí",
        instrucciones_claras: actual.instrucciones_claras ?? "En revisión",
        aplicacion_caso: actual.aplicacion_caso ?? "En revisión",
        rubrica: actual.rubrica ?? "En revisión",
      };
    }
    return { ...ESTADO_VACIO, campus: actual.campus, observaciones: actual.observaciones };
  }

  if (campo === "estatus_revision") nuevo.fecha_revision = v === "Revisado" ? (actual.fecha_revision ?? hoy) : null;
  if (campo === "retro_enviada") nuevo.fecha_retro = v === "Enviada" ? (actual.fecha_retro ?? hoy) : null;
  if (campo === "version_corregida") {
    nuevo.fecha_version_corregida = v === "Recibida" ? (actual.fecha_version_corregida ?? hoy) : null;
  }
  if (campo === "version_final_aprobada") {
    const aprobada = v === "Sí";
    nuevo.fecha_aprobacion = aprobada ? (actual.fecha_aprobacion ?? hoy) : null;
    for (const [columna, aprobado] of PENDIENTES_DE_APROBACION) {
      if (aprobada && actual[columna] === "En revisión") nuevo[columna] = aprobado;
      if (!aprobada && actual[columna] === aprobado) nuevo[columna] = "En revisión";
    }
  }
  return nuevo;
}

// ---------------------------------------------------------------------------
// Base de datos
// ---------------------------------------------------------------------------

type Clave = { anio: number; trimestre: Trimestre; tipo: TipoEvaluacion };

async function usuarioActual() {
  const supabase = getSupabaseClient();
  if (!supabase) return { supabase: null, userId: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

export async function fetchFechaLimite({ anio, trimestre, tipo }: Clave) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as string | null, error: "Faltan las variables de Supabase." };
  const { data, error } = await supabase
    .from("gestionesjj_control_revision_periodos")
    .select("fecha_limite")
    .eq("anio", anio)
    .eq("trimestre", trimestre)
    .eq("tipo", tipo)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data?.fecha_limite as string | undefined) ?? null, error: null };
}

export async function guardarFechaLimite(clave: Clave, fechaLimite: string) {
  const { supabase, userId } = await usuarioActual();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  if (!userId) return { error: "Sesión no válida." };
  const { error } = await supabase
    .from("gestionesjj_control_revision_periodos")
    .upsert({ created_by: userId, ...clave, fecha_limite: fechaLimite }, { onConflict: "created_by,anio,trimestre,tipo" });
  return { error: error?.message ?? null };
}

export async function fetchFilasRevision({ anio, trimestre, tipo }: Clave) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: new Map<string, EstadoRevision>(), error: "Faltan las variables de Supabase." };
  const columnas = ["curso_id", ...Object.keys(ESTADO_VACIO)].join(",");
  const { data, error } = await supabase
    .from("gestionesjj_control_revision_filas")
    .select(columnas)
    .eq("anio", anio)
    .eq("trimestre", trimestre)
    .eq("tipo", tipo);
  if (error) return { data: new Map<string, EstadoRevision>(), error: error.message };
  const mapa = new Map<string, EstadoRevision>();
  for (const row of (data ?? []) as unknown as Array<EstadoRevision & { curso_id: string }>) {
    const { curso_id: cursoId, ...estado } = row;
    mapa.set(cursoId, { ...ESTADO_VACIO, ...estado });
  }
  return { data: mapa, error: null };
}

export async function guardarFilaRevision(clave: Clave, cursoId: string, estado: EstadoRevision) {
  const { supabase, userId } = await usuarioActual();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  if (!userId) return { error: "Sesión no válida." };
  const { error } = await supabase
    .from("gestionesjj_control_revision_filas")
    .upsert(
      { created_by: userId, ...clave, curso_id: cursoId, ...estado },
      { onConflict: "created_by,anio,trimestre,tipo,curso_id" },
    );
  return { error: error?.message ?? null };
}
