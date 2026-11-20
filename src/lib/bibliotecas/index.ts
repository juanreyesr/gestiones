/**
 * Registro de Bibliotecas JJR y relación con los resultados del paciente (solo panel).
 * Ver tipos.ts y la sección «Bibliotecas JJR» de docs/instrumentos/Fichas_terapeuticas_JJR_especificacion.md.
 */
import type { DxId } from "../evaluaciones/eapi/calificacion";
import type { Puntaje } from "../evaluaciones/mcea/motor";
import { BIBLIOTECA_PSICOPATOLOGIA } from "./psicopatologia";
import type { Biblioteca, FichaClinica } from "./tipos";

export type { Biblioteca, FichaClinica, PasoPlan, VistaFicha } from "./tipos";

export const BIBLIOTECAS: Biblioteca[] = [BIBLIOTECA_PSICOPATOLOGIA];

export const bibliotecaPorId = (id: string) => BIBLIOTECAS.find((b) => b.id === id) ?? null;

/** Ficha por id (en cualquier biblioteca), con la biblioteca a la que pertenece. */
export function fichaClinicaPorId(id: string): { ficha: FichaClinica; biblioteca: Biblioteca } | null {
  for (const biblioteca of BIBLIOTECAS) {
    const ficha = biblioteca.fichas.find((f) => f.id === id);
    if (ficha) return { ficha, biblioteca };
  }
  return null;
}

/** Hipótesis del EAPI → ficha clínica. «safety» no tiene ficha (se atiende con el protocolo de riesgo). */
export const FICHA_DE_DX_EAPI: Record<DxId, string | null> = {
  tag: "ansiedad-generalizada",
  tag_sub: "ansiedad-generalizada",
  panic: "panico",
  stress: "adaptacion",
  dep: "depresion-mayor",
  rnt: "rumiacion-estres",
  ocd: "toc",
  ocd_sub: "toc",
  safety: null,
};

const unicos = (ids: (string | null | undefined)[]) => [...new Set(ids.filter((x): x is string => Boolean(x)))].filter((id) => fichaClinicaPorId(id));

/** Fichas clínicas relacionadas con las hipótesis del EAPI, en el orden de las hipótesis. */
export const fichasDeEapi = (dx: { id: DxId }[]) => unicos(dx.map((d) => FICHA_DE_DX_EAPI[d.id]));

/**
 * Fichas clínicas relacionadas con el MCEA (mismas reglas que sus hipótesis): PHQ-9 ≥ 10 → depresión;
 * GAD-7 ≥ 10 → ansiedad generalizada y pánico (el GAD-7 no es específico); PTQ nivel ≥ 2 → rumiación y estrés.
 */
export function fichasDeMcea(sc: Record<string, Puntaje>): string[] {
  const ids: string[] = [];
  if (sc.PHQ9 && sc.PHQ9.raw >= 10) ids.push("depresion-mayor");
  if (sc.GAD7 && sc.GAD7.raw >= 10) ids.push("ansiedad-generalizada", "panico");
  if (sc.PTQ && sc.PTQ.lvl >= 2) ids.push("rumiacion-estres");
  return unicos(ids);
}
