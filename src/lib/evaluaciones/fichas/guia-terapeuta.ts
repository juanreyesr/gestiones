/**
 * Fichas terapéuticas JJR: parte «Para el terapeuta» de cada ficha. SOLO panel
 * del psicólogo: no importar desde el formulario público ni desde catalogo.ts.
 */
import type { FichaId } from "./catalogo";

export type GuiaTerapeuta = {
  /** Fundamento (de dónde sale la ficha). */
  base: string;
  objetivo: string;
  cuandoUsarla: readonly string[];
  cuandoNoUsarla: readonly string[];
  /** Cómo presentarla en sesión (3 a 5 pasos). */
  presentar: readonly string[];
  errores: readonly string[];
  /** Cómo revisarla en la siguiente sesión. */
  revisar: readonly string[];
};

export const GUIA_TERAPEUTA: Record<FichaId, GuiaTerapeuta> = {
  "1.1": {
    base: "Formulación de metas en TCC (metas SMART adaptadas).",
    objetivo:
      "Que el paciente defina el problema en sus propias palabras y salga con una a tres metas concretas, medibles y alcanzables, más una línea base (0–10) de cuánto le afecta hoy.",
    cuandoUsarla: [
      "Al inicio del tratamiento, después de la primera entrevista.",
      "Cuando el motivo de consulta sigue siendo vago («ando mal») y falta un rumbo compartido.",
      "Al reformular el tratamiento tras varias sesiones sin foco claro.",
    ],
    cuandoNoUsarla: [
      "En una crisis aguda o con riesgo: primero seguridad y contención.",
      "Si la persona tiene mucha dificultad para leer o escribir (hacerla de forma oral en sesión).",
      "Si ya hay metas claras y consensuadas: no repetirla por rutina.",
    ],
    presentar: [
      "Explicar que la ficha sirve para ponernos de acuerdo en hacia dónde vamos, y que no hay respuestas incorrectas.",
      "Si el paciente la responde en casa, indicarle que deje en blanco lo que no sepa.",
      "En sesión, leer juntos el motivo y pedir un ejemplo de un día reciente en que el problema se notó.",
      "Convertir cada meta vaga en algo observable: ¿qué haría usted distinto? ¿cómo lo notaríamos otras personas y usted?",
      "Acordar con cuál meta empezar y anotarla como referencia de seguimiento.",
    ],
    errores: [
      "Aceptar metas de resultado que no dependen de la persona («que mi jefe cambie») sin traducirlas a conducta propia.",
      "Metas negativas («no tener ansiedad»): reformular a lo que quiere hacer o tener en su lugar.",
      "Fijar metas demasiado grandes o con plazos irreales.",
      "Tomar el 0–10 como diagnóstico: es una referencia para comparar consigo mismo.",
    ],
    revisar: [
      "Leer el motivo y las metas con el paciente; preguntar qué le llamó la atención al escribirlas.",
      "Afinar cada meta (concreta, medible, plazo) y elegir la primera.",
      "Volver a preguntar el 0–10 y la confianza; anotar los valores como línea base.",
      "Dejar registrado en el expediente la meta elegida para revisarla cada pocas sesiones.",
    ],
  },
  "1.2": {
    base: "Formulación longitudinal: factores predisponentes, precipitantes, de mantenimiento y protectores.",
    objetivo:
      "Reconstruir la historia del problema (inicio, altibajos y contexto) para identificar qué lo precipitó, qué lo mantiene hoy y qué factores protegen.",
    cuandoUsarla: [
      "Al armar la formulación del caso, cuando el problema lleva meses o años.",
      "Cuando el paciente no ve relación entre su problema y lo que le ha pasado.",
      "Antes de decidir en qué componente intervenir primero.",
    ],
    cuandoNoUsarla: [
      "Si recordar la historia puede desbordar (trauma reciente o sin estabilización): hacerla oral, por partes y en sesión.",
      "Con riesgo activo o crisis: priorizar seguridad.",
      "Si el paciente la vive como interrogatorio o como búsqueda de culpables.",
    ],
    presentar: [
      "Explicar que la historia nos ayuda a entender qué mantiene el problema, no a buscar culpables.",
      "Aclarar que puede dejar en blanco lo doloroso y que se conversa después.",
      "Dibujar o construir juntos una línea de tiempo con los momentos de la tabla, con la intensidad aproximada.",
      "Marcar los picos y las bajadas y preguntar qué cambió en la vida del paciente en esos momentos.",
      "Cerrar nombrando de 2 a 3 factores de mantenimiento y de 1 a 2 protectores, y comprobar si el paciente se reconoce.",
    ],
    errores: [
      "Convertir la ficha en una cronología clínica completa: lo útil son los cambios, no cada hecho.",
      "Pasar por alto factores protectores y recursos.",
      "Inferir causas con demasiada seguridad: son hipótesis a comprobar con el paciente.",
      "Profundizar en material traumático sin plan ni estabilización.",
    ],
    revisar: [
      "Preguntar cómo fue escribirla y qué notó al verla completa.",
      "Revisar juntos los momentos de mejoría: qué hacía distinto y si se puede retomar.",
      "Nombrar los factores de mantenimiento y vincularlos con el plan de tratamiento.",
      "Guardar un resumen de la formulación en el expediente.",
    ],
  },
  "1.3": {
    base: "Modelo cognitivo (Beck); «cinco áreas» (Padesky y Greenberger).",
    objetivo:
      "Que el paciente vea, con 2 o 3 episodios recientes, cómo se conectan situación, pensamiento, emoción, cuerpo y conducta, y detecte dónde puede intervenirse.",
    cuandoUsarla: [
      "Al introducir el modelo cognitivo-conductual, en las primeras sesiones.",
      "Cuando el paciente atribuye todo a la situación y no nota sus pensamientos o conductas.",
      "Como base antes de trabajar técnicas cognitivas o conductuales.",
    ],
    cuandoNoUsarla: [
      "Con emociones muy intensas en el momento: dejarla para después de estabilizar.",
      "Si el paciente se pone a buscar el pensamiento «correcto»: aclarar que es solo observar.",
      "Si hay riesgo no atendido: primero seguridad.",
    ],
    presentar: [
      "Explicar el círculo con un ejemplo cotidiano, y pedir al paciente uno propio de esta semana.",
      "Llenar juntos la primera fila en sesión, columna por columna.",
      "Diferenciar pensamiento (una frase) de emoción (una palabra) y pedir la intensidad de 0 a 100.",
      "Indicar que complete dos filas más con situaciones recientes, sin buscar las más graves.",
      "Revisar qué se repite y qué efecto tiene la conducta a corto y a largo plazo.",
    ],
    errores: [
      "Mezclar pensamientos con emociones («pensé que me sentía mal»).",
      "Escoger situaciones demasiado lejanas o muy cargadas.",
      "Corregir o discutir los pensamientos en este momento: aquí solo se registra.",
      "Omitir el cuerpo y la conducta, que suelen mantener el ciclo.",
    ],
    revisar: [
      "Leer cada fila y preguntar cuál le costó más completar.",
      "Buscar qué se repite entre las filas (pensamientos, emociones, conductas).",
      "Marcar con el paciente el punto del ciclo donde parece más posible un cambio pequeño.",
      "Decidir si sigue un registro de pensamientos o una tarea conductual.",
    ],
  },
  "1.4": {
    base: "Clarificación de valores (terapia de aceptación y compromiso, Hayes).",
    objetivo:
      "Identificar valores personales por áreas de la vida y concretar una acción pequeña por valor, como brújula para elegir metas y tareas.",
    cuandoUsarla: [
      "Cuando el paciente siente que la vida «se achicó» o perdió sentido por el problema.",
      "Para elegir metas con sentido, o al planificar activación conductual.",
      "Cuando hay desmotivación o dudas sobre para qué esforzarse.",
    ],
    cuandoNoUsarla: [
      "En depresión grave con anhedonia marcada, si la ficha se vive como una exigencia: hacerla oral y breve.",
      "Con riesgo suicida no atendido: primero seguridad.",
      "Si el paciente responde desde el «deber ser» o la presión familiar: explorar eso antes.",
    ],
    presentar: [
      "Diferenciar valor (dirección) de meta (algo que se logra), con un ejemplo cotidiano.",
      "Elegir juntos una o dos áreas y completarlas en sesión como ejemplo.",
      "Para cada valor, pedir una acción pequeña, concreta y de pocos minutos.",
      "Preguntar qué se ha interpuesto y qué costo tiene para sus valores.",
      "Acordar una acción para la semana y anotarla.",
    ],
    errores: [
      "Aceptar valores que en realidad son metas o reglas («tener casa», «no ser débil»).",
      "Responder por lo que debería importar y no por lo que importa.",
      "Acciones demasiado grandes que se convierten en otra exigencia.",
      "Prolongar el análisis sin pasar a una acción concreta.",
    ],
    revisar: [
      "Preguntar qué áreas fueron fáciles y cuáles difíciles de responder.",
      "Revisar la acción pequeña: ¿se hizo? ¿qué se notó? Si no, qué la impidió.",
      "Relacionar los valores con las metas de la ficha 1.1 y con lo que se evita.",
      "Elegir la siguiente acción para la semana.",
    ],
  },
  "2.1": {
    base: "Psicoeducación de la ansiedad (Barlow; Craske).",
    objetivo:
      "Que el paciente entienda la ansiedad como una respuesta de alarma normal y útil, reconozca sus propias señales (cuerpo, pensamientos, conducta) y reduzca el miedo a las sensaciones.",
    cuandoUsarla: [
      "Cuando hay preocupación, tensión corporal, palpitaciones o crisis de ansiedad.",
      "Al explicar el tratamiento, antes de trabajar técnicas para la ansiedad.",
      "Cuando el paciente interpreta las sensaciones como peligrosas.",
    ],
    cuandoNoUsarla: [
      "Si los síntomas corporales no se han evaluado médicamente y hay duda de causa orgánica: derivar o descartar primero.",
      "Si el paciente la usa como garantía para quedarse sin tratamiento o seguirla evitando.",
      "En crisis aguda: primero contención.",
    ],
    presentar: [
      "Preguntar qué le han explicado antes sobre la ansiedad y qué teme que signifiquen sus síntomas.",
      "Explicar la alarma con un ejemplo cotidiano (el carro que frena) y relacionarla con sus señales marcadas.",
      "Revisar juntos las casillas marcadas y conectar cada una con la función de la alarma.",
      "Reservar tiempo para el momento reciente: la fuerza, la creencia de peligro y cómo terminó.",
      "Resumir en una frase del paciente lo que entendió y cómo le sirve.",
    ],
    errores: [
      "Dar una clase larga: conviene partir de lo que el paciente marcó.",
      "Prometer que la ansiedad desaparecerá o minimizar el malestar.",
      "Dar indicaciones médicas o de medicación (no corresponden a esta ficha).",
      "Presentarla como tranquilizadora («no pasa nada») en lugar de explicativa.",
    ],
    revisar: [
      "Revisar el momento reciente y preguntar cómo terminó: ¿bajó sin hacer nada especial?",
      "Comparar la creencia de peligro con lo que ocurrió realmente.",
      "Decidir si se pasa a la ficha 2.4 (evitación) o a otras técnicas.",
      "Preguntar si algo cambió en cómo interpreta sus señales.",
    ],
  },
  "2.2": {
    base: "Activación conductual (Martell, Dimidjian y Herman-Dunn).",
    objetivo:
      "Mostrar el círculo ánimo bajo – hacer menos – menos refuerzo – ánimo más bajo, y acordar una acción pequeña y realista como primer paso de activación.",
    cuandoUsarla: [
      "Con ánimo bajo, desgano, aislamiento o abandono de actividades.",
      "Al iniciar la activación conductual.",
      "Cuando el paciente espera «tener ganas» para empezar.",
    ],
    cuandoNoUsarla: [
      "Con riesgo suicida no atendido: primero valoración de riesgo y plan de seguridad.",
      "Si hay duelo reciente intenso y la ficha se vive como presión por «volver a la normalidad».",
      "Si el paciente está tan agotado que cualquier tarea es excesiva: reducir aún más o hacerla oral.",
    ],
    presentar: [
      "Normalizar: el ánimo bajo quita energía, y esperar a tener ganas suele mantener el círculo.",
      "Completar con el paciente un ejemplo de su círculo de esta semana.",
      "Elegir una acción de 5 a 10 minutos que sea posible aun en un día malo.",
      "Fijar día, hora y lugar, y anticipar qué podría impedirla.",
      "Acordar cómo se registrará: qué hizo y cómo se sintió antes y después.",
    ],
    errores: [
      "Proponer varias acciones o acciones demasiado grandes.",
      "Interpretar un incumplimiento como falta de voluntad: usarlo como información.",
      "Elegir solo tareas de deber y no de gusto o dominio.",
      "Perder de vista señales de riesgo: revisar si el texto libre las muestra.",
    ],
    revisar: [
      "Preguntar qué hizo, cuándo y cómo se sintió antes y después.",
      "Si no la hizo: revisar el obstáculo y reducir la acción.",
      "Si la hizo: reforzar y agregar otra pequeña, o aumentar un poco.",
      "Releer el ánimo de la semana y valorar con la guía de evaluación que corresponda.",
    ],
  },
  "2.3": {
    base: "Rumiación (Watkins); terapia metacognitiva (Wells).",
    objetivo:
      "Que el paciente distinga pensar para resolver de darle vueltas, identifique cuándo aparecen sus pensamientos recurrentes y empiece a cambiar de «¿por qué?» a «¿qué puedo hacer?».",
    cuandoUsarla: [
      "Con preocupación o rumiación frecuente, ánimo bajo con pensamientos que dan vueltas o dificultad para dormir.",
      "Antes de técnicas de entrenamiento atencional, tiempo de preocupación o defusión.",
      "Cuando el paciente cree que darle vueltas es necesario para resolver.",
    ],
    cuandoNoUsarla: [
      "Si los pensamientos son obsesiones con rituales: valorar otra línea de trabajo.",
      "Si el contenido incluye ideas de muerte o de hacerse daño: abordarlo primero.",
      "Si el paciente la vive como una orden de «dejar de pensar».",
    ],
    presentar: [
      "Preguntar si ha notado que a veces piensa para resolver y a veces solo da vueltas.",
      "Usar un ejemplo reciente del paciente para ver las dos formas.",
      "Pedir un registro de tres episodios esta semana: cuándo, qué pensamiento, cuánto duró.",
      "Practicar en sesión convertir una pregunta «¿por qué?» en «¿qué puedo hacer?» (o reconocer que no depende de él).",
      "Aclarar que se trata de observar, no de luchar contra el pensamiento.",
    ],
    errores: [
      "Indicar «no piense en eso»: aumenta la rumiación.",
      "Discutir el contenido del pensamiento en lugar del proceso.",
      "Pedir que se resuelva cada problema: algunos no dependen del paciente.",
      "Olvidar las conductas asociadas (revisar, buscar tranquilidad) que sostienen las vueltas.",
    ],
    revisar: [
      "Revisar el registro: cuándo suelen aparecer, cuánto duran y cómo termina.",
      "Preguntar qué efecto tuvo cambiar la pregunta cuando lo intentó.",
      "Comparar la utilidad percibida (0–10) con el tiempo que ocupa.",
      "Decidir la siguiente técnica según el patrón observado.",
    ],
  },
  "2.4": {
    base: "Modelo de evitación y exposición (Barlow; Craske).",
    objetivo:
      "Que el paciente vea cómo la evitación da alivio inmediato pero mantiene o aumenta el miedo, y que liste lo que evita y lo que le cuesta, como base para planear una exposición gradual en sesión.",
    cuandoUsarla: [
      "Con ansiedad, fobias, pánico o conductas de evitación evidentes.",
      "Antes de planificar una jerarquía de exposición.",
      "Cuando el paciente no ve cuánto ha reducido su vida.",
    ],
    cuandoNoUsarla: [
      "Si hay un peligro real que justifica la evitación: valorar primero la situación.",
      "Si el paciente podría interpretarla como una orden de enfrentarse por su cuenta.",
      "En crisis aguda o sin una explicación previa de la alarma (ver ficha 2.1).",
    ],
    presentar: [
      "Explicar con un ejemplo cotidiano por qué evitar alivia y por qué mantiene el miedo.",
      "Aclarar de forma explícita que no se pide hacer exposición por cuenta propia: solo observar y listar.",
      "Completar con el paciente una o dos filas en sesión.",
      "Pedir que anote también las evitaciones sutiles (acompañarse, distraerse, cancelar).",
      "Cerrar con el costo en su vida y su 0–10 de limitación.",
    ],
    errores: [
      "Dejarla como tarea de «enfrentar»: la exposición se planifica en sesión, de forma gradual y con consentimiento.",
      "Valorar solo lo evidente y pasar por alto la evitación sutil.",
      "Culpar o presionar por lo que evita.",
      "No relacionar la evitación con los valores y metas del paciente.",
    ],
    revisar: [
      "Leer la lista y ordenar con el paciente lo que más le cuesta y lo que más le importa recuperar.",
      "Preguntar cómo se sintió al completar la lista y qué descubrió.",
      "Si procede, elegir una situación para empezar a planear una exposición gradual en sesión.",
      "Revisar las evitaciones sutiles y cómo se relacionan con el miedo.",
    ],
  },
};
