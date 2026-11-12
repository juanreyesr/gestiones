/**
 * MCEA: contenido redactado del informe para el paciente (v2). Solo panel del
 * psicólogo: el formulario público NO debe importar este archivo.
 *
 * Misma estructura que el EAPI v2 (indicador → por qué pasa → oportunidad de
 * cambio → primeros pasos → lo que trabajaremos juntos). Especificación:
 * docs/instrumentos/MCEA_informe_paciente_v2_especificacion.md. De usted, sin
 * siglas ni etiquetas clínicas, sin promesas, sin indicaciones médicas.
 * El ítem 9 del PHQ-9 y la pantalla de riesgo no se citan nunca.
 *
 * La preocupación y ansiedad (GAD-7) y los pensamientos que vuelven (PTQ)
 * reutilizan el contenido del EAPI (`eapi/contenido-paciente.ts`, áreas `gad` y
 * `ptq`: mismos ítems, mismo orden y misma escala de respuesta), para que ambos
 * informes digan lo mismo.
 */
import type { ContenidoArea, Par } from "../eapi/contenido-paciente";

/* ===================== Ánimo (PHQ-9) ===================== */

/** Niveles: leve (5–9), moderado (10–14) y alto (15 o más), en el orden de los niveles del instrumento (índice i - 1). */
export const CONTENIDO_ANIMO: ContenidoArea = {
  bajo: "Su ánimo se ve estable en estas dos semanas: no aparecen señales marcadas de decaimiento ni de pérdida de interés. Conviene cuidar lo que ya le ayuda: dormir a horas parecidas, moverse un poco cada día y mantener el contacto con personas que le hacen bien.",
  niveles: [
    {
      indicador: "Hay algunas señales de ánimo bajo en estas dos semanas, de intensidad leve: algunos días le han costado el interés, la energía o el sueño.",
      porQue:
        "Cuando el ánimo baja, apetece hacer menos; al hacer menos, hay menos cosas que den gusto o sensación de logro, y el ánimo baja un poco más. No es pereza ni falta de carácter: es un ciclo frecuente y se puede trabajar.",
      oportunidad:
        "Actuar según un plan pequeño y no según las ganas suele ir devolviendo energía e interés. Con práctica, el ánimo tiende a seguir a la acción y no al revés.",
      pasos: [
        "Elija cada día una actividad pequeña que antes le diera gusto o sensación de logro (diez minutos bastan) y póngale hora.",
        "Salga a caminar o muévase un rato cada día, aunque no tenga ganas de empezar.",
        "Escriba a una persona de confianza o propóngale un rato juntos esta semana.",
      ],
      juntos: "En sesión revisaremos cómo le fue con estas actividades y ajustaremos el plan a lo que le resulte posible.",
    },
    {
      indicador: "Su ánimo ha estado bajo de forma notoria y le está pesando en el día a día: cuestan más el interés, la energía y las ganas de hacer cosas.",
      porQue:
        "Con el ánimo bajo, lo que antes se hacía con facilidad cuesta; se deja de hacer, se pierde contacto con lo que daba gusto y con las personas, y el ánimo baja todavía más. Es una reacción frecuente, no una debilidad, y el círculo se puede romper empezando por la acción.",
      oportunidad:
        "Retomar poco a poco actividades pequeñas, planeadas de antemano, suele ir devolviendo gusto, energía y confianza. No hace falta esperar a tener ganas: suelen llegar después de empezar.",
      pasos: [
        "Anote tres actividades pequeñas (de diez a veinte minutos): una que le dé gusto, una que le dé sensación de logro y una con otra persona. Escoja una y póngale día y hora.",
        "Mantenga horas parecidas para acostarse y levantarse, aunque la noche haya sido mala.",
        "Camine o muévase unos minutos, sin exigirse rendimiento.",
      ],
      juntos:
        "Lo trabajaremos juntos en sesión: armaremos un plan de actividades a su medida, lo ajustaremos semana a semana y revisaremos qué le ayuda y qué no.",
    },
    {
      indicador: "Su ánimo ha estado muy bajo y le está afectando bastante: es probable que cuesten el interés, la energía y hasta las tareas más sencillas.",
      porQue:
        "Cuando el ánimo está tan bajo, hasta lo básico exige un esfuerzo enorme, y por eso se hace menos y se queda uno más tiempo a solas con los pensamientos. Es agotador, pero es un patrón conocido y, con acompañamiento, suele poder aliviarse. No se debe a falta de voluntad.",
      oportunidad:
        "Hay salida: con acompañamiento y empezando por acciones muy pequeñas, el ánimo tiende a ir mejorando poco a poco, y se puede recuperar energía e interés.",
      pasos: [
        "Elija una sola cosa muy pequeña para hoy (por ejemplo, asearse, abrir la ventana o salir cinco minutos) y hágala aunque no tenga ganas.",
        "Cuéntele a una persona de confianza cómo se ha sentido, o escríbale a su psicólogo antes de la sesión.",
      ],
      juntos:
        "Es una prioridad: lo trabajaremos juntos y de cerca, con pasos graduales y revisiones frecuentes. Si siente que no puede esperar hasta la próxima sesión, comuníquese antes con su psicólogo.",
    },
  ],
};

/** PHQ-9: un par por ítem 1 a 8 (índice = número de ítem - 1). El ítem 9 no tiene par: nunca se cita. */
export const PARES_PHQ: Par[] = [
  {
    indicador: "Las cosas que antes le daban gusto le han interesado menos",
    oportunidad: "El gusto suele volver con la acción: retomar a propósito una actividad pequeña que antes disfrutaba, aunque al principio no dé ganas, suele ir despertando el interés.",
  },
  {
    indicador: "Se ha sentido decaído, con el ánimo por el suelo",
    oportunidad: "El ánimo no tiene que estar arriba para empezar a moverse: actuar según un plan pequeño, y no según el ánimo del momento, suele ir levantándolo.",
  },
  {
    indicador: "Su sueño ha estado alterado: le ha costado dormir o ha dormido de más",
    oportunidad: "Horas parecidas para acostarse y levantarse, y una rutina tranquila antes de dormir, suelen ir ordenando el sueño; el sueño y el ánimo se influyen mutuamente.",
  },
  {
    indicador: "Se ha sentido cansado o con poca energía",
    oportunidad: "La energía suele volver con un poco de movimiento diario y actividades dosificadas, más que con descansar de más.",
  },
  {
    indicador: "Su apetito ha cambiado: ha comido muy poco o de más",
    oportunidad: "Comer a horas parecidas, aunque sean porciones pequeñas, y notar cuándo come por ánimo y no por hambre, suele ayudar a recuperar el ritmo.",
  },
  {
    indicador: "Se ha juzgado con dureza o ha sentido que quedó mal con usted o con su familia",
    oportunidad: "Hablarse como le hablaría a alguien querido, y fijarse también en lo que sí logra cada día, suele ir cambiando esa mirada.",
  },
  {
    indicador: "Le ha costado concentrarse en lo que hace",
    oportunidad: "Dividir las tareas en ratos cortos con pausas, y hacer una cosa a la vez, suele facilitar la concentración mientras el ánimo se recupera.",
  },
  {
    indicador: "Se ha sentido más lento, o más inquieto, de lo habitual",
    oportunidad: "Un poco de movimiento a propósito y pausas planeadas durante el día suelen ayudar a que el cuerpo recupere su ritmo.",
  },
];

/* ===================== Pensamientos negativos automáticos (PAN) ===================== */

/** Niveles: leve (promedio entre «rara vez» y «a veces»), moderado y alto (índice i - 1). */
export const CONTENIDO_PAN: ContenidoArea = {
  bajo: "Los pensamientos negativos sobre usted aparecen poco. Si alguno llega, recuerde que un pensamiento es una interpretación y no un hecho: notarlo y preguntarse qué pruebas hay suele quitarle fuerza.",
  niveles: [
    {
      indicador: "A veces le llegan pensamientos negativos sobre usted, su capacidad o su futuro.",
      porQue:
        "La mente interpreta lo que pasa y a veces lo hace con dureza. Esos pensamientos llegan solos y rápido, y se sienten como verdades aunque son interpretaciones. A todas las personas les pasa.",
      oportunidad: "Aprender a notarlos y a preguntarse qué pruebas hay a favor y en contra suele hacerlos menos creíbles y menos pesados.",
      pasos: [
        "Cuando note que se siente peor de golpe, pregúntese «¿qué se me acaba de pasar por la mente?» y anote la frase tal cual.",
        "Debajo, escriba qué pruebas hay a favor y cuáles en contra de ese pensamiento.",
        "Pregúntese qué le diría a alguien querido que le contara ese mismo pensamiento.",
      ],
      juntos: "En sesión revisaremos sus anotaciones y practicaremos cómo responder a esos pensamientos.",
    },
    {
      indicador: "Con frecuencia le llegan pensamientos negativos sobre usted, su capacidad o su futuro, y se sienten como verdades.",
      porQue:
        "Cuando el ánimo o la tensión están altos, la mente fija la atención en lo que sale mal y descarta lo demás. Esos pensamientos se activan solos y, al creerlos, uno se siente peor, lo que los vuelve a activar. Es un ciclo frecuente y se puede trabajar.",
      oportunidad:
        "Con registros breves y práctica, es posible tomar distancia de esos pensamientos y revisarlos con calma. Cuando se les pregunta por las pruebas, suelen perder fuerza.",
      pasos: [
        "Elija un momento del día en que se sintió peor y anote qué pasó, qué pensó y qué sintió.",
        "Escriba la pregunta «¿qué pruebas tengo a favor y en contra de este pensamiento?» y respóndala por escrito.",
        "Redacte otra forma de ver lo mismo, más justa y realista, como se la diría a alguien querido.",
      ],
      juntos:
        "Lo trabajaremos juntos: en sesión revisaremos sus registros, buscaremos las formas de pensar que se repiten y practicaremos respuestas más realistas.",
    },
    {
      indicador: "Los pensamientos negativos aparecen casi todo el tiempo y pesan mucho en cómo se siente.",
      porQue:
        "Cuando estos pensamientos aparecen tanto, cuesta distinguirlos de la realidad: se sienten como hechos y arrastran el ánimo y las ganas. Eso no significa que sean ciertos; son interpretaciones de una mente cansada, y con acompañamiento se pueden revisar.",
      oportunidad:
        "Hay salida: con acompañamiento, es posible aprender a notarlos, a revisarlos con calma y a darles menos poder sobre su ánimo y sus decisiones.",
      pasos: [
        "Cuando llegue uno de esos pensamientos, nómbrelo («estoy teniendo el pensamiento de que…») y anótelo.",
        "Escriba al lado una cosa que sí sea cierta y que lo matice, por pequeña que sea.",
      ],
      juntos: "Es una prioridad: lo trabajaremos juntos y de cerca, con registros breves y revisiones frecuentes en cada sesión.",
    },
  ],
};

/** PAN: un par por subescala (los nombres son los de INS.PAN.sub). */
export const PARES_PAN: Record<string, Par> = {
  "Sobre sí mismo(a)": {
    indicador: "Le llegan pensamientos duros sobre su valor como persona",
    oportunidad: "Un pensamiento sobre su valor es una interpretación, no un hecho: preguntarse qué pruebas hay en contra, y qué le diría a alguien querido, suele ir aflojándolo.",
  },
  "Sobre su capacidad": {
    indicador: "Le llegan pensamientos de que todo le sale mal o de que no podrá con las cosas",
    oportunidad: "Anotar también lo que sí sale bien o lo que sí logró, por pequeño que sea, suele corregir esa mirada que solo ve los fallos.",
  },
  "Sobre el futuro": {
    indicador: "Le llegan pensamientos de que las cosas no van a mejorar",
    oportunidad: "Ese pensamiento es una predicción, no un hecho: probar con pasos pequeños y mirar qué pasa suele dar datos más fiables que lo que se imagina de antemano.",
  },
  "Sobre los demás": {
    indicador: "Le llegan pensamientos de que está fallándole a quienes le importan o de que no le importa a nadie",
    oportunidad: "Antes de dar por cierto lo que otros piensan, preguntarles o mirar los hechos suele mostrar un panorama más amplio que el que ve la mente en ese momento.",
  },
};

/* ===================== Formas de pensar (distorsiones) ===================== */

/** Una por distorsión de INS.DC.names: explicación breve y pregunta o alternativa correctora. */
export const DISTORSIONES: Record<string, { explicacion: string; pregunta: string }> = {
  "Todo o nada": {
    explicacion: "ver las cosas en extremos, sin puntos intermedios: perfecto o fracaso.",
    pregunta: "¿Hay algún punto intermedio? ¿Qué parte sí salió bien?",
  },
  Catastrofismo: {
    explicacion: "saltar al peor desenlace como si fuera el más probable.",
    pregunta: "¿Qué es lo más probable que pase? Si pasara lo peor, ¿qué podría hacer?",
  },
  "Lectura de mente": {
    explicacion: "dar por hecho lo que otros piensan sin haberlo preguntado.",
    pregunta: "¿Qué pruebas tengo de lo que piensa? ¿Qué otra explicación podría haber? ¿Puedo preguntárselo?",
  },
  Sobregeneralización: {
    explicacion: "convertir un hecho en una regla de «siempre» o «nunca».",
    pregunta: "¿Pasa siempre o pasó esta vez? ¿Cuándo ha sido distinto?",
  },
  "Filtro negativo": {
    explicacion: "quedarse con el detalle negativo y no ver el resto.",
    pregunta: "¿Qué más pasó que sí fue bien? ¿Cómo lo vería alguien que mirara todo el cuadro?",
  },
  "Descontar lo positivo": {
    explicacion: "restarle valor a lo que sale bien, como si fuera suerte o no contara.",
    pregunta: "Si le hubiera salido bien a alguien querido, ¿diría que no cuenta? ¿Qué hice yo para lograrlo?",
  },
  Personalización: {
    explicacion: "cargar con la culpa de cosas que no dependían de usted.",
    pregunta: "¿Qué parte me tocaba a mí y qué parte dependía de otras personas o de las circunstancias?",
  },
  "Los «debería»": {
    explicacion: "medirse con reglas rígidas de cómo «debería» ser usted o los demás, lo que genera culpa o enojo.",
    pregunta: "¿Puedo cambiar el «debería» por «me gustaría» o «sería preferible»? ¿Cómo me sentiría?",
  },
  "Razonamiento emocional": {
    explicacion: "tomar lo que se siente como prueba de que es cierto.",
    pregunta: "Sentirlo así no lo vuelve un hecho: ¿qué pruebas hay aparte de cómo me siento?",
  },
  Etiquetas: {
    explicacion: "definirse por completo con una palabra dura a partir de un error.",
    pregunta: "¿Esa palabra describe a toda la persona o solo a lo que hice? ¿Cómo describiría lo que pasó sin etiquetarme?",
  },
};

/* ===================== Autosabotaje y pareja (por subescala) ===================== */

/** Una subescala: por qué se aprende, su salida y un paso. */
export type ContenidoSub = {
  /** Lo que muestran sus respuestas (indicador, concreto y sin dramatizar). */
  indicador: string;
  /** Por qué se aprende (casi siempre protege de algo). */
  porQue: string;
  /** Su salida. */
  salida: string;
  /** Un paso pequeño para esta semana. */
  paso: string;
};

/** Una por subescala de INS.AS.sub. */
export const CONTENIDO_AUTOSABOTAJE: Record<string, ContenidoSub> = {
  "Postergar y evitar": {
    indicador: "Deja para después, o evita, justo lo que más le importa",
    porQue:
      "Casi siempre es una forma de protegerse: si no empieza, no se enfrenta al miedo a que no salga bien, y siente alivio al instante. Pero el alivio dura poco y la tarea pesa cada vez más.",
    salida:
      "Dividir lo que le importa en pasos de cinco a diez minutos y empezar antes de sentirse con ganas suele romper el bloqueo: las ganas suelen llegar después de empezar.",
    paso: "Elija una tarea que viene dejando, haga solo los primeros diez minutos y decida de antemano cuándo: «si son las cinco de la tarde, entonces abro el trabajo y avanzo diez minutos».",
  },
  "Frenarse cuando va bien": {
    indicador: "Cuando algo empieza a ir bien, duda de si lo merece o espera que se arruine, y termina soltándolo",
    porQue:
      "Es una forma de protegerse: si espera lo peor, el golpe duele menos. A veces nace de experiencias en las que lo bueno no duró. Así se aprende a desconfiar de lo que sale bien.",
    salida:
      "Notar ese momento, tratarlo como una reacción conocida y no como una señal, y dar unos pasos más del plan suele permitir que lo que se logró se sostenga.",
    paso: "La próxima vez que algo vaya bien, anote qué hizo usted para lograrlo y dé un paso más del plan antes de decidir si lo suelta.",
  },
  Autocrítica: {
    indicador: "Se habla con mucha dureza cuando se equivoca o se compara",
    porQue:
      "Muchas personas aprendieron que ser duras consigo mismas ayudaría a mejorar o a evitar errores. Se siente como motivación, pero casi siempre desgasta el ánimo y la confianza, y hace más difícil volver a intentarlo.",
    salida:
      "Tratarse con la comprensión que ofrecería a alguien querido (autocompasión) no es ser blando: suele dar más fuerza para corregir y volver a intentarlo.",
    paso: "Cuando se equivoque, escriba o diga en voz alta lo que le diría a un amigo en su lugar.",
  },
  "Exigencia que paraliza": {
    indicador: "Se pide tanto que empezar o terminar algo se vuelve muy difícil",
    porQue:
      "El perfeccionismo promete evitar el fracaso, pero con estándares tan altos casi nada alcanza y empezar da miedo. Así se deja de lado lo que importa y después llega la autocrítica.",
    salida:
      "Estándares más flexibles: decidir de antemano qué es «suficientemente bueno» para cada tarea y permitirse una primera versión imperfecta suele destrabar.",
    paso: "Elija una tarea, escriba qué sería «suficientemente bueno» y termine una primera versión imperfecta en un tiempo limitado.",
  },
};

/** Una por subescala de INS.RP.sub. Los pasos son solo sobre lo que la persona puede observar o hacer por su parte. */
export const CONTENIDO_PAREJA: Record<string, ContenidoSub> = {
  "Miedo a perder a la pareja": {
    indicador: "El temor a que su pareja deje de quererle ocupa mucho espacio y le lleva a buscar confirmación",
    porQue:
      "Ese temor suele venir de experiencias en las que la cercanía se sintió incierta. Pedir confirmación calma un momento, pero el alivio dura poco y la duda vuelve, así que se vuelve a pedir.",
    salida:
      "Tolerar un rato la incertidumbre sin pedir confirmación, y decir lo que necesita de forma directa y tranquila, suele ir bajando el temor.",
    paso: "Cuando note el impulso de pedir confirmación, espere diez minutos, respire lento y anote qué sintió. Si todavía lo necesita, dígalo con suavidad: «me gustaría un rato juntos».",
  },
  Desconfianza: {
    indicador: "Le cuesta confiar, y la duda le empuja a vigilar o a leer gestos pequeños como señales de amenaza",
    porQue:
      "Cuando hay duda, la mente busca señales que la confirmen y cualquier gesto ambiguo parece una prueba. Vigilar alivia un instante, pero mantiene la desconfianza, porque nunca alcanza para quedarse tranquilo.",
    salida:
      "Distinguir lo que observa (un hecho) de lo que interpreta, y hablar de lo propio («me preocupó…») en lugar de vigilar, suele ir bajando la sospecha.",
    paso: "Cuando note una sospecha, anote por separado lo que observó y lo que supuso. Si decide hablarlo, empiece por lo que usted sintió.",
  },
  "Ponerse a la defensiva": {
    indicador: "Ante un señalamiento reacciona protegiéndose o atacando, y las discusiones suben de tono",
    porQue:
      "Cuando se siente criticado, el cuerpo se pone en alerta y se responde para protegerse: justificarse, contraatacar o cerrarse. Es humano, pero enciende más la conversación y el tema de fondo no se resuelve.",
    salida:
      "Hacer una pausa cuando sube la tensión, volver a hablar con calma y escuchar primero lo que la otra persona quiere decir suele evitar que el desacuerdo crezca.",
    paso: "Cuando note que sube la tensión, pida una pausa de veinte minutos para respirar y retome la conversación empezando por lo que usted siente.",
  },
  "Tomar distancia": {
    indicador: "Cuando la relación se vuelve más cercana, siente ganas de alejarse o se guarda lo que siente",
    porQue:
      "Alejarse o callar suele ser una forma de protegerse de que le lastimen. Alivia en el momento, pero la otra persona no sabe qué le pasa y la distancia crece, lo que a veces confirma el temor.",
    salida: "Compartir de a poco lo que siente, en frases cortas y sobre lo propio, suele ir haciendo más seguro el acercamiento, a su ritmo.",
    paso: "Esta semana, comparta con su pareja una cosa pequeña que sienta o piense, con una frase sobre usted: «hoy me sentí…».",
  },
};

/* ===================== Textos generales ===================== */

export const TEXTOS_MCEA = {
  /** Cierre de la tarjeta de pareja. */
  seguridadPareja: "Si en su relación hay miedo, amenazas o agresiones, coménteselo a su psicólogo: eso se atiende de otra manera.",
  /** Introducción de la tarjeta de formas de pensar. */
  formasMuestran: "Aparecieron formas de pensar que todas las personas usamos a veces, sobre todo cuando estamos cansadas o preocupadas. Reconocerlas es el primer paso para que pierdan fuerza.",
  formasPorQue:
    "La mente toma atajos para interpretar rápido lo que pasa. Cuando el ánimo está bajo o la tensión alta, esos atajos se inclinan hacia lo negativo y se sienten como hechos, aunque son interpretaciones.",
  formasOportunidad:
    "Cada forma de pensar tiene una pregunta que ayuda a revisarla. Notar el pensamiento, anotarlo y responderle con esa pregunta suele hacerlo menos creíble y más fácil de soltar.",
  formasPaso: "Cuando note que se siente peor, anote el pensamiento y responda por escrito una de las preguntas de arriba.",
  formasJuntos: "En sesión practicaremos con sus propios ejemplos, hasta que revisar un pensamiento le resulte natural.",
  /** Margen de cambio del mapa. */
  mapaMargen:
    "Entre lo que pasó y lo que sintió hubo un pensamiento. Ahí es donde se puede trabajar: no se puede cambiar lo que pasó, pero sí revisar cómo se interpretó y qué se hizo después.",
  mapaFormas: "En lo que pensó se reconocen estas formas de pensar: ",
  mapaFormasCierre: "Cada una tiene preguntas que ayudan a revisarla; las repasaremos juntos.",
  /** Encabezado del recurso real cuando el registro guiado lo muestra. */
  recursoReconocio: "Reconoció por su cuenta formas de pensar que le afectan.",
} as const;
