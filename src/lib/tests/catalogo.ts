import { MCEA_CRISIS } from "@/lib/evaluaciones/mcea/contenido";

/**
 * Catálogo público de tests (www.juanjreyes.org/tests). Solo metadatos: lo usan la
 * página pública, el servidor (precios y opciones fijas) y el panel. Sin calificación.
 */

export const PRECIO_PRIMERA = 10;
export const PRECIO_REEVALUACION = 5;
export const MONEDA = "USD";
/** Edad mínima para crear una cuenta y hacer los tests. */
export const EDAD_MINIMA = 18;

export type AreaTest = "animo" | "personalidad" | "vocacional";

export const AREAS_TESTS: { id: AreaTest; nombre: string; descripcion: string }[] = [
  {
    id: "animo",
    nombre: "Ánimo y ansiedad",
    descripcion: "Cómo se ha sentido en las últimas semanas: preocupación, tensión, desánimo y la forma en que le dan vueltas los pensamientos.",
  },
  {
    id: "personalidad",
    nombre: "Personalidad y conducta",
    descripcion: "Su estilo natural de comportarse y relacionarse: qué le da energía, cómo reacciona y cómo aprovecharlo.",
  },
  {
    id: "vocacional",
    nombre: "Vocacional",
    descripcion: "Sus intereses y lo que más valora en un trabajo, para elegir carrera o reorientar su camino profesional.",
  },
];

export type TestCatalogo = {
  /** Id del instrumento (el mismo del panel clínico). */
  id: string;
  area: AreaTest;
  nombre: string;
  resumen: string;
  /** Explicación breve: qué mide y para qué le sirve. */
  explicacion: string[];
  minutos: string;
  recibe: string[];
  /** Opciones fijas con las que se aplica (p. ej. escalas del EAPI). */
  opciones: Record<string, unknown>;
  /** Pide recursos de crisis si marca la pregunta de seguridad. */
  conSeguridad: boolean;
};

export const TESTS: readonly TestCatalogo[] = [
  {
    id: "mcea",
    area: "animo",
    nombre: "Mapa Cognitivo-Emocional",
    resumen: "Un recorrido adaptativo por su ánimo, su ansiedad y sus patrones de pensamiento.",
    explicacion: [
      "Empieza con preguntas breves sobre su ánimo y su nivel de preocupación y, según sus respuestas, profundiza solo en lo que más le está afectando: pensamientos que se repiten, formas de pensar que atrapan, autosabotaje y sus recursos personales.",
      "Le ayuda a poner en palabras cómo se encuentra hoy y a identificar en qué vale la pena trabajar.",
    ],
    minutos: "6 a 15 minutos",
    recibe: ["Informe sencillo con sus resultados por área", "Qué significa cada resultado y sugerencias prácticas", "Comparación con su aplicación anterior cuando se reevalúe"],
    opciones: {},
    conSeguridad: true,
  },
  {
    id: "eapi",
    area: "animo",
    nombre: "Evaluación de estrés y ansiedad",
    resumen: "Ansiedad generalizada, estrés, ánimo y tensión en las últimas dos semanas.",
    explicacion: [
      "Reúne dos cuestionarios ampliamente utilizados: la Escala del Trastorno de Ansiedad Generalizada de 7 ítems (GAD-7) y las Escalas de Depresión, Ansiedad y Estrés de 21 ítems (DASS-21).",
      "Sirve para ver con claridad cuánto le está afectando la preocupación, el estrés y el desánimo, y seguir su evolución en el tiempo.",
    ],
    minutos: "8 a 10 minutos",
    recibe: ["Informe con su nivel en cada área (ansiedad, estrés y ánimo)", "Explicación sencilla de cada resultado", "Comparación con su aplicación anterior cuando se reevalúe"],
    opciones: { modulos: ["gad", "dass"] },
    conSeguridad: true,
  },
  {
    id: "temperamentos",
    area: "personalidad",
    nombre: "Características comportamentales JJR",
    resumen: "Cuatro estilos de comportamiento: cuál predomina en usted y cómo se combinan.",
    explicacion: [
      "Instrumento propio con 40 afirmaciones sobre su forma habitual de actuar. Describe cuatro estilos (sociable y entusiasta, decidido y enérgico, reflexivo y sensible, sereno y constante) y cuál predomina en usted.",
      "Es orientativo: le ayuda a conocerse, entender sus reacciones y aprovechar sus fortalezas.",
    ],
    minutos: "8 a 10 minutos",
    recibe: ["Su estilo predominante y su combinación", "Fortalezas y aspectos a cuidar", "Sugerencias para el día a día"],
    opciones: {},
    conSeguridad: false,
  },
  {
    id: "jjr84",
    area: "vocacional",
    nombre: "Intereses vocacionales JJR",
    resumen: "84 actividades de 14 campos para descubrir hacia dónde se inclinan sus intereses.",
    explicacion: [
      "Instrumento propio: indica cuánto le gustaría realizar 84 actividades de 14 campos (salud, tecnología, negocios, arte, educación, derecho y más).",
      "Ordena las áreas de mayor a menor inclinación y le propone rutas para conocerlas mejor. Ideal para elegir carrera o reorientarse.",
    ],
    minutos: "12 a 15 minutos",
    recibe: ["Gráfica de sus áreas de mayor a menor interés", "Las actividades que más le gustaron", "Rutas y carreras para explorar"],
    opciones: {},
    conSeguridad: false,
  },
  {
    id: "riasec",
    area: "vocacional",
    nombre: "Test de intereses (RIASEC)",
    resumen: "Su código de intereses según el modelo de Holland: Realista, Investigador, Artístico, Social, Emprendedor y Convencional.",
    explicacion: [
      "36 afirmaciones basadas en el modelo de Holland, uno de los más usados en orientación vocacional.",
      "Obtiene su código de intereses de tres letras y las carreras y ocupaciones que mejor encajan con él.",
    ],
    minutos: "8 a 10 minutos",
    recibe: ["Su código Holland y su perfil en el hexágono", "Carreras y ocupaciones para explorar", "Cómo interpretar su perfil"],
    opciones: {},
    conSeguridad: false,
  },
  {
    id: "valores",
    area: "vocacional",
    nombre: "Valores laborales",
    resumen: "Lo que más valora en un trabajo: logro, estabilidad, servicio, creatividad y más.",
    explicacion: [
      "24 afirmaciones sobre 8 valores laborales y la elección de sus 3 más importantes.",
      "Complementa el test de intereses: además de qué le gusta hacer, aclara qué necesita de un trabajo para sentirse satisfecho.",
    ],
    minutos: "5 a 7 minutos",
    recibe: ["Sus valores laborales en orden de prioridad", "Qué buscar en un trabajo o carrera", "Cruce con su código RIASEC si ya lo hizo"],
    opciones: {},
    conSeguridad: false,
  },
];

export const testPorId = (id: string | null | undefined) => TESTS.find((t) => t.id === id) ?? null;
export const testsDeArea = (area: AreaTest) => TESTS.filter((t) => t.area === area);

/** Versión de los textos de consentimiento (se guarda con cada aceptación). */
export const VERSION_CONSENTIMIENTO = "2026-11-24";

export const CONSENTIMIENTO_DATOS = [
  "Acepto que M. A. Juan José Reyes guarde mis datos generales, mis respuestas y mis resultados para uso interno: mostrarme mi historial y mi avance, mejorar los instrumentos y llevar estadísticas sin identificarme.",
  "Mis datos no se venden ni se comparten con terceros. Puedo pedir que se eliminen en cualquier momento escribiendo a través del sitio.",
];

export const CONSENTIMIENTO_CONTACTO =
  "Quiero recibir información sobre nuevos instrumentos, talleres o recursos que puedan ayudarme según mis intereses (puedo darme de baja cuando quiera).";

/** Lo que se acepta antes de comenzar cada test. */
export const CONSENTIMIENTO_TEST = [
  "Este test es una herramienta de autoevaluación: muestra de forma general y superficial cómo me encuentro en este momento.",
  "No es un diagnóstico clínico ni sustituye la evaluación de un profesional de la salud mental, que es el único que puede emitir un criterio clínico con más información y atención a mi caso.",
  "Mis resultados pueden cambiar con el tiempo y con las circunstancias que estoy viviendo.",
  "Si estoy pasando por una crisis o tengo pensamientos de hacerme daño, buscaré ayuda inmediata (al final encontraré a dónde acudir).",
];

/** Recursos de ayuda inmediata: los mismos que usa el MCEA (Guatemala) y una indicación general. */
export const RECURSOS_CRISIS = [
  ...MCEA_CRISIS,
  "Si está fuera de Guatemala, llame al número de emergencias de su país o acuda a la emergencia del hospital más cercano.",
  "Hable hoy con alguien de confianza y no se quede a solas.",
];
