/**
 * EAPI versión JJ (Evaluación de estrés, ansiedad y pensamientos intrusivos).
 * Batería AEI: GAD-7 + DASS-21 + PTQ + ítem de seguridad (PHQ-9, ítem 9) y
 * módulo opcional DOCS. Contenido LITERAL de los instrumentos (Anexo A de la
 * especificación, tomado del prototipo): no modificar enunciados ni opciones.
 *
 * Sin calificación: este archivo lo usa el formulario del paciente.
 */

export const GAD_LABELS = ["Ningún día","Varios días","Más de la mitad de los días","Casi todos los días"];
export const GAD7 = [
  "Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta",
  "No ha sido capaz de parar o controlar su preocupación",
  "Se ha preocupado demasiado por motivos diferentes",
  "Ha tenido dificultad para relajarse",
  "Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)",
  "Se ha molestado o irritado fácilmente",
  "Ha tenido miedo de que algo terrible fuera a pasar"
];
export const GAD_FUNC = {t:"Si marcó algún problema, ¿qué tanto estos problemas le han hecho difícil su trabajo, hacerse cargo de su casa o relacionarse con otras personas?", labels:["Nada difícil","Algo difícil","Muy difícil","Extremadamente difícil"]};

export const DASS_LABELS = ["No me pasó / no lo sentí","Me pasó en alguna medida o en algún momento","Me pasó bastante o lo sentí muchas veces","Me pasó mucho o casi siempre"];
export const DASS21 = [
  "Me costó mucho calmarme.",
  "Me di cuenta que tenía la boca seca.",
  "No podía sentir ningún sentimiento positivo.",
  "Se me hizo difícil respirar.",
  "Se me hizo difícil tomar la iniciativa para hacer cosas.",
  "Reaccioné exageradamente en ciertas situaciones.",
  "Sentí que mis manos temblaban.",
  "Sentí que tenía muchos nervios.",
  "Estaba preocupado por situaciones en las cuales podía tener pánico o en las que podría hacer el ridículo.",
  "Sentí que no tenía nada por que vivir.",
  "Noté que me agitaba.",
  "Se me hizo difícil relajarme.",
  "Me sentí triste y deprimido.",
  "No toleré nada que no me permitiera continuar con lo que estaba haciendo.",
  "Sentí que estaba al punto de pánico.",
  "No me pude entusiasmar por nada.",
  "Sentí que valía muy poco como persona.",
  "Sentí que estaba muy irritable.",
  "Sentí los latidos de mi corazón a pesar de no haber hecho ningún esfuerzo físico.",
  "Tuve miedo sin razón.",
  "Sentí que la vida no tenía ningún sentido."
];

export const PTQ_LABELS = ["Nada","Raramente","A veces","Frecuentemente","Casi siempre"];
export const PTQ = [
  "Los pensamientos se mantienen en mi mente una y otra vez.",
  "Los pensamientos se cuelan en mi mente.",
  "No puedo dejar de preocuparme por ellos.",
  "Pienso sobre muchos problemas sin resolver ninguno.",
  "No puedo hacer nada más cuando estoy pensando en mis problemas.",
  "Mis pensamientos son repetitivos.",
  "Los pensamientos vienen a mi mente aunque yo no quiera.",
  "Me quedo atascado en ciertos problemas y no puedo seguir adelante.",
  "Sigo haciéndome las mismas preguntas sin encontrar una respuesta.",
  "Mis pensamientos me impiden centrarme en otras cosas.",
  "Sigo pensando sobre el mismo asunto todo el tiempo.",
  "Los pensamientos se meten en mi mente.",
  "Me siento impulsado a seguir preocupándome por la misma cuestión.",
  "Mis pensamientos no me son de mucha ayuda.",
  "Mis pensamientos absorben toda mi atención."
];

export const SAFETY = {t:"Pensamientos de que estaría mejor muerto(a) o de lastimarse de alguna manera", labels: GAD_LABELS};

// DOCS (módulo opcional). Texto de la adaptación española de Fullana, López-Solà y Pertusa. No modificar.
export type DocsPregunta = { t: string; l: readonly string[] };
export type DocsCategoria = { id: string; short: string; name: string; ex: string[]; lead: string; q: DocsPregunta[] };
export const DOCS_TIME = ["Ninguno","Menos de una hora al día","Entre 1 y 3 horas al día","Entre 3 y 8 horas al día","Ocho horas o más al día"];
export const DOCS_AVOID = ["En absoluto","Evitación leve","Evitación moderada","Evitación grave","Evitación extrema de casi todas las cosas"];
export const DOCS_DIST = ["Ningún malestar/ansiedad","Ansiedad/malestar leve","Ansiedad/malestar moderado","Ansiedad/malestar grave","Ansiedad/malestar extremo"];
export const DOCS_IMP = ["Mi vida no se ha visto afectada","Un poco afectada, pero en general funciono bien","Muchas facetas de mi vida están afectadas, pero a pesar de ello me manejo bien","Muchas facetas de mi vida están afectadas, y me cuesta funcionar","Mi vida está completamente afectada y no puedo funcionar en absoluto"];
export const DOCS_IMP3 = ["Ningún tipo de alteración","Un poco de alteración, pero en general funciono bien","Bastantes cosas/aspectos están alteradas/os, pero todavía me manejo bien","Mi vida está alterada en muchos aspectos y tengo dificultades para afrontarla","Mi vida está completamente alterada y no puedo funcionar en absoluto"];
export const DOCS_DIFF = ["En absoluto","Un poco difícil","Bastante difícil","Muy difícil","Extremadamente difícil"];
export const DOCS_DIFF3 = ["Nada difícil","Un poco difícil","Moderadamente difícil","Muy difícil","Extremadamente difícil"];
export const DOCS: DocsCategoria[] = [
  {id:"cont", short:"Contaminación", name:"Preocupaciones relacionadas con gérmenes y contaminación",
   ex:["Pensar o sentir que está contaminado/a porque estuvo en contacto con ciertos objetos o personas o estuvo cerca de ellos.","Sentir que está contaminado/a porque estuvo en ciertos lugares (por ejemplo, un cuarto de baño).","Pensar en gérmenes, enfermedades o en la posibilidad de propagar la contaminación.","Lavarse las manos, usar desinfectante de manos, ducharse, cambiarse de ropa o limpiar objetos debido a preocupaciones sobre la contaminación.","Seguir una rutina determinada (por ejemplo, en el cuarto de baño o al vestirse) debido a la contaminación.","Evitar ciertas personas, objetos o lugares debido a la contaminación."],
   lead:"Las siguientes preguntas se refieren a sus experiencias con pensamientos y conductas relacionados con la contaminación durante el último mes. Recuerde que sus experiencias pueden ser diferentes de los ejemplos mencionados anteriormente.",
   q:[
    {t:"Aproximadamente, ¿cuánto tiempo le han ocupado al día los pensamientos de contaminación y las conductas de limpieza debidas a la contaminación?", l:DOCS_TIME},
    {t:"¿Ha evitado situaciones para no tener pensamientos de contaminación o para no tener que pasar tiempo lavándose, limpiando o duchándose?", l:DOCS_AVOID},
    {t:"Si ha tenido pensamientos de contaminación pero no ha podido limpiar, lavarse o ducharse (ni eliminar la contaminación de otra forma), ¿cuánto malestar o ansiedad ha tenido?", l:DOCS_DIST},
    {t:"¿En qué medida se ha visto afectada su vida diaria (trabajo, escuela, cuidado personal, vida social) por los pensamientos de contaminación y por limpiar, lavarse o ducharse de forma excesiva o realizar conductas de evitación?", l:DOCS_IMP},
    {t:"Cuando intenta ignorar los pensamientos de contaminación y abstenerse de conductas como limpiar, lavarse, ducharse u otros rituales para descontaminarse, ¿le resulta difícil?", l:DOCS_DIFF}
   ]},
  {id:"harm", short:"Daño / comprobación", name:"Preocupaciones relacionadas con causar daño, provocar lesiones o traer mala suerte",
   ex:["Dudar de si ha cometido un error que podría hacer que sucediera algo horrible o perjudicial.","Pensar que pueda haber ocurrido un accidente, desastre o daño físico terrible u otra desgracia y que usted no fue lo suficientemente precavido para evitarlo.","Pensar que usted podía evitar algún daño o desgracia haciendo las cosas de una determinada manera, contando hasta cierto número o evitando determinados números o palabras “negativos”.","Pensar que podía perder algo importante que es poco probable que pierda (por ejemplo, la cartera, papeles, documentos personales…).","Comprobar cosas como cerraduras, enchufes, la cartera, etc. más de lo necesario.","Comprobar repetidamente o preguntar a otras personas para asegurarse de que no ha pasado (o no va a pasar) algo malo.","Repasar mentalmente cosas del pasado para asegurarse de que no hizo nada malo.","Necesitar hacer las cosas en una secuencia determinada para evitar que ocurran cosas dañinas o desastres.","Necesitar contar hasta cierto número o evitar ciertos números negativos por miedo a que ocurra algo malo."],
   lead:"Las siguientes preguntas se refieren a sus experiencias con los pensamientos y conductas relacionados con causar daño o desastres durante el último mes. Recuerde que sus experiencias pueden ser ligeramente diferentes de los ejemplos mencionados anteriormente.",
   q:[
    {t:"Aproximadamente, ¿cuánto tiempo le han ocupado al día los pensamientos sobre posibles daños o desastres y las comprobaciones o esfuerzos para que le tranquilicen asegurándole que esas cosas no pasan (o no han pasado)?", l:DOCS_TIME},
    {t:"¿Ha evitado situaciones para no tener que comprobar si había algún peligro o para no tener que preocuparse por la posibilidad de haber causado algún daño o provocado algún desastre?", l:DOCS_AVOID},
    {t:"Cuando ha tenido pensamientos sobre la posibilidad de provocar algún daño o desastre, o en el caso de no poder comprobar o pedir que le tranquilizaran, ¿cuánto malestar o ansiedad ha sentido?", l:DOCS_DIST},
    {t:"¿En qué medida su vida diaria (trabajo, colegio, cuidado personal, vida social) se ha visto afectada por los pensamientos sobre causar algún daño o provocar desastres, o por comprobar demasiado o pedir que le tranquilicen en exceso?", l:DOCS_IMP},
    {t:"Cuando intenta ignorar los pensamientos sobre daños o desastres y abstenerse de comprobar o de solicitar a otros que le tranquilicen, ¿le resulta difícil?", l:DOCS_DIFF}
   ]},
  {id:"unacc", short:"Pensamientos inaceptables", name:"Pensamientos inaceptables/prohibidos",
   ex:["Tener pensamientos desagradables sobre sexo, cosas inmorales o violencia que le vienen a la mente en contra de su voluntad.","Pensar que podría hacer algo horrible, indecente o que le avergüence que en realidad usted no quiere hacer.","Repetir una acción o hacer las cosas en una secuencia determinada debido a un mal pensamiento.","Realizar mentalmente alguna acción o rezar para deshacerse de un pensamiento no deseado o desagradable.","Evitar ciertas personas, lugares o situaciones que le provocan pensamientos no deseados o desagradables."],
   lead:"Las siguientes preguntas se refieren a sus experiencias con pensamientos no deseados que vienen a su mente en contra de su voluntad y a comportamientos dirigidos a afrontar este tipo de pensamientos durante el último mes. Recuerde que sus experiencias pueden ser ligeramente diferentes de los ejemplos mencionados anteriormente.",
   q:[
    {t:"Aproximadamente, ¿cuánto tiempo le han ocupado al día los pensamientos desagradables no deseados y las acciones (físicas o mentales) que realiza debido a estos pensamientos?", l:DOCS_TIME},
    {t:"¿Ha evitado situaciones, lugares, objetos u otras cosas (por ejemplo, números o personas) que le desencadenan pensamientos no deseados o desagradables?", l:DOCS_AVOID},
    {t:"Cuando le han venido a la mente pensamientos no deseados o desagradables en contra de su voluntad, ¿ha sentido ansiedad o malestar?", l:DOCS_DIST},
    {t:"¿En qué medida se ha visto afectada su vida diaria (trabajo, escuela, cuidado personal, vida social) a causa de estos pensamientos no deseados o desagradables o por las acciones (físicas y/o mentales) para evitar o afrontar estos pensamientos?", l:DOCS_IMP3},
    {t:"Cuando intenta ignorar los pensamientos no deseados o desagradables o dejar de realizar acciones (físicas o mentales) para afrontar estos pensamientos, ¿le resulta difícil?", l:DOCS_DIFF3}
   ]},
  {id:"sym", short:"Simetría / orden", name:"Preocupaciones sobre simetría y la necesidad de que las cosas estén “bien” o “como tienen que estar”",
   ex:["Necesitar que las cosas sean/estén simétricas, uniformes, equilibradas o exactas.","Sentir que algo no está “del todo bien”.","Repetir algo del día a día hasta que tiene la sensación de que lo ha hecho “bien” o \"equilibradamente\".","Contar cosas absurdas (por ejemplo, azulejos del techo, el número de palabras en una frase, etc.).","Poner las cosas en un orden determinado cuando no es necesario.","Tener que repetir algo de una manera determinada hasta que está “bien”."],
   lead:"Las siguientes preguntas se refieren a sus sensaciones de que algo no está “bien” y sus conductas dirigidas a conseguir una sensación de orden, simetría o equilibrio durante el último mes. Recuerde que sus experiencias pueden ser ligeramente diferentes a los ejemplos mencionados anteriormente.",
   q:[
    {t:"Aproximadamente, ¿cuánto tiempo le han ocupado al día los pensamientos no deseados sobre simetría, orden o equilibrio o las conductas dirigidas a conseguir simetría, orden o equilibrio?", l:DOCS_TIME},
    {t:"¿Ha evitado situaciones, lugares u objetos asociados con sensaciones de que algo no estaba simétrico o no estaba \"del todo bien”?", l:DOCS_AVOID},
    {t:"Cuando ha tenido la sensación de que algo no estaba “del todo bien”, ¿ha sentido malestar o ansiedad?", l:DOCS_DIST},
    {t:"¿En qué medida se ha visto afectada su vida diaria (trabajo, escuela, cuidado personal, vida social) por la sensación de que las cosas no estaban “del todo bien”, y por los esfuerzos para conseguir que las cosas estuvieran en orden o como usted sentía que tenían que estar?", l:DOCS_IMP},
    {t:"Cuando intenta ignorar los pensamientos sobre la falta de simetría y orden, y no ceder al impulso de ordenar las cosas o de repetir ciertas conductas, ¿le resulta difícil?", l:DOCS_DIFF3}
   ]}
];


/** Textos del formulario del paciente. */
export const EAPI_TITULO_PACIENTE = "EAPI versión JJ";
export const EAPI_NOMBRE_PROFESIONAL = "Evaluación de estrés, ansiedad y pensamientos intrusivos";
export const EAPI_INTRO =
  "Este cuestionario reúne varias escalas breves que se usan en todo el mundo para conocer cómo ha estado una persona en cuanto a nerviosismo, tensión, ánimo y pensamientos que se repiten. No hay respuestas correctas ni incorrectas y no se trata de un examen. Fíjese en que cada bloque pregunta por un período de tiempo distinto (se indica al inicio de cada uno). Responda con la primera opción que le parezca más cercana a su experiencia; su psicólogo conversará los resultados con usted en la sesión.";
export const EAPI_BLOQUES = {
  gad: { titulo: "Bloque 1 · Durante las últimas 2 semanas", intro: "¿Qué tan seguido ha tenido molestias debido a los siguientes problemas?" },
  dass: { titulo: "Bloque 2 · Durante la última semana", intro: "Indique en qué medida cada frase describe lo que le pasó o sintió durante la última semana." },
  ptq: {
    titulo: "Bloque 3 · Cómo suele pensar en general",
    intro:
      "En este bloque se le pide que describa cómo suele pensar sobre los problemas y experiencias negativas. Lea las siguientes afirmaciones e indique en qué medida se aplican a usted cuando piensa acerca de experiencias negativas o problemas.",
  },
  docs: {
    titulo: "Bloque 4 · Durante el último mes",
    intro:
      "En este bloque se le pregunta sobre 4 tipos de preocupaciones diferentes que puede que usted esté (o no esté) experimentando. Para cada tipo de preocupación hay una descripción del tipo de pensamientos (a veces llamados obsesiones) y conductas (a veces llamadas rituales o compulsiones) que son típicas de ese tipo de preocupación en particular, seguida de 5 preguntas sobre sus experiencias en relación con estos pensamientos y conductas. Lea cada descripción detenidamente y responda a las preguntas basándose en las experiencias que usted ha tenido durante el último mes.",
  },
  safety: { titulo: "Una pregunta más · Últimas 2 semanas", intro: "Durante las últimas 2 semanas, ¿qué tan seguido le ha molestado el siguiente problema?" },
} as const;
export const EAPI_ABIERTA = "¿Hay algo que esté pasando en su vida en este momento y que crea que su psicólogo debería saber?";
export const EAPI_GRACIAS =
  "Sus respuestas quedaron registradas. Su psicólogo las revisará y las conversará con usted en la próxima sesión.";
export const EAPI_CRISIS =
  "En una de las preguntas indicó que ha tenido pensamientos de que estaría mejor muerto(a) o de hacerse daño. Es más frecuente de lo que parece y hablarlo ayuda. Si en algún momento siente que no puede mantenerse a salvo, no espere a la próxima sesión:";
/**
 * Líneas de ayuda que ve el paciente si marca ≥ 1 en la pregunta de seguridad
 * (y en el informe al paciente, si el psicólogo lo deja marcado).
 * Tomadas de la especificación: el psicólogo debe verificarlas antes de usar.
 */
export const EAPI_LINEAS_AYUDA = [
  "Escríbale o llame a su psicólogo al número por el que le envió este cuestionario.",
  "Guatemala · Línea 1582 \"Te escucha\" (atención psicológica gratuita, 24 horas, también por WhatsApp)",
  "Guatemala · Emergencias: 110 (PNC), 122 / 123 (Bomberos)",
  "Si está en otro país, llame al número de emergencias local o acuda a la emergencia del hospital más cercano.",
];
