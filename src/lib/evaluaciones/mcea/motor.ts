/**
 * Motor del MCEA (traducción fiel del artefacto original): ramificación
 * adaptativa, plan de preguntas, puntuación, validez de la aplicación,
 * hipótesis clínicas (reglas fijas) y cambio fiable entre aplicaciones.
 * Sin dependencias de la interfaz: lo usan el formulario público (plan) y el
 * panel (puntuación e informes).
 */
import { DEF_NORMS, FOCUS, INS, RS, type ModuloId } from "./contenido";

export type Respuesta = { v: number; t: number };
export type RegistroGuiado = {
  sit: string;
  emo: string[];
  int: number;
  pen: string;
  f1: string;
  f2: string;
  beh: string[];
  dis: string[];
};
export type MceaEstado = {
  modo: "adapt" | "full";
  /** Módulos abiertos en la línea base (reevaluación comparable). */
  anchor: string[];
  focus: string[];
  gate: "si" | "ex" | "no" | null;
  answers: Record<string, Respuesta>;
  risk: { self: "no" | "duda" | "si" | null };
  tr: RegistroGuiado | { skip: true } | null;
};
export type Paso =
  | { t: "consent" }
  | { t: "focus" }
  | { t: "item"; ins: ModuloId; i: number }
  | { t: "risk" }
  | { t: "gate" }
  | { t: "tr" }
  | { t: "end" };

export const rng = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
export const etiquetas = (id: ModuloId) => RS[INS[id].rs];
export const A = (s: MceaEstado, k: string) => s.answers[k]?.v;
const done = (s: MceaEstado, id: string, idx: number[]) => idx.every((i) => A(s, `${id}_${i}`) !== undefined);
const sum = (s: MceaEstado, id: string, idx: number[]) => idx.reduce((t, i) => t + (A(s, `${id}_${i}`) ?? 0), 0);
const mx = (s: MceaEstado, id: string, idx: number[]) => Math.max(...idx.map((i) => A(s, `${id}_${i}`) ?? -1));

export type Ruta = Record<string, { open: boolean; reasons: string[] }>;

/** Qué módulos se abren y por qué. */
export function routing(s: MceaEstado): Ruta {
  const f = s.focus || [];
  const lost = f.includes("nose");
  const d = lost ? 1 : 0;
  const R: Ruta = {};
  const mk = (id: string, conds: [boolean, string][]) => {
    const reasons = conds.filter((c) => c[0]).map((c) => c[1]);
    if (s.modo === "full") reasons.push("Modo completo");
    if ((s.anchor || []).includes(id)) reasons.push("Anclado a la línea base para poder comparar");
    R[id] = { open: reasons.length > 0, reasons };
  };
  const phq = done(s, "PHQ9", rng(9)) ? sum(s, "PHQ9", rng(9)) : -1;
  const gad2 = done(s, "GAD7", [1, 2]) ? sum(s, "GAD7", [1, 2]) : -1;
  mk("GAD7", [
    [gad2 >= 3 - d, `GAD-2 ≥ ${3 - d} (obtuvo ${gad2})`],
    [f.includes("ansiedad"), "Motivo declarado: nervios o preocupación"],
  ]);
  const gad = R.GAD7.open && done(s, "GAD7", rng(7)) ? sum(s, "GAD7", rng(7)) : -1;
  const b12 = mx(s, "BR", [1, 2]);
  const b34 = mx(s, "BR", [3, 4]);
  const b567 = mx(s, "BR", [5, 6, 7]);
  const b89 = mx(s, "BR", [8, 9]);
  mk("PAN", [
    [b12 >= 2, "Puente de pensamientos ≥ «A veces»"],
    [phq >= 10, "PHQ-9 ≥ 10"],
    [f.includes("pensamientos"), "Motivo declarado: pensamientos"],
    [lost, "Motivo declarado: no sabe qué le pasa"],
  ]);
  const pan = R.PAN.open && done(s, "PAN", rng(8)) ? sum(s, "PAN", rng(8)) : -1;
  mk("DC", [
    [pan >= 16, `Pensamientos automáticos con media ≥ «A veces» (${pan}/32)`],
    [b12 >= 3, "Puente de pensamientos ≥ «A menudo»"],
  ]);
  mk("PTQ", [
    [b34 >= 3 - d, `Puente de rumiación ≥ «${RS.f4[3 - d]}»`],
    [phq >= 10, "PHQ-9 ≥ 10"],
    [gad >= 10, "GAD-7 ≥ 10"],
    [f.includes("pensamientos"), "Motivo declarado: pensamientos"],
  ]);
  mk("AS", [
    [b567 >= 3 - d, `Puente de autosabotaje o autocrítica ≥ «${RS.f4[3 - d]}»`],
    [done(s, "BR", [5, 6, 7]) && sum(s, "BR", [5, 6, 7]) >= 6, "Suma de puentes de autosabotaje ≥ 6"],
    [f.includes("metas"), "Motivo declarado: metas"],
  ]);
  const hasP = Boolean(s.gate && s.gate !== "no");
  mk("RP", [
    [hasP && b89 >= 2, "Puente de pareja ≥ «A veces»"],
    [hasP && f.includes("pareja"), "Motivo declarado: pareja"],
  ]);
  if (!hasP) {
    R.RP.open = false;
    if (s.gate === "no") R.RP.reasons = ["Sin relación de pareja en los últimos 12 meses"];
  }
  return R;
}

/** Plan de pasos según lo respondido hasta ahora. */
export function buildPlan(s: MceaEstado): Paso[] {
  const P: Paso[] = [];
  const push = (id: ModuloId, idx: number[]) => idx.forEach((i) => P.push({ t: "item", ins: id, i }));
  P.push({ t: "consent" });
  P.push({ t: "focus" });
  push("PHQ9", rng(9));
  if ((A(s, "PHQ9_9") ?? 0) >= 1) P.push({ t: "risk" });
  push("GAD7", [1, 2]);
  const R = routing(s);
  if (R.GAD7.open) push("GAD7", [3, 4, 5, 6, 7]);
  push("BR", rng(7));
  P.push({ t: "gate" });
  if (s.gate && s.gate !== "no") push("BR", [8, 9]);
  for (const id of ["PAN", "DC", "PTQ", "AS", "RP"] as ModuloId[]) if (R[id].open) push(id, rng(INS[id].items.length));
  push("FR", rng(4));
  P.push({ t: "tr" });
  P.push({ t: "end" });
  return P;
}

export type Puntaje = {
  id: string;
  raw: number;
  max: number;
  /** Ausentes en el filtro GAD-2 (como en el original). */
  mean?: number;
  k?: number;
  label: string;
  lvl: number;
  subs?: Record<string, { raw: number; max: number; mean: number; lvl: number; label: string }>;
};

function expBand(m: number): [string, number] {
  return m < 1 ? ["Bajo", 0] : m < 2 ? ["Leve", 1] : m < 3 ? ["Moderado", 2] : ["Alto", 3];
}

/** Puntajes de los módulos aplicados completos (GAD2 si solo se aplicó el filtro). */
export function scoreAll(s: MceaEstado): Record<string, Puntaje> {
  const R = routing(s);
  const out: Record<string, Puntaje> = {};
  const one = (id: ModuloId) => {
    const I = INS[id];
    const k = I.items.length;
    const idx = rng(k);
    if (!done(s, id, idx)) return;
    const raw = sum(s, id, idx);
    const top = etiquetas(id).length - 1;
    const mean = raw / k;
    const o: Puntaje = { id, raw, max: k * top, mean, k, label: "", lvl: 0 };
    if (I.bands) {
      let b = I.bands[0];
      for (const x of I.bands) if (raw >= x[0]) b = x;
      o.label = b[1];
      o.lvl = b[2];
    } else if (I.better === "high") {
      const m = (mean * 4) / top;
      o.label = m >= 3 ? "Recursos sólidos" : m >= 2 ? "Recursos presentes" : "Recursos escasos";
      o.lvl = m >= 3 ? 0 : m >= 2 ? 1 : 2;
    } else {
      const b = expBand((mean * 4) / top);
      o.label = b[0];
      o.lvl = b[1];
    }
    if (I.sub) {
      o.subs = {};
      for (const n in I.sub) {
        const r = sum(s, id, I.sub[n]);
        const m = r / I.sub[n].length;
        o.subs[n] = { raw: r, max: I.sub[n].length * top, mean: m, lvl: expBand(m)[1], label: expBand(m)[0] };
      }
    }
    out[id] = o;
  };
  one("PHQ9");
  if (R.GAD7.open) one("GAD7");
  if (!out.GAD7 && done(s, "GAD7", [1, 2])) {
    const r = sum(s, "GAD7", [1, 2]);
    out.GAD2 = { id: "GAD2", raw: r, max: 6, label: r >= 3 ? "Tamizaje positivo" : "Tamizaje negativo", lvl: r >= 3 ? 2 : 0 };
  }
  for (const id of ["PAN", "DC", "PTQ", "AS", "RP"] as ModuloId[]) if (R[id].open) one(id);
  one("FR");
  return out;
}

/** Nombre del módulo (incluye el filtro GAD-2). */
export const nombreModulo = (id: string) => (id === "GAD2" ? "GAD-2 · Filtro de ansiedad" : (INS[id as ModuloId]?.name ?? id));

/** Señales de validez de la aplicación. */
export function validity(s: MceaEstado, detenida: boolean) {
  const fl: string[] = [];
  const ts = Object.values(s.answers)
    .map((a) => a.t)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);
  if (ts.length >= 10) {
    const med = ts[Math.floor(ts.length / 2)];
    if (med < 1200) fl.push(`Respuesta muy rápida: mediana de ${Math.round(med / 100) / 10} s por ítem. Interpretar con cautela.`);
  }
  for (const id of Object.keys(INS) as ModuloId[]) {
    if (id === "BR") continue;
    const k = INS[id].items.length;
    if (k < 8 || !done(s, id, rng(k))) continue;
    const v = rng(k).map((i) => A(s, `${id}_${i}`));
    if (v.every((x) => x === v[0]) && (v[0] ?? 0) > 0) fl.push(`Respuesta invariante en ${INS[id].name} (todas las respuestas iguales).`);
  }
  if (detenida) fl.push("La persona detuvo la evaluación antes de terminar.");
  return fl;
}

/** Hipótesis para explorar y evaluación adicional sugerida (reglas fijas del original). */
export function hypotheses(a: MceaEstado, sc: Record<string, Puntaje>) {
  const H: string[] = [];
  const S: string[] = [];
  const L = (id: string) => (sc[id] ? sc[id].lvl : -1);
  const sub = (id: string, n: string) => (sc[id]?.subs ? sc[id].subs![n].lvl : -1);
  const i9 = A(a, "PHQ9_9") ?? 0;
  if (sc.PHQ9 && sc.PHQ9.raw >= 10) {
    H.push(`Sintomatología depresiva en rango clínico de tamizaje (PHQ-9 = ${sc.PHQ9.raw}). Compatible con un cuadro depresivo a confirmar: verificar en entrevista los criterios de episodio depresivo mayor (DSM-5-TR) o episodio depresivo F32 (CIE-10), duración, deterioro funcional, y descartar causa médica, sustancias, duelo y antecedentes de manía o hipomanía.`);
    S.push("Entrevista diagnóstica estructurada o semiestructurada para trastornos del estado de ánimo.");
  } else if (L("PHQ9") === 1) H.push(`Síntomas depresivos leves (PHQ-9 = ${sc.PHQ9.raw}): por debajo del umbral de tamizaje. Vigilar evolución y explorar factores situacionales.`);
  if (sc.GAD7 && sc.GAD7.raw >= 10) {
    H.push(`Ansiedad en rango clínico de tamizaje (GAD-7 = ${sc.GAD7.raw}). El GAD-7 no es específico: explorar ansiedad generalizada (F41.1), pánico, ansiedad social y estrés postraumático.`);
    S.push("Entrevista dirigida a trastornos de ansiedad; valorar medida específica según el cuadro.");
  }
  if (L("PTQ") >= 2)
    H.push(`Pensamiento negativo repetitivo elevado (PTQ = ${sc.PTQ.raw}). Proceso transdiagnóstico que suele mantener tanto el ánimo bajo como la ansiedad: candidato a foco de intervención (entrenamiento atencional, activación conductual, defusión, tiempo de preocupación).`);
  if (L("PAN") >= 2) {
    const top = Object.entries(sc.PAN.subs!).sort((x, y) => y[1].mean - x[1].mean)[0];
    H.push(`Pensamientos automáticos negativos frecuentes, con mayor carga en contenidos «${top[0].toLowerCase()}». Explorar creencias intermedias y nucleares asociadas mediante flecha descendente.`);
    S.push("ATQ-8 en su versión validada en español (Ruiz et al., 2017) para una medida normada de pensamientos automáticos.");
  }
  if (sc.DC) {
    const hi = rng(10).filter((i) => (A(a, `DC_${i}`) ?? 0) >= 3).map((i) => INS.DC.names![i - 1]);
    if (hi.length) H.push(`Distorsiones predominantes según autoinforme: ${hi.join(", ")}. Usarlas como punto de partida del registro de pensamientos y la reestructuración.`);
  }
  if (sub("AS", "Exigencia que paraliza") >= 2 && sub("AS", "Postergar y evitar") >= 2)
    H.push("Posible ciclo perfeccionismo → miedo a fallar → postergación → autocrítica. Trabajar estándares flexibles y exposición a la tarea imperfecta.");
  if (sub("AS", "Frenarse cuando va bien") >= 2)
    H.push("Indicadores de freno ante el logro (creencia de no merecer, anticipación de pérdida). Explorar creencias de defectuosidad o fracaso y la historia de aprendizaje asociada.");
  if (sub("AS", "Autocrítica") >= 2) {
    H.push("Autocrítica marcada. Factor de vulnerabilidad para depresión y obstáculo frecuente para el cambio.");
    S.push("FSCRS-SF (formas de autocrítica y autotranquilización), validada en España; confirmar condiciones de uso con los autores.");
  }
  if (sub("RP", "Miedo a perder a la pareja") >= 2 || sub("RP", "Desconfianza") >= 2) {
    H.push("Patrón relacional de hiperactivación: temor al abandono o desconfianza con conductas de comprobación y búsqueda de confirmación. Compatible con ansiedad de apego, a confirmar con instrumento validado.");
    S.push("ECR en su versión breve validada en español para ansiedad y evitación del apego.");
  }
  if (sub("RP", "Tomar distancia") >= 2) H.push("Patrón relacional de desactivación: distancia emocional y retirada ante la cercanía. Explorar evitación del apego.");
  if (sub("RP", "Ponerse a la defensiva") >= 2) H.push("Defensividad en el conflicto de pareja. Valorar entrenamiento en comunicación y regulación emocional durante las discusiones.");
  if (sc.RP) H.push("El módulo de pareja no evalúa violencia. Si hay indicios, hacer tamizaje específico de violencia en la pareja en entrevista individual.");
  if (L("RP") >= 2 && L("PTQ") >= 2 && sub("AS", "Autocrítica") >= 2)
    H.push("Hipótesis integradora: los conflictos o señales ambiguas en la pareja activan interpretaciones de rechazo, seguidas de rumiación y autoataque, que a su vez alimentan conductas que tensan la relación.");
  if (sc.FR && sc.FR.lvl === 2) H.push("Recursos personales escasos según autoinforme. Priorizar red de apoyo y estrategias de regulación antes de trabajo cognitivo exigente.");
  if (sc.PHQ9 && sc.PHQ9.raw < 5 && (!sc.GAD7 || sc.GAD7.raw < 5) && !["PAN", "PTQ", "AS", "RP"].some((id) => L(id) >= 2))
    H.push("Sin indicadores elevados en los dominios evaluados. Si hay malestar referido, explorar causas situacionales, de ciclo vital o no patológicas, y dominios que esta batería no cubre.");
  if (i9 >= 1 || (sc.PHQ9 && sc.PHQ9.raw >= 15))
    S.unshift("Evaluación de riesgo suicida estructurada en la próxima sesión o antes (por ejemplo, C-SSRS) y plan de seguridad si procede.");
  if ((A(a, "PHQ9_3") ?? 0) >= 2) S.push("Explorar sueño (higiene, insomnio, hipersomnia).");
  if (["PAN", "AS", "RP"].filter((id) => L(id) >= 2).length >= 2) S.push("Si el patrón parece crónico, considerar evaluación de esquemas (YSQ-S3, requiere licencia).");
  return { H, S };
}

/** Ítems con respuesta alta (o recursos bajos), como en el informe clínico original. */
export function itemsCriticos(a: MceaEstado, sc: Record<string, Puntaje>) {
  const crit: [string, string, string][] = [];
  for (const id of Object.keys(sc)) {
    const I = INS[id as ModuloId];
    if (!I) continue;
    const top = etiquetas(id as ModuloId).length - 1;
    rng(I.items.length).forEach((i) => {
      const v = A(a, `${id}_${i}`);
      if (v === undefined) return;
      const alta = id === "FR" ? v <= 1 : top === 3 ? v >= 2 : v >= 4;
      if (alta) crit.push([I.name, I.items[i - 1], etiquetas(id as ModuloId)[v]]);
    });
  }
  return crit;
}

/** Cambio mínimo fiable (Jacobson y Truax, 1991) con las normas por defecto. */
export function cambioMinimo(id: string) {
  const n = DEF_NORMS[id];
  if (n?.mcf) return { v: n.mcf, cut: n.cut, src: n.src };
  if (n?.sd && n.rel) return { v: 1.96 * n.sd * Math.sqrt(2 * (1 - n.rel)), cut: n.cut, src: n.src };
  return null;
}

export type Clase = "rec" | "mej" | "sc" | "det" | "sn";
export const CLS: Record<Clase, [string, number | "n"]> = {
  rec: ["Recuperado", 0],
  mej: ["Mejoría fiable", 0],
  sc: ["Sin cambio fiable", 1],
  det: ["Deterioro fiable", 3],
  sn: ["Sin norma: cambio bruto", "n"],
};

/** Comparación entre dos aplicaciones (T1 → T2). */
export function compare(a1: MceaEstado, a2: MceaEstado) {
  const s1 = scoreAll(a1);
  const s2 = scoreAll(a2);
  const rows: { id: ModuloId; t1: Puntaje; t2: Puntaje; d: number; m: ReturnType<typeof cambioMinimo>; cls: Clase }[] = [];
  const skipped: string[] = [];
  for (const id of Object.keys(INS) as ModuloId[]) {
    if (id === "BR") continue;
    if (!s1[id] || !s2[id]) {
      if (s1[id] || s2[id]) skipped.push(INS[id].name);
      continue;
    }
    const d = s2[id].raw - s1[id].raw;
    const m = cambioMinimo(id);
    const hi = INS[id].better === "high";
    const better = hi ? d > 0 : d < 0;
    let cls: Clase;
    if (!m) cls = "sn";
    else if (Math.abs(d) < m.v) cls = "sc";
    else if (better) cls = !hi && m.cut != null && s1[id].raw >= m.cut && s2[id].raw < m.cut ? "rec" : "mej";
    else cls = "det";
    rows.push({ id, t1: s1[id], t2: s2[id], d, m, cls });
  }
  return { rows, skipped };
}

/** Para el paciente: cambio a favor, parecido o en contra (escalas sin norma: ±15 % del rango). */
export function cambioParaPaciente(a1: MceaEstado, a2: MceaEstado) {
  const c = compare(a1, a2);
  const G = { m: [] as string[], s: [] as string[], d: [] as string[] };
  for (const r of c.rows) {
    const n = INS[r.id].name.replace(/^[A-Z0-9-]+ · /, "");
    let k: Clase = r.cls;
    if (k === "sn") {
      const rel = (INS[r.id].better === "high" ? r.d : -r.d) / r.t1.max;
      k = rel >= 0.15 ? "mej" : rel <= -0.15 ? "det" : "sc";
    }
    (k === "rec" || k === "mej" ? G.m : k === "det" ? G.d : G.s).push(n);
  }
  return G;
}

/** Módulos abiertos (para anclar la reevaluación). */
export const modulosAbiertos = (s: MceaEstado) =>
  Object.entries(routing(s))
    .filter(([, r]) => r.open)
    .map(([id]) => id);

export const textoFoco = (f: string) => FOCUS.find((x) => x[0] === f)?.[1] ?? f;
