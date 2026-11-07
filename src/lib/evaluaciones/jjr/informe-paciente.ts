/**
 * Intereses Vocacionales JJR: informe para quien respondió (lenguaje sencillo),
 * con las áreas ordenadas de la de mayor a la de menor inclinación y una
 * gráfica de barras al inicio. Solo panel (usa la calificación).
 */
import { sumarMeses, type InformePaciente, type OpcionesInforme, type ResultadoPaciente } from "../informe-paciente";
import { BANCO_JJR, CAMPOS_PRINCIPALES, INFO_CAMPOS, NOMBRES_CAMPOS } from "./banco";
import {
  calificarJjr,
  camposPrincipales,
  JJR_CONTRASTE,
  JJR_TEXTO_GENERAL,
  JJR_TEXTO_INCOMPLETO,
  JJR_TEXTO_UNIFORME,
  mediaTexto,
  ordenPorInteres,
} from "./calificacion";
import { JJR_ESCALA, JJR_TITULO_PACIENTE, type JjrDatos } from "./codigo";

const ID_OTRAS = "otras-actividades";
/** Validez del informe al paciente: los intereses pueden cambiar en ese período. */
export const JJR_VIGENCIA_MESES = 6;
const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

export const areasJjr = (investigacion: boolean) => [
  ...CAMPOS_PRINCIPALES.map((c) => ({ id: c, nombre: NOMBRES_CAMPOS[c].nombre })),
  ...(investigacion ? [{ id: ID_OTRAS, nombre: "Otras actividades que marcaste con interés" }] : []),
];

export function opcionesPorDefectoJjr(investigacion: boolean): OpcionesInforme {
  return { incluir: Object.fromEntries(areasJjr(investigacion).map((a) => [a.id, true])), mostrarPuntuaciones: false, incluirAyuda: false };
}

/** Anclaje más cercano a la media (describe el nivel de las respuestas). */
const anclajeCercano = (m: number) => JJR_ESCALA[Math.min(4, Math.max(0, Math.round(m)))];
const lista = (nombres: string[]) => (nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`);

export function informePacienteJjr(
  datos: JjrDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string }
): InformePaciente {
  const c = calificarJjr(datos);
  const investigacion = datos.instrumento === "JJR-INV-176";
  const incluidos = c.campos.filter((k) => opciones.incluir[k.campo] !== false);
  const orden = ordenPorInteres(incluidos);
  const principales = camposPrincipales(incluidos);
  const conMedia = orden.filter((k) => k.media !== null);
  let puesto = 0;
  let mediaAnterior: number | null = null;

  const resultados: ResultadoPaciente[] = orden.map((k, i) => {
    const info = INFO_CAMPOS[k.campo];
    // Empates comparten el mismo lugar.
    if (k.media !== null && k.media !== mediaAnterior) puesto = i + 1;
    mediaAnterior = k.media;
    const anclas = BANCO_JJR.filter((it) => it.campo === k.campo && it.grupo === "ancla");
    const gustaron = anclas.filter((it) => datos.respuestas[it.id] === 4 || datos.respuestas[it.id] === 3);
    const noEntendio = anclas.filter((it) => datos.respuestas[it.id] === "NC");
    const partes = [
      `Qué es: ${info.definicion}`,
      gustaron.length
        ? `Actividades que marcaste con «bastante» o «mucho»:\n${gustaron.map((it) => `• ${it.actividad}`).join("\n")}`
        : "En este campo no marcaste ninguna actividad con «bastante» o «mucho».",
      noEntendio.length ? `Actividades que no entendiste del todo (las revisaremos juntos):\n${noEntendio.map((it) => `• ${it.actividad}`).join("\n")}` : "",
      k.media !== null ? `Rutas para conocer: ${info.rutas}` : "Faltan respuestas en este campo, por eso no tiene resultado.",
    ];
    return {
      area: k.nombre,
      periodo:
        k.media === null
          ? `Sin resultado: respondiste ${k.n_validas} de 6 actividades`
          : `${puesto === 1 ? "Tu mayor inclinación" : `${puesto}.º lugar`}${k.estado === "parcial" ? " · 5 de 6 actividades respondidas" : ""}`,
      nivel: k.media === null ? "Sin resultado" : `Cerca de «${anclajeCercano(k.media)}»`,
      tono: puesto <= 3 && k.media !== null ? "bien" : "leve",
      texto: partes.filter(Boolean).join("\n\n"),
      puntuacion: opciones.mostrarPuntuaciones && k.media !== null ? `${mediaTexto(k.media)} de 4` : undefined,
    };
  });

  if (investigacion && opciones.incluir[ID_OTRAS] !== false) {
    const marcadas = [...c.exploratorias, ...c.candidatos].flatMap((g) => g.items.filter((i) => i.valor === 3 || i.valor === 4));
    resultados.push({
      area: "Otras actividades que marcaste con interés",
      periodo: "Turismo, deporte, artes escénicas, animales, servicios personales, campo y otras",
      nivel: marcadas.length ? `${marcadas.length} actividades` : "Ninguna marcada",
      tono: "leve",
      texto: marcadas.length
        ? `También te llamaron la atención estas actividades; podemos conversarlas en sesión:\n${marcadas.map((i) => `• ${i.actividad}`).join("\n")}`
        : "En estas otras actividades no marcaste «bastante» ni «mucho». Si alguna te llamó la atención, coméntala en sesión.",
    });
  }

  const nombresPrincipales = principales.map((k) => k.nombre);
  const vigenteHasta = /^\d{4}-\d{2}-\d{2}/.test(extra.fechaAplicacion) ? sumarMeses(extra.fechaAplicacion, JJR_VIGENCIA_MESES) : undefined;
  const siguientes = conMedia.filter((k) => !principales.includes(k)).slice(0, 2).map((k) => k.nombre);
  return {
    v: 1,
    titulo: `Resultados · ${JJR_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    vigenteHasta,
    profesional: extra.profesional,
    intro: [
      "Este informe muestra tus áreas de interés ordenadas de la que más te atrajo a la que menos, según tus respuestas.",
      JJR_TEXTO_GENERAL,
      c.uniforme ? JJR_TEXTO_UNIFORME : "",
      c.campos.some((k) => k.media === null) ? JJR_TEXTO_INCOMPLETO : "",
    ]
      .filter(Boolean)
      .join(" "),
    destacado: nombresPrincipales.length
      ? {
          titulo: `${nombresPrincipales.length > 1 ? "Tus mayores inclinaciones" : "Tu mayor inclinación"}: ${lista(nombresPrincipales)}`,
          texto: `${siguientes.length ? `Le siguen ${lista(siguientes)}. ` : ""}Abajo encontrarás qué es cada área, las actividades que más te gustaron y rutas para conocerla.`,
        }
      : undefined,
    grafica: {
      titulo: "Tu interés por área (de mayor a menor)",
      max: 4,
      escala: [...JJR_ESCALA],
      nota: "Cada barra es el promedio de tus respuestas a las actividades de esa área (de 0 a 4).",
      barras: orden.map((k) => ({
        etiqueta: k.nombre,
        valor: k.media,
        texto: k.media === null ? "sin resultado" : mediaTexto(k.media),
        destacada: principales.includes(k),
      })),
    },
    resultados,
    notas: extra.notas.trim(),
    ayuda: null,
    aviso: `Este informe describe tus intereses según tus respuestas; no mide habilidades ni decide por ti. ${JJR_CONTRASTE} Lo conversaremos en sesión.${
      vigenteHasta
        ? ` Este resultado tiene una validez de ${JJR_VIGENCIA_MESES} meses (hasta el ${fechaLarga(vigenteHasta)}) debido a los posibles cambios de intereses que pueden surgir en este período; después, el enlace de este informe se desactiva.`
        : ""
    }`,
  };
}
