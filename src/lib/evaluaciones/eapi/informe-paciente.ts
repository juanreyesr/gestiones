/**
 * EAPI: arma el informe para el paciente en lenguaje sencillo (sin códigos
 * diagnósticos, sin señales clínicas ni el ítem de seguridad). Solo panel.
 */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente, TonoResultado } from "../informe-paciente";
import { calificarEapi, evolucionEapi, type EapiDatos, type Tendencia } from "./calificacion";
import { EAPI_LINEAS_AYUDA, EAPI_TITULO_PACIENTE } from "./escalas";

const formatoFecha = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

export const AREAS_EAPI = [
  { id: "gad", nombre: "Preocupación y nerviosismo" },
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

/** Áreas que corresponden a los módulos aplicados. */
export function areasEapi(datos: EapiDatos) {
  const hay = { gad: !!datos.gad, str: !!datos.dass, anx: !!datos.dass, dep: !!datos.dass, ptq: !!datos.ptq, docs: !!datos.docs };
  return AREAS_EAPI.filter((a) => hay[a.id]);
}

export function opcionesPorDefectoEapi(datos: EapiDatos): OpcionesInforme {
  const hayRiesgo = datos.safety >= 1 || (datos.dass?.[9] ?? 0) >= 2 || (datos.dass?.[20] ?? 0) >= 2;
  return {
    incluir: { gad: true, str: true, anx: true, dep: true, ptq: true, docs: true },
    mostrarPuntuaciones: false,
    incluirAyuda: hayRiesgo,
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
    /** Evaluación anterior, para contar en palabras sencillas cómo ha cambiado. */
    anterior?: { datos: EapiDatos; fecha: string } | null;
  }
): InformePaciente {
  const c = calificarEapi(datos);
  const ev = extra.anterior ? evolucionEapi(datos, extra.anterior.datos) : null;
  const fechaAnt = extra.anterior?.fecha ? formatoFecha(extra.anterior.fecha) : "";
  const FRASE: Record<Tendencia, string> = {
    mejora: "ha mejorado",
    igual: "se mantiene en un nivel parecido",
    empeora: "ha aumentado; lo revisaremos con atención",
  };
  /** Frase de evolución para un área (id de escala en evolucionEapi). */
  const cambio = (id: string) => {
    const e = ev?.escalas.find((x) => x.id === id);
    return e ? `\n\nComparado con su evaluación del ${fechaAnt}: ${FRASE[e.tendencia]}.` : "";
  };
  const resultados: ResultadoPaciente[] = [];
  const incluir = (id: string) => opciones.incluir[id] !== false;
  const pts = (v: number, max: number) => (opciones.mostrarPuntuaciones ? `${v} de ${max}` : undefined);

  if (c.gad && incluir("gad")) {
    const i = c.gad.total <= 4 ? 0 : c.gad.total <= 9 ? 1 : c.gad.total <= 14 ? 2 : 3;
    resultados.push({
      area: "Preocupación y nerviosismo",
      periodo: "Últimas 2 semanas",
      nivel: ["Mínimo", "Leve", "Moderado", "Alto"][i],
      tono: (["bien", "leve", "atencion", "alto"] as TonoResultado[])[i],
      texto: TEXTOS.gad[i] + cambio("gad"),
      puntuacion: pts(c.gad.total, 21),
    });
  }
  const cDass = c.dass;
  const dass = (id: "str" | "anx" | "dep", area: string) => {
    if (!cDass || !incluir(id)) return;
    const i = cDass[id].band.i;
    resultados.push({
      area,
      periodo: "Última semana",
      nivel: NIVELES_DASS[i],
      tono: TONOS_DASS[i],
      texto: TEXTOS[id][i] + cambio(`dass-${id}`),
      puntuacion: pts(cDass[id].x2, 42),
    });
  };
  dass("str", "Estrés y tensión");
  dass("anx", "Síntomas físicos de ansiedad");
  dass("dep", "Estado de ánimo");
  if (c.ptq && incluir("ptq")) {
    const i = c.ptq.total < 22 ? 0 : c.ptq.total < 37 ? 1 : 2;
    resultados.push({
      area: "Pensamientos repetitivos",
      periodo: "En general",
      nivel: ["Habitual", "Elevado", "Alto"][i],
      tono: (["bien", "atencion", "alto"] as TonoResultado[])[i],
      texto: TEXTOS.ptq[i] + cambio("ptq"),
      puntuacion: pts(c.ptq.total, 60),
    });
  }
  if (c.docs && incluir("docs")) {
    const i = c.docs.total < 18 ? 0 : c.docs.total < 21 ? 1 : 2;
    resultados.push({
      area: "Pensamientos intrusivos y rituales",
      periodo: "Último mes",
      nivel: ["Bajo", "Moderado", "Alto"][i],
      tono: (["bien", "atencion", "alto"] as TonoResultado[])[i],
      texto: TEXTOS.docs[i] + cambio("docs"),
      puntuacion: pts(c.docs.total, 80),
    });
  }

  return {
    v: 1,
    titulo: `Resultados de su evaluación · ${EAPI_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe resume, en palabras sencillas, sus respuestas al cuestionario. Los resultados son orientativos: ayudan a conocer cómo ha estado y a seguir su avance a lo largo del proceso, pero no son un diagnóstico. Los conversaremos en sesión.",
    destacado: ev && ev.escalas.length
      ? {
          titulo:
            ev.global === "mejora"
              ? "Su evolución: hay mejoría"
              : ev.global === "empeora"
                ? "Su evolución: algunas áreas aumentaron"
                : ev.global === "mixto"
                  ? "Su evolución: algunas áreas mejoraron y otras aumentaron"
                  : "Su evolución: se mantiene estable",
          texto: `Comparamos sus respuestas con las de su evaluación del ${fechaAnt}. En cada área le indicamos cómo ha cambiado. Lo conversaremos en sesión.`,
        }
      : undefined,
    resultados,
    notas: extra.notas.trim(),
    ayuda: opciones.incluirAyuda ? [...EAPI_LINEAS_AYUDA] : null,
    aviso:
      "Los cuestionarios que se responden por cuenta propia no establecen diagnósticos por sí solos; su interpretación corresponde a su psicólogo. Si tiene dudas sobre este informe, coméntelas en su próxima sesión.",
  };
}
