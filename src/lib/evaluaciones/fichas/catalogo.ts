/**
 * Fichas terapéuticas JJR (TCC): catálogo declarativo y parte PARA EL PACIENTE
 * de cada ficha (lote 1: etapas 1 «Evaluación y formulación» y 2 «Psicoeducación»).
 * Especificación clínica: docs/instrumentos/Fichas_terapeuticas_JJR_especificacion.md
 *
 * Este archivo lo importa el formulario público (/evaluacion/<token>) y el
 * servidor: NO incluir aquí la parte «Para el terapeuta» (vive en otro archivo, solo
 * para el panel). Contenido original, redactado de usted, en español de Guatemala.
 * Sin imports en tiempo de ejecución.
 */

export const FICHA_IDS = ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4"] as const;
export type FichaId = (typeof FICHA_IDS)[number];

export const TIPOS_CAMPO = ["texto", "parrafo", "escala", "lista", "casillas", "tabla"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

type CampoBase = {
  /** Único dentro de la ficha. */
  id: string;
  etiqueta: string;
  /** Indicación breve bajo la pregunta. */
  ayuda?: string;
  /** Texto de muestra (se ve en gris). */
  ejemplo?: string;
  /** Ningún campo es obligatorio salvo los marcados (se puede enviar con campos vacíos, avisando antes). */
  requerido?: boolean;
};

export type CampoTexto = CampoBase & { tipo: "texto" };
export type CampoParrafo = CampoBase & { tipo: "parrafo" };
/** Escala entera de 0 a 10 con etiquetas de los extremos. */
export type CampoEscala = CampoBase & { tipo: "escala"; extremos: readonly [string, string] };
/** Varias entradas de texto (una por fila). */
export type CampoLista = CampoBase & { tipo: "lista"; minFilas: number; maxFilas: number };
/** Opciones múltiples; «Otra» abre un texto libre. */
export type CampoCasillas = CampoBase & { tipo: "casillas"; opciones: readonly string[]; conOtra: boolean };
export type ColumnaTabla = { id: string; titulo: string; ayuda?: string; ejemplo?: string };
/**
 * Filas × columnas de texto. `filas` son las que se ven al abrir; `maxFilas` las que se pueden
 * tener en total. Con `filasFijas` cada fila lleva su rótulo y no se agregan ni quitan.
 */
export type CampoTabla = CampoBase & { tipo: "tabla"; columnas: readonly ColumnaTabla[]; filas: number; maxFilas: number; filasFijas?: readonly string[] };

export type Campo = CampoTexto | CampoParrafo | CampoEscala | CampoLista | CampoCasillas | CampoTabla;

export type Seccion = { id: string; titulo: string; intro?: string; campos: readonly Campo[] };

export type Ficha = {
  id: FichaId;
  /** Etapa del tratamiento (1 a 5; este lote solo tiene la 1 y la 2). */
  etapa: number;
  titulo: string;
  /** Para qué sirve (una línea; se muestra al asignar). */
  paraQue: string;
  /** Tiempo aproximado para responderla. */
  tiempo: string;
  /** 2 a 4 párrafos cortos, de usted, con un ejemplo cotidiano. */
  explicacion: readonly string[];
  secciones: readonly Seccion[];
  /** «Qué haremos con esto en la próxima sesión». */
  cierre: { titulo: string; texto: string; campos: readonly Campo[] };
};

export const ETAPAS_FICHAS: Record<number, string> = {
  1: "Evaluación y formulación",
  2: "Psicoeducación",
  3: "Técnicas cognitivas",
  4: "Técnicas conductuales",
  5: "Prevención de recaídas",
};

export const FICHA_TITULO_PUBLICO = "Ficha de trabajo · JJR";
export const FICHA_INTRO_GENERAL =
  "Responda con calma y con sus propias palabras. No hay respuestas correctas ni incorrectas, y puede dejar en blanco lo que no quiera contestar: lo conversaremos en la sesión. Su avance se guarda solo.";
export const FICHA_GRACIAS = "Su psicólogo la revisará antes de la próxima sesión. Gracias por dedicarle este tiempo.";
export const FICHA_AVISO_AYUDA =
  "Si en algún momento siente que podría hacerse daño o necesita ayuda urgente, no espere a la próxima sesión: avísele a su psicólogo o a una persona de confianza, o use alguno de estos contactos.";

const CIERRE_TITULO = "Qué haremos con esto en la próxima sesión";

/** Campo común de cierre de todas las fichas. */
const paraLaSesion: Campo = {
  id: "para_sesion",
  tipo: "parrafo",
  etiqueta: "Lo que me gustaría conversar o preguntar en la próxima sesión",
  ayuda: "Puede ser una duda, algo que le costó escribir o algo que descubrió al hacer esta ficha.",
  ejemplo: "Me di cuenta de que siempre pienso lo mismo en las noches. Quisiera entender por qué.",
};

export const FICHAS: readonly Ficha[] = [
  /* ============================ 1.1 ============================ */
  {
    id: "1.1",
    etapa: 1,
    titulo: "Mi motivo de consulta y mis metas",
    paraQue: "Definir el problema en palabras propias y metas concretas, medibles y alcanzables, con un 0–10 de cuánto le afecta hoy.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Esta ficha le ayuda a poner en palabras qué lo trajo a consulta y qué le gustaría que fuera distinto. No hay respuestas correctas ni incorrectas: lo que usted escriba, con sus palabras, es lo que vamos a tomar en cuenta.",
      "Muchas veces, al empezar, lo que sentimos es una mezcla difícil de explicar: «ando mal», «ya no aguanto», «todo me enoja». Al conversarlo se va aclarando. Por ejemplo, alguien dice «ando mal del ánimo» y, al ponerlo por escrito, descubre que lo que más le pesa es despertarse a las cuatro de la mañana pensando en el trabajo y ya no tener ganas de ir a comer con su familia los domingos. Eso, tan concreto, ya se puede trabajar.",
      "Una meta útil es concreta (se puede ver o contar), se puede medir (sabemos cuándo avanzó), es posible lograrla en unas semanas o meses y le importa a usted. En lugar de «quiero estar mejor», por ejemplo: «quiero poder viajar en camioneta sin bajarme antes de mi parada, al menos tres días a la semana».",
    ],
    secciones: [
      {
        id: "motivo",
        titulo: "Lo que me trajo a consulta",
        campos: [
          {
            id: "motivo",
            tipo: "parrafo",
            etiqueta: "¿Qué le hizo buscar ayuda en este momento?",
            ayuda: "Escriba como si se lo contara a una persona de confianza. Puede ir en desorden.",
            ejemplo: "Desde hace unos meses duermo mal, estoy de mal humor con mi familia y ya no tengo ganas de salir.",
          },
          { id: "desde_cuando", tipo: "texto", etiqueta: "¿Desde cuándo ocurre, más o menos?", ejemplo: "Hace como ocho meses, poco después de cambiar de trabajo." },
          {
            id: "areas",
            tipo: "casillas",
            etiqueta: "¿En qué áreas de su vida lo nota?",
            ayuda: "Marque todas las que correspondan.",
            opciones: ["Familia", "Pareja", "Trabajo o estudio", "Salud y sueño", "Amistades", "Tiempo libre", "Dinero", "La forma en que me veo a mí mismo"],
            conOtra: true,
          },
        ],
      },
      {
        id: "hoy",
        titulo: "Cuánto me afecta hoy",
        campos: [
          { id: "afecta_hoy", tipo: "escala", etiqueta: "Hoy, ¿cuánto le afecta este problema en su vida diaria?", extremos: ["0 = nada", "10 = muchísimo"] },
          {
            id: "ya_intente",
            tipo: "parrafo",
            etiqueta: "¿Qué ha intentado hasta ahora para sentirse mejor? ¿Qué le ha ayudado, aunque sea un poco?",
            ejemplo: "Salir a caminar a veces me ayuda. Hablar con mi hermana también. Tomar café para el sueño no me ha servido.",
          },
        ],
      },
      {
        id: "metas",
        titulo: "Mis metas",
        intro: "Piense en lo que le gustaría que fuera distinto. Intente que cada meta se pueda ver o contar.",
        campos: [
          {
            id: "dia_distinto",
            tipo: "parrafo",
            etiqueta: "Si dentro de unos meses las cosas hubieran mejorado, ¿qué estaría haciendo distinto en un día cualquiera?",
            ejemplo: "Me levantaría con más calma, desayunaría con mis hijos y saldría a caminar por la tarde.",
          },
          {
            id: "metas",
            tipo: "tabla",
            etiqueta: "Mis metas (hasta tres)",
            ayuda: "Una meta por fila.",
            columnas: [
              { id: "meta", titulo: "Meta (concreta)", ejemplo: "Viajar en camioneta hasta mi parada" },
              { id: "avance", titulo: "Cómo sabré que voy avanzando (algo que se pueda contar o ver)", ejemplo: "Tres días a la semana, sin bajarme antes" },
              { id: "plazo", titulo: "En cuánto tiempo me gustaría lograrlo", ejemplo: "Dos meses" },
            ],
            filas: 3,
            maxFilas: 3,
          },
          { id: "primera", tipo: "texto", etiqueta: "De esas metas, ¿cuál es la más importante para empezar?" },
          { id: "confianza", tipo: "escala", etiqueta: "¿Cuánta confianza tiene hoy en poder lograr esa meta?", extremos: ["0 = ninguna", "10 = mucha"] },
          {
            id: "dificultades",
            tipo: "parrafo",
            etiqueta: "¿Qué podría dificultar que la logre?",
            ejemplo: "Que el trabajo me quite tiempo o que me desanime si un día me va mal.",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos juntos lo que escribió, afinaremos las metas para que sean concretas y posibles, y elegiremos con cuál empezar. Si algo no le quedó claro o prefirió no escribirlo, lo conversamos con calma.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 1.2 ============================ */
  {
    id: "1.2",
    etapa: 1,
    titulo: "Línea de vida del problema",
    paraQue: "Cuándo empezó, momentos en que mejoró o empeoró, qué pasaba entonces y qué lo mantiene hoy.",
    tiempo: "25 a 35 minutos",
    explicacion: [
      "Los problemas casi nunca aparecen de un día para otro ni se quedan siempre igual. Tienen una historia: un comienzo, épocas mejores y épocas peores. Mirar esa historia con calma ayuda a entender qué lo ha mantenido y qué le ha ayudado.",
      "Por ejemplo, una persona nota que su ansiedad subió cuando empezó un trabajo con mucha presión, bajó durante unas vacaciones y volvió a subir cuando dejó de salir a caminar. Ahí ya hay pistas: la presión parece subirla y el descanso y el movimiento parecen ayudar.",
      "No se trata de buscar culpables ni de revivir lo más doloroso. Escriba solo lo que se sienta en condiciones de compartir. Si algo le resulta muy difícil, déjelo en blanco y lo conversamos en la sesión.",
    ],
    secciones: [
      {
        id: "inicio",
        titulo: "Cuándo empezó",
        campos: [
          { id: "inicio", tipo: "texto", etiqueta: "¿Cuándo empezó el problema, más o menos?", ejemplo: "A mediados del año pasado, poco después de cambiar de trabajo." },
          {
            id: "antes",
            tipo: "parrafo",
            etiqueta: "¿Cómo era su vida poco antes de que empezara? ¿Qué estaba pasando en ese tiempo?",
            ayuda: "Por ejemplo: trabajo, familia, salud, mudanzas, pérdidas, cambios o épocas de mucha carga.",
          },
          { id: "parecido", tipo: "parrafo", etiqueta: "Antes de eso, ¿había vivido algo parecido alguna vez? ¿Cómo fue?" },
        ],
      },
      {
        id: "altibajos",
        titulo: "Los altibajos",
        intro: "Anote los momentos en que el problema cambió: cuando mejoró o cuando empeoró. No hace falta que sean muchos.",
        campos: [
          {
            id: "altibajos",
            tipo: "tabla",
            etiqueta: "Momentos de cambio",
            columnas: [
              { id: "cuando", titulo: "Cuándo (año, mes o etapa)", ejemplo: "Diciembre del año pasado" },
              { id: "como", titulo: "¿Mejoró o empeoró? ¿Cuánto, de 0 a 10?", ejemplo: "Mejoró: pasó de 8 a 4" },
              { id: "pasaba", titulo: "Qué estaba pasando en mi vida", ejemplo: "Vacaciones, dormía más, salía a caminar" },
            ],
            filas: 5,
            maxFilas: 8,
          },
          {
            id: "mejor",
            tipo: "parrafo",
            etiqueta: "Cuando ha estado un poco mejor, ¿qué estaba haciendo distinto?",
            ayuda: "Aunque haya sido poco tiempo, vale la pena anotarlo.",
          },
        ],
      },
      {
        id: "hoy",
        titulo: "Lo que lo mantiene hoy",
        campos: [
          {
            id: "empeora",
            tipo: "lista",
            etiqueta: "Cosas que hacen que el problema se sienta más fuerte hoy",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Dormir poco; revisar el celular de noche; las reuniones con mi jefe",
          },
          {
            id: "alivia",
            tipo: "lista",
            etiqueta: "Cosas que lo alivian, aunque sea un rato",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Caminar; platicar con mi hermana; escuchar música",
          },
          {
            id: "apoyos",
            tipo: "lista",
            etiqueta: "Personas, lugares o actividades que me dan apoyo o fuerza",
            minFilas: 1,
            maxFilas: 6,
          },
          {
            id: "hago",
            tipo: "parrafo",
            etiqueta: "Cuando el problema aparece, ¿qué suele hacer usted?",
            ayuda: "Por ejemplo: quedarse en cama, buscar compañía, distraerse, evitar algo, repasar las cosas una y otra vez.",
          },
          { id: "hoy_vs_peor", tipo: "escala", etiqueta: "Comparado con el peor momento, ¿cómo se siente hoy?", extremos: ["0 = igual de mal que en el peor momento", "10 = ya no tengo el problema"] },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Con su línea de vida buscaremos patrones: qué suele empeorar el problema, qué lo alivia y qué lo mantiene hoy. Eso nos ayudará a decidir por dónde empezar a trabajar.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 1.3 ============================ */
  {
    id: "1.3",
    etapa: 1,
    titulo: "Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta",
    paraQue: "Registrar 2 o 3 momentos recientes y ver el ciclo que se repite.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Lo que sentimos y hacemos en un momento difícil no depende solo de lo que pasó. También influye lo que pensamos en ese momento, lo que sentimos en el cuerpo y lo que hacemos después. Esas cinco cosas se influyen entre sí, como un círculo.",
      "Por ejemplo, su jefe le escribe por WhatsApp: «Mañana hablamos». Usted piensa: «Seguro me va a regañar». Siente miedo. En el cuerpo, el estómago se le aprieta. Y hace lo siguiente: revisa el teléfono toda la noche y repasa su trabajo. Esa noche sin dormir hace que mañana llegue más cansado y más nervioso, y el círculo sigue.",
      "Al verlo por escrito empieza a notarse dónde se podría hacer un pequeño cambio. Elija dos o tres momentos recientes que le hayan molestado, de esta semana o de la pasada. No hace falta que sean los más difíciles de su vida.",
    ],
    secciones: [
      {
        id: "momentos",
        titulo: "Mis momentos",
        intro: "Una fila por cada momento. Escriba lo que recuerde; no tiene que ser perfecto.",
        campos: [
          {
            id: "ciclo",
            tipo: "tabla",
            etiqueta: "Mi ciclo en tres momentos recientes",
            columnas: [
              { id: "situacion", titulo: "Situación", ayuda: "Qué pasó, dónde y con quién", ejemplo: "Mi jefe me escribió: «Mañana hablamos»" },
              { id: "pensamiento", titulo: "Lo que pensé", ayuda: "La frase que cruzó por mi mente", ejemplo: "Seguro me va a regañar" },
              { id: "emocion", titulo: "Lo que sentí y cuánto (0 a 100)", ayuda: "Miedo, enojo, tristeza, vergüenza…", ejemplo: "Miedo, 80" },
              { id: "cuerpo", titulo: "Lo que sentí en el cuerpo", ejemplo: "Estómago apretado, no podía dormir" },
              { id: "conducta", titulo: "Lo que hice (o dejé de hacer)", ejemplo: "Revisé el celular toda la noche" },
            ],
            filas: 3,
            maxFilas: 3,
          },
        ],
      },
      {
        id: "mirando",
        titulo: "Mirando mi ciclo",
        campos: [
          {
            id: "se_repite",
            tipo: "parrafo",
            etiqueta: "Al mirar los momentos juntos, ¿qué se repite?",
            ayuda: "Pueden ser pensamientos, emociones, sensaciones o cosas que hace.",
          },
          {
            id: "efecto",
            tipo: "parrafo",
            etiqueta: "Lo que hizo en esos momentos, ¿qué efecto tuvo enseguida? ¿Y después, con el paso de las horas o los días?",
            ejemplo: "Enseguida me calmaba un poco, pero al otro día estaba más cansado y con más miedo.",
          },
          { id: "tipicos", tipo: "escala", etiqueta: "¿Qué tan típicos son estos momentos de lo que le pasa en general?", extremos: ["0 = nada típicos", "10 = muy típicos"] },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos juntos su ciclo, buscaremos en qué parte se puede intervenir y veremos si los pensamientos de esos momentos se parecen a lo que pasa en otras situaciones. No tiene que cambiar nada por su cuenta antes.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 1.4 ============================ */
  {
    id: "1.4",
    etapa: 1,
    titulo: "Lo que me importa: mis valores",
    paraQue: "Identificar valores por áreas de la vida y una acción pequeña por valor.",
    tiempo: "25 a 35 minutos",
    explicacion: [
      "Los valores son lo que le importa de verdad en la vida: cómo quiere ser, cómo quiere tratar a los demás y cómo quiere tratarse a sí mismo. Funcionan como una brújula: no se «terminan» como una meta, sino que señalan hacia dónde caminar.",
      "Por ejemplo, para una persona la familia es un valor. Eso no se alcanza y se acabó; se vive en cosas pequeñas, como llamar a su mamá el domingo o llegar a cenar con sus hijos. Cuando el problema que hoy le pesa le quita esas cosas, duele, y ese dolor muestra cuánto importan.",
      "Aquí no cuenta lo que «debería» importarle ni lo que les importa a otros. Solo lo que es verdad para usted. Si en alguna área no se le ocurre nada, déjela en blanco.",
    ],
    secciones: [
      {
        id: "areas",
        titulo: "Mis áreas de vida",
        intro: "Para cada área escriba qué le importa (cómo quiere ser o actuar) y una acción pequeña, de pocos minutos, con la que podría acercarse a eso esta semana.",
        campos: [
          {
            id: "valores",
            tipo: "tabla",
            etiqueta: "Mis valores por áreas",
            columnas: [
              { id: "importa", titulo: "Qué me importa en esta área", ejemplo: "Estar presente con mis hijos" },
              { id: "importancia", titulo: "Qué tanto me importa (0 a 10)", ejemplo: "9" },
              { id: "accion", titulo: "Una acción pequeña que podría hacer esta semana", ejemplo: "Cenar con ellos sin celular, dos noches" },
            ],
            filas: 7,
            maxFilas: 7,
            filasFijas: [
              "Familia",
              "Pareja",
              "Trabajo o estudio",
              "Salud y cuidado personal",
              "Amistades y comunidad",
              "Ocio y tiempo libre",
              "Espiritualidad o sentido de vida",
            ],
          },
        ],
      },
      {
        id: "distancia",
        titulo: "Lo que se interpone",
        campos: [
          {
            id: "interpone",
            tipo: "parrafo",
            etiqueta: "¿Qué se ha interpuesto últimamente entre usted y lo que le importa?",
            ejemplo: "El cansancio y el miedo a equivocarme me hacen cancelar planes.",
          },
          {
            id: "reciente",
            tipo: "parrafo",
            etiqueta: "Piense en un momento reciente en que actuó de acuerdo con algo que le importa. ¿Qué hizo?",
            ayuda: "Puede ser algo pequeño.",
          },
          { id: "empezar", tipo: "texto", etiqueta: "Si tuviera que elegir una sola área para empezar, ¿cuál sería?" },
          { id: "vivido", tipo: "escala", etiqueta: "En las últimas semanas, ¿qué tanto ha vivido de acuerdo con lo que le importa?", extremos: ["0 = nada", "10 = totalmente"] },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Conversaremos sobre lo que escribió y elegiremos juntos una o dos acciones pequeñas que le acerquen a lo que le importa. Los valores nos servirán de guía para escoger metas y tareas durante el resto del trabajo.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 2.1 ============================ */
  {
    id: "2.1",
    etapa: 2,
    titulo: "La ansiedad y la respuesta de alarma",
    paraQue: "Qué es la ansiedad, para qué sirve y por qué se siente así en el cuerpo; marcar sus propias señales.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "La ansiedad es la alarma del cuerpo. Sirve para protegernos: cuando se percibe un peligro, el cuerpo se prepara en segundos para huir o para enfrentarlo. Todas las personas la tienen; es una función normal.",
      "Por eso se sienten cosas en el cuerpo: el corazón late más rápido para llevar sangre a los músculos, se respira más fuerte para tomar aire, aparece el sudor para enfriar el cuerpo y el estómago se aprieta porque la digestión se detiene un momento. Todo eso es muy molesto, pero no es peligroso, y con el tiempo baja solo. Un ejemplo: si un carro frena de golpe frente a usted en la calle, el corazón se acelera y usted salta hacia atrás sin pensarlo. Esa alarma funcionó bien.",
      "A veces la alarma suena cuando no hay un peligro real, o suena demasiado fuerte: antes de una reunión, en un lugar con mucha gente o al pensar en lo que podría pasar. El cuerpo reacciona como si hubiera peligro, aunque usted esté sentado en su casa. Es desagradable, pero no significa que esté en peligro ni que se esté perdiendo el control.",
      "En esta ficha va a marcar sus propias señales de alarma. Conocerlas suele quitarles parte del susto.",
    ],
    secciones: [
      {
        id: "senales",
        titulo: "Mis señales de alarma",
        campos: [
          {
            id: "cuerpo",
            tipo: "casillas",
            etiqueta: "En el cuerpo: marque lo que siente cuando tiene ansiedad",
            opciones: [
              "Corazón acelerado o palpitaciones",
              "Falta de aire o presión en el pecho",
              "Sudor o manos frías",
              "Temblor",
              "Tensión en el cuello, los hombros o la mandíbula",
              "Estómago apretado, náuseas o ganas de ir al baño",
              "Mareo",
              "Cosquilleo en manos o pies",
              "Calor o escalofríos",
              "Boca seca",
              "Dificultad para dormir",
            ],
            conOtra: true,
          },
          {
            id: "pensamientos",
            tipo: "casillas",
            etiqueta: "En los pensamientos: marque lo que le pasa",
            opciones: [
              "Pienso en lo peor que podría pasar",
              "Siento que algo malo va a ocurrir",
              "Me cuesta concentrarme",
              "Mi mente se queda en blanco",
              "Pienso que voy a perder el control",
              "Pienso que me puede estar pasando algo grave en el cuerpo",
              "Me preocupa lo que piensen de mí",
            ],
            conOtra: true,
          },
          {
            id: "conducta",
            tipo: "casillas",
            etiqueta: "En lo que hago: marque lo que suele pasar",
            opciones: [
              "Me alejo o evito ciertos lugares o personas",
              "Pregunto varias veces si todo está bien",
              "Reviso varias veces el teléfono, la puerta o las cosas",
              "Me quedo paralizado",
              "Me irrito o hablo más rápido",
              "Busco que alguien me acompañe",
              "Me distraigo para no sentir",
            ],
            conOtra: true,
          },
        ],
      },
      {
        id: "momento",
        titulo: "Un momento reciente",
        campos: [
          {
            id: "momento",
            tipo: "parrafo",
            etiqueta: "Cuente un momento reciente en que sintió esa alarma: ¿dónde estaba y qué estaba pasando?",
            ejemplo: "Iba en la camioneta llena, de pronto me dio calor, el corazón me latía fuerte y pensé que me iba a desmayar.",
          },
          { id: "fuerza", tipo: "escala", etiqueta: "En ese momento, ¿qué tan fuerte fue la alarma?", extremos: ["0 = ninguna", "10 = la más fuerte que he sentido"] },
          { id: "creencia", tipo: "escala", etiqueta: "En ese momento, ¿cuánto creyó que algo malo iba a pasar?", extremos: ["0 = nada", "10 = totalmente"] },
          {
            id: "final",
            tipo: "parrafo",
            etiqueta: "¿Cómo terminó? ¿La alarma bajó? ¿Cuánto tardó?",
            ayuda: "Observe si bajó aunque usted no haya hecho nada especial.",
          },
          {
            id: "util",
            tipo: "parrafo",
            etiqueta: "¿Recuerda alguna vez en que esta alarma sí le fue útil y le avisó de algo real?",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Conversaremos sobre las señales que marcó y por qué el cuerpo reacciona así. Más adelante veremos, paso a paso y con usted, qué se puede hacer con esas señales. No necesita hacer nada especial antes de la sesión.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 2.2 ============================ */
  {
    id: "2.2",
    etapa: 2,
    titulo: "El círculo del desánimo",
    paraQue: "Cómo el ánimo bajo lleva a hacer menos y hacer menos baja el ánimo; registrar su círculo y una salida pequeña.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Cuando el ánimo está bajo, cuesta hacer cosas: levantarse, salir, llamar a alguien, cocinar. Es natural querer esperar a «tener ganas» para hacerlas.",
      "El problema es que, al hacer menos, también pasan menos cosas agradables o que dan la sensación de haber logrado algo, y el ánimo baja todavía más. Entonces cuesta más hacer cosas. Es un círculo. Por ejemplo: una persona amanece sin ánimo y cancela la salida con una amiga; se queda en casa y pasa el día en el celular; por la noche se siente más sola y más cansada, y al día siguiente tiene aún menos ganas de salir.",
      "No es pereza ni falta de voluntad: así funciona el ánimo. Y el círculo se puede aflojar por el lado de la acción, con algo muy pequeño. Muchas veces las ganas llegan después de empezar, no antes. Por eso se empieza con cinco o diez minutos, no con una gran tarea.",
    ],
    secciones: [
      {
        id: "circulo",
        titulo: "Mi círculo",
        campos: [
          {
            id: "circulo",
            tipo: "tabla",
            etiqueta: "Mi círculo en tres momentos recientes",
            columnas: [
              { id: "animo", titulo: "Cómo estaba mi ánimo", ejemplo: "Sin ganas, cansado" },
              { id: "hice", titulo: "Lo que dejé de hacer o hice menos", ejemplo: "Cancelé la salida con mi amiga" },
              { id: "despues", titulo: "Cómo me sentí después", ejemplo: "Más solo y más cansado" },
            ],
            filas: 3,
            maxFilas: 3,
          },
          {
            id: "dejado",
            tipo: "lista",
            etiqueta: "Cosas que antes hacía o disfrutaba y hoy hago menos",
            minFilas: 1,
            maxFilas: 8,
            ejemplo: "Caminar por la tarde; ver a mis amigos; cocinar los sábados",
          },
          { id: "animo_semana", tipo: "escala", etiqueta: "Su ánimo en general esta semana", extremos: ["0 = muy bajo", "10 = muy bueno"] },
        ],
      },
      {
        id: "salida",
        titulo: "Mi salida pequeña",
        intro: "No se trata de hacer mucho, sino de empezar con algo muy pequeño que usted pueda lograr aun en un día difícil.",
        campos: [
          {
            id: "pequenas",
            tipo: "lista",
            etiqueta: "Acciones de 5 a 10 minutos que podría hacer y que antes le daban gusto o la sensación de haber hecho algo",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Salir al patio a tomar sol cinco minutos; mandarle un mensaje a mi hermana; lavar los trastes de la cena",
          },
          { id: "elegida", tipo: "texto", etiqueta: "De esa lista, ¿cuál podría hacer esta semana?" },
          { id: "cuando", tipo: "texto", etiqueta: "¿Cuándo y dónde la haría? (día y hora)", ejemplo: "El miércoles a las 5 de la tarde, en el patio" },
          {
            id: "dificultad",
            tipo: "escala",
            etiqueta: "¿Qué tan difícil se siente esa acción?",
            ayuda: "Si le parece un 7 o más, conviene hacerla todavía más pequeña.",
            extremos: ["0 = nada difícil", "10 = muy difícil"],
          },
          {
            id: "obstaculo",
            tipo: "parrafo",
            etiqueta: "¿Qué podría impedírselo y qué podría hacer en ese caso?",
            ejemplo: "Si llego muy cansado, la hago solo por cinco minutos.",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos su círculo y la acción pequeña que eligió, la ajustaremos si hace falta y veremos cómo le fue con ella. Que le haya costado también nos da información útil.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 2.3 ============================ */
  {
    id: "2.3",
    etapa: 2,
    titulo: "Pensamientos que vuelven: por qué pasan",
    paraQue: "Diferenciar resolver de darle vueltas; preguntas «¿por qué?» frente a «¿qué puedo hacer?»; registrar cuándo aparecen.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Todas las personas tienen pensamientos que vuelven una y otra vez, sobre todo cuando algo les preocupa o les dolió. Es la forma en que la mente intenta resolver las cosas. Pero hay dos maneras de pensar en algo.",
      "Una es pensar para resolver: «¿qué puedo hacer?», «¿cuál es el primer paso?». Suele terminar en un plan, aunque sea pequeño. La otra es darle vueltas: «¿por qué me pasa esto?», «¿y si sale mal?», «¿por qué no puedo ser distinto?». Esta no tiene final y suele dejar más cansancio y menos ánimo.",
      "Por ejemplo, alguien discutió con su hermano. Pensar para resolver: «Mañana le escribo y le explico lo que quise decir». Darle vueltas: «¿Por qué siempre me pasa? ¿Por qué dije eso? ¿Y si ya no me quiere hablar?», durante una hora, sin llegar a nada.",
      "En esta ficha solo va a observar cuándo y cómo aparecen estos pensamientos. No tiene que luchar contra ellos ni dejar de pensar.",
    ],
    secciones: [
      {
        id: "pensamientos",
        titulo: "Mis pensamientos que vuelven",
        campos: [
          {
            id: "frases",
            tipo: "lista",
            etiqueta: "Escriba los pensamientos que más le vuelven",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "¿Por qué no puedo ser como los demás?; ¿y si me despiden?",
          },
          {
            id: "registro",
            tipo: "tabla",
            etiqueta: "Tres veces en que aparecieron esta semana",
            columnas: [
              { id: "cuando", titulo: "Cuándo, dónde y qué pasaba antes", ejemplo: "En la cama, después de ver un correo del trabajo" },
              { id: "pensamiento", titulo: "Qué pensamiento volvió", ejemplo: "¿Y si me despiden?" },
              { id: "duro", titulo: "Cuánto tiempo estuve en eso", ejemplo: "Casi una hora" },
              { id: "despues", titulo: "Cómo me sentí después (0 a 10 de malestar)", ejemplo: "7, muy cansado" },
            ],
            filas: 3,
            maxFilas: 3,
          },
        ],
      },
      {
        id: "preguntas",
        titulo: "«¿Por qué?» o «¿qué puedo hacer?»",
        campos: [
          {
            id: "por_que",
            tipo: "parrafo",
            etiqueta: "Anote algunas de las preguntas que se hace cuando le da vueltas a algo",
            ayuda: "Las que empiezan con «¿por qué…?» o «¿y si…?».",
          },
          {
            id: "que_hacer",
            tipo: "parrafo",
            etiqueta: "Para una de esas preguntas, escriba una pregunta distinta: «¿Qué puedo hacer ahora, aunque sea algo pequeño?» o «¿Hay algo que dependa de mí?»",
            ayuda: "Si no hay nada que dependa de usted en este momento, escríbalo también.",
            ejemplo: "En lugar de «¿y si me despiden?»: «¿Qué puedo hacer hoy para hacer bien mi trabajo?». Si no depende de mí, lo anoto.",
          },
          {
            id: "hago",
            tipo: "casillas",
            etiqueta: "Cuando le da vueltas a algo, ¿qué suele hacer?",
            opciones: [
              "Me quedo en la cama",
              "Trato de dejar de pensar",
              "Busco a alguien para repetirle lo mismo",
              "Reviso el celular",
              "Como o tomo algo",
              "Me distraigo con la televisión o el celular",
              "Trabajo más",
              "Nada, sigo pensando",
            ],
            conOtra: true,
          },
          { id: "ayuda", tipo: "escala", etiqueta: "Darle vueltas, ¿cuánto le ayuda a resolver el problema?", extremos: ["0 = nada", "10 = mucho"] },
          { id: "tiempo", tipo: "escala", etiqueta: "¿Cuánto de su día ocupan estos pensamientos?", extremos: ["0 = casi nada", "10 = casi todo el día"] },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Conversaremos sobre cuándo le sirve pensar en algo y cuándo solo le da vueltas, y qué pistas nos dan sus registros. Más adelante veremos, juntos, formas de relacionarse de otro modo con estos pensamientos.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 2.4 ============================ */
  {
    id: "2.4",
    etapa: 2,
    titulo: "La trampa de la evitación",
    paraQue: "Alivio a corto plazo, más miedo a largo plazo; listar lo que evita y qué le cuesta.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Cuando algo nos da miedo o nos incomoda, es natural alejarnos. Evitar da alivio enseguida: lo desagradable baja. Por eso el cuerpo aprende que «evitar funciona».",
      "Pero con el tiempo hay un costo: al evitar no llegamos a comprobar si podíamos con eso, el miedo suele crecer y la vida se va achicando. Esa es la trampa: alivio hoy, más miedo mañana.",
      "Por ejemplo, alguien se pone muy nervioso en la camioneta llena y empieza a irse en taxi o caminando. Al principio alivia, pero con los meses ya no se atreve a subir a ninguna camioneta ni a ir a lugares lejos de su casa.",
      "En esta ficha solo va a observar y anotar lo que evita y lo que le cuesta. No tiene que hacer nada distinto por su cuenta: si más adelante conviene acercarse poco a poco a algo, lo planearemos juntos, paso a paso.",
    ],
    secciones: [
      {
        id: "evito",
        titulo: "Lo que evito",
        campos: [
          {
            id: "evitaciones",
            tipo: "tabla",
            etiqueta: "Lo que evito (hasta diez)",
            ayuda: "Puede ser un lugar, una persona, una actividad, una conversación o un pensamiento.",
            columnas: [
              { id: "evito", titulo: "Lo que evito", ejemplo: "Subirme a la camioneta llena" },
              { id: "temo", titulo: "Qué temo que pase", ejemplo: "Que me dé una crisis y no pueda bajarme" },
              { id: "cuesta", titulo: "Qué me cuesta o qué pierdo por evitarlo", ejemplo: "Gasto más en taxi y no visito a mi mamá" },
            ],
            filas: 6,
            maxFilas: 10,
          },
          {
            id: "sutiles",
            tipo: "casillas",
            etiqueta: "A veces se evita de formas menos visibles. ¿Alguna le pasa?",
            opciones: [
              "Pongo excusas o cancelo planes",
              "Solo voy si me acompaña alguien",
              "Me distraigo todo el tiempo cuando estoy ahí",
              "Llego tarde o me voy temprano",
              "Dejo las cosas para después",
              "Evito pensar en eso",
            ],
            conOtra: true,
          },
        ],
      },
      {
        id: "costo",
        titulo: "El alivio y el costo",
        campos: [
          {
            id: "alivio",
            tipo: "parrafo",
            etiqueta: "Cuando evita algo, ¿cómo se siente enseguida? ¿Y unos días después?",
            ejemplo: "Enseguida, alivio. A los días, tristeza y enojo conmigo.",
          },
          {
            id: "dejado",
            tipo: "parrafo",
            etiqueta: "¿Qué cosas importantes ha dejado de hacer por evitar?",
          },
          { id: "limita", tipo: "escala", etiqueta: "¿Cuánto limita su vida diaria lo que evita?", extremos: ["0 = nada", "10 = muchísimo"] },
          {
            id: "ya_puedo",
            tipo: "parrafo",
            etiqueta: "¿Hay algo que antes evitaba y hoy ya hace, aunque sea con incomodidad?",
            ayuda: "Solo anótelo; no tiene que buscar nuevas situaciones.",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos su lista, veremos cuáles evitaciones pesan más en su vida y, si conviene, planearemos juntos, con calma y sin presión, un primer paso. No intente enfrentar nada por su cuenta antes de la sesión.",
      campos: [paraLaSesion],
    },
  },
];

export const fichaPorId = (id: string | null | undefined) => FICHAS.find((f) => f.id === id) ?? null;
export const esFichaId = (v: unknown): v is FichaId => typeof v === "string" && (FICHA_IDS as readonly string[]).includes(v);

/** Todos los campos de una ficha (secciones y cierre), en orden. */
export const camposDeFicha = (f: Ficha): Campo[] => [...f.secciones.flatMap((s) => s.campos), ...f.cierre.campos];
