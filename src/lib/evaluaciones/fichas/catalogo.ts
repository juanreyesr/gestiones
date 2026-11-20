/**
 * Fichas terapéuticas JJR (TCC): catálogo declarativo y parte PARA EL PACIENTE
 * de cada ficha (lotes 1 a 4: etapas 1 «Evaluación y formulación», 2 «Psicoeducación», 3 «Técnicas cognitivas», 4 «Técnicas conductuales» y 5 «Prevención de recaídas»; biblioteca completa).
 * Especificación clínica: docs/instrumentos/Fichas_terapeuticas_JJR_especificacion.md
 *
 * Este archivo lo importa el formulario público (/evaluacion/<token>) y el
 * servidor: NO incluir aquí la parte «Para el terapeuta» (vive en otro archivo, solo
 * para el panel). Contenido original, redactado de usted, en español de Guatemala.
 * Sin imports en tiempo de ejecución.
 */

export const FICHA_IDS = ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4", "4.5", "5.1", "5.2", "5.3"] as const;
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
  /** Etapa del tratamiento (1 a 5; la biblioteca está completa). */
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

  /* ============================ 4.1 ============================ */
  {
    id: "4.1",
    etapa: 4,
    titulo: "Mi plan de actividades",
    paraQue: "Planear actividades pequeñas de gusto y de logro para la semana, anotar si las hizo y cómo cambió su ánimo.",
    tiempo: "20 a 30 minutos, más un registro breve cada día",
    explicacion: [
      "Cuando el ánimo está bajo, solemos esperar a «tener ganas» para hacer las cosas. Pero las ganas muchas veces llegan después de empezar, no antes. Por eso esta ficha propone otra regla: actuar según el plan y no según el ánimo del momento.",
      "Hay dos clases de actividades que conviene tener cada semana. Las de gusto (G) son las que se disfrutan, como tomar un café con una amiga o ver un partido con la familia. Las de logro (L) dan la sensación de haber hecho algo, como lavar la ropa, pagar el recibo de la luz o ir a hacer las compras al mercado. Una semana con las dos clases pesa distinto que una con solo obligaciones o con solo descanso.",
      "Por ejemplo, una persona sin ánimo planea para el martes caminar diez minutos después del almuerzo (G) y ordenar el escritorio (L). Antes de caminar su ánimo está en 3; al volver, en 4. Es un cambio pequeño, pero es información: le muestra que hacer algo sí mueve el ánimo, aunque sea poco.",
      "Empiece con actividades pequeñas, de 10 a 15 minutos. Si un día no logra hacer una, no es un fracaso: anótelo y vea qué se interpuso. Lo que importa es lo que va descubriendo, no cumplir todo.",
    ],
    secciones: [
      {
        id: "posibles",
        titulo: "Actividades posibles",
        intro:
          "Comencemos haciendo una lista de lo que podría hacer. Piense en cosas pequeñas que antes le daban gusto y en cosas que, al terminarlas, le dan la sensación de haber logrado algo; de aquí elegirá las de la semana.",
        campos: [
          {
            id: "gusto",
            tipo: "lista",
            etiqueta: "¿Qué actividades pequeñas le daban gusto, o podrían dárselo? (G)",
            ayuda: "Escriba una por renglón. Que sean cosas de pocos minutos y posibles de hacer esta semana.",
            minFilas: 2,
            maxFilas: 8,
            ejemplo: "Caminar diez minutos; llamar a mi hermana; escuchar música mientras cocino; tomar un café en el parque",
          },
          {
            id: "logro",
            tipo: "lista",
            etiqueta: "¿Qué actividades pequeñas le darían la sensación de haber logrado algo? (L)",
            ayuda: "Tareas que lleva tiempo posponiendo o que le dan tranquilidad cuando están hechas. Una por renglón.",
            minFilas: 2,
            maxFilas: 8,
            ejemplo: "Lavar los trastes; pagar el agua; contestar un mensaje pendiente; ordenar el escritorio",
          },
        ],
      },
      {
        id: "semana",
        titulo: "Mi semana",
        intro:
          "Ahora elija una actividad pequeña para cada día de la semana, mezclando las de gusto y las de logro. Anótela antes de hacerla y complete las otras columnas cuando termine cada día; si un día no la hizo, escríbalo igual.",
        campos: [
          {
            id: "plan",
            tipo: "tabla",
            etiqueta: "¿Qué planea hacer cada día y cómo le fue?",
            ayuda: "Primero llene solo la actividad y el tipo. Después, cada día, complete lo demás. Si un día no la hizo, escriba «no» y, si quiere, qué se interpuso.",
            columnas: [
              { id: "actividad", titulo: "¿Qué actividad planea hacer ese día?", ayuda: "Pequeña y concreta, de 10 a 15 minutos", ejemplo: "Caminar diez minutos después del almuerzo" },
              { id: "tipo", titulo: "¿Es de gusto (G) o de logro (L)?", ejemplo: "G" },
              { id: "hizo", titulo: "¿La hizo?", ayuda: "Escriba sí, a medias o no", ejemplo: "Sí" },
              { id: "antes", titulo: "¿Cómo estaba su ánimo antes de hacerla, de 0 a 10?", ayuda: "0 = muy bajo, 10 = muy bueno", ejemplo: "3" },
              { id: "despues", titulo: "¿Y cómo estuvo después, de 0 a 10?", ejemplo: "4" },
            ],
            filas: 7,
            maxFilas: 7,
            filasFijas: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
            etiquetaFila: "día",
            filaOpcionalDesde: 7,
          },
        ],
      },
      {
        id: "noto",
        titulo: "Lo que noté",
        intro:
          "Para terminar, mire la semana completa y observe qué pasó con su ánimo cuando hizo las actividades y cuando no las hizo. No se trata de calificarse, sino de descubrir qué le sirve.",
        campos: [
          {
            id: "noto",
            tipo: "parrafo",
            etiqueta: "Al mirar la semana, ¿qué notó en su ánimo después de hacer las actividades?",
            ayuda: "Compare el ánimo de antes y de después. Si no cambió, también sirve anotarlo.",
            ejemplo: "Casi siempre subió un punto o dos, sobre todo con las de gusto. Con las de logro me sentí más tranquilo.",
          },
          {
            id: "obstaculo",
            tipo: "parrafo",
            etiqueta: "¿Qué hizo más difícil hacer alguna actividad?",
            ejemplo: "El jueves llegué muy cansado y me quedé en el celular.",
          },
          {
            id: "ayudo_plan",
            tipo: "escala",
            etiqueta: "¿Cuánto le ayudó actuar según el plan, aunque no tuviera ganas?",
            extremos: ["0 = nada", "10 = muchísimo"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos qué actividades le subieron el ánimo y cuáles no, ajustaremos el plan de la próxima semana y pensaremos juntos qué hacer con lo que se interpuso. Si no pudo hacer varias, no hay reproche: nos sirve para hacerlas más pequeñas.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 4.2 ============================ */
  {
    id: "4.2",
    etapa: 4,
    titulo: "Respiración lenta y relajación",
    paraQue: "Aprender a respirar lento y a soltar la tensión de los músculos, y anotar cómo cambia su tensión cada día.",
    tiempo: "10 minutos al día durante una semana",
    explicacion: [
      "Cuando estamos tensos o con miedo, la respiración se acelera y los músculos se ponen duros, casi sin que lo notemos. Respirar despacio y soltar los músculos le avisa al cuerpo que puede bajar la guardia. Es una herramienta de calma; se aprende con práctica, como andar en bicicleta, y funciona mejor si se practica en momentos tranquilos, no solo cuando uno ya está mal.",
      "Respiración lenta, paso a paso. Siéntese cómodo, con la espalda apoyada y las manos sobre el abdomen. Inhale por la nariz contando hasta 4, de modo que el abdomen se infle suavemente. Haga una pausa corta y exhale despacio por la boca contando hasta 6, como si soplara una vela sin apagarla. Repita durante 5 minutos, a un ritmo de unas 6 respiraciones por minuto. Si contar hasta 4 y 6 le cuesta, empiece con 3 y 5: lo importante es que la exhalación sea más larga que la inhalación.",
      "Relajación muscular breve. Vaya por grupos: manos y brazos, cara y cuello, hombros y espalda, abdomen, piernas y pies. En cada grupo, apriete los músculos unos 5 segundos, sin dolor, y luego suéltelos de golpe y note cómo se siente la diferencia durante unos 15 a 20 segundos. Por ejemplo, cierre los puños con fuerza, cuente hasta 5, ábralos y deje las manos pesadas sobre las piernas. Haga el recorrido completo en unos 10 minutos.",
      "Dos avisos importantes. Si respirar lento le marea, le hormiguean las manos o siente más ansiedad, pare, respire normal y coméntelo con su psicólogo: se ajusta el ritmo. Y recuerde que esto sirve para calmar el cuerpo, no para evitar la ansiedad ni para escapar de lo que le da miedo: la ansiedad no es peligrosa, aunque se sienta fuerte.",
    ],
    secciones: [
      {
        id: "inicio",
        titulo: "Cuándo y dónde lo voy a practicar",
        intro:
          "Comencemos eligiendo un momento fijo del día para practicar. Piense en un rato en que pueda estar tranquilo y sin interrupciones, y en cuánta tensión siente hoy, para tener un punto de partida.",
        campos: [
          {
            id: "momento",
            tipo: "texto",
            etiqueta: "¿A qué hora del día practicará?",
            ayuda: "Un momento que pueda repetir cada día.",
            ejemplo: "A las 7 de la noche, después de la cena",
          },
          {
            id: "lugar",
            tipo: "texto",
            etiqueta: "¿Dónde lo hará?",
            ayuda: "Un lugar cómodo y donde nadie lo interrumpa.",
            ejemplo: "Sentado en mi cuarto, con el celular en silencio",
          },
          {
            id: "tension_hoy",
            tipo: "escala",
            etiqueta: "Hoy, antes de empezar, ¿cuánta tensión siente en el cuerpo?",
            extremos: ["0 = ninguna", "10 = muchísima"],
          },
        ],
      },
      {
        id: "practica",
        titulo: "Mi práctica de la semana",
        intro:
          "Ahora anote su práctica de cada día. Antes de empezar, califique su tensión; haga el ejercicio y, al terminar, vuelva a calificarla. Si un día no practicó, escríbalo igual, sin reproches.",
        campos: [
          {
            id: "registro",
            tipo: "tabla",
            etiqueta: "¿Cómo le fue con la práctica de cada día?",
            ayuda: "Si un día no practicó, escriba «no» en el ejercicio y, si quiere, qué se interpuso.",
            columnas: [
              { id: "ejercicio", titulo: "¿Qué ejercicio hizo?", ayuda: "Respiración, relajación de los músculos o ambos", ejemplo: "Respiración lenta" },
              { id: "minutos", titulo: "¿Cuántos minutos practicó?", ejemplo: "5" },
              { id: "antes", titulo: "¿Cuánta tensión sentía antes, de 0 a 10?", ayuda: "0 = ninguna, 10 = muchísima", ejemplo: "7" },
              { id: "despues", titulo: "¿Y cuánta sintió después, de 0 a 10?", ejemplo: "5" },
            ],
            filas: 7,
            maxFilas: 7,
            filasFijas: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
            etiquetaFila: "día",
            filaOpcionalDesde: 7,
          },
        ],
      },
      {
        id: "noto",
        titulo: "Lo que noté",
        intro:
          "Para terminar, mire la semana completa y observe qué efecto tuvo la práctica. Anote también cualquier molestia que haya sentido al practicar, porque eso nos sirve para ajustar el ejercicio.",
        campos: [
          {
            id: "efecto",
            tipo: "parrafo",
            etiqueta: "¿Qué notó en su cuerpo y en su ánimo al practicar?",
            ejemplo: "Los hombros se me aflojaban y dormí un poco mejor. Al principio me costaba concentrarme.",
          },
          {
            id: "molestia",
            tipo: "parrafo",
            etiqueta: "¿Se mareó, le hormiguearon las manos o sintió más ansiedad al respirar lento?",
            ayuda: "Si le pasó, pare y cuéntele a su psicólogo; se ajusta el ritmo.",
            ejemplo: "Un día me mareé un poco y respiré normal hasta que se me pasó.",
          },
          {
            id: "ayudo",
            tipo: "escala",
            etiqueta: "En general, ¿cuánto le ayudó a calmarse?",
            extremos: ["0 = nada", "10 = muchísimo"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos su registro, veremos qué ejercicio le sentó mejor y ajustaremos el ritmo si hizo falta. También conversaremos cuándo usarlo y cuándo no: sirve para calmar el cuerpo, no para huir de lo que le da miedo.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 4.3 ============================ */
  {
    id: "4.3",
    etapa: 4,
    titulo: "Tiempo de preocupación",
    paraQue: "Dejar las preocupaciones para un rato fijo del día y separar las que tienen solución de las que no.",
    tiempo: "20 minutos para prepararla, más un rato diario durante una semana",
    explicacion: [
      "Cuando algo nos preocupa, la mente suele darle vueltas a toda hora: en el bus, en el trabajo, en la cama. Esta ficha propone un acuerdo con la mente: «Ahora no; lo veo más tarde, en mi tiempo de preocupación». Así se aprende a no responder a cada preocupación en el momento en que aparece.",
      "El tiempo de preocupación es un rato fijo del día, de 15 a 20 minutos, a la misma hora y en el mismo lugar, y no justo antes de dormir. Durante el día, cuando llega una preocupación, solo se anota en una libreta, con unas pocas palabras, y se vuelve a lo que se estaba haciendo. No se intenta no pensar en ella; se pospone.",
      "Por ejemplo, una persona se preocupa en el trabajo por el pago de la tarjeta. Anota «tarjeta» en su libreta y sigue con su tarea. A las 5 de la tarde, en el comedor, revisa su lista. Para la tarjeta sí hay algo que hacer: llamar al banco mañana. Otra preocupación, «y si mi hijo se enferma», no tiene una acción posible hoy, y la deja ir con calma. Para muchas personas, al llegar la hora, algunas preocupaciones ya perdieron fuerza.",
    ],
    secciones: [
      {
        id: "acuerdo",
        titulo: "Mi tiempo de preocupación",
        intro:
          "Comencemos eligiendo cuándo y dónde será su tiempo de preocupación. Piense en un rato de la tarde o de la noche, lejos de la hora de dormir, en que pueda sentarse unos minutos a revisar su libreta.",
        campos: [
          {
            id: "hora",
            tipo: "texto",
            etiqueta: "¿A qué hora será su tiempo de preocupación?",
            ayuda: "La misma hora cada día y no justo antes de dormir.",
            ejemplo: "A las 5 de la tarde",
          },
          {
            id: "lugar",
            tipo: "texto",
            etiqueta: "¿En qué lugar lo hará?",
            ayuda: "Un lugar donde pueda sentarse con su libreta, que no sea la cama.",
            ejemplo: "En el comedor, con mi libreta",
          },
          {
            id: "duracion",
            tipo: "texto",
            etiqueta: "¿Cuánto tiempo le dedicará?",
            ayuda: "Entre 15 y 20 minutos; al terminar, se cierra la libreta.",
            ejemplo: "20 minutos, con la alarma del celular",
          },
        ],
      },
      {
        id: "dia",
        titulo: "Lo que me preocupó durante el día",
        intro:
          "Ahora, durante el día, cada vez que llegue una preocupación, anótela con pocas palabras y vuelva a lo que estaba haciendo. Al llegar su tiempo de preocupación, pase esas anotaciones a esta lista.",
        campos: [
          {
            id: "anotadas",
            tipo: "lista",
            etiqueta: "¿Qué preocupaciones anotó durante el día?",
            ayuda: "Una por renglón, con pocas palabras.",
            minFilas: 1,
            maxFilas: 10,
            ejemplo: "El pago de la tarjeta; que mi hijo se enferme; la reunión del jueves",
          },
        ],
      },
      {
        id: "revision",
        titulo: "La revisión en mi tiempo de preocupación",
        intro:
          "Ahora, en su tiempo de preocupación, revise una por una las preocupaciones de la lista. Pregúntese si hay algo que pueda hacer; si lo hay, elija el primer paso, y si no, vea si puede dejarla ir por hoy.",
        campos: [
          {
            id: "revision",
            tipo: "tabla",
            etiqueta: "¿Qué hará con cada preocupación?",
            ayuda: "Empiece por la primera preocupación; las demás son opcionales. Llene la columna que corresponda según su respuesta.",
            columnas: [
              { id: "preocupacion", titulo: "¿Cuál es la preocupación?", ejemplo: "El pago de la tarjeta" },
              { id: "solucion", titulo: "¿Tiene solución, es decir, hay algo que pueda hacer?", ayuda: "Escriba sí o no", ejemplo: "Sí" },
              { id: "paso", titulo: "Si la tiene, ¿cuál es el primer paso y cuándo lo hará?", ejemplo: "Llamar al banco mañana a las 9 de la mañana" },
              { id: "soltar", titulo: "Si no la tiene, ¿pudo soltarla por hoy?", ayuda: "Escriba sí, un poco o no, y qué le ayudó", ejemplo: "Un poco; respiré lento y volví a mi cena" },
            ],
            filas: 3,
            maxFilas: 8,
            generoFila: "f",
            etiquetaFila: "preocupación",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "balance",
        titulo: "Cómo me fue",
        intro:
          "Para terminar, piense en esta semana y observe qué cambió con el tiempo de preocupación. Anote también lo que le costó, porque eso nos ayuda a ajustar el acuerdo.",
        campos: [
          {
            id: "funciono",
            tipo: "escala",
            etiqueta: "¿Cuánto le funcionó dejar las preocupaciones para su tiempo de preocupación?",
            extremos: ["0 = nada", "10 = muchísimo"],
          },
          {
            id: "dificil",
            tipo: "parrafo",
            etiqueta: "¿Qué fue lo más difícil de esperar hasta ese momento?",
            ejemplo: "Me costó sobre todo en la noche, cuando me acostaba y me llegaban de golpe.",
          },
          {
            id: "notado",
            tipo: "parrafo",
            etiqueta: "¿Qué notó de las preocupaciones cuando llegó la hora de revisarlas?",
            ejemplo: "Varias ya no me parecían tan graves y de otras me di cuenta de que sí podía hacer algo.",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos su lista, veremos qué preocupaciones tenían solución y cuáles pudo soltar, y ajustaremos la hora o el lugar si hizo falta. Si le costó esperar, es normal: es una habilidad que se afina con la práctica.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 4.4 ============================ */
  {
    id: "4.4",
    etapa: 4,
    titulo: "Mi escalera de exposición",
    paraQue: "Armar con su psicólogo una escalera de pasos, de lo menos a lo más difícil, y registrar cada práctica guiada.",
    tiempo: "Una parte en sesión (30 a 40 minutos) y un registro breve después de cada práctica",
    explicacion: [
      "Esta ficha se arma junto con su psicólogo; no empiece los pasos por su cuenta. Primero se llena en sesión, y sus pasos se practican solo cuando su psicólogo lo indique y de la manera en que lo acuerden. Si por algún motivo quiere hacer algo antes, converse primero con él.",
      "Cuando algo nos da miedo, lo normal es evitarlo, y el alivio inmediato hace que el miedo crezca con el tiempo. Una escalera de exposición ordena lo que se evita en pasos pequeños, del que da menos malestar al que da más. Se sube de a un escalón a la vez, con apoyo, hasta que cada paso se siente más manejable.",
      "Por ejemplo, una persona evita viajar en camioneta desde que se sintió mal en una. Su escalera podría empezar por mirar una camioneta parada y llegar, poco a poco, a viajar varias paradas sola. Cada escalón se practica las veces que haga falta. Lo que se busca descubrir es que el malestar sube, llega a un máximo y baja, y que uno puede con él, aun sin hacer lo que antes hacía para sentirse seguro.",
      "Por eso también anotaremos las «conductas de seguridad»: cosas que hace para sentirse más seguro, como llevar siempre una botella de agua, sentarse junto a la puerta o revisar el teléfono una y otra vez. Con su psicólogo decidirán cuáles dejar y cuándo, poco a poco.",
    ],
    secciones: [
      {
        id: "escalera",
        titulo: "La armamos juntos en sesión",
        intro:
          "Comencemos con esta parte, que se llena junto con su psicólogo en la sesión. Hablen de qué le gustaría poder hacer sin miedo y ordenen, de menos a más difícil, los pasos para llegar ahí. Solo se escribe; los pasos no se practican hasta que su psicólogo lo indique.",
        campos: [
          {
            id: "meta",
            tipo: "parrafo",
            etiqueta: "¿Qué le gustaría poder hacer, al final, sin que el miedo se lo impida?",
            ayuda: "Una meta concreta, que se pueda ver. Se escribe junto con su psicólogo.",
            ejemplo: "Viajar en camioneta hasta mi trabajo, sola y sin bajarme antes de mi parada.",
          },
          {
            id: "escalones",
            tipo: "tabla",
            etiqueta: "¿Cuáles son los pasos de su escalera, ordenados de menos a más difícil?",
            ayuda:
              "Entre 6 y 10 pasos. Empiecen por uno que dé poco malestar y suban de a poco. Los pasos se escriben aquí, pero se practican solo cuando su psicólogo lo indique.",
            columnas: [
              { id: "paso", titulo: "¿Cuál es el paso?", ayuda: "Una situación concreta y específica", ejemplo: "Mirar una camioneta parada desde la banqueta" },
              { id: "malestar", titulo: "¿Cuánto malestar espera sentir, de 0 a 10?", ayuda: "0 = ninguno, 10 = el máximo", ejemplo: "2" },
            ],
            filas: 6,
            maxFilas: 10,
            etiquetaFila: "escalón",
            filaOpcionalDesde: 6,
          },
          {
            id: "seguridad",
            tipo: "lista",
            etiqueta: "¿Qué cosas hace para sentirse más seguro en esas situaciones?",
            ayuda: "Cosas que lleva, que hace o que evita para sentirse a salvo. Con su psicólogo decidirán cuáles dejar y cuándo. Una por renglón.",
            minFilas: 1,
            maxFilas: 8,
            ejemplo: "Llevar siempre agua; sentarme junto a la puerta; avisarle a mi mamá por mensaje en cuanto subo",
          },
        ],
      },
      {
        id: "practicas",
        titulo: "Mi registro de prácticas",
        intro:
          "Ahora, después de cada práctica que su psicólogo le indique, anote cómo le fue. Piense en cuánto malestar sintió al empezar, cuál fue el máximo y cuánto había al final, y en qué descubrió.",
        campos: [
          {
            id: "registro",
            tipo: "tabla",
            etiqueta: "¿Cómo le fue en cada práctica?",
            ayuda: "Llene una línea por cada práctica, después de hacerla con la indicación de su psicólogo.",
            columnas: [
              { id: "escalon", titulo: "¿Qué escalón practicó?", ejemplo: "El 1: mirar una camioneta parada" },
              { id: "fecha", titulo: "¿Qué día lo hizo?", ejemplo: "Miércoles 12" },
              { id: "inicio", titulo: "¿Cuánto malestar sintió al empezar, de 0 a 10?", ejemplo: "3" },
              { id: "maximo", titulo: "¿Cuál fue el máximo que sintió, de 0 a 10?", ejemplo: "5" },
              { id: "final", titulo: "¿Cuánto sentía al terminar, de 0 a 10?", ejemplo: "2" },
              { id: "aprendi", titulo: "¿Qué aprendió?", ayuda: "Algo que descubrió o notó", ejemplo: "El malestar subió y luego bajó solo, sin que yo hiciera nada." },
            ],
            filas: 3,
            maxFilas: 12,
            generoFila: "f",
            etiquetaFila: "práctica",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "balance",
        titulo: "Lo que fui notando",
        intro:
          "Para terminar, mire en conjunto sus prácticas y observe qué descubrió sobre el malestar y sobre usted. No se trata de calificarse: lo que le haya costado también es información útil para su psicólogo.",
        campos: [
          {
            id: "descubri",
            tipo: "parrafo",
            etiqueta: "Al mirar sus prácticas, ¿qué descubrió sobre el malestar?",
            ejemplo: "Que sube y baja, y que lo que temía no pasó.",
          },
          {
            id: "dificil",
            tipo: "parrafo",
            etiqueta: "¿Qué fue lo más difícil de las prácticas?",
            ejemplo: "El segundo escalón: casi me bajo, pero me quedé dos paradas más.",
          },
          {
            id: "confianza",
            tipo: "escala",
            etiqueta: "¿Cuánta confianza tiene hoy en poder seguir subiendo su escalera, con el apoyo de su psicólogo?",
            extremos: ["0 = ninguna", "10 = mucha"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos juntos su escalera y sus registros, veremos qué descubrió con cada práctica y decidiremos cuál es el siguiente escalón y cuándo. Los pasos siguen siendo en sesión o como lo acordemos: no avance por su cuenta.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 4.5 ============================ */
  {
    id: "4.5",
    etapa: 4,
    titulo: "Plan «si… entonces…»",
    paraQue: "Convertir una meta en planes concretos, con el momento y el lugar, y prever obstáculos con un plan B.",
    tiempo: "20 a 30 minutos",
    explicacion: [
      "Muchas veces sabemos qué queremos hacer y no lo hacemos porque, cuando llega el momento, no hay un plan claro. Un plan «si… entonces…» deja decidido de antemano cuándo y dónde lo va a hacer: «Si pasa tal cosa, entonces haré tal otra».",
      "Por ejemplo, quiere caminar más. En lugar de «voy a caminar más», escribe: «Si termino de almorzar entre semana, entonces camino diez minutos por la cuadra». La señal («terminar de almorzar») le recuerda la acción sin tener que pensarlo ni esperar a tener ganas. Mientras más concreto sea el «si», mejor.",
      "También ayuda pensar de antemano qué puede salir mal y qué hará en ese caso, es decir, tener un plan B. Por ejemplo: «Si llueve, entonces camino dentro de la casa, subiendo y bajando las gradas». Así un obstáculo no echa a perder el plan, solo lo cambia.",
    ],
    secciones: [
      {
        id: "meta",
        titulo: "Mi meta",
        intro:
          "Comencemos eligiendo una sola meta para las próximas semanas. Piense en algo que le importe y que sea posible de lograr con acciones pequeñas, y escríbalo de forma concreta.",
        campos: [
          {
            id: "meta",
            tipo: "texto",
            etiqueta: "¿Qué meta quiere lograr en las próximas semanas?",
            ayuda: "Algo concreto, que se pueda ver o contar.",
            ejemplo: "Caminar más durante la semana",
          },
          {
            id: "importa",
            tipo: "parrafo",
            etiqueta: "¿Por qué le importa esta meta?",
            ejemplo: "Me siento con más energía y de mejor ánimo cuando me muevo.",
          },
        ],
      },
      {
        id: "planes",
        titulo: "Mis planes «si… entonces…»",
        intro:
          "Ahora convierta la meta en tres planes concretos. En cada uno, escriba la situación que le avisará (qué pasa, cuándo y dónde) y lo que hará en ese momento, tan específico que no deje dudas.",
        campos: [
          {
            id: "planes",
            tipo: "tabla",
            etiqueta: "¿Cuáles son sus planes «si… entonces…»?",
            ayuda: "Empiece por el primer plan; los otros son opcionales. El «si» es una señal clara; el «entonces» es una acción pequeña.",
            columnas: [
              { id: "si", titulo: "Si… ¿cuál es la situación, cuándo y dónde?", ayuda: "Una señal que usted pueda reconocer", ejemplo: "Si termino de almorzar de lunes a viernes, en casa" },
              { id: "entonces", titulo: "Entonces… ¿qué haré?", ayuda: "Una acción concreta y pequeña", ejemplo: "Entonces me pongo los tenis y camino diez minutos por la cuadra" },
            ],
            filas: 3,
            maxFilas: 3,
            etiquetaFila: "plan",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "obstaculos",
        titulo: "Obstáculos y plan B",
        intro:
          "Piense ahora en lo que podría interponerse. Anote los obstáculos más probables y, para cada uno, un plan B también en la forma «si… entonces…»; así estará listo si ocurre.",
        campos: [
          {
            id: "obstaculos",
            tipo: "tabla",
            etiqueta: "¿Qué podría interponerse y qué haría en ese caso?",
            ayuda: "Empiece por el primer obstáculo; los otros son opcionales.",
            columnas: [
              { id: "obstaculo", titulo: "¿Qué podría impedirle cumplir el plan?", ejemplo: "Que llueva, o que llegue muy cansado" },
              { id: "planb", titulo: "Si eso pasa, ¿qué hará en su lugar?", ayuda: "Su plan B, en la forma «si… entonces…»", ejemplo: "Si llueve, entonces camino dentro de la casa, subiendo y bajando las gradas cinco minutos" },
            ],
            filas: 2,
            maxFilas: 4,
            etiquetaFila: "obstáculo",
            filaOpcionalDesde: 1,
          },
          {
            id: "confianza",
            tipo: "escala",
            etiqueta: "¿Cuánta confianza tiene en poder cumplir estos planes?",
            ayuda: "Si le parece un 6 o menos, conviene hacer el plan más pequeño o más claro.",
            extremos: ["0 = ninguna", "10 = mucha"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos sus planes, veremos si el «si» es lo bastante claro y si el «entonces» es lo bastante pequeño, y miraremos cómo le fue con los obstáculos. Si no cumplió algún plan, lo ajustamos sin reproches.",
      campos: [paraLaSesion],
    },
  },
  /* ============================ 5.1 ============================ */
  {
    id: "5.1",
    etapa: 5,
    titulo: "Mis señales de alerta",
    paraQue: "Reconocer sus señales tempranas y situaciones de riesgo, distinguir un tropiezo de una recaída y tener un semáforo con qué hacer en cada color.",
    tiempo: "25 a 35 minutos",
    explicacion: [
      "Llegar hasta esta etapa es un logro suyo: usted ya aprendió formas distintas de pensar, de actuar y de cuidarse. El tratamiento termina, pero lo aprendido se queda con usted. Esta ficha le ayuda a cuidar ese avance: aprender a reconocer a tiempo cuando algo empieza a moverse otra vez, para actuar antes de que crezca.",
      "Casi siempre hay señales tempranas, pequeñas y propias de cada persona. Por ejemplo, alguien nota que, cuando empieza a tener problemas, deja de contestar mensajes, duerme menos, se salta el desayuno y piensa «para qué intento». Ninguna de esas cosas es grave por sí sola, pero juntas avisan. Conocer sus señales es como conocer el cielo antes de la lluvia: no la evita, pero le da tiempo de abrir el paraguas.",
      "Tener un mal día, o una mala semana, no significa que todo se perdió. Un tropiezo es volver por un rato a un viejo hábito o a un malestar conocido, algo que le puede pasar a cualquiera, sobre todo en épocas de cansancio, pérdidas o mucha carga. Se vuelve una recaída cuando el malestar se instala y dura, y vuelve a afectar su vida diaria como al principio. Un tropiezo no borra lo que usted logró; es una oportunidad de usar lo aprendido.",
      "Por eso armará un semáforo propio: en verde, cómo es cuando está bien; en amarillo, qué señales le avisan y qué hará; y en rojo, qué hará si siente que se está hundiendo. En rojo no hay que esperar ni aguantar solo: busque ayuda de inmediato, con su psicólogo o con una persona de confianza. Y si aparecen ideas de hacerse daño, comuníquese enseguida con alguna de las líneas de ayuda de esta ficha.",
    ],
    secciones: [
      {
        id: "senales",
        titulo: "Mis señales tempranas",
        intro:
          "Comencemos recordando cómo era su malestar cuando empezaba, antes de ponerse fuerte. Piense en esos primeros días y marque lo que solía aparecer; con eso iremos armando su propia lista de señales.",
        campos: [
          {
            id: "pensamientos",
            tipo: "casillas",
            etiqueta: "¿Qué pensamientos solían aparecer primero?",
            ayuda: "Marque los que le suenen conocidos.",
            ejemplo: "«No voy a poder»",
            opciones: [
              "«No voy a poder con esto»",
              "«Todo va a salir mal»",
              "«Soy un fracaso»",
              "Preocuparme por todo, una y otra vez",
              "Darle vueltas a lo que pasó",
              "«Para qué intento»",
            ],
            conOtra: true,
          },
          {
            id: "emociones",
            tipo: "casillas",
            etiqueta: "¿Qué emociones solían subir primero?",
            ayuda: "Marque las que correspondan.",
            opciones: ["Nervios o miedo", "Tristeza", "Irritabilidad o enojo", "Culpa", "Desánimo o vacío", "Sentirme sin energía"],
            conOtra: true,
          },
          {
            id: "cuerpo",
            tipo: "casillas",
            etiqueta: "¿Qué cambios notaba en el cuerpo?",
            ayuda: "Marque los que correspondan.",
            opciones: ["Tensión en el cuello o la espalda", "Palpitaciones o falta de aire", "Dolor de cabeza", "Cansancio o pesadez", "Molestias en el estómago", "Dificultad para relajarme"],
            conOtra: true,
          },
          {
            id: "conductas",
            tipo: "casillas",
            etiqueta: "¿Qué cosas empezaba a hacer o a dejar de hacer?",
            ayuda: "Marque las que correspondan.",
            opciones: [
              "Evitar lugares o personas",
              "Aislarme o no contestar mensajes",
              "Dejar de hacer lo que me gusta",
              "Posponer tareas o compromisos",
              "Revisar o comprobar las cosas varias veces",
              "Buscar tranquilidad en otros una y otra vez",
            ],
            conOtra: true,
          },
          {
            id: "rutinas",
            tipo: "casillas",
            etiqueta: "¿Qué cambios notaba en sus rutinas, como el sueño y la comida?",
            ayuda: "Marque los que correspondan.",
            opciones: [
              "Dormir menos o despertar en la madrugada",
              "Dormir mucho y costarme levantarme",
              "Comer menos o saltarme comidas",
              "Comer más o comer a todas horas",
              "Dejar de moverme o de salir a caminar",
              "Descuidar mi aseo o mi casa",
            ],
            conOtra: true,
          },
          {
            id: "otras",
            tipo: "lista",
            etiqueta: "¿Qué otras señales suyas, que solo usted conoce, le avisaban?",
            ayuda: "Escriba una por renglón. A veces son detalles pequeños.",
            minFilas: 0,
            maxFilas: 6,
            ejemplo: "Dejo de regar las plantas; no contesto las llamadas de mi mamá",
          },
          {
            id: "primera_senal",
            tipo: "texto",
            etiqueta: "De todas, ¿cuál suele ser la primera en aparecer?",
            ayuda: "Esa es su señal más temprana; vale la pena vigilarla.",
            ejemplo: "Dormir menos de lo normal",
          },
        ],
      },
      {
        id: "riesgo",
        titulo: "Situaciones que me ponen a prueba",
        intro:
          "Ahora piense en los momentos o situaciones en que le resulta más difícil mantenerse bien. Conocerlos de antemano le permite prepararse en vez de sorprenderse.",
        campos: [
          {
            id: "situaciones",
            tipo: "lista",
            etiqueta: "¿Qué situaciones o épocas podrían ponerle a prueba en los próximos meses?",
            ayuda: "Piense en el trabajo, la familia, el dinero, la salud, las fechas difíciles o los cambios. Una por renglón.",
            minFilas: 1,
            maxFilas: 8,
            ejemplo: "Cierre de año en el trabajo; una discusión fuerte con mi hermano; quedarme sin dormir por varias noches",
          },
          {
            id: "la_vez_pasada",
            tipo: "parrafo",
            etiqueta: "Cuando una situación así se presentó antes, ¿qué fue lo que más le ayudó a salir adelante?",
            ayuda: "Piense también en lo que aprendió en este tratamiento.",
            ejemplo: "Salir a caminar, hablar con mi hermana y no quedarme dándole vueltas a lo mismo en la noche.",
          },
        ],
      },
      {
        id: "semaforo",
        titulo: "Mi semáforo",
        intro:
          "Para terminar, arme su semáforo. En cada color, escriba cómo se da cuenta, qué hará y a quién le avisará; una frase corta por casilla basta. Escríbalo cuando se sienta con calma, para tenerlo listo el día que lo necesite.",
        campos: [
          {
            id: "semaforo",
            tipo: "tabla",
            etiqueta: "¿Cómo se ve su semáforo?",
            ayuda:
              "En verde, anote cómo es cuando está bien. En amarillo, sus señales tempranas y lo que hará. En rojo, no espere ni aguante solo: busque ayuda de inmediato con su psicólogo o con una persona de confianza; si aparecen ideas de hacerse daño, comuníquese enseguida con una de las líneas de ayuda.",
            columnas: [
              {
                id: "como",
                titulo: "¿Cómo me doy cuenta?",
                ayuda: "Lo que pienso, siento o hago en ese color",
                ejemplo: "Verde: duermo bien, salgo a caminar. Amarillo: duermo menos y dejo de contestar mensajes. Rojo: no puedo levantarme y todo me parece sin salida",
              },
              {
                id: "hago",
                titulo: "¿Qué hago?",
                ayuda: "Una o dos acciones concretas",
                ejemplo: "Verde: sigo mi rutina. Amarillo: retomo mi plan de actividades y la respiración lenta. Rojo: llamo a mi psicólogo ese mismo día",
              },
              {
                id: "aviso",
                titulo: "¿A quién aviso?",
                ayuda: "Una persona de confianza o su psicólogo",
                ejemplo: "Verde: a nadie. Amarillo: a mi hermana. Rojo: a mi psicólogo y a mi hermana",
              },
            ],
            filas: 3,
            maxFilas: 3,
            filasFijas: ["Verde: estoy bien", "Amarillo: aparecen señales", "Rojo: necesito ayuda ya"],
            etiquetaFila: "color",
            filaOpcionalDesde: 3,
          },
          {
            id: "hoy",
            tipo: "escala",
            etiqueta: "Hoy, ¿cómo se siente en general?",
            ayuda: "Sirve de punto de comparación para los próximos meses.",
            extremos: ["0 = muy mal", "10 = muy bien"],
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos sus señales y su semáforo, y nos aseguraremos de que cada color tenga acciones posibles y personas a quienes avisar. Conversaremos también sobre la diferencia entre un tropiezo y una recaída, para que, si algún día se presenta uno, usted sepa qué hacer.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 5.2 ============================ */
  {
    id: "5.2",
    etapa: 5,
    titulo: "Mi caja de herramientas",
    paraQue: "Repasar lo aprendido: qué herramientas le sirvieron, cuándo usarlas, frases que le ayudan y personas de apoyo.",
    tiempo: "25 a 35 minutos",
    explicacion: [
      "A lo largo del tratamiento usted fue aprendiendo cosas que le sirven: formas de calmar el cuerpo, de revisar un pensamiento, de moverse cuando no hay ganas. Esta ficha las junta en una caja de herramientas propia, para que no se queden en la libreta ni en la memoria de la última sesión.",
      "Piense en un carpintero. No usa el martillo para todo: sabe qué herramienta sirve para cada trabajo. Igual con la suya. Por ejemplo, alguien descubre que la respiración lenta le sirve cuando siente el pecho apretado en la camioneta, y que el plan de actividades le sirve cuando amanece sin ganas. Saber cuál usar y cuándo es lo que hace que las herramientas funcionen.",
      "La caja también incluye cosas que no se aprenden en una ficha: las frases que le dan fuerza y las personas que le hacen bien. Pedir apoyo no es un fracaso ni una carga para los demás; es una de las herramientas más útiles que existen. Y si un día se le olvida usarla o no le funciona a la primera, no se pierde nada: se vuelve a la caja y se prueba otra.",
    ],
    secciones: [
      {
        id: "herramientas",
        titulo: "Lo que aprendí",
        intro:
          "Comencemos repasando lo que trabajó en este tiempo. Recuerde las técnicas o ejercicios que le ayudaron, aunque fuera un poco, y anote para qué le sirven y en qué momento los usaría.",
        campos: [
          {
            id: "herramientas",
            tipo: "tabla",
            etiqueta: "¿Qué herramientas aprendió que le sirvieron?",
            ayuda:
              "Puede incluir cosas como el registro de pensamientos, el plan de actividades, la respiración lenta, el tiempo de preocupación, examinar las pruebas o la escalera. Empiece por la que más le ayudó; las demás son opcionales.",
            columnas: [
              { id: "herramienta", titulo: "¿Cuál es la herramienta?", ayuda: "Su nombre o cómo la llama usted", ejemplo: "Respiración lenta" },
              { id: "sirve", titulo: "¿Para qué me sirve?", ayuda: "Lo que logra con ella", ejemplo: "Me calma el cuerpo cuando siento el pecho apretado" },
              { id: "cuando", titulo: "¿Cuándo la voy a usar?", ayuda: "La señal o el momento", ejemplo: "Cuando note que se me acelera el corazón antes de una reunión" },
            ],
            filas: 3,
            maxFilas: 8,
            etiquetaFila: "herramienta",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
          {
            id: "mas_ayudo",
            tipo: "texto",
            etiqueta: "De todas, ¿cuál es la que más le ha ayudado?",
            ejemplo: "El plan de actividades",
          },
        ],
      },
      {
        id: "frases",
        titulo: "Frases y personas que me ayudan",
        intro:
          "Ahora piense en lo que le da fuerza en los momentos difíciles. Escriba las frases que le sirven y las personas con quienes puede contar; así las tendrá a la mano cuando las necesite.",
        campos: [
          {
            id: "frases",
            tipo: "lista",
            etiqueta: "¿Qué frases le ayudan cuando la cosa se pone difícil?",
            ayuda: "Frases que se diría a sí mismo o que le dijo alguien. Una por renglón.",
            minFilas: 1,
            maxFilas: 6,
            ejemplo: "Un mal día no es una mala vida; Ya salí de esto antes; Paso a paso",
          },
          {
            id: "personas",
            tipo: "tabla",
            etiqueta: "¿Con qué personas puede contar y cómo se comunicaría con ellas?",
            ayuda: "Escriba primero a la persona en quien más confía; las otras son opcionales.",
            columnas: [
              { id: "persona", titulo: "¿Quién es?", ayuda: "Nombre y cómo localizarla", ejemplo: "Mi hermana Lucía, por WhatsApp o llamándola" },
              { id: "ayuda", titulo: "¿Cómo me ayuda?", ejemplo: "Me escucha sin juzgarme y me anima a salir a caminar" },
            ],
            filas: 2,
            maxFilas: 5,
            etiquetaFila: "persona",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "confianza",
        titulo: "Mi confianza para seguir solo",
        intro:
          "Para terminar, mire su caja completa y piense en cómo se siente al usarla por su cuenta. No hay un número ideal: nos sirve para saber qué podemos reforzar juntos.",
        campos: [
          {
            id: "confianza",
            tipo: "escala",
            etiqueta: "¿Cuánta confianza tiene en poder usar su caja de herramientas por su cuenta?",
            ayuda: "Si le parece un 6 o menos, lo conversamos: quizá falta practicar alguna herramienta.",
            extremos: ["0 = ninguna", "10 = mucha"],
          },
          {
            id: "falta",
            tipo: "parrafo",
            etiqueta: "¿Qué herramienta le gustaría practicar más antes de seguir por su cuenta?",
            ejemplo: "Me gustaría practicar más el registro de pensamientos, porque a veces se me olvida usarlo.",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos su caja de herramientas, veremos si falta alguna o si conviene practicar más alguna de ellas, y conversaremos sobre las personas de apoyo que anotó. Si hay una herramienta que no le convenció, lo vemos con calma.",
      campos: [paraLaSesion],
    },
  },

  /* ============================ 5.3 ============================ */
  {
    id: "5.3",
    etapa: 5,
    titulo: "Mi plan de mantenimiento",
    paraQue: "Dejar por escrito su plan para los próximos meses: hábitos, práctica, metas nuevas, cómo revisarse y cuándo pedir una cita de refuerzo.",
    tiempo: "30 a 40 minutos",
    explicacion: [
      "Terminar el tratamiento no significa dejar de cuidarse: significa que ahora usted sabe cómo hacerlo. Esta ficha reúne todo en un plan escrito para los próximos meses, de modo que lo que logró siga creciendo y no dependa de la memoria ni del ánimo del día.",
      "Piense en alguien que hizo un curso de primeros auxilios o aprendió a manejar. Si no practica, con el tiempo se le olvida; si repasa un poco cada semana, se le queda. Con el bienestar pasa algo parecido. Por ejemplo, una persona decide mantener sus caminatas, repasar el domingo cómo le fue en la semana y anotar una meta nueva cada mes. Son cosas pequeñas, pero sostenidas.",
      "El plan también deja decidido de antemano qué hacer si aparecen señales y cuándo pedir una cita de refuerzo. Pedirla no significa que fracasó ni que empezó de nuevo: es parte del plan, como una revisión para que todo siga en buen estado. Y la carta que escribirá al final es para usted: un recordatorio, con sus propias palabras, de lo que ya logró y de que puede volver a lograrlo.",
    ],
    secciones: [
      {
        id: "habitos",
        titulo: "Lo que voy a mantener",
        intro:
          "Comencemos por lo que ya le está funcionando. Piense en los hábitos y prácticas de estos meses que quiere conservar, y decida cómo los hará parte de su semana.",
        campos: [
          {
            id: "habitos",
            tipo: "lista",
            etiqueta: "¿Qué hábitos de los que ha logrado quiere mantener?",
            ayuda: "Piense en el sueño, el movimiento, la comida, el tiempo con otras personas o las herramientas de su caja. Uno por renglón.",
            minFilas: 1,
            maxFilas: 8,
            ejemplo: "Salir a caminar tres tardes por semana; acostarme a la misma hora; llamar a mi hermana los domingos",
          },
          {
            id: "practica",
            tipo: "tabla",
            etiqueta: "¿Qué práctica hará cada semana y cuándo?",
            ayuda: "Escriba primero la práctica más importante; las otras son opcionales. Indique el día o los días en que la hará.",
            columnas: [
              { id: "que", titulo: "¿Qué hará?", ayuda: "Una práctica concreta", ejemplo: "Repasar cómo me fue en la semana y anotar mis señales" },
              { id: "cuando", titulo: "¿Qué días y a qué hora?", ejemplo: "Los domingos a las 7 de la noche, en la sala" },
            ],
            filas: 2,
            maxFilas: 5,
            etiquetaFila: "práctica",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "metas",
        titulo: "Mis metas para los próximos meses",
        intro:
          "Ahora mire hacia adelante. Piense en lo que le gustaría lograr en los próximos meses, ya con el problema más tranquilo, y dé el primer paso de cada meta con una fecha.",
        campos: [
          {
            id: "metas",
            tipo: "tabla",
            etiqueta: "¿Qué metas nuevas le gustaría lograr?",
            ayuda: "Escriba primero la más importante; las otras son opcionales. Mejor pocas y claras.",
            columnas: [
              { id: "meta", titulo: "¿Cuál es la meta?", ayuda: "Algo concreto, que se pueda ver", ejemplo: "Retomar mis clases de pintura" },
              { id: "paso", titulo: "¿Cuál es el primer paso?", ayuda: "Algo pequeño que pueda hacer pronto", ejemplo: "Preguntar por los horarios del curso" },
              { id: "fecha", titulo: "¿Para cuándo?", ejemplo: "Antes de que termine este mes" },
            ],
            filas: 2,
            maxFilas: 4,
            etiquetaFila: "meta",
            generoFila: "f",
            filaOpcionalDesde: 1,
          },
        ],
      },
      {
        id: "revision",
        titulo: "Cómo me voy a revisar",
        intro:
          "Piense ahora en cómo se va a dar cuenta de que sigue bien. Una revisión breve y regular, hecha con calma, le permite notar los cambios temprano y actuar a tiempo.",
        campos: [
          {
            id: "cada_cuanto",
            tipo: "casillas",
            etiqueta: "¿Cada cuánto se va a revisar?",
            ayuda: "Marque la que le parezca posible de sostener.",
            opciones: ["Cada semana", "Cada dos semanas", "Cada mes"],
            conOtra: true,
          },
          {
            id: "que_miro",
            tipo: "parrafo",
            etiqueta: "¿Qué va a mirar en cada revisión?",
            ayuda: "Sus señales tempranas, su semáforo, su sueño, su ánimo y si está haciendo lo que planeó.",
            ejemplo: "Cómo dormí, si salí a caminar, si aparecieron mis señales amarillas y cómo me sentí de ánimo.",
          },
          {
            id: "como_estoy",
            tipo: "escala",
            etiqueta: "Hoy, ¿cómo está su bienestar en general?",
            ayuda: "Este número será su punto de partida: en cada revisión podrá comparar.",
            extremos: ["0 = muy mal", "10 = muy bien"],
          },
          {
            id: "si_senales",
            tipo: "parrafo",
            etiqueta: "Si aparecen señales amarillas, ¿qué hará?",
            ayuda: "Retome lo que escribió en su semáforo (ficha 5.1) y en su caja de herramientas (ficha 5.2).",
            ejemplo: "Retomo mi plan de actividades, hago respiración lenta y le aviso a mi hermana. Si pasan unos días y sigo igual, escribo a mi psicólogo.",
          },
        ],
      },
      {
        id: "refuerzo",
        titulo: "Cuándo pediré una cita de refuerzo",
        intro:
          "Elija ahora, con calma, en qué casos pedirá una cita de refuerzo con su psicólogo. Dejarlo definido de antemano evita esperar demasiado cuando las cosas se complican.",
        campos: [
          {
            id: "cita_refuerzo",
            tipo: "casillas",
            etiqueta: "¿En qué casos pedirá una cita de refuerzo?",
            ayuda: "Marque todos los que correspondan. Pedirla es parte del plan, no una señal de fracaso.",
            opciones: [
              "Si las señales amarillas duran más de dos semanas",
              "Si llego a rojo",
              "En una fecha acordada con mi psicólogo",
            ],
            conOtra: true,
          },
          {
            id: "fecha_refuerzo",
            tipo: "texto",
            etiqueta: "Si ya lo acordaron, ¿en qué fecha o en cuánto tiempo será la cita de refuerzo?",
            ejemplo: "Dentro de tres meses",
          },
        ],
      },
      {
        id: "carta",
        titulo: "Una carta para mí",
        intro:
          "Para terminar, escríbase una carta corta para un día difícil. Recuerde lo que logró, lo que aprendió y lo que le ayuda; léala cuando sienta que todo se le viene encima.",
        campos: [
          {
            id: "carta",
            tipo: "parrafo",
            etiqueta: "¿Qué le diría a usted mismo en un momento difícil?",
            ayuda: "Escríbale como se lo diría a alguien a quien quiere. Puede recordarse lo que ya logró y lo que sabe hacer.",
            ejemplo: "Ya salí de esto antes y puedo volver a hacerlo. Un mal día no borra lo que logré. Voy a respirar despacio, usar mi caja de herramientas y avisarle a mi hermana.",
          },
        ],
      },
    ],
    cierre: {
      titulo: CIERRE_TITULO,
      texto:
        "Revisaremos su plan completo, lo ajustaremos para que sea posible de sostener y acordaremos cuándo y cómo seguirá en contacto conmigo. El tratamiento termina, pero lo que aprendió queda con usted.",
      campos: [paraLaSesion],
    },
  },

];

export const fichaPorId = (id: string | null | undefined) => FICHAS.find((f) => f.id === id) ?? null;
export const esFichaId = (v: unknown): v is FichaId => typeof v === "string" && (FICHA_IDS as readonly string[]).includes(v);

/** Todos los campos de una ficha (secciones y cierre), en orden. */
export const camposDeFicha = (f: Ficha): Campo[] => [...f.secciones.flatMap((s) => s.campos), ...f.cierre.campos];
