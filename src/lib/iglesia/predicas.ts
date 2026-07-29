import { fechaISO } from "@/lib/fechas";
import { getSupabaseClient } from "@/lib/supabase";
import {
  HORARIOS_DOMINGO,
  HORARIO_MARTES,
  type AsignacionPredicaRow,
  type CierrePersonaRow,
  type HorarioPredica,
  type MesPredicasRow,
  type PersonaRow,
  type PredicadorRow,
  type TemaAnioRow,
} from "./types";

const SIN_SUPABASE = "Faltan las variables de Supabase.";

// ============================================================
// CATALOGO DE PREDICADORES
// ============================================================

export async function fetchPredicadores() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as PredicadorRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_predicadores")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");

  if (error) return { data: [] as PredicadorRow[], error: error.message };
  return { data: (data ?? []) as PredicadorRow[], error: null };
}

export async function insertPredicador(payload: { nombre: string; telefono?: string | null; notas?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as PredicadorRow | null, error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_predicadores")
    .insert(payload)
    .select("*")
    .single();

  // El indice unico sobre el nombre da un error de Postgres poco legible.
  if (error?.code === "23505") return { data: null, error: "Ya existe un predicador con ese nombre." };
  return { data: (data as PredicadorRow | null) ?? null, error: error?.message ?? null };
}

export async function updatePredicador(
  id: string,
  payload: Partial<Pick<PredicadorRow, "nombre" | "telefono" | "notas" | "activo">>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_predicadores").update(payload).eq("id", id);
  if (error?.code === "23505") return { error: "Ya existe un predicador con ese nombre." };
  return { error: error?.message ?? null };
}

export async function deletePredicador(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_predicadores").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/** Cuantas celebraciones (de cualquier mes) tiene asignadas cada predicador. */
export async function fetchUsoPredicadores() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: {} as Record<string, number>, error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_predicas_asignaciones")
    .select("predicador_id, cierre_persona_id");

  if (error) return { data: {} as Record<string, number>, error: error.message };

  // Las dos claves conviven en el mismo mapa sin chocar: son catalogos
  // distintos, asi que un id nunca esta en los dos.
  const uso: Record<string, number> = {};
  for (const fila of data ?? []) {
    for (const id of [fila.predicador_id, fila.cierre_persona_id]) {
      if (id) uso[id as string] = (uso[id as string] ?? 0) + 1;
    }
  }
  return { data: uso, error: null };
}

// ============================================================
// CALENDARIO DEL MES
// ============================================================

export type Celebracion = { fecha: string; horario: HorarioPredica };

/**
 * Todas las celebraciones de un mes: tres por cada domingo (7:30, 9:30 y
 * 11:30) y una por cada martes (7:00 PM). Es una funcion pura para poder
 * generar el mes antes de tocar la base.
 */
export function celebracionesDelMes(anio: number, mes: number): Celebracion[] {
  const celebraciones: Celebracion[] = [];
  const cursor = new Date(anio, mes - 1, 1);

  while (cursor.getMonth() === mes - 1) {
    const dia = cursor.getDay(); // 0 = domingo, 2 = martes
    if (dia === 0) {
      for (const horario of HORARIOS_DOMINGO) celebraciones.push({ fecha: fechaISO(cursor), horario });
    } else if (dia === 2) {
      celebraciones.push({ fecha: fechaISO(cursor), horario: HORARIO_MARTES });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return celebraciones;
}

export async function fetchMeses() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as MesPredicasRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_predicas_meses")
    .select("*")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });

  if (error) return { data: [] as MesPredicasRow[], error: error.message };
  return { data: (data ?? []) as MesPredicasRow[], error: null };
}

export async function updateMes(
  id: string,
  payload: Partial<Pick<MesPredicasRow, "tema" | "instrucciones" | "notas">>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_predicas_meses").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteMes(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_predicas_meses").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/**
 * Crea el mes con todas sus celebraciones vacias. Las instrucciones se heredan
 * del mes mas reciente, porque son recordatorios que se repiten mes a mes.
 */
export async function crearMes(anio: number, mes: number, instruccionesPrevias: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as MesPredicasRow | null, error: SIN_SUPABASE };

  // El tema sale del calendario anual de temas, si ya esta definido.
  const { data: temaAnio } = await supabase
    .from("gestionesjj_iglesia_temas_anio")
    .select("tema")
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_predicas_meses")
    .insert({ anio, mes, instrucciones: instruccionesPrevias, tema: (temaAnio?.tema as string | undefined) ?? null })
    .select("*")
    .single();

  if (error?.code === "23505") return { data: null, error: "Ese mes ya existe." };
  if (error || !data) return { data: null, error: error?.message ?? "No se pudo crear el mes." };

  const nuevo = data as MesPredicasRow;
  const { error: generarError } = await generarCelebraciones(nuevo);
  return { data: nuevo, error: generarError };
}

/**
 * Inserta las celebraciones que falten del mes. Se llama al crear y tambien al
 * abrir un mes ya existente: si se agrego un domingo o cambio el calendario,
 * la rejilla se completa sola sin duplicar nada (hay un unico por mes+fecha+horario).
 */
export async function generarCelebraciones(mesRow: MesPredicasRow) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { data: existentes, error: leerError } = await supabase
    .from("gestionesjj_iglesia_predicas_asignaciones")
    .select("fecha, horario")
    .eq("mes_id", mesRow.id);

  if (leerError) return { error: leerError.message };

  const yaHay = new Set((existentes ?? []).map((fila) => `${fila.fecha}|${fila.horario}`));
  const faltantes = celebracionesDelMes(mesRow.anio, mesRow.mes)
    .filter((celebracion) => !yaHay.has(`${celebracion.fecha}|${celebracion.horario}`))
    .map((celebracion) => ({
      mes_id: mesRow.id,
      fecha: celebracion.fecha,
      horario: celebracion.horario,
    }));

  if (!faltantes.length) return { error: null };

  const { error } = await supabase.from("gestionesjj_iglesia_predicas_asignaciones").insert(faltantes);
  return { error: error?.message ?? null };
}

// ============================================================
// ASIGNACIONES
// ============================================================

export async function fetchAsignaciones(mesId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as AsignacionPredicaRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_predicas_asignaciones")
    .select("*")
    .eq("mes_id", mesId)
    .order("fecha")
    .order("horario");

  if (error) return { data: [] as AsignacionPredicaRow[], error: error.message };
  return { data: (data ?? []) as AsignacionPredicaRow[], error: null };
}

export type AsignacionEditable = Partial<
  Pick<
    AsignacionPredicaRow,
    "predicador_id" | "predicador_texto" | "cierre_persona_id" | "cierre_texto" | "notas"
  >
>;

export async function updateAsignacion(id: string, payload: AsignacionEditable) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_predicas_asignaciones").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

/** Aplica varias asignaciones de una vez (importar el mes desde texto). */
export async function updateAsignaciones(cambios: Array<{ id: string } & AsignacionEditable>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  if (!cambios.length) return { error: null };

  const resultados = await Promise.all(
    cambios.map(({ id, ...payload }) =>
      supabase.from("gestionesjj_iglesia_predicas_asignaciones").update(payload).eq("id", id),
    ),
  );
  const fallo = resultados.find((resultado) => resultado.error);
  return { error: fallo?.error?.message ?? null };
}

// ============================================================
// CATALOGO DE PERSONAS DE CIERRE
// Es un listado aparte del de predicadores: se precargo con ellos, pero desde
// aqui se agrega y se quita gente sin tocar el otro.
// ============================================================

export async function fetchCierresPersonas() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CierrePersonaRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_cierres_personas")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");

  if (error) return { data: [] as CierrePersonaRow[], error: error.message };
  return { data: (data ?? []) as CierrePersonaRow[], error: null };
}

export async function insertCierrePersona(payload: { nombre: string; telefono?: string | null; notas?: string | null }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as CierrePersonaRow | null, error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_cierres_personas")
    .insert(payload)
    .select("*")
    .single();

  if (error?.code === "23505") return { data: null, error: "Ya existe una persona de cierre con ese nombre." };
  return { data: (data as CierrePersonaRow | null) ?? null, error: error?.message ?? null };
}

export async function updateCierrePersona(
  id: string,
  payload: Partial<Pick<PersonaRow, "nombre" | "telefono" | "notas" | "activo">>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_cierres_personas").update(payload).eq("id", id);
  if (error?.code === "23505") return { error: "Ya existe una persona de cierre con ese nombre." };
  return { error: error?.message ?? null };
}

export async function deleteCierrePersona(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_cierres_personas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// ============================================================
// TEMAS POR ANIO
// ============================================================

export async function fetchTemas() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as TemaAnioRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_iglesia_temas_anio")
    .select("*")
    .order("anio", { ascending: false })
    .order("mes");

  if (error) return { data: [] as TemaAnioRow[], error: error.message };
  return { data: (data ?? []) as TemaAnioRow[], error: null };
}

/**
 * Guarda de una vez los doce meses de un anio. Se manda como upsert sobre la
 * llave (anio, mes) para que editar y crear sean la misma operacion.
 */
export async function guardarTemasDelAnio(anio: number, temas: Array<{ mes: number; tema: string }>) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase
    .from("gestionesjj_iglesia_temas_anio")
    .upsert(
      temas.map((fila) => ({ anio, mes: fila.mes, tema: fila.tema.trim() || null })),
      { onConflict: "anio,mes" },
    );

  return { error: error?.message ?? null };
}

export async function deleteTemasDelAnio(anio: number) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from("gestionesjj_iglesia_temas_anio").delete().eq("anio", anio);
  return { error: error?.message ?? null };
}
