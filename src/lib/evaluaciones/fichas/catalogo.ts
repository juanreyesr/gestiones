/**
 * Fichas terapéuticas JJR (TCC): catálogo declarativo y parte PARA EL PACIENTE
 * de cada ficha (lotes 1 y 2: etapas 1 «Evaluación y formulación», 2 «Psicoeducación» y 3 «Técnicas cognitivas»).
 * Especificación clínica: docs/instrumentos/Fichas_terapeuticas_JJR_especificacion.md
 *
 * Este archivo lo importa el formulario público (/evaluacion/<token>) y el
 * servidor: NO incluir aquí la parte «Para el terapeuta» (vive en otro archivo, solo
 * para el panel). Contenido original, redactado de usted, en español de Guatemala.
 * Sin imports en tiempo de ejecución.
 */

export const FICHA_IDS = ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "3.4"] as const;
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
export type CampoTabla = CampoBase & {
  tipo: "tabla";
  columnas: readonly ColumnaTabla[];
  filas: number;
  maxFilas: number;
  filasFijas?: readonly string[];
  /** Qué es cada fila, en singular y minúscula («momento», «meta», «evitación»): da los rótulos «Primer momento», «Otro momento (opcional)»… */
  etiquetaFila: string;
  /** Con «f», los rótulos van en femenino («Primera meta», «Otra meta (opcional)»). */
  generoFila?: "f";
  /** Índice (desde 0) de la primera fila opcional: la anterior es la principal. */
  filaOpcionalDesde: number;
};

export type Campo = CampoTexto | CampoParrafo | CampoEscala | CampoLista | CampoCasillas | CampoTabla;

/** `intro`: invitación concreta, en segunda persona (de usted), que dice qué recordar o hacer y para qué. */
export type Seccion = { id: string; titulo: string; intro: string; campos: readonly Campo[] };

const ORDINALES = ["", "", "", "tercer", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno", "décimo"];
const ORDINALES_F = ["", "", "", "tercera", "cuarta", "quinta", "sexta", "séptima", "octava", "novena", "décima"];

/**
 * Rótulo de la fila `i` (desde 0) de una tabla: nunca «Fila n». Con filas fijas, su propio rótulo;
 * si no, «Primer momento», «Otro momento (opcional)», «Un tercer momento (opcional)»…
 */
export function rotuloFila(c: CampoTabla, i: number): string {
  if (c.filasFijas) return c.filasFijas[i] ?? c.etiquetaFila;
  const f = c.generoFila === "f";
  const n = i + 1;
  const ord = (f ? ORDINALES_F : ORDINALES)[n];
  const base =
    n === 1
      ? `${f ? "Primera" : "Primer"} ${c.etiquetaFila}`
      : n === 2 || !ord
        ? `${f ? "Otra" : "Otro"} ${c.etiquetaFila}`
        : `${f ? "Una" : "Un"} ${ord} ${c.etiquetaFila}`;
  return i >= c.filaOpcionalDesde ? `${base} (opcional)` : base;
}

export type Ficha = {
  id: FichaId;
  /** Etapa del tratamiento (1 a 5; por ahora hay fichas de las etapas 1 a 3). */
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
  etiqueta: "¿Qué le gustaría conversar o preguntar en la próxima sesión?",
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
        titulo: "Lo que le trajo a consulta",
        intro:
          "Comencemos por lo que le hizo buscar ayuda. Cuéntelo con sus palabras, como si se lo explicara a una persona de confianza; con eso iremos aclarando, paso a paso, qué es lo que más le pesa.",
        campos: [
          {
            id: "motivo",
            tipo: "parrafo",
            etiqueta: "¿Qué le hizo buscar ayuda en este momento?",
            ayuda: "Puede ir en desorden; luego lo ordenamos juntos.",
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
        titulo: "Cuánto le afecta hoy",
        intro:
          "Ahora piense en cómo ha sido esta última semana y póngale un número a lo que le pasa. No hay un número correcto: solo nos sirve como punto de partida para ver más adelante si algo cambia.",
        campos: [
          { id: "afecta_hoy", tipo: "escala", etiqueta: "Hoy, ¿cuánto le afecta este problema en su vida diaria?", extremos: ["0 = nada", "10 = muchísimo"] },
          {
            id: "ya_intente",
            tipo: "parrafo",
            etiqueta: "¿Qué ha intentado hasta ahora para sentirse mejor?",
            ejemplo: "Salir a caminar, hablar con mi hermana, tomar café para dormir.",
          },
          {
            id: "ya_ayudo",
            tipo: "parrafo",
            etiqueta: "De todo eso, ¿qué le ha ayudado, aunque sea un poco?",
            ejemplo: "Salir a caminar a veces me ayuda. Hablar con mi hermana también.",
          },
        ],
      },
      {
        id: "metas",
        titulo: "Lo que le gustaría que fuera distinto",
        intro:
          "Imagine que dentro de unos meses las cosas han mejorado. Escriba qué estaría haciendo distinto y luego conviértalo en metas que se puedan ver o contar; con una meta basta para empezar.",
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
            etiqueta: "¿Qué metas concretas le gustaría lograr?",
            ayuda: "Escriba primero la más importante. Las otras dos son opcionales.",
            columnas: [
              { id: "meta", titulo: "¿Qué le gustaría lograr?", ayuda: "Una meta concreta, que se pueda ver", ejemplo: "Viajar en camioneta hasta mi parada" },
              { id: "avance", titulo: "¿Cómo se daría cuenta de que va avanzando?", ayuda: "Algo que se pueda contar o ver", ejemplo: "Tres días a la semana, sin bajarme antes" },
              { id: "plazo", titulo: "¿En cuánto tiempo le gustaría lograrlo?", ejemplo: "Dos meses" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "meta",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
          { id: "primera", tipo: "texto", etiqueta: "De esas metas, ¿con cuál le gustaría empezar?" },
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
        titulo: "Cómo empezó",
        intro:
          "Comencemos por el principio. Piense en la época en que notó por primera vez el problema y escriba lo que recuerde de ese tiempo; no hace falta que sea exacto.",
        campos: [
          { id: "inicio", tipo: "texto", etiqueta: "¿Cuándo empezó el problema, más o menos?", ejemplo: "A mediados del año pasado, poco después de cambiar de trabajo." },
          {
            id: "antes",
            tipo: "parrafo",
            etiqueta: "¿Qué estaba pasando en su vida poco antes de que empezara?",
            ayuda: "Por ejemplo: trabajo, familia, salud, mudanzas, pérdidas, cambios o épocas de mucha carga.",
          },
          { id: "parecido", tipo: "parrafo", etiqueta: "Antes de eso, ¿había vivido algo parecido alguna vez?", ayuda: "Si lo recuerda, cuente brevemente cómo fue." },
        ],
      },
      {
        id: "altibajos",
        titulo: "Los altibajos",
        intro:
          "Ahora recorra el tiempo desde que empezó hasta hoy. Anote los momentos en que el problema cambió, ya sea porque mejoró o porque empeoró; con uno basta para empezar y los demás son opcionales.",
        campos: [
          {
            id: "altibajos",
            tipo: "tabla",
            etiqueta: "¿En qué momentos cambió el problema?",
            ayuda: "No hace falta que sean muchos.",
            columnas: [
              { id: "cuando", titulo: "¿Cuándo fue?", ayuda: "Año, mes o etapa de la vida", ejemplo: "Diciembre del año pasado" },
              { id: "como", titulo: "¿Mejoró o empeoró? ¿Cuánto, de 0 a 10?", ejemplo: "Mejoró: pasó de 8 a 4" },
              { id: "pasaba", titulo: "¿Qué estaba pasando en su vida?", ejemplo: "Vacaciones, dormía más, salía a caminar" },
            ],
            filas: 5,
            maxFilas: 8,
            etiquetaFila: "momento",
            filaOpcionalDesde: 1,
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
        intro:
          "Para terminar, mire cómo está el problema hoy. Anote lo que lo hace más fuerte, lo que lo alivia y lo que le da apoyo a usted, aunque sean cosas pequeñas.",
        campos: [
          {
            id: "empeora",
            tipo: "lista",
            etiqueta: "¿Qué cosas hacen que el problema se sienta más fuerte hoy?",
            ayuda: "Escriba una por renglón.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Dormir poco; revisar el celular de noche; las reuniones con mi jefe",
          },
          {
            id: "alivia",
            tipo: "lista",
            etiqueta: "¿Qué cosas lo alivian, aunque sea un rato?",
            ayuda: "Escriba una por renglón.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Caminar; platicar con mi hermana; escuchar música",
          },
          {
            id: "apoyos",
            tipo: "lista",
            etiqueta: "¿Qué personas, lugares o actividades le dan apoyo o fuerza?",
            ayuda: "Escriba una por renglón.",
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
      "Al verlo por escrito empieza a notarse dónde se podría hacer un pequeño cambio. Elija un momento reciente que le haya molestado, de esta semana o de la pasada, y, si quiere, agregue otros dos. No hace falta que sean los más difíciles de su vida.",
    ],
    secciones: [
      {
        id: "momentos",
        titulo: "Un momento reciente que le molestó",
        intro:
          "Comencemos recordando un momento reciente que le haya causado ansiedad o malestar. Piense dónde estaba y qué estaba pasando; con eso iremos identificando, paso a paso, lo que pasó por su mente y su cuerpo.",
        campos: [
          {
            id: "ciclo",
            tipo: "tabla",
            etiqueta: "¿Cómo fue ese momento, paso a paso?",
            ayuda: "Empiece por el primer momento. Si quiere, agregue otros dos: son opcionales. Escriba lo que recuerde; no tiene que ser perfecto.",
            columnas: [
              { id: "situacion", titulo: "¿Qué pasó?", ayuda: "Cuéntelo en una o dos frases: dónde estaba y con quién", ejemplo: "Mi jefe me escribió: «Mañana hablamos»" },
              { id: "pensamiento", titulo: "En ese momento, ¿qué pensó?", ayuda: "Escriba la frase tal como le cruzó por la mente", ejemplo: "Seguro me va a regañar" },
              { id: "emocion", titulo: "¿Qué sintió y qué tan fuerte fue, de 0 a 100?", ayuda: "Miedo, enojo, tristeza, vergüenza…", ejemplo: "Miedo, 80" },
              { id: "cuerpo", titulo: "¿Qué sintió en el cuerpo?", ejemplo: "Estómago apretado, no podía dormir" },
              { id: "conducta", titulo: "¿Qué hizo, o qué dejó de hacer?", ejemplo: "Revisé el celular toda la noche" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "momento",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "mirando",
        titulo: "Mirando su ciclo",
        intro:
          "Ahora mire juntos los momentos que escribió. Observe qué se parece de uno a otro y qué efecto tuvo lo que hizo; no hace falta buscar la causa de todo.",
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
            etiqueta: "Lo que hizo en esos momentos, ¿qué efecto tuvo enseguida?",
            ejemplo: "Enseguida me calmaba un poco.",
          },
          {
            id: "efecto_despues",
            tipo: "parrafo",
            etiqueta: "¿Y qué efecto tuvo después, con el paso de las horas o los días?",
            ejemplo: "Al otro día estaba más cansado y con más miedo.",
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
        titulo: "Lo que me importa en cada área de mi vida",
        intro:
          "Recorra las áreas de su vida una por una. En cada una, escriba qué le importa y una acción pequeña, de pocos minutos, con la que podría acercarse a eso esta semana. Si en alguna no se le ocurre nada, déjela en blanco.",
        campos: [
          {
            id: "valores",
            tipo: "tabla",
            etiqueta: "¿Qué le importa en cada área de su vida?",
            columnas: [
              { id: "importa", titulo: "¿Qué le importa en esta área?", ayuda: "Cómo le gustaría ser o actuar", ejemplo: "Estar presente con mis hijos" },
              { id: "importancia", titulo: "¿Cuánto le importa, de 0 a 10?", ejemplo: "9" },
              { id: "accion", titulo: "¿Qué acción pequeña podría hacer esta semana?", ejemplo: "Cenar con ellos sin celular, dos noches" },
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
            etiquetaFila: "área de vida",
            filaOpcionalDesde: 7,
          },
        ],
      },
      {
        id: "distancia",
        titulo: "Lo que se interpone",
        intro:
          "Ahora piense en las últimas semanas. Recuerde un momento en que sí actuó de acuerdo con lo que le importa y también lo que se ha interpuesto en el camino; ver ambas cosas ayuda a elegir por dónde empezar.",
        campos: [
          {
            id: "reciente",
            tipo: "parrafo",
            etiqueta: "¿Qué hizo en un momento reciente en que actuó de acuerdo con algo que le importa?",
            ayuda: "Puede ser algo pequeño.",
          },
          {
            id: "interpone",
            tipo: "parrafo",
            etiqueta: "¿Qué se ha interpuesto últimamente entre usted y lo que le importa?",
            ejemplo: "El cansancio y el miedo a equivocarme me hacen cancelar planes.",
          },
          { id: "empezar", tipo: "texto", etiqueta: "Si tuviera que elegir una sola área para empezar, ¿cuál sería?" },
          { id: "vivido", tipo: "escala", etiqueta: "En las últimas semanas, ¿cuánto ha vivido de acuerdo con lo que le importa?", extremos: ["0 = nada", "10 = totalmente"] },
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
        intro:
          "Marque las señales que reconozca en usted cuando siente ansiedad, pensando en las últimas semanas. No hace falta que le pasen todas: conocer las suyas ya es parte del trabajo.",
        campos: [
          {
            id: "cuerpo",
            tipo: "casillas",
            etiqueta: "En el cuerpo, ¿qué siente cuando tiene ansiedad?",
            ayuda: "Marque todo lo que le pase.",
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
            etiqueta: "En los pensamientos, ¿qué le pasa?",
            ayuda: "Marque todo lo que le pase.",
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
            etiqueta: "En lo que hace, ¿qué suele pasar?",
            ayuda: "Marque todo lo que le pase.",
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
        intro:
          "Ahora recuerde una vez reciente en que la alarma sonó. Piense dónde estaba y qué estaba pasando, y observe cómo subió y cómo bajó; así vemos cómo funciona en su caso.",
        campos: [
          {
            id: "momento",
            tipo: "parrafo",
            etiqueta: "¿Dónde estaba y qué estaba pasando cuando sintió esa alarma?",
            ejemplo: "Iba en la camioneta llena, de pronto me dio calor, el corazón me latía fuerte y pensé que me iba a desmayar.",
          },
          { id: "fuerza", tipo: "escala", etiqueta: "En ese momento, ¿qué tan fuerte fue la alarma?", extremos: ["0 = ninguna", "10 = la más fuerte que he sentido"] },
          { id: "creencia", tipo: "escala", etiqueta: "En ese momento, ¿cuánto creyó que algo malo iba a pasar?", extremos: ["0 = nada", "10 = totalmente"] },
          {
            id: "final",
            tipo: "parrafo",
            etiqueta: "Al final, ¿qué pasó con la alarma?",
            ayuda: "Observe si bajó, cuánto tardó y si bajó aunque usted no hiciera nada especial.",
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
        titulo: "Mi círculo del desánimo",
        intro:
          "Piense en un momento reciente en que su ánimo estuvo bajo y anote cómo se fue armando el círculo: cómo estaba, qué dejó de hacer y cómo se sintió después. Con un momento basta; si quiere, agregue otros dos.",
        campos: [
          {
            id: "circulo",
            tipo: "tabla",
            etiqueta: "¿Cómo se armó el círculo en esos momentos?",
            ayuda: "Empiece por el primer momento; los otros son opcionales.",
            columnas: [
              { id: "animo", titulo: "¿Cómo estaba su ánimo?", ejemplo: "Sin ganas, cansado" },
              { id: "hice", titulo: "¿Qué dejó de hacer o hizo menos?", ejemplo: "Cancelé la salida con mi amiga" },
              { id: "despues", titulo: "¿Cómo se sintió después?", ejemplo: "Más solo y más cansado" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "momento",
            filaOpcionalDesde: 1,
          },
          {
            id: "dejado",
            tipo: "lista",
            etiqueta: "¿Qué cosas que antes hacía o disfrutaba hace hoy menos?",
            ayuda: "Escriba una por renglón.",
            minFilas: 1,
            maxFilas: 8,
            ejemplo: "Caminar por la tarde; ver a mis amigos; cocinar los sábados",
          },
          { id: "animo_semana", tipo: "escala", etiqueta: "¿Cómo ha estado su ánimo en general esta semana?", extremos: ["0 = muy bajo", "10 = muy bueno"] },
        ],
      },
      {
        id: "salida",
        titulo: "Mi salida pequeña",
        intro:
          "Ahora elija algo muy pequeño con lo que aflojar el círculo. No se trata de hacer mucho, sino de empezar por una acción que usted pueda lograr aun en un día difícil.",
        campos: [
          {
            id: "pequenas",
            tipo: "lista",
            etiqueta: "¿Qué acciones de 5 a 10 minutos podría hacer, de las que antes le daban gusto o la sensación de haber hecho algo?",
            ayuda: "Escriba una por renglón.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Salir al patio a tomar sol cinco minutos; mandarle un mensaje a mi hermana; lavar los trastes de la cena",
          },
          { id: "elegida", tipo: "texto", etiqueta: "De esa lista, ¿cuál podría hacer esta semana?" },
          { id: "cuando", tipo: "texto", etiqueta: "¿Cuándo y dónde la haría?", ayuda: "Día y hora.", ejemplo: "El miércoles a las 5 de la tarde, en el patio" },
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
            etiqueta: "¿Qué podría impedirle hacerla?",
            ejemplo: "Llegar muy cansado.",
          },
          {
            id: "si_pasa",
            tipo: "parrafo",
            etiqueta: "Si eso pasara, ¿qué podría hacer en ese caso?",
            ejemplo: "La haría solo por cinco minutos.",
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
        titulo: "Los pensamientos que me vuelven",
        intro:
          "Comencemos por reconocer esos pensamientos. Escriba los que más le vuelven y recuerde veces recientes en que aparecieron; solo se trata de observar, no de luchar contra ellos.",
        campos: [
          {
            id: "frases",
            tipo: "lista",
            etiqueta: "¿Qué pensamientos son los que más le vuelven?",
            ayuda: "Escriba uno por renglón, tal como se le presentan.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "¿Por qué no puedo ser como los demás?; ¿y si me despiden?",
          },
          {
            id: "registro",
            tipo: "tabla",
            etiqueta: "¿Cuándo aparecieron esta semana?",
            ayuda: "Empiece por la primera vez que recuerde; las otras son opcionales.",
            columnas: [
              { id: "cuando", titulo: "¿Cuándo y dónde apareció, y qué había pasado antes?", ejemplo: "En la cama, después de ver un correo del trabajo" },
              { id: "pensamiento", titulo: "¿Qué pensamiento volvió?", ejemplo: "¿Y si me despiden?" },
              { id: "duro", titulo: "¿Cuánto tiempo estuvo en eso?", ejemplo: "Casi una hora" },
              { id: "despues", titulo: "¿Cómo se sintió después, de 0 a 10 de malestar?", ejemplo: "7, muy cansado" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "vez",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "preguntas",
        titulo: "«¿Por qué?» o «¿qué puedo hacer?»",
        intro:
          "Ahora observe qué preguntas se hace cuando le da vueltas a algo y pruebe cambiar una de ellas por otra que lo lleve a la acción. Es solo un ensayo: no tiene que creerla ni lograrlo a la primera.",
        campos: [
          {
            id: "por_que",
            tipo: "parrafo",
            etiqueta: "¿Qué preguntas se hace cuando le da vueltas a algo?",
            ayuda: "Las que empiezan con «¿por qué…?» o «¿y si…?».",
          },
          {
            id: "que_hacer",
            tipo: "parrafo",
            etiqueta: "Para una de esas preguntas, ¿qué pregunta distinta podría hacerse?",
            ayuda: "Por ejemplo: «¿Qué puedo hacer ahora, aunque sea algo pequeño?» o «¿Hay algo que dependa de mí?». Si no hay nada que dependa de usted en este momento, escríbalo también.",
            ejemplo: "En lugar de «¿y si me despiden?»: «¿Qué puedo hacer hoy para hacer bien mi trabajo?». Si no depende de mí, lo anoto.",
          },
          {
            id: "hago",
            tipo: "casillas",
            etiqueta: "Cuando le da vueltas a algo, ¿qué suele hacer?",
            ayuda: "Marque todo lo que le pase.",
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
        intro:
          "Comencemos haciendo una lista de lo que evita. Piense en lugares, personas, actividades, conversaciones o pensamientos que prefiere esquivar, y anote qué teme que pase y qué le cuesta evitarlos. Solo observe y anote.",
        campos: [
          {
            id: "evitaciones",
            tipo: "tabla",
            etiqueta: "¿Qué cosas evita?",
            ayuda: "Puede ser un lugar, una persona, una actividad, una conversación o un pensamiento. Escriba primero la que más le pesa; las demás son opcionales.",
            columnas: [
              { id: "evito", titulo: "¿Qué evita?", ejemplo: "Subirme a la camioneta llena" },
              { id: "temo", titulo: "¿Qué teme que pase?", ejemplo: "Que me dé una crisis y no pueda bajarme" },
              { id: "cuesta", titulo: "¿Qué le cuesta o qué pierde por evitarlo?", ejemplo: "Gasto más en taxi y no visito a mi mamá" },
            ],
            filas: 6,
            maxFilas: 10,
            etiquetaFila: "evitación",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
          {
            id: "sutiles",
            tipo: "casillas",
            etiqueta: "¿Alguna de estas formas menos visibles de evitar le pasa?",
            ayuda: "Marque todas las que correspondan.",
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
        intro:
          "Ahora piense en lo que pasa después de evitar. Recuerde cómo se siente enseguida y cómo se siente con el paso de los días; así se ve mejor lo que la evitación le da y lo que le quita.",
        campos: [
          {
            id: "alivio",
            tipo: "parrafo",
            etiqueta: "Cuando evita algo, ¿cómo se siente enseguida?",
            ejemplo: "Alivio.",
          },
          {
            id: "alivio_despues",
            tipo: "parrafo",
            etiqueta: "¿Y cómo se siente unos días después?",
            ejemplo: "Tristeza y enojo conmigo.",
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

  /* ============================ 3.1 ============================ */
  {
    id: "3.1",
    etapa: 3,
    titulo: "Registro de pensamientos",
    paraQue: "Atrapar el pensamiento automático en el momento, medir cuánto lo cree y escribir una respuesta más equilibrada.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Un pensamiento automático es la frase que nos cruza por la mente, casi sin darnos cuenta, justo antes de sentirnos mal. Llega rápido y suena a verdad, pero muchas veces es solo una primera interpretación de lo que pasó.",
      "Por ejemplo, usted manda un mensaje por WhatsApp a una amiga y ella no contesta en todo el día. En segundos le cruza: «Seguro se enojó conmigo». Siente un nudo en el estómago y se pasa la tarde repasando qué pudo haber dicho mal. Al día siguiente ella escribe: se le había acabado la batería.",
      "La pregunta clave para atrapar estos pensamientos es: «¿Qué pasó por mi mente justo antes de sentirme así?». Esta ficha le ayuda a escribirlos, a notar cuánto se los cree y a buscar una forma de ver la situación que sea más equilibrada. No se trata de pensar en positivo ni de callar lo que siente, sino de mirar el momento con más calma.",
    ],
    secciones: [
      {
        id: "momentos",
        titulo: "Momentos en que me sentí mal",
        intro:
          "Comencemos recordando un momento reciente en que se sintió mal de repente: con miedo, tristeza, enojo o vergüenza. Piense dónde estaba y qué estaba pasando, y vaya anotando paso a paso lo que le pasó por la mente; con una vez basta, y si quiere puede agregar otras.",
        campos: [
          {
            id: "registro",
            tipo: "tabla",
            etiqueta: "¿Cómo fue ese momento, paso a paso?",
            ayuda: "Empiece por el primer momento; los otros son opcionales. Escriba lo que recuerde, sin buscar que quede perfecto.",
            columnas: [
              { id: "situacion", titulo: "¿Qué pasó, dónde estaba y con quién?", ayuda: "Cuéntelo en una o dos frases, solo los hechos", ejemplo: "Escribí a mi amiga y no me contestó en todo el día" },
              { id: "pensamiento", titulo: "¿Qué pasó por su mente justo antes de sentirse así?", ayuda: "Escriba la frase tal como le cruzó", ejemplo: "Seguro se enojó conmigo" },
              { id: "creia", titulo: "¿Cuánto se lo creyó en ese momento, de 0 a 10?", ayuda: "0 = nada, 10 = totalmente", ejemplo: "8" },
              { id: "emocion", titulo: "¿Qué sintió y qué tan fuerte fue, de 0 a 10?", ayuda: "Miedo, tristeza, enojo, vergüenza…", ejemplo: "Preocupación, 7" },
              { id: "equilibrada", titulo: "¿Qué otra forma, más equilibrada, hay de ver lo que pasó?", ayuda: "Lo que le diría a una persona querida que lo viviera", ejemplo: "Puede estar ocupada o sin batería. Otras veces tardó y no era por mí" },
              { id: "ahora", titulo: "Al pensarlo así, ¿cómo se siente ahora, de 0 a 10?", ayuda: "0 = nada de malestar, 10 = muchísimo", ejemplo: "4" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "momento",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "mirando",
        titulo: "Mirando lo que escribí",
        intro:
          "Ahora mire juntos los momentos que escribió y observe si algo cambió entre lo que sentía al principio y lo que siente al final. Solo se trata de notar, no de convencerse de nada.",
        campos: [
          {
            id: "cambio",
            tipo: "parrafo",
            etiqueta: "Al comparar cómo se sentía antes y después, ¿qué notó?",
            ayuda: "Si el malestar no bajó, también sirve anotarlo.",
            ejemplo: "Bajó un poco, de 7 a 4. Me ayudó acordarme de que ya había pasado antes.",
          },
          {
            id: "se_repite",
            tipo: "parrafo",
            etiqueta: "¿Qué pensamientos se le repiten de un momento a otro?",
            ejemplo: "Casi siempre pienso que los demás se enojan conmigo.",
          },
          {
            id: "costo",
            tipo: "escala",
            etiqueta: "¿Qué tan difícil le resultó encontrar otra forma de ver lo que pasó?",
            extremos: ["0 = nada difícil", "10 = muy difícil"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos juntos sus registros, miraremos qué pensamientos se repiten y cómo cambió lo que sentía. Si alguna respuesta equilibrada no le sonó convincente, es normal: la afinaremos en la sesión.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 3.2 ============================ */
  {
    id: "3.2",
    etapa: 3,
    titulo: "Formas de pensar que nos atrapan",
    paraQue: "Reconocer las formas de pensar que más se repiten en usted y practicar con 2 o 3 pensamientos.",
    tiempo: "25 a 35 minutos",
    explicacion: [
      "Cuando estamos mal, la mente suele caer en ciertos «atajos» que hacen que las cosas se vean peores de lo que son. A todas las personas nos pasa; no significa que algo ande mal con usted. Reconocer el atajo ayuda a no tragarse el pensamiento completo.",
      "Estas son diez formas comunes, con un ejemplo y una pregunta que ayuda. Todo o nada: «Si no salió perfecto, fue un fracaso» (¿hay un punto medio?). Adivinar el futuro: «Seguro me va a ir mal en la entrevista» (¿cómo sé que va a pasar?). Leer la mente: «Se rio porque piensa que soy tonto» (¿qué sé de verdad de lo que pensó?). Ponerse etiquetas: «Soy un inútil» (¿qué hice en concreto?).",
      "Los «debería»: «Debería poder con todo sin cansarme» (¿quién dijo que es una regla?). Filtro negativo: fijarse solo en lo malo del día (¿qué más pasó?). Exagerar o catastrofizar: «Si llego tarde, me corren» (¿qué es lo más probable?). Tomarlo personal: «Ese mal gesto fue por mí» (¿habrá otra razón?). Razonar con la emoción: «Siento miedo, entonces hay peligro» (¿qué dicen los hechos?). Descalificar lo positivo: «Me felicitaron, pero fue por pura cortesía» (¿qué pasaría si fuera cierto?).",
      "En esta ficha va a reconocer las que usted usa más y a practicar con dos o tres pensamientos suyos. No hace falta que le acierte al nombre exacto: es una guía para pensar distinto, no un examen.",
    ],
    secciones: [
      {
        id: "mias",
        titulo: "Las formas de pensar que reconozco",
        intro:
          "Comencemos revisando la lista de formas de pensar que acaba de leer. Piense en las últimas semanas y marque las que le suenan familiares, sin juzgarse; casi todas las personas se reconocen en varias.",
        campos: [
          {
            id: "distorsiones",
            tipo: "casillas",
            etiqueta: "¿Cuáles de estas formas de pensar reconoce en usted?",
            ayuda: "Marque las que reconozca en usted. La pregunta que ayuda con cada una está en la explicación de arriba.",
            opciones: [
              "Todo o nada",
              "Adivinar el futuro",
              "Leer la mente",
              "Ponerse etiquetas",
              "Los «debería»",
              "Filtro negativo",
              "Exagerar o catastrofizar",
              "Tomarlo personal",
              "Razonar con la emoción",
              "Descalificar lo positivo",
            ],
            conOtra: true,
          },
          {
            id: "la_mas_comun",
            tipo: "parrafo",
            etiqueta: "De las que marcó, ¿cuál le pasa más seguido y cómo suena en su cabeza?",
            ejemplo: "Adivinar el futuro: antes de cada reunión pienso «seguro voy a quedar mal».",
          },
        ],
      },
      {
        id: "practica",
        titulo: "Practico con mis pensamientos",
        intro:
          "Ahora elija dos o tres pensamientos que le hayan pesado esta semana y pruebe a mirarlos con las preguntas de la lista. Es solo un ensayo: no tiene que creer la otra forma de verlo, basta con imaginarla.",
        campos: [
          {
            id: "practica",
            tipo: "tabla",
            etiqueta: "¿Qué forma de pensar hay detrás de cada pensamiento y cómo se podría ver de otra manera?",
            ayuda: "Escriba primero el pensamiento que más le pesó; los otros son opcionales.",
            columnas: [
              { id: "pensamiento", titulo: "¿Cuál es el pensamiento que le pesó?", ayuda: "Tal como se lo dijo a sí mismo", ejemplo: "Seguro me van a regañar por ese error" },
              { id: "forma", titulo: "¿Qué forma de pensar cree que es?", ayuda: "Puede ser más de una", ejemplo: "Adivinar el futuro y exagerar" },
              { id: "pregunta", titulo: "¿Qué pregunta de la lista le ayuda con este pensamiento?", ejemplo: "¿Qué es lo más probable que pase?" },
              { id: "otra", titulo: "¿Qué otra forma de verlo se le ocurre?", ejemplo: "Fue un error pequeño. Lo más probable es que me lo corrijan y ya" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "pensamiento",
            filaOpcionalDesde: 1,
          },
          {
            id: "convence",
            tipo: "escala",
            etiqueta: "De la otra forma de verlo que escribió, ¿cuánto le convence?",
            extremos: ["0 = nada", "10 = totalmente"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Veremos juntos cuáles formas de pensar le pasan más y practicaremos con sus propios ejemplos. No tiene que dejar de pensar así de un día para otro: primero se trata de reconocerlas.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 3.3 ============================ */
  {
    id: "3.3",
    etapa: 3,
    titulo: "Examinar las pruebas",
    paraQue: "Tomar un pensamiento que pesa, mirar las pruebas a favor y en contra y llegar a una idea más equilibrada.",
    tiempo: "25 a 35 minutos",
    explicacion: [
      "Cuando un pensamiento nos pesa mucho, solemos tratarlo como un hecho. Esta ficha propone otra cosa: tratarlo como una idea que se puede revisar, igual que un juez que escucha a las dos partes antes de decidir.",
      "Por ejemplo, alguien piensa: «Mi jefe está molesto conmigo». A favor: hoy no me saludó. En contra: ayer me felicitó por el informe y hoy llegó con prisa a una reunión. Al ponerlo así, la idea ya no se ve tan segura.",
      "Fíjese que las pruebas son hechos, cosas que se pueden ver, oír o comprobar, y no sentimientos. «Me siento un fracaso» no es una prueba; «reprobé un examen» sí lo es. Trabaje con un solo pensamiento a la vez, el que hoy más le pesa. No es necesario que el resultado sea positivo: busque lo más justo y lo más cercano a la realidad.",
    ],
    secciones: [
      {
        id: "pensamiento",
        titulo: "El pensamiento que me pesa",
        intro:
          "Comencemos eligiendo un solo pensamiento que le haya pesado últimamente. Escríbalo tal como le suena por dentro y ponga un número a cuánto se lo cree, para poder ver después si cambió.",
        campos: [
          {
            id: "pensamiento",
            tipo: "texto",
            etiqueta: "¿Cuál es el pensamiento que más le pesa hoy?",
            ayuda: "Una sola frase, tal como le cruza por la mente.",
            ejemplo: "Mi jefe está molesto conmigo",
          },
          {
            id: "situacion",
            tipo: "texto",
            etiqueta: "¿En qué situación apareció?",
            ejemplo: "Hoy en la oficina, cuando pasó sin saludarme",
          },
          {
            id: "cree_antes",
            tipo: "escala",
            etiqueta: "Antes de examinarlo, ¿cuánto se cree este pensamiento?",
            extremos: ["0 = nada", "10 = totalmente"],
          },
        ],
      },
      {
        id: "pruebas",
        titulo: "Lo que dicen los hechos",
        intro:
          "Ahora piense como un juez que escucha a las dos partes. Escriba solo hechos, lo que se pudo ver, oír o comprobar, primero lo que apoya el pensamiento y luego lo que no lo apoya.",
        campos: [
          {
            id: "a_favor",
            tipo: "lista",
            etiqueta: "¿Qué hechos apoyan este pensamiento?",
            ayuda: "Escriba uno por renglón. Recuerde: hechos, no sentimientos.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Hoy no me saludó; la semana pasada me corrigió un trabajo",
          },
          {
            id: "en_contra",
            tipo: "lista",
            etiqueta: "¿Qué hechos no apoyan este pensamiento, o lo contradicen?",
            ayuda:
              "Si no se le ocurre nada, pruebe con estas preguntas: ¿qué le diría a un amigo que pensara esto?, ¿hubo alguna vez en que no fue así?, ¿qué sabía yo en realidad, y qué estaba suponiendo?",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Ayer me felicitó por el informe; hoy llegó con prisa a una reunión",
          },
          {
            id: "otra_explicacion",
            tipo: "parrafo",
            etiqueta: "¿Hay otra explicación posible de lo que pasó?",
            ayuda: "Escriba una o dos explicaciones distintas, aunque no le parezcan las más probables.",
            ejemplo: "Iba apurado por la reunión y no me vio.",
          },
          {
            id: "peor_mejor",
            tipo: "parrafo",
            etiqueta: "¿Cuál sería lo peor, lo mejor y lo más probable que podría pasar?",
            ayuda: "Escriba las tres cosas, una tras otra.",
            ejemplo: "Lo peor: que sí esté molesto. Lo mejor: que no tenga nada que ver conmigo. Lo más probable: que esté estresado por su trabajo.",
          },
        ],
      },
      {
        id: "equilibrado",
        titulo: "Una forma más equilibrada de verlo",
        intro:
          "Para terminar, junte todo lo que escribió y busque una frase que tome en cuenta tanto lo que apoya como lo que contradice el pensamiento. Luego vuelva a medir cuánto le cree y cómo se siente.",
        campos: [
          {
            id: "equilibrado",
            tipo: "parrafo",
            etiqueta: "Tomando en cuenta todo lo anterior, ¿qué pensamiento más equilibrado podría escribir?",
            ayuda: "Que sea una frase que usted pueda creer, no una frase bonita.",
            ejemplo: "Puede que mi jefe esté apurado o estresado. Si sigo preocupado, puedo preguntarle con calma cómo va mi trabajo.",
          },
          {
            id: "cree_ahora",
            tipo: "escala",
            etiqueta: "Ahora, ¿cuánto se cree el pensamiento original?",
            extremos: ["0 = nada", "10 = totalmente"],
          },
          {
            id: "emocion_ahora",
            tipo: "texto",
            etiqueta: "¿Qué emoción siente ahora y qué tan fuerte es, de 0 a 10?",
            ejemplo: "Un poco de preocupación, 3",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos sus pruebas, veremos si hay hechos que faltó mirar y afinaremos la frase equilibrada. Si el pensamiento no cambió mucho, no significa que haya hecho algo mal: lo trabajaremos con calma.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 3.4 ============================ */
  {
    id: "3.4",
    etapa: 3,
    titulo: "Lo que sí controlo y lo que no",
    paraQue: "Separar una preocupación en lo que depende de usted, lo que influye en parte y lo que no, y dar un paso concreto.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Cuando algo nos preocupa, es común que todo se mezcle: lo que podemos hacer, lo que solo podemos influir y lo que simplemente no depende de nosotros. Al quedar todo junto, la mente da vueltas y el cuerpo se agota sin llegar a ninguna parte.",
      "Por ejemplo, una persona espera el resultado de unos exámenes médicos. Lo que depende de ella: ir a la cita, hacer las preguntas que tenga y cuidarse mientras tanto. Lo que influye en parte: descansar y comer bien, que ayudan a sentirse mejor pero no cambian el resultado. Lo que no depende de ella: lo que digan los exámenes.",
      "Separar así la preocupación permite poner la energía en lo que sí se puede mover y, para lo demás, aprender a soltar poco a poco. Soltar no es rendirse ni dejar de importarle: es aceptar que hay cosas que no se pueden controlar por más que uno les dé vueltas.",
    ],
    secciones: [
      {
        id: "preocupacion",
        titulo: "Lo que me preocupa",
        intro:
          "Comencemos eligiendo una preocupación que hoy le ronda la cabeza. Escríbala con sus palabras, y después piense qué parte de ella es suya, qué parte influye en parte y qué parte no depende de usted.",
        campos: [
          {
            id: "preocupacion",
            tipo: "parrafo",
            etiqueta: "¿Qué es lo que más le preocupa hoy?",
            ayuda: "Puede ser un problema concreto o un «y si…» sobre el futuro.",
            ejemplo: "Que me despidan en la próxima reducción de personal.",
          },
          {
            id: "tanto",
            tipo: "escala",
            etiqueta: "¿Cuánto le pesa esta preocupación hoy?",
            extremos: ["0 = nada", "10 = muchísimo"],
          },
        ],
      },
      {
        id: "control",
        titulo: "Lo que depende de mí y lo que no",
        intro:
          "Ahora separe la preocupación en tres partes. Piense con calma qué puede hacer usted, en qué solo puede influir y qué escapa a su control; con una o dos cosas en cada parte basta.",
        campos: [
          {
            id: "depende",
            tipo: "lista",
            etiqueta: "¿Qué depende de usted?",
            ayuda: "Lo que puede decidir o hacer usted mismo, aunque sea poco. Una cosa por renglón.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Entregar bien mi trabajo; actualizar mi hoja de vida",
          },
          {
            id: "influyo",
            tipo: "lista",
            etiqueta: "¿Qué puede influir en parte, sin controlarlo del todo?",
            ayuda: "Aquello donde su esfuerzo ayuda, pero la decisión final es de otros.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Llevarme bien con mi jefe; pedir opinión sobre mi desempeño",
          },
          {
            id: "no_depende",
            tipo: "lista",
            etiqueta: "¿Qué no depende de usted en absoluto?",
            ayuda: "Lo que, por más que lo piense, no puede cambiar hoy.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Lo que decida la empresa; la situación económica del país",
          },
        ],
      },
      {
        id: "paso",
        titulo: "Mi paso y mi forma de soltar",
        intro:
          "Para terminar, elija un paso pequeño y concreto sobre lo que sí depende de usted, y piense cómo va a soltar lo demás cuando la preocupación vuelva. No tiene que resolver todo esta semana; basta con un paso.",
        campos: [
          {
            id: "paso",
            tipo: "texto",
            etiqueta: "¿Qué paso concreto dará esta semana sobre lo que sí depende de usted?",
            ayuda: "Algo pequeño que pueda hacer de verdad, no un deseo general.",
            ejemplo: "Actualizar mi hoja de vida",
          },
          {
            id: "cuando",
            tipo: "texto",
            etiqueta: "¿Cuándo y dónde lo hará?",
            ayuda: "Un día y una hora aproximada.",
            ejemplo: "El jueves a las 7 de la noche, en la sala",
          },
          {
            id: "soltar",
            tipo: "casillas",
            etiqueta: "¿Cómo podría soltar lo que no controla, cuando la preocupación vuelva?",
            ayuda: "Marque las que le parezcan posibles; no tiene que usar todas.",
            opciones: [
              "Posponerla a un «tiempo de preocupación» (un rato fijo del día para pensar en ella)",
              "Volver la atención a lo que estoy haciendo en este momento",
              "Hablarlo con alguien de confianza",
              "Hacer unas respiraciones lentas",
              "Escribirlo y cerrar la libreta",
            ],
            conOtra: true,
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos qué puso en cada parte, veremos cómo le fue con el paso de la semana y ajustaremos la forma de soltar lo que no depende de usted. Si no logró dar el paso, lo conversamos sin reproches.",
      campos: [paraLaSesion],
    },
  },
];

export const fichaPorId = (id: string | null | undefined) => FICHAS.find((f) => f.id === id) ?? null;
export const esFichaId = (v: unknown): v is FichaId => typeof v === "string" && (FICHA_IDS as readonly string[]).includes(v);

/** Todos los campos de una ficha (secciones y cierre), en orden. */
export const camposDeFicha = (f: Ficha): Campo[] => [...f.secciones.flatMap((s) => s.campos), ...f.cierre.campos];
