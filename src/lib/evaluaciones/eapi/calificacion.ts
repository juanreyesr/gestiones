/**
 * EAPI (Batería AEI): clave de calificación (Anexo B de la especificación,
 * transcrita del prototipo). SOLO para el panel del psicólogo: nunca importar
 * desde el formulario del paciente.
 */
import { MODULOS_EAPI, type ModuloEapi } from "./codigo";
import { DOCS, GAD_FUNC, GAD_LABELS } from "./escalas";

export { MODULOS_EAPI, type ModuloEapi };

/** Respuestas: un módulo no aplicado queda en null. */
export type EapiDatos = {
  gad: number[] | null;
  dass: number[] | null;
  ptq: number[] | null;
  docs: number[] | null;
  safety: number;
  func: number | null;
  edad?: number | null;
  ref?: string;
  nombre?: string;
  fecha?: string;
  abierta?: string;
};

export const modulosDe = (r: Pick<EapiDatos, ModuloEapi>) => MODULOS_EAPI.filter((m) => Array.isArray(r[m]));

export type Nivel = "alert" | "warn" | "";
export type DxId = "tag" | "tag_sub" | "panic" | "stress" | "dep" | "rnt" | "ocd" | "ocd_sub" | "safety";
export type DxBloque = { title: string; codes: string[]; text: string; bullets: string[] };

export const DASS_SUB = {
  dep: { name: "Depresión", items: [3, 5, 10, 13, 16, 17, 21], cuts: [9, 13, 20, 27] }, // sobre puntuación ×2 (equivalente DASS-42)
  anx: { name: "Ansiedad", items: [2, 4, 7, 9, 15, 19, 20], cuts: [7, 9, 14, 19] },
  str: { name: "Estrés", items: [1, 6, 8, 11, 12, 14, 18], cuts: [14, 18, 25, 33] },
} as const;
export const DASS_BANDS = ["Normal", "Leve", "Moderado", "Severo", "Extremadamente severo"] as const;
export const PTQ_SUB = {
  core: { name: "Características centrales (repetitivo, intrusivo, difícil de desconectar)", items: [1, 2, 3, 6, 7, 8, 11, 12, 13], max: 36 },
  unprod: { name: "Improductividad", items: [4, 9, 14], max: 12 },
  capture: { name: "Captura de la capacidad mental", items: [5, 10, 15], max: 12 },
} as const;

/* ===================== COMENTARIOS COMPLEMENTARIOS DSM-5-TR / CIE-11 ===================== */
// Se muestran SOLO en la vista profesional, condicionados a las puntuaciones. Son orientación para la entrevista, no diagnóstico.
export const DX: Record<DxId, DxBloque> = {
  tag: {title:"Hipótesis a explorar: Trastorno de ansiedad generalizada", codes:["DSM-5-TR: F41.1","CIE-11: 6B00"],
    text:"El GAD-7 fue construido sobre los criterios del TAG; un total ≥ 10 es cribado positivo (sensibilidad 86,8 % y especificidad 93,4 % en la validación española). Verificar en entrevista:",
    bullets:["DSM-5-TR (F41.1): ansiedad y preocupación excesivas, más días de los que no, durante ≥ 6 meses, sobre varias actividades; difícil de controlar; ≥ 3 de 6 síntomas (inquietud, fatigabilidad, dificultad para concentrarse, irritabilidad, tensión muscular, alteración del sueño); malestar o deterioro significativo; no atribuible a sustancias, enfermedad médica ni a otro trastorno mental.",
             "CIE-11 (6B00): aprensión generalizada o preocupación excesiva centrada en varios sucesos cotidianos, presente la mayoría de los días durante al menos varios meses, con síntomas como tensión muscular o inquietud motora, hiperactividad simpática, nerviosismo subjetivo, dificultad de concentración, irritabilidad o alteraciones del sueño.",
             "Diferencial: preocupación del TAG (temas de la vida real, egosintónica) frente a obsesiones del TOC (intrusivas, egodistónicas); episodios de pánico (6B01 / F41.0); trastorno de adaptación si hay un estresor identificable reciente."]},
  tag_sub: {title:"Síntomas de ansiedad por debajo del umbral de cribado", codes:["Referencia: DSM-5-TR F41.1 · CIE-11 6B00"],
    text:"GAD-7 entre 5 y 9 (leve). No se cumple el punto de corte de 10. Explorar duración, control de la preocupación y repercusión funcional (ítem adicional). Si el malestar es claro pero no encaja en una categoría, DSM-5-TR permite «Otro trastorno de ansiedad especificado» (F41.8) o «no especificado» (F41.9); CIE-11, 6B0Y / 6B0Z.", bullets:[]},
  panic: {title:"Hipótesis a explorar: activación autonómica / pánico y otros trastornos de ansiedad", codes:["DSM-5-TR: F41.0 (pánico) · F40.00 (agorafobia) · F40.10 (ansiedad social)","CIE-11: 6B01 · 6B02 · 6B04"],
    text:"La subescala Ansiedad del DASS-21 recoge activación autonómica, ansiedad situacional y experiencia subjetiva de miedo; según sus autores se relaciona con trastornos de ansiedad distintos del TAG. Verificar:",
    bullets:["Pánico (F41.0 / 6B01): crisis recurrentes e inesperadas de miedo intenso con síntomas físicos que alcanzan su máximo en minutos, seguidas de ≥ 1 mes de preocupación por nuevas crisis o cambio de conducta.",
             "Agorafobia (F40.00 / 6B02) y ansiedad social (F40.10 / 6B04): miedo y evitación marcados ante situaciones específicas, desproporcionados y persistentes (≥ 6 meses en DSM-5-TR; «varios meses» en CIE-11).",
             "Descartar causas médicas y por sustancias (hipertiroidismo, cafeína, estimulantes, abstinencia)."]},
  stress: {title:"Hipótesis a explorar: reacción a estresores / trastorno de adaptación", codes:["DSM-5-TR: F43.2x (adaptación: .21 ánimo deprimido, .22 ansiedad, .23 mixto, .24 conducta, .25 mixto emoción-conducta, .20 no especificado) · F43.0 (estrés agudo)","CIE-11: 6B43 (adaptación) · QE84 (reacción aguda al estrés) · QD85 (síndrome de desgaste ocupacional)"],
    text:"El «estrés» no es una categoría diagnóstica por sí misma. La subescala Estrés del DASS-21 (tensión, irritabilidad, dificultad para relajarse, sobrerreacción) se solapa con los síntomas del TAG según los autores de la escala. Verificar:",
    bullets:["Trastorno de adaptación (F43.2x / 6B43): síntomas emocionales o conductuales en respuesta a un estresor identificable, iniciados en los 3 meses siguientes (DSM-5-TR) o aproximadamente en el mes siguiente (CIE-11), con preocupación excesiva y rumiación sobre el estresor; en CIE-11 suele remitir en los 6 meses posteriores a la desaparición del estresor.",
             "Reacción aguda al estrés (QE84, CIE-11; no es un trastorno) y trastorno de estrés agudo (F43.0, DSM-5-TR: 3 días a 1 mes tras un evento traumático).",
             "Síndrome de desgaste ocupacional (QD85, CIE-11: fenómeno ocupacional, no trastorno) cuando el estresor es laboral: agotamiento, distancia mental del trabajo, menor eficacia.",
             "Si la preocupación es generalizada y de larga duración, la hipótesis vuelve a ser TAG (F41.1 / 6B00)."]},
  dep: {title:"Hipótesis a explorar: trastorno depresivo", codes:["DSM-5-TR: F32.x (episodio único) · F33.x (recurrente) · F34.1 (depresivo persistente)","CIE-11: 6A70 · 6A71 · 6A72 (distímico) · 6A73 (mixto depresivo y ansioso)"],
    text:"La batería no incluye una medida de depresión completa; la subescala Depresión del DASS-21 (disforia, anhedonia, desesperanza, devaluación de la vida) actúa como señal. Verificar:",
    bullets:["Episodio depresivo (F32.x–F33.x / 6A70–6A71): ánimo deprimido o pérdida de interés casi todo el día, casi cada día, ≥ 2 semanas, con ≥ 5 síntomas en DSM-5-TR; en CIE-11 se gradúa en leve, moderado y grave con o sin síntomas psicóticos (cuarto carácter).",
             "Trastorno depresivo persistente / distímico (F34.1 / 6A72): ánimo deprimido la mayor parte del tiempo durante ≥ 2 años.",
             "Trastorno mixto depresivo y ansioso (6A73, solo CIE-11): síntomas depresivos y ansiosos la mayoría de los días durante ≥ 2 semanas, sin que ninguno alcance por separado los criterios de un trastorno.",
             "Revisar siempre el ítem de seguridad y los ítems 10 y 21 del DASS-21 (desesperanza)."]},
  rnt: {title:"Pensamiento negativo repetitivo elevado (proceso transdiagnóstico)", codes:["Sin código propio: es un proceso, no un trastorno","Se asocia a F41.1 / 6B00 (preocupación), F32–F33 / 6A70–6A71 (rumiación), F42.2 / 6B20 (obsesiones) y 6B43 (rumiación sobre el estresor)"],
    text:"El PTQ mide la tendencia a pensar de forma repetitiva, intrusiva y difícil de desconectar con independencia del contenido. No tiene puntos de corte diagnósticos; la media de los grupos clínicos ronda los 37 puntos y la de los no clínicos entre 22 y 28. Lectura sugerida:",
    bullets:["PTQ alto + GAD-7 alto: el contenido probable es preocupación orientada al futuro (TAG).",
             "PTQ alto + DASS-Depresión alto: el contenido probable es rumiación orientada al pasado (depresión).",
             "PTQ alto + DOCS alto (si se aplicó): considerar obsesiones; indagar carácter egodistónico y neutralizaciones.",
             "Es un objetivo de tratamiento en sí mismo (p. ej., terapia metacognitiva, TCC centrada en rumiación, mindfulness)."]},
  ocd: {title:"Hipótesis a explorar: Trastorno obsesivo-compulsivo", codes:["DSM-5-TR: F42.2","CIE-11: 6B20 (6B20.0 con introspección regular o buena · 6B20.1 con introspección escasa o ausente · 6B20.Z sin especificar)"],
    text:"DOCS total ≥ 18 distingue al TOC de personas sin diagnóstico (≈ 78 % de clasificación correcta) y ≥ 21 lo distingue de otros trastornos de ansiedad (≈ 70 %). Verificar:",
    bullets:["DSM-5-TR (F42.2): presencia de obsesiones (pensamientos, impulsos o imágenes recurrentes, intrusivos y no deseados que la persona intenta ignorar, suprimir o neutralizar) y/o compulsiones (conductas o actos mentales repetitivos dirigidos a reducir la ansiedad); consumen > 1 hora al día o causan malestar o deterioro significativo; no atribuibles a sustancias ni mejor explicados por otro trastorno. Especificadores de introspección (buena/aceptable, poca, ausente/delirante) y «relacionado con tics».",
             "CIE-11 (6B20): obsesiones y/o compulsiones persistentes que consumen tiempo (p. ej., > 1 hora al día) o producen malestar o deterioro significativo; el grado de introspección se codifica en el cuarto carácter.",
             "Diferencial: preocupaciones del TAG (realistas, sin neutralización ritual), rumiación depresiva, trastorno dismórfico corporal (F45.22 / 6B21), acumulación (F42.3 / 6B24).",
             "La dimensión con mayor puntuación orienta el contenido principal (contaminación, daño/comprobación, pensamientos inaceptables, simetría)."]},
  ocd_sub: {title:"Síntomas obsesivo-compulsivos por debajo del punto de corte", codes:["Referencia: DSM-5-TR F42.2 · CIE-11 6B20"],
    text:"DOCS total < 18. Si alguna dimensión destaca (≥ 8 puntos), explorarla en entrevista; los síntomas obsesivos subclínicos son frecuentes en población general y en otros trastornos de ansiedad.", bullets:[]},
  safety: {title:"Ideación de muerte o autolesión: prioridad absoluta", codes:["Códigos de síntoma (no diagnóstico): CIE-10-MC R45.851 (ideación suicida) · CIE-11 MB26.A (ideación suicida)"],
    text:"El paciente marcó ≥ 1 en el ítem de seguridad (ítem 9 del PHQ-9). El sistema le mostró las líneas de ayuda configuradas. Acciones:",
    bullets:["Contactar al paciente antes de la próxima sesión y realizar evaluación de riesgo estructurada (ideación pasiva/activa, plan, medios, intención, intentos previos, factores protectores).",
             "Documentar la evaluación y el plan de seguridad; valorar interconsulta psiquiátrica o derivación a urgencias según el nivel de riesgo.",
             "No depende de la puntuación de ninguna otra escala: un solo punto obliga a actuar."]}
};

/* ===================== CALIFICACIÓN ===================== */
export type Banda = { k: "low" | "mid" | "high"; label: string; long?: string };
export type BandaDass = Banda & { i: number };

const sum = (arr: number[], idx: readonly number[]) => idx.reduce((s, n) => s + (arr[n - 1] || 0), 0);
const total = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

export function gadBand(t: number): Banda {
  return t <= 4 ? { k: "low", label: "Mínima" } : t <= 9 ? { k: "mid", label: "Leve" } : t <= 14 ? { k: "high", label: "Moderada" } : { k: "high", label: "Grave" };
}
export function dassBand(x2: number, cuts: readonly number[]): BandaDass {
  let i = 0;
  while (i < 4 && x2 > cuts[i]) i++;
  return { i, label: DASS_BANDS[i], k: i === 0 ? "low" : i === 1 ? "mid" : "high" };
}
export function ptqBand(t: number): Banda {
  return t < 22 ? { k: "low", label: "Rango no clínico" } : t < 37 ? { k: "mid", label: "Elevado" } : { k: "high", label: "Rango clínico" };
}
export function docsBand(t: number): Banda {
  return t < 18
    ? { k: "low", label: "Bajo el corte", long: "Por debajo de 18" }
    : t < 21
      ? { k: "mid", label: "Sobre corte 18", long: "≥ 18: distingue TOC de personas sin diagnóstico" }
      : { k: "high", label: "Sobre corte 21", long: "≥ 21: distingue TOC de otros trastornos de ansiedad" };
}

type DassClave = keyof typeof DASS_SUB;
type PtqClave = keyof typeof PTQ_SUB;

type ResultadoGad = { total: number; band: Banda; positive: boolean };
type ResultadoDass = Record<DassClave, { name: string; raw: number; x2: number; band: BandaDass }>;
type ResultadoPtq = { total: number; band: Banda; sub: Record<PtqClave, { name: string; sum: number; max: number }> };
type ResultadoDocs = {
  total: number;
  band: Banda;
  dims: { id: string; name: string; short: string; sum: number }[];
  top: { id: string; name: string; short: string; sum: number };
};

export type CalificacionEapi = {
  modulos: ModuloEapi[];
  gad: ResultadoGad | null;
  dass: ResultadoDass | null;
  ptq: ResultadoPtq | null;
  docs: ResultadoDocs | null;
  dx: (DxBloque & { id: DxId; lvl: Nivel })[];
  flags: { lvl: Nivel; t: string }[];
};

export function calificarEapi(r: EapiDatos): CalificacionEapi {
  let gad: ResultadoGad | null = null;
  if (r.gad) {
    const t = total(r.gad);
    gad = { total: t, band: gadBand(t), positive: t >= 10 };
  }
  let dass: ResultadoDass | null = null;
  if (r.dass) {
    const items = r.dass;
    dass = {} as ResultadoDass;
    for (const [k, s] of Object.entries(DASS_SUB) as [DassClave, (typeof DASS_SUB)[DassClave]][]) {
      const raw = sum(items, s.items);
      dass[k] = { name: s.name, raw, x2: raw * 2, band: dassBand(raw * 2, s.cuts) };
    }
  }
  let ptq: ResultadoPtq | null = null;
  if (r.ptq) {
    const items = r.ptq;
    const sub = {} as ResultadoPtq["sub"];
    for (const [k, s] of Object.entries(PTQ_SUB) as [PtqClave, (typeof PTQ_SUB)[PtqClave]][]) sub[k] = { name: s.name, sum: sum(items, s.items), max: s.max };
    const t = total(items);
    ptq = { total: t, band: ptqBand(t), sub };
  }
  let docs: ResultadoDocs | null = null;
  if (r.docs) {
    const items = r.docs;
    const dims = DOCS.map((d, i) => ({ id: d.id, name: d.name, short: d.short, sum: total(items.slice(i * 5, i * 5 + 5)) }));
    const t = total(items);
    docs = { total: t, band: docsBand(t), dims, top: [...dims].sort((a, b) => b.sum - a.sum)[0] };
  }

  // B.6 Comentarios DSM/CIE condicionados (solo con los módulos aplicados)
  const dx: CalificacionEapi["dx"] = [];
  const agregar = (id: DxId, lvl: Nivel) => dx.push({ id, lvl, ...DX[id] });
  if (r.safety >= 1) agregar("safety", "alert");
  if (gad?.positive) agregar("tag", "warn");
  else if (gad && gad.total >= 5) agregar("tag_sub", "");
  if (dass && dass.anx.band.i >= 2) agregar("panic", "warn");
  if (dass && dass.str.band.i >= 2) agregar("stress", "warn");
  if (dass && dass.dep.band.i >= 2) agregar("dep", "warn");
  if (ptq && (ptq.total >= 37 || (ptq.total >= 22 && (gad?.positive || (dass && dass.dep.band.i >= 2))))) agregar("rnt", "");
  if (docs) {
    if (docs.total >= 18) agregar("ocd", "warn");
    else if (docs.dims.some((d) => d.sum >= 8)) agregar("ocd_sub", "");
  }

  // B.5 Señales
  const flags: CalificacionEapi["flags"] = [];
  if (r.safety >= 1)
    flags.push({ lvl: "alert", t: `Ítem de seguridad = ${r.safety} (${GAD_LABELS[r.safety]}). Contacto prioritario y evaluación de riesgo suicida antes de la próxima sesión.` });
  if (r.dass && ((r.dass[9] || 0) >= 2 || (r.dass[20] || 0) >= 2))
    flags.push({ lvl: "alert", t: `DASS-21 ítems 10 (${r.dass[9]}) y 21 (${r.dass[20]}): desesperanza / falta de sentido con 2 o 3. Explorar riesgo aunque el ítem de seguridad sea 0.` });
  if (gad && gad.total >= 15) flags.push({ lvl: "warn", t: "GAD-7 ≥ 15: ansiedad grave. Considerar interconsulta médica/psiquiátrica y priorizar intervención sobre la ansiedad." });
  if (gad && r.func != null && r.func >= 2)
    flags.push({ lvl: "warn", t: `Repercusión funcional (ítem adicional del GAD-7) = ${r.func} (${GAD_FUNC.labels[r.func]}). Deterioro claro en trabajo, hogar o relaciones.` });
  if (r.dass && ((r.dass[14] || 0) >= 2 || (r.dass[8] || 0) >= 2))
    flags.push({ lvl: "warn", t: "DASS-21 ítems 9 o 15 con 2 o 3: experiencia subjetiva de pánico. Indagar crisis de pánico (frecuencia, inesperadas, evitación)." });
  if (dass && gad && dass.anx.band.i >= 3 && gad.total < 10)
    flags.push({ lvl: "", t: "Ansiedad DASS severa con GAD-7 bajo el corte: perfil más somático/situacional que de preocupación. Pensar en pánico, fobias o causa médica." });
  if (dass && gad && gad.total >= 10 && dass.anx.band.i <= 1)
    flags.push({ lvl: "", t: "GAD-7 positivo con Ansiedad DASS normal o leve: perfil cognitivo (preocupación) con poca activación autonómica; coherente con TAG." });
  if (ptq && ptq.sub.capture.sum >= 8)
    flags.push({ lvl: "", t: `PTQ «Captura de la capacidad mental» = ${ptq.sub.capture.sum}/12: los pensamientos interfieren con la concentración; evaluar impacto en estudio o trabajo.` });
  if (docs && docs.top.sum >= 8) flags.push({ lvl: "", t: `DOCS: dimensión predominante «${docs.top.name}» (${docs.top.sum}/20).` });
  if (docs && r.docs && (r.docs[12] || 0) >= 2)
    flags.push({ lvl: "", t: "DOCS, pensamientos inaceptables, pregunta 3 ≥ 2: malestar marcado ante intrusiones egodistónicas. Psicoeducar sobre la normalidad de los pensamientos intrusivos y evaluar neutralizaciones." });
  if (r.edad && r.edad < 18)
    flags.push({ lvl: "warn", t: `Edad ${r.edad}: las escalas fueron validadas principalmente en adultos. Interpretar con cautela y considerar instrumentos para adolescentes.` });
  const orden = { alert: 0, warn: 1, "": 2 } as const;
  flags.sort((a, b) => orden[a.lvl] - orden[b.lvl]);
  return { modulos: modulosDe(r), gad, dass, ptq, docs, dx, flags };
}

export const EAPI_SIN_DX = "Todas las puntuaciones están en rango normal o mínimo; no se activan hipótesis diagnósticas específicas.";
export const EAPI_ENCABEZADO_DX =
  "Hipótesis que las puntuaciones sugieren explorar en entrevista. Los códigos se incluyen como referencia bibliográfica; ninguna escala autoaplicada establece un diagnóstico.";

/** B.7 Seguimiento: solo las medidas presentes en ambas aplicaciones. */
export function seguimientoEapi(actual: EapiDatos, anterior: EapiDatos) {
  const sc = calificarEapi(actual);
  const sp = calificarEapi(anterior);
  const banda = (a: string, b: string) => (a !== b ? `Banda: ${b} → ${a}` : "");
  const filas: { name: string; before: number; after: number; max: number; note: string }[] = [];
  if (sc.gad && sp.gad)
    filas.push({ name: "GAD-7 total", before: sp.gad.total, after: sc.gad.total, max: 21, note: Math.abs(sc.gad.total - sp.gad.total) >= 4 ? "Cambio ≥ 4: clínicamente relevante (MCID)" : "" });
  if (sc.dass && sp.dass) {
    filas.push({ name: "DASS-21 Depresión (×2)", before: sp.dass.dep.x2, after: sc.dass.dep.x2, max: 42, note: banda(sc.dass.dep.band.label, sp.dass.dep.band.label) });
    filas.push({ name: "DASS-21 Ansiedad (×2)", before: sp.dass.anx.x2, after: sc.dass.anx.x2, max: 42, note: banda(sc.dass.anx.band.label, sp.dass.anx.band.label) });
    filas.push({ name: "DASS-21 Estrés (×2)", before: sp.dass.str.x2, after: sc.dass.str.x2, max: 42, note: banda(sc.dass.str.band.label, sp.dass.str.band.label) });
  }
  if (sc.ptq && sp.ptq) filas.push({ name: "PTQ total", before: sp.ptq.total, after: sc.ptq.total, max: 60, note: "" });
  filas.push({ name: "Ítem de seguridad", before: anterior.safety, after: actual.safety, max: 3, note: actual.safety > anterior.safety ? "Aumentó: reevaluar riesgo" : "" });
  if (sc.docs && sp.docs) filas.push({ name: "DOCS total", before: sp.docs.total, after: sc.docs.total, max: 80, note: "" });
  return filas.map((f) => ({ ...f, delta: f.after - f.before }));
}

/**
 * Une varias aplicaciones en una sola para el informe unificado: cada módulo
 * se toma de la primera aplicación de la lista que lo tenga (la actual va
 * primero). La pregunta de seguridad toma el valor más alto (criterio prudente).
 */
export function unirEapi(aplicaciones: EapiDatos[]): EapiDatos {
  const [base] = aplicaciones;
  const tomar = <K extends ModuloEapi>(m: K) => aplicaciones.find((a) => a[m])?.[m] ?? null;
  const conGad = aplicaciones.find((a) => a.gad);
  return {
    ...base,
    gad: tomar("gad"),
    dass: tomar("dass"),
    ptq: tomar("ptq"),
    docs: tomar("docs"),
    func: conGad?.func ?? null,
    safety: Math.max(...aplicaciones.map((a) => a.safety)),
  };
}

/** Nombres completos de los instrumentos con su sigla, para la primera mención. */
export const NOMBRES_MODULOS: Record<ModuloEapi, { sigla: string; completo: string; mide: string }> = {
  gad: {
    sigla: "GAD-7",
    completo: "Escala del Trastorno de Ansiedad Generalizada de 7 ítems (GAD-7, por sus siglas en inglés)",
    mide: "preocupación y ansiedad generalizada en las últimas 2 semanas",
  },
  dass: {
    sigla: "DASS-21",
    completo: "Escalas de Depresión, Ansiedad y Estrés de 21 ítems (DASS-21)",
    mide: "depresión, activación ansiosa y estrés en la última semana",
  },
  ptq: {
    sigla: "PTQ",
    completo: "Cuestionario de Pensamiento Perseverativo (PTQ, Perseverative Thinking Questionnaire)",
    mide: "tendencia a pensar de forma repetitiva e intrusiva (rasgo)",
  },
  docs: {
    sigla: "DOCS",
    completo: "Escala Dimensional de Obsesiones y Compulsiones (DOCS)",
    mide: "síntomas obsesivo-compulsivos en el último mes",
  },
};

/** Siglas que aparecen en el informe profesional, con su significado. */
export const SIGLAS_EAPI: [string, string][] = [
  ["PHQ-9", "Cuestionario de Salud del Paciente de 9 ítems; de él proviene la pregunta de seguridad (ítem 9)"],
  ["DSM-5-TR", "Manual Diagnóstico y Estadístico de los Trastornos Mentales, 5.ª edición, texto revisado"],
  ["CIE-11", "Clasificación Internacional de Enfermedades, 11.ª revisión (OMS)"],
  ["CIE-10-MC", "Clasificación Internacional de Enfermedades, 10.ª revisión, Modificación Clínica"],
  ["TAG", "trastorno de ansiedad generalizada"],
  ["TOC", "trastorno obsesivo-compulsivo"],
  ["TCC", "terapia cognitivo-conductual"],
  ["MCID", "diferencia mínima clínicamente importante (Minimal Clinically Important Difference)"],
];

/** B.8 Aviso obligatorio en el informe. */
export function avisoEapi(modulos: ModuloEapi[]) {
  return `Instrumentos de cribado autoaplicados (${modulos.map((m) => NOMBRES_MODULOS[m].sigla).join(", ")}): orientan la entrevista y permiten seguir el cambio, pero ninguna puntuación constituye un diagnóstico. Los criterios y códigos del DSM-5-TR y la CIE-11 se incluyen como referencia para la formulación clínica y deben verificarse con entrevista clínica, historia y, cuando corresponda, exploración médica. Toda puntuación ≥ 1 en el ítem de seguridad exige evaluación de riesgo inmediata. Los resultados no se muestran al paciente salvo en el informe que el psicólogo decida enviarle; la interpretación corresponde al psicólogo tratante.`;
}

/* ===================== EVOLUCIÓN ENTRE APLICACIONES ===================== */
export type Tendencia = "mejora" | "igual" | "empeora";
export type EvolucionEscala = {
  id: string;
  modulo: ModuloEapi;
  nombre: string;
  antes: number;
  ahora: number;
  delta: number;
  max: number;
  bandaAntes: string;
  bandaAhora: string;
  tendencia: Tendencia;
  criterio: string;
};
export type EvolucionItem = { modulo: ModuloEapi; n: number; antes: number; ahora: number; delta: number; tendencia: Tendencia };
export type EvolucionEapi = {
  escalas: EvolucionEscala[];
  items: EvolucionItem[];
  resumenItems: Record<Tendencia, number>;
  global: Tendencia | "mixto";
  seguridad: { antes: number; ahora: number; tendencia: Tendencia };
  modulos: ModuloEapi[];
};

const tendenciaDe = (delta: number): Tendencia => (delta < 0 ? "mejora" : delta > 0 ? "empeora" : "igual");

/**
 * Evolución de la aplicación actual frente a la anterior, en las escalas
 * presentes en ambas. En todas las escalas del EAPI una puntuación más alta
 * indica más síntomas, así que bajar = mejora.
 * - GAD-7: cambio ≥ 4 puntos (diferencia mínima clínicamente importante, Toussaint et al., 2020).
 * - DASS-21, PTQ y DOCS: cambio de banda (no hay diferencias mínimas consolidadas).
 * - Ítems: cada respuesta sube, baja o se mantiene (descriptivo, no estadístico).
 */
export function evolucionEapi(actual: EapiDatos, anterior: EapiDatos): EvolucionEapi {
  const sc = calificarEapi(actual);
  const sp = calificarEapi(anterior);
  const escalas: EvolucionEscala[] = [];
  const porBanda = (iAntes: number, iAhora: number): Tendencia => (iAhora < iAntes ? "mejora" : iAhora > iAntes ? "empeora" : "igual");
  if (sc.gad && sp.gad) {
    const d = sc.gad.total - sp.gad.total;
    escalas.push({
      id: "gad", modulo: "gad", nombre: "GAD-7 (ansiedad generalizada)", antes: sp.gad.total, ahora: sc.gad.total, delta: d, max: 21,
      bandaAntes: sp.gad.band.label, bandaAhora: sc.gad.band.label,
      tendencia: d <= -4 ? "mejora" : d >= 4 ? "empeora" : "igual",
      criterio: "Cambio ≥ 4 puntos (diferencia mínima clínicamente importante)",
    });
  }
  if (sc.dass && sp.dass) {
    for (const k of ["dep", "anx", "str"] as const) {
      escalas.push({
        id: `dass-${k}`, modulo: "dass", nombre: `DASS-21 ${sc.dass[k].name} (×2)`, antes: sp.dass[k].x2, ahora: sc.dass[k].x2,
        delta: sc.dass[k].x2 - sp.dass[k].x2, max: 42, bandaAntes: sp.dass[k].band.label, bandaAhora: sc.dass[k].band.label,
        tendencia: porBanda(sp.dass[k].band.i, sc.dass[k].band.i), criterio: "Cambio de banda",
      });
    }
  }
  const nivel = (b: Banda) => (b.k === "low" ? 0 : b.k === "mid" ? 1 : 2);
  if (sc.ptq && sp.ptq) {
    escalas.push({
      id: "ptq", modulo: "ptq", nombre: "PTQ (pensamiento repetitivo)", antes: sp.ptq.total, ahora: sc.ptq.total, delta: sc.ptq.total - sp.ptq.total, max: 60,
      bandaAntes: sp.ptq.band.label, bandaAhora: sc.ptq.band.label, tendencia: porBanda(nivel(sp.ptq.band), nivel(sc.ptq.band)),
      criterio: "Cambio de rango (no clínico < 22, elevado, clínico ≥ 37)",
    });
  }
  if (sc.docs && sp.docs) {
    escalas.push({
      id: "docs", modulo: "docs", nombre: "DOCS (obsesiones y compulsiones)", antes: sp.docs.total, ahora: sc.docs.total, delta: sc.docs.total - sp.docs.total, max: 80,
      bandaAntes: sp.docs.band.label, bandaAhora: sc.docs.band.label, tendencia: porBanda(nivel(sp.docs.band), nivel(sc.docs.band)),
      criterio: "Cambio respecto de los cortes 18 y 21",
    });
  }
  const modulos = MODULOS_EAPI.filter((m) => actual[m] && anterior[m]);
  const items: EvolucionItem[] = [];
  for (const m of modulos) {
    const a = actual[m]!;
    const p = anterior[m]!;
    a.forEach((v, i) => items.push({ modulo: m, n: i + 1, antes: p[i], ahora: v, delta: v - p[i], tendencia: tendenciaDe(v - p[i]) }));
  }
  const resumenItems = { mejora: 0, igual: 0, empeora: 0 } as Record<Tendencia, number>;
  for (const it of items) resumenItems[it.tendencia]++;
  const hay = (t: Tendencia) => escalas.some((e) => e.tendencia === t);
  const global = hay("mejora") && hay("empeora") ? "mixto" : hay("mejora") ? "mejora" : hay("empeora") ? "empeora" : "igual";
  return {
    escalas,
    items,
    resumenItems,
    global,
    seguridad: { antes: anterior.safety, ahora: actual.safety, tendencia: tendenciaDe(actual.safety - anterior.safety) },
    modulos,
  };
}

export const TEXTO_TENDENCIA: Record<Tendencia | "mixto", string> = {
  mejora: "Mejora",
  igual: "Sigue igual",
  empeora: "Empeora",
  mixto: "Cambios mixtos",
};
