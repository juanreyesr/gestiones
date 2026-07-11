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

export type CursoDestacado = { curso: string; nota: number; delta: number | null; evaluaciones: number };
export type CursosUltimoPeriodo = { periodo: string; mejores: CursoDestacado[]; menores: CursoDestacado[] };

/**
 * Las clases mejor y peor calificadas del trimestre en curso, entendido como
 * el ultimo periodo (anio/trimestre) que tenga evaluaciones registradas. Sin
 * nombres de docentes.
 *
 * Cada curso aparece una sola vez aunque tenga varias evaluaciones en el
 * trimestre (se agrupa por nombre, porque el mismo curso puede existir como
 * registros distintos): en las mejor calificadas entra con su nota mas alta y
 * en las de reforzar con su nota mas baja. `delta` compara la primera y la
 * ultima evaluacion del trimestre (+ mejoro / - bajo; null con una sola
 * evaluacion). Un curso del top no se repite en el listado de reforzar.
 */
export function cursosUltimoPeriodo(rows: EvaluacionRow[]): CursosUltimoPeriodo | null {
  if (!rows.length) return null;

  let anio = rows[0].anio;
  let trimestre = rows[0].trimestre;
  for (const row of rows) {
    if (row.anio > anio || (row.anio === anio && row.trimestre > trimestre)) {
      anio = row.anio;
      trimestre = row.trimestre;
    }
  }

  // La clave ignora tildes, mayusculas y espacios repetidos: el mismo curso
  // suele estar registrado con y sin acentos ("Practica..." / "Práctica...").
  const clave = (nombre: string) =>
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const porCurso = new Map<string, EvaluacionRow[]>();
  for (const row of rows) {
    if (row.anio !== anio || row.trimestre !== trimestre) continue;
    const key = clave(row.curso_nombre);
    const list = porCurso.get(key) ?? [];
    list.push(row);
    porCurso.set(key, list);
  }

  const cursos = Array.from(porCurso.values()).map((cursoRows) => {
    const ordenadas = [...cursoRows].sort(
      (a, b) => a.fecha_observacion.localeCompare(b.fecha_observacion) || a.created_at.localeCompare(b.created_at),
    );
    const notas = ordenadas.map((row) => row.porcentaje);
    return {
      curso: ordenadas[ordenadas.length - 1].curso_nombre.trim(),
      notaMax: Math.max(...notas),
      notaMin: Math.min(...notas),
      delta: ordenadas.length > 1 ? ordenadas[ordenadas.length - 1].porcentaje - ordenadas[0].porcentaje : null,
      evaluaciones: ordenadas.length,
    };
  });

  const mejores = [...cursos]
    .sort((a, b) => b.notaMax - a.notaMax)
    .slice(0, 3)
    .map((item) => ({ curso: item.curso, nota: item.notaMax, delta: item.delta, evaluaciones: item.evaluaciones }));

  const enMejores = new Set(mejores.map((item) => item.curso));
  const menores = cursos
    .filter((item) => !enMejores.has(item.curso))
    .sort((a, b) => a.notaMin - b.notaMin)
    .slice(0, 3)
    .map((item) => ({ curso: item.curso, nota: item.notaMin, delta: item.delta, evaluaciones: item.evaluaciones }));

  return { periodo: `T${trimestre} ${anio}`, mejores, menores };
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
