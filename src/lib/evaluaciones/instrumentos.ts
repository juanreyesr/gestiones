/**
 * Instrumentos que se pueden asignar a un paciente desde su expediente.
 * Solo metadatos aquí (lo usa también la página pública).
 *
 * Para agregar uno nuevo:
 *  1. Contenido, validación (validar*, limpiarBorrador*) y calificación en src/lib/evaluaciones/<id>/.
 *  2. Registro del servidor: src/lib/evaluaciones/registro-servidor.ts (validar y limpiar el avance).
 *  3. Formulario con el molde común (src/components/evaluaciones/formulario-comun.tsx; ejemplo corto:
 *     valores-form.tsx) y su rama en evaluacion-publica.tsx.
 *  4. Informe en src/components/clinica/ (informe profesional + InformePacientePanel) y su rama en
 *     evaluaciones-paciente.tsx; si tiene puntuación en el tiempo, agregarlo a evolucion-paciente.ts.
 *  5. Su entrada en INSTRUMENTOS (abajo) y un script de pruebas en scripts/.
 */
export type InstrumentoId = "b-breve" | "eapi" | "riasec" | "valores";

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
      "Escalas que se eligen al asignar (juntas o por separado): Escala del Trastorno de Ansiedad Generalizada de 7 ítems (GAD-7), Escalas de Depresión, Ansiedad y Estrés de 21 ítems (DASS-21), Cuestionario de Pensamiento Perseverativo (PTQ) y Escala Dimensional de Obsesiones y Compulsiones (DOCS), más una pregunta de seguridad. Calificación automática, señales, hipótesis según el Manual Diagnóstico y Estadístico de los Trastornos Mentales (DSM-5-TR) y la Clasificación Internacional de Enfermedades (CIE-11), informes por escala o unificados, seguimiento e informe para el paciente.",
    responde: "paciente",
    respuestasPorDefecto: 1,
    tituloPublico: "EAPI versión JJ",
    informePaciente: true,
  },
  {
    id: "riasec",
    nombre: "Test de intereses vocacionales (RIASEC)",
    descripcion:
      "36 afirmaciones del modelo de Holland RIASEC (Realista, Investigador, Artístico, Social, Emprendedor, Convencional), 8 a 10 min. Código Holland, hexágono, diferenciación, consistencia, estilo de respuesta, carreras para explorar, seguimiento e informe para enviar.",
    responde: "paciente",
    respuestasPorDefecto: 1,
    tituloPublico: "Test de intereses vocacionales · versión JJ",
    informePaciente: true,
  },
  {
    id: "valores",
    nombre: "Cuestionario de valores laborales",
    descripcion:
      "Complemento del test de intereses (RIASEC): 24 afirmaciones sobre 8 valores (Logro, Independencia, Reconocimiento, Relaciones, Servicio a los demás, Apoyo, Estabilidad y condiciones, Creatividad y variedad) y elección de los 3 principales, 5 a 7 min. Prioridades, concordancia entre lo elegido y lo puntuado, estilo de respuesta, cruce con el código RIASEC si existe, seguimiento e informe para enviar.",
    responde: "paciente",
    respuestasPorDefecto: 1,
    tituloPublico: "Cuestionario de valores laborales · versión JJ",
    informePaciente: true,
  },
];

export const instrumentoPorId = (id: string) => INSTRUMENTOS.find((i) => i.id === id) ?? null;
