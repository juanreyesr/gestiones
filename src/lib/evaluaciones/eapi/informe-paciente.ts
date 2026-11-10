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
import { calificarEapi, evolucionEapi, type CalificacionEapi, type EapiDatos, type Tendencia } from "./calificacion";
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

export const AREAS_EAPI = [
  { id: "gad", nombre: "Preocupación y ansiedad" },
  { id: "str", nombre: "Estrés y tensión" },
  { id: "anx", nombre: "Síntomas físicos de ansiedad" },
  { id: "dep", nombre: "Estado de ánimo" },
  { id: "ptq", nombre: "Pensamientos repetitivos" },
  { id: "docs", nombre: "Pensamientos intrusivos y rituales" },
] as const;

const NIVELES_DASS = ["Dentro de lo esperado", "Leve", "Moderado", "Alto", "Muy alto"];
const TONOS_DASS: TonoResultado[] = ["bien", "leve", "atencion", "alto", "alto"];

const TEXTOS = {
  gad: [
    "En las últimas dos semanas casi no ha tenido preocupación ni nerviosismo.",
    "Ha tenido algo de preocupación o nerviosismo, en un nivel leve.",
    "La preocupación y el nerviosismo han estado presentes con frecuencia y pueden estar afectando su bienestar. Es un buen punto para trabajar en sesión.",
    "La preocupación y el nerviosismo han estado presentes casi todos los días y con intensidad. Es una prioridad que trabajaremos juntos.",
  ],
  str: [
    "Su nivel de tensión de la última semana está dentro de lo esperado.",
    "Ha sentido algo de tensión o irritabilidad, en un nivel leve.",
    "La tensión, la dificultad para relajarse o la irritabilidad han estado presentes de forma moderada.",
    "Ha sentido mucha tensión y le ha costado relajarse. Conviene trabajar en formas de recuperar la calma.",
    "La tensión ha sido muy intensa en la última semana. Es una prioridad para la próxima sesión.",
  ],
  anx: [
    "Las reacciones físicas de ansiedad (corazón acelerado, falta de aire, temblor) están dentro de lo esperado.",
    "Ha tenido algunas reacciones físicas de ansiedad, en un nivel leve.",
    "Las reacciones físicas de ansiedad se han presentado de forma moderada.",
    "Las reacciones físicas de ansiedad han sido frecuentes e intensas. Las revisaremos en sesión.",
    "Las reacciones físicas de ansiedad han sido muy intensas en la última semana. Es una prioridad para la próxima sesión.",
  ],
  dep: [
    "Su estado de ánimo de la última semana está dentro de lo esperado.",
    "Ha tenido algunos momentos de desánimo, en un nivel leve.",
    "El desánimo o la falta de interés se han presentado de forma moderada.",
    "El desánimo ha sido frecuente e intenso. Es importante conversarlo en sesión.",
    "El desánimo ha sido muy intenso en la última semana. Es una prioridad para la próxima sesión.",
  ],
  ptq: [
    "Su forma de pensar en los problemas no muestra una tendencia marcada a darles vueltas.",
    "Tiende a darle vueltas a los problemas más de lo habitual; los pensamientos se repiten y cuesta desconectarse de ellos.",
    "Los pensamientos repetitivos sobre los problemas son muy frecuentes y absorben su atención. Trabajaremos estrategias para manejarlos.",
  ],
  docs: [
    "Los pensamientos no deseados y las conductas para neutralizarlos están en un nivel bajo.",
    "Hay pensamientos no deseados o conductas repetitivas en un nivel moderado. Los exploraremos en sesión.",
    "Los pensamientos no deseados y las conductas para neutralizarlos ocupan tiempo y causan malestar. Es un tema importante para trabajar.",
  ],
};

type AreaId = "gad" | "str" | "anx" | "dep" | "ptq" | "docs";
const ID_ESCALA: Record<AreaId, string> = { gad: "gad", str: "dass-str", anx: "dass-anx", dep: "dass-dep", ptq: "ptq", docs: "docs" };
const NOMBRE_AREA: Record<AreaId, string> = {
  gad: "Preocupación y ansiedad",
  str: "Estrés y tensión",
  anx: "Síntomas físicos de ansiedad",
  dep: "Estado de ánimo",
  ptq: "Pensamientos repetitivos",
  docs: "Pensamientos intrusivos y rituales",
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
  const hay = { gad: !!datos.gad, str: !!datos.dass, anx: !!datos.dass, dep: !!datos.dass, ptq: !!datos.ptq, docs: !!datos.docs };
  return [...(conEvolucion ? [{ id: "evolucion", nombre: "Su evolución (comparación con evaluaciones anteriores)" }] : []), ...AREAS_EAPI.filter((a) => hay[a.id])];
}

export function opcionesPorDefectoEapi(datos: EapiDatos): OpcionesInforme {
  const hayRiesgo = datos.safety >= 1 || (datos.dass?.[9] ?? 0) >= 2 || (datos.dass?.[20] ?? 0) >= 2;
  return {
    incluir: { evolucion: true, gad: true, str: true, anx: true, dep: true, ptq: true, docs: true },
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
  const resultados: ResultadoPaciente[] = [];
  const presentes = ORDEN_AREAS.filter((id) => nivelArea(c, id));
  for (const id of presentes) {
    if (!incluir(id)) continue;
    const n = nivelArea(c, id)!;
    const e = ev?.escalas.find((x) => x.id === ID_ESCALA[id]);
    resultados.push({
      area: NOMBRE_AREA[id],
      periodo: PERIODO[id],
      nivel: n.nivel,
      tono: n.tono,
      texto: TEXTOS[id][n.i] + (e && extra.anterior ? `\n\nComparado con su evaluación del ${formatoFecha(extra.anterior.fecha)}: ${FRASE[e.tendencia]}.` : ""),
      puntuacion: opciones.mostrarPuntuaciones ? `${n.valor} de ${n.max}` : undefined,
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

  return {
    v: 1,
    titulo: `Resultados de su evaluación · ${EAPI_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe resume, en palabras sencillas, sus respuestas al cuestionario. Los resultados son orientativos: ayudan a conocer cómo ha estado y a seguir su avance a lo largo del proceso, pero no son un diagnóstico. Los conversaremos en sesión.",
    evolucion: evolucion ?? undefined,
    resultados,
    notas: extra.notas.trim(),
    ayuda: opciones.incluirAyuda ? [...EAPI_LINEAS_AYUDA] : null,
    aviso:
      "Los cuestionarios que se responden por cuenta propia no establecen diagnósticos por sí solos; su interpretación corresponde a su psicólogo. Si tiene dudas sobre este informe, coméntelas en su próxima sesión.",
  };
}
