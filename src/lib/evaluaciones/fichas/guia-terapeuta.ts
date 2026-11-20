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
  "3.1": {
    base: "Registro de pensamientos disfuncionales (Beck, 1979; J. S. Beck, 2011/2020; Greenberger y Padesky, 2016).",
    objetivo:
      "Que el paciente aprenda a atrapar el pensamiento automático en el momento, a medir cuánto lo cree y la intensidad de la emoción (0–10), a escribir una respuesta más equilibrada y a ver cuánto cambia su malestar.",
    cuandoUsarla: [
      "Cuando ya entiende el ciclo situación, pensamiento, emoción y conducta (ficha 1.3) y reconoce sus pensamientos como interpretaciones.",
      "Con ansiedad, ánimo bajo, enojo o vergüenza ligados a pensamientos automáticos identificables.",
      "Como tarea entre sesiones, después de haber llenado un registro juntos en sesión.",
    ],
    cuandoNoUsarla: [
      "En crisis o con riesgo suicida o de daño sin evaluación previa: la reestructuración no sustituye la evaluación de riesgo.",
      "En TOC, no usarla con las obsesiones: buscar una respuesta «equilibrada» puede volverse un ritual de comprobación; preferir 2.3, 2.4 y exposición con prevención de respuesta guiada.",
      "En depresión grave, con poca energía y concentración: empezar por la activación conductual (ficha 2.2) y dejar el registro para después.",
      "Si el paciente la vive como «pensar en positivo» o como una obligación de convencerse.",
    ],
    presentar: [
      "Explicar qué es un pensamiento automático y enseñar la pregunta «¿qué pasó por mi mente justo antes de sentirme así?».",
      "Llenar juntos la primera fila en sesión con un episodio real y reciente, columna por columna.",
      "Distinguir el pensamiento (una frase) de la emoción (una palabra con su intensidad) y pedir los dos números (0–10).",
      "Para la respuesta equilibrada, preguntar qué le diría a una persona querida que lo viviera; no aceptar frases forzadas.",
      "Pedir uno o dos registros más esta semana, con episodios reales, sin buscar los más difíciles.",
    ],
    errores: [
      "Mezclar pensamiento y emoción («pensé que me sentía mal»).",
      "Exigir una respuesta equilibrada que el paciente no cree: se vuelve un eslogan.",
      "Discutir o refutar el pensamiento en lugar de explorarlo con curiosidad.",
      "Esperar que el malestar baje siempre; a veces el cambio es pequeño o viene después.",
    ],
    revisar: [
      "Leer cada registro y comparar «cuánto lo creía» y la emoción antes y después.",
      "Buscar pensamientos o temas que se repiten (indicio de creencias más profundas).",
      "Preguntar qué respuesta equilibrada le resultó creíble y cuál no, y por qué.",
      "Decidir si sigue 3.2 (nombrar las formas de pensar) o 3.3 (examinar las pruebas de un pensamiento clave).",
    ],
  },
  "3.2": {
    base: "Distorsiones cognitivas (Beck, 1979; Burns, 1980), presentadas en lenguaje sencillo.",
    objetivo:
      "Que el paciente reconozca las formas de pensar que más usa, las vea como atajos comunes y no como defectos, y practique una pregunta que le ayude a mirar 2 o 3 pensamientos propios de otra manera.",
    cuandoUsarla: [
      "Después de 3.1, cuando ya identifica pensamientos automáticos pero se queda sin recursos para cuestionarlos.",
      "Cuando el MCEA marca distorsiones con puntaje alto (3 o más).",
      "Con patrones de pensamiento rígidos o muy repetidos, de ansiedad, ánimo bajo o enojo.",
    ],
    cuandoNoUsarla: [
      "En crisis o con riesgo sin evaluación previa.",
      "En TOC, no usarla para etiquetar o discutir las obsesiones: puede convertirse en comprobación.",
      "En depresión grave, empezar por activación conductual (ficha 2.2).",
      "Si el paciente se juzga por «pensar mal» o usa los nombres como un reproche.",
    ],
    presentar: [
      "Normalizar: a todas las personas nos pasa, son atajos de la mente y no defectos.",
      "Recorrer la lista con un ejemplo cotidiano de cada forma, sin pedir que memorice los nombres.",
      "Pedir que marque las que reconoce y que identifique cuál es la más frecuente, con una frase real.",
      "Practicar en sesión con un pensamiento suyo: nombrar la forma, elegir una pregunta y escribir otra forma de verlo.",
      "Dejar de tarea otros dos pensamientos, aclarando que no hay un nombre «correcto».",
    ],
    errores: [
      "Convertirla en un examen de vocabulario o en un debate sobre cuál es la etiqueta exacta.",
      "Usar los nombres como reproche («está catastrofizando»).",
      "Dar por hecho que toda emoción intensa es una distorsión: a veces la situación es realmente difícil.",
      "Dejar de lado los hechos: la pregunta útil sirve para explorar, no para forzar otra conclusión.",
    ],
    revisar: [
      "Revisar cuáles formas marcó y si coinciden con lo que se observa en sesión.",
      "Leer las tres prácticas y preguntar qué pregunta le resultó más útil.",
      "Notar si la otra forma de verlo le convenció (0–10) o si sonó forzada.",
      "Decidir si sigue 3.3 con un pensamiento que le pese mucho.",
    ],
  },
  "3.3": {
    base: "Reestructuración cognitiva y preguntas socráticas (Beck, 1979; J. S. Beck, 2011/2020; Padesky, 1993, «Socratic questioning»).",
    objetivo:
      "Que el paciente tome un solo pensamiento que le pesa, lo trate como una hipótesis, examine los hechos a favor y en contra, busque otra explicación y llegue a un pensamiento equilibrado, midiendo cuánto lo cree antes y después.",
    cuandoUsarla: [
      "Cuando hay un pensamiento nuclear o muy repetido que sostiene la emoción.",
      "Después de 3.1 y 3.2, con el paciente ya capaz de distinguir pensamiento de hecho.",
      "Cuando el MCEA marca pensamientos automáticos en nivel 2 o más.",
    ],
    cuandoNoUsarla: [
      "En crisis o con riesgo sin evaluación previa: no sustituye la evaluación del riesgo.",
      "En TOC, no usarla con las obsesiones: «examinar las pruebas» puede volverse un ritual de comprobación; preferir 2.3, 2.4 y EPR guiada.",
      "En depresión grave, empezar por activación conductual (ficha 2.2); con desesperanza intensa, abordar primero el riesgo.",
      "Si el pensamiento es en gran parte cierto (p. ej., una pérdida real): pasar a solución de problemas o aceptación (ficha 3.4).",
    ],
    presentar: [
      "Elegir con el paciente UN pensamiento concreto y pedir cuánto se lo cree (0–10) antes de examinarlo.",
      "Explicar la idea del juez que escucha a las dos partes, y que las pruebas son hechos, no sentimientos.",
      "Con preguntas socráticas, ayudarle a buscar los hechos a favor y en contra, y otras explicaciones (¿qué le diría a un amigo?, ¿qué es lo peor, lo mejor y lo más probable?).",
      "Pedir una frase equilibrada que el paciente pueda creer, y medir de nuevo cuánto se cree el pensamiento y la emoción.",
      "Dejar el resto de la ficha para completar en casa con otro pensamiento.",
    ],
    errores: [
      "Dirigir al paciente hacia la conclusión que el terapeuta prefiere; la curiosidad debe ser genuina.",
      "Aceptar «sentimientos» como pruebas.",
      "Sobrecargar con varios pensamientos a la vez.",
      "Insistir cuando el pensamiento no cambia: explorar qué más pesa en lugar de repetir el ejercicio.",
    ],
    revisar: [
      "Comparar cuánto cree el pensamiento antes y después, y la emoción.",
      "Revisar si las pruebas son hechos y si faltó mirar algo.",
      "Preguntar cómo le sonó la frase equilibrada y ajustarla hasta que sea creíble.",
      "Valorar si aparece una creencia más profunda detrás del pensamiento y planear cómo trabajarla.",
    ],
  },
  "3.4": {
    base: "Solución de problemas (D'Zurilla y Nezu), intolerancia a la incertidumbre en la preocupación (Dugas y Robichaud, 2007) y aceptación (Hayes).",
    objetivo:
      "Que el paciente separe una preocupación en lo que depende de él, lo que influye en parte y lo que no, dé un paso concreto sobre lo controlable y practique formas de soltar lo demás.",
    cuandoUsarla: [
      "Con preocupación excesiva, ansiedad generalizada, rumiación o estrés por situaciones inciertas.",
      "Después de 2.3, cuando el paciente ya distingue pensar para resolver de darle vueltas.",
      "Cuando la preocupación mezcla problemas reales resolubles con asuntos que no dependen de él.",
    ],
    cuandoNoUsarla: [
      "En crisis o con riesgo sin evaluación previa.",
      "En TOC, no usarla con las obsesiones: separar lo controlable puede alimentar la comprobación; preferir EPR guiada.",
      "En depresión grave, empezar por activación conductual (ficha 2.2) antes de pedir planes.",
      "Si el paciente puede entender «soltar» como resignarse o minimizar un problema real.",
    ],
    presentar: [
      "Explicar con un ejemplo cotidiano que la preocupación mezcla cosas muy distintas.",
      "Elegir una preocupación concreta y escribir juntos las tres listas: depende de mí, influyo en parte y no depende de mí.",
      "Elegir un paso pequeño, concreto y posible esta semana, con día y lugar.",
      "Explorar con el paciente formas de soltar lo que no controla y elegir una o dos para ensayar; aclarar que soltar no es rendirse.",
      "Acordar cómo revisar el paso la próxima sesión, sin reproches si no lo logró.",
    ],
    errores: [
      "Prometer certeza o tranquilizar con «no va a pasar nada».",
      "Convertir todo en un problema por resolver, incluso lo que no depende de la persona.",
      "Pedir demasiados pasos a la vez.",
      "Presentar soltar como una orden de «dejar de preocuparse»: aumenta la rumiación.",
    ],
    revisar: [
      "Leer qué puso en cada parte y si algo está mal ubicado.",
      "Preguntar si dio el paso y qué pasó; si no, qué lo impidió y ajustar.",
      "Revisar qué forma de soltar usó y qué efecto tuvo.",
      "Decidir si conviene un tiempo de preocupación, entrenamiento atencional o pasar a técnicas conductuales.",
    ],
  },
  "4.1": {
    base: "Activación conductual (Martell, Dimidjian y Herman-Dunn, 2010; Lewinsohn, 1974, programación de actividades agradables); actuar según el plan y no según el ánimo.",
    objetivo:
      "Que el paciente planee actividades pequeñas de gusto (G) y de logro (L) para la semana, las registre con el ánimo antes y después (0–10) y compruebe que actuar mueve el ánimo, sin esperar a tener ganas.",
    cuandoUsarla: [
      "Con ánimo bajo, desgano, aislamiento o abandono de actividades, después de la ficha 2.2.",
      "Cuando el paciente espera «tener ganas» para empezar y se queda en el círculo de hacer menos.",
      "Como tarea semanal de seguimiento, ajustando el plan en cada sesión.",
    ],
    cuandoNoUsarla: [
      "Con riesgo suicida o de daño activo: primero evaluación de riesgo y plan de seguridad; la ficha no los sustituye.",
      "En depresión grave, con muy poca energía: no pedir una semana completa; usar pasos muy pequeños (2 a 5 minutos), pocos días, y revisar el riesgo en cada sesión.",
      "Si las actividades se vuelven una lista de obligaciones que aumenta la culpa o el agotamiento (descanso y cuidado también cuentan).",
      "En agotamiento físico importante o duelo reciente, sin adaptar el ritmo.",
    ],
    presentar: [
      "Retomar el círculo del desánimo (2.2) y explicar la regla: actuar según el plan, no según el ánimo; las ganas suelen llegar después.",
      "Explicar la diferencia entre actividades de gusto (G) y de logro (L) y pedir ejemplos propios de cada tipo, pequeños y concretos.",
      "En sesión, elegir juntos una actividad por día (al menos tres días), mezclando G y L, y fijar día y hora; si dudó (más de 7 de dificultad), hacerla más pequeña.",
      "Explicar el registro: ánimo antes y después (0–10) y si la hizo; aclarar que no hacerla también es un dato y no un fracaso.",
      "Anticipar un obstáculo probable y acordar un plan B (versión de cinco minutos).",
    ],
    errores: [
      "Proponer actividades demasiado grandes o muchas a la vez.",
      "Convertir la ficha en una evaluación del paciente: el interés está en lo que descubre sobre su ánimo.",
      "Olvidar las actividades de logro y quedarse solo en las agradables (o al revés).",
      "Esperar subidas grandes del ánimo; el cambio inicial suele ser pequeño, de uno o dos puntos.",
      "Ajustar el plan según el ánimo de ese día y no según lo acordado.",
    ],
    revisar: [
      "Leer el plan día por día: qué hizo, qué no y qué se interpuso.",
      "Comparar el ánimo antes y después; destacar las actividades que más lo movieron.",
      "Preguntar qué aprendió sobre la relación entre actuar y sentirse.",
      "Ajustar el plan de la semana siguiente: repetir lo que sirvió, achicar lo que costó, agregar un paso o una actividad de acuerdo con sus valores (ficha 1.4).",
      "Volver a revisar riesgo y ánimo general si hay desesperanza.",
    ],
  },
  "4.2": {
    base: "Relajación muscular progresiva (Jacobson, 1938; Bernstein y Borkovec, 1973) y relajación aplicada (Öst, 1987); respiración lenta con exhalación más larga (unas 6 respiraciones por minuto).",
    objetivo:
      "Que el paciente aprenda dos herramientas de calma, la respiración lenta (inhalar unos 4 s, exhalar unos 6 s, 5 minutos) y la relajación muscular breve por grupos, las practique a diario y registre la tensión antes y después (0–10).",
    cuandoUsarla: [
      "Con tensión muscular, inquietud, dificultad para dormir o activación fisiológica alta (ansiedad generalizada, estrés, adaptación).",
      "Después de la psicoeducación de la ansiedad (2.1), cuando el paciente entiende la respuesta de alarma.",
      "Como recurso de calma entre sesiones, practicado en momentos tranquilos antes de usarlo en situaciones difíciles.",
    ],
    cuandoNoUsarla: [
      "En trastorno de pánico, no usarla como conducta de seguridad durante la exposición o ante los síntomas: sostiene la idea de que la ansiedad es peligrosa; usarla solo como práctica de calma general y acordar con el paciente cuándo.",
      "Si la respiración lenta le provoca mareo, hormigueo o más ansiedad: pausar, ajustar el ritmo (menos profunda) o usar solo la relajación muscular.",
      "Con dolor, lesiones musculares o condiciones médicas que limiten tensar músculos: omitir o adaptar los grupos afectados.",
      "Si el paciente la usa para evitar la ansiedad o para escapar de situaciones temidas.",
    ],
    presentar: [
      "Explicar para qué sirve y aclarar que es una herramienta de calma que se aprende con práctica, no un recurso para evitar la ansiedad.",
      "Practicar la respiración lenta en sesión: 4 s inhalando por la nariz, 6 s exhalando por la boca, durante unos 5 minutos, y preguntar cómo se siente.",
      "Practicar en sesión la relajación muscular por grupos (manos y brazos, cara y cuello, hombros y espalda, abdomen, piernas y pies): tensar unos 5 segundos y soltar 15 a 20.",
      "Acordar hora y lugar fijos para practicar, un ejercicio por día (o ambos), y explicar el registro de tensión antes y después (0–10).",
      "Dar el aviso de parar si se marea o siente más ansiedad, y avisarle al terapeuta en la próxima sesión.",
    ],
    errores: [
      "Esperar resultados inmediatos o presentarla como «cura» de la ansiedad.",
      "Prescribirla para usarla solo en el momento de la crisis, sin práctica previa.",
      "Pedir una respiración profunda y rápida: aumenta el mareo y puede parecerse a hiperventilar.",
      "Ignorar que la práctica se vuelve un escape o un ritual de seguridad.",
      "Tensar con dolor o durante más de unos segundos.",
    ],
    revisar: [
      "Leer el registro: días practicados, minutos, y diferencia de tensión antes y después.",
      "Preguntar qué ejercicio le sentó mejor y qué molestias tuvo (mareo, hormigueo, más ansiedad).",
      "Revisar si la usa como herramienta de calma o como forma de evitar; en pánico, confirmar que no la usa como conducta de seguridad.",
      "Ajustar tiempos y ritmo, y decidir si pasa a la versión corta (sin tensar) o a otra técnica (4.3 o 4.4).",
    ],
  },
  "4.3": {
    base: "Control de estímulos y posposición de la preocupación (Borkovec, Wilkinson, Folensbee y Lerman, 1983; Wells, 2009, terapia metacognitiva).",
    objetivo:
      "Que el paciente posponga la preocupación a un momento fijo del día (15 a 20 minutos, mismo lugar, lejos de la hora de dormir), anote las preocupaciones durante el día, las revise en ese momento y separe las que tienen solución de las que debe soltar.",
    cuandoUsarla: [
      "Con preocupación excesiva y difícil de controlar (ansiedad generalizada, rumiación, estrés).",
      "Después de 2.3 (por qué vuelven los pensamientos) o 3.4 (lo que sí controlo y lo que no).",
      "Cuando la preocupación ocupa gran parte del día y el paciente cree que no puede dejar de pensar.",
    ],
    cuandoNoUsarla: [
      "En TOC, no usarla con las obsesiones: posponer o revisar se vuelve un ritual; preferir exposición con prevención de respuesta guiada.",
      "En crisis o con riesgo sin evaluación previa.",
      "Si el paciente la entiende como «prohibido preocuparse» o intenta suprimir el pensamiento.",
      "En depresión grave, con rumiación de desesperanza: empezar por activación conductual (4.1) y revisar riesgo.",
    ],
    presentar: [
      "Explicar la lógica: la preocupación se vuelve un hábito que aparece a toda hora; se la cita a un momento fijo en vez de pelear con ella.",
      "Elegir con el paciente hora, lugar y duración (15 a 20 minutos; no justo antes de dormir ni en la cama).",
      "Enseñar a anotar la preocupación en pocas palabras durante el día y volver a la tarea, sin analizarla ni intentar no pensar.",
      "Practicar la revisión en sesión con una o dos preocupaciones: ¿tiene solución? Si sí, primer paso concreto; si no, dejarla ir con calma.",
      "Acordar qué hacer si la preocupación llega fuera de horario (anotarla y posponer) y la escala de cuánto le funcionó.",
    ],
    errores: [
      "Convertir el tiempo de preocupación en una sesión larga de rumiación; cerrar a la hora acordada.",
      "Tratar de suprimir el pensamiento en lugar de posponerlo.",
      "Programarlo antes de dormir o en la cama.",
      "Resolver todas las preocupaciones como problemas, incluso las que no dependen de la persona.",
      "Pedir que se anoten demasiado detalle: la nota es una palabra clave.",
    ],
    revisar: [
      "Revisar si cumplió con la hora y el lugar, y cuántas veces logró posponer.",
      "Leer la lista: cuáles tenían solución y qué paso dio; cuáles pudo soltar y cómo.",
      "Preguntar qué notó de las preocupaciones al llegar el momento (¿perdieron fuerza?).",
      "Ajustar hora, duración o forma de anotar, y decidir si se pasa a entrenamiento atencional o a 4.2.",
    ],
  },
  "4.4": {
    base: "Exposición gradual y aprendizaje inhibitorio (Craske, Treanor, Conway, Zbozinek y Vervliet, 2014); modelo de evitación y exposición (Barlow); exposición con prevención de respuesta en TOC (Foa, Yadin y Lichner, 2012).",
    objetivo:
      "Que el paciente y el terapeuta armen en sesión una escalera de 6 a 10 pasos, de lo menos a lo más difícil (malestar esperado 0–10), identifiquen las conductas de seguridad a dejar y registren cada práctica guiada (malestar al inicio, máximo y al final, y qué aprendió).",
    cuandoUsarla: [
      "Con miedo y evitación bien identificados en la formulación (pánico, agorafobia, ansiedad social, fobias específicas, ansiedad por la salud, TOC).",
      "Después de la formulación del caso y la psicoeducación de la evitación y la ansiedad (2.1 y 2.4).",
      "Cuando el paciente comprende la lógica y acepta practicar con acompañamiento.",
    ],
    cuandoNoUsarla: [
      "Sin una formulación del caso ni la psicoeducación previa (2.1 y 2.4).",
      "Con riesgo activo (suicida o de daño), crisis o consumo de sustancias que interfiera: primero seguridad y estabilización.",
      "En TOC, la escalera incluye siempre prevención de respuesta y la planifica y conduce el terapeuta; no entregarla como tarea autónoma.",
      "En trauma complejo o sin recursos de regulación, sin una planificación específica.",
      "Nunca enviarla ni usarla como instrucciones para que el paciente se exponga solo a lo más temido.",
    ],
    presentar: [
      "Explicar la lógica del aprendizaje inhibitorio: el objetivo es aprender que el malestar sube, llega a un máximo y baja, y que lo temido no ocurre o se puede manejar, no que el malestar desaparezca.",
      "Llenar juntos la primera sección en sesión: la meta final del paciente y 6 a 10 pasos ordenados de menor a mayor malestar esperado (0–10); empezar la práctica por un paso de 3 a 4.",
      "Identificar las conductas de seguridad y acordar cuáles dejar en cada escalón, sin imponer cambios que el paciente no pueda sostener.",
      "Practicar el primer escalón en sesión, con el paciente midiendo el malestar al inicio, el máximo y al final, y subrayando lo que aprendió.",
      "Acordar con precisión qué práctica guiada hará entre sesiones (si la hace), con qué frecuencia y cómo se registra; no avanzar de escalón sin revisar.",
    ],
    errores: [
      "Empezar por los pasos más difíciles o saltar escalones demasiado pronto.",
      "Permitir conductas de seguridad que anulan el aprendizaje, o cortar la práctica en el pico de malestar.",
      "Medir el éxito por la ausencia de ansiedad en vez de por lo aprendido.",
      "Dejar al paciente practicar sin indicación del terapeuta o sin acuerdo previo.",
      "En TOC, omitir la prevención de respuesta o dejar que el paciente la maneje solo.",
    ],
    revisar: [
      "Leer cada práctica: malestar al inicio, máximo y al final, y qué aprendió.",
      "Revisar si se usaron conductas de seguridad y qué efecto tuvieron.",
      "Comparar el malestar esperado con el real y qué predicciones se confirmaron o no.",
      "Decidir con el paciente el siguiente escalón (o repetir el actual), ajustando la escalera si hace falta.",
      "Volver a revisar riesgo y ánimo general, y planificar la fase de mantenimiento y prevención de recaídas.",
    ],
  },
  "4.5": {
    base: "Intenciones de implementación (Gollwitzer, 1999, «si… entonces…») y solución de problemas (D'Zurilla y Nezu).",
    objetivo:
      "Que el paciente convierta una meta en planes concretos «si pasa X (cuándo, dónde, señal), entonces haré Y», anticipe los obstáculos probables, tenga un plan B y mida su confianza (0–10).",
    cuandoUsarla: [
      "Cuando la persona tiene claro lo que quiere hacer pero no lo concreta (tareas de activación, hábitos, citas médicas, sueño).",
      "Para dar seguimiento a una meta de la ficha 1.1 o a una actividad de 4.1.",
      "En cualquier etapa del tratamiento cuando las intenciones no se traducen en acciones.",
    ],
    cuandoNoUsarla: [
      "Con riesgo suicida o de daño activo: primero evaluación y plan de seguridad.",
      "Si la meta es vaga o depende de otros: aclarar primero la meta (ficha 1.1).",
      "En TOC, no usarla para anticipar y planear contra las obsesiones: puede alimentar la comprobación.",
      "Si el plan se vuelve una exigencia rígida que aumenta la culpa cuando no se cumple.",
    ],
    presentar: [
      "Explicar la idea: decidir de antemano cuándo y dónde, así la señal dispara la acción sin depender de las ganas.",
      "Elegir una meta concreta y pequeña con el paciente y escribir juntos el primer plan «si… entonces…» (señal clara + acción pequeña).",
      "Pedir hasta dos planes más para la semana, con situación, momento y lugar reconocibles.",
      "Anticipar los obstáculos más probables y escribir un plan B para cada uno en la misma forma.",
      "Preguntar la confianza (0–10); si es 6 o menos, achicar el plan o aclarar la señal.",
    ],
    errores: [
      "Escribir un «si» vago («si tengo tiempo») o una acción grande.",
      "Hacer demasiados planes a la vez.",
      "Olvidar los obstáculos o el plan B.",
      "Tomar un plan no cumplido como falta de voluntad en lugar de revisar la señal y el obstáculo.",
    ],
    revisar: [
      "Leer cada plan y preguntar cuál se cumplió, cuál no y qué señal ayudó o no.",
      "Revisar qué obstáculos aparecieron y si el plan B sirvió.",
      "Ajustar el «si» o el «entonces» de lo que no se cumplió, achicando la acción.",
      "Comparar la confianza con lo logrado y elegir el próximo plan o la próxima meta.",
    ],
  },
};
