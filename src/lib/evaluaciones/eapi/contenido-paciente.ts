/**
 * EAPI: contenido redactado del informe para el paciente (v2). Solo panel del
 * psicólogo: el formulario público NO debe importar este archivo.
 *
 * Estructura de cada área y nivel: indicador → por qué pasa → oportunidad de
 * cambio → primeros pasos → lo que trabajaremos juntos. Especificación y
 * reglas de redacción: docs/instrumentos/EAPI_informe_paciente_v2_especificacion.md
 * (de usted, sin siglas ni tecnicismos, sin promesas, sin indicaciones médicas;
 * en el área de pensamientos o rituales repetitivos los pasos son solo de
 * observación). Los ítems 10 y 21 del DASS-21 y la pregunta de seguridad no
 * se citan nunca.
 */

export type AreaIdContenido = "gad" | "str" | "anx" | "dep" | "ptq" | "docs";

export type NivelContenido = {
  /** Lo que muestran sus respuestas. */
  indicador: string;
  /** Por qué pasa (mecanismo que lo mantiene, normalizando). */
  porQue: string;
  /** Su oportunidad de cambio. */
  oportunidad: string;
  /** Para empezar esta semana (2–3 pasos; menos y con más acompañamiento a mayor nivel). */
  pasos: string[];
  /** Lo que trabajaremos juntos. */
  juntos: string;
};

export type ContenidoArea = {
  /** Texto breve del nivel bajo (qué va bien y cómo mantenerlo). */
  bajo: string;
  /** Niveles leve o superiores, en el mismo orden que los niveles de nivelArea (índice i - 1). */
  niveles: NivelContenido[];
};

/** Par «indicador → oportunidad» de una frase cada uno. */
export type Par = { indicador: string; oportunidad: string };

export const CONTENIDO_AREAS: Record<AreaIdContenido, ContenidoArea> = {
  // Preocupación y ansiedad: leve, moderado, alto.
  gad: {
    bajo: "Casi no ha tenido preocupación ni nerviosismo en las últimas dos semanas. Conviene mantener lo que ya le ayuda: sus rutinas de descanso y sus ratos de pausa.",
    niveles: [
      {
        indicador: "Ha tenido algo de preocupación y nerviosismo en las últimas dos semanas, sin que llegue a dominarle el día.",
        porQue:
          "La mente está hecha para anticiparse a lo que podría salir mal. Cuando esa alerta se queda encendida, la preocupación se alimenta a sí misma: se piensa más, se descansa menos y todo pesa más. Es una reacción frecuente y se puede trabajar.",
        oportunidad:
          "Aprender a distinguir las preocupaciones que sí tienen solución de las que no se resuelven pensando suele quitarle peso a la mente y devolverle margen en el día.",
        pasos: [
          "Cuando llegue una preocupación, pregúntese: «¿puedo hacer algo hoy al respecto?». Si la respuesta es sí, anote un primer paso pequeño; si no, anótela como «hipotética» y siga con lo que estaba haciendo.",
          "Reserve 15 minutos al día, siempre a la misma hora, para pensar en sus preocupaciones. Si aparecen fuera de ese rato, anótelas y déjelas para después.",
          "Haga cada día unas diez respiraciones lentas, soltando el aire más despacio de lo que lo tomó.",
        ],
        juntos: "En sesión revisaremos cómo le fue con estos pasos y ajustaremos lo que haga falta.",
      },
      {
        indicador: "La preocupación y el nerviosismo han estado presentes con frecuencia y pueden estar pesando en su día a día.",
        porQue:
          "Cuando la preocupación se repite, la mente la toma como señal de que hay peligro y se mantiene en alerta. Esa alerta cansa, quita calma y hace que aparezcan más preocupaciones. No es debilidad ni falta de carácter: es un ciclo frecuente y se puede trabajar.",
        oportunidad:
          "Con práctica, es posible preocuparse menos por lo que no está en sus manos, tolerar mejor la incertidumbre y volver más seguido al presente. Eso tiende a traducirse en más calma y más energía.",
        pasos: [
          "Cuando llegue una preocupación, pregúntese si tiene solución hoy. Si la tiene, anote un primer paso pequeño; si es de las del «¿y si…?», anótela y déjela pasar.",
          "Fije un «tiempo de preocupación» de 15 minutos al día, siempre a la misma hora. Fuera de ese rato, anote lo que aparezca y posponga pensarlo.",
          "Practique cada día la relajación: tense y suelte los músculos de los pies a la cara, o haga unos minutos de respiración lenta.",
        ],
        juntos:
          "Lo trabajaremos juntos en sesión: aprenderá a ordenar las preocupaciones, a tolerar la incertidumbre y a relajar el cuerpo, con ejercicios que iremos practicando y revisando.",
      },
      {
        indicador: "La preocupación y el nerviosismo han estado presentes casi todos los días y con intensidad.",
        porQue:
          "Cuando la preocupación es tan constante, la mente y el cuerpo viven en alerta casi permanente y cuesta frenarla solo con voluntad. Es agotador, pero es un patrón conocido y, con acompañamiento, suele ser posible aliviarlo.",
        oportunidad:
          "Hay una salida: con acompañamiento, la preocupación tiende a perder fuerza y es posible recuperar poco a poco descanso, concentración y calma.",
        pasos: [
          "Antes de dormir, anote en un papel lo que le preocupa y ciérrelo con una frase: «Mañana lo reviso». Así la mente no tiene que sostenerlo toda la noche.",
          "Dedique unos minutos al día a respirar lento y, si puede, a caminar un rato.",
        ],
        juntos:
          "Es una prioridad: la trabajaremos juntos y de cerca, sesión a sesión, con ejercicios graduales y revisiones frecuentes. Si el cansancio o los síntomas físicos son intensos, coméntelo también con su médico.",
      },
    ],
  },

  // Estrés y ansiedad: leve, moderado, alto, muy alto.
  str: {
    bajo: "Su nivel de tensión de la última semana está dentro de lo esperado. Mantener pausas, descanso y movimiento regulares suele ayudar a conservarlo.",
    niveles: [
      {
        indicador: "Ha sentido algo de tensión o irritabilidad en la última semana.",
        porQue:
          "Cuando las exigencias del día superan los ratos de descanso, el cuerpo se queda tenso y la paciencia se acorta. Es una reacción frecuente y se puede trabajar.",
        oportunidad: "Con pausas, descanso y algunos límites, la tensión suele bajar y la paciencia tiende a volver.",
        pasos: [
          "Haga tres pausas cortas durante el día (de dos a cinco minutos) para soltar hombros y mandíbula y respirar lento.",
          "Elija una sola cosa que pueda dejar para mañana o con la que pueda pedir ayuda.",
          "Cuide la hora de dormir: acuéstese y levántese a horas parecidas.",
        ],
        juntos: "En sesión veremos qué le genera más tensión y cómo repartir mejor sus fuerzas.",
      },
      {
        indicador: "La tensión, la dificultad para relajarse o la irritabilidad han estado presentes de forma moderada.",
        porQue:
          "El estrés sostenido mantiene al cuerpo preparado para actuar aunque no haya nada que resolver en ese momento. Con el tiempo cuesta relajarse y todo irrita más. Es una respuesta del cuerpo, no un defecto suyo.",
        oportunidad:
          "Es posible aprender a soltar la tensión y a ordenar las exigencias: priorizar, poner límites y descansar con regularidad suele devolver margen.",
        pasos: [
          "Practique cada día la relajación muscular: tense cada grupo de músculos unos segundos, suelte y note la diferencia, de los pies a la cara.",
          "Camine o haga ejercicio suave al menos tres veces por semana.",
          "Anote a qué compromisos puede decir que no, o cuáles puede postergar, esta semana.",
        ],
        juntos: "Trabajaremos juntos la relajación, la forma de priorizar y la manera de poner límites sin culpa.",
      },
      {
        indicador: "Ha sentido mucha tensión y le ha costado relajarse.",
        porQue:
          "Cuando el cuerpo pasa mucho tiempo en alerta, ya no distingue cuándo toca descansar. Por eso la tensión se queda aunque usted quiera soltarla. No es falta de voluntad.",
        oportunidad:
          "Con acompañamiento, el cuerpo puede reaprender a bajar la guardia y usted puede ir recuperando descanso y paciencia.",
        pasos: [
          "Dedique cada día cinco minutos a respirar lento: cuatro segundos al tomar el aire y seis al soltarlo.",
          "Proteja su descanso: una hora fija para acostarse y un rato sin pantallas antes de dormir.",
        ],
        juntos:
          "Lo trabajaremos juntos con prioridad: relajación guiada, orden en las exigencias y cuidado del descanso, con revisión frecuente.",
      },
      {
        indicador: "La tensión ha sido muy intensa en la última semana.",
        porQue:
          "A este nivel suele haber muchas exigencias acumuladas y poco descanso, y el cuerpo ya no logra sostener el ritmo. Es agotador, pero es una respuesta frecuente y se puede trabajar.",
        oportunidad:
          "Aunque hoy sienta que todo es demasiado, la tensión puede bajar con apoyo y con cambios pequeños y sostenidos.",
        pasos: [
          "Elija un momento del día para parar cinco minutos y respirar lento, sin hacer nada más.",
          "Escoja una sola obligación que pueda postergar esta semana o con la que pueda pedir ayuda.",
        ],
        juntos:
          "Es una prioridad: lo trabajaremos juntos y de cerca desde la próxima sesión. Si el cansancio o los síntomas físicos son intensos, coméntelo también con su médico.",
      },
    ],
  },

  // Tensión y palpitaciones: leve, moderado, alto, muy alto.
  anx: {
    bajo: "Las reacciones físicas de la ansiedad (corazón acelerado, falta de aire, temblor) están dentro de lo esperado. Si algún día aparecen, recuerde que son una respuesta natural del cuerpo: molesta, pero pasa.",
    niveles: [
      {
        indicador: "Ha notado algunas reacciones del cuerpo propias de la ansiedad, como corazón acelerado, temblor o falta de aire, en un nivel leve.",
        porQue:
          "Cuando el cuerpo siente amenaza, se prepara para actuar: acelera el corazón, la respiración y los músculos. Es la respuesta de alarma. Molesta, pero no es peligrosa.",
        oportunidad: "Entender esa respuesta y no huir de las sensaciones suele quitarles fuerza y reducir el miedo a sentirlas.",
        pasos: [
          "Cuando note una sensación, dígase: «es mi cuerpo en alerta; molesta, pero no es peligrosa», y respire lento.",
          "Observe y anote cuándo aparecen las sensaciones: hora, lugar y qué estaba pasando.",
          "Fíjese en cuánto café, bebida energética u otro estimulante toma, y anote cómo se siente.",
        ],
        juntos: "En sesión revisaremos lo que anote y practicaremos formas de calmar el cuerpo.",
      },
      {
        indicador: "Las reacciones físicas de la ansiedad (corazón acelerado, falta de aire, temblor) se han presentado de forma moderada.",
        porQue:
          "Cuando una sensación asusta, uno se vigila, la nota más y se asusta más; además se tiende a evitar lo que la provoca. Así el miedo a las sensaciones se mantiene. Es un ciclo frecuente y se puede trabajar.",
        oportunidad:
          "Con práctica es posible reconocer la respuesta de alarma, calmarla con la respiración y volver, de a poco, a lo que ha estado evitando.",
        pasos: [
          "Practique la respiración lenta dos veces al día, aunque se sienta bien: cuatro segundos al tomar el aire y seis al soltarlo.",
          "Anote qué situaciones ha dejado de hacer por miedo a las sensaciones, sin intentar nada todavía con esa lista.",
          "Reduzca por unos días el café y otros estimulantes y observe si nota diferencia.",
        ],
        juntos:
          "Veremos juntos cómo volver, con calma y poco a poco, a lo que ha estado evitando. Si las sensaciones son intensas o nuevas, revíselas también con su médico.",
      },
      {
        indicador: "Las reacciones físicas de la ansiedad han sido frecuentes e intensas.",
        porQue:
          "Cuando las sensaciones son frecuentes, el cuerpo se vuelve más sensible y el miedo a que regresen las mantiene. Es muy desagradable, pero la respuesta de alarma no es peligrosa y se puede reentrenar.",
        oportunidad:
          "Con acompañamiento, las sensaciones tienden a asustar menos y es posible recuperar actividades que haya dejado de hacer.",
        pasos: [
          "Cuando llegue una sensación, no se resista: respire lento, suelte los hombros y recuérdese que es una alarma del cuerpo que pasa.",
          "Anote cuándo aparecen y cuánto duran.",
        ],
        juntos:
          "Lo trabajaremos juntos con prioridad: aprenderá a entender estas reacciones y, con guía, a acercarse de a poco a lo que teme. Conviene que también las comente con su médico.",
      },
      {
        indicador: "Las reacciones físicas de la ansiedad han sido muy intensas en la última semana.",
        porQue:
          "Es probable que, cuando aparecen, sienta mucho miedo, y eso las vuelve todavía más fuertes. Aun así, la respuesta de alarma es molesta pero no peligrosa, y se puede reentrenar con apoyo.",
        oportunidad:
          "Con acompañamiento cercano, el miedo a las sensaciones puede ir cediendo y usted puede ir recuperando tranquilidad y actividades.",
        pasos: [
          "Cuando llegue una sensación, haga respiraciones lentas y largas y dígase: «ya va a pasar».",
          "Anote cuándo aparecen, para revisarlo juntos.",
        ],
        juntos:
          "Es una prioridad para la próxima sesión: lo trabajaremos juntos y de cerca. Por la intensidad, comente también estas sensaciones con su médico.",
      },
    ],
  },

  // Tristeza y desgano: leve, moderado, alto, muy alto.
  dep: {
    bajo: "Su estado de ánimo de la última semana está dentro de lo esperado. Mantener las actividades que le dan gusto, el contacto con otras personas y una rutina de sueño suele ayudar a conservarlo.",
    niveles: [
      {
        indicador: "Ha tenido algunos momentos de desánimo o de menos interés en las cosas.",
        porQue:
          "Cuando el ánimo baja, se hace menos de lo que da gusto o sensación de logro, y eso mantiene el ánimo bajo. Es una reacción frecuente y se puede trabajar.",
        oportunidad: "Actuar según un plan, y no según el ánimo, suele ir devolviendo el gusto y la energía.",
        pasos: [
          "Elija una actividad pequeña que antes le diera gusto y póngale día y hora esta semana.",
          "Muévase unos 15 minutos, por ejemplo caminando, aunque no tenga ganas.",
          "Escriba o llame a una persona con la que se sienta bien.",
        ],
        juntos: "En sesión veremos qué actividades le dan más gusto o sensación de logro y cómo ponerlas en su semana.",
      },
      {
        indicador: "El desánimo o la falta de interés se han presentado de forma moderada.",
        porQue:
          "Con el desánimo cuesta empezar; al hacer menos, hay menos experiencias agradables o de logro y el ánimo baja más. Se forma un círculo que no tiene que ver con falta de voluntad.",
        oportunidad:
          "Romper ese círculo con pequeñas acciones planeadas suele ir mejorando el ánimo con el tiempo. No hace falta tener ganas para empezar.",
        pasos: [
          "Arme un plan de la semana con tres actividades pequeñas: una que dé gusto, una de logro (algo pendiente que cueste poco) y una con otra persona.",
          "Mantenga una hora fija para levantarse y otra para acostarse.",
          "Cuando se critique, pruebe hablarse como le hablaría a alguien querido.",
        ],
        juntos: "Lo trabajaremos juntos: armaremos un plan por semana y revisaremos qué efecto tiene en su ánimo.",
      },
      {
        indicador: "El desánimo ha sido frecuente e intenso.",
        porQue:
          "Cuando el desánimo pesa tanto, todo cuesta más y la mente tiende a ver el panorama más oscuro de lo que es. Dejar de hacer cosas profundiza el desgano. No es culpa suya y hay formas de salir de ahí.",
        oportunidad:
          "Con acompañamiento y pasos muy pequeños, el ánimo puede ir mejorando y usted puede ir retomando actividades y contacto con otras personas.",
        pasos: [
          "Escoja una sola actividad muy pequeña para hoy (bañarse, abrir la ventana, caminar hasta la esquina) y hágala aunque no tenga ganas.",
          "Mantenga una hora fija para levantarse.",
        ],
        juntos: "Es importante: lo trabajaremos juntos y de cerca, con un plan semanal de actividades que iremos ajustando en cada sesión.",
      },
      {
        indicador: "El desánimo ha sido muy intenso en la última semana.",
        porQue:
          "Cuando el desánimo llega a este punto, hasta lo más simple parece una montaña. Es muy duro, pero es un estado frecuente y se puede trabajar con apoyo.",
        oportunidad:
          "Con acompañamiento cercano, es posible volver poco a poco a actividades, contacto y descanso que ayuden a sentirse mejor.",
        pasos: [
          "Haga hoy una sola cosa pequeña (por ejemplo, salir unos minutos a la luz del día) y anótela.",
          "Hable hoy con una persona de confianza, aunque sea con un mensaje breve.",
        ],
        juntos:
          "Es una prioridad para la próxima sesión: lo trabajaremos juntos y de cerca. Si siente que no puede esperar hasta entonces, comuníquese antes con su psicólogo.",
      },
    ],
  },

  // Pensamientos que vuelven: elevado, alto.
  ptq: {
    bajo: "No muestra una tendencia marcada a darle vueltas a los problemas. Es una fortaleza: si alguna vez nota que los pensamientos se repiten, nombrarlos y volver a lo que está haciendo suele ayudar.",
    niveles: [
      {
        indicador: "Tiende a darle vueltas a los problemas más de lo habitual: los pensamientos se repiten y a veces cuesta desconectarse de ellos.",
        porQue:
          "Pensar una y otra vez da la impresión de estar resolviendo algo, pero casi siempre solo se da vueltas y se cansa. Es un hábito de la mente muy frecuente y se puede cambiar.",
        oportunidad:
          "Pasar del «¿por qué me pasa esto?» al «¿qué puedo hacer ahora?», y volver la atención a lo que está haciendo, suele quitarle fuerza al hábito.",
        pasos: [
          "Cuando note que está dando vueltas, nómbrelo («estoy dando vueltas») y devuelva la atención a lo que hacía.",
          "Cambie la pregunta: en lugar de «¿por qué?», escriba «¿qué puedo hacer hoy, aunque sea algo pequeño?».",
          "Reserve un rato corto del día para esos pensamientos y, fuera de ese rato, anótelos y posponga volver a ellos.",
        ],
        juntos: "En sesión practicaremos cómo soltar esas vueltas y qué hacer con ellas.",
      },
      {
        indicador: "Los pensamientos repetitivos sobre los problemas son muy frecuentes y absorben mucha de su atención.",
        porQue:
          "Cuando la mente se acostumbra a darle vueltas a lo mismo, el pensamiento se activa solo y se siente como si no se pudiera parar. Pelear con el pensamiento suele fortalecerlo. No es falta de fuerza de voluntad.",
        oportunidad:
          "Con práctica y acompañamiento, es posible cambiar la relación con esos pensamientos: notarlos sin engancharse y dirigir la atención a lo que sí puede hacer.",
        pasos: [
          "Cuando note que está dando vueltas, nómbrelo y devuelva la atención a lo que hace, sin discutir con el pensamiento.",
          "Anote el pensamiento y la hora a la que quiere volver a él. Al llegar esa hora, decida si hay algo concreto por hacer.",
        ],
        juntos:
          "Lo trabajaremos juntos y de cerca: practicaremos formas de notar esos pensamientos, soltarlos y dirigir la atención, y las revisaremos en cada sesión.",
      },
    ],
  },

  // Pensamientos o rituales repetitivos: moderado, alto. Pasos solo de observación.
  docs: {
    bajo: "Los pensamientos no deseados y las conductas repetitivas están en un nivel bajo. Si algún pensamiento incómodo llega, recuerde que es algo común y que un pensamiento no es un hecho.",
    niveles: [
      {
        indicador: "Hay pensamientos no deseados o conductas repetitivas en un nivel moderado, que ocupan algo de su tiempo.",
        porQue:
          "Un pensamiento no deseado le llega a casi todas las personas: no es un hecho ni un deseo. Se vuelve pesado cuando se intenta quitarlo, comprobar, evitar o hacer algo para sentirse seguro. Eso alivia un rato, pero hace que el pensamiento vuelva con más fuerza.",
        oportunidad:
          "Entender ese ciclo es el primer paso. Con acompañamiento, suele ser posible que esos pensamientos y conductas ocupen cada vez menos espacio en su día.",
        pasos: [
          "Anote, sin juzgar, cuándo llega un pensamiento no deseado: qué estaba pasando y qué sintió.",
          "Anote lo que hace después (comprobar, repetir, evitar, pedir seguridad) y cuánto tiempo le toma.",
          "Observe cómo cambia su malestar con el paso de los minutos, sin intentar cambiar nada todavía.",
        ],
        juntos: "Lo que sigue lo trabajaremos juntos en sesión, paso a paso y con guía. Por ahora, solo observe y anote.",
      },
      {
        indicador: "Los pensamientos no deseados y las conductas para neutralizarlos ocupan tiempo y causan malestar.",
        porQue:
          "Un pensamiento no deseado le llega a casi todas las personas: no es un hecho ni un deseo. Cuando se intenta quitarlo con rituales, comprobaciones o evitación, se alivia un rato, pero el ciclo se mantiene y ocupa cada vez más tiempo. Es agotador, pero es un patrón conocido que se trabaja con una guía adecuada.",
        oportunidad:
          "Con acompañamiento especializado, es posible aprender a convivir con esos pensamientos sin que manden sobre su día.",
        pasos: [
          "Anote, sin juzgar, cuándo llega un pensamiento no deseado y qué hace después.",
          "Anote cuánto tiempo le toma y cómo cambia su malestar con el paso de los minutos.",
        ],
        juntos:
          "Es un tema importante: lo trabajaremos juntos, paso a paso y con guía especializada. Mientras tanto, basta con observar y anotar; el resto lo haremos acompañados.",
      },
    ],
  },
};

/* ===================== Pares «indicador → oportunidad» por ítem ===================== */

/** GAD-7: un par por ítem, en el orden de GAD7 (7). */
export const PARES_GAD: Par[] = [
  {
    indicador: "Ha sentido nerviosismo o los nervios de punta",
    oportunidad: "El cuerpo y la mente pueden aprender a calmarse: la respiración lenta y la relajación, practicadas a diario y no solo cuando el nerviosismo llega, suelen bajar ese nivel de alerta.",
  },
  {
    indicador: "Le ha costado soltar las preocupaciones una vez que empiezan",
    oportunidad: "No todo depende de usted: aprender a distinguir lo que sí puede resolver de lo que no está en sus manos, y dejar pasar esto último, suele quitarle mucho peso a la mente.",
  },
  {
    indicador: "Se ha preocupado por muchas cosas distintas a la vez",
    oportunidad: "Separar las preocupaciones con solución, que se atienden con un plan, de las del «¿y si…?», que no se resuelven pensando, suele ordenar la mente y aclarar qué sí vale la pena atender.",
  },
  {
    indicador: "Le ha costado relajarse",
    oportunidad: "El cuerpo aprende a soltar la tensión con práctica: la relajación muscular y los ratos de pausa en el día suelen facilitar que el descanso llegue.",
  },
  {
    indicador: "Ha estado tan inquieto que le ha costado quedarse quieto",
    oportunidad: "Esa energía se puede canalizar: moverse a propósito (caminar, estirarse) y hacer pausas planeadas suele ayudar a que la inquietud no se acumule.",
  },
  {
    indicador: "Se ha molestado o irritado con facilidad",
    oportunidad: "Cuando la mente está en alerta, todo pesa más; bajar la tensión de fondo suele hacer que las molestias del día a día se sientan más manejables.",
  },
  {
    indicador: "Ha tenido miedo de que algo terrible fuera a pasar",
    oportunidad: "Ese miedo es una predicción, no un hecho: aprender a tolerar la incertidumbre y a volver al presente suele restarle fuerza.",
  },
];

/** DASS-21: los 19 ítems que se pueden citar, por número de ítem (10 y 21 no se citan). */
export const PARES_DASS: Record<number, Par> = {
  // Estrés
  1: {
    indicador: "Le ha costado calmarse",
    oportunidad: "Calmarse es una habilidad que se entrena: la respiración lenta y la relajación muscular, practicadas a diario, suelen acortar el tiempo que tarda en bajar la tensión.",
  },
  6: {
    indicador: "Ha reaccionado con más intensidad de la que quisiera",
    oportunidad: "Una pausa breve antes de responder suele dar espacio para elegir cómo reaccionar, sobre todo si el cuerpo ya viene cargado de tensión.",
  },
  8: {
    indicador: "Ha sentido muchos nervios",
    oportunidad: "Cuidar el sueño, el movimiento y los ratos de pausa suele bajar el nivel de nervios con que arranca el día.",
  },
  11: {
    indicador: "Ha notado agitación en el cuerpo",
    oportunidad: "Bajar el ritmo a propósito, con pausas y respiración lenta, suele ayudar a que el cuerpo salga de ese modo acelerado.",
  },
  12: {
    indicador: "Le ha costado relajarse",
    oportunidad: "Apartar un rato cada día para soltar el cuerpo, sin metas, suele hacer que relajarse resulte más fácil con el tiempo.",
  },
  14: {
    indicador: "Le han costado las interrupciones y los obstáculos",
    oportunidad: "Poner prioridades y límites, y dejar espacio en el día para lo imprevisto, suele reducir esa sensación de ir contra reloj.",
  },
  18: {
    indicador: "Ha tenido la paciencia corta",
    oportunidad: "Detectar a tiempo las señales de cansancio y tensión, y hacer una pausa, suele evitar que la irritabilidad llegue a su punto más alto.",
  },
  // Ansiedad
  2: {
    indicador: "Ha notado sequedad en la boca",
    oportunidad: "Es una señal más de que el cuerpo se pone en alerta; entender esa respuesta y calmarla con respiración lenta suele quitarle importancia a la sensación.",
  },
  4: {
    indicador: "Ha sentido dificultad para respirar",
    oportunidad: "Respirar lento y suave suele ayudar; si la sensación es intensa o nueva, conviene comentarla también con su médico.",
  },
  7: {
    indicador: "Ha notado temblor en las manos",
    oportunidad: "Es parte de la respuesta de alarma del cuerpo, molesta pero no peligrosa; entenderla suele reducir el miedo a ella y, con eso, la sensación.",
  },
  9: {
    indicador: "Le ha preocupado entrar en pánico o pasar vergüenza",
    oportunidad: "Acercarse poco a poco, y con guía, a lo que se teme suele quitarle poder al miedo, a diferencia de evitarlo.",
  },
  15: {
    indicador: "Ha sentido que estaba a punto de entrar en pánico",
    oportunidad: "Esa sensación, aunque asusta, pasa y no hace daño; aprender a reconocerla y a dejar que pase suele hacerla menos temida.",
  },
  19: {
    indicador: "Ha notado los latidos del corazón sin haber hecho ningún esfuerzo",
    oportunidad: "El corazón se acelera cuando el cuerpo se prepara para un peligro que no está; entenderlo y bajar el ritmo con respiración lenta suele ayudar. Si son intensos o nuevos, coméntelo también con su médico.",
  },
  20: {
    indicador: "Ha sentido miedo sin una razón clara",
    oportunidad: "El miedo puede aparecer aunque no haya peligro; aprender a no huir de él y a dejarlo pasar suele ir reduciéndolo.",
  },
  // Depresión (sin los ítems 10 y 21)
  3: {
    indicador: "Le ha costado sentir alegría o gusto por las cosas",
    oportunidad: "El gusto suele volver al actuar, no al esperar: retomar actividades pequeñas y agradables, aunque al principio no se disfruten del todo, suele ir devolviendo el ánimo.",
  },
  5: {
    indicador: "Le ha costado tomar la iniciativa para hacer cosas",
    oportunidad: "Dividir lo que hay que hacer en pasos muy pequeños y actuar según un plan, y no según las ganas, suele facilitar el arranque.",
  },
  13: {
    indicador: "Se ha sentido triste y decaído",
    oportunidad: "La tristeza suele aliviarse al sumar actividades que den gusto o sensación de logro, contacto con otras personas y un trato más amable consigo mismo.",
  },
  16: {
    indicador: "No ha podido entusiasmarse por nada",
    oportunidad: "Cuando el entusiasmo no aparece solo, ayuda programar actividades pequeñas y atractivas y observar qué efecto tienen, sin exigirse sentir mucho de entrada.",
  },
  17: {
    indicador: "Se ha juzgado con mucha dureza",
    oportunidad: "Hablarse con la misma amabilidad que usaría con alguien querido, y notar lo que sí hace y logra cada día, suele ir cambiando esa mirada.",
  },
};

/** PTQ: un par por subescala (de PTQ_SUB). */
export const PARES_PTQ: Record<"core" | "unprod" | "capture", Par> = {
  core: {
    indicador: "Los pensamientos vuelven una y otra vez y le cuesta desconectarse de ellos",
    oportunidad: "Notar que el pensamiento llegó y devolver la atención, con suavidad, a lo que está haciendo suele restarle fuerza; no hace falta discutir con él.",
  },
  unprod: {
    indicador: "Piensa mucho en los problemas sin que eso le ayude a resolverlos",
    oportunidad: "Pasar del «¿por qué me pasa esto?» al «¿qué puedo hacer ahora, aunque sea pequeño?» suele convertir las vueltas en pasos concretos.",
  },
  capture: {
    indicador: "Los pensamientos absorben su atención y le cuesta centrarse en otras cosas",
    oportunidad: "Entrenar la atención en lo que tiene delante, y reservar un momento del día para esos pensamientos, suele devolverle espacio para lo demás.",
  },
};

/** DOCS: un par por categoría (cont, harm, unacc, sym). */
export const PARES_DOCS: Record<"cont" | "harm" | "unacc" | "sym", Par> = {
  cont: {
    indicador: "Los pensamientos sobre gérmenes o contaminación y la limpieza le ocupan tiempo",
    oportunidad: "Entender cómo se sostiene el ciclo del miedo y la limpieza, y trabajarlo paso a paso y acompañado, suele ir reduciendo el espacio que ocupa en su día.",
  },
  harm: {
    indicador: "Las dudas sobre si algo malo pasó o pasará, y las comprobaciones, le ocupan tiempo",
    oportunidad: "Comprobar y pedir seguridad alivia un momento, pero mantiene la duda; con acompañamiento se puede ir aprendiendo a convivir con la duda sin tener que comprobar.",
  },
  unacc: {
    indicador: "Le llegan pensamientos no deseados que le incomodan mucho",
    oportunidad: "Un pensamiento no es un hecho ni un deseo; entenderlo, y trabajar paso a paso y acompañado, suele ir quitándole poder a esos pensamientos.",
  },
  sym: {
    indicador: "Le cuesta dejar las cosas sin que estén «bien», en orden o simétricas",
    oportunidad: "La sensación de que algo no está «bien» suele ir bajando cuando no se actúa sobre ella; se trabaja paso a paso y acompañado.",
  },
};

/** Indicadores y oportunidades para la tarjeta de «Lo que está a su favor» y el cierre. */
export const TEXTOS_GENERALES = {
  cierrePasos:
    "El cambio es gradual: lo que más ayuda es la práctica constante, aunque sea poca, y revisar juntos cómo le va en cada sesión.",
} as const;
