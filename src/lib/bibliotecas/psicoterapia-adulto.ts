/**
 * Biblioteca JJR «Psicoterapia del adulto»: ocho fichas de técnicas y habilidades terapéuticas,
 * en el orden de un tratamiento. Redacción propia (no copia ni parafrasea de cerca manuales ni materiales comerciales).
 * Base: terapia cognitivo-conductual (TCC) y factores comunes, con respaldo empírico.
 * Las fichas terapéuticas enlazadas (1.1 a 5.3) son las que ya existen en el catálogo de Fichas terapéuticas JJR.
 */
import type { BibliotecaTecnicas } from "./tipos";

export const BIBLIOTECA_PSICOTERAPIA_ADULTO: BibliotecaTecnicas = {
  id: "psicoterapia-adulto",
  tipo: "tecnicas",
  titulo: "Psicoterapia del adulto",
  descripcion:
    "Ocho técnicas y habilidades del terapeuta, en el orden de un tratamiento: formulación de caso, alianza, entrevista motivacional, psicoeducación, diálogo socrático, activación conductual, exposición y cierre con prevención de recaídas. Cada ficha explica cuándo usarla, cómo aplicarla en sesión y qué cuidar.",
  fichas: [
    // 1. FORMULACIÓN DE CASO
    {
      id: "formulacion-caso",
      nombre: "Formulación de caso en TCC",
      modelo: "Conceptualización cognitiva (J. S. Beck; Persons; Kuyken, Padesky y Dudley).",
      enPocasPalabras:
        "Es un mapa de trabajo que une los problemas actuales de la persona con lo que los desencadena, los pensamientos y conductas que los mantienen y la historia que les da sentido. Sirve para elegir qué intervenir primero y para explicar el tratamiento de forma que la persona lo entienda y lo comparta.",
      indicaciones: [
        "Al terminar la evaluación inicial, antes de planear las intervenciones.",
        "Cuando hay varios problemas a la vez y no está claro por dónde empezar.",
        "Cuando el tratamiento se estanca y hay que revisar qué se está pasando por alto.",
        "Cuando la persona no entiende por qué se siente así y necesita una explicación propia.",
        "En supervisión o discusión de casos, para ordenar la información.",
      ],
      precauciones: [
        "Con riesgo suicida o crisis activa, primero se hace la evaluación de seguridad; la formulación espera o se hace de forma mínima.",
        "No entregarla como un veredicto cerrado: es una hipótesis que se revisa con la persona y se corrige con los datos nuevos.",
        "Evitar la jerga y las etiquetas diagnósticas como explicación única; use las palabras de la persona.",
        "Si la persona está muy afectada o disociada, posponer la historia de vida y quedarse en el presente.",
      ],
      pasos: [
        "Hacer la lista de problemas actuales, con ejemplos concretos y ordenados por el malestar que producen.",
        "Elegir un episodio reciente y describir situación, pensamiento, emoción, reacción del cuerpo y conducta.",
        "Identificar qué mantiene el problema: evitación, búsqueda de seguridad, rumiación u otras conductas que alivian ahora y cuestan después.",
        "Explorar las creencias de fondo y las experiencias de vida que ayudan a entender por qué esa situación pesa tanto.",
        "Anotar también las fortalezas y los recursos de la persona y de su entorno.",
        "Dibujar el esquema junto con la persona y preguntarle qué le parece que encaja y qué no.",
        "Derivar de la formulación las metas y el orden de las intervenciones, y revisarla cada pocas sesiones.",
      ],
      dialogo: [
        "Terapeuta: Si le parece, hagamos un dibujo de lo que me contó de ayer en la reunión. ¿Qué pasó justo antes de que se sintiera mal?",
        "Paciente: Mi jefe me pidió «hablar un momento» y me puse helado.",
        "Terapeuta: ¿Qué se le vino a la mente en ese momento?",
        "Paciente: Que me iban a regañar, que ya se dieron cuenta de que no sirvo.",
        "Terapeuta: Y con ese pensamiento, ¿qué hizo?",
        "Paciente: Me inventé una llamada y salí. Después me pasé la tarde evitándolo.",
        "Terapeuta: Eso alivió el momento, pero también le quitó la oportunidad de saber qué quería su jefe. ¿Se parece a otras veces?",
        "Paciente: Sí, siempre hago lo mismo. Nunca lo había visto así.",
      ],
      errores: [
        "Formular demasiado pronto, con poca información: conviene marcarla como provisional.",
        "Hacerla solo en la cabeza del terapeuta: se construye con la persona y en voz alta.",
        "Llenarla de teoría y de historia infantil que no se conecta con el problema actual.",
        "Olvidar las fortalezas, y dejar un cuadro solo de déficits.",
        "No volver a ella: una formulación que no se actualiza deja de guiar el tratamiento.",
      ],
      evidencia:
        "La formulación individualizada es un componente central de la práctica en TCC y se recomienda ampliamente. La evidencia de que mejore por sí sola los resultados es más limitada que la de las intervenciones concretas, por lo que se usa como guía clínica y no como garantía.",
      fichas: ["1.1", "1.2", "1.3"],
      caso:
        "Rosa, de 34 años, cajera en un supermercado de la zona 6, llega por «nervios» desde que la cambiaron de turno. Se siente tensa antes de ir a trabajar, ha faltado dos veces y piensa que su supervisora ya la quiere despedir. Cuando sospecha un regaño, se queda callada y evita mirarla. En casa cuida sola a su mamá enferma y casi no duerme. Su abuela decía que «el que se queja estorba».",
      preguntas: [
        "¿Qué conducta de Rosa mantiene su ansiedad aunque le dé alivio inmediato?",
        "¿Qué creencia de fondo podría estar influyendo y qué experiencia la explicaría?",
        "¿Qué fortalezas y recursos de Rosa pondría en el esquema?",
        "¿Qué problema trabajaría primero y por qué?",
      ],
      clave: "La formulación es una hipótesis compartida: se construye con la persona y se corrige con los datos.",
      referencias: [
        "Beck, J. S. (2020). Cognitive behavior therapy: Basics and beyond (3.ª ed.). Guilford Press.",
        "Persons, J. B. (2008). The case formulation approach to cognitive-behavior therapy. Guilford Press.",
        "Kuyken, W., Padesky, C. A. y Dudley, R. (2009). Collaborative case conceptualization: Working effectively with clients in cognitive-behavioral therapy. Guilford Press.",
      ],
    },

    // 2. ALIANZA TERAPÉUTICA
    {
      id: "alianza-terapeutica",
      nombre: "Alianza terapéutica y reparación de rupturas",
      modelo: "Alianza de trabajo (Bordin); rupturas y reparación (Safran y Muran).",
      enPocasPalabras:
        "La alianza es el acuerdo entre terapeuta y paciente sobre las metas, las tareas y el vínculo. Las rupturas (distancia, molestia, desacuerdo, tareas incumplidas) son frecuentes y, si se hablan con apertura, se convierten en una oportunidad de aprendizaje y refuerzan el tratamiento.",
      indicaciones: [
        "Desde la primera sesión, como base de cualquier tratamiento.",
        "Cuando la persona llega tarde, falta, se muestra callada o responde con monosílabos.",
        "Cuando no hace las tareas entre sesiones de forma repetida.",
        "Cuando percibe un comentario crítico, una duda o un cambio de tono en la persona.",
        "Cuando el progreso se detiene sin una razón técnica clara.",
      ],
      precauciones: [
        "No usar la reparación para justificarse ni para pedir disculpas excesivas: se trata de entender, no de defenderse.",
        "Con personas muy frágiles o en crisis, priorizar la seguridad y la contención sobre explorar el vínculo.",
        "Ajustar el estilo a la cultura y al contexto: algunas personas expresan el desacuerdo de forma indirecta o por respeto.",
        "Si la ruptura se debe a un límite del encuadre (honorarios, horario, confidencialidad), mantener el límite y explicarlo con claridad.",
      ],
      pasos: [
        "Acordar desde el inicio metas y tareas: qué se busca y cómo se va a trabajar.",
        "Pedir retroalimentación breve y regular, por ejemplo al cierre de cada sesión.",
        "Estar atento a señales de ruptura: retraimiento, cambios de tono, respuestas evasivas, tareas pendientes.",
        "Nombrar lo que se percibe con curiosidad y sin culpar, e invitar a hablar de ello.",
        "Escuchar la molestia completa y reconocer la parte que le toca al terapeuta, sin defenderse.",
        "Explorar qué necesita la persona y ajustar el plan, la tarea o el ritmo si hace falta.",
        "Verificar que la ruptura quedó atendida y que la persona se siente escuchada.",
      ],
      dialogo: [
        "Terapeuta: Noto que hoy está más callado que de costumbre. ¿Pasó algo en la sesión pasada que le haya incomodado?",
        "Paciente: No, no es nada.",
        "Terapeuta: Quizás le pedí algo muy rápido con el registro de pensamientos. Me importa que esto le sirva de verdad.",
        "Paciente: Es que siento que me manda tarea como si fuera escuela, y yo ya tengo bastante trabajo.",
        "Terapeuta: Gracias por decírmelo. Tiene razón en que la tarea debe caber en su vida. ¿Qué le parecería hacerla más corta?",
        "Paciente: Eso sí podría. Con diez minutos al día me va bien.",
      ],
      errores: [
        "Ignorar las señales sutiles de distancia por seguir el plan de la sesión.",
        "Defenderse o explicar por qué se hizo algo, en lugar de escuchar.",
        "Pensar que la ruptura es culpa del paciente o de su «resistencia».",
        "Usar la técnica sin calidez: la alianza se apoya también en el interés genuino.",
        "No volver sobre el tema cuando la persona dijo «no es nada».",
      ],
      evidencia:
        "La calidad de la alianza se asocia de forma consistente con los resultados de la psicoterapia en distintos enfoques. Las intervenciones para reparar rupturas cuentan con apoyo empírico creciente, aunque la relación causal con el cambio sigue en estudio.",
      fichas: [],
      caso:
        "Don Mario, de 52 años, albañil de Chimaltenango, acude derivado por insomnio y tristeza. En la tercera sesión llega tarde y contesta con pocas palabras. Cuando el terapeuta le pregunta, dice «usted sabe más, yo solo vengo a escuchar». Antes mencionó que en el centro de salud siempre le hablaban sin explicarle nada. Faltó a la tarea de registrar su sueño.",
      preguntas: [
        "¿Qué señales de ruptura identifica en el caso?",
        "¿Cómo podría relacionarse su historia con el centro de salud con lo que pasa en sesión?",
        "¿Qué diría usted para abrir la conversación sin que suene a reproche?",
        "¿Qué ajuste a la tarea o al encuadre propondría?",
      ],
      clave: "Una ruptura bien hablada no daña la terapia: suele ser donde ocurre el cambio.",
      referencias: [
        "Bordin, E. S. (1979). The generalizability of the psychoanalytic concept of the working alliance. Psychotherapy: Theory, Research & Practice, 16(3), 252–260.",
        "Safran, J. D. y Muran, J. C. (2000). Negotiating the therapeutic alliance: A relational treatment guide. Guilford Press.",
      ],
    },

    // 3. ENTREVISTA MOTIVACIONAL
    {
      id: "entrevista-motivacional",
      nombre: "Entrevista motivacional",
      modelo: "Entrevista motivacional (Miller y Rollnick): estilo colaborativo que evoca el cambio desde la propia persona.",
      enPocasPalabras:
        "Es una forma de conversar que ayuda a resolver la ambivalencia frente al cambio. En vez de convencer, el terapeuta escucha, refleja y resalta las razones de la propia persona para cambiar (discurso de cambio), respetando su autonomía.",
      indicaciones: [
        "Cuando la persona duda, minimiza el problema o dice «sí, pero…».",
        "Consumo de alcohol u otras sustancias, o conductas de salud que cuesta modificar.",
        "Al comienzo del tratamiento, cuando la motivación es baja o llega por presión de otros.",
        "Cuando hay tareas o metas que se aceptan en teoría pero no se cumplen.",
        "Antes de pasar a técnicas exigentes, como la exposición.",
      ],
      precauciones: [
        "No confrontar ni discutir: la presión genera defensa y más resistencia al cambio.",
        "Si hay riesgo vital o crisis, se prioriza la seguridad y se actúa de forma directa; no se espera a que la persona se motive.",
        "No usarla como truco para llevar a la persona a donde uno quiere: debe respetar su derecho a decidir.",
        "Con personas ya decididas a cambiar, pasar a la acción en vez de seguir explorando la duda.",
      ],
      pasos: [
        "Abrir con preguntas abiertas sobre cómo ve la situación, sin dar consejos de entrada.",
        "Afirmar esfuerzos, valores y fortalezas que se vean en lo que cuenta.",
        "Reflejar con precisión lo que dice, incluido el lado que quiere el cambio y el que no.",
        "Notar el discurso de cambio (deseos, razones, capacidad, compromiso) y responder a él con reflejos y preguntas.",
        "Explorar la diferencia entre lo que la persona quiere y lo que está pasando.",
        "Hacer resúmenes que junten las razones de la persona a favor del cambio.",
        "Pedir permiso antes de dar información o sugerencias, y cerrar preguntando cuál sería el siguiente paso.",
      ],
      dialogo: [
        "Terapeuta: Cuénteme cómo ve usted lo de la bebida en estos días.",
        "Paciente: Mire, no es que sea un problema, solo me tomo unas cervezas los fines de semana. Mi esposa exagera.",
        "Terapeuta: Usted siente que no es tan grave como ella dice, pero aun así vino.",
        "Paciente: Pues sí… la verdad me preocupó que me dijera que se iba a ir con los niños.",
        "Terapeuta: Le importa mucho su familia y no quiere perderla.",
        "Paciente: Eso sí. Y el domingo pasado no pude jugar con mi hijo por la cruda.",
        "Terapeuta: Por un lado la cerveza le gusta; por el otro, le está quitando tiempo con su hijo. ¿Qué le gustaría que fuera distinto?",
      ],
      errores: [
        "Caer en el «reflejo correctivo»: dar consejos o argumentos antes de que la persona los pida.",
        "Hacer muchas preguntas seguidas, sin reflejar, como si fuera un interrogatorio.",
        "Reflejar solo lo que no quiere cambiar y reforzar sin querer la resistencia.",
        "Etiquetar a la persona («alcohólico», «negador») y discutir la etiqueta.",
        "Confundirla con simpatía vacía: requiere dirección y propósito.",
      ],
      evidencia:
        "La entrevista motivacional cuenta con apoyo empírico, sobre todo en conductas adictivas y de salud, con efectos modestos pero consistentes. Funciona mejor como antesala o complemento de otros tratamientos que como tratamiento único para cuadros complejos.",
      fichas: ["1.1", "1.4"],
      caso:
        "Luis, de 28 años, motorista en la ciudad de Guatemala, fue enviado por su empresa luego de dos llamadas de atención por llegar con aliento a licor. Dice que bebe «como todos» y que solo vino por el trabajo. Reconoce que a veces no se acuerda de lo que hizo la noche anterior. Su novia le ha dicho que se está distanciando de ella. No quiere dejar de beber, pero tampoco quiere perder el empleo.",
      preguntas: [
        "¿Qué frases de Luis serían discurso de cambio y cuáles discurso de mantenimiento?",
        "Escriba dos reflejos que recojan su ambivalencia sin discutir con él.",
        "¿Qué pregunta abierta usaría para explorar la diferencia entre lo que quiere y lo que vive?",
        "¿Qué haría si Luis empieza a defenderse con más fuerza?",
      ],
      clave: "No se convence a nadie de cambiar: se ayuda a que la persona escuche sus propias razones.",
      referencias: [
        "Miller, W. R. y Rollnick, S. (2013). Motivational interviewing: Helping people change (3.ª ed.). Guilford Press.",
        "Rollnick, S., Miller, W. R. y Butler, C. C. (2008). Motivational interviewing in health care: Helping patients change behavior. Guilford Press.",
      ],
    },

    // 4. PSICOEDUCACIÓN
    {
      id: "psicoeducacion",
      nombre: "Psicoeducación eficaz",
      modelo: "TCC y Protocolo Unificado (Barlow y colaboradores): explicar el modelo para que la persona participe del tratamiento.",
      enPocasPalabras:
        "Es explicar con claridad qué le pasa a la persona, por qué se mantiene y cómo trabajará el tratamiento. Una buena psicoeducación normaliza la experiencia, reduce el miedo a los síntomas y da un marco compartido para las tareas.",
      indicaciones: [
        "Al inicio del tratamiento, para explicar el modelo de trabajo.",
        "Cuando la persona interpreta sus síntomas como señales de enfermedad grave o locura.",
        "Cuando necesita entender la relación entre pensamientos, emociones, cuerpo y conducta.",
        "Antes de técnicas que causan malestar al principio, como la exposición.",
        "Para involucrar a familiares y mejorar el apoyo en casa.",
      ],
      precauciones: [
        "No dar información en bloque: dosificar y verificar que la persona entiende, sobre todo si está muy angustiada.",
        "Evitar dar un diagnóstico como sentencia: explique qué significa y qué sí se puede hacer.",
        "Con personas que leen poco o tienen otro idioma materno, usar ejemplos, dibujos y palabras sencillas.",
        "Si hay crisis o riesgo, la información queda en segundo plano frente a la seguridad.",
      ],
      pasos: [
        "Preguntar primero qué sabe y qué piensa la persona de lo que le pasa.",
        "Explicar el modelo con un ejemplo de su propia vida, no solo con teoría.",
        "Normalizar la reacción: mostrar que el miedo, la tristeza o la tensión tienen una función y son comunes.",
        "Dibujar o escribir el esquema mientras se explica.",
        "Dar la lógica del tratamiento: qué se hará, por qué y cuánto tiempo suele tomar.",
        "Verificar la comprensión pidiendo a la persona que lo diga con sus palabras.",
        "Entregar un material breve (ficha) y acordar qué leer o probar antes de la próxima sesión.",
      ],
      dialogo: [
        "Terapeuta: Antes de explicarle, cuénteme: cuando el corazón se le acelera en el bus, ¿qué cree que le está pasando?",
        "Paciente: Que me va a dar un infarto. Mi papá murió del corazón.",
        "Terapeuta: Con ese antecedente, es lógico que le asuste. Su médico ya revisó su corazón y salió sano. Lo que siente es la alarma del cuerpo, que se activa de más.",
        "Paciente: ¿O sea que no me voy a morir?",
        "Terapeuta: Esa alarma es desagradable, pero no es peligrosa. Se calma sola si no la combatimos. ¿Qué entendió de lo que le expliqué?",
        "Paciente: Que mi cuerpo exagera la alarma y que yo le hago más caso con el miedo.",
      ],
      errores: [
        "Dar una clase larga sin preguntar qué piensa la persona.",
        "Usar términos técnicos sin traducirlos.",
        "Tranquilizar en exceso («no se preocupe, no es nada»), lo que puede alimentar la búsqueda de seguridad.",
        "No comprobar que la persona entendió, y suponer que sí.",
        "Dar la información una sola vez en vez de repasarla en varias sesiones.",
      ],
      evidencia:
        "La psicoeducación forma parte de la mayoría de los tratamientos con respaldo empírico, y se asocia con mejor adherencia y menos miedo a los síntomas. Por sí sola suele producir cambios modestos, por lo que se combina con técnicas activas.",
      fichas: ["2.1", "2.2", "2.3", "2.4"],
      caso:
        "Marta, de 41 años, maestra de primaria en Quetzaltenango, tuvo un episodio de mareo y falta de aire en la reunión de padres. Desde entonces evita los lugares con mucha gente y revisa su pulso varias veces al día. Piensa que «algo grave se me está escapando», aunque su médica descartó problemas físicos. Lee mucho en internet sobre enfermedades del corazón y llega con una lista de síntomas.",
      preguntas: [
        "¿Cómo averiguaría lo que Marta piensa antes de explicarle?",
        "¿Qué ejemplo propio de ella usaría para mostrar el ciclo del miedo?",
        "¿Qué riesgo hay en tranquilizarla repetidamente?",
        "¿Cómo comprobaría que entendió?",
      ],
      clave: "Se explica para que la persona entienda y participe, no para demostrar lo que uno sabe.",
      referencias: [
        "Barlow, D. H., Farchione, T. J., Sauer-Zavala, S., Latin, H. M., Ellard, K. K., Bullis, J. R., Bentley, K. H., Boettcher, H. T. y Cassiello-Robbins, C. (2018). Unified protocol for transdiagnostic treatment of emotional disorders: Therapist guide (2.ª ed.). Oxford University Press.",
        "Beck, J. S. (2020). Cognitive behavior therapy: Basics and beyond (3.ª ed.). Guilford Press.",
      ],
    },

    // 5. DIÁLOGO SOCRÁTICO
    {
      id: "dialogo-socratico",
      nombre: "Diálogo socrático y reestructuración cognitiva",
      modelo: "Terapia cognitiva (Beck); descubrimiento guiado (Padesky).",
      enPocasPalabras:
        "Es un estilo de preguntas con el que el terapeuta ayuda a la persona a examinar sus pensamientos automáticos, buscar datos a favor y en contra y llegar por sí misma a una visión más ajustada. No busca ganar un debate, sino ampliar la perspectiva.",
      indicaciones: [
        "Pensamientos automáticos muy intensos y creídos al 100 %.",
        "Interpretaciones catastróficas, de culpa o de «no valgo» ligadas a una situación concreta.",
        "Cuando la persona ya identifica sus pensamientos y puede ponerlos a prueba.",
        "Para preparar experimentos conductuales a partir de una predicción.",
        "Cuando el estado de ánimo cambia notablemente durante la sesión y se puede trabajar el pensamiento en caliente.",
      ],
      precauciones: [
        "No usarlo con riesgo suicida activo como técnica principal: primero seguridad, evaluación y plan.",
        "Evitar que suene a interrogatorio o a trampa: si la persona se siente corregida, la alianza se daña.",
        "Cuando la emoción es muy intensa, validar y regular primero; el razonamiento viene después.",
        "En personas con trauma o creencias muy arraigadas, avanzar despacio y priorizar los experimentos sobre el debate.",
        "Cuidado cultural: no cuestionar creencias religiosas o familiares como si fueran «distorsiones».",
      ],
      pasos: [
        "Elegir un pensamiento ligado a una situación y a una emoción concretas.",
        "Anotar cuánto lo cree la persona y cuánta emoción le produce (de 0 a 100).",
        "Preguntar por la evidencia a favor y luego por la evidencia en contra, con curiosidad.",
        "Explorar alternativas: qué otra cosa podría estar pasando, qué le diría a un amigo, qué es lo peor, lo mejor y lo más probable.",
        "Pedirle que resuma con sus palabras lo que descubrió, sin ponérselo uno.",
        "Formular un pensamiento alternativo creíble y volver a valorar la creencia y la emoción.",
        "Proponer una tarea o un experimento para comprobar el nuevo pensamiento en la vida real.",
      ],
      dialogo: [
        "Terapeuta: Dijo que pensó «voy a hacer el ridículo». ¿Qué tanto lo cree, de cero a cien?",
        "Paciente: Un ochenta.",
        "Terapeuta: ¿Qué le hace pensar que va a pasar?",
        "Paciente: La última vez que hablé en la reunión, me trabé.",
        "Terapeuta: ¿Y qué pasó después de que se trabó?",
        "Paciente: Pues… nadie dijo nada, un compañero hasta me hizo una pregunta.",
        "Terapeuta: Entonces, de esa vez, ¿qué dato suma a su idea y cuál la matiza?",
        "Paciente: Me trabé, sí, pero no se burlaron. Quizás no es tan seguro que haga el ridículo.",
      ],
      errores: [
        "Hacer preguntas «retóricas» que ya llevan la respuesta que el terapeuta quiere.",
        "Saltar a los argumentos sin haber validado la emoción.",
        "Buscar un pensamiento «positivo» en vez de uno realista.",
        "Querer convencer en una sola sesión en lugar de dejar la duda como tarea.",
        "Cuestionar pensamientos que en realidad son hechos o problemas reales por resolver.",
      ],
      evidencia:
        "La reestructuración cognitiva es parte del tratamiento con mayor respaldo empírico para depresión y ansiedad. El estilo guiado por preguntas se considera buena práctica, aunque su aporte específico frente a otras técnicas conductuales sigue en discusión.",
      fichas: ["3.1", "3.2", "3.3"],
      caso:
        "Javier, de 30 años, contador en Mixco, perdió a un cliente importante y desde entonces se repite «soy un fracaso, me van a correr». Duerme mal y ya no almuerza con sus compañeros. Su jefe le dijo que el cliente se fue por problemas de presupuesto, pero él lo descarta. Reconoce que ha cerrado otros contratos este año. Dice que «cualquier error me define».",
      preguntas: [
        "¿Cuál es el pensamiento automático que trabajaría primero y cómo lo medirías?",
        "Escriba tres preguntas socráticas que no lleven la respuesta incluida.",
        "¿Qué evidencia en contra tiene Javier y cómo la haría surgir?",
        "¿Qué experimento conductual podría plantear?",
      ],
      clave: "Se pregunta para que la persona descubra, no para que el terapeuta gane la discusión.",
      referencias: [
        "Padesky, C. A. (1993). Socratic questioning: Changing minds or guiding discovery? Conferencia presentada en el Congreso Europeo de Terapias Cognitivas y Conductuales, Londres.",
        "Beck, J. S. (2020). Cognitive behavior therapy: Basics and beyond (3.ª ed.). Guilford Press.",
        "Kuyken, W., Padesky, C. A. y Dudley, R. (2009). Collaborative case conceptualization. Guilford Press.",
      ],
    },

    // 6. ACTIVACIÓN CONDUCTUAL
    {
      id: "activacion-conductual",
      nombre: "Activación conductual",
      modelo: "Activación conductual (Martell, Dimidjian y Herman-Dunn; Jacobson).",
      enPocasPalabras:
        "Es volver a hacer, de forma gradual y planeada, actividades que dan placer, logro o que acercan a lo que importa, aunque no haya ganas. Parte de que el ánimo bajo lleva a hacer menos, y hacer menos empeora el ánimo.",
      indicaciones: [
        "Depresión con inactividad, aislamiento o abandono de rutinas.",
        "Cuando la persona dice «cuando me den ganas, lo hago».",
        "Como primer paso sencillo cuando el pensamiento está demasiado enredado para trabajarlo.",
        "Duelo o estrés prolongado con retraimiento.",
        "Cuando hay rumiación y evitación que pueden reemplazarse por acción.",
      ],
      precauciones: [
        "Con riesgo suicida, evaluar y garantizar la seguridad primero; la agenda de actividades no sustituye ese trabajo.",
        "Con agotamiento marcado o problemas médicos, ajustar la dificultad y las expectativas.",
        "No poner metas demasiado grandes: el fracaso con la tarea refuerza la desesperanza.",
        "En pobreza, violencia o sobrecarga de cuidado, adaptar las actividades a lo que sí es posible y seguro.",
        "En una fase de ánimo muy elevado (posible bipolaridad), no estimular más actividad sin evaluar.",
      ],
      pasos: [
        "Pedir un registro simple de actividades, con el ánimo de cada una.",
        "Revisar el registro buscando qué actividades suben o bajan el ánimo.",
        "Ligar las actividades a valores o metas importantes para la persona.",
        "Hacer una lista de posibles actividades y ordenarla de más fácil a más difícil.",
        "Elegir una o dos tareas pequeñas, con día, hora y lugar concretos.",
        "Anticipar obstáculos y planear cómo resolverlos.",
        "En la sesión siguiente, revisar lo hecho, ajustar y reforzar los esfuerzos.",
      ],
      dialogo: [
        "Terapeuta: En su registro veo que casi toda la semana estuvo en cama. ¿Qué actividad antes le gustaba?",
        "Paciente: Caminar por el parque con mi hermana. Ya no tengo ganas de nada.",
        "Terapeuta: Es normal que no haya ganas; la idea no es esperar a que lleguen. ¿Qué le parece una caminata corta el sábado?",
        "Paciente: No sé si pueda. Me cansa todo.",
        "Terapeuta: Entonces hagámosla más pequeña: diez minutos, solo hasta la tienda de la esquina. ¿Qué tan posible la ve, de cero a cien?",
        "Paciente: Un setenta, si mi hermana me acompaña.",
        "Terapeuta: Perfecto. ¿Quién la llamaría y a qué hora?",
      ],
      errores: [
        "Esperar a que la motivación aparezca antes de actuar.",
        "Poner tareas demasiado grandes o vagas («salir más»).",
        "Elegir actividades que a la persona no le importan, solo porque «hacen bien».",
        "No revisar la tarea en la sesión siguiente, lo que le quita valor.",
        "Juzgar la falta de ánimo como pereza.",
      ],
      evidencia:
        "La activación conductual cuenta con buen apoyo empírico para el tratamiento de la depresión, con resultados comparables a los de la terapia cognitiva completa en varios estudios. Es relativamente sencilla de enseñar y se adapta bien a distintos contextos.",
      fichas: ["2.2", "4.1", "4.5"],
      caso:
        "Elena, de 45 años, vive en Escuintla y perdió su puesto en una maquila hace seis meses. Pasa gran parte del día en la cama o frente al televisor, ha dejado de ir al mercado con su vecina y se siente «inútil». Dice que cuando se anime volverá a cocinar para vender, como hacía antes. Duerme mal y llora con frecuencia. Su hija adolescente la anima a salir, pero ella dice que no tiene fuerzas.",
      preguntas: [
        "¿Qué ciclo mantiene la inactividad de Elena?",
        "¿Qué primera actividad pequeña propondría y cómo la haría concreta?",
        "¿Qué obstáculos anticiparía y cómo los trabajaría?",
        "¿Qué valor de Elena le serviría de brújula?",
      ],
      clave: "La acción viene primero y el ánimo la sigue: se actúa según el plan, no según las ganas.",
      referencias: [
        "Martell, C. R., Dimidjian, S. y Herman-Dunn, R. (2010). Behavioral activation for depression: A clinician's guide. Guilford Press.",
        "Dimidjian, S., Hollon, S. D., Dobson, K. S., Schmaling, K. B., Kohlenberg, R. J., Addis, M. E., et al. (2006). Randomized trial of behavioral activation, cognitive therapy, and antidepressant medication in the acute treatment of adults with major depression. Journal of Consulting and Clinical Psychology, 74(4), 658–670.",
      ],
    },

    // 7. EXPOSICIÓN Y PREVENCIÓN DE RESPUESTA
    {
      id: "exposicion",
      nombre: "Exposición y prevención de respuesta",
      modelo: "Aprendizaje inhibitorio (Craske y colaboradores); exposición y prevención de respuesta (Foa).",
      enPocasPalabras:
        "Consiste en acercarse de forma planeada y gradual a lo que se teme o evita, sin recurrir a rituales ni a conductas de escape, para aprender que lo temido no ocurre o que se puede tolerar. Lo que se busca no es que la ansiedad baje a toda costa, sino que la persona aprenda algo nuevo.",
      indicaciones: [
        "Fobias específicas, ansiedad social, pánico y agorafobia.",
        "Trastorno obsesivo-compulsivo, con prevención de la respuesta ritual.",
        "Evitación que limita la vida de la persona y que ya está entendida en la formulación.",
        "Miedo a sensaciones corporales, con exposición interoceptiva.",
        "Estrés postraumático, solo en manos de quien tenga formación en trauma.",
      ],
      precauciones: [
        "No iniciar sin una formulación del caso y sin psicoeducación previa que explique la lógica de la exposición.",
        "No aplicarla con riesgo suicida u otra crisis activa, con consumo grave o con una situación de peligro real; primero estabilizar.",
        "En TEPT o trauma complejo, usarla solo con formación específica en trauma y con ritmo cuidadoso.",
        "Si la persona no la acepta o no entiende la razón, volver a explicarla; nunca imponerla ni forzarla.",
        "Revisar condiciones médicas (cardíacas, respiratorias, embarazo) antes de la exposición interoceptiva.",
      ],
      pasos: [
        "Definir con la persona qué teme que ocurra y qué hace para evitarlo.",
        "Construir una jerarquía de situaciones, de menos a más difícil, con un nivel de malestar para cada una.",
        "Explicar la lógica y acordar qué predicción se pondrá a prueba.",
        "Empezar por un escalón manejable y quedarse en la situación sin escapar ni hacer rituales ni conductas de seguridad.",
        "Registrar malestar y la predicción antes y después, y lo que realmente ocurrió.",
        "Ayudar a extraer el aprendizaje: qué esperaba, qué pasó y qué significa.",
        "Repetir la exposición en diferentes contextos y subir de escalón con la tarea para casa.",
      ],
      dialogo: [
        "Terapeuta: Hoy vamos a subir al segundo piso del centro comercial, como lo acordamos. ¿Qué cree que va a pasar?",
        "Paciente: Que me voy a marear y me voy a desmayar delante de todos.",
        "Terapeuta: Anotemos esa predicción: ¿qué tanto la cree, de cero a cien?",
        "Paciente: Un noventa.",
        "Terapeuta: Quedémonos aquí y veamos qué ocurre. Sin agarrarse del barandal ni tomar agua. ¿Cómo está su malestar ahora?",
        "Paciente: Alto, como un ochenta, pero sigo de pie.",
        "Terapeuta: ¿Y qué pasó con el desmayo?",
        "Paciente: No pasó. Me mareé un poco, pero ya está bajando.",
      ],
      errores: [
        "Empezar sin formulación ni psicoeducación, o con un escalón demasiado alto.",
        "Cortar la exposición cuando el malestar sube, y así reforzar el escape.",
        "Permitir conductas de seguridad escondidas (distracción, rituales, acompañantes).",
        "Medir el éxito solo por la baja de ansiedad y no por lo que la persona aprendió.",
        "No dejar práctica en casa ni variar los contextos, lo que limita la generalización.",
      ],
      evidencia:
        "La exposición cuenta con respaldo empírico sólido para fobias, ansiedad social, pánico, TOC y estrés postraumático. Los modelos actuales destacan el aprendizaje inhibitorio, que se fortalece con expectativas puestas a prueba, variedad de contextos y práctica repetida.",
      fichas: ["2.4", "4.2", "4.4"],
      caso:
        "Carlos, de 36 años, vendedor de Antigua Guatemala, desde hace tres años evita viajar en buseta por miedo a tener un ataque de pánico y no poder bajarse. Para llegar a su trabajo gasta más y se lleva el carro de su cuñado. En la evaluación no hay riesgo suicida ni consumo problemático. Ya entiende el ciclo del pánico y se comprometió a hacer una lista de situaciones temidas. Dice que está nervioso pero decidido.",
      preguntas: [
        "¿Qué elementos de la formulación deben estar listos antes de empezar la exposición?",
        "Escriba tres escalones de una jerarquía para Carlos y su predicción en cada uno.",
        "¿Qué conductas de seguridad debería identificar?",
        "¿Qué haría si en plena exposición Carlos pide parar?",
      ],
      clave: "La exposición no es aguantar: es aprender algo nuevo, con un plan, sin escapar y sin rituales.",
      referencias: [
        "Craske, M. G., Treanor, M., Conway, C. C., Zbozinek, T. y Vervliet, B. (2014). Maximizing exposure therapy: An inhibitory learning approach. Behaviour Research and Therapy, 58, 10–23.",
        "Foa, E. B., Yadin, E. y Lichner, T. K. (2012). Exposure and response (ritual) prevention for obsessive-compulsive disorder: Therapist guide (2.ª ed.). Oxford University Press.",
      ],
    },

    // 8. CIERRE Y PREVENCIÓN DE RECAÍDAS
    {
      id: "cierre-recaidas",
      nombre: "Cierre del tratamiento y prevención de recaídas",
      modelo: "TCC (J. S. Beck); formato grupal y de mantenimiento (Bieling, McCabe y Antony).",
      enPocasPalabras:
        "Es preparar a la persona para seguir sola: repasar lo aprendido, anticipar situaciones de riesgo, distinguir un tropiezo de una recaída y dejar un plan escrito. El cierre se trabaja desde antes de la última sesión y se puede espaciar para consolidar los logros.",
      indicaciones: [
        "Cuando se acercan las últimas sesiones y las metas se han cumplido en lo esencial.",
        "Tras un tratamiento de un cuadro que suele reaparecer, como depresión o ansiedad.",
        "Cuando la persona teme que, sin la terapia, todo vuelva atrás.",
        "Para espaciar las sesiones y comprobar que mantiene lo aprendido.",
        "Al cerrar un tratamiento grupal o de formato breve.",
      ],
      precauciones: [
        "No cerrar de golpe si hay riesgo suicida reciente, crisis activa o síntomas sin mejoría: revisar el plan y la continuidad.",
        "No tratar cualquier tropiezo como fracaso; presentar los altibajos como esperables.",
        "Si faltan los avances, no forzar el cierre: ajustar la formulación o considerar derivación.",
        "Dejar claro cómo y cuándo volver a consulta, sin generar dependencia ni abandono.",
      ],
      pasos: [
        "Hablar del cierre con anticipación y acordar cuándo y cómo será.",
        "Repasar el punto de partida, los logros y las habilidades que sirvieron, atribuyéndolos a los esfuerzos de la persona.",
        "Identificar situaciones y señales de alerta que podrían traer una recaída.",
        "Diferenciar «tropiezo» de «recaída» y practicar cómo responder a cada uno.",
        "Escribir un plan de mantenimiento: técnicas clave, hábitos y personas de apoyo.",
        "Espaciar las últimas sesiones para probar la autonomía.",
        "Acordar señales para volver a consulta y dejar abierta la puerta para sesiones de refuerzo.",
      ],
      dialogo: [
        "Terapeuta: Nos quedan dos sesiones. ¿Cómo se siente con la idea de terminar?",
        "Paciente: Un poco nervioso. Me da miedo volver a caer como antes.",
        "Terapeuta: Es una preocupación comprensible. ¿Qué cosas le dirían que empieza a ir mal?",
        "Paciente: Cuando dejo de salir y me quedo en cama todo el día.",
        "Terapeuta: Esa es una señal clara. Y si pasa un fin de semana así, ¿es una recaída o un tropiezo?",
        "Paciente: Un tropiezo. Lo que importa es volver a mi plan de actividades.",
        "Terapeuta: Exacto. Escribámoslo en su plan, junto con a quién llamaría.",
      ],
      errores: [
        "Dejar el cierre para la última sesión, sin tiempo de preparar a la persona.",
        "Atribuir las mejorías al terapeuta o a la técnica, y no a lo que hizo la persona.",
        "Prometer que no habrá recaídas.",
        "Hacer un plan genérico, sin las señales y recursos propios de la persona.",
        "Cortar el contacto de forma abrupta, sin dejar claro cómo volver.",
      ],
      evidencia:
        "Las intervenciones de prevención de recaídas se asocian con menor reaparición de síntomas en depresión y ansiedad frente a la atención habitual, y los beneficios de la TCC suelen mantenerse tras terminar. La calidad de los datos varía y no elimina la posibilidad de una recaída.",
      fichas: ["5.1", "5.2", "5.3"],
      caso:
        "Andrea, de 38 años, enfermera en Cobán, terminó catorce sesiones por depresión y ya trabaja con normalidad, camina cada mañana y retomó su grupo de la iglesia. Dice que su mayor temor es que, al no tener terapia, vuelva a sentirse como antes cuando llegue la época de más trabajo en el hospital. En el pasado, las épocas de turnos dobles la hundieron. Tiene una hermana que la apoya y un cuaderno de registros.",
      preguntas: [
        "¿Cuáles serían las señales de alerta personales de Andrea?",
        "¿Cómo explicaría la diferencia entre un tropiezo y una recaída?",
        "¿Qué incluiría en su plan escrito de mantenimiento?",
        "¿Cómo espaciaría las últimas sesiones y qué diría para cerrar?",
      ],
      clave: "Un buen cierre deja a la persona con un plan y con la confianza de que sabe qué hacer si algo se complica.",
      referencias: [
        "Beck, J. S. (2020). Cognitive behavior therapy: Basics and beyond (3.ª ed.). Guilford Press.",
        "Bieling, P. J., McCabe, R. E. y Antony, M. M. (2006). Cognitive-behavioral therapy in groups. Guilford Press.",
      ],
    },
  ],
};
