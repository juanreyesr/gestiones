/** Valores laborales: informe para quien respondió (lenguaje sencillo). Solo panel. */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente, TonoResultado } from "../informe-paciente";
import { calificarValores, integrarRiasec, VALORES_INFO, type ValoresDatos } from "./calificacion";
import { VALORES_IDS, VALORES_TITULO_PACIENTE } from "./escalas";

export const AREAS_VALORES = VALORES_IDS.map((v) => ({ id: v, nombre: VALORES_INFO[v].nombre }));

// No hay valores «malos»: solo verdes y azules.
const TONO: Record<string, TonoResultado> = { esencial: "bien", alto: "bien", medio: "leve", bajo: "leve" };
const NIVEL: Record<string, string> = { esencial: "Esencial para ti", alto: "Muy importante", medio: "Importante", bajo: "Menos importante" };
const POSICION = ["Tu valor principal", "Tu segundo valor", "Tu tercer valor"];

export function opcionesPorDefectoValores(): OpcionesInforme {
  return { incluir: Object.fromEntries(VALORES_IDS.map((v) => [v, true])), mostrarPuntuaciones: false, incluirAyuda: false };
}

export function informePacienteValores(
  datos: ValoresDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string; codigoRiasec?: string | null }
): InformePaciente {
  const c = calificarValores(datos);
  const por = Object.fromEntries(c.valores.map((v) => [v.id, v]));
  const resultados: ResultadoPaciente[] = c.orden
    .filter((v) => opciones.incluir[v] !== false)
    .map((v) => {
      const pos = c.orden.indexOf(v);
      const info = VALORES_INFO[v];
      return {
        area: info.nombre,
        periodo: POSICION[pos] ?? (datos.elegidos.includes(v) ? "Lo elegiste entre tus 3 principales" : "Otro valor"),
        nivel: NIVEL[por[v].nivel.k],
        tono: TONO[por[v].nivel.k],
        texto:
          pos < 3
            ? `${info.descripcion}\n\nQué buscar en un trabajo: ${info.buscar}\n\nPreguntas útiles al conocer una carrera o empleo:\n${info.preguntas.map((p) => `• ${p}`).join("\n")}`
            : info.descripcion,
        puntuacion: opciones.mostrarPuntuaciones ? `${por[v].suma} de 12` : undefined,
      };
    });
  if (extra.codigoRiasec) {
    const integ = integrarRiasec(c, extra.codigoRiasec);
    const coincide = integ.filter((f) => f.coinciden.length).map((f) => f.nombre);
    resultados.push({
      area: "Tus valores y tus intereses",
      periodo: `Código de intereses ${extra.codigoRiasec}`,
      nivel: coincide.length === 3 ? "Van de la mano" : "Para conversar",
      tono: coincide.length === 3 ? "bien" : "leve",
      texto:
        coincide.length === 3
          ? "Lo que te gusta hacer (tus intereses) y lo que necesitas de un trabajo (tus valores) apuntan en la misma dirección. Busca carreras de tu código de intereses en lugares que te ofrezcan estos valores."
          : `${coincide.length ? `${coincide.join(" y ")} se relaciona${coincide.length > 1 ? "n" : ""} bien con tus intereses. ` : ""}Algunos de tus valores no dependen tanto de la actividad sino del lugar donde trabajes (el tipo de organización, el ambiente o las condiciones). Lo revisaremos al comparar opciones.`,
    });
  }
  const elegidosNombres = datos.elegidos.map((v) => VALORES_INFO[v].nombre);
  return {
    v: 1,
    titulo: `Resultados · ${VALORES_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe resume lo que más valoras en un trabajo: lo que una carrera o empleo debería ofrecerte para que te sientas a gusto y motivado. Complementa tus intereses (lo que te gusta hacer). Úsalo como guía para comparar opciones; lo conversaremos en sesión.",
    destacado: {
      titulo: `Tus valores principales: ${c.principales.map((v) => VALORES_INFO[v].nombre).join(", ")}`,
      texto:
        c.concordancia.n >= 2
          ? `Coinciden con los que tú elegiste como más importantes (${elegidosNombres.join(", ")}). Tienes claro lo que buscas en un trabajo.`
          : `Tú elegiste ${elegidosNombres.join(", ")} como los más importantes; tus respuestas muestran otras prioridades. Es normal: conversaremos qué pesa más para ti al decidir.`,
    },
    resultados,
    notas: extra.notas.trim(),
    ayuda: null,
    aviso:
      "Este cuestionario es una guía para conocerte y comparar opciones; no decide por ti. Tus intereses, aptitudes, oportunidades de estudio y metas también cuentan; por eso lo conversaremos en sesión.",
  };
}
