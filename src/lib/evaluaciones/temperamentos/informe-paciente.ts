/** Test de características comportamentales JJR: informe para quien respondió (lenguaje sencillo, de usted). Solo panel. */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente } from "../informe-paciente";
import {
  calificarTemperamentos,
  COMBINACIONES,
  nombreBajo,
  nombreConClasico,
  nombresConClasico,
  TEMPERAMENTOS_AVISO_PACIENTE,
  TEMPERAMENTOS_INFO,
  TEXTO_POCO_DIFERENCIADO,
  type TemperamentosDatos,
} from "./calificacion";
import type { InfoTemperamento } from "./contenido";
import { TEMPERAMENTOS_TITULO_PACIENTE } from "./escalas";

/** Tarjetas del informe (ids estables; cada una se puede quitar). Orden de aparición. */
export const AREAS_TEMPERAMENTOS = [
  { id: "dominante", nombre: "Su estilo dominante (resumen y rasgos)" },
  { id: "positivos", nombre: "Aspectos positivos de su estilo" },
  { id: "negativos", nombre: "Aspectos negativos o a cuidar" },
  { id: "mezcla", nombre: "Su perfil combinado (resumen y rasgos de la mezcla)" },
  { id: "comportamiento", nombre: "Cómo suele comportarse (trato, decisiones, conflicto, trabajo)" },
  { id: "cuidarse", nombre: "De qué debe cuidarse" },
  { id: "observador", nombre: "En qué conviene que sea más observador" },
  { id: "aprovechar", nombre: "Cómo aprovechar sus puntos fuertes" },
  { id: "relaciones", nombre: "En sus relaciones" },
  { id: "trabajo", nombre: "En el trabajo o el estudio" },
  { id: "estres", nombre: "Cuando hay estrés" },
  { id: "crecer", nombre: "Ideas para crecer" },
];

export function opcionesPorDefectoTemperamentos(): OpcionesInforme {
  return { incluir: Object.fromEntries(AREAS_TEMPERAMENTOS.map((a) => [a.id, true])), mostrarPuntuaciones: false, incluirAyuda: false };
}

/** Viñetas: «• » al inicio de cada línea. */
const vinetas = (l: string[]) => l.map((x) => `• ${x}`).join("\n");
/** Subtítulo dentro de una tarjeta: línea propia terminada en «:». */
const subtitulo = (t: string) => `${t.replace(/[:.]+$/, "")}:`;
const presencia = (pct: number) => (pct >= 75 ? "Muy presente" : pct >= 50 ? "Presente" : pct >= 25 ? "Algo presente" : "Poco presente");

export function informePacienteTemperamentos(
  datos: TemperamentosDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string }
): InformePaciente {
  const c = calificarTemperamentos(datos);
  const por = Object.fromEntries(c.temperamentos.map((v) => [v.id, v]));
  const quiere = (id: string) => opciones.incluir[id] !== false;
  const p = TEMPERAMENTOS_INFO[c.principal];
  const s = c.secundario ? TEMPERAMENTOS_INFO[c.secundario] : null;
  const comb = c.combinacion ? COMBINACIONES[c.combinacion] : null;
  /** Estilo(s) dominante(s): uno, o los dos si son codominantes. */
  const dom = c.dominantes.map((id) => TEMPERAMENTOS_INFO[id]);
  /** «Decidido y enérgico (colérico)»; con codominantes, «Sociable y entusiasta, y decidido y enérgico (sanguíneo y colérico)». */
  // Insignias cortas (el nombre completo ya va en el recuadro inicial y en los títulos).
  const nombresDom = c.dominantes.length > 1 ? "Estilos dominantes" : "Estilo dominante";
  /** Nivel de las tarjetas de la mezcla: el nombre del perfil combinado (con codominantes, el del perfil). */
  const nivelMezcla = comb ? "Perfil combinado" : "Estilo dominante";
  /** Contenido del dominante; con codominantes, el de cada uno bajo su subtítulo. */
  const porDominante = (f: (i: InfoTemperamento) => string) => (dom.length === 1 ? f(dom[0]) : dom.map((i) => `${subtitulo(i.nombre)}\n${f(i)}`).join("\n\n"));
  const puntaje = (id: keyof typeof por) => (opciones.mostrarPuntuaciones ? `${por[id].suma} de 40` : undefined);
  const resultados: ResultadoPaciente[] = [];

  if (quiere("dominante"))
    resultados.push({
      area: dom.length === 1 ? "Su estilo dominante" : "Sus estilos dominantes",
      periodo: c.tipo === "poco-diferenciado" ? "Una tendencia suave" : "Cómo es su forma de ser",
      nivel: nombresDom,
      tono: "bien",
      texto: porDominante((i) => `${i.resumen}\n\n${subtitulo("Rasgos que suelen verse en usted")}\n${vinetas(i.caracteristicas)}`),
      puntuacion: puntaje(c.principal),
    });
  if (quiere("positivos"))
    resultados.push({
      area: "Aspectos positivos de su estilo",
      periodo: "Lo que usted aporta",
      nivel: nombresDom,
      tono: "bien",
      texto: porDominante((i) => `${subtitulo("Algunas de sus fortalezas naturales")}\n${vinetas(i.fortalezas)}`),
    });
  if (quiere("negativos"))
    resultados.push({
      area: "Aspectos negativos o a cuidar",
      periodo: "Lo que conviene vigilar",
      nivel: nombresDom,
      tono: "leve",
      texto: `Todo estilo tiene un lado que conviene cuidar; conocerlo es el primer paso para manejarlo.\n\n${porDominante((i) => `${subtitulo("En su caso, conviene cuidar")}\n${vinetas(i.cuidar)}`)}`,
    });

  // Tarjetas de la mezcla: con perfil combinado usan la combinación; en predominante y poco diferenciado, el contenido del dominante.
  if (quiere("mezcla")) {
    if (comb && s) {
      resultados.push({
        area: c.tipo === "codominantes" ? `Su perfil combinado: ${p.nombre}, y ${nombreBajo(c.secundario!)}` : `Su perfil combinado: ${p.nombre}, con rasgos de ${nombreBajo(c.secundario!)}`,
        periodo:
          c.tipo === "codominantes"
            ? "Dos estilos igual de presentes"
            : c.tipo === "predominante"
              ? "Un dominante claro, con un segundo estilo que lo matiza"
              : "Una mezcla propia",
        nivel: nivelMezcla,
        tono: "bien",
        texto: `${comb.resumen}\n\n${subtitulo("Rasgos principales de su mezcla")}\n${vinetas(comb.caracteristicas)}${
          c.tercero ? `\n\nTambién se nota, en menor medida, una influencia del estilo ${nombreBajo(c.tercero)} (${TEMPERAMENTOS_INFO[c.tercero].clasico}).` : ""
        }`,
        puntuacion: puntaje(c.secundario!),
      });
    } else if (c.tipo === "poco-diferenciado") {
      resultados.push({
        area: `Su perfil: dominante ${nombreBajo(c.principal)}, poco diferenciado`,
        periodo: "Perfil equilibrado",
        nivel: "Estilo dominante",
        tono: "bien",
        texto: `${TEXTO_POCO_DIFERENCIADO}\n\nPor eso conviene leer lo que sigue como una tendencia suave: el estilo que más se nota es el ${nombreBajo(c.principal)}, pero con poca ventaja sobre los demás.`,
      });
    } else {
      resultados.push({
        area: `Su perfil: predominantemente ${nombreBajo(c.principal)}`,
        periodo: "Un estilo claro",
        nivel: "Estilo dominante",
        tono: "bien",
        texto: `Sus respuestas se concentran con claridad en el estilo ${nombreBajo(c.principal)}, con una diferencia marcada frente a los demás. Por eso su perfil no es una mezcla de dos: se lee, sobre todo, desde ese estilo, como se describe en estas tarjetas.${
          s ? ` Aun así, como casi todas las personas, usted tiene algo de los otros estilos; el que más se nota después es el estilo ${nombreBajo(c.secundario!)}.` : ""
        }`,
      });
    }
  }
  if (quiere("comportamiento") && comb)
    resultados.push({
      area: "Cómo suele comportarse",
      periodo: "En su vida diaria",
      nivel: nivelMezcla,
      tono: "bien",
      texto: [
        [subtitulo("En el trato con los demás"), comb.comportamiento.trato],
        [subtitulo("Al tomar decisiones"), comb.comportamiento.decisiones],
        [subtitulo("Ante un desacuerdo"), comb.comportamiento.conflicto],
        [subtitulo("En el trabajo o el estudio"), comb.comportamiento.trabajo],
      ]
        .map(([t, x]) => `${t}\n${x}`)
        .join("\n\n"),
    });
  if (quiere("cuidarse"))
    resultados.push({
      area: "De qué debe cuidarse",
      periodo: "Para cuidar su bienestar y sus relaciones",
      nivel: nivelMezcla,
      tono: "leve",
      texto: `${subtitulo("Estos son los aspectos de los que más conviene cuidarse")}\n${vinetas(comb ? comb.cuidar : p.cuidar)}`,
    });
  if (quiere("observador"))
    resultados.push({
      area: "En qué conviene que sea más observador",
      periodo: "Señales a las que prestar atención",
      nivel: nivelMezcla,
      tono: "leve",
      texto: `${subtitulo("Le conviene estar atento a estas señales en usted")}\n${vinetas(comb ? comb.observar : p.observar)}`,
    });
  if (quiere("aprovechar"))
    resultados.push({
      area: "Cómo aprovechar sus puntos fuertes",
      periodo: "Para sacarle provecho a su forma de ser",
      nivel: nivelMezcla,
      tono: "bien",
      texto: `${subtitulo("Algunas formas concretas de aprovechar lo mejor de su forma de ser")}\n${vinetas(comb ? comb.aprovechar : p.aprovechar)}`,
    });
  if (quiere("relaciones"))
    resultados.push({ area: "En sus relaciones", periodo: "Con las personas cercanas", nivel: nombresDom, tono: "bien", texto: porDominante((i) => i.relaciones) });
  if (quiere("trabajo"))
    resultados.push({ area: "En el trabajo o el estudio", periodo: "En sus responsabilidades", nivel: nombresDom, tono: "bien", texto: porDominante((i) => i.trabajo) });
  if (quiere("estres")) resultados.push({ area: "Cuando hay estrés", periodo: "Bajo presión", nivel: nombresDom, tono: "leve", texto: porDominante((i) => i.estres) });
  if (quiere("crecer"))
    resultados.push({
      area: "Ideas para crecer",
      periodo: "Para empezar",
      nivel: nombresDom,
      tono: "bien",
      texto: `${subtitulo("Algunas ideas para seguir creciendo")}\n${porDominante((i) => vinetas(i.crecer))}`,
    });

  const destacado = {
    titulo: `${dom.length === 1 ? "Su estilo dominante es" : "Sus estilos dominantes son"}: ${nombresConClasico(c.dominantes, " en la clasificación clásica")}`,
    texto:
      c.tipo === "predominante"
        ? `Sus respuestas se acercan sobre todo al estilo ${nombreBajo(c.principal)}, con una diferencia clara frente a los demás. Más abajo encontrará sus aspectos positivos y negativos, cómo suele comportarse y cómo aprovechar sus puntos fuertes.`
        : c.tipo === "codominantes"
          ? `Los estilos ${nombreBajo(c.principal)}, y ${nombreBajo(c.secundario!)}, están igual de presentes en su forma de ser; se combinan y se complementan. Su perfil combinado se describe en las tarjetas siguientes.`
          : c.tipo === "combinado"
            ? `Su perfil combinado: ${c.perfil}. Su rasgo más marcado es el estilo ${nombreBajo(c.principal)}, con la influencia del estilo ${nombreBajo(c.secundario!)}${c.tercero ? ` y, en menor medida, del estilo ${nombreBajo(c.tercero)}` : ""}. La mayoría de las personas combina dos estilos.`
            : `Es el que más se nota en sus respuestas, pero la diferencia con los demás es pequeña: lea este informe como una tendencia suave, no como una etiqueta. Esto suele describir a una persona flexible.`,
  };

  return {
    v: 1,
    titulo: `Resultados · ${TEMPERAMENTOS_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe describe su manera habitual de ser según cuatro estilos de comportamiento. Cada estilo es una base de su forma de reaccionar y de relacionarse; ninguno cambia lo que usted vale ni lo que puede lograr. Léalo con curiosidad y lo conversaremos en sesión.",
    destacado,
    grafica: {
      titulo: "Sus cuatro estilos (de mayor a menor)",
      max: 40,
      nota: "Cada barra muestra qué tanto se parecen a usted las frases de ese estilo. No hay barras buenas ni malas: casi todas las personas combinan dos.",
      barras: c.orden.map((id) => ({
        etiqueta: nombreConClasico(id),
        valor: por[id].suma,
        texto: opciones.mostrarPuntuaciones ? `${por[id].suma} de 40` : presencia(por[id].pct),
        destacada: c.dominantes.includes(id),
      })),
    },
    resultados,
    notas: extra.notas.trim(),
    ayuda: null,
    aviso: TEMPERAMENTOS_AVISO_PACIENTE,
  };
}
