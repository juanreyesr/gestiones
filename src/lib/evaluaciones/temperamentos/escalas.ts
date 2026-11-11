/**
 * Cuestionario de temperamento · versión JJ. Instrumento propio y orientativo
 * (sin baremos) basado en la tipología clásica de los cuatro temperamentos
 * (Hipócrates y Galeno), leída hoy en dos dimensiones: hacia afuera o hacia
 * adentro, y reacción serena o intensa (Eysenck).
 *
 * 40 afirmaciones originales (10 por temperamento: 6 del lado fuerte y 4 del
 * lado difícil), escala 0–4. Las frases no nombran ningún temperamento.
 *
 * Sin calificación ni interpretación: este archivo lo usa el formulario de
 * quien responde. Los textos interpretativos están en contenido.ts y
 * calificacion.ts (solo panel del psicólogo).
 */

export const TEMPERAMENTOS_TITULO_PACIENTE = "Cuestionario de temperamento · versión JJ";
export const TEMPERAMENTOS_NOMBRE_PROFESIONAL = "Test de temperamentos (sanguíneo, colérico, melancólico y flemático)";

export const TEMPERAMENTOS_INTRO =
  "Este cuestionario describe su manera habitual de ser, la que muestra la mayor parte del tiempo. Lea cada frase y marque qué tanto se parece a usted. Piense en cómo es realmente, no en cómo le gustaría ser ni en lo que otras personas esperan de usted. No hay respuestas buenas ni malas: todas las formas de ser tienen valor. Conteste todas las frases.";

export const TEMPERAMENTOS_TIEMPO = "Tiempo aproximado: 8 a 10 minutos. Puede cerrar la página y continuar después con el mismo enlace.";

export const TEMPERAMENTOS_ESCALA = ["Nada parecido a mí", "Poco", "Algo", "Bastante", "Muy parecido a mí"] as const;
export const TEMPERAMENTOS_PREGUNTA_ESCALA = "¿Qué tanto se parece a usted esta frase?";

/** Identificadores neutros (el nombre de cada temperamento no se muestra a quien responde). */
export type TemperamentoId = "S" | "C" | "M" | "F";
/** Orden fijo: también es el de desempate y el de presentación de los ítems. */
export const TEMPERAMENTOS_IDS: readonly TemperamentoId[] = ["S", "C", "M", "F"];

export const TEMPERAMENTOS_N_ITEMS = 40;

/**
 * Ítems en el orden de presentación (el ítem n es el n-ésimo que se muestra):
 * intercalados S, C, M, F, S, C, M, F… Cada vuelta de cuatro trae uno de cada
 * temperamento, con el lado fuerte y el difícil mezclados.
 */
export const TEMPERAMENTOS_ITEMS: readonly string[] = [
  // Vuelta 1
  "Me resulta fácil conversar con personas que acabo de conocer.",
  "Cuando me propongo una meta, busco la manera de lograrla.",
  "Doy muchas vueltas en mi cabeza a lo que dije o hice, aun mucho tiempo después.",
  "Mantengo la calma en situaciones en las que otros se alteran.",
  // Vuelta 2
  "Aunque las cosas salgan mal, suelo encontrar algo de qué reírme.",
  "Me impaciento cuando los demás tardan en decidir.",
  "Me fijo en los detalles que otras personas pasan por alto.",
  "Me gusta escuchar con paciencia a quien necesita desahogarse.",
  // Vuelta 3
  "Con frecuencia empiezo varias cosas a la vez y dejo algunas sin terminar.",
  "Cuando un grupo no avanza, me animo a tomar la dirección.",
  "Antes de actuar prefiero pensar con calma y tener un plan.",
  "Dejo para después lo que no es urgente, aunque sepa que tengo que hacerlo.",
  // Vuelta 4
  "En una reunión suelo ser quien rompe el hielo.",
  "Me siento a gusto organizando a otros para sacar adelante un trabajo.",
  "Soy muy exigente conmigo cuando algo no me sale como esperaba.",
  "Soy constante: hago mis tareas al mismo ritmo, día tras día.",
  // Vuelta 5
  "Me distraigo con facilidad cuando algo me aburre.",
  "Me cuesta aceptar que otra persona dirija cuando creo que yo sé cómo hacerlo.",
  "Cuando alguien me importa, le soy leal durante mucho tiempo.",
  "Prefiero guardar silencio antes que provocar una discusión, aunque no esté de acuerdo.",
  // Vuelta 6
  "Les cuento a los demás lo que siento sin mayor dificultad.",
  "Enfrento los problemas de frente en lugar de esperar a que se resuelvan solos.",
  "Disfruto los momentos de silencio y de estar a solas para pensar.",
  "Me llevo bien con casi todo el mundo y suelo ayudar a que otros se pongan de acuerdo.",
  // Vuelta 7
  "Me entusiasmo rápido con planes nuevos y contagio a los demás.",
  "Cuando me enojo, lo expreso con más fuerza de la que quisiera.",
  "Me gusta que el trabajo quede bien hecho, aunque me tome más tiempo.",
  "Los cambios inesperados me incomodan y tardo en adaptarme.",
  // Vuelta 8
  "Se me olvidan citas o compromisos si no los anoto.",
  "Trabajo con energía durante muchas horas si hay algo importante que lograr.",
  "Tardo en confiar en las personas y espero a conocer sus verdaderas intenciones.",
  "Me cuesta enojarme y suelo dejar pasar las ofensas pequeñas.",
  // Vuelta 9
  "Me recupero pronto después de una desilusión.",
  "Defiendo mi opinión con firmeza aunque no sea la de la mayoría.",
  "Me conmuevo con las dificultades de otros y trato de comprenderlas.",
  "Espero a que otros den el primer paso en lugar de proponer yo las ideas.",
  // Vuelta 10
  "Suelo hablar más de lo que escucho.",
  "Me cuesta delegar porque siento que yo lo hago mejor y más rápido.",
  "Veo primero lo que puede salir mal antes de ver lo que puede salir bien.",
  "Las personas me buscan porque saben que no las voy a juzgar con dureza.",
];

/** Temperamento al que pertenece el ítem n (1–40) según su posición intercalada. */
export const temperamentoDeItem = (n: number): TemperamentoId => TEMPERAMENTOS_IDS[(n - 1) % 4];

export const TEMPERAMENTOS_SITUACION = ["Estudiando", "Estudiando y trabajando", "Trabajando", "Buscando empleo", "Otra"] as const;

export const TEMPERAMENTOS_PREGUNTA_ABIERTA = "¿Hay algo más que quiera contar sobre su forma de ser? (opcional)";
export const TEMPERAMENTOS_GRACIAS =
  "Sus respuestas quedaron registradas. Su psicólogo las revisará y conversarán los resultados en la próxima sesión.";
