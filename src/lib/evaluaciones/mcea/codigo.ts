/**
 * MCEA: avance guardado (borrador), validación de la respuesta y opciones del
 * enlace. Sin calificación clínica (lo usa también el formulario público).
 */
import { BEH, EMO, FOCUS, INS, MCEA_VERSION, type ModuloId } from "./contenido";
import { buildPlan, etiquetas, type MceaEstado, type RegistroGuiado, type Respuesta } from "./motor";

export type MceaOpciones = { modo: "adapt" | "full"; anchor: string[] };
export type MceaBorrador = MceaEstado & { pos: number; inicio: string };
export type MceaDatos = MceaEstado & {
  version: string;
  estado: "completa" | "detenida";
  inicio: string | null;
};

const MODULOS = Object.keys(INS) as ModuloId[];
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const lista = (v: unknown, validos: readonly string[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && validos.includes(x)))] : [];

export function opcionesMcea(opciones: Record<string, unknown> | null | undefined): MceaOpciones {
  const o = opciones ?? {};
  return {
    modo: o.modo === "full" ? "full" : "adapt",
    anchor: lista(o.anchor, MODULOS),
  };
}

const estadoVacio = (op: MceaOpciones): MceaEstado => ({
  modo: op.modo,
  anchor: op.anchor,
  focus: [],
  gate: null,
  answers: {},
  risk: { self: null },
  tr: null,
});

function limpiarRespuestas(v: unknown): Record<string, Respuesta> {
  const out: Record<string, Respuesta> = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    const m = /^([A-Z0-9]+)_(\d+)$/.exec(k);
    const id = m?.[1] as ModuloId | undefined;
    if (!id || !INS[id]) continue;
    const i = Number(m![2]);
    if (i < 1 || i > INS[id].items.length) continue;
    const val = (r as Record<string, unknown> | null)?.v;
    const t = (r as Record<string, unknown> | null)?.t;
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0 || val >= etiquetas(id).length) continue;
    out[k] = { v: val, t: typeof t === "number" && t >= 0 && t < 3_600_000 ? Math.round(t) : 0 };
  }
  return out;
}

function limpiarRegistro(v: unknown): RegistroGuiado | { skip: true } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.skip === true) return { skip: true };
  const int = typeof o.int === "number" ? Math.min(100, Math.max(0, Math.round(o.int))) : 50;
  return {
    sit: texto(o.sit, 1500),
    emo: lista(o.emo, EMO),
    int,
    pen: texto(o.pen, 1500),
    f1: texto(o.f1, 500),
    f2: texto(o.f2, 500),
    beh: lista(o.beh, BEH),
    dis: lista(o.dis, INS.DC.names ?? []),
  };
}

function limpiarEstado(d: Record<string, unknown>, op: MceaOpciones): MceaEstado {
  const risk = (d.risk && typeof d.risk === "object" ? d.risk : {}) as Record<string, unknown>;
  return {
    ...estadoVacio(op),
    focus: lista(d.focus, FOCUS.map((f) => f[0])),
    gate: d.gate === "si" || d.gate === "ex" || d.gate === "no" ? d.gate : null,
    answers: limpiarRespuestas(d.answers),
    risk: { self: risk.self === "no" || risk.self === "duda" || risk.self === "si" ? risk.self : null },
    tr: limpiarRegistro(d.tr),
  };
}

/** Limpia el avance guardado (las opciones del enlace mandan sobre lo que diga el navegador). */
export function limpiarBorradorMcea(datos: unknown, opciones?: Record<string, unknown> | null): MceaBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const op = opcionesMcea(opciones ?? { modo: d.modo, anchor: d.anchor });
  const estado = limpiarEstado(d, op);
  const plan = buildPlan(estado);
  const pos = typeof d.pos === "number" && Number.isInteger(d.pos) ? Math.min(Math.max(0, d.pos), plan.length - 1) : 0;
  const inicio = texto(d.inicio, 40);
  return { ...estado, pos, inicio: /^\d{4}-\d{2}-\d{2}T/.test(inicio) ? inicio : "" };
}

/** Avance: preguntas respondidas del plan actual. */
export function avanceMcea(b: MceaBorrador) {
  const items = buildPlan(b).filter((p) => p.t === "item");
  return { respondidas: items.filter((p) => p.t === "item" && b.answers[`${p.ins}_${p.i}`]).length, total: items.length };
}

/**
 * Valida la respuesta enviada: recalcula el plan con las reglas del
 * instrumento y exige todas sus preguntas. Si la persona se detuvo en la
 * pantalla de riesgo («detenida»), basta con el PHQ-9 y la respuesta de riesgo.
 * Se descartan respuestas de módulos que ya no corresponden.
 */
export function validarMcea(
  cuerpo: unknown,
  opciones: Record<string, unknown> | null | undefined
): { ok: true; datos: MceaDatos } | { ok: false; error: string } {
  const d = (cuerpo && typeof cuerpo === "object" ? cuerpo : null) as Record<string, unknown> | null;
  if (!d) return { ok: false, error: "Respuesta no válida." };
  const op = opcionesMcea(opciones ?? { modo: d.modo, anchor: d.anchor });
  const estado = limpiarEstado(d, op);
  const detenida = d.estado === "detenida";
  const plan = buildPlan(estado);
  const enPlan = new Set(plan.flatMap((p) => (p.t === "item" ? [`${p.ins}_${p.i}`] : [])));
  estado.answers = Object.fromEntries(Object.entries(estado.answers).filter(([k]) => enPlan.has(k)));
  if (detenida) {
    const phq = Array.from({ length: 9 }, (_, i) => estado.answers[`PHQ9_${i + 1}`]);
    if (phq.some((x) => !x) || !estado.risk.self) return { ok: false, error: "Faltan respuestas para registrar la evaluación." };
  } else {
    const faltan = plan.filter((p) => p.t === "item" && !estado.answers[`${p.ins}_${p.i}`]).length;
    if (faltan) return { ok: false, error: `Faltan ${faltan} preguntas por responder.` };
    if (plan.some((p) => p.t === "risk") && !estado.risk.self) return { ok: false, error: "Falta responder la pregunta sobre su seguridad." };
    if (!estado.gate) return { ok: false, error: "Falta responder si tiene pareja." };
    if (!estado.tr) estado.tr = { skip: true };
  }
  const inicio = texto(d.inicio, 40);
  return {
    ok: true,
    datos: { ...estado, version: MCEA_VERSION, estado: detenida ? "detenida" : "completa", inicio: /^\d{4}-\d{2}-\d{2}T/.test(inicio) ? inicio : null },
  };
}

/** Re-valida lo guardado (null si no es una respuesta MCEA válida). */
export function datosMceaGuardados(datos: unknown): MceaDatos | null {
  const d = (datos && typeof datos === "object" ? datos : null) as Record<string, unknown> | null;
  if (!d || typeof d.version !== "string") return null;
  const v = validarMcea(d, { modo: d.modo, anchor: d.anchor });
  return v.ok ? { ...v.datos, version: d.version as string } : null;
}
