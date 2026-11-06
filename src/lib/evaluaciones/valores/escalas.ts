/**
 * Cuestionario de valores laborales · versión JJ. Complementa el test de
 * intereses (RIASEC, por las iniciales de Realista, Investigador, Artístico,
 * Social, Emprendedor y Convencional): los intereses dicen QUÉ actividades
 * atraen; los valores, QUÉ debe ofrecer un trabajo para que resulte satisfactorio.
 *
 * Base teórica: los 6 valores laborales de la Teoría del Ajuste al Trabajo de
 * Minnesota que usa O*NET (Red de Información Ocupacional del Departamento de
 * Trabajo de EE. UU.) en su Perfil de Importancia del Trabajo: Logro,
 * Independencia, Reconocimiento, Relaciones, Apoyo y Condiciones de trabajo;
 * más Servicio a los demás y Creatividad y variedad, del Inventario de Valores
 * Laborales de Super (WVI, Work Values Inventory). Redacción propia (no
 * reproduce ítems de esos instrumentos): 8 valores × 3 afirmaciones, escala 0–4.
 *
 * Sin calificación: este archivo lo usa el formulario de quien responde.
 */

export const VALORES_TITULO_PACIENTE = "Cuestionario de valores laborales · versión JJ";
export const VALORES_NOMBRE_PROFESIONAL = "Cuestionario de valores laborales";

export const VALORES_INTRO =
  "Este cuestionario te ayuda a descubrir qué es lo que más valoras en un trabajo: lo que necesitas que un empleo, carrera u ocupación te ofrezca para sentirte a gusto y motivado. No hay respuestas buenas ni malas. Lee cada frase y marca qué tan importante es para ti. Piensa en tu trabajo ideal (o en el que te gustaría tener en el futuro), no en lo que otras personas esperan de ti.";

export const VALORES_ESCALA = ["Nada importante", "Poco importante", "Importante", "Muy importante", "Imprescindible"] as const;
export const VALORES_PREGUNTA_ESCALA = "En un trabajo, ¿qué tan importante es para ti…?";

export type ValorId = "logro" | "independencia" | "reconocimiento" | "relaciones" | "servicio" | "apoyo" | "condiciones" | "creatividad";
export const VALORES_IDS: readonly ValorId[] = ["logro", "independencia", "reconocimiento", "relaciones", "servicio", "apoyo", "condiciones", "creatividad"];

/** Nombre corto que ve quien responde al elegir sus 3 valores principales. */
export const VALORES_NOMBRES: Record<ValorId, { nombre: string; frase: string }> = {
  logro: { nombre: "Logro", frase: "Usar mis capacidades y ver resultados de mi esfuerzo" },
  independencia: { nombre: "Independencia", frase: "Decidir cómo hacer mi trabajo y organizarme a mi manera" },
  reconocimiento: { nombre: "Reconocimiento", frase: "Ser valorado, crecer, ascender y tener prestigio" },
  relaciones: { nombre: "Relaciones", frase: "Buen ambiente y compañerismo en el equipo" },
  servicio: { nombre: "Servicio a los demás", frase: "Ayudar a otras personas y aportar a la sociedad" },
  apoyo: { nombre: "Apoyo", frase: "Jefes justos, capacitación y una organización que respalda" },
  condiciones: { nombre: "Estabilidad y condiciones", frase: "Empleo seguro, buen salario y tiempo para mi vida personal" },
  creatividad: { nombre: "Creatividad y variedad", frase: "Crear, proponer ideas, hacer cosas distintas y aprender" },
};

/** Ítems por número (1–24): bloques de 3 en el orden de VALORES_IDS. */
export const VALORES_ITEMS: readonly string[] = [
  // Logro
  "Poder usar mis habilidades y talentos.",
  "Ver los resultados concretos de mi esfuerzo.",
  "Sentir al final del día que logré algo que vale la pena.",
  // Independencia
  "Tomar mis propias decisiones sobre cómo hacer el trabajo.",
  "Organizar mi tiempo y mis tareas sin que me supervisen todo el tiempo.",
  "Tener la libertad de trabajar a mi manera.",
  // Reconocimiento
  "Que mi trabajo sea reconocido y valorado por otros.",
  "Tener posibilidades de ascender o crecer dentro de la organización.",
  "Ocupar un puesto de prestigio o de liderazgo.",
  // Relaciones
  "Sentirme parte de un equipo de compañeros.",
  "Un ambiente de trabajo amistoso y de colaboración.",
  "Trabajar con personas con las que comparto valores.",
  // Servicio a los demás
  "Ayudar a otras personas o mejorar su bienestar.",
  "Que mi trabajo contribuya a mi comunidad o a la sociedad.",
  "Sentir que lo que hago tiene un propósito más allá del dinero.",
  // Apoyo
  "Tener jefes que me traten con justicia y respeto.",
  "Recibir capacitación y orientación cuando la necesito.",
  "Que la organización cuide y respalde a sus trabajadores.",
  // Estabilidad y condiciones
  "Tener un empleo estable y seguro.",
  "Recibir un buen salario y prestaciones.",
  "Tener horarios que me permitan equilibrar el trabajo con mi vida personal.",
  // Creatividad y variedad
  "Crear cosas nuevas o proponer ideas originales.",
  "Hacer actividades variadas y poco repetitivas.",
  "Aprender cosas nuevas constantemente.",
];

export const valorDeItem = (n: number): ValorId => VALORES_IDS[Math.floor((n - 1) / 3)];

/** Orden de presentación intercalado (un ítem de cada valor por vuelta): 1, 4, 7, … 22, 2, 5, … */
export const VALORES_ORDEN: readonly number[] = Array.from({ length: 24 }, (_, i) => (i % 8) * 3 + Math.floor(i / 8) + 1);

export const VALORES_SITUACION = ["Estudiando", "Estudiando y trabajando", "Trabajando", "Buscando empleo", "Otra"] as const;

export const VALORES_PREGUNTA_ELEGIR = "Para terminar: de estos 8 valores, elige los 3 más importantes para ti";
export const VALORES_PREGUNTA_ABIERTA = "¿Hay algo más que sea importante para ti en un trabajo? (opcional)";
export const VALORES_GRACIAS =
  "Tus respuestas quedaron registradas. Tu psicólogo las revisará y conversarán los resultados en la próxima sesión.";
