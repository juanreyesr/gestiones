/**
 * Biblioteca JJR «Psicopatología» (lote 1): seis fichas clínicas de referencia.
 * Redacción propia. Del DSM-5-TR y la CIE-11 solo se citan códigos; los umbrales se resumen con palabras propias.
 * Base: terapia cognitivo-conductual (TCC) con respaldo empírico.
 */
import type { Biblioteca } from "./tipos";

export const BIBLIOTECA_PSICOPATOLOGIA: Biblioteca = {
  id: "psicopatologia",
  titulo: "Psicopatología",
  descripcion:
    "Seis fichas clínicas de referencia sobre ansiedad, pánico, depresión, adaptación, obsesiones y compulsiones, y procesos de rumiación y estrés. Cada una resume cómo se presenta el cuadro, con qué no confundirlo y cómo abordarlo con terapia cognitivo-conductual.",
  fichas: [
    // 1. ANSIEDAD GENERALIZADA
    {
      id: "ansiedad-generalizada",
      nombre: "Trastorno de ansiedad generalizada",
      codigos: { dsm: "F41.1", cie: "6B00" },
      enPocasPalabras:
        "Es una preocupación difícil de controlar, que salta de un tema a otro (trabajo, dinero, salud, hijos) y que se siente peor que la situación real. En consulta suele verse como una persona tensa, cansada, que «le da vueltas a todo» y que anticipa lo peor casi todos los días.",
      sintomasClave: [
        "Preocupación excesiva por varios temas a la vez, aunque no haya una amenaza inmediata.",
        "Sensación de no poder detener las preocupaciones una vez que empiezan.",
        "Tensión muscular, dolor de cuello o espalda, mandíbula apretada.",
        "Inquietud, sentirse «al borde» o con los nervios de punta.",
        "Cansancio fácil y dificultad para concentrarse o quedarse con la mente en blanco.",
        "Irritabilidad con las personas cercanas.",
        "Sueño ligero o difícil de conciliar por pensar en pendientes.",
        "Búsqueda de seguridad: preguntar mucho, revisar, posponer decisiones.",
      ],
      duracion:
        "La preocupación y la tensión están presentes la mayor parte de los días durante al menos unos 6 meses. Debe haber sufrimiento o afectación real en el trabajo, los estudios o la vida familiar.",
      noConfundir: [
        {
          con: "Preocupación normal ante un problema real",
          diferencia:
            "La normal se limita a un asunto concreto, se resuelve o se calma al actuar y dura poco. En el trastorno es amplia, repetitiva y sigue aunque el problema se haya resuelto.",
        },
        {
          con: "Trastorno de pánico",
          diferencia:
            "En el pánico lo central son los ataques bruscos y el miedo a que se repitan. En la ansiedad generalizada la tensión es constante, sin picos de alarma repentinos como eje.",
        },
        {
          con: "Depresión mayor",
          diferencia:
            "Pueden coexistir. Se distingue por el contenido: en la depresión predomina la tristeza, la pérdida de interés y la culpa; en la ansiedad, el futuro amenazante. Siempre se evalúan ambas.",
        },
        {
          con: "Trastorno obsesivo-compulsivo",
          diferencia:
            "Las obsesiones son imágenes o ideas intrusivas que la persona siente ajenas y que busca anular con rituales. Las preocupaciones son pensamientos verbales sobre problemas de la vida real.",
        },
        {
          con: "Ansiedad por causa médica o por sustancias",
          diferencia:
            "Hipertiroidismo, arritmias, exceso de cafeína o de estimulantes pueden imitar el cuadro. Si el inicio coincide con el cambio médico o el consumo, se descarta primero esa causa.",
        },
      ],
      preguntas: [
        "¿Qué cosas le preocupan más en estos días y cuánto tiempo del día les dedica?",
        "Cuando empieza a preocuparse, ¿qué tanto logra detenerse? ¿Qué hace para calmarse?",
        "¿Qué es lo peor que cree que podría pasar, y qué tan probable le parece?",
        "¿Cómo se siente su cuerpo cuando está preocupado: tensión, sueño, cansancio, estómago?",
        "¿Qué deja de hacer o qué hace de más (revisar, preguntar, posponer) por miedo a que algo salga mal?",
        "¿Desde cuándo viene sintiéndose así y qué estaba pasando en su vida cuando comenzó?",
        "¿Cuánto café, bebidas energéticas, medicamentos u otras sustancias consume en un día normal?",
        "¿Cómo ha afectado esto su trabajo, sus estudios o la relación con su familia?",
      ],
      alertas: [
        "Pensamientos de no querer vivir o de hacerse daño, que pueden aparecer cuando el agotamiento es grande: preguntar directamente, evaluar el riesgo y activar un plan de seguridad.",
        "Síntomas físicos de inicio reciente (palpitaciones, pérdida de peso, temblor, calor constante): derivar a evaluación médica para descartar tiroides, cardiopatía u otras causas.",
        "Consumo de cafeína, estimulantes, alcohol o sedantes para manejar la tensión: explorar y tratar como factor que mantiene el cuadro.",
        "Estado de ánimo muy bajo o sin esperanza asociado: evaluar depresión y, si hay datos de energía exagerada o poca necesidad de dormir, pensar en hipomanía y derivar a psiquiatría.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Aclarar los temas de preocupación, sus desencadenantes y qué hace la persona para sentirse segura. Armar el ciclo situación-pensamiento-emoción-cuerpo-conducta y fijar metas observables.",
          fichas: ["1.1", "1.3"],
        },
        {
          etapa: 2,
          texto:
            "Explicar la ansiedad como respuesta de alarma y cómo la preocupación crónica se mantiene a sí misma. Normalizar sin minimizar.",
          fichas: ["2.1", "2.3"],
        },
        {
          etapa: 3,
          texto:
            "Distinguir preocupaciones con problema que se puede resolver de las hipotéticas (qué pasaría si). Trabajar la intolerancia a la incertidumbre y la creencia de que preocuparse protege (Dugas y Robichaud). Probar con experimentos las predicciones catastróficas.",
          fichas: ["3.3", "3.4"],
        },
        {
          etapa: 4,
          texto:
            "Entrenar relajación aplicada o muscular progresiva, resolución de problemas para lo resoluble, tiempo programado para preocuparse y exposición gradual a conductas de seguridad (revisar, preguntar, posponer).",
          fichas: ["2.4"],
        },
        {
          etapa: 5,
          texto:
            "Repasar lo aprendido, identificar señales tempranas y escribir un plan para recaídas. Espaciar las sesiones y normalizar que la preocupación vuelva en épocas de estrés.",
          fichas: [],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): el sistema sugiere esta ficha cuando el GAD-7 es de 10 o más (ansiedad positiva). Si el puntaje está entre 5 y 9, la marca como pista menor y conviene confirmarla en entrevista.",
        "Seguimiento (MCEA): se sugiere con GAD-7 de 10 o más. En ese caso se revisa también la ficha de pánico como posible diferencial.",
        "Estos puntos de corte orientan, no diagnostican: confirmar siempre con entrevista clínica.",
      ],
      caso:
        "Marta, de 34 años, es contadora en una empresa de la zona 4 de Ciudad de Guatemala. Desde hace casi un año duerme mal porque repasa en su mente errores que podría cometer en el cierre del mes, la salud de su mamá en Quetzaltenango y el pago del préstamo. Dice que «no puede apagar la cabeza», tiene dolor de cuello y revisa tres veces cada reporte antes de enviarlo. En cuanto se resuelve un asunto aparece otro. Su jefe la considera muy responsable, pero ella llega agotada a casa y se irrita con sus hijos.",
      clave:
        "El problema no es que haya algo que resolver, sino que la mente busca certeza total; el tratamiento enseña a tolerar la incertidumbre.",
      referencias: [
        "Dugas, M. J. y Robichaud, M. (2007). Cognitive-behavioral treatment for generalized anxiety disorder: From science to practice. Routledge.",
        "Borkovec, T. D., Alcaine, O. y Behar, E. (2004). Avoidance theory of worry and generalized anxiety disorder. En R. G. Heimberg, C. L. Turk y D. S. Mennin (Eds.), Generalized anxiety disorder: Advances in research and practice (pp. 77-108). Guilford Press.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 2. PÁNICO
    {
      id: "panico",
      nombre: "Trastorno de pánico",
      codigos: { dsm: "F41.0", cie: "6B01" },
      enPocasPalabras:
        "Son ataques de miedo intenso que llegan de repente, con síntomas del cuerpo muy fuertes, y después una preocupación persistente por que vuelvan o por lo que significan. La persona suele acudir a urgencias convencida de que es algo del corazón y luego empieza a evitar lugares o actividades.",
      sintomasClave: [
        "Ataques repentinos que alcanzan su pico en minutos, con corazón acelerado, falta de aire o presión en el pecho.",
        "Mareo, temblor, sudor, hormigueo o sensación de desmayo.",
        "Sensación de irrealidad o de estar separado de uno mismo durante el ataque.",
        "Miedo a morir, a volverse loco o a perder el control.",
        "Preocupación constante por tener otro ataque (miedo al miedo).",
        "Cambios de conducta para evitarlos: no hacer ejercicio, no tomar café, no salir solo.",
        "Búsqueda repetida de seguridad: llevar medicamento, acompañarse, ubicar salidas.",
        "Vigilancia del cuerpo: tomarse el pulso, notar cualquier cambio en la respiración.",
      ],
      duracion:
        "Se requieren ataques inesperados repetidos, y al menos uno de ellos seguido de un mes o más de preocupación por que vuelvan o de cambios de conducta relacionados con ello.",
      noConfundir: [
        {
          con: "Agorafobia",
          diferencia:
            "Puede aparecer junto con el pánico o sin él. Lo central es el miedo a situaciones (transporte, multitudes, estar solo fuera de casa) de las que sería difícil escapar. Se evalúa siempre si hay evitación de ese tipo.",
        },
        {
          con: "Fobia específica o ansiedad social",
          diferencia:
            "En ellas el miedo aparece ante un objeto o situación concreta y esperada. En el pánico el ataque puede surgir sin desencadenante claro, incluso durmiendo.",
        },
        {
          con: "Ansiedad generalizada",
          diferencia:
            "Es una tensión constante sin picos bruscos. En el pánico hay picos de alarma intensos y el miedo a las sensaciones corporales.",
        },
        {
          con: "Causas médicas (tiroides, arritmias, asma, hipoglucemia) o sustancias",
          diferencia:
            "Pueden causar síntomas iguales. Si es la primera vez, hay dolor en el pecho con esfuerzo o antecedentes cardíacos, hay que derivar a evaluación médica antes de concluir.",
        },
      ],
      preguntas: [
        "Cuénteme cómo fue el último ataque, desde que empezó hasta que pasó. ¿Qué sintió en el cuerpo?",
        "¿Qué pensó que estaba pasando en ese momento y qué temía que ocurriera?",
        "¿Los ataques llegan en situaciones concretas o a veces aparecen sin aviso, aun descansando?",
        "¿Qué ha dejado de hacer o dónde evita ir por miedo a que le dé otro?",
        "¿Qué hace para sentirse seguro: llevar a alguien, medicamento, agua, cerca de una salida?",
        "¿Ha sido evaluado por un médico? ¿Qué le dijeron?",
        "¿Cuánto café, energizantes, tabaco, alcohol u otras sustancias usa en un día normal?",
        "¿Cómo está su ánimo en estos días y alguna vez ha sentido que no vale la pena seguir?",
      ],
      alertas: [
        "Primer ataque o dolor torácico con esfuerzo, desmayos o antecedentes cardíacos: derivar a evaluación médica antes de atribuirlo a ansiedad.",
        "Desesperanza, sensación de «no voy a salir de esto» o ideas de muerte: evaluar riesgo suicida de forma directa; en el pánico el riesgo aumenta cuando hay depresión asociada.",
        "Uso de alcohol, sedantes o cannabis para calmarse: puede perpetuar el ciclo y hay que explorarlo sin juzgar.",
        "Aislamiento creciente por evitación (no sale solo, no trabaja): evaluar agorafobia y valorar interconsulta psiquiátrica si el deterioro es marcado o no hay respuesta.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Reconstruir un ataque reciente paso a paso, identificar desencadenantes internos (sensaciones) y externos, y mapear las conductas de seguridad y las evitaciones.",
          fichas: ["1.1", "1.3"],
        },
        {
          etapa: 2,
          texto:
            "Explicar la respuesta de alarma, por qué el ataque es intenso pero no peligroso y cómo el miedo a las sensaciones lo mantiene (modelo de Clark; Barlow y Craske).",
          fichas: ["2.1", "2.4"],
        },
        {
          etapa: 3,
          texto:
            "Reevaluar la interpretación catastrófica de las sensaciones («me da un infarto») con evidencia y con experimentos conductuales. Contrastar lo que ocurre con lo que se predecía.",
          fichas: ["3.1", "3.3"],
        },
        {
          etapa: 4,
          texto:
            "Exposición interoceptiva gradual (provocar sensaciones como acelerar el pulso o hiperventilar de forma controlada) y exposición en vivo a lugares evitados. Reducir las conductas de seguridad.",
          fichas: [],
        },
        {
          etapa: 5,
          texto:
            "Consolidar lo aprendido, anticipar situaciones de riesgo y diseñar un plan para qué hacer si reaparece un ataque. Ir espaciando las sesiones.",
          fichas: [],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): se sugiere esta ficha cuando la subescala de ansiedad del DASS está en banda moderada o más alta.",
        "Seguimiento (MCEA): el pánico se propone como diferencial cuando el GAD-7 es de 10 o más, y se confirma en entrevista.",
        "Ninguna escala diagnostica pánico por sí sola: el criterio clave es la presencia de ataques inesperados con miedo a que se repitan.",
      ],
      caso:
        "Luis, de 27 años, es repartidor de pedidos en moto en Mixco. Hace tres meses, esperando el semáforo, sintió que el corazón se le salía del pecho, le faltaba el aire y creyó que moría. Un familiar lo llevó a emergencias, donde le dijeron que sus exámenes estaban normales. Desde entonces evita el café, ya no hace ejercicio y rechaza pedidos lejos de su colonia por temor a otro ataque. Ha tenido dos más, uno de noche, estando en su cama.",
      clave:
        "Lo que mantiene el pánico no son los ataques, sino el miedo a las sensaciones y la evitación de todo lo que las provoca.",
      referencias: [
        "Barlow, D. H. y Craske, M. G. (2007). Mastery of your anxiety and panic (4.ª ed.). Oxford University Press.",
        "Clark, D. M. (1986). A cognitive approach to panic. Behaviour Research and Therapy, 24(4), 461-470.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 3. DEPRESIÓN MAYOR
    {
      id: "depresion-mayor",
      nombre: "Episodio depresivo mayor / trastorno depresivo mayor",
      codigos: { dsm: "F32.x / F33.x", cie: "6A70 / 6A71" },
      enPocasPalabras:
        "Es un estado de ánimo bajo o de pérdida de interés que dura semanas y se acompaña de cambios en el sueño, el apetito, la energía y la forma de pensar sobre uno mismo. La persona deja de hacer lo que antes disfrutaba, se aísla y puede sentir culpa o desesperanza. Se codifica como único (F32) o recurrente (F33).",
      sintomasClave: [
        "Tristeza, vacío o irritabilidad la mayor parte del día, casi a diario.",
        "Pérdida de interés o de placer en actividades que antes se disfrutaban.",
        "Cambios en el apetito o el peso, y sueño excesivo o insomnio.",
        "Cansancio y falta de energía, o lentitud (o inquietud) notable.",
        "Culpa excesiva o sensación de no valer.",
        "Dificultad para concentrarse o para decidir.",
        "Pensamientos recurrentes de muerte o de no querer vivir.",
        "Retraimiento social y abandono de responsabilidades.",
      ],
      duracion:
        "Varios de estos síntomas están presentes casi todos los días durante al menos 2 semanas, con un cambio claro respecto de cómo era la persona antes, y deterioro importante de su vida. Se descarta que se deban a una sustancia o a una enfermedad médica.",
      noConfundir: [
        {
          con: "Duelo normal",
          diferencia:
            "En el duelo la tristeza viene en oleadas ligadas al recuerdo de la persona fallecida y se conserva la autoestima. En la depresión mayor el ánimo bajo es constante y aparecen culpa global y sentimientos de inutilidad.",
        },
        {
          con: "Trastorno de adaptación",
          diferencia:
            "Responde a un estresor identificable y no cumple el conjunto de síntomas de un episodio mayor. Si se cumple el cuadro completo, se diagnostica depresión.",
        },
        {
          con: "Trastorno bipolar",
          diferencia:
            "Hay que preguntar siempre por periodos previos de ánimo elevado o irritable, mucha energía y poca necesidad de dormir. Si existieron, no se trata como depresión unipolar ni se inicia solo tratamiento antidepresivo.",
        },
        {
          con: "Distimia (depresión persistente)",
          diferencia:
            "Es un ánimo bajo crónico, más leve, de dos años o más. Un episodio mayor puede aparecer encima.",
        },
        {
          con: "Causas médicas o por sustancias",
          diferencia:
            "Hipotiroidismo, anemia, déficit de vitamina B12, alcohol y algunos medicamentos pueden causar el cuadro. Se revisa con el médico.",
        },
      ],
      preguntas: [
        "¿Cómo ha estado su ánimo en las últimas semanas? ¿Desde cuándo se siente así?",
        "¿Qué cosas dejó de disfrutar o de hacer que antes le gustaban?",
        "¿Cómo están su sueño, su apetito y su energía comparados con lo habitual?",
        "¿Qué se dice a sí mismo sobre usted y sobre su futuro cuando se siente mal?",
        "¿Ha pensado que sería mejor no estar aquí o en hacerse daño? ¿Con qué frecuencia y qué ha pensado hacer?",
        "¿Alguna vez ha tenido temporadas de mucha energía, de dormir muy poco sin cansarse o de sentirse extraordinariamente bien?",
        "¿Qué ha pasado en su vida en los últimos meses: pérdidas, problemas de trabajo, de pareja o de dinero?",
        "¿Toma alcohol u otras sustancias, o algún medicamento, y cómo han cambiado en este tiempo?",
      ],
      alertas: [
        "Ideas de muerte, de suicidio o planes: preguntar de forma directa y sin rodeos, valorar intención, plan, acceso a medios y antecedentes. Si el riesgo es alto o inminente, no dejar sola a la persona, avisar a un familiar y coordinar atención de urgencia.",
        "Antecedentes de periodos de euforia, poca necesidad de dormir o irritabilidad marcada (posible manía o hipomanía): sospechar trastorno bipolar y derivar a psiquiatría antes de seguir con la psicoterapia como único tratamiento.",
        "Síntomas psicóticos (voces, ideas delirantes de culpa o ruina) o rechazo de alimentos: interconsulta psiquiátrica urgente.",
        "Causas médicas o consumo: solicitar valoración médica (tiroides, anemia, B12) y explorar alcohol u otras sustancias.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Evaluar gravedad y riesgo suicida, descartar bipolaridad y causas médicas. Reconstruir cuándo empezó, qué lo desencadenó y cómo se relacionan lo que hace, lo que piensa y cómo se siente.",
          fichas: ["1.1", "1.2", "1.3"],
        },
        {
          etapa: 2,
          texto:
            "Explicar el círculo del desánimo: menos actividad lleva a menos placer y logro, y eso empeora el ánimo. Presentar la depresión como un problema tratable, no como un defecto personal.",
          fichas: ["2.2"],
        },
        {
          etapa: 3,
          texto:
            "Identificar y poner a prueba los pensamientos negativos automáticos sobre sí mismo, el mundo y el futuro (Beck). Revisar la rumiación y trabajar creencias de inutilidad con evidencia y alternativas.",
          fichas: ["3.1", "3.2", "3.3"],
        },
        {
          etapa: 4,
          texto:
            "Activación conductual: registrar la actividad, programar tareas de placer y de dominio ligadas a valores y avanzar de a poco, aunque no haya ganas (Martell, Dimidjian y Herman-Dunn).",
          fichas: ["1.4"],
        },
        {
          etapa: 5,
          texto:
            "Identificar señales tempranas de recaída, consolidar hábitos de actividad y de sueño, y planear sesiones de refuerzo. Valorar entrenamiento en atención plena para prevenir recaídas en depresión recurrente (Segal, Williams y Teasdale).",
          fichas: [],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): se sugiere cuando la subescala de depresión del DASS está en banda moderada o más alta.",
        "Seguimiento (MCEA): se sugiere cuando el PHQ-9 es de 10 o más. Revisar siempre el ítem 9 (ideas de muerte) y activar la evaluación de riesgo.",
        "El puntaje orienta, no diagnostica: confirmar con entrevista, descartar manía y causas médicas.",
      ],
      caso:
        "Carmen, de 41 años, es maestra de primaria en Chimaltenango y madre de tres hijos. Desde hace unos cuatro meses, tras quedarse sin el apoyo económico de su esposo, que emigró, se siente sin ánimo, duerme poco, ha bajado de peso y le cuesta preparar las clases. Dejó de ir a la iglesia y a las reuniones con sus amigas, y a veces piensa que sus hijos estarían mejor sin ella. Se culpa por «no haber sabido retenerlo» y llora a escondidas. No ha tenido periodos de mucha energía ni consume alcohol.",
      clave:
        "Primero se evalúa el riesgo; después se rompe el círculo del desánimo empezando por la conducta, porque el ánimo sigue a la acción.",
      referencias: [
        "Beck, A. T., Rush, A. J., Shaw, B. F. y Emery, G. (1979). Cognitive therapy of depression. Guilford Press.",
        "Martell, C. R., Dimidjian, S. y Herman-Dunn, R. (2010). Behavioral activation for depression: A clinician's guide. Guilford Press.",
        "Segal, Z. V., Williams, J. M. G. y Teasdale, J. D. (2002). Mindfulness-based cognitive therapy for depression: A new approach to preventing relapse. Guilford Press.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
      ],
    },

    // 4. ADAPTACIÓN
    {
      id: "adaptacion",
      nombre: "Trastorno de adaptación",
      codigos: { dsm: "F43.2x", cie: "6B43" },
      enPocasPalabras:
        "Es una reacción emocional o conductual desproporcionada que aparece poco después de un estresor identificable (pérdida de empleo, separación, enfermedad, migración, mudanza). Causa malestar o deterioro, pero no llega a cumplir los criterios de otro trastorno como la depresión mayor o la ansiedad generalizada.",
      sintomasClave: [
        "Un estresor reconocible (o varios) que marca el inicio de los síntomas.",
        "Ánimo bajo, llanto fácil o sensación de desánimo.",
        "Nerviosismo, preocupación o sensación de estar abrumado.",
        "Irritabilidad o enojo desproporcionado ante el problema.",
        "Cambios de conducta: faltar al trabajo o a clases, peleas, aislamiento, consumo de alcohol.",
        "Dificultad para concentrarse o para cumplir las tareas habituales.",
        "Malestar más intenso de lo que se esperaría para la situación, o afectación notable de la vida diaria.",
      ],
      duracion:
        "Los síntomas comienzan en los 3 meses siguientes al estresor y suelen ceder en unos 6 meses una vez que el estresor termina o la persona se adapta. Si el estresor continúa, el cuadro puede persistir.",
      noConfundir: [
        {
          con: "Episodio depresivo mayor",
          diferencia:
            "Si el conjunto completo de síntomas depresivos está presente, se diagnostica depresión aunque haya habido un desencadenante claro. Se descarta ese cuadro antes de usar la categoría de adaptación.",
        },
        {
          con: "Trastorno de ansiedad generalizada",
          diferencia:
            "En ese caso las preocupaciones son amplias, no ligadas a un estresor concreto, y duran más de 6 meses.",
        },
        {
          con: "Trastorno de estrés postraumático o por estrés agudo",
          diferencia:
            "Requieren un suceso traumático (amenaza de muerte, lesión grave, violencia) con síntomas de reexperimentación, evitación e hiperalerta. Un estresor corriente, aunque doloroso, no lo es.",
        },
        {
          con: "Duelo normal",
          diferencia:
            "La tristeza tras una pérdida es esperable y no se patologiza salvo que sea de intensidad o duración que supere lo culturalmente esperado y afecte la vida.",
        },
        {
          con: "Reacción normal al estrés",
          diferencia:
            "Es breve, proporcionada y la persona sigue funcionando. En la adaptación hay más malestar del esperado o deterioro claro.",
        },
      ],
      preguntas: [
        "¿Qué ha pasado en su vida en los últimos meses que le haya costado más asimilar?",
        "¿Cuándo empezó a sentirse distinto respecto de ese cambio o ese problema?",
        "¿Qué es lo que más le pesa o le preocupa de esa situación?",
        "¿Cómo ha cambiado su forma de dormir, comer, trabajar o relacionarse con los demás?",
        "¿Qué ha intentado hacer para sobrellevarlo y qué tanto le ha servido?",
        "¿Con quién cuenta para apoyarse y qué recursos o fortalezas le han ayudado antes en momentos difíciles?",
        "¿Ha pensado alguna vez que no vale la pena seguir o en hacerse daño por esta situación?",
        "¿Cómo ha estado el consumo de alcohol u otras sustancias desde que ocurrió?",
      ],
      alertas: [
        "Ideas de suicidio o de hacerse daño: en adaptación el riesgo es real, sobre todo en adolescentes y ante pérdidas bruscas (empleo, separación, deudas). Preguntar directamente y evaluar plan, intención y acceso a medios.",
        "Consumo de alcohol u otras sustancias como forma de afrontar: explorar y abordar como parte del plan.",
        "Síntomas que se agravan o se prolongan más de lo esperado: reevaluar para descartar depresión mayor, ansiedad o trastorno por estrés postraumático.",
        "Violencia, abuso o amenazas en el entorno (pareja, familia, trabajo): evaluar seguridad y coordinar protección.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Identificar el estresor, ordenar la cronología de los hechos y construir el ciclo entre la situación, lo que piensa, lo que siente y lo que hace. Definir qué parte del problema se puede cambiar y cuál hay que aceptar.",
          fichas: ["1.1", "1.2", "1.3"],
        },
        {
          etapa: 2,
          texto:
            "Normalizar la reacción como respuesta humana a un cambio exigente, y explicar cómo la evitación o el aislamiento pueden prolongarla.",
          fichas: ["2.2", "2.4"],
        },
        {
          etapa: 3,
          texto:
            "Revisar los pensamientos que intensifican el malestar («no voy a poder», «todo está perdido») y reformularlos con evidencia. Distinguir lo controlable de lo que no lo es.",
          fichas: ["3.4"],
        },
        {
          etapa: 4,
          texto:
            "Resolución de problemas sobre el estresor, reactivar rutinas y actividades valiosas, buscar apoyo social y entrenar habilidades de afrontamiento y regulación emocional.",
          fichas: [],
        },
        {
          etapa: 5,
          texto:
            "Revisar lo aprendido y preparar a la persona para futuros cambios. Cerrar pronto: en adaptación suele bastar un proceso breve.",
          fichas: [],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): se sugiere cuando la subescala de estrés del DASS está en banda moderada o más alta.",
        "El sistema no detecta el estresor: la hipótesis se confirma en entrevista si el malestar empezó después de un cambio o suceso identificable y no cumple los criterios de depresión, ansiedad generalizada u otro trastorno.",
        "Ningún puntaje define el trastorno: la clave es el estresor, el momento de inicio y la afectación en la vida diaria.",
      ],
      caso:
        "Pedro, de 52 años, trabajó dieciocho años en una fábrica en Villa Nueva hasta que la cerraron hace dos meses. Desde entonces se siente irritable, discute con su esposa por el dinero y duerme mal por pensar en las cuentas. Ha rechazado dos ofertas informales de trabajo porque «a su edad nadie lo contrata». Toma más cervezas los fines de semana de lo habitual. Antes de esto no había tenido problemas emocionales y no cumple el cuadro completo de una depresión.",
      clave:
        "Hay un estresor, un inicio cercano y una reacción desproporcionada; antes de usar este diagnóstico se descartan la depresión mayor y el estrés postraumático.",
      referencias: [
        "Beck, J. S. (2011). Cognitive behavior therapy: Basics and beyond (2.ª ed.). Guilford Press.",
        "Nezu, A. M., Nezu, C. M. y D'Zurilla, T. J. (2013). Problem-solving therapy: A treatment manual. Springer.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 5. TOC
    {
      id: "toc",
      nombre: "Trastorno obsesivo-compulsivo",
      codigos: { dsm: "F42.2", cie: "6B20" },
      enPocasPalabras:
        "Se caracteriza por obsesiones (ideas, imágenes o impulsos intrusivos que causan mucha angustia) y compulsiones (rituales físicos o mentales que la persona hace para aliviarla o evitar un daño temido). El alivio dura poco y el ciclo se repite, consumiendo horas del día.",
      sintomasClave: [
        "Pensamientos o imágenes intrusivas y no deseadas (contaminación, daño, duda, orden, contenido sexual o religioso).",
        "Rituales visibles: lavarse, revisar, ordenar, contar, repetir.",
        "Rituales mentales: rezar, repasar, neutralizar un pensamiento con otro, pedir seguridad a otros.",
        "Necesidad de que algo se sienta «justo bien» o de sentir certeza.",
        "Evitación de lugares, objetos o personas ligados a las obsesiones.",
        "Gran pérdida de tiempo (más de una hora diaria) y afectación del trabajo o la familia.",
        "Conciencia, en distinto grado, de que el temor es exagerado, aunque en algunas personas es casi nula.",
        "Culpa o vergüenza por el contenido de los pensamientos, que lleva a ocultarlos.",
      ],
      duracion:
        "Las obsesiones, las compulsiones o ambas consumen más de una hora al día o causan sufrimiento o deterioro importante. No hay un tiempo mínimo de evolución, pero suele ser un cuadro crónico si no se trata.",
      noConfundir: [
        {
          con: "Ansiedad generalizada",
          diferencia:
            "Las preocupaciones tratan de problemas reales y no se acompañan de rituales que neutralicen. En el TOC hay una ritualización clara.",
        },
        {
          con: "Trastorno obsesivo-compulsivo de la personalidad",
          diferencia:
            "Es un patrón de perfeccionismo y rigidez que la persona considera adecuado a su forma de ser. En el TOC los pensamientos son vividos como ajenos y generan angustia.",
        },
        {
          con: "Fobias específicas",
          diferencia:
            "El miedo es a un objeto o situación concreta, y no hay obsesiones ni rituales como en el TOC.",
        },
        {
          con: "Tics y trastornos del espectro (tricotilomanía, dismorfia)",
          diferencia:
            "Los tics y las conductas repetitivas del cuerpo no responden a una obsesión ni buscan neutralizar un temor.",
        },
        {
          con: "Psicosis o depresión con rumiación",
          diferencia:
            "En la psicosis las ideas se viven como verdaderas, sin lucha interna. En la rumiación depresiva el contenido es de tristeza y culpa, sin rituales.",
        },
      ],
      preguntas: [
        "¿Hay pensamientos, imágenes o impulsos que le llegan sin querer y que le cuesta sacarse de la cabeza?",
        "¿Qué teme que pasaría si no los atiende o no hiciera lo que hace?",
        "¿Hay cosas que tiene que hacer una y otra vez, o de cierta manera, para sentirse tranquilo?",
        "¿Cuánto tiempo al día le llevan estos pensamientos y esas conductas?",
        "¿Qué lugares, objetos o personas evita por esto?",
        "¿Pide a otros que le aseguren que todo está bien, o revisa en internet o con alguien de confianza?",
        "¿Qué tan convencido está de que lo que teme podría ocurrir de verdad?",
        "¿Cómo ha afectado esto su trabajo, su familia o su descanso?",
      ],
      alertas: [
        "Pensamientos intrusivos de daño que la persona vive como ajenos y rechaza: no son señal de peligro hacia otros y deben recibirse con calma. Preguntar por su sentido y evaluar siempre si hay impulso real o psicosis.",
        "Insight pobre o ideas casi delirantes sobre la contaminación o el daño: evaluar trastorno psicótico y derivar a psiquiatría.",
        "Ideas de suicidio, frecuentes por agotamiento o vergüenza: evaluar riesgo y plan.",
        "La exposición con prevención de respuesta (EPR) no se improvisa ni se indica sin guía: se diseña con jerarquía, ritmo y supervisión clínica; no dar instrucciones de exposición a la persona o a la familia por cuenta propia, ya que mal hecha puede aumentar la angustia.",
        "Consumo de sustancias o inicio brusco en niños tras una infección: valorar interconsulta médica o psiquiátrica.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Registrar obsesiones, desencadenantes, compulsiones (también las mentales) y evitaciones. Medir tiempo y gravedad, y construir un mapa del ciclo obsesión-angustia-ritual-alivio breve.",
          fichas: ["1.1", "1.3"],
        },
        {
          etapa: 2,
          texto:
            "Explicar que los pensamientos intrusivos son comunes en toda persona y que el problema es la interpretación y el ritual que los mantiene. Mostrar por qué el alivio de los rituales refuerza el ciclo.",
          fichas: ["2.3", "2.4"],
        },
        {
          etapa: 3,
          texto:
            "Trabajar las creencias que sostienen el cuadro: responsabilidad exagerada, necesidad de control del pensamiento y fusión pensamiento-acción. Reencuadrar el significado de la obsesión sin buscar certeza.",
          fichas: [],
        },
        {
          etapa: 4,
          texto:
            "Exposición con prevención de respuesta (Foa): armar una jerarquía y exponerse de forma gradual y prolongada a lo temido sin hacer el ritual. Se hace con guía del terapeuta y con acuerdo explícito de la persona.",
          fichas: [],
        },
        {
          etapa: 5,
          texto:
            "Consolidar ganancias, retomar las áreas de vida limitadas por el TOC y preparar un plan ante recaídas: reconocer rituales sutiles, evitar buscar seguridad y mantener la práctica de exposición.",
          fichas: [],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): se sugiere con el DOCS en 18 o más. También se sugiere cuando alguna de sus dimensiones (contaminación, responsabilidad por daño, pensamientos inaceptables, simetría) llega a 8 o más.",
        "Seguimiento (MCEA): no hay un punto de corte específico; el TOC se considera cuando la entrevista revela obsesiones y rituales, no por GAD-7 o PHQ-9.",
        "Un puntaje alto orienta la entrevista y no equivale al diagnóstico.",
      ],
      caso:
        "Andrea, de 22 años, estudia Enfermería en Quetzaltenango. Desde hace un año le vienen imágenes de contagiar a su abuela con alguna enfermedad. Se lava las manos hasta que le sangran, cambia de ropa al llegar a la casa y evita abrazar a su familia. Le toma casi tres horas prepararse para salir. Sabe que es exagerado, pero siente que «si no lo hago, puede pasar algo terrible». Siente vergüenza y no se lo había contado a nadie.",
      clave:
        "Las compulsiones alivian un momento y alimentan el ciclo: el tratamiento consiste en enfrentar la duda sin hacer el ritual.",
      referencias: [
        "Foa, E. B., Yadin, E. y Lichner, T. K. (2012). Exposure and response (ritual) prevention for obsessive-compulsive disorder: Therapist guide (2.ª ed.). Oxford University Press.",
        "Abramowitz, J. S. (2018). Getting over OCD: A 10-step workbook for taking back your life (2.ª ed.). Guilford Press.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 6. RUMIACIÓN Y ESTRÉS
    {
      id: "rumiacion-estres",
      nombre: "Rumiación, preocupación y estrés: procesos transdiagnósticos",
      codigos: { dsm: "Sin código propio (proceso transdiagnóstico)", cie: "Sin código propio (proceso transdiagnóstico)" },
      enPocasPalabras:
        "La rumiación (dar vueltas al pasado y a las causas del malestar) y la preocupación (dar vueltas al futuro) son formas de pensamiento repetitivo que no son un diagnóstico, sino un proceso que mantiene muchos cuadros, sobre todo ansiedad y depresión. El estrés sostenido las alimenta. Se evalúan y se tratan aunque no haya un trastorno definido.",
      sintomasClave: [
        "Pensamientos repetitivos y difíciles de soltar sobre el pasado («por qué me pasó») o el futuro («qué pasaría si»).",
        "Sensación de que pensar tanto ayuda, aunque no se llega a ninguna solución.",
        "Dificultad para dormir o desconectarse por la mente activa.",
        "Tensión corporal, cansancio, dolores de cabeza o del estómago.",
        "Irritabilidad, impaciencia y sensación de estar sobrepasado.",
        "Autocrítica y repaso de errores.",
        "Evitar actuar o decidir mientras se sigue pensando.",
        "Más malestar emocional después de cada episodio de rumiación.",
      ],
      duracion:
        "No hay un umbral diagnóstico. Se considera clínicamente relevante cuando los pensamientos repetitivos ocupan buena parte del día, cuestan controlarse y se mantienen por semanas o meses, con malestar o afectación del sueño, el trabajo o las relaciones.",
      noConfundir: [
        {
          con: "Depresión mayor",
          diferencia:
            "La rumiación es un síntoma y un factor de mantenimiento de la depresión, pero la depresión incluye cambios de ánimo, interés, sueño y energía. Si se cumple el cuadro, se diagnostica y se trata la depresión, y la rumiación es un blanco específico.",
        },
        {
          con: "Ansiedad generalizada",
          diferencia:
            "La preocupación es su rasgo central, pero se reconoce como diagnóstico solo con la intensidad, amplitud y duración suficientes.",
        },
        {
          con: "Obsesiones del TOC",
          diferencia:
            "Las obsesiones son intrusiones vividas como ajenas y se acompañan de rituales. La rumiación y la preocupación son pensamientos verbales sobre problemas reales o pasados.",
        },
        {
          con: "Estrés postraumático",
          diferencia:
            "Se parece por el repaso del pasado, pero requiere un suceso traumático y síntomas de reexperimentación vívida, evitación e hiperalerta.",
        },
        {
          con: "Reflexión útil o resolución de problemas",
          diferencia:
            "La reflexión útil conduce a decisiones y se acaba. La rumiación no avanza, se centra en el porqué y deja a la persona peor.",
        },
      ],
      preguntas: [
        "¿Cuándo le pasa que no puede dejar de darle vueltas a algo? ¿Qué suele ser?",
        "Cuando piensa en eso, ¿se trata más de lo que ya pasó o de lo que podría pasar?",
        "¿Cuánto tiempo al día le dedica y cómo se siente después: mejor, igual o peor?",
        "¿Qué piensa que le aporta darle tantas vueltas?",
        "¿Qué cosas deja de hacer mientras está pensando en eso?",
        "¿En qué momentos del día o de la semana es más intenso (en la noche, en el tráfico, en el trabajo)?",
        "¿Qué fuentes de estrés tiene hoy en el trabajo, la familia o el dinero, y cuáles puede cambiar?",
        "¿Qué ha probado para detenerse y qué le ha funcionado aunque sea un poco?",
      ],
      alertas: [
        "Pensamientos de desesperanza, de ser una carga o de no querer vivir: la rumiación aumenta el riesgo suicida en depresión; preguntar directamente y evaluar el riesgo.",
        "Rumiación con ánimo bajo persistente, pérdida de interés o de peso: evaluar depresión mayor y descartar hipomanía o manía antes de decidir el enfoque.",
        "Estrés crónico con síntomas físicos de reciente inicio (palpitaciones, dolor de pecho, pérdida de peso): derivar a valoración médica para descartar tiroides, cardíacas u otras causas.",
        "Uso de cafeína en exceso, alcohol o sedantes para apagar la mente: explorarlo y trabajarlo como parte del plan.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Identificar cuándo, dónde y sobre qué ocurre el pensamiento repetitivo, y qué función cree la persona que cumple. Registrar el ciclo y cómo se siente al terminar.",
          fichas: ["1.1", "1.3"],
        },
        {
          etapa: 2,
          texto:
            "Explicar que los pensamientos van y vuelven, que darles vueltas no es lo mismo que resolver y que el estrés sostenido los alimenta. Mostrar el papel de la evitación y de la preocupación como estrategia.",
          fichas: ["2.3", "2.4"],
        },
        {
          etapa: 3,
          texto:
            "Cuestionar las creencias sobre la utilidad del pensamiento repetitivo (Wells, metacognición) y la rumiación abstracta del «por qué». Practicar el paso a pensamiento concreto y específico (Watkins).",
          fichas: ["3.4"],
        },
        {
          etapa: 4,
          texto:
            "Entrenar atención al presente y desanclaje de los pensamientos, tiempo programado para preocuparse, resolución de problemas para lo que sí se puede resolver, y reducción de fuentes de estrés con rutinas, descanso y límites.",
          fichas: [],
        },
        {
          etapa: 5,
          texto:
            "Reconocer señales tempranas de que el pensamiento repetitivo vuelve, mantener las estrategias que sirvieron y planear sesiones de refuerzo en épocas de más estrés.",
          fichas: [],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): se sugiere cuando el cuestionario de pensamiento repetitivo (PTQ) llega a 37 o más. También cuando está en 22 o más y a la vez hay síntomas de ansiedad (GAD) o de depresión.",
        "Seguimiento (MCEA): se sugiere cuando el nivel del PTQ es 2 o más.",
        "Es un proceso, no un diagnóstico: orienta el tratamiento del cuadro principal.",
      ],
      caso:
        "Roberto, de 38 años, trabaja en un banco de Escuintla y es el único sostén de su familia. Tras un reclamo de su jefe, pasa las noches repasando lo que dijo y lo que debió responder, y luego imaginando que lo despedirán. Duerme cuatro horas, llega con dolor de cabeza y está irritable con su hija. Cree que «pensarlo todo» lo mantiene alerta. No cumple criterios de depresión ni de ansiedad generalizada, pero el cansancio y el desgaste le preocupan.",
      clave:
        "Darle vueltas se siente como resolver, pero no lo es; el tratamiento cambia el cómo se piensa, no solo el qué.",
      referencias: [
        "Watkins, E. R. (2016). Rumination-focused cognitive-behavioral therapy for depression. Guilford Press.",
        "Wells, A. (2009). Metacognitive therapy for anxiety and depression. Guilford Press.",
        "Barlow, D. H., Farchione, T. J., Sauer-Zavala, S. et al. (2018). Unified protocol for transdiagnostic treatment of emotional disorders: Therapist guide (2.ª ed.). Oxford University Press.",
        "Borkovec, T. D., Alcaine, O. y Behar, E. (2004). Avoidance theory of worry and generalized anxiety disorder. En R. G. Heimberg, C. L. Turk y D. S. Mennin (Eds.), Generalized anxiety disorder (pp. 77-108). Guilford Press.",
      ],
    },
  ],
};
