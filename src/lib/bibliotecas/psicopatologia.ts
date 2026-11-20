/**
 * Biblioteca JJR «Psicopatología» (lotes 1 y 2): doce fichas clínicas de referencia.
 * Redacción propia. Del DSM-5-TR y la CIE-11 solo se citan códigos; los umbrales se resumen con palabras propias.
 * Base: terapia cognitivo-conductual (TCC) con respaldo empírico.
 */
import type { BibliotecaClinica } from "./tipos";

export const BIBLIOTECA_PSICOPATOLOGIA: BibliotecaClinica = {
  id: "psicopatologia",
  tipo: "clinica",
  titulo: "Psicopatología",
  descripcion:
    "Doce fichas clínicas de referencia sobre ansiedad generalizada, pánico, ansiedad social, fobia específica, depresión mayor y persistente, adaptación, obsesiones y compulsiones, estrés postraumático, duelo prolongado, insomnio, y procesos de rumiación y estrés. Cada una resume cómo se presenta el cuadro, con qué no confundirlo y cómo abordarlo con terapia cognitivo-conductual.",
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
          fichas: ["2.4", "4.2", "4.3"],
        },
        {
          etapa: 5,
          texto:
            "Repasar lo aprendido, identificar señales tempranas y escribir un plan para recaídas. Espaciar las sesiones y normalizar que la preocupación vuelva en épocas de estrés.",
          fichas: ["5.1", "5.2", "5.3"],
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
          fichas: ["4.2", "4.4"],
        },
        {
          etapa: 5,
          texto:
            "Consolidar lo aprendido, anticipar situaciones de riesgo y diseñar un plan para qué hacer si reaparece un ataque. Ir espaciando las sesiones.",
          fichas: ["5.1", "5.2", "5.3"],
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
          fichas: ["1.4", "4.1", "4.5"],
        },
        {
          etapa: 5,
          texto:
            "Identificar señales tempranas de recaída, consolidar hábitos de actividad y de sueño, y planear sesiones de refuerzo. Valorar entrenamiento en atención plena para prevenir recaídas en depresión recurrente (Segal, Williams y Teasdale).",
          fichas: ["5.1", "5.2", "5.3"],
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
          fichas: ["4.1", "4.2"],
        },
        {
          etapa: 5,
          texto:
            "Revisar lo aprendido y preparar a la persona para futuros cambios. Cerrar pronto: en adaptación suele bastar un proceso breve.",
          fichas: ["5.1", "5.3"],
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
          fichas: ["4.4"],
        },
        {
          etapa: 5,
          texto:
            "Consolidar ganancias, retomar las áreas de vida limitadas por el TOC y preparar un plan ante recaídas: reconocer rituales sutiles, evitar buscar seguridad y mantener la práctica de exposición.",
          fichas: ["5.1", "5.3"],
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
          fichas: ["4.3", "4.2"],
        },
        {
          etapa: 5,
          texto:
            "Reconocer señales tempranas de que el pensamiento repetitivo vuelve, mantener las estrategias que sirvieron y planear sesiones de refuerzo en épocas de más estrés.",
          fichas: ["5.1", "5.3"],
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

    // 7. ANSIEDAD SOCIAL
    {
      id: "ansiedad-social",
      nombre: "Trastorno de ansiedad social",
      codigos: { dsm: "F40.10", cie: "6B04" },
      enPocasPalabras:
        "Es un miedo intenso a ser juzgado, quedar en ridículo o que los demás noten que uno está nervioso, en situaciones donde hay otras personas (hablar en público, conversar, comer frente a otros). La persona evita esas situaciones o las aguanta con mucha angustia, y después repasa lo que hizo y lo que «habrán pensado» de ella.",
      sintomasClave: [
        "Miedo marcado a que los demás la evalúen mal: parecer torpe, aburrida, ansiosa o rara.",
        "Temor a que se le note el rubor, el temblor, la sudoración o la voz quebrada.",
        "Evitación de reuniones, exposiciones, llamadas, comer o firmar frente a otros.",
        "Conductas de seguridad: hablar poco, ensayar cada frase, sujetarse las manos, mirar el celular, llegar con alguien.",
        "Atención muy centrada en sí misma durante la interacción, con una imagen interna de «cómo me veo».",
        "Anticipación angustiosa días antes de un evento social.",
        "Repaso mental posterior de lo que dijo o hizo, casi siempre con juicios duros.",
        "Limitación real de estudios, empleo, amistades o pareja.",
      ],
      duracion:
        "El miedo es persistente, de unos 6 meses o más, y casi siempre aparece en las situaciones sociales temidas. Es desproporcionado frente al riesgo real y causa sufrimiento o limita la vida de la persona.",
      noConfundir: [
        {
          con: "Timidez o nerviosismo normal",
          diferencia:
            "La timidez no impide hacer lo que importa y se calma con el tiempo. En el trastorno hay evitación sostenida, sufrimiento y limitación en el trabajo, los estudios o las relaciones.",
        },
        {
          con: "Trastorno de pánico y agorafobia",
          diferencia:
            "En ansiedad social el miedo gira en torno a la evaluación de los demás. En el pánico hay ataques inesperados y miedo a las sensaciones; en la agorafobia, miedo a situaciones de las que sería difícil escapar.",
        },
        {
          con: "Ansiedad generalizada",
          diferencia:
            "En esta las preocupaciones abarcan muchos temas de la vida. En la social, el temor se concentra en situaciones de exposición o de interacción con otras personas.",
        },
        {
          con: "Depresión o rasgos de personalidad evitativa",
          diferencia:
            "En la depresión el retraimiento se debe a la falta de interés o de energía, no al miedo. La personalidad evitativa es un patrón más amplio y de toda la vida; pueden coexistir y conviene evaluarlas.",
        },
        {
          con: "Trastorno del espectro autista o miedo por un defecto físico real",
          diferencia:
            "En el autismo hay diferencias de comunicación desde la infancia, no solo miedo a ser juzgado. Si el temor se centra en un defecto corporal, explorar dismorfia corporal.",
        },
      ],
      preguntas: [
        "¿En qué situaciones con otras personas se siente más incómodo o con más miedo?",
        "¿Qué teme que pase, o qué piensa que los demás van a notar o pensar de usted?",
        "¿Qué siente en el cuerpo en esos momentos y qué teme que se le note?",
        "¿Qué hace para sentirse más seguro (ensayar, callarse, evitar la mirada, llevar a alguien)?",
        "¿Qué situaciones evita o a cuáles va sufriendo? ¿Qué le ha costado por ello en el trabajo o los estudios?",
        "Después de una reunión o una conversación, ¿qué suele pensar de cómo le fue?",
        "¿Desde cuándo le pasa esto y cómo era en la niñez o la adolescencia?",
        "¿Usa alcohol u otras sustancias para poder estar con la gente?",
      ],
      alertas: [
        "Ideas de muerte o de no querer seguir, a veces por soledad o vergüenza crónica: preguntar directamente y evaluar plan, intención y acceso a medios.",
        "Alcohol, sedantes u otras sustancias para poder socializar: explorar sin juzgar, ya que mantiene el problema y puede llevar a dependencia.",
        "Depresión asociada, que es frecuente tras años de evitación: evaluarla siempre y valorar su gravedad.",
        "Aislamiento marcado, abandono de estudios o del trabajo: aumentar el apoyo y priorizar metas que devuelvan funcionamiento.",
      ],
      plan: [
        {
          etapa: 2,
          texto:
            "Explicar el miedo como alarma ante la evaluación social y mostrar cómo la atención en uno mismo, las conductas de seguridad y el repaso posterior lo mantienen (modelo de Clark y Wells).",
          fichas: ["2.1", "2.4"],
        },
        {
          etapa: 3,
          texto:
            "Identificar las predicciones («se van a dar cuenta», «me voy a quedar en blanco») y la imagen que la persona tiene de sí misma en público. Ponerlas a prueba con evidencia y con otra mirada sobre el repaso posterior.",
          fichas: ["3.1", "3.3"],
        },
        {
          etapa: 4,
          texto:
            "Exposición con experimentos conductuales: armar una escalera de situaciones temidas, practicarlas sin conductas de seguridad y con la atención puesta afuera, y comparar lo que ocurrió con lo que se predecía (Clark y Wells; Heimberg). La arma el terapeuta junto con la persona.",
          fichas: ["4.4"],
        },
        {
          etapa: 5,
          texto:
            "Consolidar los avances, seguir buscando situaciones sociales en lugar de volver a evitarlas y escribir un plan para los períodos de más exigencia. Espaciar las sesiones.",
          fichas: ["5.1", "5.3"],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): la hipótesis de activación autonómica / pánico y otros trastornos de ansiedad incluye la ansiedad social; en ese caso el sistema sugiere esta ficha. No hay una escala propia de ansiedad social dentro del sistema.",
        "Seguimiento (MCEA): un GAD-7 de 10 o más lista la ansiedad social como diferencial, pero no la detecta. Se confirma en entrevista según la situación que provoca el miedo.",
        "Como instrumento externo validado puede usarse la LSAS (Escala de Ansiedad Social de Liebowitz) o la SPIN, para medir gravedad y cambio. Se aplican por separado y con su propia licencia; sus ítems no se reproducen aquí.",
      ],
      caso:
        "Diego, de 24 años, estudia Administración en la Universidad de San Carlos y trabaja medio tiempo en una tienda de Mixco. Evita las exposiciones en clase y ya reprobó un curso por no presentar. Antes de una reunión ensaya cada frase y, cuando habla, aprieta las manos porque cree que «todos notan que me tiemblan». Al llegar a casa repasa cada palabra que dijo y se dice que quedó como tonto. Rechazó un ascenso que le exigía dirigir al equipo.",
      clave:
        "Lo que mantiene el miedo no son los demás, sino la atención en uno mismo, las conductas de seguridad y la evitación que impiden comprobar que no pasa lo temido.",
      referencias: [
        "Clark, D. M. y Wells, A. (1995). A cognitive model of social phobia. En R. G. Heimberg, M. R. Liebowitz, D. A. Hope y F. R. Schneier (Eds.), Social phobia: Diagnosis, assessment, and treatment (pp. 69-93). Guilford Press.",
        "Heimberg, R. G. y Becker, R. E. (2002). Cognitive-behavioral group therapy for social phobia: Basic mechanisms and clinical strategies. Guilford Press.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 8. FOBIA ESPECÍFICA
    {
      id: "fobia-especifica",
      nombre: "Fobia específica",
      codigos: { dsm: "F40.2xx", cie: "6B03" },
      enPocasPalabras:
        "Es un miedo intenso y desproporcionado a un objeto o situación concreta (animales, alturas, tormentas, inyecciones, volar, espacios cerrados) que casi siempre provoca ansiedad inmediata. La persona lo evita o lo soporta con mucha angustia, aunque sabe que el peligro real es mucho menor.",
      sintomasClave: [
        "Miedo o ansiedad intensa y casi inmediata ante un objeto o situación concreta.",
        "Reconocimiento (en adultos) de que el miedo es exagerado, aunque no logra controlarlo.",
        "Evitación activa o resistencia con gran malestar cuando no queda más remedio.",
        "Respuesta del cuerpo: taquicardia, temblor, sudor, náusea o ganas de huir.",
        "Anticipación angustiosa de que se vaya a encontrar con lo temido.",
        "Cambios en la vida diaria para evitarlo: rutas, trabajos, viajes, controles médicos.",
        "En niños, llanto, rabia, quedarse paralizados o aferrarse a un adulto.",
      ],
      duracion:
        "El miedo es persistente, dura unos 6 meses o más, y causa sufrimiento o limita de forma importante la vida de la persona. No se explica mejor por otro trastorno.",
      noConfundir: [
        {
          con: "Miedo normal o cautela razonable",
          diferencia:
            "Un miedo proporcionado al riesgo no limita la vida. En la fobia hay desproporción, evitación y deterioro claro.",
        },
        {
          con: "Trastorno de pánico y agorafobia",
          diferencia:
            "En el pánico los ataques surgen sin desencadenante claro. En la fobia el miedo aparece solo ante lo temido. En la agorafobia el miedo es a múltiples situaciones de las que sería difícil escapar.",
        },
        {
          con: "Ansiedad social",
          diferencia:
            "Aquí el miedo es a ser evaluado por otros. Si el temor a la inyección o a la sangre se centra en lo que pensarán de uno, explorar ansiedad social.",
        },
        {
          con: "TEPT o TOC",
          diferencia:
            "Si el miedo nace de un suceso traumático (por ejemplo un accidente), con pesadillas y reexperimentación, pensar en TEPT. Si la evitación se debe a obsesiones de contaminación y hay rituales, pensar en TOC.",
        },
      ],
      preguntas: [
        "¿A qué le tiene miedo exactamente y qué es lo peor que cree que podría pasar?",
        "¿Qué siente en el cuerpo cuando se encuentra con eso, o cuando sabe que se va a encontrar?",
        "¿Qué hace para no encontrarse con eso, o qué hace para aguantarlo cuando no puede evitarlo?",
        "¿Desde cuándo le pasa y recuerda algún momento o experiencia que lo marcó?",
        "¿Qué cosas ha dejado de hacer o qué le ha costado por este miedo (viajes, estudios, controles médicos)?",
        "¿Alguna vez se ha desmayado o ha sentido que se desmayaba ante eso?",
        "¿Qué tan importante es para usted superarlo ahora y qué le gustaría poder hacer?",
        "¿Hay en su familia otras personas con miedos parecidos, y cómo reaccionaban ante ellos?",
      ],
      alertas: [
        "Fobia a la sangre, las inyecciones o las heridas: puede haber desmayo vasovagal (baja la presión y el pulso). Se trabaja con tensión aplicada y con la persona sentada o acostada, no con relajación que baje más la presión.",
        "Evitación de controles o tratamientos médicos necesarios (vacunas, odontología, estudios): coordinar con el médico y priorizar esa meta.",
        "Ideas de muerte o consumo de alcohol o sedantes para soportar lo temido: explorar y abordar de forma directa.",
        "Miedo de un suceso traumático reciente con pesadillas y flashbacks: evaluar estrés postraumático antes de decidir el enfoque.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Precisar qué teme exactamente, qué evita, qué conductas de seguridad usa y qué tanto le limita. Fijar una meta concreta y observable (por ejemplo «subir al bus sin acompañante»).",
          fichas: [],
        },
        {
          etapa: 2,
          texto:
            "Explicar la respuesta de alarma y cómo la evitación mantiene el miedo: cada vez que se huye, el cerebro aprende que era necesario. Normalizar sin minimizar.",
          fichas: ["2.1", "2.4"],
        },
        {
          etapa: 4,
          texto:
            "Exposición gradual a lo temido, con escalera de 6 a 10 pasos, sin conductas de seguridad y con práctica repetida. En fobias circunscritas funciona bien una sesión prolongada guiada (Öst) o varias sesiones breves, siempre con el terapeuta.",
          fichas: ["4.4"],
        },
        {
          etapa: 5,
          texto:
            "Mantener la exposición con prácticas ocasionales, para evitar que el miedo regrese. Anticipar situaciones nuevas y escribir un plan de mantenimiento.",
          fichas: ["5.1", "5.3"],
        },
      ],
      deteccion: [
        "Ni el EAPI ni el MCEA tienen una escala propia para fobias específicas. Una subescala de ansiedad del DASS elevada puede aparecer, pero no orienta hacia este cuadro.",
        "La fobia específica se identifica en entrevista: objeto o situación concreta, miedo inmediato y evitación. No requiere puntos de corte.",
        "Como instrumento externo puede usarse un cuestionario de miedos específico para el objeto temido (por ejemplo para inyecciones o alturas) o el seguimiento con escalas de malestar 0–10 durante la exposición.",
      ],
      caso:
        "Sofía, de 31 años, vive en Antigua Guatemala y trabaja como enfermera de consulta externa. Desde niña le tiene pavor a las cucarachas; cuando ve una, grita, sube a una silla y no puede entrar a la cocina por horas. Revisa la casa antes de dormir y dejó de visitar a una tía cuya casa «está llena». Reconoce que su miedo es exagerado, pero no puede controlarlo. Quiere superarlo porque piensa mudarse a un apartamento y le da miedo hacerlo sola.",
      clave:
        "La fobia se mantiene porque se evita; se supera enfrentando lo temido de forma gradual, con guía y sin huir, hasta que el cerebro aprende que no era peligroso.",
      referencias: [
        "Öst, L.-G. (1989). One-session treatment for specific phobias. Behaviour Research and Therapy, 27(1), 1-7.",
        "Öst, L.-G. y Sterner, U. (1987). Applied tension: A specific behavioral method for treatment of blood phobia. Behaviour Research and Therapy, 25(1), 25-29.",
        "Craske, M. G., Treanor, M., Conway, C. C., Zbozinek, T. y Vervliet, B. (2014). Maximizing exposure therapy: An inhibitory learning approach. Behaviour Research and Therapy, 58, 10-23.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
      ],
    },

    // 9. ESTRÉS POSTRAUMÁTICO
    {
      id: "estres-postraumatico",
      nombre: "Trastorno de estrés postraumático (TEPT)",
      codigos: { dsm: "F43.10", cie: "6B40 (TEPT complejo: 6B41)" },
      enPocasPalabras:
        "Aparece después de vivir o presenciar un suceso con amenaza de muerte, lesión grave o violencia. La persona revive lo ocurrido (recuerdos, pesadillas), evita todo lo que se lo recuerda, vive en alerta y cambia su forma de verse y de ver el mundo. La CIE-11 distingue además un TEPT complejo, con dificultades persistentes de regulación emocional, de autoestima y de relaciones, tras traumas prolongados.",
      sintomasClave: [
        "Recuerdos intrusivos, pesadillas o la sensación de volver a vivir el suceso (flashbacks).",
        "Malestar intenso o reacciones del cuerpo ante cualquier recordatorio.",
        "Evitación de lugares, personas, conversaciones o pensamientos ligados a lo ocurrido.",
        "Hipervigilancia, sobresalto fácil, irritabilidad y sueño muy alterado.",
        "Creencias negativas persistentes sobre uno mismo o el mundo («fue mi culpa», «nadie es seguro»).",
        "Culpa, vergüenza, miedo o enojo constantes, y pérdida de interés en lo que antes se disfrutaba.",
        "Sentirse separado de los demás o sin capacidad de sentir emociones positivas.",
        "En el TEPT complejo: dificultad para regular emociones, sensación de ser inútil y problemas para mantener vínculos.",
      ],
      duracion:
        "Los síntomas se mantienen más de un mes después del suceso y causan sufrimiento o deterioro importante. Pueden comenzar tarde, incluso meses después. Menos de un mes corresponde a una reacción aguda y no se descarta que mejore sola.",
      noConfundir: [
        {
          con: "Trastorno de estrés agudo o reacción normal al trauma",
          diferencia:
            "En las primeras semanas muchas personas tienen síntomas que ceden solos. Se diagnostica TEPT cuando persisten más de un mes con deterioro.",
        },
        {
          con: "Trastorno de adaptación",
          diferencia:
            "El estresor puede ser fuerte, pero no cumple las características de un suceso traumático ni el cuadro de reexperimentación, evitación e hiperalerta.",
        },
        {
          con: "Depresión mayor y ansiedad generalizada",
          diferencia:
            "Pueden coexistir. La clave es que el sufrimiento se organiza alrededor de recuerdos del suceso y de la evitación de lo que los dispara.",
        },
        {
          con: "Trastorno de pánico",
          diferencia:
            "Los ataques en el TEPT suelen tener un disparador ligado al trauma. En el pánico son inesperados y el miedo es a las sensaciones corporales.",
        },
        {
          con: "Psicosis, consumo de sustancias o lesión cerebral",
          diferencia:
            "Los flashbacks se viven como recuerdos y la persona sabe que no son presentes, pero a veces se confunden con alucinaciones. Descartar sustancias, traumatismo craneal u otras causas.",
        },
      ],
      preguntas: [
        "¿Ha vivido o presenciado algo muy difícil o que puso en peligro su vida o la de otros? (Si no quiere detallarlo ahora, no es necesario.)",
        "¿Qué tan seguido le vienen recuerdos, imágenes o pesadillas de eso, y qué le provocan?",
        "¿Hay lugares, personas o temas que evita porque se lo recuerdan?",
        "¿Cómo está su sueño, su sobresalto ante ruidos y su nivel de alerta durante el día?",
        "¿Qué piensa de lo que pasó y de usted mismo desde entonces? ¿Siente culpa o vergüenza?",
        "¿Hoy se siente seguro en su casa, su trabajo y su entorno? ¿Hay violencia o amenazas actuales?",
        "¿Qué ha cambiado en sus relaciones, en su trabajo o en su capacidad de disfrutar?",
        "¿Cómo ha cambiado el consumo de alcohol, tabaco u otras sustancias desde entonces?",
      ],
      alertas: [
        "Ideas de suicidio o de hacerse daño, más frecuentes con culpa, vergüenza o desesperanza: preguntar directamente, evaluar el riesgo y construir un plan de seguridad.",
        "Violencia actual o amenazas persistentes (pareja, familia, pandillas, extorsión): primero la seguridad de la persona; no iniciar trabajo con el trauma mientras el peligro continúe. Coordinar protección.",
        "Disociación marcada (quedarse ausente, sentirse irreal, lagunas) o flashbacks que no cede: usar anclaje al presente y valorar derivar a quien tenga formación en trauma.",
        "Consumo de alcohol u otras sustancias para dormir o no sentir: explorar y abordar en paralelo.",
        "La exposición al recuerdo traumático la dirige solo un terapeuta con formación en trauma; quien no la tiene deriva, en lugar de improvisar.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Garantizar seguridad, evaluar riesgo suicida, disociación, consumo y apoyo disponible. Reunir la historia sin pedir detalles del trauma antes de tiempo y acordar el ritmo con la persona.",
          fichas: ["1.1", "1.2"],
        },
        {
          etapa: 2,
          texto:
            "Explicar la reacción de estrés como respuesta de alarma y cómo la evitación y los recordatorios mantienen el cuadro. Normalizar los síntomas y preparar para el trabajo posterior.",
          fichas: ["2.1", "2.4"],
        },
        {
          etapa: 3,
          texto:
            "Trabajar los «puntos de atoramiento» (culpa, «debí haber hecho algo», pérdida de confianza) con terapia de procesamiento cognitivo (Resick): examinar los pensamientos y construir una visión más equilibrada del suceso.",
          fichas: ["3.1", "3.3"],
        },
        {
          etapa: 4,
          texto:
            "Enseñar regulación (respiración lenta, anclaje en el presente) y, solo con un terapeuta formado en trauma, exposición prolongada (Foa): revivir el recuerdo en sesión y enfrentar de forma gradual los lugares evitados.",
          fichas: ["4.2", "4.4"],
        },
        {
          etapa: 5,
          texto:
            "Consolidar los avances, anticipar fechas y recordatorios difíciles, y escribir un plan para cuando reaparezcan síntomas. Espaciar las sesiones.",
          fichas: ["5.1", "5.3"],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): el sistema no tiene una escala de trauma. Puede observarse ansiedad o ánimo alterados, pero no orienta por sí mismo hacia estrés postraumático.",
        "Seguimiento (MCEA): menciona el estrés postraumático como diferencial cuando el GAD-7 es de 10 o más; no lo detecta. Se confirma preguntando por exposición a un suceso y por sus síntomas.",
        "Como instrumento externo validado puede usarse la PCL-5 (lista de síntomas de TEPT) para tamizar y seguir el cambio, o una entrevista estructurada como la CAPS-5. Se aplican por separado y no se reproducen aquí.",
      ],
      caso:
        "Julio, de 36 años, es piloto de microbús en la zona 18 de Ciudad de Guatemala. Hace ocho meses lo asaltaron en su ruta y vio cómo hirieron a un pasajero. Desde entonces tiene pesadillas, se sobresalta con los frenazos y rechaza esa ruta, por lo que perdió ingresos. Piensa que «debí haber hecho algo» y no logra hablar del asunto con su familia. Toma más guaro para dormir. Dice que nunca se ha sentido tan solo.",
      clave:
        "Primero seguridad y estabilización; el trabajo con el recuerdo traumático se hace con ritmo, con apoyo y solo con formación en trauma.",
      referencias: [
        "Resick, P. A., Monson, C. M. y Chard, K. M. (2017). Cognitive processing therapy for PTSD: A comprehensive manual. Guilford Press.",
        "Foa, E. B., Hembree, E. A. y Rothbaum, B. O. (2007). Prolonged exposure therapy for PTSD: Emotional processing of traumatic experiences, therapist guide. Oxford University Press.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 10. DUELO PROLONGADO
    {
      id: "duelo-prolongado",
      nombre: "Trastorno de duelo prolongado",
      codigos: { dsm: "F43.81", cie: "6B42" },
      enPocasPalabras:
        "Es un duelo que, mucho tiempo después de la muerte de un ser querido, sigue dominando la vida: añoranza intensa, dolor emocional que no baja y dificultad para retomar proyectos o relaciones. Es distinto del duelo esperado, que duele pero con el tiempo se integra, y debe valorarse con respeto por la cultura y la familia.",
      sintomasClave: [
        "Añoranza o preocupación constante por la persona fallecida.",
        "Dolor emocional intenso: tristeza, culpa, enojo o negación de la pérdida.",
        "Dificultad para aceptar la muerte o sentirse «detenido» en el momento de la pérdida.",
        "Sentir que se ha perdido una parte de uno mismo o que la vida ya no tiene sentido.",
        "Evitar lo que recuerda que la persona murió, o aferrarse a sus objetos y rutinas.",
        "Dificultad para confiar en otros, soledad o vacío emocional.",
        "Problemas para retomar el trabajo, las amistades o los planes a futuro.",
      ],
      duracion:
        "El DSM-5-TR pide que hayan pasado al menos 12 meses desde la muerte en adultos (6 meses en niños y adolescentes). La CIE-11 requiere al menos 6 meses. Además, la reacción debe exceder claramente lo esperado en su cultura y afectar la vida.",
      noConfundir: [
        {
          con: "Duelo esperado",
          diferencia:
            "Es doloroso, con olas de tristeza ligadas al recuerdo, pero la persona conserva su valor y va retomando la vida. Hay que normalizarlo, sobre todo el primer año, y respetar rezos, novenarios, la visita al cementerio y el Día de Todos los Santos.",
        },
        {
          con: "Depresión mayor",
          diferencia:
            "En el duelo prolongado el sufrimiento se centra en la pérdida y en la añoranza. En la depresión el ánimo bajo, la culpa global y la inutilidad abarcan toda la vida. Ambas pueden coexistir.",
        },
        {
          con: "Estrés postraumático",
          diferencia:
            "Si la muerte fue violenta o repentina, puede haber síntomas de trauma (imágenes, evitación, hiperalerta) además del duelo. Se evalúa ambos cuadros.",
        },
        {
          con: "Trastorno de adaptación",
          diferencia:
            "Es una reacción a un estresor sin la añoranza ni la preocupación centradas en la persona fallecida.",
        },
      ],
      preguntas: [
        "Cuénteme sobre la persona que murió y cómo era su relación con ella.",
        "¿Cómo fue la muerte y cómo se enteró? ¿Pudo despedirse o participar en los ritos que para ustedes son importantes?",
        "¿Cómo viven en su familia y en su comunidad el duelo (rezos, novenarios, fechas)? ¿Eso le ayuda?",
        "¿Qué es lo más difícil de la pérdida hoy y qué ha cambiado en su vida diaria desde entonces?",
        "¿Qué evita (lugares, objetos, fotos, conversaciones) y qué hace para sentirla cerca?",
        "¿Qué pensamientos le vienen sobre la muerte, sobre su culpa o sobre lo que pudo haber hecho distinto?",
        "¿Con quién cuenta para apoyarse y qué proyectos o actividades siguen siendo importantes para usted?",
        "¿Ha pensado en reunirse con la persona fallecida o en que no vale la pena seguir?",
      ],
      alertas: [
        "Ideas de reunirse con la persona fallecida, de no querer vivir o de hacerse daño: preguntar directamente, evaluar plan, intención y medios, y no esperar a que lo diga.",
        "Depresión mayor asociada (sin esperanza, culpa global, pérdida de peso o de funcionamiento): evaluarla y considerar derivación a psiquiatría.",
        "Consumo de alcohol u otras sustancias para aguantar el dolor: explorar y abordar.",
        "Pérdida violenta, repentina o de un hijo o un hijo no nacido, con riesgo de trauma: evaluar estrés postraumático y ofrecer acompañamiento sostenido.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Escuchar la historia de la relación y de la muerte, evaluar el riesgo suicida y la depresión asociada, y explorar el significado cultural y familiar del duelo. Construir con la persona la formulación.",
          fichas: ["1.1", "1.4"],
        },
        {
          etapa: 2,
          texto:
            "Explicar el duelo como un proceso natural y por qué a veces se «atasca»: la evitación, la culpa y la separación de la vida. Normalizar el dolor esperado y la añoranza sin apresurar.",
          fichas: ["2.2"],
        },
        {
          etapa: 3,
          texto:
            "Revisar pensamientos de culpa y de «no puedo vivir sin él o ella» con ayuda del registro de pensamientos, y reencuadrar las creencias que mantienen el dolor sin invalidar el vínculo.",
          fichas: ["3.1"],
        },
        {
          etapa: 4,
          texto:
            "Retomar actividades y metas propias (activación y planes concretos), y trabajar los recordatorios evitados: relato de la pérdida, conversaciones imaginadas con la persona fallecida y visitas a lugares ligados a ella. Seguir la terapia de duelo complicado (Shear; Boelen).",
          fichas: ["4.1", "4.5"],
        },
        {
          etapa: 5,
          texto:
            "Fortalecer la vida propia y dejar un lugar para el recuerdo: rituales, fechas y señales de alerta. Preparar aniversarios y festividades difíciles.",
          fichas: ["5.1", "5.3"],
        },
      ],
      deteccion: [
        "Ni el EAPI ni el MCEA tienen una escala de duelo. El PHQ-9 o el DASS pueden salir altos por la tristeza, pero no distinguen entre depresión y duelo.",
        "Se detecta en entrevista y por la historia: pérdida de una persona significativa, tiempo transcurrido y presencia de añoranza o preocupación dominantes.",
        "Como instrumento externo validado puede usarse el PG-13-R (Escala de Duelo Prolongado) o el Inventario de Duelo Complicado. Se aplican por separado y no se reproducen aquí.",
      ],
      caso:
        "Doña Ofelia, de 58 años, vive en Cobán y perdió a su esposo hace dos años, de un infarto, mientras ella estaba en el mercado. Aún guarda su ropa tal como la dejó, prepara su café por costumbre y no ha vuelto a la iglesia porque «ya no tiene sentido». Se culpa por no haber estado en casa. Rechaza las invitaciones de sus hijas y dice que a veces desearía «irse con él». Antes cuidaba un puesto de comida y ahora casi no sale.",
      clave:
        "El duelo esperado se acompaña, no se corrige; el prolongado se reconoce cuando, pasado el tiempo, la vida sigue detenida en la pérdida.",
      referencias: [
        "Shear, K., Frank, E., Houck, P. R. y Reynolds, C. F. (2005). Treatment of complicated grief: A randomized controlled trial. JAMA, 293(21), 2601-2608.",
        "Boelen, P. A., de Keijser, J., van den Hout, M. A. y van den Bout, J. (2007). Treatment of complicated grief: A comparison between cognitive-behavioral therapy and supportive counseling. Journal of Consulting and Clinical Psychology, 75(2), 277-284.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 11. INSOMNIO
    {
      id: "insomnio",
      nombre: "Trastorno de insomnio",
      codigos: { dsm: "F51.01", cie: "7A00" },
      enPocasPalabras:
        "Es la dificultad persistente para quedarse dormido, mantener el sueño o despertarse demasiado temprano, a pesar de tener la oportunidad de dormir, con malestar o cansancio durante el día. Con el tiempo se sostiene por hábitos y por la preocupación por no dormir, aunque haya comenzado por otra causa.",
      sintomasClave: [
        "Tardar mucho en dormirse o quedar despierto en la noche durante largos ratos.",
        "Despertares tempranos sin poder volver a dormir.",
        "Cansancio, falta de concentración, mal humor o somnolencia durante el día.",
        "Preocupación y tensión por no dormir, sobre todo al acercarse la hora de acostarse.",
        "Pasar mucho tiempo en la cama despierto, o usar la cama para trabajar, ver el celular o preocuparse.",
        "Siestas largas o cambios en el horario de dormir que desordenan el reloj interno.",
        "Uso de café, alcohol o pastillas para controlar el sueño.",
      ],
      duracion:
        "Las dificultades se presentan al menos 3 noches por semana y durante 3 meses o más (menos de eso corresponde a insomnio de corta duración). Debe haber malestar o afectación durante el día y no explicarse solo por otro trastorno del sueño.",
      noConfundir: [
        {
          con: "Poco tiempo para dormir por trabajo, turnos o ruido",
          diferencia:
            "Si la persona no tiene oportunidad suficiente de dormir, el problema es de horario o de ambiente, no de insomnio. En el insomnio hay oportunidad y aun así no logra dormir.",
        },
        {
          con: "Apnea del sueño y síndrome de piernas inquietas",
          diferencia:
            "Ronquidos fuertes, pausas respiratorias, sueño no reparador con somnolencia o sensación de hormigueo en las piernas que obliga a moverse orientan a causas médicas del sueño que requieren evaluación.",
        },
        {
          con: "Depresión, ansiedad o estrés postraumático",
          diferencia:
            "El mal dormir es frecuente en estos cuadros y puede ser síntoma o factor de mantenimiento. Se tratan ambos, ya que si no se atiende el insomnio, puede persistir aunque mejore el ánimo.",
        },
        {
          con: "Trastornos del ritmo circadiano",
          diferencia:
            "Si la persona duerme bien pero en horarios desfasados (se acuesta de madrugada, por ejemplo), el problema es el horario del reloj interno.",
        },
        {
          con: "Efecto de sustancias o medicamentos",
          diferencia:
            "Cafeína, alcohol, estimulantes, algunos antidepresivos o corticoides alteran el sueño. Se revisa el consumo antes de concluir.",
        },
      ],
      preguntas: [
        "Cuénteme cómo es una noche típica: ¿a qué hora se acuesta, cuánto tarda en dormirse y cuántas veces despierta?",
        "¿A qué hora se despierta, a qué hora se levanta y cómo se siente al día siguiente?",
        "¿Qué piensa y qué hace cuando no puede dormir?",
        "¿Qué hace en la cama además de dormir (celular, tele, trabajo, preocuparse)?",
        "¿Cuánto café, té, bebidas energéticas, alcohol, tabaco o pastillas para dormir consume, y a qué hora?",
        "¿Alguien le ha dicho que ronca fuerte o que se le corta la respiración? ¿Tiene molestia en las piernas por la noche?",
        "¿Cuándo empezó el problema y qué pasaba en su vida en ese momento?",
        "¿Cómo ha afectado su trabajo, su manejo, su ánimo y su relación con los demás?",
      ],
      alertas: [
        "Ronquidos intensos, pausas al respirar o somnolencia marcada de día: derivar a evaluación médica para descartar apnea del sueño antes de iniciar la terapia.",
        "Bipolaridad (o antecedentes de manía o hipomanía), epilepsia o riesgo de accidentes: la restricción del tiempo en cama está contraindicada o se usa con mucha cautela y coordinación con el médico, porque la falta de sueño puede desencadenar manía o crisis.",
        "Somnolencia al manejar o con maquinaria: indicar no manejar si hay riesgo y priorizar la seguridad.",
        "Uso de alcohol, sedantes o hipnóticos para dormir, o medicamentos que alteren el sueño: coordinar con el médico y no suspenderlos sin supervisión.",
        "Ideas de muerte o desesperanza por el cansancio, frecuentes en insomnio crónico: preguntar directamente y evaluar el riesgo.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Llevar un diario de sueño durante una o dos semanas (hora de acostarse, de dormirse, despertares, hora de levantarse) y revisar hábitos, consumo y salud. Identificar los factores que lo mantienen.",
          fichas: ["1.3"],
        },
        {
          etapa: 2,
          texto:
            "Explicar cómo funciona el sueño (necesidad y reloj interno) y cómo la preocupación por dormir y los intentos de compensar lo empeoran. Normalizar que una mala noche no daña la salud.",
          fichas: ["2.3"],
        },
        {
          etapa: 3,
          texto:
            "Trabajar los pensamientos y las preocupaciones sobre el sueño («si no duermo, mañana no podré hacer nada»). Separar lo que se puede controlar de lo que no, sin forzar el sueño.",
          fichas: ["3.4"],
        },
        {
          etapa: 4,
          texto:
            "Aplicar la TCC para el insomnio (Morin; Perlis): control de estímulos (la cama solo para dormir), horario fijo de levantarse, restricción del tiempo en cama con supervisión del terapeuta y revisión de higiene del sueño. Sumar relajación y tiempo de preocupación en la tarde.",
          fichas: ["4.2", "4.3"],
        },
        {
          etapa: 5,
          texto:
            "Mantener el horario, reconocer las noches malas como parte de la vida y tener un plan para épocas de estrés. Retirar poco a poco las ayudas externas en coordinación con el médico.",
          fichas: ["5.1", "5.3"],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI) y seguimiento (MCEA): el sistema no tiene una escala de insomnio. El ítem de sueño del PHQ-9 y del DASS indica que hay molestia, pero no basta para diagnosticar insomnio ni distingue su causa.",
        "Se detecta en entrevista y con un diario de sueño de una o dos semanas: tiempo para dormirse, despertares, horas en cama y consecuencias del día.",
        "Como instrumento externo validado puede usarse el ISI (Índice de Gravedad del Insomnio) para medir gravedad y cambio. Se aplica por separado y sus ítems no se reproducen aquí.",
      ],
      caso:
        "Rubén, de 45 años, es contador y vive en Villa Nueva. Desde hace casi un año tarda más de una hora en dormirse y se despierta a las tres de la mañana pensando en el trabajo. Para compensar se queda en la cama hasta las ocho, duerme siesta por la tarde y toma varias tazas de café. Revisa el celular acostado y cada noche se angustia al ver la hora. Está cansado, irritable y teme quedarse dormido manejando. No ronca ni tiene antecedentes de manía.",
      clave:
        "El insomnio crónico lo mantienen los hábitos y la preocupación por dormir; se trata ordenando el horario y la cama, no forzando el sueño.",
      referencias: [
        "Morin, C. M. (1993). Insomnia: Psychological assessment and management. Guilford Press.",
        "Perlis, M. L., Jungquist, C., Smith, M. T. y Posner, D. (2005). Cognitive behavioral treatment of insomnia: A session-by-session guide. Springer.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },

    // 12. DEPRESIÓN PERSISTENTE (DISTIMIA)
    {
      id: "depresion-persistente",
      nombre: "Trastorno depresivo persistente (distimia)",
      codigos: { dsm: "F34.1", cie: "6A72" },
      enPocasPalabras:
        "Es un ánimo bajo crónico, más leve que un episodio mayor pero que dura años, hasta el punto de que la persona lo siente como parte de su forma de ser («siempre he sido así de triste»). Con frecuencia empieza en la adolescencia, y sobre este fondo pueden aparecer episodios de depresión mayor.",
      sintomasClave: [
        "Ánimo bajo o apagado la mayor parte de los días, durante años.",
        "Poca energía, cansancio constante o sensación de que todo cuesta.",
        "Baja autoestima y autocrítica constante («no sirvo para nada»).",
        "Desesperanza o visión pesimista del futuro.",
        "Dificultad para concentrarse o para tomar decisiones.",
        "Cambios en el apetito o en el sueño (dormir demasiado o poco).",
        "Poco disfrute de la vida, sin llegar a perder todo el interés.",
        "Aislamiento gradual o estilo de relaciones marcado por la desconfianza y el sentirse inferior.",
      ],
      duracion:
        "El DSM-5-TR pide un ánimo bajo la mayor parte del día durante al menos 2 años en adultos (1 año en niños y adolescentes), sin periodos de más de 2 meses sin síntomas. La CIE-11 usa un criterio de 2 años con una descripción similar.",
      noConfundir: [
        {
          con: "Episodio depresivo mayor",
          diferencia:
            "El episodio mayor es más intenso y marcado, y puede ser reciente. La distimia es más leve y de larga duración. Pueden coexistir y se llama «doble depresión»: se evalúan los dos.",
        },
        {
          con: "Trastorno bipolar (ciclotimia)",
          diferencia:
            "Se pregunta siempre por periodos de ánimo elevado, mucha energía o poca necesidad de dormir. Si existieron, no es distimia.",
        },
        {
          con: "Personalidad depresiva o rasgos de carácter",
          diferencia:
            "La persona puede creer que es su manera de ser. Pero el ánimo bajo es un cuadro tratable, con respuesta a psicoterapia, y suele haber un cambio claro respecto de su mejor momento.",
        },
        {
          con: "Depresión por causa médica o por sustancias",
          diferencia:
            "Hipotiroidismo, anemia, apnea del sueño, alcohol y algunos medicamentos pueden mantener un ánimo bajo crónico. Se descarta con el médico.",
        },
        {
          con: "Trastorno de adaptación o duelo prolongado",
          diferencia:
            "Se vinculan a un estresor o a una pérdida concreta, mientras que en la distimia el ánimo bajo es un fondo de años y no depende de un hecho único.",
        },
      ],
      preguntas: [
        "¿Cómo describiría su ánimo en general durante los últimos años? ¿Hubo épocas en que se sintiera bien por más de un par de meses?",
        "¿Desde cuándo se siente así? ¿Recuerda cómo era antes, en la adolescencia o la niñez?",
        "¿Qué dice de sí mismo cuando se siente decaído y qué espera del futuro?",
        "¿Qué cosas disfruta o ha dejado de disfrutar? ¿Qué le cuesta más hacer cada día?",
        "¿Cómo están su sueño, su apetito y su energía?",
        "¿Han habido épocas peores, con más tristeza, desesperanza o ideas de no querer vivir?",
        "¿Alguna vez ha tenido temporadas de mucha energía, de dormir muy poco sin cansarse o de sentirse extraordinariamente bien?",
        "¿Cómo son sus relaciones con familia y amistades? ¿Qué tanto cuenta con alguien de confianza?",
      ],
      alertas: [
        "Depresión mayor sobreagregada («doble depresión»): si aparece un empeoramiento marcado con pérdida de interés, sueño o apetito alterados o ideas de muerte, evaluar de inmediato la gravedad.",
        "Ideas de suicidio o desesperanza crónica: se subestiman porque la persona lleva años así. Preguntar directamente y evaluar plan, intención y medios.",
        "Antecedentes de manía o hipomanía: sospechar trastorno bipolar y derivar a psiquiatría antes de seguir solo con psicoterapia.",
        "Consumo de alcohol u otras sustancias como forma de afrontar: explorar y tratar en paralelo.",
      ],
      plan: [
        {
          etapa: 1,
          texto:
            "Evaluar riesgo suicida, descartar bipolaridad y causas médicas, y reconstruir la historia del ánimo bajo (inicio, mejores épocas, eventos de vida). Fijar metas realistas, pensando en un tratamiento más largo.",
          fichas: ["1.1", "1.2"],
        },
        {
          etapa: 2,
          texto:
            "Explicar que el ánimo bajo crónico es un problema tratable y no un rasgo fijo de la persona, y cómo la inactividad, la autocrítica y el aislamiento lo sostienen.",
          fichas: ["2.2"],
        },
        {
          etapa: 3,
          texto:
            "Identificar las creencias antiguas sobre sí mismo («soy defectuoso», «nada va a cambiar») y las distorsiones que las mantienen, y ponerlas a prueba con evidencia y experimentos (Beck).",
          fichas: ["3.1", "3.2", "3.3"],
        },
        {
          etapa: 4,
          texto:
            "Activación conductual con metas pequeñas y planes concretos. En lo interpersonal, revisar cómo los patrones de relación y las consecuencias de lo que la persona hace mantienen el problema (CBASP, McCullough).",
          fichas: ["4.1", "4.5"],
        },
        {
          etapa: 5,
          texto:
            "Consolidar los cambios, reconocer señales tempranas de empeoramiento y planear sesiones de refuerzo a más largo plazo, ya que la recaída es frecuente en cuadros crónicos.",
          fichas: ["5.1", "5.2", "5.3"],
        },
      ],
      deteccion: [
        "Evaluación inicial (EAPI): la subescala de depresión del DASS o los ítems de depresión pueden salir elevados y el sistema sugiere la ficha de depresión mayor, pero no distingue la cronicidad ni la duración de 2 años.",
        "Seguimiento (MCEA): un PHQ-9 de 10 o más sugiere depresión, sin diferenciar distimia. Un puntaje leve sostenido en varias medidas durante años también merece explorar este cuadro.",
        "Se detecta en entrevista y por la historia: ánimo bajo casi todos los días durante 2 años o más, sin periodos largos de bienestar. No hay una escala específica dentro del sistema.",
      ],
      caso:
        "Gabriela, de 39 años, es secretaria en una clínica de Quetzaltenango. Desde la adolescencia se describe como «apagada y gris»; nunca ha tenido periodos largos de alegría. Cumple con su trabajo, pero llega a casa agotada, se critica con dureza por cualquier error y piensa que «así soy yo y ya no voy a cambiar». Hace unas semanas empeoró: duerme mal, no come y ha dejado de ver a sus hermanas. Nunca ha tenido temporadas de euforia ni consume alcohol.",
      clave:
        "Lo crónico se vuelve «forma de ser»; reconocerlo como un problema tratable y vigilar el empeoramiento hacia depresión mayor es el primer paso.",
      referencias: [
        "McCullough, J. P. (2000). Treatment for chronic depression: Cognitive behavioral analysis system of psychotherapy (CBASP). Guilford Press.",
        "Martell, C. R., Dimidjian, S. y Herman-Dunn, R. (2010). Behavioral activation for depression: A clinician's guide. Guilford Press.",
        "American Psychiatric Association (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto rev.; DSM-5-TR). APA.",
        "Organización Mundial de la Salud (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11). OMS.",
      ],
    },
  ],
};
