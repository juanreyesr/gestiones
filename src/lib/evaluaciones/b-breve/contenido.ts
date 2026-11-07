/**
 * Cuestionario B-Breve: contenido LITERAL del instrumento (Anexo A de la
 * especificación). Autor del contenido clínico: M. A. Juan J. Reyes. Fuente:
 * sección 10.2 de "Polidipsia psicógena infantil: guía para el psicólogo".
 *
 * No modificar textos, orden ni numeración: son el instrumento.
 * Este archivo lo usa el formulario de los padres; NO debe importar nada de
 * la calificación (calificacion.ts), que solo se usa en el panel del psicólogo.
 */

export const B_BREVE_TITULO = "Cuestionario breve sobre el entorno de su hijo o hija";

export const B_BREVE_INSTRUCCIONES =
  "Estas preguntas nos ayudan a conocer el ambiente en el que vive su hijo o hija y a entender mejor la conducta de beber agua. No hay respuestas buenas ni malas. Responda pensando en el último mes. Si no está seguro, marque la opción que más se acerque; podremos conversarla después. Si en el hogar hay dos cuidadores, es preferible que cada uno responda por separado.";

export const B_BREVE_ENCABEZADO_ITEMS = "En el último mes…";

export const B_BREVE_ESCALA = ["Nunca o no aplica", "A veces", "Con frecuencia", "Casi siempre"] as const;

export type BBreveItem = { n: number; texto: string; ayuda?: string; etiquetas?: readonly string[] };

export const B_BREVE_ITEMS: readonly BBreveItem[] = [
  {
    n: 1,
    texto:
      "Nuestra familia ha pasado por cambios importantes (mudanza, separación, nacimiento de un hermano, pérdida de un ser querido, cambio de trabajo o de quien cuida al niño).",
    ayuda: "Marque 0 si ninguno, 1 si uno, 2 si dos, 3 si tres o más.",
    etiquetas: ["Ninguno", "Uno", "Dos", "Tres o más"],
  },
  { n: 2, texto: "Yo me he sentido agotado/a, triste o muy estresado/a." },
  {
    n: 3,
    texto: "Alguien (médico, familiar, conocido) recomendó que el niño tomara mucha agua y en casa seguimos esa indicación.",
  },
  { n: 4, texto: "Mi hijo lleva su botella o vaso de agua a todas partes y se inquieta si no lo tiene." },
  { n: 5, texto: "Mi hijo puede servirse agua solo, en cualquier momento, sin que un adulto lo note." },
  { n: 6, texto: "Le damos agua cuando llora, se aburre, se enoja o para calmarlo." },
  { n: 7, texto: "Le damos agua para que se duerma o cuando se despierta de noche." },
  { n: 8, texto: "Le damos agua para que no pida comida entre horas o para controlar su apetito." },
  { n: 9, texto: "Cuando pide agua, se la damos enseguida para evitar un berrinche." },
  {
    n: 10,
    texto: "Los adultos de la casa reaccionamos de manera distinta cuando pide agua (uno se la da, otro se la niega).",
  },
  {
    n: 11,
    texto: "Hablamos del \"problema del agua\" delante del niño, lo regañamos o lo comparamos con otros por beber tanto.",
  },
  {
    n: 12,
    texto: "Hemos intentado quitarle el agua de golpe y terminó en conflicto, llanto intenso o buscando agua a escondidas.",
  },
  { n: 13, texto: "En casa hay discusiones fuertes, gritos o tensión entre los adultos." },
  { n: 14, texto: "Mi hijo tiene poco tiempo de juego tranquilo a solas con mamá o papá." },
  { n: 15, texto: "Las horas de comer y de dormir cambian mucho de un día a otro." },
  {
    n: 16,
    texto: "La maestra o la escuela han comentado algo sobre la botella de agua, las idas al baño o la conducta de mi hijo.",
  },
];

export const B_BREVE_SEGURIDAD = [
  {
    clave: "S1",
    texto:
      "¿Alguna vez alguien ha hecho que el niño beba una gran cantidad de agua de una sola vez (como castigo, para \"limpiarlo\", para una medicina o por otra razón)?",
    corto: "Ingesta forzada",
  },
  {
    clave: "S2",
    texto:
      "¿Ha notado que el niño bebe mucho menos cuando está fuera de casa (con abuelos, otros familiares, en la escuela o de paseo)?",
    corto: "Bebe menos fuera de casa",
  },
] as const;

export const B_BREVE_ABIERTA = "¿Qué cree usted que hizo que empezara a beber tanta agua? ¿Cuándo empezó?";

export const B_BREVE_EXTRA = "¿Hay algo más que le parezca importante y que no se haya preguntado?";

export const B_BREVE_RELACIONES = ["Madre", "Padre", "Abuela/abuelo", "Tutor/a", "Otro cuidador"] as const;

export const B_BREVE_GRACIAS =
  "Gracias por responder. Sus respuestas quedaron registradas. El psicólogo las revisará y las conversará con usted en la próxima sesión.";

export const B_BREVE_AVISO_FORMULARIO =
  "Instrumento orientativo, sin validación psicométrica. Fuente: sección 10.2 de \"Polidipsia psicógena infantil: guía para el psicólogo\" (M. A. Juan J. Reyes).";
