/**
 * Calificación de Intereses Vocacionales JJR Actualizada (solo panel).
 * Traducción directa del motor de referencia de los documentos fuente:
 * - Solo las 6 anclas de cada campo principal puntúan (peso 1, sin inversión).
 * - 6 respuestas numéricas → media = suma/6, «completo»; 5 → media de 5,
 *   «parcial» (rotulado); 0–4 → sin media, «insuficiente».
 * - NC y omisión no puntúan, no se imputan ni se reemplazan con cero.
 * - Sin percentiles, niveles alto/medio/bajo, total, código tipo Holland ni
 *   compatibilidad con carreras. Los informes ordenan los campos de mayor a
 *   menor media (decisión del autor para que la devolución sea orientativa).
 *   Precisión interna completa; redondear solo al mostrar.
 * - Candidatos y áreas exploratorias (JJR-INV-176) NO puntúan: se muestran
 *   como respuestas individuales para conversar.
 */
import { BANCO_JJR, CAMPOS_JJR, CAMPOS_PRINCIPALES, NOMBRES_CAMPOS, type CampoJjr, type CampoPrincipal, type ItemJjr } from "./banco";
import type { JjrDatos, ValorJjr } from "./codigo";

export type EstadoCampo = "completo" | "parcial" | "insuficiente";
export type CampoCalificado = {
  campo: CampoPrincipal;
  nombre: string;
  n_validas: number;
  n_no_comprende: number;
  n_omitidas: number;
  suma_observada: number | null;
  suma_completa: number | null;
  media: number | null;
  estado: EstadoCampo;
  /** Índice gráfico opcional 25 × media (0–100). NO es percentil ni porcentaje de aptitud. */
  indice: number | null;
};

const esNumero = (v: ValorJjr): v is 0 | 1 | 2 | 3 | 4 => typeof v === "number";
const POR_ID = new Map(BANCO_JJR.map((i) => [i.id, i]));

export function calificarJjr(d: JjrDatos) {
  const campos: CampoCalificado[] = CAMPOS_PRINCIPALES.map((campo) => {
    const anclas = BANCO_JJR.filter((i) => i.campo === campo && i.grupo === "ancla");
    const valores = anclas.map((i) => d.respuestas[i.id] ?? null);
    const validos = valores.filter(esNumero);
    const n = validos.length;
    const suma = validos.reduce<number>((a, b) => a + b, 0);
    const media = n >= 5 ? suma / n : null;
    return {
      campo,
      nombre: NOMBRES_CAMPOS[campo].nombre,
      n_validas: n,
      n_no_comprende: valores.filter((v) => v === "NC").length,
      n_omitidas: valores.filter((v) => v === null).length,
      suma_observada: n ? suma : null,
      suma_completa: n === 6 ? suma : null,
      media,
      estado: n === 6 ? "completo" : n === 5 ? "parcial" : "insuficiente",
      indice: media === null ? null : 25 * media,
    };
  });
  const perfilCompleto = campos.every((c) => c.estado === "completo");
  // Empates exactos: se describen, sin inferir desinterés, apatía ni falta de sinceridad.
  const uniforme = perfilCompleto ? new Set(campos.map((c) => c.media)).size === 1 : null;
  const asignados = d.orden_ids;
  const total = asignados.length;
  const valoresAsignados = asignados.map((id) => d.respuestas[id] ?? null);
  const conteo = {
    numericas: valoresAsignados.filter(esNumero).length,
    nc: valoresAsignados.filter((v) => v === "NC").length,
    omitidas: valoresAsignados.filter((v) => v === null).length,
    total,
  };
  // Respuestas no puntuadas (solo JJR-INV-176), agrupadas por campo en orden fijo.
  const noPuntuadas = (grupo: ItemJjr["grupo"]) =>
    CAMPOS_JJR.map((campo) => ({
      campo,
      nombre: NOMBRES_CAMPOS[campo].nombre,
      items: asignados
        .map((id) => POR_ID.get(id)!)
        .filter((i) => i.campo === campo && i.grupo === grupo)
        .map((i) => ({ ...i, valor: d.respuestas[i.id] ?? null })),
    })).filter((g) => g.items.length);
  return {
    campos,
    perfilCompleto,
    uniforme,
    /** Todas las actividades asignadas con respuesta numérica (NC y null no cuentan). */
    protocoloFormaCompleto: conteo.numericas === total,
    conteo,
    candidatos: noPuntuadas("candidato"),
    exploratorias: noPuntuadas("exploratorio"),
  };
}

export type CalificacionJjr = ReturnType<typeof calificarJjr>;

/** Media para mostrar (coma decimal, 2 decimales). */
export const mediaTexto = (m: number | null) => (m === null ? "—" : m.toFixed(2).replace(".", ","));

/** Texto de la respuesta (0–4, NC o sin respuesta). */
export const textoValorJjr = (v: ValorJjr) => (v === null ? "Sin respuesta" : v === "NC" ? "NC" : String(v));

/**
 * Campos de mayor a menor media (empates: orden fijo del instrumento); los
 * campos sin media van al final. Los parciales se ordenan con su media de 5.
 */
export function ordenPorInteres<T extends { media: number | null }>(campos: readonly T[]): T[] {
  return campos
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (b.c.media ?? -1) - (a.c.media ?? -1) || a.i - b.i)
    .map(({ c }) => c);
}

/** Campos empatados en la media más alta (si hay media). */
export function camposPrincipales<T extends { media: number | null }>(campos: readonly T[]): T[] {
  const orden = ordenPorInteres(campos).filter((c) => c.media !== null);
  if (!orden.length) return [];
  return orden.filter((c) => Math.abs(c.media! - orden[0].media!) < 1e-9);
}

export const JJR_TEXTO_GENERAL =
  "Cada campo agrupa actividades de un tipo de trabajo. Tus respuestas describen cuánto te interesaría explorar cada uno; conocer sus tareas reales mediante una experiencia breve ayuda a confirmarlo. El resultado no mide habilidades ni obliga a elegir una de las rutas mencionadas.";

export const JJR_TEXTO_INCOMPLETO =
  "Algunas actividades quedaron sin respuesta o no se entendieron; esos campos aparecen al final, sin resultado. Esto no significa falta de interés: podemos revisarlas juntos.";

export const JJR_TEXTO_UNIFORME =
  "Tus respuestas fueron muy parecidas en todos los campos, así que el cuestionario no marcó una preferencia clara. Lo conversaremos en sesión para explorar qué te atrae.";

export const JJR_CONTRASTE =
  "Para explorar: observar una tarea real, conversar con alguien que trabaje en esa área, probar una actividad introductoria o comparar planes de estudio.";

/**
 * Comparación descriptiva con una aplicación anterior DEL MISMO protocolo y
 * versión (sin evidencia de enlace no se comparan versiones). Sin umbral de
 * cambio: no hay error de medida estimado.
 */
export function seguimientoJjr(ahora: CalificacionJjr, antes: CalificacionJjr) {
  return ahora.campos.map((c, i) => {
    const a = antes.campos[i];
    return { campo: c.campo, nombre: c.nombre, antes: a.media, ahora: c.media, cambio: a.media !== null && c.media !== null ? c.media - a.media : null };
  });
}
