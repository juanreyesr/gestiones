import type { Trimestre } from "@/data/evaluacion";

export type CorreoDocenteInput = {
  docenteNombre: string;
  cursoNombre: string;
  trimestre: Trimestre;
  anio: number;
  pct: number;
  total: number;
  max: number;
  fortalezas: string[];
  improvementAreas: Array<{ categoria: string; texto: string; valor: number }>;
  entrevistaGeneral: number;
  entrevistaDestacadas: Array<{ texto: string }>;
  entrevistaMejorar: Array<{ texto: string }>;
  observaciones: string;
};

export function buildCorreoDocente(input: CorreoDocenteInput): { subject: string; body: string } {
  const subject = `Resultados de tu evaluacion docente - ${input.cursoNombre} (Trimestre ${input.trimestre}, ${input.anio})`;
  const lines: string[] = [
    `Estimado/a ${input.docenteNombre},`,
    "",
    `Quiero agradecerte sinceramente por tu esfuerzo, dedicacion y compromiso en el desarrollo del curso "${input.cursoNombre}" durante este trimestre. Tu trabajo constante en el aula es muy valioso para la formacion de nuestros estudiantes.`,
    "",
    "A continuacion comparto un resumen de tu evaluacion docente:",
    "",
    `Resultado general de la observacion de clase: ${input.pct}% (${input.total}/${input.max} puntos).`,
  ];

  if (input.fortalezas.length) {
    lines.push("", `Entre los aspectos en los que mas sobresaliste se destacan: ${input.fortalezas.join(", ")}. Felicidades por estos logros.`);
  }

  if (input.improvementAreas.length) {
    lines.push("", "Tambien identificamos algunas areas en las que podrias seguir fortaleciendo tu labor docente:");
    input.improvementAreas.forEach((item) => lines.push(`- ${item.texto}`));
  } else {
    lines.push("", "No se identificaron areas criticas de mejora en esta observacion. Sigue asi.");
  }

  if (input.entrevistaDestacadas.length || input.entrevistaMejorar.length) {
    lines.push(
      "",
      `En las entrevistas realizadas a estudiantes del curso se obtuvo una valoracion favorable promedio de ${input.entrevistaGeneral}%.`,
    );
    if (input.entrevistaDestacadas.length) {
      lines.push(`Los estudiantes destacaron especialmente que: ${input.entrevistaDestacadas.map((item) => item.texto.toLowerCase()).join("; ")}.`);
    }
    if (input.entrevistaMejorar.length) {
      lines.push(`Tambien mencionaron que podrias reforzar: ${input.entrevistaMejorar.map((item) => item.texto.toLowerCase()).join("; ")}.`);
    }
  }

  if (input.observaciones.trim()) {
    lines.push("", `Observaciones adicionales de la clase: ${input.observaciones.trim()}`);
  }

  lines.push("", "Gracias nuevamente por tu compromiso con la excelencia academica.", "", "Saludos cordiales,", "Coordinacion Academica");

  return { subject, body: lines.join("\n") };
}
