/**
 * Panel de evolución del expediente: arma, a partir de todas las respuestas
 * (cada instrumento aporta sus puntos e hitos desde el registro único),
 * del paciente, una serie en el tiempo por escala (con sus bandas de
 * severidad y la tendencia) y los hitos no numéricos (código vocacional,
 * valores principales). SOLO panel del psicólogo (usa la calificación).
 *
 * Criterios de tendencia (los mismos del informe EAPI):
 * - GAD-7: cambio ≥ 4 puntos (diferencia mínima clínicamente importante).
 * - Demás escalas: cambio de banda (no tienen diferencias mínimas consolidadas).
 * En todas, una puntuación más alta indica más síntomas o más carga.
 */
import { DASS_SUB, type Tendencia } from "./eapi/calificacion";
import type { EvaluacionRespuestaRow } from "./evaluaciones";
import { definicion } from "./registro";

export type BandaSerie = { hasta: number; etiqueta: string; k: "low" | "mid" | "high" };
export type PuntoSerie = { fecha: string; valor: number; banda: string; respuestaId: string; quien: string };
export type SerieEvolucion = {
  id: string;
  grupo: "EAPI" | "B-Breve" | "MCEA";
  nombre: string;
  sigla: string;
  max: number;
  /** Límite superior (incluido) de cada banda, de menor a mayor. */
  bandas: BandaSerie[];
  /** Cambio mínimo de puntos que cuenta como cambio (si no, se usa la banda). */
  mcid?: number;
  puntos: PuntoSerie[];
  /** Última frente a la anterior y frente a la primera. */
  tendencia: Tendencia | null;
  tendenciaInicio: Tendencia | null;
};
export type HitoEvolucion = { fecha: string; tipo: string; titulo: string; detalle: string; respuestaId: string };

const bandaDe = (bandas: BandaSerie[], v: number) => {
  const i = bandas.findIndex((b) => v <= b.hasta);
  return i === -1 ? bandas.length - 1 : i;
};

export function tendenciaEntre(serie: Pick<SerieEvolucion, "bandas" | "mcid">, antes: number, ahora: number): Tendencia {
  if (serie.mcid) return ahora - antes <= -serie.mcid ? "mejora" : ahora - antes >= serie.mcid ? "empeora" : "igual";
  const a = bandaDe(serie.bandas, antes);
  const b = bandaDe(serie.bandas, ahora);
  return b < a ? "mejora" : b > a ? "empeora" : "igual";
}

const BANDAS_DASS = (cuts: readonly number[]): BandaSerie[] => [
  { hasta: cuts[0], etiqueta: "Normal", k: "low" },
  { hasta: cuts[1], etiqueta: "Leve", k: "mid" },
  { hasta: cuts[2], etiqueta: "Moderado", k: "high" },
  { hasta: cuts[3], etiqueta: "Severo", k: "high" },
  { hasta: 42, etiqueta: "Extremadamente severo", k: "high" },
];

type Definicion = Omit<SerieEvolucion, "puntos" | "tendencia" | "tendenciaInicio">;
const DEFINICIONES: Definicion[] = [
  {
    id: "gad",
    grupo: "EAPI",
    nombre: "Ansiedad generalizada",
    sigla: "GAD-7",
    max: 21,
    mcid: 4,
    bandas: [
      { hasta: 4, etiqueta: "Mínima", k: "low" },
      { hasta: 9, etiqueta: "Leve", k: "mid" },
      { hasta: 14, etiqueta: "Moderada", k: "high" },
      { hasta: 21, etiqueta: "Grave", k: "high" },
    ],
  },
  {
    id: "phq9",
    grupo: "MCEA",
    nombre: "Ánimo (depresión)",
    sigla: "PHQ-9",
    max: 27,
    // Cambio fiable ≥ 6 (convención NHS Talking Therapies).
    mcid: 6,
    bandas: [
      { hasta: 4, etiqueta: "Mínima", k: "low" },
      { hasta: 9, etiqueta: "Leve", k: "mid" },
      { hasta: 14, etiqueta: "Moderada", k: "high" },
      { hasta: 19, etiqueta: "Moderadamente grave", k: "high" },
      { hasta: 27, etiqueta: "Grave", k: "high" },
    ],
  },
  { id: "dass-dep", grupo: "EAPI", nombre: "Depresión", sigla: "DASS-21 Dep.", max: 42, bandas: BANDAS_DASS(DASS_SUB.dep.cuts) },
  { id: "dass-anx", grupo: "EAPI", nombre: "Ansiedad (activación)", sigla: "DASS-21 Ans.", max: 42, bandas: BANDAS_DASS(DASS_SUB.anx.cuts) },
  { id: "dass-str", grupo: "EAPI", nombre: "Estrés", sigla: "DASS-21 Est.", max: 42, bandas: BANDAS_DASS(DASS_SUB.str.cuts) },
  {
    id: "ptq",
    grupo: "EAPI",
    nombre: "Pensamiento repetitivo",
    sigla: "PTQ",
    max: 60,
    bandas: [
      { hasta: 21, etiqueta: "No clínico", k: "low" },
      { hasta: 36, etiqueta: "Elevado", k: "mid" },
      { hasta: 60, etiqueta: "Clínico", k: "high" },
    ],
  },
  {
    id: "docs",
    grupo: "EAPI",
    nombre: "Obsesiones y compulsiones",
    sigla: "DOCS",
    max: 80,
    bandas: [
      { hasta: 17, etiqueta: "Bajo el corte", k: "low" },
      { hasta: 20, etiqueta: "Sobre corte 18", k: "mid" },
      { hasta: 80, etiqueta: "Sobre corte 21", k: "high" },
    ],
  },
  {
    id: "b-breve",
    grupo: "B-Breve",
    nombre: "Carga del entorno (cuidadores)",
    sigla: "B-Breve",
    max: 48,
    bandas: [
      { hasta: 11, etiqueta: "Baja", k: "low" },
      { hasta: 23, etiqueta: "Moderada", k: "mid" },
      { hasta: 48, etiqueta: "Alta", k: "high" },
    ],
  },
];

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Series y hitos del paciente, ordenados por fecha. */
export function evolucionDelPaciente(respuestas: EvaluacionRespuestaRow[]) {
  const orden = [...respuestas].sort((a, b) => (fechaDe(a) + a.createdAt).localeCompare(fechaDe(b) + b.createdAt));
  const valores: Record<string, Omit<PuntoSerie, "banda">[]> = {};
  const agregar = (id: string, r: EvaluacionRespuestaRow, valor: number) =>
    (valores[id] ??= []).push({ fecha: fechaDe(r), valor, respuestaId: r.id, quien: r.respondienteNombre });
  const hitos: HitoEvolucion[] = [];

  for (const r of orden) {
    const e = definicion(r.instrumento)?.evolucion?.(r);
    if (!e) continue;
    for (const p of e.puntos) agregar(p.serie, r, p.valor);
    if (e.hito) hitos.push({ fecha: fechaDe(r), ...e.hito, respuestaId: r.id });
  }

  const series: SerieEvolucion[] = DEFINICIONES.filter((d) => valores[d.id]?.length).map((d) => {
    const puntos = valores[d.id].map((p) => ({ ...p, banda: d.bandas[bandaDe(d.bandas, p.valor)].etiqueta }));
    const n = puntos.length;
    return {
      ...d,
      puntos,
      tendencia: n >= 2 ? tendenciaEntre(d, puntos[n - 2].valor, puntos[n - 1].valor) : null,
      tendenciaInicio: n >= 3 ? tendenciaEntre(d, puntos[0].valor, puntos[n - 1].valor) : null,
    };
  });
  return { series, hitos };
}

/** Resumen global: cuántas escalas mejoran, siguen igual o empeoran frente a la aplicación anterior. */
export function resumenEvolucion(series: SerieEvolucion[]) {
  const con = series.filter((s) => s.tendencia);
  const n = { mejora: 0, igual: 0, empeora: 0 } as Record<Tendencia, number>;
  for (const s of con) n[s.tendencia!]++;
  const global: Tendencia | "mixto" | null = !con.length
    ? null
    : n.mejora && n.empeora
      ? "mixto"
      : n.mejora
        ? "mejora"
        : n.empeora
          ? "empeora"
          : "igual";
  return { ...n, comparables: con.length, global };
}

/** Días entre una fecha AAAA-MM-DD y hoy. */
export function diasDesde(fecha: string, hoy = new Date()) {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  const f = new Date(a, m - 1, d);
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((h.getTime() - f.getTime()) / 86_400_000);
}
