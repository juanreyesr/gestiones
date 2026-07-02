import type { ReporteData } from "@/components/reporte-printable";
import { CRITERIOS, ENTREVISTA_PREGUNTAS, type Trimestre } from "@/data/evaluacion";
import { getSupabaseClient } from "@/lib/supabase";

export type EntrevistaRecord = {
  estudiante: 1 | 2;
  respuestas: Record<string, number>;
  promedio: number;
};

export type EvaluacionRow = {
  id: string;
  docente_id: string | null;
  docente_nombre: string;
  docente_correo: string | null;
  curso_id: string | null;
  curso_nombre: string;
  curso_grupo: string | null;
  anio: number;
  trimestre: Trimestre;
  fecha_observacion: string;
  puntaje_total: number;
  puntaje_maximo: number;
  porcentaje: number;
  scores: Record<string, number>;
  observaciones: string | null;
  entrevistas: EntrevistaRecord[];
  fortalezas: string[];
  created_at: string;
};

export function currentTrimestre(): Trimestre {
  const month = new Date().getMonth() + 1;
  if (month <= 4) return 1;
  if (month <= 8) return 2;
  return 3;
}

export function summarizeScores(scores: Record<string, number>) {
  return CRITERIOS.map((categoria) => {
    const subtotal = categoria.items.reduce((sum, item) => sum + (scores[item.id] || 0), 0);
    const percent = Math.round((subtotal / (categoria.items.length * 5)) * 100);
    return { categoria: categoria.categoria, percent };
  });
}

export function summarizeImprovementAreas(scores: Record<string, number>) {
  return CRITERIOS.flatMap((categoria) =>
    categoria.items
      .filter((item) => (scores[item.id] || 0) > 0 && scores[item.id] < 4)
      .map((item) => ({ categoria: categoria.categoria, texto: item.texto, valor: scores[item.id] })),
  ).slice(0, 5);
}

export function summarizeEntrevistas(entrevistas: EntrevistaRecord[] | null | undefined) {
  const rows = entrevistas ?? [];
  const porEstudiante = rows.map((item) => ({
    estudiante: item.estudiante,
    promedio: item.promedio,
    respondidas: Object.keys(item.respuestas ?? {}).length,
  }));
  const totalRespondidas = porEstudiante.reduce((sum, item) => sum + item.respondidas, 0);
  const general = totalRespondidas
    ? Math.round(porEstudiante.reduce((sum, item) => sum + item.promedio * item.respondidas, 0) / totalRespondidas)
    : 0;
  return { porEstudiante, general };
}

export async function fetchEvaluacionesPorPeriodo(anio: number | null, trimestre: Trimestre | "todos") {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EvaluacionRow[], error: "Faltan las variables de Supabase." };

  let query = supabase.from("evaluaciones_docentes").select("*").order("fecha_observacion", { ascending: false });
  if (anio !== null) {
    query = query.eq("anio", anio);
  }
  if (trimestre !== "todos") {
    query = query.eq("trimestre", trimestre);
  }

  const { data, error } = await query;
  if (error) return { data: [] as EvaluacionRow[], error: error.message };
  return { data: (data ?? []) as EvaluacionRow[], error: null };
}

export async function deleteEvaluacion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("evaluaciones_docentes").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export type EvaluacionPayload = {
  docente_id: string;
  docente_nombre: string;
  docente_correo: string | null;
  curso_id: string;
  curso_nombre: string;
  curso_grupo: string | null;
  anio: number;
  trimestre: Trimestre;
  fecha_observacion: string;
  puntaje_total: number;
  puntaje_maximo: number;
  porcentaje: number;
  scores: Record<string, number>;
  observaciones: string;
  entrevistas: EntrevistaRecord[];
  fortalezas: string[];
};

export async function upsertEvaluacion(id: string | null, payload: EvaluacionPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  if (id) {
    const { error } = await supabase.from("evaluaciones_docentes").update(payload).eq("id", id);
    return { id, error: error?.message ?? null };
  }

  const { data, error } = await supabase.from("evaluaciones_docentes").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function fetchEvaluacionesPorDocente(docenteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EvaluacionRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("evaluaciones_docentes")
    .select("*")
    .eq("docente_id", docenteId)
    .order("anio", { ascending: false })
    .order("trimestre", { ascending: false })
    .order("fecha_observacion", { ascending: false });

  if (error) return { data: [] as EvaluacionRow[], error: error.message };
  return { data: (data ?? []) as EvaluacionRow[], error: null };
}

export function promedioGeneral(rows: EvaluacionRow[]) {
  if (!rows.length) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.porcentaje, 0) / rows.length);
}

export function promedioEntrevistas(rows: EvaluacionRow[]) {
  const generales = rows.map((row) => summarizeEntrevistas(row.entrevistas).general).filter((value) => value > 0);
  if (!generales.length) return 0;
  return Math.round(generales.reduce((sum, value) => sum + value, 0) / generales.length);
}

export function aggregateCategoryAnalytics(rows: EvaluacionRow[]) {
  const sums = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    for (const item of summarizeScores(row.scores)) {
      const entry = sums.get(item.categoria) ?? { total: 0, count: 0 };
      entry.total += item.percent;
      entry.count += 1;
      sums.set(item.categoria, entry);
    }
  }
  return CRITERIOS.map((categoria) => {
    const entry = sums.get(categoria.categoria);
    const percent = entry && entry.count ? Math.round(entry.total / entry.count) : 0;
    return { categoria: categoria.categoria, percent };
  });
}

export function aggregateEntrevistaPreguntas(rows: EvaluacionRow[]) {
  const sums = new Map<number, { total: number; count: number }>();
  for (const row of rows) {
    for (const entrevista of row.entrevistas ?? []) {
      for (const [key, value] of Object.entries(entrevista.respuestas ?? {})) {
        const id = Number(key);
        const entry = sums.get(id) ?? { total: 0, count: 0 };
        entry.total += value;
        entry.count += 1;
        sums.set(id, entry);
      }
    }
  }
  return ENTREVISTA_PREGUNTAS.map((pregunta) => {
    const entry = sums.get(pregunta.id);
    const promedio = entry && entry.count ? Math.round((entry.total / entry.count / 4) * 100) : null;
    return { ...pregunta, promedio, respondidas: entry?.count ?? 0 };
  }).filter((item) => item.respondidas > 0);
}

export function entrevistaDestacadas<T extends { promedio: number | null }>(preguntas: T[]): T[] {
  return [...preguntas]
    .filter((item) => (item.promedio ?? 0) >= 75)
    .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0))
    .slice(0, 2);
}

export function entrevistaMejorar<T extends { promedio: number | null }>(preguntas: T[]): T[] {
  return [...preguntas]
    .filter((item) => (item.promedio ?? 0) < 75)
    .sort((a, b) => (a.promedio ?? 0) - (b.promedio ?? 0))
    .slice(0, 2);
}

export function agruparPorDocente(rows: EvaluacionRow[]) {
  const map = new Map<string, { docenteId: string | null; nombre: string; count: number; sumaPct: number }>();
  for (const row of rows) {
    const key = row.docente_id ?? row.docente_nombre;
    const entry = map.get(key) ?? { docenteId: row.docente_id, nombre: row.docente_nombre, count: 0, sumaPct: 0 };
    entry.count += 1;
    entry.sumaPct += row.porcentaje;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((entry) => ({ ...entry, promedio: Math.round(entry.sumaPct / entry.count) }))
    .sort((a, b) => b.promedio - a.promedio);
}

export function agruparPorCurso(rows: EvaluacionRow[]) {
  const map = new Map<string, { cursoId: string | null; nombre: string; count: number; sumaPct: number }>();
  for (const row of rows) {
    const key = row.curso_id ?? row.curso_nombre;
    const entry = map.get(key) ?? { cursoId: row.curso_id, nombre: row.curso_nombre, count: 0, sumaPct: 0 };
    entry.count += 1;
    entry.sumaPct += row.porcentaje;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((entry) => ({ ...entry, promedio: Math.round(entry.sumaPct / entry.count) }))
    .sort((a, b) => b.promedio - a.promedio);
}

export function aggregateFortalezas(rows: EvaluacionRow[]) {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const uniqueFortalezas = new Set(row.fortalezas ?? []);
    for (const texto of uniqueFortalezas) {
      sums.set(texto, (sums.get(texto) ?? 0) + 1);
    }
  }
  if (!rows.length) return [];
  return Array.from(sums.entries())
    .map(([texto, count]) => ({ texto, percent: Math.round((count / rows.length) * 100) }))
    .sort((a, b) => b.percent - a.percent);
}

export function combinarSobresalientes(
  categorias: Array<{ categoria: string; percent: number }>,
  fortalezas: Array<{ texto: string; percent: number }>,
  limit = 3,
) {
  return [
    ...categorias.map((item) => ({ label: item.categoria, percent: item.percent })),
    ...fortalezas.map((item) => ({ label: item.texto, percent: item.percent })),
  ]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit);
}

export function rowToReporteData(row: EvaluacionRow): ReporteData {
  return {
    docenteNombre: row.docente_nombre,
    cursoNombre: row.curso_nombre,
    anio: row.anio,
    trimestre: row.trimestre,
    fecha: row.fecha_observacion,
    pct: row.porcentaje,
    total: row.puntaje_total,
    max: row.puntaje_maximo,
    categoryAnalytics: summarizeScores(row.scores),
    entrevistaStats: summarizeEntrevistas(row.entrevistas),
    fortalezas: row.fortalezas ?? [],
    improvementAreas: summarizeImprovementAreas(row.scores),
    observaciones: row.observaciones ?? "",
  };
}
