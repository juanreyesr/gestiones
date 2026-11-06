/**
 * Test de intereses vocacionales · versión JJ (modelo RIASEC de Holland).
 * 36 afirmaciones, 6 por tipo, escala 0–4. Redacción revisada a partir de la
 * propuesta original: primera persona, una sola idea por ítem y lenguaje
 * neutro. Las preguntas se presentan intercaladas (R, I, A, S, E, C…) para que
 * el patrón no sea evidente; los datos se guardan por número de ítem (1–36).
 *
 * Sin calificación: este archivo lo usa el formulario de quien responde.
 */

export const RIASEC_TITULO_PACIENTE = "Test de intereses vocacionales · versión JJ";
export const RIASEC_NOMBRE_PROFESIONAL = "Inventario de intereses vocacionales RIASEC (Holland)";

export const RIASEC_INTRO =
  "Este cuestionario te ayuda a conocer qué tipo de actividades te interesan y te resultan más naturales. No hay respuestas buenas ni malas y no mide inteligencia ni capacidad: solo tus gustos e intereses. Lee cada frase y marca qué tanto te describe hoy. Responde pensando en lo que de verdad disfrutas, no en lo que otras personas esperan de ti.";

export const RIASEC_ESCALA = ["Nada", "Poco", "Algo", "Bastante", "Totalmente"] as const;
export const RIASEC_PREGUNTA_ESCALA = "¿Qué tanto te describe cada frase?";

export type TipoRiasec = "R" | "I" | "A" | "S" | "E" | "C";
export const TIPOS_RIASEC: readonly TipoRiasec[] = ["R", "I", "A", "S", "E", "C"];

/** Ítems por número (1–36). Tipo = bloques de 6 en el orden R, I, A, S, E, C. */
export const RIASEC_ITEMS: readonly string[] = [
  // R · Realista
  "Me gusta trabajar con herramientas, máquinas o equipos.",
  "Disfruto las actividades al aire libre.",
  "Me siento a gusto reparando o armando objetos.",
  "Me atraen las profesiones técnicas o los oficios especializados.",
  "Aprendo mejor haciendo las cosas con mis manos.",
  "Me considero una persona práctica y concreta.",
  // I · Investigador
  "Disfruto resolver problemas que requieren pensar a fondo.",
  "Me gusta leer o ver contenidos sobre ciencia.",
  "Me atraen los experimentos y descubrir cómo funcionan las cosas.",
  "Me motiva investigar y analizar información o datos.",
  "Prefiero tareas en las que tengo que usar el pensamiento crítico.",
  "Me considero una persona curiosa y analítica.",
  // A · Artístico
  "Me gusta expresarme a través del arte.",
  "Me atraen la música, la danza o el teatro.",
  "Me emociona diseñar o crear cosas nuevas.",
  "Prefiero actividades con poca rutina, en las que pueda improvisar.",
  "Disfruto escribir, dibujar, pintar o diseñar.",
  "Me considero una persona creativa e imaginativa.",
  // S · Social
  "Disfruto ayudar a otras personas.",
  "Me gusta enseñar o explicar cosas a los demás.",
  "Prefiero trabajar en equipo.",
  "Me siento a gusto participando en actividades comunitarias o de servicio.",
  "Me motiva apoyar a otras personas en su crecimiento.",
  "Me considero una persona empática y comunicativa.",
  // E · Emprendedor
  "Me motiva liderar proyectos o grupos.",
  "Disfruto convencer a otros de una idea o vender un producto.",
  "Me atrae negociar y llegar a acuerdos.",
  "Me gusta asumir riesgos calculados para lograr una meta.",
  "Me siento bien en ambientes competitivos.",
  "Me considero una persona persuasiva y con mucha energía.",
  // C · Convencional
  "Prefiero las tareas organizadas y bien definidas.",
  "Me gusta trabajar con datos, cifras y procedimientos.",
  "Me atrae la contabilidad o la administración.",
  "Me siento a gusto siguiendo normas y rutinas claras.",
  "Me resulta fácil manejar documentos con mucho detalle.",
  "Me considero una persona ordenada y metódica.",
];

export const tipoDeItem = (n: number): TipoRiasec => TIPOS_RIASEC[Math.floor((n - 1) / 6)];

/** Orden de presentación intercalado: 1, 7, 13, 19, 25, 31, 2, 8, … (un ítem de cada tipo por vuelta). */
export const RIASEC_ORDEN: readonly number[] = Array.from({ length: 36 }, (_, i) => (i % 6) * 6 + Math.floor(i / 6) + 1);

export const RIASEC_ESTUDIOS = [
  "Primaria",
  "Básicos (secundaria)",
  "Diversificado (bachillerato)",
  "Universidad en curso",
  "Universidad terminada",
  "Otro",
] as const;

export const RIASEC_PREGUNTA_CARRERAS = "¿Qué carreras, estudios u ocupaciones te interesan en este momento? (opcional)";
export const RIASEC_GRACIAS =
  "Tus respuestas quedaron registradas. Tu psicólogo las revisará y conversarán los resultados en la próxima sesión.";
