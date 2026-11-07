/** Intereses Vocacionales JJR: informe para quien respondió (lenguaje sencillo, experimental). Solo panel. */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente } from "../informe-paciente";
import { BANCO_JJR, CAMPOS_PRINCIPALES, INFO_CAMPOS, NOMBRES_CAMPOS } from "./banco";
import {
  calificarJjr,
  JJR_CONTRASTE,
  JJR_ENCABEZADO,
  JJR_TEXTO_COMPLETO,
  JJR_TEXTO_INCOMPLETO,
  JJR_TEXTO_INVESTIGACION,
  JJR_TEXTO_UNIFORME,
  mediaTexto,
  textoReporteCampo,
} from "./calificacion";
import { JJR_ESCALA, JJR_TITULO_PACIENTE, type JjrDatos } from "./codigo";

const ID_OTRAS = "otras-actividades";

export const areasJjr = (investigacion: boolean) => [
  ...CAMPOS_PRINCIPALES.map((c) => ({ id: c, nombre: NOMBRES_CAMPOS[c].nombre })),
  ...(investigacion ? [{ id: ID_OTRAS, nombre: "Otras actividades que marcaste con interés (sin puntaje)" }] : []),
];

export function opcionesPorDefectoJjr(investigacion: boolean): OpcionesInforme {
  return { incluir: Object.fromEntries(areasJjr(investigacion).map((a) => [a.id, true])), mostrarPuntuaciones: false, incluirAyuda: false };
}

/** Anclaje más cercano a la media: describe el nivel de respuesta, no compara con otras personas. */
const anclajeCercano = (m: number) => JJR_ESCALA[Math.min(4, Math.max(0, Math.round(m)))];

export function informePacienteJjr(
  datos: JjrDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string }
): InformePaciente {
  const c = calificarJjr(datos);
  const investigacion = datos.instrumento === "JJR-INV-176";
  // Orden fijo de campos (sin ranking ni «top 3»).
  const resultados: ResultadoPaciente[] = c.campos
    .filter((k) => opciones.incluir[k.campo] !== false)
    .map((k) => {
      const info = INFO_CAMPOS[k.campo];
      const sinMedia = k.media === null;
      const anclas = BANCO_JJR.filter((i) => i.campo === k.campo && i.grupo === "ancla");
      const gustaron = anclas.filter((i) => datos.respuestas[i.id] === 4 || datos.respuestas[i.id] === 3);
      const noEntendio = anclas.filter((i) => datos.respuestas[i.id] === "NC");
      const detalle = [
        gustaron.length
          ? `Actividades de este campo que marcaste con «bastante» o «mucho»:\n${gustaron.map((i) => `• ${i.actividad}`).join("\n")}`
          : "En este campo no marcaste ninguna actividad con «bastante» o «mucho».",
        noEntendio.length ? `Actividades que no entendiste del todo (las revisaremos juntos):\n${noEntendio.map((i) => `• ${i.actividad}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      return {
        area: k.nombre,
        periodo:
          k.estado === "completo"
            ? "Respondiste las 6 actividades"
            : k.estado === "parcial"
              ? "Respondiste 5 de 6 actividades (resultado parcial)"
              : `Respondiste ${k.n_validas} de 6 actividades`,
        nivel: sinMedia ? "Sin resultado: faltan respuestas" : `Tus respuestas se acercan a «${anclajeCercano(k.media!)}»`,
        tono: "leve",
        texto: sinMedia
          ? `Qué es: ${info.definicion}\n\nHay actividades de este campo sin responder o que no se entendieron, por eso no calculamos un resultado. Podemos revisarlas juntos.\n\n${detalle}`
          : `Qué es: ${info.definicion}\n\n${textoReporteCampo(k.campo)}\n\n${detalle}\n\nRutas para conocer: ${info.rutas}`,
        puntuacion: opciones.mostrarPuntuaciones && !sinMedia ? `Promedio ${mediaTexto(k.media)} de 4 (${k.n_validas} de 6)` : undefined,
      };
    });
  if (investigacion && opciones.incluir[ID_OTRAS] !== false) {
    const marcadas = [...c.exploratorias, ...c.candidatos].flatMap((g) => g.items.filter((i) => i.valor === 3 || i.valor === 4));
    resultados.push({
      area: "Otras actividades que marcaste con interés",
      periodo: "Áreas en estudio, sin puntaje",
      nivel: marcadas.length ? `${marcadas.length} actividades` : "Ninguna marcada",
      tono: "leve",
      texto: marcadas.length
        ? `Estas actividades no se resumen con un puntaje, pero puedes conversarlas en sesión:\n${marcadas.map((i) => `• ${i.actividad}`).join("\n")}`
        : "En las actividades nuevas que están en estudio no marcaste «bastante» ni «mucho». Si alguna te llamó la atención, coméntala en sesión.",
    });
  }
  return {
    v: 1,
    titulo: `Resultados · ${JJR_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro: [
      investigacion ? JJR_TEXTO_INVESTIGACION : c.perfilCompleto ? JJR_TEXTO_COMPLETO : JJR_TEXTO_INCOMPLETO,
      investigacion && !c.perfilCompleto ? JJR_TEXTO_INCOMPLETO : "",
      c.uniforme ? JJR_TEXTO_UNIFORME : "",
      "Cómo leer este informe: para cada campo te decimos a qué respuesta se acercan tus elecciones (de «No me gustaría nada» a «Me gustaría mucho») y qué actividades concretas te gustaron más. Los campos aparecen siempre en el mismo orden, no de mayor a menor: dos campos con resultados parecidos te interesan de forma similar. No es una nota ni dice para qué eres bueno; muestra lo que te gustaría hacer hoy, y eso puede cambiar al conocer más opciones.",
    ]
      .filter(Boolean)
      .join(" "),
    destacado: { titulo: "Resultado experimental", texto: JJR_ENCABEZADO },
    resultados,
    notas: extra.notas.trim(),
    ayuda: null,
    aviso: `${JJR_ENCABEZADO} ${JJR_CONTRASTE} Lo conversaremos en sesión.`,
  };
}
