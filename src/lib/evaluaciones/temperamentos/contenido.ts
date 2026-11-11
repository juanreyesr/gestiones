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
      "Usted tiende a vivir hacia afuera: se acerca a la gente con naturalidad, contagia entusiasmo y suele ver el lado luminoso de las situaciones. Su ánimo cambia con rapidez, lo que le permite recuperarse pronto, aunque a veces le cuesta sostener el esfuerzo cuando las cosas se vuelven rutinarias.",
    caracteristicas: [
      "Se relaciona con facilidad y disfruta estar acompañado.",
      "Expresa abiertamente lo que siente y lo que piensa.",
      "Se entusiasma con ideas y proyectos nuevos.",
      "Tiende al optimismo y al buen humor, incluso en momentos difíciles.",
      "Vive intensamente el presente y se adapta a lo imprevisto.",
      "Su atención salta con facilidad de un tema a otro.",
      "Se recupera pronto de las contrariedades y suele perdonar sin guardar rencor.",
    ],
    fortalezas: [
      "Genera confianza y cercanía en poco tiempo.",
      "Anima a los demás y suele levantar el ánimo de un grupo.",
      "Comunica con naturalidad sus ideas y sus emociones.",
      "Tiene flexibilidad para adaptarse a cambios y a personas distintas.",
      "Se atreve a empezar cosas nuevas sin paralizarse por el miedo.",
      "Se repone pronto de los tropiezos y ayuda a otros a hacerlo.",
    ],
    cuidar: [
      "Terminar lo que empieza, aun cuando la novedad ya pasó.",
      "Cumplir con horarios, citas y compromisos (apoyarse en una agenda o en recordatorios).",
      "Dar espacio a los demás en las conversaciones y escuchar hasta el final.",
      "Medir antes de prometer, para no ofrecer más de lo que puede cumplir.",
      "Profundizar en los temas y en sus propias emociones, sin quedarse en la superficie.",
      "Cuidar los gastos y las decisiones que toma por el impulso del momento.",
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
      "Usted se mueve hacia afuera con energía y determinación: le gusta tener metas claras, actuar y obtener resultados. Su reacción ante los problemas es intensa y rápida, lo que le da fuerza para enfrentarlos, aunque a veces le gana la impaciencia.",
    caracteristicas: [
      "Se fija metas y se esfuerza hasta alcanzarlas.",
      "Decide con rapidez y prefiere actuar a esperar.",
      "Toma la iniciativa y asume con naturalidad la dirección de un grupo.",
      "Es práctico y va directo al punto.",
      "Tiene mucha energía y resistencia para el trabajo.",
      "Expresa su desacuerdo con franqueza y firmeza.",
      "Se impacienta ante la lentitud o los rodeos.",
    ],
    fortalezas: [
      "Determinación para sacar adelante proyectos difíciles.",
      "Capacidad de liderar y organizar a otros hacia un objetivo.",
      "Valentía para enfrentar los problemas y tomar decisiones difíciles.",
      "Claridad para distinguir lo importante de lo accesorio.",
      "Seguridad en sí mismo, que puede tranquilizar a los demás en momentos de crisis.",
      "Honestidad directa: se sabe lo que usted piensa.",
    ],
    cuidar: [
      "La impaciencia con quienes trabajan a otro ritmo.",
      "El tono y la fuerza con que expresa el enojo, que pueden herir aunque no sea su intención.",
      "Escuchar otras opiniones antes de decidir y aceptar que otros también saben hacer las cosas.",
      "Delegar y confiar, en lugar de querer controlarlo todo.",
      "Descansar y dar espacio al ocio: el trabajo no puede ser lo único que le dé valor.",
      "Atender las emociones y necesidades de los demás, no solo los resultados.",
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
      "Usted vive más hacia adentro: piensa con profundidad, observa los detalles y se toma en serio lo que hace y lo que siente. Su sensibilidad le da riqueza y cuidado, aunque también tiende a ser muy exigente consigo mismo y a preocuparse por lo que podría salir mal.",
    caracteristicas: [
      "Reflexiona antes de actuar y prefiere tener un plan.",
      "Se fija en los detalles y en la calidad de lo que hace.",
      "Siente las emociones con intensidad y profundidad.",
      "Es reservado y se abre sobre todo con personas de confianza.",
      "Disfruta la soledad y los momentos tranquilos para pensar.",
      "Es leal y constante en los vínculos que elige.",
      "Se exige mucho y recuerda sus errores durante mucho tiempo.",
      "Anticipa los riesgos y las dificultades.",
    ],
    fortalezas: [
      "Atención al detalle y búsqueda de calidad en lo que hace.",
      "Capacidad de análisis y de pensar en profundidad.",
      "Sensibilidad para comprender el dolor y las necesidades de los demás.",
      "Lealtad y compromiso duraderos con las personas y los valores que elige.",
      "Responsabilidad: cumple lo que promete y se prepara bien.",
      "Gusto por las cosas con sentido, orden y belleza.",
    ],
    cuidar: [
      "La autocrítica excesiva y el perfeccionismo, que pueden frenarlo o agotarlo.",
      "Darle vueltas una y otra vez a los pensamientos y a lo que salió mal.",
      "Los bajones de ánimo y el aislamiento cuando se siente herido.",
      "La desconfianza: darse tiempo para ver también las buenas intenciones de los demás.",
      "Comparar lo que hace con un ideal inalcanzable y no valorar sus avances.",
      "Pedir ayuda y decir a tiempo lo que le molesta, en lugar de guardárselo.",
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
      "Usted vive hacia adentro con una calma natural: suele mantener la serenidad, avanzar con paciencia y cuidar la armonía con los demás. Su estabilidad es un apoyo para quienes lo rodean, aunque a veces le cuesta tomar la iniciativa, expresar lo que quiere o salir de lo conocido.",
    caracteristicas: [
      "Mantiene la calma ante situaciones que alteran a otros.",
      "Es paciente y constante, y trabaja a un ritmo parejo.",
      "Escucha con atención y no suele interrumpir.",
      "Prefiere la armonía y evita los conflictos innecesarios.",
      "Se siente cómodo con la rutina y con lo conocido.",
      "Es discreto: observa antes de opinar.",
      "Reacciona con moderación y se enoja poco.",
      "Cede con facilidad y se adapta a lo que otros proponen.",
    ],
    fortalezas: [
      "Serenidad que ayuda a pensar con claridad en las crisis.",
      "Paciencia para escuchar, enseñar o esperar los resultados.",
      "Constancia y confiabilidad: se puede contar con usted.",
      "Habilidad para mediar y reconciliar posturas distintas.",
      "Trato respetuoso y sin juicios duros hacia las personas.",
      "Equilibrio emocional, que lo protege de las reacciones desmedidas.",
    ],
    cuidar: [
      "Dejar las tareas para después, sobre todo las que no tienen fecha.",
      "Callar lo que piensa o necesita para evitar un desacuerdo.",
      "Resistirse a los cambios o tardar en adaptarse a ellos.",
      "Esperar a que otros decidan o propongan, y quedar al margen de lo que le importa.",
      "Conformarse con poco o dejar pasar oportunidades por comodidad.",
      "Acumular molestias en silencio, que pueden salir de golpe o convertirse en distancia.",
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

/** Las 12 combinaciones (el orden importa: «colérico-sanguíneo» no es «sanguíneo-colérico»). */
export const COMBINACIONES: Record<ClaveCombinacion, { nombre: string; texto: string }> = {
  "S-C": {
    nombre: "Sanguíneo-colérico",
    texto:
      "Su sociabilidad y buen ánimo se combinan con determinación y gusto por liderar: es una persona entusiasta que además logra que las cosas se hagan. El segundo rasgo le aporta dirección y firmeza. La tensión puede aparecer entre querer agradar a todos y querer imponer su criterio, o entre empezar muchas ideas y exigir resultados rápidos.",
  },
  "S-M": {
    nombre: "Sanguíneo-melancólico",
    texto:
      "Su calidez y su entusiasmo conviven con una vida interior más profunda y sensible. El segundo rasgo le aporta cuidado, reflexión y empatía. La tensión puede darse entre mostrarse alegre hacia afuera y guardar preocupaciones o tristezas por dentro, o entre la espontaneidad y el perfeccionismo.",
  },
  "S-F": {
    nombre: "Sanguíneo-flemático",
    texto:
      "Es una persona simpática y de trato fácil, a la vez tranquila y conciliadora. El segundo rasgo le aporta calma y paciencia. La tensión puede estar entre el deseo de novedad y la comodidad de la rutina, y en la tendencia a dejar para después lo que no se hace con entusiasmo.",
  },
  "C-S": {
    nombre: "Colérico-sanguíneo",
    texto:
      "Su determinación y su liderazgo se suavizan con calidez, humor y facilidad para tratar a la gente. El segundo rasgo le aporta cercanía y capacidad de motivar. La tensión puede surgir entre la prisa por lograr resultados y el impulso de disfrutar y empezar cosas nuevas, o entre la firmeza y el deseo de caer bien.",
  },
  "C-M": {
    nombre: "Colérico-melancólico",
    texto:
      "Su energía y su firmeza se unen a un gusto por el orden, el detalle y la calidad: es una persona exigente consigo misma y con los demás. El segundo rasgo le aporta planificación y profundidad. La tensión puede ser interna, entre actuar de inmediato y revisar sin fin, y entre la dureza hacia otros y la autocrítica.",
  },
  "C-F": {
    nombre: "Colérico-flemático",
    texto:
      "Combina determinación con serenidad: suele sacar adelante lo que se propone sin perder la calma exterior. El segundo rasgo le aporta paciencia y constancia. La tensión puede aparecer entre el impulso de dirigir y la tendencia a retirarse y callar, o entre la necesidad de lograr y la comodidad.",
  },
  "M-S": {
    nombre: "Melancólico-sanguíneo",
    texto:
      "Su profundidad y su sensibilidad se alivian con una vena sociable y optimista, que le ayuda a abrirse y a disfrutar. El segundo rasgo le aporta ligereza y expresividad. La tensión puede darse entre el deseo de estar a solas y el de estar con gente, o entre la autocrítica y la capacidad de reír.",
  },
  "M-C": {
    nombre: "Melancólico-colérico",
    texto:
      "Une la reflexión y el cuidado del detalle con decisión y deseo de resultados; es una persona exigente y capaz. El segundo rasgo le aporta iniciativa y firmeza. La tensión puede estar entre dudar y actuar, y entre la autoexigencia y la irritación cuando los demás no están a la altura.",
  },
  "M-F": {
    nombre: "Melancólico-flemático",
    texto:
      "Combina profundidad y reserva con calma y paciencia: suele ser una persona tranquila, cuidadosa y confiable. El segundo rasgo le aporta serenidad y constancia. La tensión puede surgir en una tendencia a retraerse y a preocuparse en silencio, con poca iniciativa para pedir lo que necesita.",
  },
  "F-S": {
    nombre: "Flemático-sanguíneo",
    texto:
      "Su calma y su constancia se acompañan de buen humor y facilidad para relacionarse. El segundo rasgo le aporta expresividad y entusiasmo. La tensión puede estar entre la comodidad de la rutina y el deseo de novedad y compañía, o entre callar para evitar un conflicto y decir lo que piensa para agradar.",
  },
  "F-C": {
    nombre: "Flemático-colérico",
    texto:
      "Es una persona serena y estable que, cuando algo le importa, muestra decisión y firmeza. El segundo rasgo le aporta iniciativa y capacidad de poner límites. La tensión puede darse entre evitar el conflicto durante mucho tiempo y reaccionar con fuerza cuando ya no aguanta más.",
  },
  "F-M": {
    nombre: "Flemático-melancólico",
    texto:
      "Reúne paciencia y serenidad con sensibilidad y gusto por hacer las cosas bien. El segundo rasgo le aporta detalle, reflexión y profundidad. La tensión puede estar entre la comodidad de no cambiar y la preocupación o la autocrítica que guarda en silencio.",
  },
};

export const TEXTO_POCO_DIFERENCIADO =
  "Sus puntajes en los cuatro temperamentos son parecidos: ninguno se destaca claramente sobre los demás. Esto suele describir a una persona flexible, que usa rasgos distintos según lo que pide cada situación. También puede deberse a que contestó pensando en situaciones diferentes o a que le costó reconocerse en las frases. Conviene conversarlo con su psicólogo.";
