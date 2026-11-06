/**
 * Instrumentos que se pueden asignar a un paciente desde su expediente.
 * Para agregar uno nuevo: su contenido en src/lib/evaluaciones/<id>/, su
 * formulario en src/components/evaluaciones/ (FORMULARIOS) y su informe en
 * src/components/clinica/evaluaciones/ (INFORMES), y su validación en
 * /api/evaluacion/[token]. Solo metadatos aquí (lo usa también la página pública).
 */
export type InstrumentoId = "b-breve" | "eapi";

export type Instrumento = {
  id: InstrumentoId;
  nombre: string;
  descripcion: string;
  /** Quién responde: el propio paciente o sus padres / cuidadores. */
  responde: "paciente" | "cuidador";
  /** Envíos que admite un enlace por defecto (p. ej. 2 cuidadores). */
  respuestasPorDefecto: number;
  /** Título que ve quien responde (si es distinto del nombre). */
  tituloPublico?: string;
  /** Tiene informe para enviar al paciente (con notas del psicólogo). */
  informePaciente?: boolean;
};

export const INSTRUMENTOS: readonly Instrumento[] = [
  {
    id: "b-breve",
    nombre: "B-Breve · Entorno del niño (polidipsia psicógena)",
    descripcion:
      "16 ítems + 2 preguntas de seguridad para padres o cuidadores. Calificación automática por áreas, discrepancia entre cuidadores y seguimiento.",
    responde: "cuidador",
    respuestasPorDefecto: 2,
  },
  {
    id: "eapi",
    nombre: "Evaluación de estrés, ansiedad y pensamientos intrusivos (EAPI)",
    descripcion:
      "Batería AEI: GAD-7 + DASS-21 + PTQ + ítem de seguridad (44 preguntas, 10 a 12 min); módulo opcional TOC (DOCS, +20). Calificación automática, señales, hipótesis DSM-5-TR / CIE-11, seguimiento e informe para enviar al paciente con sus notas.",
    responde: "paciente",
    respuestasPorDefecto: 1,
    tituloPublico: "EAPI versión JJ",
    informePaciente: true,
  },
];

export const instrumentoPorId = (id: string) => INSTRUMENTOS.find((i) => i.id === id) ?? null;
