/**
 * Utilidades compartidas por los informes para el paciente de redacción
 * terapéutica (EAPI y MCEA, v2): formato de las tarjetas, rótulos por
 * prioridad de trabajo y armado del texto de un área. Solo panel.
 * Criterio: docs/instrumentos/EAPI_informe_paciente_v2_especificacion.md
 */
import type { TonoResultado } from "./informe-paciente";
import type { NivelContenido, Par } from "./eapi/contenido-paciente";

/** Subtítulo dentro de una tarjeta: línea propia terminada en «:». */
export const subtitulo = (t: string) => `${t.replace(/[:.]+$/, "")}:`;
export const vinetas = (l: string[]) => l.map((x) => `• ${x}`).join("\n");
export const numerados = (l: string[]) => l.map((x, i) => `${i + 1}. ${x}`).join("\n");

/**
 * Prioridad de trabajo (no gravedad) con que se rotula cada área en las tarjetas:
 * «Para trabajar primero» = el nivel más alto (los dos más altos en las escalas de 5 niveles);
 * «Para trabajar» = intermedio; «Para cuidar» = leve; «A su favor» = bajo. Ningún tono rojo.
 * `i` es el nivel (0 = bajo) y `maxI` el más alto de su escala.
 */
export function prioridadPorNivel(i: number, maxI: number): { nivel: string; tono: TonoResultado; primero: boolean } {
  if (i === 0) return { nivel: "A su favor", tono: "bien", primero: false };
  if (i >= (maxI === 4 ? 3 : maxI)) return { nivel: "Para trabajar primero", tono: "atencion", primero: true };
  if (i === 1 && maxI > 2) return { nivel: "Para cuidar", tono: "leve", primero: false };
  return { nivel: "Para trabajar", tono: "atencion", primero: false };
}

/** Candidata a «lo que más marcó»: valor de la respuesta, orden dentro del área y su par indicador → oportunidad. */
export type Candidata = { v: number; k: number; par: Par };

/** Hasta `max` pares con las respuestas más altas (empates por orden), sin repetir indicador. */
export function elegirMarcados(cand: Candidata[], max = 3): Par[] {
  const ordenadas = [...cand].sort((a, b) => b.v - a.v || a.k - b.k);
  const vistos = new Set<string>();
  const res: Par[] = [];
  for (const c of ordenadas) {
    if (vistos.has(c.par.indicador)) continue;
    vistos.add(c.par.indicador);
    res.push(c.par);
    if (res.length === max) break;
  }
  return res;
}

/**
 * Texto de una tarjeta de nivel leve o superior: indicador → lo que más marcó → por qué pasa →
 * oportunidad → pasos → lo que haremos juntos. Sin pasos (carga alta), cierra con «Lo iremos
 * trabajando después de lo primero».
 */
export function textoNivel(n: NivelContenido, marcados: Par[], conPasos: boolean, soloUnoDos: boolean): string {
  const partes = [`${subtitulo("Lo que muestran sus respuestas")}\n${n.indicador}`];
  if (marcados.length) partes.push(`${subtitulo("Lo que más marcó")}\n${vinetas(marcados.map((x) => `${x.indicador}.`))}`);
  partes.push(`${subtitulo("Por qué pasa")}\n${n.porQue}`);
  partes.push(`${subtitulo("Su oportunidad de cambio")}\n${n.oportunidad}`);
  if (marcados.length) partes.push(`En lo que más marcó, la oportunidad está en:\n${vinetas(marcados.map((x) => x.oportunidad.replace(/\.$/, "") + "."))}`);
  if (conPasos) {
    partes.push(`${subtitulo("Para empezar esta semana")}\n${vinetas(soloUnoDos ? n.pasos.slice(0, 2) : n.pasos)}`);
    partes.push(`${subtitulo("Lo que trabajaremos juntos")}\n${n.juntos}`);
  } else {
    partes.push(`${subtitulo("Lo iremos trabajando después de lo primero")}\nEsta área también importa. Para no cargarle todo a la vez, empezaremos por lo primero y la iremos trabajando juntos en las siguientes sesiones.`);
  }
  return partes.join("\n\n");
}
