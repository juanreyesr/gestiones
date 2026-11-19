/**
 * Fichas terapéuticas JJR: fichas sugeridas al asignar, según lo que salió alto
 * en el último EAPI o MCEA del paciente (reglas fijas de la especificación) y si
 * las fichas 1.1 y 1.3 ya fueron respondidas. Solo panel (usa la calificación).
 *
 * «Alto» = nivel moderado o superior, el mismo que usan los informes:
 *  - EAPI: GAD-7 ≥ 10; DASS-21 ansiedad o depresión en banda «Moderado» o más; PTQ ≥ 22.
 *  - MCEA: GAD-7 y PHQ-9 en nivel moderado o más (≥ 10); PTQ «algo elevado» o más.
 * Reglas:
 *  - Preocupación y ansiedad, o tensión y palpitaciones → 2.1 y 2.4.
 *  - Ánimo, o tristeza y desgano → 2.2.
 *  - Pensamientos que vuelven → 2.3.
 *  - Siempre: 1.1 y 1.3 si el paciente no las ha respondido.
 */
import { calificarEapi } from "../eapi/calificacion";
import { MODULOS_EAPI, validarEapi } from "../eapi/codigo";
import { datosMceaGuardados } from "../mcea/codigo";
import { scoreAll } from "../mcea/motor";
import { FICHA_IDS, esFichaId, type FichaId } from "./catalogo";

export type FilaRespuesta = { instrumento: string; datos: unknown; fecha?: string | null; createdAt: string };
export type SugerenciaFicha = { ficha: FichaId; motivos: string[] };

const cuando = (r: FilaRespuesta) => r.fecha ?? r.createdAt;
const masReciente = (a: FilaRespuesta, b: FilaRespuesta) => (cuando(b) < cuando(a) ? -1 : cuando(b) > cuando(a) ? 1 : b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0);

/** Fichas que el paciente ya respondió (cualquier aplicación). */
export function fichasRespondidas(respuestas: FilaRespuesta[]): Set<FichaId> {
  const out = new Set<FichaId>();
  for (const r of respuestas) {
    const f = r.instrumento === "ficha" ? (r.datos as { ficha?: unknown } | null)?.ficha : null;
    if (esFichaId(f)) out.add(f);
  }
  return out;
}

type Area = "ansiedad" | "tension" | "animo" | "pensamientos";
const FICHAS_DE_AREA: Record<Area, FichaId[]> = { ansiedad: ["2.1", "2.4"], tension: ["2.1", "2.4"], animo: ["2.2"], pensamientos: ["2.3"] };

/** Áreas altas (con el motivo) del último EAPI. */
function areasEapi(respuestas: FilaRespuesta[]): { area: Area; motivo: string }[] {
  const r = respuestas.filter((x) => x.instrumento === "eapi").sort(masReciente)[0];
  if (!r) return [];
  const d = (r.datos ?? {}) as Record<string, unknown>;
  const modulos = MODULOS_EAPI.filter((m) => Array.isArray(d[m]));
  const v = modulos.length ? validarEapi(r.datos, modulos) : null;
  if (!v?.ok) return [];
  const c = calificarEapi(v.datos);
  const out: { area: Area; motivo: string }[] = [];
  if (c.gad && c.gad.total >= 10) out.push({ area: "ansiedad", motivo: `Preocupación y ansiedad alta en el último EAPI (GAD-7 ${c.gad.total})` });
  if (c.dass && c.dass.anx.band.i >= 2) out.push({ area: "tension", motivo: `Tensión y palpitaciones en el último EAPI (${c.dass.anx.band.label})` });
  if (c.dass && c.dass.dep.band.i >= 2) out.push({ area: "animo", motivo: `Tristeza y desgano en el último EAPI (${c.dass.dep.band.label})` });
  if (c.ptq && c.ptq.total >= 22) out.push({ area: "pensamientos", motivo: `Pensamientos que vuelven en el último EAPI (PTQ ${c.ptq.total})` });
  return out;
}

/** Áreas altas (con el motivo) del último MCEA. */
function areasMcea(respuestas: FilaRespuesta[]): { area: Area; motivo: string }[] {
  const r = respuestas.filter((x) => x.instrumento === "mcea").sort(masReciente)[0];
  const d = r ? datosMceaGuardados(r.datos) : null;
  if (!d) return [];
  const sc = scoreAll(d);
  const out: { area: Area; motivo: string }[] = [];
  if (sc.GAD7 && sc.GAD7.lvl >= 2) out.push({ area: "ansiedad", motivo: `Preocupación y ansiedad alta en el último MCEA (GAD-7 ${sc.GAD7.raw})` });
  if (sc.PHQ9 && sc.PHQ9.lvl >= 2) out.push({ area: "animo", motivo: `Ánimo bajo en el último MCEA (PHQ-9 ${sc.PHQ9.raw})` });
  if (sc.PTQ && sc.PTQ.lvl >= 1) out.push({ area: "pensamientos", motivo: `Pensamientos que vuelven en el último MCEA (PTQ ${sc.PTQ.raw})` });
  return out;
}

/** Fichas sugeridas (en el orden del catálogo), cada una con sus motivos. */
export function fichasSugeridas(respuestas: FilaRespuesta[]): SugerenciaFicha[] {
  const motivos = new Map<FichaId, string[]>();
  const agregar = (f: FichaId, m: string) => motivos.set(f, [...(motivos.get(f) ?? []).filter((x) => x !== m), m]);
  for (const { area, motivo } of [...areasEapi(respuestas), ...areasMcea(respuestas)]) for (const f of FICHAS_DE_AREA[area]) agregar(f, motivo);
  const hechas = fichasRespondidas(respuestas);
  for (const f of ["1.1", "1.3"] as const) if (!hechas.has(f)) agregar(f, "Aún no la ha respondido");
  return FICHA_IDS.filter((f) => motivos.has(f)).map((f) => ({ ficha: f, motivos: motivos.get(f)! }));
}
