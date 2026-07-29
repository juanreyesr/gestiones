// Lectura del texto que se comparte cada mes para armar el calendario:
//
//   Tema del mes: Protejamos a nuestra familia
//
//   Domingo 5
//   Juan Reyes Urizar      -> predica 7:30
//   Luis Velasquez         -> predica 9:30
//   Deylyd Reyes           -> predica 11:30
//
//   Martes 7
//   Dulce Orozco           -> predica 7:00 PM
//   Manolo Montufar        -> cierra 7:00 PM
//
// El parser es una funcion pura para poder mostrar una vista previa antes de
// tocar nada: primero se ve que entendio y a quien reconocio del catalogo.

import { HORARIOS_DOMINGO, HORARIO_MARTES, type HorarioPredica, type PredicadorRow } from "./types";

export type FilaImportada = {
  dia: number;
  horario: HorarioPredica;
  rol: "predica" | "cierre";
  nombre: string;
  predicadorId: string | null;
};

export type LecturaImportacion = {
  tema: string | null;
  filas: FilaImportada[];
  ignoradas: string[];
};

/** Compara nombres sin acentos, sin mayusculas y sin espacios de sobra. */
export const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Los puntos de las iniciales sobran al comparar: "Juan J. Reyes" y
    // "Juan J Reyes" son la misma persona.
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const PALABRAS_IGNORADAS = new Set(["de", "del", "la", "los", "y"]);

const tokens = (texto: string) =>
  normalizar(texto)
    .split(" ")
    .filter((palabra) => palabra.length > 1 && !PALABRAS_IGNORADAS.has(palabra));

/**
 * Busca a la persona en el catalogo. Primero por nombre exacto; si no, acepta
 * que uno sea subconjunto del otro ("Claudia Reyes" contra "Claudia de Reyes",
 * "Ludwig" contra "Ludwig Del Cid"), que es como varian los nombres en la
 * lista que llega cada mes.
 */
export function buscarPredicador(nombre: string, predicadores: PredicadorRow[]) {
  const objetivo = normalizar(nombre);
  const exacto = predicadores.find((predicador) => normalizar(predicador.nombre) === objetivo);
  if (exacto) return exacto;

  const buscados = tokens(nombre);
  if (!buscados.length) return null;

  const candidatos = predicadores.filter((predicador) => {
    const propios = tokens(predicador.nombre);
    const contenido = buscados.every((palabra) => propios.includes(palabra));
    const contiene = propios.every((palabra) => buscados.includes(palabra));
    return contenido || contiene;
  });

  // Solo se acepta si no hay ambiguedad: dos "Reyes" distintos no se adivinan.
  return candidatos.length === 1 ? candidatos[0] : null;
}

const RE_TEMA = /^tema( del mes)?\s*:\s*(.+)$/i;
const RE_DIA = /^(domingo|martes)\s+(\d{1,2})\b/i;

export function leerTextoDelMes(texto: string, predicadores: PredicadorRow[]): LecturaImportacion {
  const filas: FilaImportada[] = [];
  const ignoradas: string[] = [];
  let tema: string | null = null;

  let diaActual: { tipo: "domingo" | "martes"; dia: number } | null = null;
  let posicion = 0;

  for (const cruda of texto.split("\n")) {
    const linea = cruda.trim().replace(/^[-•*]\s*/, "");
    if (!linea) continue;

    const enTema = RE_TEMA.exec(linea);
    if (enTema) {
      tema = enTema[2].trim();
      continue;
    }

    const enDia = RE_DIA.exec(linea);
    if (enDia) {
      diaActual = { tipo: enDia[1].toLowerCase() as "domingo" | "martes", dia: Number(enDia[2]) };
      posicion = 0;
      continue;
    }

    if (!diaActual) {
      ignoradas.push(linea);
      continue;
    }

    // Dentro de un domingo, las tres primeras lineas son los predicadores de
    // 7:30, 9:30 y 11:30. Dentro de un martes, la primera predica y la segunda
    // cierra.
    let horario: HorarioPredica | null = null;
    let rol: "predica" | "cierre" = "predica";

    if (diaActual.tipo === "domingo") {
      if (posicion < HORARIOS_DOMINGO.length) horario = HORARIOS_DOMINGO[posicion];
    } else if (posicion === 0) {
      horario = HORARIO_MARTES;
    } else if (posicion === 1) {
      horario = HORARIO_MARTES;
      rol = "cierre";
    }

    if (!horario) {
      ignoradas.push(linea);
      continue;
    }

    filas.push({
      dia: diaActual.dia,
      horario,
      rol,
      nombre: linea,
      predicadorId: buscarPredicador(linea, predicadores)?.id ?? null,
    });
    posicion += 1;
  }

  return { tema, filas, ignoradas };
}
