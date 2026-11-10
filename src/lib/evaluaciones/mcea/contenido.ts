/**
 * Contenido del Mapa Cognitivo-Emocional Adaptativo (MCEA v1.0) del
 * M. A. Juan J. Reyes. Extraído del artefacto original
 * (docs/instrumentos/MCEA_v1.0_artefacto.html): no editar textos a mano.
 * PHQ-9, GAD-7 y PTQ son instrumentos validados de uso libre; PAN, DC, AS, RP
 * y FR son escalas originales (experimentales, sin normas); BR son preguntas
 * puente que deciden qué módulos se abren.
 */

export const MCEA_VERSION = "1.0";

export type EscalaRespuesta = "phq" | "f4" | "ptq";
export type ModuloId = "PHQ9" | "GAD7" | "BR" | "PAN" | "DC" | "PTQ" | "AS" | "RP" | "FR";
export type Instrumento = {
  name: string;
  kind: "val" | "exp" | "br";
  rs: EscalaRespuesta;
  better?: "low" | "high";
  max?: number;
  stem: string;
  items: string[];
  /** [desde, etiqueta, nivel 0–3] */
  bands?: [number, string, number][];
  src?: string;
  sub?: Record<string, number[]>;
  pat?: Record<string, string> | string[];
  names?: string[];
  defs?: string[];
};

export const RS: Record<EscalaRespuesta, string[]> = {
  "phq": [
    "Ningún día",
    "Varios días",
    "Más de la mitad de los días",
    "Casi todos los días"
  ],
  "f4": [
    "Nunca",
    "Rara vez",
    "A veces",
    "A menudo",
    "Casi siempre"
  ],
  "ptq": [
    "Nada",
    "Raramente",
    "A veces",
    "Frecuentemente",
    "Casi siempre"
  ]
};

export const INS: Record<ModuloId, Instrumento> = {
  "PHQ9": {
    "name": "PHQ-9 · Ánimo",
    "kind": "val",
    "rs": "phq",
    "better": "low",
    "max": 27,
    "stem": "Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado estos problemas?",
    "items": [
      "Poco interés o placer en hacer cosas",
      "Se ha sentido decaído(a), deprimido(a) o sin esperanzas",
      "Ha tenido dificultad para quedarse o permanecer dormido(a), o ha dormido demasiado",
      "Se ha sentido cansado(a) o con poca energía",
      "Sin apetito o ha comido en exceso",
      "Se ha sentido mal con usted mismo(a), o que es un fracaso o que ha quedado mal con usted mismo(a) o con su familia",
      "Ha tenido dificultad para concentrarse en ciertas actividades, tales como leer el periódico o ver la televisión",
      "¿Se ha movido o hablado tan lento que otras personas podrían haberlo notado? O lo contrario: muy inquieto(a) o agitado(a), moviéndose mucho más de lo normal",
      "Pensamientos de que estaría mejor muerto(a) o de lastimarse de alguna manera"
    ],
    "bands": [
      [
        0,
        "Mínima",
        0
      ],
      [
        5,
        "Leve",
        1
      ],
      [
        10,
        "Moderada",
        2
      ],
      [
        15,
        "Moderadamente grave",
        3
      ],
      [
        20,
        "Grave",
        3
      ]
    ],
    "src": "Kroenke, Spitzer y Williams (2001). Dominio público. Cortes 5/10/15/20."
  },
  "GAD7": {
    "name": "GAD-7 · Ansiedad",
    "kind": "val",
    "rs": "phq",
    "better": "low",
    "max": 21,
    "stem": "Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado estos problemas?",
    "items": [
      "Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta",
      "No ha sido capaz de parar o controlar su preocupación",
      "Se ha preocupado demasiado por motivos diferentes",
      "Ha tenido dificultad para relajarse",
      "Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)",
      "Se ha molestado o irritado fácilmente",
      "Ha tenido miedo de que algo terrible fuera a pasar"
    ],
    "bands": [
      [
        0,
        "Mínima",
        0
      ],
      [
        5,
        "Leve",
        1
      ],
      [
        10,
        "Moderada",
        2
      ],
      [
        15,
        "Grave",
        3
      ]
    ],
    "src": "Spitzer, Kroenke, Williams y Löwe (2006). Dominio público. Cortes 5/10/15."
  },
  "BR": {
    "name": "Preguntas puente",
    "kind": "br",
    "rs": "f4",
    "stem": "En las últimas 2 semanas, ¿con qué frecuencia le pasó esto?",
    "items": [
      "Me vienen a la mente pensamientos negativos sobre mí, sin que yo los busque.",
      "Cuando algo sale mal, lo primero que pienso es que es culpa mía o que siempre me pasa lo mismo.",
      "Le doy vueltas a lo mismo una y otra vez sin llegar a nada.",
      "Me cuesta soltar un pensamiento aunque quiera pensar en otra cosa.",
      "Dejo para después cosas importantes para mí, aunque sé que me perjudica.",
      "Cuando algo empieza a irme bien, termino haciendo algo que lo arruina o me alejo.",
      "Soy muy duro(a) conmigo cuando cometo un error.",
      "Me preocupa que mi pareja deje de quererme o me deje.",
      "En mis relaciones termino discutiendo, alejándome o desconfiando, aunque no quiera."
    ]
  },
  "PAN": {
    "name": "Pensamientos automáticos negativos",
    "kind": "exp",
    "rs": "f4",
    "better": "low",
    "max": 32,
    "stem": "En la última semana, ¿con qué frecuencia le pasaron por la mente pensamientos como este?",
    "items": [
      "«No soy suficiente.»",
      "«Todo me sale mal.»",
      "«Las cosas no van a mejorar.»",
      "«Le estoy fallando a la gente que me importa.»",
      "«Algo anda mal en mí.»",
      "«No voy a poder con esto.»",
      "«A nadie le importa realmente lo que me pasa.»",
      "«Para qué intentarlo, si igual no va a funcionar.»"
    ],
    "sub": {
      "Sobre sí mismo(a)": [
        1,
        5
      ],
      "Sobre su capacidad": [
        2,
        6
      ],
      "Sobre el futuro": [
        3,
        8
      ],
      "Sobre los demás": [
        4,
        7
      ]
    },
    "src": "Escala original MCEA v1.0. Experimental: sin validación ni normas."
  },
  "DC": {
    "name": "Formas de pensar (distorsiones)",
    "kind": "exp",
    "rs": "f4",
    "better": "low",
    "max": 40,
    "stem": "En las últimas 2 semanas, ¿con qué frecuencia le ocurrió esto?",
    "items": [
      "Si algo no me sale perfecto, siento que fue un fracaso total.",
      "Ante un problema, imagino de inmediato el peor desenlace posible.",
      "Doy por hecho que sé lo que otros piensan de mí, y casi siempre es algo malo.",
      "Cuando algo me sale mal una vez, concluyo que siempre me va a pasar.",
      "Me quedo enganchado(a) en un detalle negativo y dejo de ver lo demás.",
      "Cuando algo me sale bien, pienso que fue suerte o que no cuenta.",
      "Me siento responsable de cosas que en realidad no dependían de mí.",
      "Me exijo con reglas rígidas de cómo «debería» ser yo o cómo «deberían» ser los demás.",
      "Si siento que algo es cierto, lo doy por cierto aunque no tenga pruebas.",
      "Cuando fallo, me pongo etiquetas duras (por ejemplo «inútil» o «tonto(a)»)."
    ],
    "names": [
      "Todo o nada",
      "Catastrofismo",
      "Lectura de mente",
      "Sobregeneralización",
      "Filtro negativo",
      "Descontar lo positivo",
      "Personalización",
      "Los «debería»",
      "Razonamiento emocional",
      "Etiquetas"
    ],
    "defs": [
      "Ver las cosas en extremos: perfecto o fracaso, sin puntos intermedios.",
      "Saltar al peor desenlace posible como si fuera el más probable.",
      "Dar por hecho lo que otros piensan sin habérselo preguntado.",
      "Sacar una regla de «siempre» o «nunca» a partir de un solo hecho.",
      "Quedarse con el detalle negativo y perder de vista el resto.",
      "Restarle valor a lo que sale bien.",
      "Cargar con la culpa de cosas que no dependían de usted.",
      "Medirse con reglas rígidas que generan culpa o enojo.",
      "Tomar lo que siente como prueba de que algo es cierto.",
      "Definirse por completo con una palabra dura a partir de un error."
    ],
    "src": "Escala original MCEA v1.0. Experimental: sin validación ni normas."
  },
  "PTQ": {
    "name": "PTQ · Pensamiento repetitivo (rumiación)",
    "kind": "val",
    "rs": "ptq",
    "better": "low",
    "max": 60,
    "stem": "Indique en qué medida esta afirmación se aplica a usted cuando piensa acerca de experiencias negativas o problemas.",
    "items": [
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
    ],
    "bands": [
      [
        0,
        "Dentro de la referencia no clínica",
        0
      ],
      [
        23,
        "Algo elevado",
        1
      ],
      [
        30,
        "Elevado",
        2
      ],
      [
        37,
        "En el nivel de la media clínica de referencia",
        3
      ]
    ],
    "src": "Ehring et al. (2011). Versión en español de distribución libre (F. J. Ruiz, Konrad Lorenz). Medias de referencia: 22 no clínica, 37 clínica. Sin punto de corte oficial: bandas orientativas."
  },
  "AS": {
    "name": "Autosabotaje",
    "kind": "exp",
    "rs": "f4",
    "better": "low",
    "max": 48,
    "stem": "En el último mes, ¿con qué frecuencia le ocurrió esto?",
    "items": [
      "Dejo para el último momento tareas importantes, aunque tenga tiempo para hacerlas.",
      "Evito empezar algo que me importa por miedo a que no salga bien.",
      "Me distraigo con otras cosas justo cuando tengo que hacer lo que más me conviene.",
      "Cuando estoy cerca de lograr algo, pierdo el interés o lo abandono.",
      "Siento que no merezco que me vaya bien.",
      "Cuando las cosas van bien, espero que algo malo pase y actúo como si ya hubiera pasado.",
      "Me hablo con dureza cuando cometo un error.",
      "Me comparo con otras personas y salgo perdiendo.",
      "Me cuesta reconocer lo que hago bien.",
      "Si no puedo hacerlo perfecto, prefiero no hacerlo.",
      "Me pongo metas tan altas que casi nunca quedo satisfecho(a).",
      "Dejo proyectos sin terminar porque nunca me parecen suficientemente buenos."
    ],
    "sub": {
      "Postergar y evitar": [
        1,
        2,
        3
      ],
      "Frenarse cuando va bien": [
        4,
        5,
        6
      ],
      "Autocrítica": [
        7,
        8,
        9
      ],
      "Exigencia que paraliza": [
        10,
        11,
        12
      ]
    },
    "pat": {
      "Postergar y evitar": "Posterga o evita justo lo que más le importa. Suele ser una forma de protegerse del miedo a fallar y no una falta de voluntad.",
      "Frenarse cuando va bien": "Cuando algo empieza a salir bien aparece la duda de si lo merece o el temor de que se arruine, y eso le lleva a soltarlo.",
      "Autocrítica": "Se habla con mucha dureza. Esa voz crítica desgasta el ánimo y la confianza.",
      "Exigencia que paraliza": "Se pide tanto que empezar o terminar algo se vuelve muy difícil."
    },
    "src": "Escala original MCEA v1.0. Experimental: sin validación ni normas."
  },
  "RP": {
    "name": "Patrones en la relación de pareja",
    "kind": "exp",
    "rs": "f4",
    "better": "low",
    "max": 48,
    "stem": "Pensando en su relación actual o en la más reciente, ¿con qué frecuencia le ocurre esto?",
    "items": [
      "Me preocupa que mi pareja deje de quererme.",
      "Necesito que mi pareja me confirme con frecuencia que me quiere.",
      "Si mi pareja tarda en responderme, pienso que algo anda mal entre nosotros.",
      "Me cuesta confiar en lo que mi pareja me dice.",
      "Reviso o quisiera revisar el teléfono o las redes de mi pareja.",
      "Interpreto gestos pequeños como señales de que me oculta algo.",
      "Cuando mi pareja me señala algo, lo tomo como un ataque.",
      "En las discusiones digo cosas hirientes de las que luego me arrepiento.",
      "Me cuesta aceptar mi parte de responsabilidad en los problemas.",
      "Cuando la relación se vuelve más cercana, siento ganas de alejarme.",
      "Prefiero guardarme lo que siento antes que hablarlo con mi pareja.",
      "Pienso en terminar la relación antes de que me lastimen."
    ],
    "sub": {
      "Miedo a perder a la pareja": [
        1,
        2,
        3
      ],
      "Desconfianza": [
        4,
        5,
        6
      ],
      "Ponerse a la defensiva": [
        7,
        8,
        9
      ],
      "Tomar distancia": [
        10,
        11,
        12
      ]
    },
    "pat": {
      "Miedo a perder a la pareja": "El temor a que le dejen ocupa mucho espacio y le lleva a buscar confirmación constante.",
      "Desconfianza": "Le cuesta confiar, y la duda le empuja a vigilar o a interpretar señales pequeñas como amenazas.",
      "Ponerse a la defensiva": "Ante un señalamiento reacciona protegiéndose o atacando, y eso escala las discusiones.",
      "Tomar distancia": "Cuando la cercanía aumenta, se aleja o se guarda lo que siente para no salir lastimado(a)."
    },
    "src": "Escala original MCEA v1.0. Experimental: sin validación ni normas."
  },
  "FR": {
    "name": "Recursos personales",
    "kind": "exp",
    "rs": "f4",
    "better": "high",
    "max": 16,
    "stem": "En las últimas 2 semanas, ¿con qué frecuencia fue cierto esto para usted?",
    "items": [
      "Cuando me equivoco, puedo tratarme con comprensión.",
      "Tengo al menos una persona con quien puedo hablar de lo que me pasa.",
      "Cuando me siento mal, hay cosas que hago que me ayudan a sentirme mejor.",
      "Puedo notar cuando un pensamiento me está haciendo daño."
    ],
    "pat": [
      "Puede tratarse con comprensión cuando se equivoca.",
      "Cuenta con alguien con quien hablar de lo que le pasa.",
      "Tiene formas propias de ayudarse cuando se siente mal.",
      "Logra notar cuando un pensamiento le está haciendo daño."
    ],
    "src": "Escala original MCEA v1.0. Experimental: sin validación ni normas."
  }
};

export const FOCUS: [string, string][] = [
  [
    "nose",
    "No sé bien qué me pasa"
  ],
  [
    "animo",
    "Mi ánimo, me siento triste o sin ganas"
  ],
  [
    "ansiedad",
    "Nervios o preocupación"
  ],
  [
    "pensamientos",
    "Pensamientos que no me dejan en paz"
  ],
  [
    "pareja",
    "Mi relación de pareja"
  ],
  [
    "metas",
    "No avanzo en mis metas, trabajo o estudios"
  ]
];
export const EMO: string[] = [
  "Tristeza",
  "Ansiedad",
  "Enojo",
  "Culpa",
  "Vergüenza",
  "Miedo",
  "Celos",
  "Soledad",
  "Frustración",
  "Vacío"
];
export const BEH: string[] = [
  "Me aislé",
  "Discutí o reclamé",
  "Evité el tema",
  "Pospuse lo que tenía que hacer",
  "Le di vueltas por horas",
  "Revisé el teléfono o las redes",
  "Busqué que me tranquilizaran",
  "Comí, bebí o me distraje para no sentir",
  "Lo hablé con calma",
  "Hice algo que me ayudó"
];

/** Cambio mínimo fiable y punto de corte por escala (convenciones citadas en src). */
export const DEF_NORMS: Record<string, { mcf?: number; sd?: number; rel?: number; cut?: number; src: string }> = {
  "PHQ9": {
    "mcf": 6,
    "cut": 10,
    "src": "Convención NHS Talking Therapies: cambio fiable ≥6, caso ≥10"
  },
  "GAD7": {
    "mcf": 4,
    "cut": 8,
    "src": "Convención NHS Talking Therapies: cambio fiable ≥4, caso ≥8"
  },
  "PTQ": {
    "sd": 12,
    "rel": 0.9,
    "cut": 30,
    "src": "PROVISIONAL: DE y fiabilidad aproximadas; corte = punto medio entre medias de referencia (22 y 37). Sustituir por datos de validación o locales"
  }
};

/** Frases para el informe al paciente por nivel (0–3). */
export const PV: Record<"PHQ9" | "GAD7" | "PTQ" | "PAN", string[]> = {
  "PHQ9": [
    "Su ánimo se ve estable en estas dos semanas.",
    "Hay algunas señales de ánimo bajo, de intensidad leve.",
    "Su ánimo ha estado bajo de forma notoria y le está pesando en el día a día.",
    "Su ánimo ha estado muy bajo y le está afectando bastante. Es algo que conviene trabajar pronto."
  ],
  "GAD7": [
    "La preocupación y los nervios se mantienen en un nivel manejable.",
    "Hay algo de tensión o preocupación, de intensidad leve.",
    "La preocupación y la tensión han estado presentes buena parte del tiempo.",
    "La preocupación y la tensión han sido muy intensas en estas semanas."
  ],
  "PTQ": [
    "Su mente logra soltar los problemas la mayor parte del tiempo.",
    "A veces su mente se queda dando vueltas a los problemas.",
    "Su mente tiende a dar vueltas a lo mismo con frecuencia y le cuesta soltarlo. Esto cansa y suele bajar el ánimo.",
    "Darle vueltas a los problemas ocupa mucho de su tiempo y energía, y le deja poco espacio para lo demás."
  ],
  "PAN": [
    "Los pensamientos negativos sobre usted aparecen poco.",
    "A veces aparecen pensamientos negativos sobre usted o su futuro.",
    "Con frecuencia le llegan pensamientos negativos sobre usted, su capacidad o su futuro. Llegan solos y se sienten como verdades, aunque son interpretaciones.",
    "Los pensamientos negativos sobre usted aparecen casi todo el tiempo y pesan mucho en cómo se siente."
  ]
};

/** Líneas de ayuda en crisis (Guatemala). */
export const MCEA_CRISIS: string[] = [
  "Línea 1582 (ALMA, apoyo psicológico en crisis)",
  "Bomberos Voluntarios 122 · Bomberos Municipales 123",
  "Policía Nacional Civil 110"
];
