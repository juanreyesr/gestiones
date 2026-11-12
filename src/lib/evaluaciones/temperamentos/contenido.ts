/**
 * Cuestionario de temperamento · versión JJ: contenido interpretativo (texto
 * original). SOLO panel del psicólogo y servidor: el formulario público NO debe
 * importar este archivo (quien responde no ve nombres ni interpretaciones).
 *
 * Los textos están redactados de usted, tal como los lee el paciente en su
 * informe; el informe profesional los reproduce con esa misma redacción.
 */
import type { TemperamentoId } from "./escalas";

export type InfoTemperamento = {
  nombre: string;
  /** Lectura en dos dimensiones (extraversión y estabilidad emocional). */
  dimensiones: string;
  resumen: string;
  caracteristicas: string[];
  fortalezas: string[];
  cuidar: string[];
  /** Señales tempranas a las que conviene estar atento en uno mismo («Cuando note que…»). */
  observar: string[];
  /** Formas concretas de sacar provecho de los puntos fuertes. */
  aprovechar: string[];
  relaciones: string;
  trabajo: string;
  estres: string;
  crecer: string[];
  /** Solo para el profesional. */
  terapia: { alianza: string; ritmo: string; tareas: string; riesgos: string };
};

export const TEMPERAMENTOS_INFO: Record<TemperamentoId, InfoTemperamento> = {
  S: {
    nombre: "Sanguíneo",
    dimensiones: "Hacia afuera y de reacción serena (extravertido y estable).",
    resumen:
      "Su manera de vivir se dirige hacia afuera: se acerca a las personas con naturalidad, contagia entusiasmo y suele ver el lado luminoso de las situaciones. Reacciona con serenidad ante lo que pasa y su ánimo cambia con rapidez, lo que le permite recuperarse pronto de los tropiezos. Aprende y se activa en contacto con la gente, y los espacios compartidos suelen ser donde mejor se siente. Su punto delicado es la constancia: cuando una tarea deja de ser novedosa, le cuesta sostener el esfuerzo y a veces promete más de lo que puede cumplir. Bien encauzado, su temperamento es una fuente de ánimo para usted y para quienes lo rodean.",
    caracteristicas: [
      "Se relaciona con facilidad y disfruta estar acompañado.",
      "Expresa abiertamente lo que siente y lo que piensa.",
      "Se entusiasma con ideas y proyectos nuevos.",
      "Tiende al optimismo y al buen humor, incluso en momentos difíciles.",
      "Vive intensamente el presente y se adapta a lo imprevisto.",
      "Su atención salta con facilidad de un tema a otro.",
      "Se recupera pronto de las contrariedades y suele perdonar sin guardar rencor.",
      "Cuenta lo que le pasa con gracia y suele ser quien rompe el hielo en un grupo.",
      "Prefiere decidir sobre la marcha que planificar con anticipación.",
    ],
    fortalezas: [
      "Genera confianza y cercanía en poco tiempo.",
      "Anima a los demás y suele levantar el ánimo de un grupo.",
      "Comunica con naturalidad sus ideas y sus emociones.",
      "Tiene flexibilidad para adaptarse a cambios y a personas distintas.",
      "Se atreve a empezar cosas nuevas sin paralizarse por el miedo.",
      "Se repone pronto de los tropiezos y ayuda a otros a hacerlo.",
      "Conecta a unas personas con otras con facilidad y ayuda a formar equipos.",
      "Aporta creatividad y frescura cuando un grupo se estanca en lo de siempre.",
    ],
    cuidar: [
      "Terminar lo que empieza, aun cuando la novedad ya pasó.",
      "Cumplir con horarios, citas y compromisos (apoyarse en una agenda o en recordatorios).",
      "Dar espacio a los demás en las conversaciones y escuchar hasta el final.",
      "Medir antes de prometer, para no ofrecer más de lo que puede cumplir.",
      "Profundizar en los temas y en sus propias emociones, sin quedarse en la superficie.",
      "Cuidar los gastos y las decisiones que se toman por el impulso del momento.",
      "Los cambios de ánimo rápidos, que a veces hacen pensar que no toma en serio lo que otros sienten.",
      "Que la necesidad de aprobación decida por usted: querer caer bien a todos puede llevarlo a decir que sí cuando piensa que no.",
    ],
    observar: [
      "Cuando note que acepta un compromiso solo por quedar bien, deténgase y pregúntese si de verdad podrá cumplirlo.",
      "Cuando note que lleva varios proyectos empezados y ninguno terminado, es señal de que conviene cerrar uno antes de abrir otro.",
      "Cuando note que usted habla mucho y los demás callan, haga una pregunta y deje un silencio para que respondan.",
      "Cuando note que usa el humor o la distracción para evitar un tema que le incomoda, pregúntese qué hay detrás.",
      "Cuando note que gasta, promete o decide por el entusiasmo del momento, espere un día antes de confirmar.",
    ],
    aprovechar: [
      "Use su facilidad para relacionarse para abrir puertas: presente personas, organice encuentros y mantenga vivos los contactos.",
      "Ponga su entusiasmo al servicio de arrancar proyectos y de motivar a otros, y pida a alguien más metódico que le ayude a darles seguimiento.",
      "Aproveche su recuperación rápida para ayudar a un grupo a levantarse después de un tropiezo.",
      "Elija actividades con variedad y contacto con personas, donde su energía sea una ventaja y no un problema.",
      "Use su capacidad de comunicar para explicar ideas, enseñar o representar al equipo, y prepare lo esencial para que la gracia vaya acompañada de contenido.",
    ],
    relaciones:
      "Suele ser una persona cálida y de buena compañía; los demás valoran su alegría y su apertura. Para que los vínculos se profundicen, ayuda cumplir lo prometido, recordar las fechas importantes y dedicar tiempo a escuchar con atención, sobre todo cuando alguien necesita ser escuchado más que animado.",
    trabajo:
      "Rinde mejor en tareas variadas, con contacto con personas y espacio para proponer ideas. Le cuestan las labores muy repetitivas o que exigen largos períodos de detalle. Le sirve dividir los proyectos en metas cortas, usar listas y trabajar junto a alguien que le ayude a dar seguimiento.",
    estres:
      "Bajo presión puede volverse más disperso, hablar más rápido, comprometerse con demasiadas cosas o buscar distracción para no enfrentar lo que le pesa. Cuando el cansancio se acumula, puede mostrarse irritable o desanimarse de repente. Detenerse a priorizar y descansar bien le ayuda a recuperar el rumbo.",
    crecer: [
      "Elija cada semana una o dos prioridades y llévelas hasta el final antes de empezar algo nuevo.",
      "Anote sus compromisos en un solo lugar y revíselo todos los días.",
      "Practique escuchar sin interrumpir: espere a que la otra persona termine y pregunte antes de opinar.",
      "Reserve unos minutos al día para pensar cómo se siente, sin ruido ni pantallas.",
    ],
    terapia: {
      alianza:
        "El vínculo se establece rápido y con calidez; suele sentirse cómodo y hablar con soltura. Cuidar que la facilidad para conversar no sustituya el trabajo de fondo ni sirva para evitar los temas dolorosos.",
      ritmo:
        "Sesiones dinámicas y con variedad; retomar con frecuencia el hilo central porque tiende a saltar de un tema a otro. Resumir al final de cada sesión.",
      tareas:
        "Tareas breves, concretas y con recordatorio (mensaje, agenda); los registros muy extensos suelen abandonarse. Reforzar cada avance, por pequeño que sea.",
      riesgos:
        "Abandono del tratamiento cuando mejora el ánimo o aparece una novedad; inasistencia o impuntualidad; minimización de los síntomas con humor; impulsividad (gastos, consumo, decisiones afectivas). Explorar con cuidado cuando la alegría oculta tristeza.",
    },
  },
  C: {
    nombre: "Colérico",
    dimensiones: "Hacia afuera y de reacción intensa (extravertido y reactivo).",
    resumen:
      "Su energía se dirige hacia afuera con determinación: le gusta tener metas claras, actuar y ver resultados. Reacciona con intensidad y rapidez ante los problemas, lo que le da fuerza para enfrentarlos y para decidir cuando otros dudan. Suele asumir la dirección de un grupo casi sin proponérselo, porque transmite seguridad y sentido práctico. Su punto delicado es la impaciencia: la lentitud, los rodeos o los errores ajenos pueden sacarlo de balance y llevarlo a un tono más duro del que quisiera. Cuando aprende a escuchar y a reconocer a los demás, su fuerza se convierte en un liderazgo en el que otros confían.",
    caracteristicas: [
      "Se fija metas y se esfuerza hasta alcanzarlas.",
      "Decide con rapidez y prefiere actuar a esperar.",
      "Toma la iniciativa y asume con naturalidad la dirección de un grupo.",
      "Es práctico y va directo al punto.",
      "Tiene mucha energía y resistencia para el trabajo.",
      "Expresa su desacuerdo con franqueza y firmeza.",
      "Se impacienta ante la lentitud o los rodeos.",
      "Le cuesta quedarse quieto: descansar sin hacer nada le parece tiempo perdido.",
      "Se enoja con intensidad, pero suele olvidar la discusión antes que la otra persona.",
    ],
    fortalezas: [
      "Determinación para sacar adelante proyectos difíciles.",
      "Capacidad de liderar y organizar a otros hacia un objetivo.",
      "Valentía para enfrentar los problemas y tomar decisiones difíciles.",
      "Claridad para distinguir lo importante de lo accesorio.",
      "Seguridad personal, que puede tranquilizar a los demás en momentos de crisis.",
      "Honestidad directa: se sabe lo que usted piensa.",
      "Persistencia: no se rinde ante la primera dificultad y busca otro camino.",
      "Capacidad de decidir bajo presión y de asumir la responsabilidad de lo decidido.",
    ],
    cuidar: [
      "La impaciencia con quienes trabajan a otro ritmo.",
      "El tono y la fuerza con que expresa el enojo, que pueden herir aunque no sea su intención.",
      "Escuchar otras opiniones antes de decidir y aceptar que otros también saben hacer las cosas.",
      "Delegar y confiar, en lugar de querer controlarlo todo.",
      "Descansar y dar espacio al ocio: el trabajo no puede ser lo único que le dé valor.",
      "Atender las emociones y necesidades de los demás, no solo los resultados.",
      "Ver como debilidad la duda, la tristeza o el cansancio, en usted y en los demás.",
      "Las prisas por cerrar un tema, que pueden llevarlo a decidir sin tener suficiente información.",
    ],
    observar: [
      "Cuando note que está alzando la voz o acortando las frases, haga una pausa antes de seguir.",
      "Cuando note que las personas dejan de contradecirlo, pregúntese si de verdad coinciden o si prefieren evitar la discusión.",
      "Cuando note tensión en el cuello o la mandíbula, o que duerme poco, es señal de que lleva demasiado tiempo sin pausa.",
      "Cuando note que corrige o rehace lo que otros hicieron, pregúntese si el resultado realmente lo exige.",
      "Cuando note que valora a las personas solo por lo que producen, recuerde preguntarles cómo están.",
    ],
    aprovechar: [
      "Use su decisión para destrabar lo que está detenido: asuma lo que otros evitan, pero acuerde antes el rumbo con el equipo.",
      "Fije metas medibles y plazos, y comparta el avance; su claridad ayuda a que todos sepan hacia dónde van.",
      "Aproveche su resistencia en proyectos largos y difíciles, repartiendo tareas para que la carga no recaiga solo en usted.",
      "Ponga su franqueza al servicio de la verdad útil: dé retroalimentación concreta, con calma y empezando por lo que sí funciona.",
      "Use su seguridad en momentos de crisis: su serenidad práctica orienta a otros, siempre que deje espacio para que expresen su temor.",
    ],
    relaciones:
      "Los demás suelen verlo como alguien seguro, de palabra firme y confiable para resolver. En los vínculos cercanos, su franqueza puede sentirse como dureza o exigencia. Preguntar cómo está la otra persona, agradecer y pedir las cosas con calma fortalece la relación.",
    trabajo:
      "Se desempeña bien en puestos con responsabilidad, metas medibles y autonomía para decidir. Le incomodan los procesos lentos, los permisos innecesarios y la falta de claridad. Le conviene escuchar al equipo antes de fijar el rumbo y reconocer los logros ajenos.",
    estres:
      "Bajo presión tiende a endurecerse: se vuelve más exigente, controlador e irritable, y puede trabajar sin parar sin notar el cansancio. A veces el enojo aparece en lugar de la tristeza o del miedo. Hacer pausas, mover el cuerpo y esperar un momento antes de responder le ayuda a recuperar el equilibrio.",
    crecer: [
      "Antes de reaccionar con enojo, haga una pausa de unos segundos y después responda.",
      "Pregunte «¿qué opina usted?» y escuche la respuesta completa antes de decidir.",
      "Elija una tarea por semana para delegar y no la corrija mientras no sea necesario.",
      "Reconozca en voz alta un logro de otra persona cada día.",
    ],
    terapia: {
      alianza:
        "Valora la franqueza, la claridad y que se respete su criterio; puede poner a prueba al terapeuta o cuestionar el método. Mostrar competencia, explicar el porqué de cada paso y darle participación en las decisiones facilita la alianza.",
      ritmo:
        "Prefiere objetivos concretos y avances visibles; se impacienta con procesos largos y ambiguos. Acordar metas medibles y revisarlas con regularidad.",
      tareas:
        "Responde bien a tareas claras, con propósito explícito y plazos. Cuidar que no las convierta en una competencia o las cumpla sin reflexionar.",
      riesgos:
        "Control y rigidez dentro y fuera de la sesión; dificultad para mostrar vulnerabilidad; ira y conflictos interpersonales; abandono cuando siente que no avanza o que lo dirigen; sobrecarga laboral y molestias físicas por estrés sostenido. Explorar el enojo que puede ocultar tristeza o miedo.",
    },
  },
  M: {
    nombre: "Melancólico",
    dimensiones: "Hacia adentro y de reacción intensa (introvertido y reactivo).",
    resumen:
      "Su vida se orienta hacia adentro: piensa con profundidad, observa los detalles y se toma en serio lo que hace y lo que siente. Percibe con intensidad las emociones, las suyas y las de otros, lo que le da sensibilidad, lealtad y un cuidado especial por la calidad. Prefiere preparar con tiempo, anticipar dificultades y hacer las cosas bien antes que rápido. Su punto delicado es la exigencia: tiende a criticarse con dureza, a recordar sus errores durante mucho tiempo y a preocuparse por lo que podría salir mal. Cuando se trata con la misma comprensión que ofrece a los demás, su temperamento aporta hondura, rigor y constancia.",
    caracteristicas: [
      "Reflexiona antes de actuar y prefiere tener un plan.",
      "Se fija en los detalles y en la calidad de lo que hace.",
      "Siente las emociones con intensidad y profundidad.",
      "Es reservado y se abre sobre todo con personas de confianza.",
      "Disfruta la soledad y los momentos tranquilos para pensar.",
      "Es leal y constante en los vínculos que elige.",
      "Se exige mucho y recuerda sus errores durante mucho tiempo.",
      "Anticipa los riesgos y las dificultades.",
      "Prefiere pocos vínculos pero muy sólidos, y le pesa la superficialidad.",
      "Se toma tiempo para decidir y sopesa los pros y los contras antes de comprometerse.",
    ],
    fortalezas: [
      "Atención al detalle y búsqueda de calidad en lo que hace.",
      "Capacidad de análisis y de pensar en profundidad.",
      "Sensibilidad para comprender el dolor y las necesidades de los demás.",
      "Lealtad y compromiso duraderos con las personas y los valores que elige.",
      "Responsabilidad: cumple lo que promete y se prepara bien.",
      "Gusto por las cosas con sentido, orden y belleza.",
      "Capacidad de escuchar con atención y de recordar lo que otros le cuentan.",
      "Capacidad de anticiparse a los problemas y de preparar planes de respaldo.",
    ],
    cuidar: [
      "La autocrítica excesiva y el perfeccionismo, que pueden frenarlo o agotarlo.",
      "Darle vueltas una y otra vez a los pensamientos y a lo que salió mal.",
      "Los bajones de ánimo y el aislamiento cuando se siente herido.",
      "La desconfianza: darse tiempo para ver también las buenas intenciones de los demás.",
      "Comparar lo que hace con un ideal inalcanzable y no valorar sus avances.",
      "Pedir ayuda y decir a tiempo lo que le molesta, en lugar de guardárselo.",
      "Esperar que los demás sean tan cuidadosos y exigentes como usted, y decepcionarse cuando no lo son.",
      "Tomar a pecho comentarios o gestos neutros y darles un significado negativo.",
    ],
    observar: [
      "Cuando note que repasa una y otra vez lo que dijo o lo que salió mal, es hora de escribirlo y soltarlo.",
      "Cuando note que se aleja de las personas y deja de contestar, pregúntese si no es una forma de protegerse del dolor.",
      "Cuando note que posterga entregar algo porque «todavía no está perfecto», póngase una fecha límite.",
      "Cuando note que imagina lo peor, distinga qué es un hecho y qué es una suposición suya.",
      "Cuando note que calla algo que le molesta esperando que lo adivinen, dígalo con calma antes de que se acumule.",
    ],
    aprovechar: [
      "Use su capacidad de análisis y su mirada al detalle en tareas donde un error cuesta caro: revisiones, planificación, control de calidad.",
      "Ponga su sensibilidad al servicio de acompañar: su manera de escuchar y comprender es un apoyo para quien atraviesa un momento difícil.",
      "Aproveche su lealtad cultivando pocas relaciones profundas y dedicándoles tiempo con regularidad.",
      "Convierta su anticipación en un plan: cuando prevea un riesgo, anote qué haría, y así la preocupación se vuelve preparación.",
      "Use sus momentos de soledad para crear, escribir o estudiar, y protéjalos en su agenda sin culpa.",
    ],
    relaciones:
      "Ofrece vínculos profundos, leales y atentos; las personas cercanas suelen sentirse comprendidas. Puede tardar en abrirse, guardar resentimiento en silencio o esperar que los demás adivinen lo que le duele. Decir con calma lo que necesita y permitirse recibir afecto ayuda a que la cercanía sea más ligera.",
    trabajo:
      "Destaca en tareas que exigen precisión, análisis, planificación y trabajo cuidadoso, y rinde mejor con tiempo y orden. Le cuesta cuando hay prisa, cambios constantes o críticas poco claras. Le conviene fijar un punto de «suficientemente bien», pedir opiniones antes de pulir sin fin y celebrar lo logrado.",
    estres:
      "Bajo presión tiende a replegarse, a preocuparse en exceso, a imaginar lo peor y a criticarse con dureza. Puede sentirse sin energía, con el ánimo bajo y con dificultad para dormir. Hablar con alguien de confianza, ordenar las preocupaciones por escrito y mantener rutinas de descanso y ejercicio le ayudan.",
    crecer: [
      "Escriba cada noche tres cosas que salieron bien, por pequeñas que sean.",
      "Cuando se critique, pregúntese qué le diría a un buen amigo en su lugar.",
      "Póngase un límite de tiempo para revisar un trabajo y entréguelo cuando llegue.",
      "Cuéntele a una persona de confianza lo que le preocupa antes de que crezca.",
    ],
    terapia: {
      alianza:
        "La confianza se construye con lentitud, constancia y respeto por su privacidad; observa con cuidado al terapeuta y detecta las incoherencias. Una actitud serena, predecible y validante favorece la apertura.",
      ritmo:
        "Respetar los silencios y los tiempos de reflexión; no apresurar la exposición emocional. Estructura clara y previsible de las sesiones.",
      tareas:
        "Cumple con esmero los registros y ejercicios por escrito; vigilar que no se vuelvan fuente de autoexigencia o perfeccionismo. Acordar tareas pequeñas y flexibles.",
      riesgos:
        "Síntomas depresivos y ansiosos, rumiación, autocrítica severa y aislamiento; interpretar señales neutras como rechazo; abandono silencioso tras sentirse incomprendido o criticado. Indagar de forma directa ideas de desesperanza o de hacerse daño, que puede ocultar.",
    },
  },
  F: {
    nombre: "Flemático",
    dimensiones: "Hacia adentro y de reacción serena (introvertido y estable).",
    resumen:
      "Su manera de ser se dirige hacia adentro con una calma natural: mantiene la serenidad cuando otros se alteran, avanza con paciencia y cuida la armonía con quienes lo rodean. Reacciona con moderación, escucha sin apuro y rara vez se deja arrastrar por el enojo o la prisa. Su estabilidad es un apoyo para su familia, sus amistades y su equipo, que saben que pueden contar con usted. Su punto delicado es la iniciativa: a veces posterga, cede para evitar el conflicto y se queda callado con lo que piensa o necesita. Cuando se anima a proponer y a poner límites, su calma se convierte en una fuerza silenciosa, pero muy firme.",
    caracteristicas: [
      "Mantiene la calma ante situaciones que alteran a otros.",
      "Es paciente y constante, y trabaja a un ritmo parejo.",
      "Escucha con atención y no suele interrumpir.",
      "Prefiere la armonía y evita los conflictos innecesarios.",
      "Se siente cómodo con la rutina y con lo conocido.",
      "Es discreto: observa antes de opinar.",
      "Reacciona con moderación y se enoja poco.",
      "Cede con facilidad y se adapta a lo que otros proponen.",
      "Observa la situación completa antes de moverse y no se deja apurar por las prisas de otros.",
      "Cuida los espacios, los objetos y las costumbres que le dan seguridad.",
    ],
    fortalezas: [
      "Serenidad que ayuda a pensar con claridad en las crisis.",
      "Paciencia para escuchar, enseñar o esperar los resultados.",
      "Constancia y confiabilidad: se puede contar con usted.",
      "Habilidad para mediar y reconciliar posturas distintas.",
      "Trato respetuoso y sin juicios duros hacia las personas.",
      "Equilibrio emocional, que lo protege de las reacciones desmedidas.",
      "Capacidad de sostener un esfuerzo a largo plazo sin perder el ánimo.",
      "Sentido del humor sereno y discreto, que alivia la tensión sin herir.",
    ],
    cuidar: [
      "Dejar las tareas para después, sobre todo las que no tienen fecha.",
      "Callar lo que piensa o necesita para evitar un desacuerdo.",
      "Resistirse a los cambios o tardar en adaptarse a ellos.",
      "Esperar a que otros decidan o propongan, y quedar al margen de lo que le importa.",
      "Conformarse con poco o dejar pasar oportunidades por comodidad.",
      "Acumular molestias en silencio, que pueden salir de golpe o convertirse en distancia.",
      "Esconder su opinión por no incomodar, hasta que los demás dejan de contar con ella.",
      "Evitar las decisiones importantes, de modo que otros terminan decidiendo por usted.",
    ],
    observar: [
      "Cuando note que dice «como ustedes quieran» aunque tenga una preferencia, anímese a decir qué le gustaría.",
      "Cuando note que una tarea lleva días en su lista sin moverse, empiece con un paso de diez minutos.",
      "Cuando note que se siente cada vez más distante o cansado de alguien, pregúntese qué molestia no ha dicho.",
      "Cuando note que dice que sí a un cambio pero por dentro se resiste, pida más información o más tiempo en lugar de callar.",
      "Cuando note que lleva mucho tiempo en la misma situación solo por comodidad, revise qué le gustaría cambiar.",
    ],
    aprovechar: [
      "Use su calma para mediar: en una discusión, su serenidad ayuda a que cada quien se sienta escuchado.",
      "Aproveche su constancia en proyectos largos, rutinas y responsabilidades que requieren regularidad, y fije hitos para notar el avance.",
      "Ofrezca su capacidad de escucha a quien necesite desahogarse, y cuide que también haya quien lo escuche a usted.",
      "Ponga su paciencia al servicio de enseñar, acompañar procesos lentos o cuidar a otros.",
      "Use su costumbre de observar antes de opinar: cuando hable, sus comentarios tendrán el peso de lo pensado.",
    ],
    relaciones:
      "Es una compañía tranquila, leal y fácil; las personas se sienten escuchadas y sin juicio a su lado. Para que los demás conozcan sus necesidades, ayuda decirlas con palabras, poner límites con amabilidad y proponer planes en lugar de acomodarse siempre a los de otros.",
    trabajo:
      "Es un apoyo estable para equipos y tareas que requieren constancia, orden y trato paciente. Se siente mejor con rutinas claras y sin prisas. Le conviene fijarse fechas propias, pedir lo que necesita y proponer ideas aunque nadie se lo pida.",
    estres:
      "Bajo presión suele bajar el ritmo, retraerse, posponer decisiones o ceder para evitar la tensión; por fuera parece tranquilo mientras por dentro se acumula el malestar. Ponerle nombre a lo que siente, dar pasos pequeños y pedir apoyo a tiempo evita que se estanque.",
    crecer: [
      "Elija una tarea pendiente y hágala hoy, aunque sea durante diez minutos.",
      "Practique decir «no» o «prefiero otra cosa» en situaciones pequeñas.",
      "Proponga usted el plan o la idea al menos una vez por semana.",
      "Pruebe un cambio pequeño en su rutina cada mes y observe cómo le va.",
    ],
    terapia: {
      alianza:
        "Vínculo cálido y sin conflicto: es cooperador y puede mostrar acuerdo para complacer. Invitarlo explícitamente a opinar, a discrepar y a decir lo que no le gusta del proceso.",
      ritmo:
        "Avance gradual y constante; tolera bien los procesos largos, pero puede estancarse sin notarlo. Fijar metas con fechas y revisarlas, sin presionar.",
      tareas:
        "Cumple si son simples, graduales y encajan en su rutina; puede posponerlas sin avisar. Concretar cuándo y dónde las hará y revisarlas al inicio de la sesión.",
      riesgos:
        "Pasividad, evitación y dependencia de otros para decidir; silenciar necesidades y conflictos; estancamiento y apatía que pueden esconder una depresión; resistencia al cambio; asistencia irregular por postergación y no por falta de interés. Explorar el enojo y los deseos no expresados.",
    },
  },
};

type Distinto<A extends TemperamentoId> = Exclude<TemperamentoId, A>;
export type ClaveCombinacion = { [A in TemperamentoId]: `${A}-${Distinto<A>}` }[TemperamentoId];

/** Perfil propio de una combinación «principal-secundario» (la personalidad ya mezclada). */
export type PerfilCombinado = {
  nombre: string;
  /** 3–4 frases: qué aporta el segundo temperamento y cuál es la tensión interna. */
  resumen: string;
  /** 6–7 rasgos principales de la mezcla. */
  caracteristicas: string[];
  /** Cómo se comporta (2–3 frases cada uno). */
  comportamiento: { trato: string; decisiones: string; conflicto: string; trabajo: string };
  /** 5 aspectos de los que debe cuidarse. */
  cuidar: string[];
  /** 4 aspectos que debe observar en sí mismo. */
  observar: string[];
  /** 5 formas de aprovechar lo positivo de la combinación. */
  aprovechar: string[];
};

/** Las 12 combinaciones (el orden importa: «colérico-sanguíneo» no es «sanguíneo-colérico»). */
export const COMBINACIONES: Record<ClaveCombinacion, PerfilCombinado> = {
  "S-C": {
    nombre: "Sanguíneo-colérico",
    resumen:
      "Su sociabilidad y su buen ánimo van acompañados de determinación: entusiasma a la gente y además la pone en movimiento. El colérico le aporta dirección, firmeza y ganas de resultados, así que sus ideas rara vez se quedan en el aire. La tensión interna está entre querer agradar a todos y querer marcar el paso, entre la ligereza del momento y la prisa por cumplir metas. Cuando ambas fuerzas se coordinan, anima y organiza al mismo tiempo.",
    caracteristicas: [
      "Llega a los grupos con energía y pronto se vuelve el centro de la conversación o quien propone qué hacer.",
      "Convierte el entusiasmo en acción: no solo imagina un plan, empieza a moverlo.",
      "Persuade más por simpatía y seguridad que por argumentos detallados.",
      "Se aburre con la rutina y, a la vez, se desespera cuando las cosas no avanzan.",
      "Disfruta que lo reconozcan por lo que logra y por cómo hace sentir a los demás.",
      "Reacciona rápido y con efusividad: se enciende pronto, pero se le pasa pronto.",
      "Prefiere la variedad y los retos que le den movimiento y público.",
    ],
    comportamiento: {
      trato:
        "Su trato es abierto, cálido y expresivo: hace sentir bienvenidas a las personas y tiene siempre un gesto o una broma cercana. Al mismo tiempo toma la palabra con facilidad y puede marcar el rumbo de la conversación sin darse cuenta. Quienes lo conocen poco lo ven carismático; quienes lo conocen más saben que espera que lo sigan.",
      decisiones:
        "Decide rápido y por intuición: se guía por el entusiasmo y por la sensación de oportunidad, y el colérico le da la firmeza para comprometerse sin vueltas. Rara vez espera más datos. El riesgo es que decida antes de medir los costos o de consultar a quienes se verán afectados.",
      conflicto:
        "Ante un desacuerdo, primero intenta resolverlo con simpatía y humor; si no resulta, sube el tono con rapidez y puede decir cosas fuertes en el calor del momento. Después quiere reconciliarse pronto y se sorprende de que la otra persona siga dolida. Le ayuda reconocer el daño en lugar de pasar la página enseguida.",
      trabajo:
        "Rinde en puestos con contacto con la gente, metas claras y libertad para improvisar: ventas, organización de eventos, coordinación de grupos, enseñanza. Arranca con fuerza y motiva a su equipo, pero tiende a descuidar el seguimiento minucioso y los papeles. Funciona muy bien junto a alguien metódico que cierre los detalles.",
    },
    cuidar: [
      "Comprometerse con más actividades de las que realmente puede atender, por la mezcla de entusiasmo y ganas de liderar.",
      "Hablar y decidir por los demás sin notar que ya no opinan.",
      "Usar el encanto para salir de un reclamo en lugar de hacerse cargo de lo que falló.",
      "Dejar a medias lo que dejó de ser novedad, aunque haya gente contando con ello.",
      "Agotarse sin darse cuenta: la energía parece inagotable hasta que aparecen el cansancio o la irritabilidad.",
    ],
    observar: [
      "Cuánto tiempo deja hablar a otros antes de proponer su solución.",
      "Si sus promesas tienen fecha y responsable, o solo la emoción de decirlas.",
      "Cómo suena su tono cuando algo no sale como quería, sobre todo ante quienes dependen de usted.",
      "Si lo que hace en un día corresponde a lo que de verdad es importante para usted o solo a lo más llamativo.",
    ],
    aprovechar: [
      "Use su carisma y su iniciativa para poner en marcha grupos: convoque, motive y reparta tareas claras.",
      "Combine su entusiasmo con metas concretas y fechas, y compártalas en voz alta para que la gente le ayude a cumplirlas.",
      "Rodéese de personas detallistas y agradezca su aporte; así sus ideas se concretan.",
      "Aproveche su capacidad de levantar el ánimo en momentos difíciles para animar equipos en cambios o en crisis.",
      "Reserve un rato para escuchar a cada persona de su grupo; esa atención convierte su influencia en confianza.",
    ],
  },
  "S-M": {
    nombre: "Sanguíneo-melancólico",
    resumen:
      "Su calidez y su entusiasmo conviven con una vida interior más honda y sensible: alegra a un grupo y, a solas, repasa lo que dijo o lo que sintió. El melancólico le aporta cuidado, reflexión y empatía, de modo que su simpatía suele ser sincera y atenta. La tensión está entre mostrar buen ánimo hacia afuera y guardar preocupaciones o tristezas por dentro, y entre el deseo de espontaneidad y la autoexigencia. Cuando ambos lados dialogan, su sociabilidad gana profundidad.",
    caracteristicas: [
      "Es sociable y expresivo, pero necesita momentos a solas para recargarse y pensar.",
      "Sus emociones suben y bajan con intensidad: un entusiasmo puede transformarse pronto en preocupación.",
      "Percibe el estado de ánimo de otros y se conmueve con facilidad.",
      "Cuida cómo cae ante los demás y repasa después las conversaciones.",
      "Se anima con ideas y proyectos, y luego se exige más de la cuenta para que salgan bien.",
      "Tiene un humor que suele esconder sensibilidad: bromea para aliviar lo que le duele.",
      "Disfruta la compañía de pocas personas cercanas tanto como las reuniones grandes.",
    ],
    comportamiento: {
      trato:
        "Su trato es cálido, atento y con memoria para los detalles de las personas: recuerda lo que le contaron y lo retoma. Puede pasar con rapidez de la alegría a un silencio pensativo cuando algo lo toca, y quienes lo rodean no siempre entienden el cambio. Se abre de verdad con pocos, aunque con todos parezca abierto.",
      decisiones:
        "Decide con el corazón y con la cabeza a la vez, y eso a veces lo divide: el sanguíneo empuja a decir que sí y el melancólico a darle vueltas después. Es frecuente que acepte con entusiasmo y luego dude. Le ayuda pedirse un tiempo antes de responder a lo importante.",
      conflicto:
        "Evita el conflicto abierto porque teme perder el cariño; prefiere suavizar con humor. Si algo le duele, puede callarlo un tiempo y después sentirlo con mucha fuerza, o estallar en llanto o en un reproche emocional. Funciona mejor decir pronto y con sencillez qué le dolió.",
      trabajo:
        "Se desenvuelve bien en tareas creativas, de acompañamiento o de trato con personas, donde importa la calidad humana: docencia, orientación, arte, atención al público. Disfruta colaborar, aunque la crítica de una jefatura o de un compañero puede afectarle más de lo que muestra. Rinde cuando se siente valorado y tiene margen para cuidar los detalles.",
    },
    cuidar: [
      "Aparentar que todo está bien cuando por dentro hay cansancio o tristeza.",
      "Tomar como rechazo personal una crítica o un silencio ajeno.",
      "Oscilar entre la euforia y el desánimo sin darse tiempo para descansar.",
      "Aceptar compromisos por no decepcionar y después sentirse abrumado por la autoexigencia.",
      "Compararse con otras personas y concluir que no está a la altura.",
    ],
    observar: [
      "Si su alegría en un grupo es real o es una forma de no mostrar cómo se siente.",
      "Cuánto tiempo pasa dándole vueltas a una conversación ya terminada.",
      "A qué cosas dice que sí por no incomodar y luego le pesan.",
      "Qué le ayuda a recuperar el ánimo (personas, lugares, actividades), para buscarlo a tiempo.",
    ],
    aprovechar: [
      "Use su calidez con profundidad: acompañe de verdad, preguntando y escuchando.",
      "Exprese lo que siente por escrito, en el arte o con una persona de confianza; su sensibilidad es una buena fuente de creatividad.",
      "Cuide un círculo pequeño de personas con quienes pueda ser tal como es, sin quedar bien.",
      "Combine su entusiasmo con su cuidado del detalle para presentar proyectos que inspiran y además están bien hechos.",
      "Programe descanso y soledad como parte de su agenda: recargarse le permite seguir siendo la persona cálida que es.",
    ],
  },
  "S-F": {
    nombre: "Sanguíneo-flemático",
    resumen:
      "Su trato es simpático y fácil, a la vez tranquilo y conciliador. El flemático le aporta calma, paciencia y capacidad de escuchar, por lo que su alegría rara vez resulta invasiva. La tensión está entre el deseo de novedad y la comodidad de lo conocido, y en la tendencia a dejar para después lo que no apremia. Es una combinación muy agradable para convivir, a la que a veces le falta un empujón para pasar de la intención a la acción.",
    caracteristicas: [
      "Se lleva bien con casi todo el mundo y rara vez tiene enemistades.",
      "Disfruta la compañía, pero sin necesidad de estar siempre en el centro.",
      "Se toma la vida con buen humor y relativiza los problemas.",
      "Cede con facilidad para mantener un ambiente agradable.",
      "Quiere hacer muchas cosas y, a la vez, se acomoda en la rutina y en la comodidad.",
      "Escucha con paciencia y sin prisa, y aconseja con tranquilidad.",
      "Evita las presiones: rinde mejor sin plazos apretados ni confrontaciones.",
    ],
    comportamiento: {
      trato:
        "Su trato es afable, relajado y sin exigencias: la gente se siente a gusto a su lado y le cuenta sus cosas. Participa en las conversaciones sin dominarlas y suele ser quien aligera la tensión con una broma. A veces dice que sí a todo para no incomodar, y luego no llega o no cumple.",
      decisiones:
        "Le cuesta decidir cuando hay que escoger entre opciones que le gustan o cuando alguien saldrá desilusionado; deja que las cosas fluyan y que otros propongan. Cuando decide, lo hace por lo que le resulta agradable y de menor conflicto. Le sirve fijar una fecha para decidir en lugar de esperar a que el asunto se resuelva solo.",
      conflicto:
        "Esquiva los enfrentamientos con humor, con un cambio de tema o cediendo. Casi nunca hay gritos, pero tampoco se aclaran los desacuerdos, y algunos temas pueden quedar sin hablar por mucho tiempo. Con su calma y buen trato logra mediar, siempre que se atreva a decir qué piensa.",
      trabajo:
        "Funciona muy bien en ambientes cooperativos, con tareas variadas y ritmo moderado: atención a personas, trabajo en equipo, enseñanza, servicio. Aporta buen clima y constancia más que impulso. Necesita plazos y apoyo externo para no dejar las tareas para el último minuto.",
    },
    cuidar: [
      "Posponer lo importante con la excusa de que «ya habrá tiempo».",
      "Decir que sí para evitar tensiones y luego no cumplir.",
      "Dejarse llevar por lo cómodo y por el ambiente, aun cuando no coincide con lo que quiere.",
      "Esquivar las conversaciones difíciles con bromas.",
      "Gastar la energía en la vida social y quedarse sin ella para las metas personales a largo plazo.",
    ],
    observar: [
      "Cuántas cosas lleva «para después» y cuáles ya vencieron.",
      "Si usted opina de verdad o solo sigue la corriente del grupo.",
      "Qué desacuerdo ha dejado sin hablar y cómo le afecta.",
      "Si su rutina cómoda le está cerrando puertas que le interesan.",
    ],
    aprovechar: [
      "Use su buen trato para mediar entre personas distintas y bajar las tensiones.",
      "Aproveche su calma para sostener a otros en una crisis, con una presencia amable y sin dramatismo.",
      "Combine ligereza y constancia: arme rutinas agradables (caminar con alguien, estudiar en grupo) que lo mantengan en movimiento.",
      "Haga sus compromisos con otras personas: la compañía es su mejor motor.",
      "Use su humor para suavizar lo que necesita decir cuando es difícil: se puede ser claro y amable a la vez.",
    ],
  },
  "C-S": {
    nombre: "Colérico-sanguíneo",
    resumen:
      "Su determinación y su liderazgo son lo primero que se nota; la calidez, el humor y la facilidad para tratar a la gente los suavizan y los hacen más fáciles de aceptar. El sanguíneo le aporta cercanía y capacidad de motivar, de modo que sus metas suelen contagiar y no solo mandar. La tensión está entre la prisa por obtener resultados y el impulso de disfrutar y de ser querido, entre la firmeza y el deseo de caer bien. Es una combinación de liderazgo carismático que gana mucho cuando cuida los detalles y escucha.",
    caracteristicas: [
      "Fija metas ambiciosas y luego las vuelve atractivas para otros con entusiasmo y buen humor.",
      "Toma el mando con naturalidad, pero lo hace con simpatía y con reconocimientos.",
      "Es práctico y directo, con una franqueza que suele suavizar con una broma.",
      "Se activa con los retos y se aburre en lo que no da resultados visibles.",
      "Tiene energía de sobra y le cuesta frenar, aun cuando el cuerpo pide descanso.",
      "Le importa lograr las cosas y también que lo reconozcan y lo quieran.",
      "Se enoja con intensidad y no guarda rencor, aunque la otra persona sí recuerde lo dicho.",
    ],
    comportamiento: {
      trato:
        "Su trato combina autoridad y cercanía: da instrucciones claras, pero las acompaña con gestos de confianza y de reconocimiento. Hace sentir importantes a las personas que contribuyen a su objetivo y puede olvidar a las que no. Su energía y sus ganas de resolver pueden abrumar a quienes necesitan más tiempo para hablar.",
      decisiones:
        "Decide con rapidez y asume el costo: el colérico elige el rumbo y el sanguíneo lo vende. Le gusta resolver en el momento y avanzar, apoyándose en la intuición y en su experiencia. Le conviene consultar a quien conoce los detalles antes de comprometer a todo el grupo.",
      conflicto:
        "Ante un desacuerdo, busca ganar la discusión y usa tanto la firmeza como el encanto para convencer. Cuando se enoja, la intensidad es alta pero breve, y después quiere seguir como si nada, lo que a otros puede parecerles poco serio. Funciona mejor pedir disculpas con claridad y escuchar la versión de la otra persona hasta el final.",
      trabajo:
        "Es muy eficaz en la dirección, la gestión de proyectos, las ventas de alto nivel y el emprendimiento, donde puede fijar metas y entusiasmar al equipo. Pone el ritmo y a veces lo exige igual a todos. Rinde más si hay quien se ocupe del seguimiento fino y si recuerda detenerse a celebrar los logros.",
    },
    cuidar: [
      "Exigir velocidad a todos y descuidar a quienes trabajan a otro ritmo.",
      "Tomar el control y relegar a los demás, apoyándose en el carisma.",
      "Prometer resultados antes de tener el plan o los recursos.",
      "Quitarle importancia con humor a los conflictos o a las críticas, sin resolver su causa.",
      "Trabajar sin descanso y luego compensar con excesos (gasto, diversión, comida).",
    ],
    observar: [
      "Cuántas veces al día da órdenes y cuántas veces pregunta.",
      "Si quienes lo rodean opinan con libertad o ya aprendieron a no contradecirlo.",
      "Si su prisa por llegar a la meta le hace saltarse pasos que después cuestan más.",
      "Si reconoce en público el trabajo de otros con la misma facilidad con que lo exige.",
    ],
    aprovechar: [
      "Use su liderazgo carismático para mover grupos grandes: explique el «para qué» y deje que cada persona escoja cómo aportar.",
      "Combine metas con celebración: marque hitos y festeje cada avance; eso mantiene motivado al equipo y a usted.",
      "Elija a un colaborador metódico, désele autoridad real y escúchelo en lo que usted pasa por alto.",
      "Aproveche su franqueza y su buen humor para dar retroalimentación clara que se pueda recibir sin herir.",
      "Use su recuperación rápida para pedir disculpas a tiempo y reparar las relaciones; eso refuerza su autoridad.",
    ],
  },
  "C-M": {
    nombre: "Colérico-melancólico",
    resumen:
      "Su energía y su firmeza se unen a un gusto por el orden, el detalle y la calidad: es exigente con los demás y, sobre todo, consigo. El melancólico le aporta planificación, profundidad y sentido de responsabilidad, de modo que su determinación se apoya en análisis y no solo en impulso. La tensión es interna: entre actuar de inmediato y revisar hasta estar seguro, entre la firmeza y la autocrítica severa. Es una combinación de gran capacidad, que se beneficia mucho de aprender a descansar y a tolerar lo imperfecto.",
    caracteristicas: [
      "Se fija metas altas y define cómo cumplirlas, con plan, pasos y revisión.",
      "Es serio, trabajador y responsable, y espera lo mismo de los demás.",
      "Reacciona con intensidad ante los errores, propios y ajenos.",
      "Se toma el tiempo de analizar, pero cuando decide, no vuelve atrás.",
      "Muestra poco de lo que siente: sus emociones se transforman en trabajo o en enojo.",
      "Valora la competencia más que la simpatía y se impacienta con la superficialidad.",
      "Le cuesta descansar: siente que siempre falta algo por mejorar.",
    ],
    comportamiento: {
      trato:
        "Su trato es formal, directo y reservado: prefiere ir al grano y tarda en confiar. Muestra su aprecio más con hechos y compromiso que con palabras, por lo que a veces lo perciben como frío o crítico. Quienes se ganan su respeto descubren una lealtad y una generosidad sólidas.",
      decisiones:
        "Decide con base en datos y en un estándar alto, y la fuerza del colérico lo lleva a ejecutar. Puede alternar entre analizar sin fin y decidir de golpe cuando se agota la paciencia. Una vez decidido, defiende su posición con argumentos y le cuesta aceptar cambios de último momento.",
      conflicto:
        "Ante un desacuerdo, argumenta con datos, lógica y firmeza, y puede resultar incisivo. Si siente que no lo respetan o que algo se hizo mal, el enojo es intenso y a veces deja rencores silenciosos que recuerda por mucho tiempo. Le ayuda separar el error de la persona y decir lo que le molesta sin acumularlo.",
      trabajo:
        "Es muy fuerte en tareas que requieren rigor y liderazgo: dirección técnica, finanzas, ingeniería, medicina, auditoría, gestión de proyectos. Entrega trabajo de alta calidad y exige lo mismo. El riesgo es el agotamiento y que su equipo se sienta evaluado todo el tiempo.",
    },
    cuidar: [
      "La exigencia excesiva, que puede agotarlo y dañar sus relaciones.",
      "Convertir los errores propios y ajenos en reproches duros.",
      "Ocultar el cansancio o la tristeza hasta que salen como enojo o como enfermedad.",
      "Controlar los detalles de lo que otros hacen en lugar de confiar.",
      "Guardar resentimientos en lugar de hablarlos a tiempo.",
    ],
    observar: [
      "Si la calidad que pide es realmente necesaria o ya es perfeccionismo.",
      "El tono con que corrige, sobre todo cuando está cansado.",
      "Qué siente debajo del enojo: miedo, tristeza, preocupación.",
      "Cuánto tiempo ha pasado sin un descanso real, sin trabajo ni pantallas.",
    ],
    aprovechar: [
      "Use su combinación de decisión y rigor en proyectos importantes: planifique y ejecute con un ritmo sostenible.",
      "Defina de antemano qué es «suficientemente bueno» para cada tarea; eso protege su energía y la de su equipo.",
      "Delegue por escrito, con criterios claros, y revise solo lo acordado.",
      "Dé reconocimiento específico: su opinión pesa, y un elogio justo suyo vale mucho.",
      "Ponga su sentido de responsabilidad al servicio de causas que valore; trabajar por algo con sentido le da dirección y le quita rigidez.",
    ],
  },
  "C-F": {
    nombre: "Colérico-flemático",
    resumen:
      "Combina determinación con serenidad: suele sacar adelante lo que se propone sin perder la calma exterior. El flemático le aporta paciencia, constancia y mesura, que moderan la prisa del colérico. La tensión está entre el impulso de dirigir y la tendencia a retirarse y callar, o entre mantener la calma mucho tiempo y reaccionar con firmeza cuando algo cruza su límite. Es un liderazgo sobrio, de pocas palabras y mucha persistencia.",
    caracteristicas: [
      "Es firme y objetivo, pero sin alboroto: su autoridad se nota más en los hechos que en la voz.",
      "Avanza con constancia hacia sus metas, sin necesidad de reconocimiento.",
      "Mantiene la serenidad en las crisis y piensa con claridad cuando otros se alteran.",
      "Habla poco, y lo que dice suele ser concreto y definitivo.",
      "Prefiere la independencia: trabajar a su manera y a su ritmo.",
      "Tolera mucho antes de enojarse, pero cuando lo hace es firme y difícil de convencer.",
      "Se siente más cómodo con tareas y obligaciones que con el trato social extenso.",
    ],
    comportamiento: {
      trato:
        "Su trato es reservado, correcto y confiable: no busca llamar la atención ni quedar bien, pero cumple lo que dice. Da instrucciones breves y espera que se cumplan sin tener que repetirlas. Puede parecer distante o poco expresivo, aunque en el fondo se preocupa por las personas.",
      decisiones:
        "Decide con calma y con una lógica práctica: observa, escucha poco y luego determina. Una vez tomada la decisión, la mantiene con una terquedad serena. El riesgo es decidir a solas y dar pocas explicaciones, de modo que los demás se enteren al final.",
      conflicto:
        "Aguanta mucho en silencio y se retira antes que discutir; cuando se cruza su límite, su respuesta es seca, firme y sin concesiones, y puede cortar la conversación o la relación. Los demás se sorprenden porque no vieron venir el enojo. Le conviene avisar a tiempo de lo que le molesta, con voz tranquila, antes de llegar al límite.",
      trabajo:
        "Es eficaz en puestos de responsabilidad que valoran el orden, la constancia y los resultados: administración, operaciones, supervisión, oficios técnicos. Trabaja bien por su cuenta y soporta la presión sin mostrar alteración. Se beneficia de comunicar más lo que hace y de pedir y dar retroalimentación.",
    },
    cuidar: [
      "Decidir a solas y comunicar poco, dejando a otros sin información ni voz.",
      "Acumular molestias hasta cortar de golpe una relación o una colaboración.",
      "Mostrarse inflexible cuando ya tiene una postura, aunque haya mejores datos.",
      "Confundir la calma exterior con que no pasa nada por dentro, y no atender el cansancio o el malestar.",
      "Aislarse del grupo y limitar su vida social a lo estrictamente necesario.",
    ],
    observar: [
      "Cuánto tiempo guarda un malestar antes de decirlo.",
      "Si las personas a su alrededor saben qué piensa y qué espera de ellas.",
      "Si su firmeza es una convicción o ya es terquedad.",
      "Si está tomando suficiente descanso y compañía, o solo cumpliendo.",
    ],
    aprovechar: [
      "Use su serenidad y su determinación en los momentos de crisis: puede decidir sin dejarse arrastrar por el pánico.",
      "Establezca metas a largo plazo con hitos mensuales; su constancia hace el resto.",
      "Explique brevemente el porqué de sus decisiones; ese pequeño gesto hace que lo sigan con mayor confianza.",
      "Cultive uno o dos vínculos de confianza donde pueda ser sincero sobre lo que piensa y siente.",
      "Aproveche su independencia en tareas que requieren concentración y autonomía, y programe espacios de equipo para no quedar aislado.",
    ],
  },
  "M-S": {
    nombre: "Melancólico-sanguíneo",
    resumen:
      "Su profundidad y su sensibilidad se alivian con una vena sociable y optimista, que le ayuda a abrirse y a disfrutar. El sanguíneo le aporta ligereza, expresividad y facilidad para acercarse, de modo que su vida interior no se queda encerrada. La tensión está entre el deseo de estar a solas y el de estar con gente, y entre la autocrítica que lo frena y el entusiasmo que lo empuja. Es una persona reflexiva con una calidez visible, que gana mucho al darse permiso de compartir lo que piensa.",
    caracteristicas: [
      "Piensa y siente con profundidad, pero encuentra en la conversación y en el humor una manera de aliviarse.",
      "Oscila entre la necesidad de silencio y la de compañía.",
      "Se involucra emocionalmente en lo que hace y con quien lo hace.",
      "Se expresa con sensibilidad, a veces con dramatismo, cuando algo le importa.",
      "Se entusiasma con las ideas, pero las examina y las critica en privado.",
      "Tiende al perfeccionismo y a la duda, aunque rara vez lo muestra en público.",
      "Busca ser comprendido, valorado y querido, más que admirado.",
    ],
    comportamiento: {
      trato:
        "Su trato es atento y empático: se acerca con calidez a quien percibe que lo necesita y sabe qué decir. Con las personas de confianza es profundo y auténtico, y en grupos grandes puede resultar encantador y luego agotarse. Puede mostrarse más animado de lo que se siente por dentro, para no incomodar.",
      decisiones:
        "Piensa mucho antes de decidir y consulta opiniones; el sanguíneo le ayuda a atreverse cuando ya sopesó. Le afecta la aprobación ajena y puede cambiar de rumbo si alguien cercano no está de acuerdo. Cuando decide con calma suele elegir bien; las decisiones apresuradas por agradar le pesan después.",
      conflicto:
        "Los conflictos le duelen y tiende a suavizarlos con simpatía o a callar; si el dolor se acumula, aparece en lágrimas o en reproches emotivos. Necesita tiempo para ordenar lo que siente antes de hablar. Una conversación tranquila, con ejemplos concretos, le funciona mejor que una discusión en caliente.",
      trabajo:
        "Rinde en trabajos donde se combinan el cuidado del detalle y el trato humano: psicología, educación, arte, comunicación, salud, diseño. Se motiva con el sentido de lo que hace y con equipos afectuosos. Es sensible a la crítica y al ambiente: un clima tenso le baja el rendimiento.",
    },
    cuidar: [
      "Dudar de sí mismo en privado y luego ocultarlo con buen ánimo.",
      "Entristecerse por una crítica y dejarla crecer sin contrastarla.",
      "Cargar con las preocupaciones de otros hasta quedar agotado.",
      "Perder el hilo de sus proyectos por la mezcla de dudas y distracciones.",
      "Pasar de la efusividad al retraimiento de un día para otro sin explicárselo a quienes lo rodean.",
    ],
    observar: [
      "Cuándo la sonrisa social cubre un cansancio o una pena.",
      "Cuántas veces cambia de opinión por lo que dirán otros.",
      "Si pide ayuda o espera que se la adivinen.",
      "Qué actividades le devuelven la energía y si las está dejando por atender a todos.",
    ],
    aprovechar: [
      "Comparta lo que piensa: su profundidad, dicha con calidez, inspira y ayuda a otros.",
      "Use la escritura, el arte o la conversación para dar forma a lo que siente; es una buena vía para que las emociones no lo desborden.",
      "Acompañe a quienes atraviesan dificultades: su manera de escuchar y de aligerar crea confianza.",
      "Combine su cuidado de los detalles con su capacidad de presentar y contar: sus trabajos pueden ser rigurosos y atractivos.",
      "Rodéese de personas que lo valoren; el reconocimiento sincero le da seguridad y le permite arriesgarse más.",
    ],
  },
  "M-C": {
    nombre: "Melancólico-colérico",
    resumen:
      "Une la reflexión y el cuidado del detalle con decisión y ganas de resultados; es exigente con los demás y consigo. El colérico le aporta iniciativa, firmeza y energía, que convierten su análisis en acción. La tensión está entre dudar y actuar, y entre la autoexigencia y la irritación cuando las cosas, o las personas, no están a la altura. Es una combinación seria y trabajadora, que gana cuando alivia el rigor con que se mide y con que mide a los demás.",
    caracteristicas: [
      "Piensa a fondo y se pone en marcha cuando ve claro lo que hay que hacer.",
      "Guarda con cuidado sus emociones, pero su enojo se nota cuando algo se desvía de lo que considera correcto.",
      "Su autocrítica es severa y, bajo presión, la dirige también hacia los demás.",
      "Planifica con detalle y luego ejecuta con empuje.",
      "Se siente responsable de que las cosas salgan bien y carga con más de lo que le toca.",
      "Le cuesta confiar y prefiere comprobar por sí mismo.",
      "Tiene convicciones firmes y las defiende con argumentos.",
    ],
    comportamiento: {
      trato:
        "Su trato es serio, reservado y a ratos intenso: se interesa poco por la charla social y mucho por lo que importa. Con quienes confía es leal y protector; con los demás puede ser seco. Las personas perciben exigencia aun cuando no la exprese, y pueden tardar en acercarse.",
      decisiones:
        "Analiza a fondo y luego decide con firmeza; el colérico le ayuda a salir de la duda, pero cuando la presión sube puede decidir de golpe y arrepentirse después. Se apoya en principios y en hechos más que en el ánimo del grupo. Le cuesta delegar las decisiones importantes.",
      conflicto:
        "Le duelen la injusticia y el descuido, y responde con firmeza, con argumentos y a veces con ironía; después recuerda la ofensa durante mucho tiempo. Alterna entre callar y estallar, y rara vez queda satisfecho con su manera de resolver. Mejora cuando dice en privado, o por escrito, qué le molestó y qué espera.",
      trabajo:
        "Sobresale en trabajos de análisis, investigación, planificación, control de calidad, derecho, ingeniería y dirección técnica. Es muy confiable y entrega con precisión. Necesita autonomía y evitar el microcontrol, propio y ajeno.",
    },
    cuidar: [
      "Pasar de la duda a la acción impulsiva cuando se agota la paciencia.",
      "La autocrítica y el enojo hacia otros, que nacen del mismo estándar elevado.",
      "Guardar resentimientos y cobrarlos más tarde con dureza.",
      "Cargar con todo por desconfianza, hasta quedar agotado.",
      "Verlo todo en términos de lo que falta y no de lo que se logró.",
    ],
    observar: [
      "Si está analizando para decidir mejor o para evitar actuar.",
      "Cuánto de su enojo es cansancio o miedo disfrazado.",
      "Si las personas a quienes les exige conocen de verdad sus expectativas.",
      "Qué avances logró esta semana y si los reconoce.",
    ],
    aprovechar: [
      "Use su capacidad de analizar y de ejecutar en proyectos complejos que requieren precisión y empuje.",
      "Defina criterios de calidad claros y compártalos; así exige con justicia y evita malentendidos.",
      "Descanse con intención: un horario fijo de desconexión le devuelve claridad y buen carácter.",
      "Elija a una persona de confianza con quien conversar lo que le molesta antes de que se acumule.",
      "Reconozca por escrito o en voz alta los avances de su equipo; su aprobación vale mucho porque es exigente.",
    ],
  },
  "M-F": {
    nombre: "Melancólico-flemático",
    resumen:
      "Combina profundidad y reserva con calma y paciencia: suele resultar una persona tranquila, cuidadosa y confiable. El flemático le aporta serenidad y constancia, que suavizan la intensidad del melancólico. La tensión está en la tendencia a retraerse y a preocuparse en silencio, con poca iniciativa para pedir lo que necesita o para cambiar lo que le incomoda. Es una combinación de gran estabilidad interior y de mucha lealtad, que necesita que alguien la invite a expresarse.",
    caracteristicas: [
      "Reflexiona antes de actuar, mantiene reserva y le gusta un entorno predecible y ordenado.",
      "Se preocupa en silencio, y lo que siente rara vez se nota por fuera.",
      "Es constante y puntual en lo que asume: se puede contar con usted.",
      "Tiene pocas amistades, pero de muchos años.",
      "Se adapta más a lo que otros deciden que a lo que quisiera, y después lo piensa.",
      "Evita el protagonismo: prefiere el segundo plano y el trabajo bien hecho.",
      "Tarda en empezar, pero cuando empieza sostiene su esfuerzo hasta terminar.",
    ],
    comportamiento: {
      trato:
        "Su trato es amable, discreto y respetuoso: escucha mucho y habla poco, y quienes están a su lado se sienten tranquilos. Se acerca despacio y cuida los vínculos con atención, sobre todo con pocas personas. Puede parecer distante o indiferente cuando en realidad está pensando o sintiendo en silencio.",
      decisiones:
        "Decide con lentitud y con mucha información, y si la situación es incierta, tiende a posponer. Le inquieta equivocarse y por eso prefiere el camino conocido. Le ayuda fijarse un plazo y preguntarse qué es lo peor que pasaría con cada opción.",
      conflicto:
        "Evita la confrontación y se repliega: prefiere callar, aguantar o alejarse antes que discutir. Rumia lo ocurrido y puede enfriar la relación sin decir por qué. Cuando por fin habla lo hace con calma y con razones pensadas, aunque a veces demasiado tarde.",
      trabajo:
        "Se destaca en labores que piden constancia, cuidado y discreción: contabilidad, archivo, investigación, biblioteca, cuidado de personas, oficios de precisión. Trabaja con orden y sin necesidad de supervisión. Le pesan la prisa, los cambios de último momento y los ambientes ruidosos.",
    },
    cuidar: [
      "Preocuparse en silencio sin pedir ayuda ni compartir lo que le pesa.",
      "Quedarse en lo conocido por temor a equivocarse y perder oportunidades.",
      "Callar necesidades y desacuerdos hasta que se vuelven distancia.",
      "Dejar que otros decidan por usted para evitar la tensión.",
      "Bajar el ánimo y la energía sin notarlo, por falta de actividad y de contacto con otras personas.",
    ],
    observar: [
      "Cuánto tiempo pasa con una preocupación sin hablarla.",
      "Qué decisiones está postergando por miedo a fallar.",
      "Cuándo dice «está bien» sin que esté bien.",
      "Si su vida social y su actividad física se redujeron sin que usted lo decidiera.",
    ],
    aprovechar: [
      "Use su calma y su atención al detalle en tareas que requieren cuidado y constancia.",
      "Cultive pocas amistades y cuídelas con regularidad: un mensaje o un café cada cierto tiempo mantiene los vínculos.",
      "Escriba lo que piensa antes de hablar: es un puente entre su vida interior y su expresión.",
      "Dé pasos pequeños y programados hacia lo que le importa; su constancia hará que se acumulen.",
      "Ofrezca su escucha y su discreción a quien necesita confiar en alguien, y permita que también lo escuchen a usted.",
    ],
  },
  "F-S": {
    nombre: "Flemático-sanguíneo",
    resumen:
      "Su calma y su constancia se acompañan de buen humor y facilidad para relacionarse. El sanguíneo le aporta expresividad, entusiasmo y gusto por la compañía, que abren y alegran su carácter sereno. La tensión está entre la comodidad de la rutina y el deseo de novedad y de compañía, o entre callar para evitar problemas y hablar por el gusto de convivir. Es una combinación muy cómoda para los demás: tranquila, amable y acogedora.",
    caracteristicas: [
      "Es sereno y paciente, con un buen humor que se nota pronto.",
      "Disfruta convivir en grupos pequeños, sin necesidad de ser el centro.",
      "Prefiere rutinas tranquilas con espacio para la diversión y para ver gente.",
      "Rara vez se altera y suele tomarse las cosas con calma.",
      "Le cuesta decir que no, porque quiere llevarse bien con todos.",
      "Se adapta bien a los cambios que otros proponen, si el ambiente es agradable.",
      "Escucha con interés y alivia la conversación con una anécdota o una broma.",
    ],
    comportamiento: {
      trato:
        "Su trato es acogedor, paciente y relajado: la gente lo busca porque se siente cómoda y aceptada. No invade ni exige, y suele estar disponible para ayudar. Con tal de no incomodar, a veces acepta planes o favores que no le convienen.",
      decisiones:
        "Decide con tranquilidad, suele preguntar o dejar que otros propongan, y busca la opción que mantenga el buen ambiente. Le cuesta escoger si implica contrariar a alguien. Cuando hay confianza y compañía, se anima a tomar decisiones que le importan.",
      conflicto:
        "Evita los problemas con calma, con humor o con cambios de tema, y confía en que se resuelvan solos. Rara vez hay discusiones intensas, pero queda poco claro qué piensa o qué le incomoda. Puede ceder una y otra vez y luego sentirse poco tomado en cuenta.",
      trabajo:
        "Funciona bien en ambientes cooperativos, estables y con buen trato: atención al cliente, enseñanza, trabajo social, servicio, equipos pequeños. Aporta buen clima y regularidad. Le conviene fijarse metas propias y plazos, porque el ambiente amable puede hacerle bajar la exigencia.",
    },
    cuidar: [
      "Decir que sí por no desagradar y sobrecargarse de favores y compromisos.",
      "Dejar que la comodidad y la compañía le quiten tiempo para lo que le interesa.",
      "Evitar conversaciones difíciles hasta que el malestar es grande.",
      "Conformarse con poco por no mover las cosas.",
      "Dejar tareas pendientes mientras disfruta de lo agradable del momento.",
    ],
    observar: [
      "Cuántas veces dice «sí» sin querer en una semana.",
      "Qué meta propia dejó de avanzar y por qué.",
      "Si en sus grupos se atreve a proponer o solo acompaña.",
      "Si el buen ambiente le oculta una molestia que conviene hablar.",
    ],
    aprovechar: [
      "Use su manera acogedora para crear espacios donde otros se sientan bien: reuniones, grupos de apoyo, equipos nuevos.",
      "Combine constancia y buen ánimo: haga en compañía las tareas que le cuestan; la compañía le da impulso.",
      "Aproveche su paciencia y su humor para enseñar y acompañar procesos largos.",
      "Decida una prioridad personal por temporada y avísela a quienes lo rodean para que le ayuden a cumplirla.",
      "Practique decir «no» con amabilidad: con su buen trato, un límite claro se recibe bien.",
    ],
  },
  "F-C": {
    nombre: "Flemático-colérico",
    resumen:
      "Es una persona serena y estable que, cuando algo le importa, muestra decisión y firmeza. El colérico le aporta iniciativa y capacidad de poner límites, que despiertan cuando se toca algo valioso para usted. La tensión está entre evitar el conflicto durante mucho tiempo y reaccionar con fuerza cuando se rebasa el límite, entre la comodidad y la voluntad de lograr las cosas. Es una combinación tranquila por fuera y con carácter por dentro.",
    caracteristicas: [
      "Se mantiene calmado y paciente en lo cotidiano, y casi no se le nota el enojo.",
      "Cuando algo le importa de verdad, se pone en marcha con determinación y se vuelve tenaz.",
      "Prefiere la rutina y lo conocido, pero resiste con firmeza lo que considera injusto.",
      "Observa y espera antes de intervenir; cuando lo hace, es con claridad.",
      "Tiene metas personales firmes que no comenta con facilidad.",
      "Es constante y trabajador, sin necesidad de reconocimiento.",
      "Su terquedad puede aparecer de repente, después de mucho ceder.",
    ],
    comportamiento: {
      trato:
        "Su trato es tranquilo, respetuoso y poco invasivo, con una autoridad discreta que los demás perciben sin que usted la proclame. Escucha, permite que otros hablen y deja que los asuntos fluyan. Si alguien cruza una línea, su tono cambia con claridad y sorprende a quienes solo conocían su lado amable.",
      decisiones:
        "Deja pasar el tiempo, no se apura ni se deja apurar, y reúne información en silencio. Cuando ya decidió, es firme y difícil de mover. Puede dilatar mucho las decisiones importantes y luego actuar de golpe.",
      conflicto:
        "Cede, calla y aguanta durante mucho tiempo, hasta que algo lo hace estallar con firmeza y con una frialdad que impresiona. Antes de eso, los demás rara vez saben que hay un problema. Le sirve poner límites pequeños y a tiempo, con voz serena, para no llegar al punto de ruptura.",
      trabajo:
        "Es muy sólido en responsabilidades que requieren paciencia y firmeza: supervisión, administración, trabajo de campo, oficios, mandos medios. Mantiene un buen ritmo y sostiene los compromisos. Necesita proponer cambios por iniciativa propia en lugar de esperar a que se los pidan.",
    },
    cuidar: [
      "Aguantar demasiado y reaccionar de forma desproporcionada cuando se llega al límite.",
      "Postergar decisiones por comodidad y después querer recuperar el tiempo con prisas y exigencias.",
      "Cerrarse en su postura cuando se siente presionado.",
      "Ocultar sus metas y su opinión hasta que otros ya decidieron.",
      "Pasar del retraimiento a la dureza, sin pasos intermedios en que explique lo que pasa.",
    ],
    observar: [
      "Cuántas molestias pequeñas está guardando esta semana.",
      "Cuándo cede por paz y cuándo por miedo al conflicto.",
      "Si su firmeza es una convicción o una forma de no escuchar.",
      "Qué decisión importante lleva tiempo esperando y qué la detiene.",
    ],
    aprovechar: [
      "Use su calma como base y su firmeza como respaldo: hable pronto, con tono sereno y claro.",
      "Elija las causas que valen la pena y dedíqueles su determinación, sin dispersar fuerzas.",
      "Aproveche su constancia para sostener proyectos largos y difíciles hasta terminarlos.",
      "Avise a las personas cercanas cuáles son sus límites antes de que se crucen: así es más fácil respetarlos.",
      "Convierta su observación en propuestas: una vez al mes, llévele a su equipo una mejora concreta.",
    ],
  },
  "F-M": {
    nombre: "Flemático-melancólico",
    resumen:
      "Reúne paciencia y serenidad con sensibilidad y gusto por hacer las cosas bien. El melancólico le aporta detalle, reflexión y profundidad, que dan sentido y cuidado a su calma natural. La tensión está entre la comodidad de no cambiar y la preocupación o la autocrítica que guarda en silencio, y entre la tranquilidad exterior y la inquietud interior. Es una combinación apacible, atenta y confiable, que a veces carga a solas lo que le inquieta.",
    caracteristicas: [
      "Su calma es sostenida y reflexiva: piensa bien las cosas antes de opinar.",
      "Cuida las tareas y a las personas, y se fija en cómo se sienten.",
      "Prefiere lo conocido y se adapta despacio a lo nuevo.",
      "Se preocupa, pero con discreción y sin dramatismo.",
      "Es leal y constante, poco exigente a la vista de los demás, aunque por dentro tiene estándares altos.",
      "Aprecia el silencio, la naturaleza, la música o las actividades manuales como forma de descanso.",
      "Recuerda los gestos de las personas, buenos y malos, y los guarda.",
    ],
    comportamiento: {
      trato:
        "Su trato es suave, respetuoso y paciente: escucha con atención genuina y no juzga. Es una compañía de confianza y se acerca sin invadir. Puede quedarse en un segundo plano, y quienes lo conocen poco no notan cuánto siente y cuánto observa.",
      decisiones:
        "Decide despacio, con cuidado y buscando evitar errores y conflictos; le gustan los caminos seguros. Le cuesta escoger cuando no hay una opción clara y puede quedarse esperando a que la situación se defina sola. Le ayuda conversar con alguien de confianza y establecer un plazo.",
      conflicto:
        "Evita el choque y se retira; si algo le duele, calla y lo medita mucho. Puede mostrar acuerdo por fuera mientras por dentro se siente herido o en desacuerdo. Suele necesitar que alguien le pregunte con cariño qué le pasa para atreverse a decirlo.",
      trabajo:
        "Rinde en tareas ordenadas, con instrucciones claras y ambiente tranquilo: cuidado de personas, documentación, laboratorio, biblioteca, trabajo artesanal, enseñanza. Es constante, exacto y confiable. Se agota con la prisa y con la crítica brusca, y necesita pedir con claridad lo que necesita para trabajar.",
    },
    cuidar: [
      "Acumular preocupaciones y autocríticas en silencio, sin compartirlas.",
      "Aferrarse a lo conocido y evitar cambios que podrían beneficiarlo.",
      "Callar sus necesidades y esperar que otros las adivinen.",
      "Postergar tareas por temor a no hacerlas bien.",
      "Retraerse y perder energía, apetito o sueño sin pedir ayuda.",
    ],
    observar: [
      "Qué preocupación lleva dentro hace varios días sin decirla.",
      "Cuándo la comodidad de lo conocido está frenando algo que desea.",
      "Si su silencio es descanso o es evitación.",
      "Cómo están su sueño, su ánimo y su energía en las últimas semanas.",
    ],
    aprovechar: [
      "Use su calma y su cuidado para acompañar a quienes pasan por momentos delicados.",
      "Convierta su atención al detalle en trabajo constante y de calidad, con tiempos razonables en lugar de perfección absoluta.",
      "Dedique tiempo regular a lo que lo serena, como la naturaleza, la música, la lectura o las manualidades: esa es su forma de recargarse.",
      "Hable de lo que le preocupa en cuanto aparece, aunque sea con una sola frase a una persona de confianza.",
      "Pruebe cambios pequeños y programados: verá que puede adaptarse y que su estabilidad lo sostiene.",
    ],
  },
};

export const TEXTO_POCO_DIFERENCIADO =
  "Sus puntajes en los cuatro temperamentos son parecidos: ninguno se destaca claramente sobre los demás. Esto suele describir a una persona flexible, que usa rasgos distintos según lo que pide cada situación. También puede deberse a que contestó pensando en situaciones diferentes o a que le costó reconocerse en las frases. Conviene conversarlo con su psicólogo.";
