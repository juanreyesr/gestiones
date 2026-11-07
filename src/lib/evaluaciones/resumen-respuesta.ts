/**
 * Resumen en una línea de una respuesta (para el PDF del expediente y
 * listados). Solo panel del psicólogo (usa la calificación, vía el registro
 * único). El PDF pasa los textos por textoPdf (solo Latin-1).
 */
import type { EvaluacionRespuestaRow } from "./evaluaciones";
import { instrumentoPorId } from "./instrumentos";
import { definicion } from "./registro";

export type ResumenRespuesta = { instrumento: string; puntuaciones: string[]; alertas: string[] };

export function resumenRespuesta(r: EvaluacionRespuestaRow): ResumenRespuesta {
  const nombre = (instrumentoPorId(r.instrumento)?.nombre ?? r.instrumento).split(" · ")[0];
  const c = definicion(r.instrumento)?.resumen(r);
  if (!c) return { instrumento: nombre, puntuaciones: ["(registro no válido para calificar)"], alertas: [] };
  return { instrumento: nombre, puntuaciones: c.puntuaciones, alertas: c.alertas };
}
