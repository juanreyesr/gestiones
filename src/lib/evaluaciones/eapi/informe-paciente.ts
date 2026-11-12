/**
 * EAPI: arma el informe para el paciente en lenguaje sencillo (sin códigos
 * diagnósticos, sin señales clínicas ni el ítem de seguridad). Solo panel.
 */
import type {
  EvolucionPaciente,
  InformePaciente,
  OpcionesInforme,
  PuntoEvolucion,
  ResultadoPaciente,
  TonoResultado,
} from "../informe-paciente";
import { calificarEapi, evolucionEapi, DASS_SUB, PTQ_SUB, type CalificacionEapi, type EapiDatos, type Tendencia } from "./calificacion";
import { CONTENIDO_AREAS, PARES_DASS, PARES_DOCS, PARES_GAD, PARES_PTQ, TEXTOS_GENERALES, type Par } from "./contenido-paciente";
import { DASS21, DOCS, EAPI_LINEAS_AYUDA, EAPI_TITULO_PACIENTE, GAD7, PTQ } from "./escalas";

const fechaCorta = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "2-digit" });
};

const formatoFecha = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

/** Tarjetas nuevas (ids estables; cada una se puede quitar). «Lo que está a su favor» va antes de las áreas y «Sus próximos pasos», al final. */
const AREA_AFAVOR = { id: "afavor", nombre: "Lo que está a su favor" } as const;
const AREA_CONEXION = { id: "conexion", nombre: "Cómo se conectan sus resultados" } as const;
const AREA_PASOS = { id: "pasos", nombre: "Sus próximos pasos" } as const;

export const AREAS_EAPI = [
  { id: "gad", nombre: "Preocupación y ansiedad" },
  { id: "str", nombre: "Estrés y ansiedad" },
  { id: "anx", nombre: "Tensión y palpitaciones" },
  { id: "dep", nombre: "Tristeza y desgano" },
  { id: "ptq", nombre: "Pensamientos que vuelven" },
  { id: "docs", nombre: "Pensamientos o rituales repetitivos" },
] as const;

const NIVELES_DASS = ["Dentro de lo esperado", "Leve", "Moderado", "Alto", "Muy alto"];
const TONOS_DASS: TonoResultado[] = ["bien", "leve", "atencion", "alto", "alto"];

type AreaId = "gad" | "str" | "anx" | "dep" | "ptq" | "docs";
const ID_ESCALA: Record<AreaId, string> = { gad: "gad", str: "dass-str", anx: "dass-anx", dep: "dass-dep", ptq: "ptq", docs: "docs" };
const NOMBRE_AREA: Record<AreaId, string> = {
  gad: "Preocupación y ansiedad",
  str: "Estrés y ansiedad",
  anx: "Tensión y palpitaciones",
  dep: "Tristeza y desgano",
  ptq: "Pensamientos que vuelven",
  docs: "Pensamientos o rituales repetitivos",
};
const ORDEN_AREAS: AreaId[] = ["gad", "str", "anx", "dep", "ptq", "docs"];

/** Nivel en palabras sencillas de un área (null si la escala no se aplicó). */
function nivelArea(c: CalificacionEapi, id: AreaId): { i: number; nivel: string; tono: TonoResultado; valor: number; max: number } | null {
  if (id === "gad") {
    if (!c.gad) return null;
    const i = c.gad.total <= 4 ? 0 : c.gad.total <= 9 ? 1 : c.gad.total <= 14 ? 2 : 3;
    return { i, nivel: ["Mínimo", "Leve", "Moderado", "Alto"][i], tono: (["bien", "leve", "atencion", "alto"] as TonoResultado[])[i], valor: c.gad.total, max: 21 };
  }
  if (id === "str" || id === "anx" || id === "dep") {
    if (!c.dass) return null;
    const i = c.dass[id].band.i;
    return { i, nivel: NIVELES_DASS[i], tono: TONOS_DASS[i], valor: c.dass[id].x2, max: 42 };
  }
  if (id === "ptq") {
    if (!c.ptq) return null;
    const i = c.ptq.total < 22 ? 0 : c.ptq.total < 37 ? 1 : 2;
    return { i, nivel: ["Habitual", "Elevado", "Alto"][i], tono: (["bien", "atencion", "alto"] as TonoResultado[])[i], valor: c.ptq.total, max: 60 };
  }
  if (!c.docs) return null;
  const i = c.docs.total < 18 ? 0 : c.docs.total < 21 ? 1 : 2;
  return { i, nivel: ["Bajo", "Moderado", "Alto"][i], tono: (["bien", "atencion", "alto"] as TonoResultado[])[i], valor: c.docs.total, max: 80 };
}

const PERIODO: Record<AreaId, string> = {
  gad: "Últimas 2 semanas",
  str: "Última semana",
  anx: "Última semana",
  dep: "Última semana",
  ptq: "En general",
  docs: "Último mes",
};

/** Ítems que no se citan al paciente (desesperanza: se conversan en sesión). */
const NO_CITAR = new Set(["dass-10", "dass-21"]);
const textoItem = (m: string, n: number) =>
  m === "gad" ? GAD7[n - 1] : m === "dass" ? DASS21[n - 1] : m === "ptq" ? PTQ[n - 1] : `${DOCS[Math.floor((n - 1) / 5)].short}: ${DOCS[Math.floor((n - 1) / 5)].q[(n - 1) % 5].t}`;

/** Áreas que corresponden a los módulos aplicados (y «Su evolución» si hay con qué comparar). */
export function areasEapi(datos: EapiDatos, conEvolucion = false) {
  const conexion = cargaAlta(calificarEapi(datos), ORDEN_AREAS.filter((id) => nivelArea(calificarEapi(datos), id)));
  const hay = { gad: !!datos.gad, str: !!datos.dass, anx: !!datos.dass, dep: !!datos.dass, ptq: !!datos.ptq, docs: !!datos.docs };
  return [
    ...(conEvolucion ? [{ id: "evolucion", nombre: "Su evolución (comparación con evaluaciones anteriores)" }] : []),
    AREA_AFAVOR,
    ...(conexion ? [AREA_CONEXION] : []),
    ...AREAS_EAPI.filter((a) => hay[a.id]),
    AREA_PASOS,
  ];
}

export function opcionesPorDefectoEapi(datos: EapiDatos): OpcionesInforme {
  const hayRiesgo = datos.safety >= 1 || (datos.dass?.[9] ?? 0) >= 2 || (datos.dass?.[20] ?? 0) >= 2;
  return {
    incluir: { evolucion: true, afavor: true, conexion: true, pasos: true, gad: true, str: true, anx: true, dep: true, ptq: true, docs: true },
    mostrarPuntuaciones: false,
    incluirAyuda: hayRiesgo,
  };
}

export type AplicacionPaciente = { datos: EapiDatos; fecha: string };

/**
 * Evolución para el paciente: nivel de cada área en cada aplicación (hasta 6,
 * de la más antigua a hoy), tendencia frente a la anterior con los mismos
 * criterios del informe profesional, cambio desde la primera evaluación y las
 * preguntas que más mejoraron o aumentaron (sin citar las de desesperanza).
 */
export function evolucionPacienteEapi(
  actual: AplicacionPaciente,
  anterior: AplicacionPaciente,
  historial: AplicacionPaciente[],
  areas: AreaId[]
): EvolucionPaciente | null {
  const ev = evolucionEapi(actual.datos, anterior.datos);
  if (!ev.escalas.length) return null;
  const serie = [...historial.slice(-5), actual];
  const calif = serie.map((a) => calificarEapi(a.datos));
  const filas: EvolucionPaciente["areas"] = [];
  for (const id of areas) {
    const e = ev.escalas.find((x) => x.id === ID_ESCALA[id]);
    if (!e) continue;
    const puntos: (PuntoEvolucion | null)[] = calif.map((c) => {
      const n = nivelArea(c, id);
      return n ? { nivel: n.nivel, tono: n.tono, valor: `${n.valor}/${n.max}` } : null;
    });
    const antes = nivelArea(calificarEapi(anterior.datos), id)!;
    const ahora = nivelArea(calif[calif.length - 1], id)!;
    const primera = calif.findIndex((c) => nivelArea(c, id));
    // Desde la primera evaluación (solo si hay más de dos y el nivel cambió en ese tiempo).
    const inicial = primera >= 0 && primera < calif.length - 2 ? nivelArea(calif[primera], id)! : null;
    const desdeInicio =
      inicial && inicial.nivel !== ahora.nivel
        ? ` Desde su primera evaluación (${formatoFecha(serie[primera].fecha)}) pasó de ${inicial.nivel.toLowerCase()} a ${ahora.nivel.toLowerCase()}${inicial.i > ahora.i ? ", un avance importante" : ""}.`
        : inicial && primera >= 0
          ? ` Desde su primera evaluación (${formatoFecha(serie[primera].fecha)}) se mantiene en el mismo nivel.`
          : "";
    filas.push({
      area: NOMBRE_AREA[id],
      puntos,
      tendencia: e.tendencia,
      frase:
        antes.nivel === ahora.nivel
          ? `${
              e.tendencia === "mejora"
                ? `Bajaron sus molestias, aunque sigue en nivel ${ahora.nivel.toLowerCase()}`
                : e.tendencia === "empeora"
                  ? `Subieron sus molestias, aunque sigue en nivel ${ahora.nivel.toLowerCase()}`
                  : `Sigue en nivel ${ahora.nivel.toLowerCase()}`
            }.${desdeInicio}`
          : `Pasó de ${antes.nivel.toLowerCase()} a ${ahora.nivel.toLowerCase()} desde la evaluación anterior.${desdeInicio}`,
    });
  }
  if (!filas.length) return null;
  const citables = ev.items.filter((it) => !NO_CITAR.has(`${it.modulo}-${it.n}`));
  const mejoras = citables
    .filter((it) => it.delta <= -1)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 4)
    .map((it) => textoItem(it.modulo, it.n));
  const atencion = citables
    .filter((it) => it.delta >= 1)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 4)
    .map((it) => textoItem(it.modulo, it.n));
  const n = { mejora: filas.filter((f) => f.tendencia === "mejora").length, empeora: filas.filter((f) => f.tendencia === "empeora").length };
  const global = n.mejora && n.empeora ? "mixto" : n.mejora ? "mejora" : n.empeora ? "empeora" : "igual";
  return {
    titulo:
      global === "mejora"
        ? "Su evolución: hay mejoría"
        : global === "empeora"
          ? "Su evolución: algunas áreas aumentaron"
          : global === "mixto"
            ? "Su evolución: algunas áreas mejoraron y otras aumentaron"
            : "Su evolución: se mantiene estable",
    resumen: `Comparamos sus respuestas de hoy con las de su evaluación del ${formatoFecha(anterior.fecha)}${
      serie.length > 2 ? ` y le mostramos cómo ha ido cambiando en sus últimas ${serie.length} evaluaciones` : ""
    }. De ${ev.items.length} preguntas comparadas, en ${ev.resumenItems.mejora} sus respuestas bajaron (menos molestias), en ${ev.resumenItems.igual} se mantuvieron y en ${ev.resumenItems.empeora} subieron. Un cambio pequeño de una vez a otra es normal; lo importante es la tendencia a lo largo del proceso.`,
    fechas: serie.map((a) => fechaCorta(a.fecha)),
    areas: filas,
    mejoras,
    atencion,
  };
}

/** Subtítulo dentro de una tarjeta: línea propia terminada en «:». */
const subtitulo = (t: string) => `${t.replace(/[:.]+$/, "")}:`;
const vinetas = (l: string[]) => l.map((x) => `• ${x}`).join("\n");
const numerados = (l: string[]) => l.map((x, i) => `${i + 1}. ${x}`).join("\n");

/**
 * Prioridad de trabajo (no gravedad) con que se rotula cada área en las tarjetas:
 * «Para trabajar primero» = el nivel más alto (los dos más altos en el DASS-21); «Para trabajar» =
 * intermedio; «Para cuidar» = leve; «A su favor» = bajo. Ningún tono rojo.
 * La tabla de evolución conserva los niveles y colores de nivelArea.
 */
function prioridadArea(id: AreaId, i: number): { nivel: string; tono: TonoResultado; primero: boolean } {
  const maxI = id === "gad" ? 3 : id === "ptq" || id === "docs" ? 2 : 4;
  if (i === 0) return { nivel: "A su favor", tono: "bien", primero: false };
  // En las escalas de 5 niveles (DASS-21) cuentan los dos más altos; en las de 3 o 4, solo el más alto.
  if (i >= (maxI === 4 ? 3 : maxI)) return { nivel: "Para trabajar primero", tono: "atencion", primero: true };
  if (i === 1 && maxI > 2) return { nivel: "Para cuidar", tono: "leve", primero: false };
  return { nivel: "Para trabajar", tono: "atencion", primero: false };
}

/** Carga alta: 3 o más áreas en «Para trabajar primero». */
function cargaAlta(c: CalificacionEapi, ids: AreaId[]) {
  return ids.filter((id) => prioridadArea(id, nivelArea(c, id)!.i).primero).length >= 3;
}

/** Posición de un nivel en su escala, de 0 (bajo) a 1 (el más alto), para ordenar áreas con distinto número de niveles. */
const gradoArea = (n: NonNullable<ReturnType<typeof nivelArea>>, id: AreaId) => n.i / (id === "gad" ? 3 : id === "ptq" || id === "docs" ? 2 : 4);

/**
 * Hasta 3 respuestas más altas del área (≥ 2 en las escalas 0–3; ≥ 3 en las 0–4),
 * convertidas en pares «indicador → oportunidad». Sin los ítems sensibles
 * (DASS-21 10 y 21 no tienen par). PTQ y DOCS se agrupan por subescala o categoría.
 */
function marcados(datos: EapiDatos, id: AreaId): Par[] {
  const cand: { v: number; k: number; par: Par }[] = [];
  if (id === "gad" && datos.gad) {
    datos.gad.forEach((v, i) => v >= 2 && PARES_GAD[i] && cand.push({ v, k: i, par: PARES_GAD[i] }));
  } else if ((id === "str" || id === "anx" || id === "dep") && datos.dass) {
    for (const n of DASS_SUB[id].items) {
      const par = PARES_DASS[n];
      const v = datos.dass[n - 1] ?? 0;
      if (par && v >= 2) cand.push({ v, k: n, par });
    }
  } else if (id === "ptq" && datos.ptq) {
    datos.ptq.forEach((v, i) => {
      if (v < 3) return;
      const sub = (Object.keys(PTQ_SUB) as (keyof typeof PTQ_SUB)[]).find((k) => (PTQ_SUB[k].items as readonly number[]).includes(i + 1));
      if (sub) cand.push({ v, k: i, par: PARES_PTQ[sub] });
    });
  } else if (id === "docs" && datos.docs) {
    datos.docs.forEach((v, i) => v >= 3 && cand.push({ v, k: i, par: PARES_DOCS[DOCS[Math.floor(i / 5)].id as keyof typeof PARES_DOCS] }));
  }
  cand.sort((a, b) => b.v - a.v || a.k - b.k);
  const vistos = new Set<string>();
  const res: Par[] = [];
  for (const c of cand) {
    if (vistos.has(c.par.indicador)) continue;
    vistos.add(c.par.indicador);
    res.push(c.par);
    if (res.length === 3) break;
  }
  return res;
}

/** Respuesta más baja (0 o 1) de cada área, como recurso que sigue ahí (para «Lo que está a su favor» cuando no hay áreas bajas). */
function recurso(datos: EapiDatos, id: AreaId): string | null {
  const cand: { v: number; k: number; par: Par }[] = [];
  if (id === "gad" && datos.gad) datos.gad.forEach((v, i) => v <= 1 && cand.push({ v, k: i, par: PARES_GAD[i] }));
  else if ((id === "str" || id === "anx" || id === "dep") && datos.dass)
    for (const n of DASS_SUB[id].items) if (PARES_DASS[n] && (datos.dass[n - 1] ?? 0) <= 1) cand.push({ v: datos.dass[n - 1] ?? 0, k: n, par: PARES_DASS[n] });
  if (id === "ptq" && datos.ptq)
    datos.ptq.forEach((v, i) => {
      const sub = (Object.keys(PTQ_SUB) as (keyof typeof PTQ_SUB)[]).find((k) => (PTQ_SUB[k].items as readonly number[]).includes(i + 1));
      if (v <= 1 && sub) cand.push({ v, k: i, par: PARES_PTQ[sub] });
    });
  if (id === "docs" && datos.docs)
    datos.docs.forEach((v, i) => v <= 1 && cand.push({ v, k: i, par: PARES_DOCS[DOCS[Math.floor(i / 5)].id as keyof typeof PARES_DOCS] }));
  cand.sort((a, b) => a.v - b.v || a.k - b.k);
  return cand.length ? `En ${NOMBRE_AREA[id].toLowerCase()}, algo que casi no le ha pasado: «${cand[0].par.indicador}». Eso también cuenta.` : null;
}

/** Texto de una tarjeta de área: indicador → lo que más marcó → por qué pasa → oportunidad → pasos → lo que haremos juntos. */
function textoArea(datos: EapiDatos, id: AreaId, i: number, conPasos = true, soloUnoDos = false): string {
  const contenido = CONTENIDO_AREAS[id];
  if (i === 0) return contenido.bajo;
  const n = contenido.niveles[i - 1];
  const m = marcados(datos, id);
  const partes = [`${subtitulo("Lo que muestran sus respuestas")}\n${n.indicador}`];
  if (m.length) partes.push(`${subtitulo("Lo que más marcó")}\n${vinetas(m.map((x) => `${x.indicador}.`))}`);
  partes.push(`${subtitulo("Por qué pasa")}\n${n.porQue}`);
  partes.push(`${subtitulo("Su oportunidad de cambio")}\n${n.oportunidad}`);
  if (m.length) partes.push(`En lo que más marcó, la oportunidad está en:\n${vinetas(m.map((x) => x.oportunidad.replace(/\.$/, "") + "."))}`);
  if (conPasos) {
    partes.push(`${subtitulo("Para empezar esta semana")}\n${vinetas(soloUnoDos ? n.pasos.slice(0, 2) : n.pasos)}`);
    partes.push(`${subtitulo("Lo que trabajaremos juntos")}\n${n.juntos}`);
  } else {
    partes.push(`${subtitulo("Lo iremos trabajando después de lo primero")}\nEsta área también importa. Para no cargarle todo a la vez, empezaremos por lo primero y la iremos trabajando juntos en las siguientes sesiones.`);
  }
  return partes.join("\n\n");
}

export function informePacienteEapi(
  datos: EapiDatos,
  opciones: OpcionesInforme,
  extra: {
    paciente: string;
    fechaAplicacion: string;
    notas: string;
    profesional: string;
    /** Evaluación anterior con la que se compara. */
    anterior?: AplicacionPaciente | null;
    /** Aplicaciones anteriores (de la más antigua a la más reciente) para mostrar la tendencia. */
    historial?: AplicacionPaciente[];
  }
): InformePaciente {
  const c = calificarEapi(datos);
  const ev = extra.anterior ? evolucionEapi(datos, extra.anterior.datos) : null;
  const FRASE: Record<Tendencia, string> = {
    mejora: "ha mejorado",
    igual: "se mantiene en un nivel parecido",
    empeora: "ha aumentado; lo revisaremos con atención",
  };
  const incluir = (id: string) => opciones.incluir[id] !== false;
  const presentes = ORDEN_AREAS.filter((id) => nivelArea(c, id));
  const incluidas = presentes.filter(incluir);
  // De mayor a menor nivel (el más alto primero; las de nivel bajo, al final). Empates: mayor puntuación y orden habitual.
  const hayRiesgo = datos.safety >= 1 || (datos.dass?.[9] ?? 0) >= 2 || (datos.dass?.[20] ?? 0) >= 2;
  const ordenadas = [...incluidas].sort((a, b) => {
    const na = nivelArea(c, a)!;
    const nb = nivelArea(c, b)!;
    // Con riesgo marcado y el ánimo en nivel alto, «Tristeza y desgano» va primero: es por donde se empieza.
    const urgente = (id: AreaId) => Number(id === "dep" && hayRiesgo && prioridadArea(id, nivelArea(c, id)!.i).primero);
    return urgente(b) - urgente(a) || gradoArea(nb, b) - gradoArea(na, a) || nb.valor / nb.max - na.valor / na.max || ORDEN_AREAS.indexOf(a) - ORDEN_AREAS.indexOf(b);
  });
  const conAtencion = ordenadas.filter((id) => nivelArea(c, id)!.i >= 1);
  const bajas = ordenadas.filter((id) => nivelArea(c, id)!.i === 0);
  const mejoraron = ordenadas.filter((id) => ev?.escalas.find((x) => x.id === ID_ESCALA[id])?.tendencia === "mejora");
  const prioridad = (id: AreaId) => prioridadArea(id, nivelArea(c, id)!.i);
  const altas = ordenadas.filter((id) => prioridad(id).primero);
  const carga = altas.length >= 3;
  /** En carga alta solo las dos áreas más altas llevan «Para empezar esta semana». */
  const conPasos = new Set<AreaId>(carga ? altas.slice(0, 2) : ordenadas);

  const resultados: ResultadoPaciente[] = [];

  if (incluir("afavor")) {
    const partes: string[] = [];
    if (bajas.length) partes.push(`${subtitulo("Sus respuestas muestran fortalezas reales")}\n${vinetas(bajas.map((id) => CONTENIDO_AREAS[id].fortaleza))}`);
    else {
      const recursos = ordenadas.map((id) => recurso(datos, id)).filter((x): x is string => !!x).slice(0, 4);
      partes.push(
        `${subtitulo("Hechos reales que siguen ahí")}\n${vinetas(["Respondió con sinceridad, y eso no es fácil.", "Está en un proceso con acompañamiento: no está a solas en esto.", ...recursos])}`
      );
    }
    if (mejoraron.length && extra.anterior)
      partes.push(`${subtitulo(`Desde su evaluación del ${formatoFecha(extra.anterior.fecha)} mejoró`)}\n${vinetas(mejoraron.map((id) => NOMBRE_AREA[id]))}`);
    partes.push(bajas.length || mejoraron.length ? TEXTOS_GENERALES.sinceridad : TEXTOS_GENERALES.sinFortalezas);
    resultados.push({ area: "Lo que está a su favor", periodo: "Lo que ya tiene", nivel: "A su favor", tono: "bien", texto: partes.join("\n\n") });
  }

  if (carga && incluir("conexion")) {
    const tiene = (...ids: AreaId[]) => altas.some((id) => ids.includes(id));
    const nombres = [tiene("gad") && "la preocupación", tiene("str", "anx") && "la tensión del cuerpo", tiene("ptq") && "los pensamientos que vuelven", tiene("dep") && "el desánimo"].filter(
      (x): x is string => !!x
    );
    const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0] ?? "varias áreas";
    const cadena = [
      tiene("gad", "ptq") && "Preocuparse y darle vueltas a los pensamientos mantiene al cuerpo tenso.",
      tiene("str", "anx") && "Un cuerpo tenso descansa y duerme peor.",
      "El cansancio baja el ánimo.",
      tiene("dep") && "Con el ánimo bajo se hace menos y se piensa más, y el círculo vuelve a empezar.",
    ].filter((x): x is string => !!x);
    resultados.push({
      area: "Cómo se conectan sus resultados",
      periodo: "Todo junto",
      nivel: "Para entender",
      tono: "leve",
      texto: `En sus respuestas destacan ${lista}. Es frecuente que estas áreas aparezcan juntas, porque se alimentan entre sí, como un círculo:\n\n${vinetas(cadena)}\n\nPor eso mejorar un punto del círculo suele aliviar los demás. No hace falta resolverlo todo a la vez: lo trabajaremos por partes, empezando por una.`.replace("círculo:\n\n•", "círculo:\n•"),
    });
  }

  for (const id of ordenadas) {
    const n = nivelArea(c, id)!;
    const e = ev?.escalas.find((x) => x.id === ID_ESCALA[id]);
    const pr = prioridad(id);
    resultados.push({
      area: NOMBRE_AREA[id],
      periodo: PERIODO[id],
      nivel: pr.nivel,
      tono: pr.tono,
      texto: textoArea(datos, id, n.i, conPasos.has(id), carga) + (e && extra.anterior ? `\n\nComparado con su evaluación del ${formatoFecha(extra.anterior.fecha)}: ${FRASE[e.tendencia]}.` : ""),
      puntuacion: opciones.mostrarPuntuaciones ? `${n.valor} de ${n.max}` : undefined,
    });
  }

  // Próximos pasos: hasta 3 (máximo 2 en carga alta, con el más sencillo primero), el primer paso de las áreas con mayor nivel.
  const pasos: string[] = [];
  const lista = (id: AreaId) => CONTENIDO_AREAS[id].niveles[nivelArea(c, id)!.i - 1].pasos;
  const tope = carga ? 2 : 3;
  if (conAtencion.length) {
    for (const id of conAtencion.slice(0, tope)) pasos.push(lista(id)[0]);
    for (let k = 1; pasos.length < tope && k < 3; k++) {
      const extraPaso = lista(conAtencion[0])[k];
      if (extraPaso && !pasos.includes(extraPaso)) pasos.push(extraPaso);
    }
    if (carga) pasos.sort((x, y) => x.length - y.length);
  }
  if (incluir("pasos") && pasos.length) {
    resultados.push({
      area: "Sus próximos pasos",
      periodo: "Para empezar",
      nivel: "Su plan",
      tono: "leve",
      texto: `${subtitulo("Pasos pequeños para empezar")}\n${numerados(pasos.slice(0, tope))}\n\n${TEXTOS_GENERALES.cierrePasos}`,
    });
  }

  const evolucion =
    extra.anterior && incluir("evolucion")
      ? evolucionPacienteEapi(
          { datos, fecha: extra.fechaAplicacion },
          extra.anterior,
          extra.historial?.length ? extra.historial : [extra.anterior],
          presentes.filter(incluir)
        )
      : null;

  // «Lo más importante»: primero lo que va bien, luego dónde está la mayor oportunidad.
  const primero = bajas.length
    ? `Sus respuestas muestran aspectos que van bien: ${bajas.slice(0, 3).map((id) => NOMBRE_AREA[id].toLowerCase()).join(", ")}.`
    : "Haber pedido ayuda y responder con sinceridad ya es un paso importante.";
  let textoDestacado: string;
  if (carga) {
    const dos = altas.slice(0, 2).map((id) => NOMBRE_AREA[id].toLowerCase());
    textoDestacado = `Ha sido una temporada pesada en varias áreas a la vez, y eso suele ir junto. Se trabaja por partes, empezando por una: ${dos[0]}, y después ${dos[1]}. ${
      bajas.length ? primero : "Haber respondido con sinceridad ya es un buen punto de partida."
    }`;
  } else {
    const segundo = conAtencion.length
      ? `La mayor oportunidad de cambio está en ${NOMBRE_AREA[conAtencion[0]].toLowerCase()}: es algo que se puede trabajar y que, con práctica, tiende a mejorar.`
      : "Por ahora no hay áreas que pidan atención especial; lo importante es mantener lo que le funciona.";
    const tercero = conAtencion.length
      ? "Más abajo encontrará, área por área, qué muestran sus respuestas, por qué pasa y por dónde empezar."
      : "Más abajo encontrará el detalle de cada área.";
    textoDestacado = `${primero} ${segundo} ${tercero}`;
  }
  if (opciones.incluirAyuda) textoDestacado += " No tiene que cargar esto a solas: puede escribirle a su psicólogo antes de la sesión.";

  return {
    v: 1,
    titulo: `Resultados de su evaluación · ${EAPI_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe resume, en palabras sencillas, sus respuestas al cuestionario. Los resultados son orientativos: ayudan a conocer cómo ha estado y a seguir su avance a lo largo del proceso, pero no son un diagnóstico. Los conversaremos en sesión.",
    destacado: { titulo: "Lo más importante", texto: textoDestacado },
    evolucion: evolucion ?? undefined,
    resultados,
    notas: extra.notas.trim(),
    ayuda: opciones.incluirAyuda ? [...EAPI_LINEAS_AYUDA] : null,
    aviso:
      "Los cuestionarios que se responden por cuenta propia no establecen diagnósticos por sí solos; su interpretación corresponde a su psicólogo. Si tiene dudas sobre este informe, coméntelas en su próxima sesión.",
  };
}
