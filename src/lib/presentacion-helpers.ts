import { getSupabaseClient } from "@/lib/supabase";
import type { EvaluacionRow } from "@/lib/evaluacion-helpers";
import type { Trimestre } from "@/data/evaluacion";

type CarreraRel = { nombre: string } | { nombre: string }[] | null;

type CursoCarreraRow = {
  id: string;
  carrera_id: string | null;
  gestionesjj_carreras: CarreraRel;
};

export async function fetchCursoCarreraMap(): Promise<{ data: Map<string, string>; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: new Map(), error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_cursos").select("id,carrera_id,gestionesjj_carreras(nombre)");
  if (error) return { data: new Map(), error: error.message };

  const map = new Map<string, string>();
  for (const row of (data ?? []) as unknown as CursoCarreraRow[]) {
    const rel = row.gestionesjj_carreras;
    const nombre = Array.isArray(rel) ? rel[0]?.nombre : rel?.nombre;
    if (nombre) map.set(row.id, nombre);
  }
  return { data: map, error: null };
}

export type PeriodoResumen = { periodo: string; anio: number; trimestre: Trimestre; promedio: number; evaluaciones: number };

export function resumenPorPeriodo(rows: EvaluacionRow[]): PeriodoResumen[] {
  const map = new Map<string, { anio: number; trimestre: Trimestre; total: number; count: number }>();
  for (const row of rows) {
    const key = `${row.anio}-${row.trimestre}`;
    const entry = map.get(key) ?? { anio: row.anio, trimestre: row.trimestre, total: 0, count: 0 };
    entry.total += row.porcentaje;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .sort((a, b) => a.anio - b.anio || a.trimestre - b.trimestre)
    .map((entry) => ({
      periodo: `T${entry.trimestre} ${entry.anio}`,
      anio: entry.anio,
      trimestre: entry.trimestre,
      promedio: Math.round(entry.total / entry.count),
      evaluaciones: entry.count,
    }));
}

export type CarreraResumen = { carrera: string; promedio: number; evaluaciones: number; docentes: number };

export function resumenPorCarrera(rows: EvaluacionRow[], cursoCarrera: Map<string, string>): CarreraResumen[] {
  const map = new Map<string, { total: number; count: number; docentes: Set<string> }>();
  for (const row of rows) {
    const carrera = cursoCarrera.get(row.curso_id ?? "") ?? "Sin carrera asignada";
    const entry = map.get(carrera) ?? { total: 0, count: 0, docentes: new Set<string>() };
    entry.total += row.porcentaje;
    entry.count += 1;
    entry.docentes.add(row.docente_id ?? row.docente_nombre);
    map.set(carrera, entry);
  }
  return Array.from(map.entries())
    .map(([carrera, entry]) => ({
      carrera,
      promedio: Math.round(entry.total / entry.count),
      evaluaciones: entry.count,
      docentes: entry.docentes.size,
    }))
    .sort((a, b) => b.promedio - a.promedio);
}

export function contarEntrevistas(rows: EvaluacionRow[]): number {
  return rows.reduce((sum, row) => sum + (row.entrevistas ?? []).length, 0);
}

export function criteriosDebiles(
  items: Array<{ categoria: string; texto: string; percent: number | null }>,
  categoria: string,
  limit = 3,
) {
  return items
    .filter((item) => item.categoria === categoria && item.percent !== null && item.percent < 100)
    .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
    .slice(0, limit);
}
