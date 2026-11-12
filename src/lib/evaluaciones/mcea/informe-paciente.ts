/**
 * MCEA: informe para el paciente v2 (lenguaje sencillo, orientado a la oportunidad
 * de cambio). Solo panel. Especificación: docs/instrumentos/MCEA_informe_paciente_v2_especificacion.md
 * (mismo criterio que el EAPI v2, su adenda y la v2.1). Nunca se cita el ítem 9 del PHQ-9.
 */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente } from "../informe-paciente";
import { elegirMarcados, numerados, prioridadPorNivel, subtitulo, textoNivel, vinetas, type Candidata } from "../informe-paciente-comun";
import { PTQ_SUB } from "../eapi/calificacion";
import { CONTENIDO_AREAS, PARES_GAD, PARES_PTQ, TEXTOS_GENERALES, type ContenidoArea, type Par } from "../eapi/contenido-paciente";
import { INS, MCEA_CRISIS } from "./contenido";
import type { MceaDatos } from "./codigo";
import { A, cambioParaPaciente, rng, scoreAll, type Puntaje } from "./motor";
import {
  CONTENIDO_ANIMO,
  CONTENIDO_AUTOSABOTAJE,
  CONTENIDO_PAN,
  CONTENIDO_PAREJA,
  DISTORSIONES,
  PARES_PAN,
  PARES_PHQ,
  TEXTOS_MCEA,
  type ContenidoSub,
} from "./contenido-paciente";

/** Áreas que el psicólogo puede quitar (ids estables). «conexion» solo sale con carga alta; «pasos» va al final. */
export const AREAS_MCEA = [
  { id: "conexion", nombre: "Cómo se conectan sus resultados (si varias áreas salen altas)" },
  { id: "estado", nombre: "Cómo ha estado (ánimo y nervios)" },
  { id: "mente", nombre: "Lo que su mente suele hacer" },
  { id: "formas", nombre: "Formas de pensar que aparecieron" },
  { id: "frenando", nombre: "Lo que puede estar frenándole" },
  { id: "pareja", nombre: "En su relación de pareja" },
  { id: "mapa", nombre: "Su mapa de un momento difícil" },
  { id: "recursos", nombre: "Sus recursos" },
  { id: "avance", nombre: "Lo que ha cambiado (si hay aplicación anterior)" },
  { id: "pasos", nombre: "Sus próximos pasos" },
];

export function opcionesPorDefectoMcea(): OpcionesInforme {
  return { incluir: Object.fromEntries(AREAS_MCEA.map((a) => [a.id, true])), mostrarPuntuaciones: false, incluirAyuda: true };
}

const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

/** Recorta un texto escrito por la persona para que la tarjeta no pase del límite del informe. */
const corto = (t: string, n: number) => {
  const x = t.trim();
  if (x.length <= n) return x;
  return `${x.slice(0, n).replace(/\s+\S*$/, "")}…`;
};

type Clave = "animo" | "gad" | "ptq" | "pan" | "as" | "rp";
const ORDEN: Clave[] = ["animo", "gad", "ptq", "pan", "as", "rp"];
/** Pasos del paciente por tarjeta de un área puntuada. */
type Tarjeta = {
  clave: Clave;
  /** Id de la opción del panel que la controla. */
  opcion: "estado" | "mente" | "frenando" | "pareja";
  area: string;
  periodo: string;
  /** Nivel de prioridad: 0 = bajo; sube hasta maxI. */
  i: number;
  maxI: number;
  /** Proporción de la puntuación máxima (desempate). */
  razon: number;
  puntuacion: string;
  /** Pasos disponibles (el primero es el que sube a «Sus próximos pasos»). */
  pasos: string[];
  texto: (conPasos: boolean, soloUnoDos: boolean) => string;
};

/** Candidatas de «lo que más marcó» de un módulo con pares por ítem. */
function candidatas(datos: MceaDatos, id: "PHQ9" | "GAD7" | "PTQ"): Candidata[] {
  const cand: Candidata[] = [];
  if (id === "PHQ9") {
    // Ítems 1 a 8 (el 9 nunca se cita).
    PARES_PHQ.forEach((par, k) => {
      const v = A(datos, `PHQ9_${k + 1}`) ?? 0;
      if (v >= 2) cand.push({ v, k, par });
    });
  } else if (id === "GAD7") {
    PARES_GAD.forEach((par, k) => {
      const v = A(datos, `GAD7_${k + 1}`) ?? 0;
      if (v >= 2) cand.push({ v, k, par });
    });
  } else {
    rng(15).forEach((n) => {
      const v = A(datos, `PTQ_${n}`) ?? 0;
      if (v < 3) return;
      const sub = (Object.keys(PTQ_SUB) as (keyof typeof PTQ_SUB)[]).find((k) => (PTQ_SUB[k].items as readonly number[]).includes(n));
      if (sub) cand.push({ v, k: n - 1, par: PARES_PTQ[sub] });
    });
  }
  return cand;
}

/** Subescalas altas (promedio de «a veces» o más), de mayor a menor, hasta 3. */
function subsAltas(p: Puntaje): string[] {
  return Object.entries(p.subs ?? {})
    .map(([n, s], k) => ({ n, s, k }))
    .filter((x) => x.s.lvl >= 2)
    .sort((a, b) => b.s.mean - a.s.mean || a.k - b.k)
    .slice(0, 3)
    .map((x) => x.n);
}

const textoSubescalas = (
  contenido: Record<string, ContenidoSub>,
  subs: string[],
  i: number,
  conPasos: boolean,
  soloUnoDos: boolean,
  tex: { muestran: [string, string]; oportunidad: string; juntos: string; cierre?: string }
) => {
  const c = subs.map((n) => contenido[n]);
  const partes = [
    `${subtitulo("Lo que muestran sus respuestas")}\n${tex.muestran[i >= 3 ? 1 : 0]}`,
    `${subtitulo("Lo que más marcó")}\n${vinetas(c.map((x) => `${x.indicador}.`))}`,
    `${subtitulo("Por qué pasa")}\n${vinetas(c.map((x) => x.porQue))}`,
    `${subtitulo("Su oportunidad de cambio")}\n${tex.oportunidad}`,
    `En lo que más marcó, la salida está en:\n${vinetas(c.map((x) => x.salida))}`,
  ];
  if (conPasos) {
    partes.push(`${subtitulo("Para empezar esta semana")}\n${vinetas(c.slice(0, soloUnoDos ? 2 : 3).map((x) => x.paso))}`);
    partes.push(`${subtitulo("Lo que trabajaremos juntos")}\n${tex.juntos}`);
  } else {
    partes.push(`${subtitulo("Lo iremos trabajando después de lo primero")}\nEsta área también importa. Para no cargarle todo a la vez, empezaremos por lo primero y la iremos trabajando juntos en las siguientes sesiones.`);
  }
  if (tex.cierre) partes.push(tex.cierre);
  return partes.join("\n\n");
};

/** Tarjetas de las áreas puntuadas (ánimo, ansiedad, pensamientos, hábitos y pareja). */
function tarjetas(datos: MceaDatos, sc: Record<string, Puntaje>): Tarjeta[] {
  const T: Tarjeta[] = [];
  const nivelado = (clave: Clave, opcion: Tarjeta["opcion"], area: string, periodo: string, p: Puntaje, i: number, maxI: number, contenido: ContenidoArea, marcados: () => Par[]) => {
    T.push({
      clave,
      opcion,
      area,
      periodo,
      i,
      maxI,
      razon: p.raw / p.max,
      puntuacion: `${p.raw} de ${p.max}`,
      pasos: i > 0 ? contenido.niveles[i - 1].pasos : [],
      texto: (conPasos, soloUnoDos) => (i === 0 ? contenido.bajo : textoNivel(contenido.niveles[i - 1], marcados(), conPasos, soloUnoDos)),
    });
  };
  if (sc.PHQ9) nivelado("animo", "estado", "Ánimo", "Últimas 2 semanas", sc.PHQ9, sc.PHQ9.lvl, 3, CONTENIDO_ANIMO, () => elegirMarcados(candidatas(datos, "PHQ9")));
  if (sc.GAD7) nivelado("gad", "estado", "Preocupación y ansiedad", "Últimas 2 semanas", sc.GAD7, sc.GAD7.lvl, 3, CONTENIDO_AREAS.gad, () => elegirMarcados(candidatas(datos, "GAD7")));
  // Mismo contenido del EAPI: allí los pensamientos que vuelven tienen tres niveles (habitual, elevado, alto).
  if (sc.PTQ) nivelado("ptq", "mente", "Pensamientos que vuelven", "En general", sc.PTQ, [0, 1, 1, 2][sc.PTQ.lvl], 2, CONTENIDO_AREAS.ptq, () => elegirMarcados(candidatas(datos, "PTQ")));
  if (sc.PAN)
    nivelado("pan", "mente", "Pensamientos negativos automáticos", "Última semana", sc.PAN, sc.PAN.lvl, 3, CONTENIDO_PAN, () => {
      const subs = sc.PAN.subs!;
      return elegirMarcados(
        Object.keys(subs)
          .filter((n) => subs[n].lvl >= 2 && PARES_PAN[n])
          .map((n, k) => ({ v: subs[n].mean, k, par: PARES_PAN[n] }))
      );
    });
  for (const [id, clave, opcion, area, periodo, contenido, tex] of [
    [
      "AS",
      "as",
      "frenando",
      "Lo que puede estar frenándole",
      "Último mes",
      CONTENIDO_AUTOSABOTAJE,
      {
        muestran: [
          "En el último mes aparecieron, con cierta frecuencia, hábitos que pueden estar frenándole en lo que le importa.",
          "En el último mes aparecieron, con mucha frecuencia, hábitos que pueden estar frenándole en lo que le importa.",
        ] as [string, string],
        oportunidad: "Estos hábitos se aprenden, casi siempre como una forma de protegerse, y por eso se pueden cambiar.",
        juntos: "Lo trabajaremos juntos en sesión: veremos en qué momentos aparece cada hábito y practicaremos otras respuestas, paso a paso.",
      },
    ],
    [
      "RP",
      "rp",
      "pareja",
      "En su relación de pareja",
      "Su relación actual o más reciente",
      CONTENIDO_PAREJA,
      {
        muestran: [
          "Aparecieron, con cierta frecuencia, patrones que pueden estar tensando la relación. Son formas de reaccionar que se aprenden y se pueden cambiar; no dicen que algo esté mal con usted ni con su pareja.",
          "Aparecieron, con mucha frecuencia, patrones que pueden estar tensando la relación. Son formas de reaccionar que se aprenden y se pueden cambiar; no dicen que algo esté mal con usted ni con su pareja.",
        ] as [string, string],
        oportunidad:
          "En la pareja suele ayudar iniciar las conversaciones con suavidad, hablar de lo propio, hacer pausas cuando sube la tensión y combinar el pedir cambios con aceptar lo que no cambia. Aquí el trabajo está en lo que usted puede observar y hacer por su parte.",
        juntos: "Lo trabajaremos juntos en sesión: practicaremos cómo conversar y cómo pausar, siempre sobre lo que usted puede hacer por su parte.",
        cierre: TEXTOS_MCEA.seguridadPareja,
      },
    ],
  ] as const) {
    const p = sc[id];
    if (!p?.subs) continue;
    const subs = subsAltas(p).filter((n) => (contenido as Record<string, ContenidoSub>)[n]);
    if (!subs.length) continue;
    const i = Math.max(...Object.values(p.subs).map((s) => s.lvl));
    const c = contenido as Record<string, ContenidoSub>;
    T.push({
      clave,
      opcion,
      area,
      periodo,
      i,
      maxI: 3,
      razon: p.raw / p.max,
      puntuacion: `${p.raw} de ${p.max}`,
      pasos: subs.map((n) => c[n].paso),
      texto: (conPasos, soloUnoDos) => textoSubescalas(c, subs, i, conPasos, soloUnoDos, tex),
    });
  }
  return T;
}

export function informePacienteMcea(
  datos: MceaDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string; anterior?: { datos: MceaDatos; fecha: string } | null }
): InformePaciente {
  const sc = scoreAll(datos);
  const tr = datos.tr && !("skip" in datos.tr) ? datos.tr : null;
  const incl = (id: string) => opciones.incluir[id] !== false;
  const R: ResultadoPaciente[] = [];

  const todas = tarjetas(datos, sc).filter((t) => incl(t.opcion));
  // Con riesgo marcado (ítem 9 ≥ 1) y el ánimo en «Para trabajar primero», «Ánimo» va de primera.
  const hayRiesgo = (A(datos, "PHQ9_9") ?? 0) >= 1;
  const prio = (t: Tarjeta) => prioridadPorNivel(t.i, t.maxI);
  const urgente = (t: Tarjeta) => Number(t.clave === "animo" && hayRiesgo && prio(t).primero);
  const ordenadas = [...todas].sort((a, b) => urgente(b) - urgente(a) || b.i / b.maxI - a.i / a.maxI || b.razon - a.razon || ORDEN.indexOf(a.clave) - ORDEN.indexOf(b.clave));
  const conNecesidad = ordenadas.filter((t) => t.i >= 1);
  const bajas = ordenadas.filter((t) => t.i === 0);
  const altas = ordenadas.filter((t) => prio(t).primero);
  const carga = altas.length >= 3;
  /** En carga alta solo las dos áreas más altas llevan «Para empezar esta semana». */
  const conPasos = new Set<Clave>((carga ? altas.slice(0, 2) : conNecesidad).map((t) => t.clave));

  if (carga && incl("conexion")) {
    const tiene = (...ks: Clave[]) => altas.some((t) => ks.includes(t.clave));
    const nombres = [
      tiene("gad") && "la preocupación y los nervios",
      tiene("ptq") && "los pensamientos que vuelven",
      tiene("animo") && "el ánimo bajo",
      tiene("pan") && "los pensamientos negativos sobre usted",
      tiene("as") && "los hábitos que le frenan",
      tiene("rp") && "las tensiones en la pareja",
    ].filter((x): x is string => !!x);
    const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : (nombres[0] ?? "varias áreas");
    const cadena = [
      tiene("gad", "ptq") && "Preocuparse y darle vueltas a los pensamientos mantiene al cuerpo tenso y a la mente en alerta.",
      tiene("gad", "ptq") && "Con el cuerpo tenso se descansa y se duerme peor.",
      "El cansancio baja el ánimo.",
      tiene("animo", "pan") && "Con el ánimo bajo se hace menos y se piensa más, y los pensamientos negativos se vuelven más creíbles: el círculo vuelve a empezar.",
      tiene("as") && "La autocrítica y el miedo a fallar llevan a postergar o a frenarse, y eso vuelve a alimentar la autocrítica.",
      tiene("rp") && "Las tensiones con la pareja activan preocupación y pensamientos de rechazo, y eso hace más difícil conversar con calma.",
    ].filter((x): x is string => !!x);
    R.push({
      area: "Cómo se conectan sus resultados",
      periodo: "Todo junto",
      nivel: "Para entender",
      tono: "leve",
      texto: `En sus respuestas destacan ${lista}. Es frecuente que estas áreas aparezcan juntas, porque se alimentan entre sí, como un círculo:\n${vinetas(cadena)}\n\nPor eso mejorar un punto del círculo suele aliviar los demás. No hace falta resolverlo todo a la vez: lo trabajaremos por partes, empezando por una.`,
    });
  }

  const tarjeta = (t: Tarjeta): ResultadoPaciente => ({
    area: t.area,
    periodo: t.periodo,
    nivel: prio(t).nivel,
    tono: prio(t).tono,
    texto: t.texto(conPasos.has(t.clave), carga),
    puntuacion: opciones.mostrarPuntuaciones ? t.puntuacion : undefined,
  });
  for (const t of conNecesidad) R.push(tarjeta(t));

  // Formas de pensar: las marcadas «a menudo» o más y las que reconoció en su registro.
  const dis = new Set(tr?.dis ?? []);
  if (sc.DC) rng(10).forEach((i) => (A(datos, `DC_${i}`) ?? 0) >= 3 && dis.add(INS.DC.names![i - 1]));
  const formas = INS.DC.names!.filter((n) => dis.has(n) && DISTORSIONES[n]);
  if (incl("formas") && formas.length) {
    const partes = [
      `${subtitulo("Lo que muestran sus respuestas")}\n${TEXTOS_MCEA.formasMuestran}`,
      `${subtitulo("Lo que más marcó")}\n${vinetas(formas.map((n) => `${n}: ${DISTORSIONES[n].explicacion} Para revisarla: ${DISTORSIONES[n].pregunta}`))}`,
      `${subtitulo("Por qué pasa")}\n${TEXTOS_MCEA.formasPorQue}`,
      `${subtitulo("Su oportunidad de cambio")}\n${TEXTOS_MCEA.formasOportunidad}`,
    ];
    if (!carga) {
      partes.push(`${subtitulo("Para empezar esta semana")}\n${vinetas([TEXTOS_MCEA.formasPaso])}`);
      partes.push(`${subtitulo("Lo que trabajaremos juntos")}\n${TEXTOS_MCEA.formasJuntos}`);
    } else {
      partes.push(`${subtitulo("Lo iremos trabajando después de lo primero")}\nEsta área también importa. Para no cargarle todo a la vez, empezaremos por lo primero y la iremos trabajando juntos en las siguientes sesiones.`);
    }
    R.push({
      area: "Formas de pensar que aparecieron",
      periodo: "Todas las personas las usamos a veces",
      nivel: formas.length >= 3 ? "Para trabajar" : "Para cuidar",
      tono: formas.length >= 3 ? "atencion" : "leve",
      texto: partes.join("\n\n"),
    });
  }

  if (incl("mapa") && tr && (tr.sit || tr.pen)) {
    const reconocidas = INS.DC.names!.filter((n) => tr.dis.includes(n));
    R.push({
      area: "Su mapa de un momento difícil",
      periodo: "Lo que pasó, lo que pensó, lo que sintió y lo que hizo",
      nivel: "Para trabajar juntos",
      tono: "leve",
      texto: [
        `Lo que pasó: ${corto(tr.sit, 600) || "—"}`,
        `Lo que pensó: ${corto(tr.pen, 600) || "—"}${tr.f2 ? ` En el fondo: ${corto(tr.f2, 300)}` : ""}`,
        `Lo que sintió: ${tr.emo.join(", ") || "—"}`,
        `Lo que hizo: ${tr.beh.join(", ") || "—"}`,
        "",
        `${subtitulo("Dónde está el margen de cambio")}\n${TEXTOS_MCEA.mapaMargen}${reconocidas.length ? ` ${TEXTOS_MCEA.mapaFormas}${reconocidas.join(", ")}. ${TEXTOS_MCEA.mapaFormasCierre}` : ""}`,
      ].join("\n"),
    });
  }

  // Áreas en nivel bajo: tarjetas breves al final de las áreas.
  for (const t of bajas) R.push(tarjeta(t));

  // Recursos: solo con datos reales.
  if (incl("recursos")) {
    const fz: string[] = [];
    if (sc.FR) rng(4).forEach((i) => (A(datos, `FR_${i}`) ?? 0) >= 3 && fz.push((INS.FR.pat as string[])[i - 1]));
    if (tr?.dis.length) fz.push(TEXTOS_MCEA.recursoReconocio);
    if (tr?.beh.includes("Lo hablé con calma")) fz.push("En el momento difícil que describió, logró hablarlo con calma.");
    if (tr?.beh.includes("Hice algo que me ayudó")) fz.push("En ese momento hizo algo que le ayudó.");
    if (fz.length) R.push({ area: "Sus recursos", periodo: "Lo que ya tiene", nivel: "A su favor", tono: "bien", texto: `${subtitulo("Lo que sus respuestas muestran que ya tiene")}\n${vinetas(fz)}` });
  }

  if (incl("avance") && extra.anterior) {
    const G = cambioParaPaciente(extra.anterior.datos, datos);
    const partes = [
      G.m.length ? `${subtitulo("Donde hay un cambio claro a su favor")}\n${vinetas(G.m)}\n\nEl cambio en estas áreas es mayor de lo que se explicaría por variaciones normales de un día a otro.` : "",
      G.d.length
        ? `${subtitulo("Áreas para prestar especial atención en nuestra próxima sesión")}\n${vinetas(G.d)}\n\nEn estas áreas notamos más molestias que la vez anterior. Es información valiosa: lo veremos juntos para entender qué ha pasado y ajustar el plan.`
        : "",
      G.s.length ? `${subtitulo("Lo que se mantiene parecido")}\n${vinetas(G.s)}\n\nQue algo se mantenga no significa que no esté avanzando. Algunos cambios tardan más en reflejarse.` : "",
    ].filter(Boolean);
    if (partes.length)
      R.push({
        area: "Lo que ha cambiado",
        periodo: `Desde el ${fechaLarga(extra.anterior.fecha)}`,
        nivel: G.m.length && !G.d.length ? "Avance" : G.d.length && !G.m.length ? "Para trabajar" : "Mixto",
        tono: G.m.length && !G.d.length ? "bien" : G.d.length && !G.m.length ? "atencion" : "leve",
        texto: partes.join("\n\n"),
      });
  }

  // Próximos pasos: hasta 3 (máximo 2 en carga alta, con el más sencillo primero), el primer paso de las áreas con mayor necesidad.
  const tope = carga ? 2 : 3;
  const pasos: string[] = [];
  const candidatos = conNecesidad.filter((t) => t.pasos.length);
  for (const t of candidatos.slice(0, tope)) pasos.push(t.pasos[0]);
  for (let k = 1; candidatos.length && pasos.length < tope && k < 3; k++) {
    const otro = candidatos[0].pasos[k];
    if (otro && !pasos.includes(otro)) pasos.push(otro);
  }
  pasos.sort((x, y) => x.length - y.length);
  if (incl("pasos") && pasos.length)
    R.push({
      area: "Sus próximos pasos",
      periodo: "Para empezar",
      nivel: "Su plan",
      tono: "leve",
      texto: `${subtitulo("Pasos pequeños para empezar")}\n${numerados(pasos.slice(0, tope))}\n\n${TEXTOS_GENERALES.cierrePasos}`,
    });

  return {
    v: 1,
    titulo: "Su informe personal · Lo que mostraron sus respuestas",
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro: `Este informe refleja cómo estaba usted el ${fechaLarga(extra.fechaAplicacion)}. Describe patrones de un momento, y los patrones cambian.`,
    /** v2.1: el recuadro lleva solo el título; la vista no dibuja párrafo vacío. */
    destacado: { titulo: "Lo más importante", texto: "" },
    resultados: R,
    notas: extra.notas.trim(),
    ayuda: opciones.incluirAyuda ? [...MCEA_CRISIS] : null,
    aviso:
      "Qué sigue: este informe es un punto de partida. Lo revisaremos juntos en sesión para decidir en qué trabajar primero. No es un diagnóstico: describe patrones de un momento, y los patrones cambian.",
  };
}
