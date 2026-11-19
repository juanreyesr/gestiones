/**
 * Ficha 1.1 integrada con el motivo de consulta del expediente (especificación v1.2).
 *  - `baseMotivo`: el punto de partida que se copia, fijo, en la ficha (enlace o «Llenarla yo»).
 *  - `diffPalabras`: comparación simple por palabras (subsecuencia común más larga).
 *  - `comparativaMotivo` / `historialMotivo`: original frente a lo escrito en cada ficha 1.1.
 * El motivo inicial sale, por orden, de la hoja de datos generales («¿Qué le gustaría trabajar?»), del
 * motivo de consulta del expediente (al agendar o en la ficha clínica) o de la última cita.
 */
import { camposDeFicha, fichaPorId } from "./catalogo";
import { datosFichaGuardados, esFichaDelTerapeuta, type BaseMotivo, type ValorCasillas } from "./codigo";
import type { FilaRespuesta } from "./sugeridas";

export const FUENTE_HOJA = "hoja de datos generales";
export const FUENTE_EXPEDIENTE = "expediente (al agendar o en la ficha clínica)";
export const FUENTE_CITA = "última cita o solicitud";

const hoyIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Motivo inicial, por orden: lo que escribió el paciente en la hoja de datos generales («¿Qué le
 * gustaría trabajar?», con la fecha en que la completó), el motivo de consulta del expediente y el de
 * la última cita o solicitud (con la fecha de hoy).
 */
export function baseMotivo(
  paciente: { motivoConsulta?: string | null; motivoPaciente?: string | null; datosCompletadosAt?: string | null } | null | undefined,
  motivoCita?: string | null,
  ahora = new Date()
): BaseMotivo | null {
  const hoja = paciente?.motivoPaciente?.trim();
  if (hoja) {
    const f = paciente?.datosCompletadosAt?.slice(0, 10);
    return { motivo: hoja.slice(0, 3000), fuente: FUENTE_HOJA, fecha: f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : hoyIso(ahora) };
  }
  const delExpediente = paciente?.motivoConsulta?.trim();
  const deCita = motivoCita?.trim();
  const motivo = delExpediente || deCita;
  if (!motivo) return null;
  return { motivo: motivo.slice(0, 3000), fuente: delExpediente ? FUENTE_EXPEDIENTE : FUENTE_CITA, fecha: hoyIso(ahora) };
}

export type TrozoDiff = { tipo: "igual" | "agregado" | "quitado"; texto: string };

const palabras = (t: string) => t.trim().split(/\s+/).filter(Boolean);
/** Para comparar: sin mayúsculas ni signos al borde («ansiedad,» = «Ansiedad»). */
const clave = (p: string) => p.toLocaleLowerCase("es").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** Diferencia por palabras de `antes` a `despues`; los trozos seguidos del mismo tipo se unen. */
export function diffPalabras(antes: string, despues: string): TrozoDiff[] {
  const a = palabras(antes);
  const b = palabras(despues);
  // Textos muy largos: se evita la tabla enorme y se marca todo como reemplazado.
  if (a.length * b.length > 400_000) return unir([...a.map((t) => ({ tipo: "quitado" as const, texto: t })), ...b.map((t) => ({ tipo: "agregado" as const, texto: t }))]);
  const ka = a.map(clave);
  const kb = b.map(clave);
  const n = a.length;
  const m = b.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = ka[i] === kb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: TrozoDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) {
      out.push({ tipo: "igual", texto: b[j] });
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ tipo: "quitado", texto: a[i++] });
    else out.push({ tipo: "agregado", texto: b[j++] });
  }
  while (i < n) out.push({ tipo: "quitado", texto: a[i++] });
  while (j < m) out.push({ tipo: "agregado", texto: b[j++] });
  return unir(out);
}

function unir(trozos: TrozoDiff[]): TrozoDiff[] {
  const out: TrozoDiff[] = [];
  for (const t of trozos) {
    const ult = out[out.length - 1];
    if (ult && ult.tipo === t.tipo) ult.texto += ` ${t.texto}`;
    else out.push({ ...t });
  }
  return out;
}

export type EstadoMotivo = "sin-cambios" | "actualizado" | "sin-base";
export const ETIQUETA_MOTIVO: Record<EstadoMotivo, string> = {
  "sin-cambios": "Sin cambios",
  actualizado: "Actualizado",
  "sin-base": "Sin motivo previo",
};

export type ComparativaMotivo = {
  base: BaseMotivo | null;
  /** Motivo escrito en la ficha 1.1 (vacío si no lo respondió). */
  actual: string;
  estado: EstadoMotivo;
  diff: TrozoDiff[];
  desdeCuando: string;
  afectaHoy: number | null;
  areas: string[];
  metas: { meta: string; avance: string; plazo: string }[];
  primera: string;
  /** Fecha (AAAA-MM-DD) de la ficha y quién la llenó. */
  fecha: string;
  delTerapeuta: boolean;
};

const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Comparativa de una respuesta de la ficha 1.1 (null si no es una 1.1 válida). */
export function comparativaMotivo(fila: Pick<FilaRespuesta, "datos" | "fecha" | "createdAt">): ComparativaMotivo | null {
  const d = datosFichaGuardados(fila.datos);
  if (!d || d.ficha !== "1.1") return null;
  const r = d.respuestas;
  const actual = txt(r.motivo);
  const base = d.base ?? null;
  const iguales = base ? palabras(base.motivo).map(clave).join(" ") === palabras(actual).map(clave).join(" ") : false;
  const estado: EstadoMotivo = !base ? "sin-base" : iguales || !actual ? "sin-cambios" : "actualizado";
  const casillas = r.areas as ValorCasillas | undefined;
  const areas = [...(casillas?.marcadas ?? []), ...(txt(casillas?.otra) ? [txt(casillas?.otra)] : [])];
  const metas = (Array.isArray(r.metas) ? (r.metas as string[][]) : [])
    .map((f) => ({ meta: txt(f[0]), avance: txt(f[1]), plazo: txt(f[2]) }))
    .filter((f) => f.meta || f.avance || f.plazo);
  return {
    base,
    actual,
    estado,
    diff: base && actual && estado === "actualizado" ? diffPalabras(base.motivo, actual) : [],
    desdeCuando: txt(r.desde_cuando),
    afectaHoy: typeof r.afecta_hoy === "number" ? r.afecta_hoy : null,
    areas,
    metas,
    primera: txt(r.primera),
    fecha: (fila.fecha ?? fila.createdAt).slice(0, 10),
    delTerapeuta: esFichaDelTerapeuta(fila.datos),
  };
}

/** Todas las fichas 1.1 del paciente, de la más reciente a la más antigua. */
export function historialMotivo<T extends FilaRespuesta>(respuestas: T[]): (ComparativaMotivo & { fila: T })[] {
  return respuestas
    .filter((r) => r.instrumento === "ficha")
    .map((fila) => ({ fila, c: comparativaMotivo(fila) }))
    .filter((x): x is { fila: T; c: ComparativaMotivo } => x.c !== null)
    .sort((x, y) => (y.c.fecha + y.fila.createdAt).localeCompare(x.c.fecha + x.fila.createdAt))
    .map(({ fila, c }) => ({ ...c, fila }));
}

/** Texto plano de la comparativa (PDF del expediente). */
export function lineasComparativa(c: ComparativaMotivo, fechaLegible: (iso: string) => string): string[] {
  const out: string[] = [];
  out.push(`Ficha 1.1 del ${fechaLegible(c.fecha)}${c.delTerapeuta ? " (llenada por el terapeuta)" : ""} · Motivo: ${ETIQUETA_MOTIVO[c.estado].toLowerCase()}`);
  if (c.base) out.push(`Motivo inicial (${c.base.fuente}${c.base.fecha ? `, ${fechaLegible(c.base.fecha)}` : ""}): ${c.base.motivo}`);
  if (c.estado === "actualizado") out.push(`Motivo en la ficha 1.1: ${c.actual}`);
  else if (c.estado === "sin-base" && c.actual) out.push(`Motivo en la ficha 1.1 (no había un motivo registrado antes): ${c.actual}`);
  if (c.desdeCuando) out.push(`Desde cuándo: ${c.desdeCuando}`);
  if (c.afectaHoy !== null) out.push(`Cuánto le afecta hoy: ${c.afectaHoy}/10`);
  if (c.areas.length) out.push(`Áreas: ${c.areas.join(", ")}`);
  if (c.metas.length) out.push(`Metas: ${c.metas.map((m) => [m.meta, m.avance && `avance: ${m.avance}`, m.plazo && `plazo: ${m.plazo}`].filter(Boolean).join(" · ")).join(" | ")}`);
  if (c.primera) out.push(`Meta para empezar: ${c.primera}`);
  return out;
}

/** ¿La ficha 1.1 tiene los campos que usa la comparativa? (protege contra cambios del catálogo). */
export const camposMotivoPresentes = () => {
  const ids = camposDeFicha(fichaPorId("1.1")!).map((c) => c.id);
  return ["motivo", "desde_cuando", "afecta_hoy", "areas", "metas", "primera"].every((x) => ids.includes(x));
};
