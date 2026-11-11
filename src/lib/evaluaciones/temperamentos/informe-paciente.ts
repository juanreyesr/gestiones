/** Temperamentos: informe para quien respondió (lenguaje sencillo, de usted). Solo panel. */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente } from "../informe-paciente";
import { calificarTemperamentos, COMBINACIONES, TEMPERAMENTOS_INFO, TEXTO_POCO_DIFERENCIADO, type TemperamentosDatos } from "./calificacion";
import { TEMPERAMENTOS_TITULO_PACIENTE } from "./escalas";

/** Tarjetas del informe; cada una se puede quitar por id. */
export const AREAS_TEMPERAMENTOS = [
  { id: "como-es", nombre: "Cómo suele ser usted" },
  { id: "fortalezas", nombre: "Sus fortalezas" },
  { id: "cuidar", nombre: "Aspectos a cuidar" },
  { id: "relaciones", nombre: "En sus relaciones" },
  { id: "trabajo", nombre: "En el trabajo o el estudio" },
  { id: "estres", nombre: "Cuando hay estrés" },
  { id: "segundo", nombre: "Su segundo temperamento (si es combinado)" },
  { id: "crecer", nombre: "Ideas para crecer" },
];

export function opcionesPorDefectoTemperamentos(): OpcionesInforme {
  return { incluir: Object.fromEntries(AREAS_TEMPERAMENTOS.map((a) => [a.id, true])), mostrarPuntuaciones: false, incluirAyuda: false };
}

const vinetas = (l: string[]) => l.map((x) => `• ${x}`).join("\n");
const baja = (s: string) => s.toLowerCase();
const presencia = (pct: number) => (pct >= 75 ? "Muy presente" : pct >= 50 ? "Presente" : pct >= 25 ? "Algo presente" : "Poco presente");

export function informePacienteTemperamentos(
  datos: TemperamentosDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string }
): InformePaciente {
  const c = calificarTemperamentos(datos);
  const por = Object.fromEntries(c.temperamentos.map((v) => [v.id, v]));
  const quiere = (id: string) => opciones.incluir[id] !== false;
  const p = c.principal ? TEMPERAMENTOS_INFO[c.principal] : null;
  const s = c.secundario ? TEMPERAMENTOS_INFO[c.secundario] : null;
  const resultados: ResultadoPaciente[] = [];

  if (!p) {
    if (quiere("como-es"))
      resultados.push({
        area: "Cómo suele ser usted",
        periodo: "Perfil equilibrado",
        nivel: "Sin un temperamento dominante",
        tono: "bien",
        texto: TEXTO_POCO_DIFERENCIADO,
      });
    if (quiere("crecer"))
      resultados.push({
        area: "Ideas para crecer",
        periodo: "Para empezar",
        nivel: "Ideas",
        tono: "bien",
        texto: `Un perfil equilibrado le da flexibilidad. Algunas ideas para aprovecharla:\n${vinetas([
          "Observe en qué situaciones se siente más usted mismo y en cuáles se adapta más de lo que quisiera.",
          "Anote durante una semana qué le da energía y qué se la quita.",
          "Pida a una persona de confianza que le cuente cómo lo ve; luego compárelo con este informe.",
          "Lleve sus dudas a la próxima sesión para conversarlas.",
        ])}`,
      });
  } else {
    if (quiere("como-es"))
      resultados.push({
        area: "Cómo suele ser usted",
        periodo: "Su temperamento principal",
        nivel: p.nombre,
        tono: "bien",
        texto: `${p.resumen}\n\nRasgos que suelen verse en usted:\n${vinetas(p.caracteristicas)}`,
        puntuacion: opciones.mostrarPuntuaciones ? `${por[c.principal!].suma} de 40` : undefined,
      });
    if (quiere("fortalezas"))
      resultados.push({ area: "Sus fortalezas", periodo: "Lo que usted aporta", nivel: p.nombre, tono: "bien", texto: `Algunas de sus fortalezas:\n${vinetas(p.fortalezas)}` });
    if (quiere("cuidar"))
      resultados.push({
        area: "Aspectos a cuidar",
        periodo: "Lo que conviene vigilar",
        nivel: p.nombre,
        tono: "leve",
        texto: `Todo temperamento tiene un lado que conviene cuidar. En su caso:\n${vinetas(p.cuidar)}`,
      });
    if (quiere("relaciones")) resultados.push({ area: "En sus relaciones", periodo: "Con las personas cercanas", nivel: p.nombre, tono: "bien", texto: p.relaciones });
    if (quiere("trabajo")) resultados.push({ area: "En el trabajo o el estudio", periodo: "En sus responsabilidades", nivel: p.nombre, tono: "bien", texto: p.trabajo });
    if (quiere("estres")) resultados.push({ area: "Cuando hay estrés", periodo: "Bajo presión", nivel: p.nombre, tono: "leve", texto: p.estres });
    if (quiere("segundo") && s && c.combinacion && c.tipo !== "predominante") {
      const comb = COMBINACIONES[c.combinacion];
      resultados.push({
        area: `Su segundo temperamento: ${s.nombre}`,
        periodo: c.tipo === "codominantes" ? "Igual de presente que el primero" : "Lo que aporta a su forma de ser",
        nivel: comb.nombre,
        tono: "bien",
        texto: `${comb.texto}\n\nRasgos que aporta el ${baja(s.nombre)}:\n${vinetas(s.caracteristicas.slice(0, 4))}${
          c.tercero ? `\n\nTambién se nota, en menor medida, una influencia del ${baja(TEMPERAMENTOS_INFO[c.tercero].nombre)}.` : ""
        }`,
        puntuacion: opciones.mostrarPuntuaciones ? `${por[c.secundario!].suma} de 40` : undefined,
      });
    }
    if (quiere("crecer"))
      resultados.push({ area: "Ideas para crecer", periodo: "Para empezar", nivel: p.nombre, tono: "bien", texto: `Algunas ideas para seguir creciendo:\n${vinetas(p.crecer)}` });
  }

  const destacado = !p
    ? {
        titulo: "Su perfil: equilibrado entre los cuatro temperamentos",
        texto: "Ninguno de los cuatro temperamentos se destaca claramente sobre los demás. Esto suele describir a una persona flexible. Lo conversaremos en sesión.",
      }
    : {
        titulo: `Su temperamento: ${c.perfil}`,
        texto:
          c.tipo === "predominante"
            ? `Sus respuestas se acercan sobre todo al temperamento ${baja(p.nombre)}, con una diferencia clara frente a los demás.`
            : c.tipo === "codominantes"
              ? `El ${baja(p.nombre)} y el ${baja(s!.nombre)} están igual de presentes en su forma de ser; se combinan y se complementan.`
              : `Su rasgo más marcado es el ${baja(p.nombre)}, con la influencia del ${baja(s!.nombre)}${c.tercero ? ` y, en menor medida, del ${baja(TEMPERAMENTOS_INFO[c.tercero].nombre)}` : ""}. La mayoría de las personas combina dos temperamentos.`,
      };

  return {
    v: 1,
    titulo: `Resultados · ${TEMPERAMENTOS_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe describe su manera habitual de ser según los cuatro temperamentos clásicos: sanguíneo, colérico, melancólico y flemático. El temperamento es la base de su forma de reaccionar y de relacionarse; no cambia lo que usted vale ni lo que puede lograr. Léalo con curiosidad y lo conversaremos en sesión.",
    destacado,
    grafica: {
      titulo: "Sus cuatro temperamentos (de mayor a menor)",
      max: 40,
      nota: "Cada barra muestra qué tanto se parecen a usted las frases de ese temperamento. No hay barras buenas ni malas: casi todas las personas combinan dos.",
      barras: c.orden.map((id) => ({
        etiqueta: TEMPERAMENTOS_INFO[id].nombre,
        valor: por[id].suma,
        texto: opciones.mostrarPuntuaciones ? `${por[id].suma} de 40` : presencia(por[id].pct),
        destacada: id === c.principal || (c.tipo === "codominantes" && id === c.secundario),
      })),
    },
    resultados,
    notas: extra.notas.trim(),
    ayuda: null,
    aviso:
      "Este informe describe tendencias de su forma de ser; no es un diagnóstico ni una medida con baremos. Ningún temperamento es mejor que otro, y la mayoría de las personas combina dos o más. Su psicólogo lo conversará con usted en sesión.",
  };
}
