import type { ActividadRow, CalificacionRow } from "./types";

/** Nota de corte: promedio de 60% o más aprueba. */
export const NOTA_CORTE_AVANCE = 60;

export type AvanceEstudiante = {
  porcentaje: number | null;
  aprobado: boolean | null;
  actividadesCalificadas: number;
};

/**
 * Promedio simple de (nota / punteo * 100) por estudiante, considerando
 * solo actividades con punteo asignado y ya calificadas. Es un promedio de
 * porcentajes, no una suma de puntos: da igual si el curso tiene 2
 * actividades o 20, cada una pesa lo mismo en el promedio final.
 */
export function calcularAvancePorEstudiante(
  actividades: ActividadRow[],
  calificaciones: CalificacionRow[],
): Map<string, AvanceEstudiante> {
  const punteoPorActividad = new Map(actividades.map((actividad) => [actividad.id, actividad.punteo]));
  const porcentajesPorEstudiante = new Map<string, number[]>();

  for (const calificacion of calificaciones) {
    if (calificacion.nota === null) continue;
    const punteo = punteoPorActividad.get(calificacion.actividad_id);
    if (!punteo || punteo <= 0) continue;

    const porcentaje = (calificacion.nota / punteo) * 100;
    const lista = porcentajesPorEstudiante.get(calificacion.estudiante_id) ?? [];
    lista.push(porcentaje);
    porcentajesPorEstudiante.set(calificacion.estudiante_id, lista);
  }

  const resultado = new Map<string, AvanceEstudiante>();
  for (const [estudianteId, porcentajes] of porcentajesPorEstudiante) {
    const promedio = porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length;
    resultado.set(estudianteId, {
      porcentaje: promedio,
      aprobado: promedio >= NOTA_CORTE_AVANCE,
      actividadesCalificadas: porcentajes.length,
    });
  }
  return resultado;
}

export const AVANCE_VACIO: AvanceEstudiante = { porcentaje: null, aprobado: null, actividadesCalificadas: 0 };
