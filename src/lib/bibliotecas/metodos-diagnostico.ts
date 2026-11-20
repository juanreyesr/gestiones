/**
 * Biblioteca JJR «Métodos de diagnóstico»: ocho fichas de técnicas de evaluación, en el orden de una evaluación clínica.
 * Redacción propia (no copia ni parafrasea de cerca manuales, criterios diagnósticos ni ítems de pruebas).
 * Las fichas terapéuticas enlazadas (1.1, 1.2, 5.1) son las que ya existen en el catálogo de Fichas terapéuticas JJR.
 */
import type { BibliotecaTecnicas } from "./tipos";

export const BIBLIOTECA_METODOS_DIAGNOSTICO: BibliotecaTecnicas = {
  id: "metodos-diagnostico",
  tipo: "tecnicas",
  titulo: "Métodos de diagnóstico",
  descripcion:
    "Ocho métodos del proceso de evaluación, en orden: entrevista inicial, examen del estado mental, riesgo suicida, pruebas psicométricas, diagnóstico diferencial, integración con DSM-5-TR y CIE-11, informe psicológico y devolución de resultados. Cada ficha explica cuándo usarla, cómo aplicarla y qué cuidar.",
  fichas: [
    // 1. ENTREVISTA INICIAL
    {
      id: "entrevista-inicial",
      nombre: "Entrevista clínica inicial",
      modelo: "Entrevista semiestructurada y motivo de consulta (Othmer y Othmer; Morrison).",
      enPocasPalabras:
        "Es la primera conversación formal con la persona: se aclara por qué consulta, cómo es su vida hoy y qué le ha pasado antes. Combina preguntas abiertas, que dejan hablar, con preguntas dirigidas que cubren lo que falta. Sirve para formar el vínculo y reunir los datos que guiarán el resto de la evaluación.",
      indicaciones: [
        "Primer contacto con cualquier paciente, antes de aplicar pruebas o proponer un tratamiento.",
        "Cuando llega derivado y el motivo de consulta no está claro.",
        "Cuando hay varios problemas a la vez y hace falta ordenarlos por prioridad.",
        "Cuando se necesita una historia de vida y de salud para decidir qué evaluar después.",
        "En prácticas de formación, para entrenar la escucha y el orden de la información.",
      ],
      precauciones: [
        "Si hay crisis o riesgo de hacerse daño, se atiende primero la seguridad y la historia completa espera.",
        "Con personas muy angustiadas o cansadas, acortar la sesión y completar la entrevista en otra cita.",
        "No convertirla en un interrogatorio: si el guion tapa a la persona, volver a las preguntas abiertas.",
        "Con menores o personas dependientes, explicar con claridad qué se comparte con la familia y qué se guarda.",
      ],
      pasos: [
        "Recibir a la persona, explicar el propósito de la sesión, el tiempo disponible y los límites de la confidencialidad.",
        "Empezar con una pregunta abierta sobre el motivo de consulta y dejar hablar sin interrumpir los primeros minutos.",
        "Precisar cada problema con ejemplos: cuándo comenzó, con qué frecuencia ocurre y cuánto afecta su vida diaria.",
        "Revisar la historia personal: salud, tratamientos previos, consumo de sustancias, familia, estudios, trabajo y relaciones.",
        "Explorar recursos y apoyos de la persona, no solo los problemas.",
        "Preguntar de forma directa por el riesgo de hacerse daño, y ampliar con la ficha de riesgo suicida si hay señales.",
        "Resumir lo escuchado con las palabras de la persona y corregir juntos lo que no encaje.",
        "Acordar los próximos pasos: qué otras evaluaciones hacen falta y cuándo se vuelven a ver.",
      ],
      dialogo: [
        "Terapeuta: Antes de empezar, le explico que lo que conversemos es confidencial, con las excepciones que le voy a mencionar. ¿Qué le trae por aquí?",
        "Paciente: No sé, ando como apagada. Desde hace unos meses no tengo ganas de nada.",
        "Terapeuta: Cuénteme cómo es un día normal para usted, desde que se levanta.",
        "Paciente: Me levanto tarde, me cuesta ir a la tienda y cuando llego solo quiero que se acabe el día.",
        "Terapeuta: ¿Recuerda cuándo notó este cambio por primera vez?",
        "Paciente: Cuando murió mi papá, en mayo. Desde entonces no soy la misma.",
        "Terapeuta: Siento mucho su pérdida. Para entender mejor, ¿cómo ha dormido y comido en estas semanas?",
        "Paciente: Duermo mal y casi no tengo hambre, a veces se me pasa el día sin comer.",
      ],
      errores: [
        "Pasar demasiado pronto a las preguntas cerradas y perder la versión propia de la persona.",
        "Llenar el silencio por incomodidad del terapeuta, en lugar de dejar que la persona piense.",
        "Anotar todo sin mirar a la persona, lo que daña el vínculo.",
        "Saltarse las preguntas sobre consumo, trauma o riesgo por temor a incomodar.",
        "Formarse una hipótesis rápida y buscar solo los datos que la confirman.",
        "Terminar sin resumir ni acordar los pasos, y dejar a la persona sin saber qué sigue.",
      ],
      evidencia:
        "Las entrevistas estructuradas y semiestructuradas dan diagnósticos más consistentes entre evaluadores que la entrevista totalmente libre. En la práctica diaria se suele usar una entrevista flexible, y su calidad depende mucho de la formación y la supervisión del terapeuta.",
      fichas: ["1.1", "1.2"],
      caso:
        "Mario, de 27 años, empleado de un taller mecánico en Mixco, llega a consulta por insistencia de su hermana. Dice que «solo está cansado», pero duerme cuatro horas, ha perdido peso y su jefe le llamó la atención por equivocaciones repetidas. Habla poco y mira al suelo. Al preguntarle por el consumo de alcohol, cambia de tema. Se enojó cuando la hermana mencionó a su exnovia y no quiere hablar de eso.",
      preguntas: [
        "¿Con qué pregunta abierta empezaría la entrevista con Mario y por qué?",
        "¿Cómo exploraría el consumo de alcohol sin que él se sienta juzgado?",
        "¿Qué datos de su historia necesita antes de plantear alguna hipótesis diagnóstica?",
        "¿En qué momento y con qué palabras preguntaría por el riesgo de hacerse daño?",
      ],
      clave: "La entrevista inicial abre con preguntas abiertas, ordena lo que cuenta la persona y no se cierra sin explorar el riesgo.",
      referencias: [
        "Othmer, E. y Othmer, S. C. (2002). The clinical interview using DSM-IV-TR. American Psychiatric Publishing.",
        "Morrison, J. (2014). The first interview (4.ª ed.). Guilford Press.",
        "Groth-Marnat, G. y Wright, A. J. (2016). Handbook of psychological assessment (6.ª ed.). Wiley.",
      ],
    },

    // 2. EXAMEN MENTAL
    {
      id: "examen-mental",
      nombre: "Examen del estado mental",
      modelo: "Apariencia, conducta, lenguaje, afecto y ánimo, pensamiento, percepción, cognición, juicio e introspección (Trzepacz y Baker; Morrison).",
      enPocasPalabras:
        "Es una descripción ordenada de cómo se presenta la persona durante la sesión: lo que se observa y lo que ella cuenta de su estado interno en ese momento. Funciona como una fotografía del día, no como un diagnóstico. Permite comparar cambios entre sesiones y detectar señales que piden atención urgente o una evaluación médica.",
      indicaciones: [
        "En toda evaluación inicial, como parte del registro clínico.",
        "Cuando hay sospecha de confusión, delirio, psicosis o un cuadro de causa médica.",
        "Cuando el relato de la persona no coincide con lo que se observa en sesión.",
        "Para seguir la evolución de un paciente entre una cita y otra.",
        "Al derivar a psiquiatría o a otro servicio, para describir el estado actual con claridad.",
      ],
      precauciones: [
        "Describir lo observado y no interpretarlo: «habla rápido» y no «está maníaco».",
        "No sacar conclusiones de un solo día: el cansancio, el miedo o la cultura influyen en la presentación.",
        "Con personas de otra lengua o cultura, distinguir una creencia propia de su comunidad de una idea delirante.",
        "Si hay desorientación, somnolencia o cambio brusco, pedir valoración médica pronto en lugar de seguir con la entrevista.",
      ],
      pasos: [
        "Observar desde la llegada: apariencia, aseo, vestimenta, contacto visual, movimientos y actitud hacia el terapeuta.",
        "Notar el lenguaje: velocidad, volumen, cantidad y claridad al hablar.",
        "Preguntar por el ánimo con sus palabras y observar el afecto: si coincide con lo que cuenta y cuánto varía.",
        "Seguir el curso del pensamiento (ordenado, disperso, enlentecido) y su contenido: preocupaciones, ideas poco comunes, ideas de hacerse daño.",
        "Preguntar por experiencias de percepción, como oír o ver algo que otros no perciben.",
        "Revisar la cognición: orientación, atención y memoria, con tareas sencillas y sin avergonzar.",
        "Valorar el juicio (cómo decide ante situaciones cotidianas) y la introspección (cuánto reconoce el problema).",
        "Registrar los hallazgos en lenguaje descriptivo y fechado.",
      ],
      dialogo: [
        "Terapeuta: Le voy a hacer unas preguntas que hago a todas las personas. ¿Me puede decir qué día es hoy y dónde estamos?",
        "Paciente: Hoy es jueves, estamos en su clínica en la zona 10.",
        "Terapeuta: Gracias. En estas últimas semanas, ¿ha escuchado o visto algo que otras personas a su alrededor no perciban?",
        "Paciente: Una vez me pareció oír que mi mamá me llamaba, pero ella estaba en Quetzaltenango.",
        "Terapeuta: ¿Le ha pasado más veces o solo esa?",
        "Paciente: Solo esa, cuando estaba medio dormida.",
        "Terapeuta: Si encontrara en la calle una billetera con dinero y documentos, ¿qué haría?",
        "Paciente: La llevaría a la policía o buscaría al dueño por los documentos.",
      ],
      errores: [
        "Usar términos técnicos en lugar de describir lo que se ve, lo que vuelve el registro poco útil.",
        "Hacer el examen como un cuestionario frío, sin explicar para qué sirve.",
        "Dar por normal la orientación y la memoria sin comprobarlas cuando hay dudas.",
        "No distinguir una experiencia propia de la cultura o la religión de la persona de un síntoma.",
        "Omitir la introspección y el juicio, que orientan el plan de cuidado.",
      ],
      evidencia:
        "El examen del estado mental es una práctica clínica estándar y su valor está sobre todo en el registro sistemático y en comparar cambios. No es una prueba con puntos de corte propios, y la calidad de la observación depende de la formación del evaluador.",
      fichas: [],
      caso:
        "Doña Eugenia, de 68 años, viuda, vive con una hija en Escuintla y llega acompañada por ella porque «últimamente se pierde». Llega a la hora equivocada, se olvida de lo que acaba de decir y llama «mijo» al terapeuta. Está tranquila, bien arreglada y dice que no le pasa nada. La hija cuenta que hace una semana se cayó y que desde entonces anda más confundida y somnolienta.",
      preguntas: [
        "¿Qué elementos del examen mental son más urgentes de explorar con doña Eugenia?",
        "¿Cómo describiría su conducta y su pensamiento sin usar etiquetas diagnósticas?",
        "¿Por qué el antecedente de la caída cambia lo que se debe hacer?",
        "¿Cómo registraría su introspección y juicio?",
      ],
      clave: "El examen mental describe lo observado hoy con palabras claras y sin etiquetas; ante confusión de inicio reciente, se pide valoración médica.",
      referencias: [
        "Trzepacz, P. T. y Baker, R. W. (1993). The psychiatric mental status examination. Oxford University Press.",
        "Morrison, J. (2014). The first interview (4.ª ed.). Guilford Press.",
        "Groth-Marnat, G. y Wright, A. J. (2016). Handbook of psychological assessment (6.ª ed.). Wiley.",
      ],
    },

    // 3. RIESGO SUICIDA
    {
      id: "riesgo-suicida",
      nombre: "Evaluación del riesgo suicida",
      modelo: "Pregunta directa, evaluación por niveles y plan de seguridad (Stanley y Brown); escala de Columbia (C-SSRS) como apoyo (Posner et al.).",
      enPocasPalabras:
        "Consiste en preguntar sin rodeos por los pensamientos de quitarse la vida, y entender su intensidad, su plan, la intención y los medios disponibles. A partir de eso se decide el nivel de cuidado y se construye con la persona un plan de seguridad. Preguntar no provoca la idea: suele aliviar y abre la conversación.",
      indicaciones: [
        "En toda evaluación inicial, aunque la persona no haya mencionado el tema.",
        "Cuando hay depresión, desesperanza, consumo de sustancias, pérdidas recientes o una crisis fuerte.",
        "Cuando la persona dice frases como «ya no quiero seguir» o «sería mejor no estar».",
        "Después de un intento previo o de una hospitalización.",
        "Cuando cambia algo importante en el tratamiento: alta, ruptura, mudanza o la pérdida de un apoyo.",
      ],
      precauciones: [
        "Con riesgo inminente (intención clara, plan y medios a mano), no dejar sola a la persona y activar de inmediato apoyo familiar y servicios de urgencia.",
        "No prometer confidencialidad absoluta: explicar que se romperá si la vida está en peligro.",
        "No basarse solo en una escala ni en la palabra «estoy bien»: el juicio clínico integra todo lo observado.",
        "No usar los ítems de las escalas del sistema ante el paciente como una lista; preguntar con palabras propias y de manera directa.",
        "Documentar cada evaluación, la decisión y el motivo; no dejarla solo en la memoria.",
      ],
      pasos: [
        "Crear un ambiente tranquilo y privado y preguntar de forma directa, con voz serena, por pensamientos de quitarse la vida.",
        "Si los hay, explorar frecuencia, duración e intensidad, y qué los hace subir o bajar; luego preguntar por plan, intención, medios disponibles (en la casa o el trabajo) y preparativos ya hechos.",
        "Indagar antecedentes: intentos anteriores, autolesiones, hospitalizaciones y suicidios en la familia.",
        "Valorar los factores de riesgo (desesperanza, consumo, aislamiento, pérdidas, dolor intenso) y los protectores (vínculos, razones para vivir, tratamiento, fe).",
        "Decidir el nivel de cuidado: seguimiento ambulatorio, mayor frecuencia, derivación o atención urgente.",
        "Elaborar con la persona un plan de seguridad por escrito: señales de alarma, recursos propios, personas de apoyo y contactos de emergencia locales.",
        "Conversar sobre restringir el acceso a medios y, con su consentimiento, involucrar a una persona de confianza.",
        "Documentar todo y programar un seguimiento cercano y concreto.",
      ],
      dialogo: [
        "Terapeuta: Me contó que se siente muy cansado de todo. Le voy a preguntar algo directo, porque es importante: ¿ha pensado en quitarse la vida?",
        "Paciente: Sí, a veces. Pienso que mi familia estaría mejor sin mí.",
        "Terapeuta: Gracias por decírmelo. ¿Cuándo fue la última vez que lo pensó, y con qué frecuencia le viene?",
        "Paciente: Casi todas las noches, desde que me quedé sin trabajo.",
        "Terapeuta: ¿Ha pensado cómo lo haría o ha hecho algo para prepararse?",
        "Paciente: No tengo un plan. Solo es el pensamiento, pero me asusta.",
        "Terapeuta: Hizo bien en contármelo. Vamos a armar juntos un plan para las noches difíciles. ¿Quién de su familia podría saber de esto y acompañarle?",
        "Paciente: Mi hermano. Con él sí puedo hablar.",
      ],
      errores: [
        "Evitar la pregunta por miedo a «meterle la idea», lo cual no tiene respaldo.",
        "Preguntar con rodeos o con tono de juicio, lo que lleva a la persona a callar.",
        "Quedarse tranquilo con un «estoy bien» sin explorar plan, medios y antecedentes.",
        "Hacer promesas de secreto absoluto que luego no se pueden cumplir.",
        "Pedir un «contrato de no suicidio» en lugar de construir un plan de seguridad real.",
        "No documentar ni dar seguimiento, y dejar la evaluación como un hecho aislado.",
      ],
      evidencia:
        "Las escalas y los factores de riesgo predicen mal quién hará un intento en un momento dado, por eso se usan como apoyo y no como sustituto del juicio clínico. La intervención de plan de seguridad ha mostrado resultados prometedores para reducir conductas suicidas, y la evidencia se sigue ampliando.",
      fichas: ["5.1"],
      caso:
        "Julio, de 31 años, repartidor en moto en la ciudad de Guatemala, llega después de que lo despidieron y de que su pareja se llevó a los niños donde su suegra. Dice que está agotado y, casi sin mirar, comenta que «mejor desaparecer». Toma alcohol los fines de semana y guarda en casa el arma de su papá, fallecido hace un año. Tiene un hermano con quien habla seguido. No ha tenido intentos anteriores, según cuenta.",
      preguntas: [
        "¿Con qué palabras le preguntaría directamente a Julio por sus pensamientos de quitarse la vida?",
        "¿Qué factores de riesgo y protectores identifica en el caso?",
        "¿Cómo abordaría el arma que guarda en casa?",
        "¿Qué incluiría en su plan de seguridad y a quién involucraría, con su consentimiento?",
      ],
      clave: "Se pregunta de forma directa, se evalúa plan, intención y medios, y nunca se deja sola a una persona en riesgo inminente.",
      referencias: [
        "Stanley, B. y Brown, G. K. (2012). Safety planning intervention: A brief intervention to mitigate suicide risk. Cognitive and Behavioral Practice, 19(2), 256–264.",
        "Posner, K., Brown, G. K., Stanley, B., et al. (2011). The Columbia-Suicide Severity Rating Scale. American Journal of Psychiatry, 168(12), 1266–1277.",
        "Morrison, J. (2014). The first interview (4.ª ed.). Guilford Press.",
      ],
    },

    // 4. PRUEBAS PSICOMÉTRICAS
    {
      id: "pruebas-psicometricas",
      nombre: "Elegir y usar pruebas psicométricas",
      modelo: "Validez, confiabilidad, baremos y adaptación al contexto; ética del uso de pruebas (Estándares AERA, APA y NCME; Comisión Internacional de Tests).",
      enPocasPalabras:
        "Es el criterio para decidir qué prueba aplicar, a quién, para qué y cómo interpretarla. Una buena prueba tiene evidencia de que mide lo que dice medir, da resultados estables y cuenta con baremos adecuados a la población. Un resultado es un dato más de la evaluación, nunca un diagnóstico por sí solo.",
      indicaciones: [
        "Cuando la entrevista deja dudas que un instrumento puede aclarar.",
        "Para medir la intensidad de un problema y comparar al inicio y al final del tratamiento.",
        "Para cribar a muchas personas en un servicio, con un instrumento breve.",
        "Cuando se necesita una medida objetiva para un informe o una derivación.",
        "En orientación vocacional y educativa, donde se requieren baremos por edad o nivel.",
      ],
      precauciones: [
        "Un cribado positivo indica que hay que evaluar más, no que exista el trastorno; confirmarlo con entrevista.",
        "Evitar pruebas sin baremos ni adaptación a la población guatemalteca: los puntajes pueden engañar.",
        "Considerar lengua, escolaridad, cultura y condición de salud antes de interpretar un resultado.",
        "Respetar la reserva de los materiales y la formación requerida para cada instrumento; no aplicar pruebas para las que no se tiene preparación.",
      ],
      pasos: [
        "Definir la pregunta de la evaluación: qué se necesita saber y para qué se va a usar la información.",
        "Elegir instrumentos con evidencia de validez y confiabilidad para esa pregunta y esa población.",
        "Revisar si existen baremos y adaptación para la edad, el nivel educativo y el contexto de la persona.",
        "Explicar a la persona para qué sirve la prueba, cómo se usará y quién verá los resultados, y obtener su consentimiento.",
        "Aplicar en condiciones adecuadas y respetando las instrucciones estandarizadas.",
        "Puntuar con cuidado y comparar con el baremo correcto; distinguir cribado de diagnóstico.",
        "Integrar los resultados con la entrevista, la observación y la historia antes de sacar conclusiones.",
        "Guardar los protocolos con seguridad y comunicar los resultados en lenguaje claro.",
      ],
      dialogo: [
        "Terapeuta: Quiero proponerle un cuestionario breve sobre cómo se ha sentido estas semanas. ¿Le explico para qué sirve?",
        "Paciente: Sí, ¿es un examen? Me pone nervioso.",
        "Terapeuta: No hay respuestas buenas ni malas. Es una guía que me ayuda a entender qué tan fuerte es lo que siente, y lo vamos a comentar juntos.",
        "Paciente: ¿Y si sale que estoy mal de la cabeza?",
        "Terapeuta: El resultado no dice eso. Es un dato más, junto con lo que usted me cuenta. Nadie más lo verá sin su permiso.",
        "Paciente: Entonces está bien, lo hago.",
      ],
      errores: [
        "Aplicar una prueba porque «siempre se hace», sin una pregunta clara detrás.",
        "Tomar el puntaje de un cribado como si fuera un diagnóstico.",
        "Usar baremos de otro país sin revisar si aplican a la persona evaluada.",
        "Entregar un número sin contexto ni explicación.",
        "Ignorar el cansancio, la lectura o el estado emocional de la persona al contestar.",
        "Dejar los protocolos a la vista o compartirlos sin autorización.",
      ],
      evidencia:
        "Las pruebas con buena validez y confiabilidad mejoran la precisión de la evaluación frente a la impresión clínica sola. Su utilidad depende del contexto de uso, de los baremos y del cuidado en la interpretación, y varía mucho entre instrumentos.",
      fichas: [],
      caso:
        "Ana Lucía, de 19 años, estudiante de primer año de Psicología en una universidad de la capital, se siente desbordada y su tutora le pide un cuestionario de ansiedad antes de la consulta. Contesta rápido, casi sin leer, porque tiene examen en una hora. El puntaje sale alto y ella se asusta al verlo. La tutora está por escribir en el expediente que tiene un trastorno de ansiedad. Ana Lucía no ha dormido bien y toma mucho café en estas semanas.",
      preguntas: [
        "¿Qué condiciones de la aplicación pudieron alterar el puntaje de Ana Lucía?",
        "¿Por qué un puntaje alto en un cribado no basta para escribir un diagnóstico?",
        "¿Qué más evaluaría antes de sacar una conclusión?",
        "¿Cómo le explicaría el resultado para no aumentar su angustia?",
      ],
      clave: "Una prueba responde una pregunta concreta, con baremos adecuados, y su resultado se integra con la entrevista antes de concluir.",
      referencias: [
        "AERA, APA y NCME. (2014). Standards for educational and psychological testing. American Educational Research Association.",
        "Groth-Marnat, G. y Wright, A. J. (2016). Handbook of psychological assessment (6.ª ed.). Wiley.",
        "International Test Commission. (2001). International guidelines for test use. International Journal of Testing, 1(2), 93–114.",
      ],
    },

    // 5. DIAGNÓSTICO DIFERENCIAL
    {
      id: "diagnostico-diferencial",
      nombre: "Diagnóstico diferencial",
      modelo: "Árbol de decisión: simulación, sustancias, causa médica, curso, edad y trastorno primario frente a comorbilidad (First).",
      enPocasPalabras:
        "Es el razonamiento para descartar otras explicaciones antes de quedarse con un diagnóstico. Se pregunta, en orden, si hay exageración o simulación, efecto de sustancias o medicamentos, una enfermedad médica, y si el cuadro es primario o secundario a otro. Reduce los errores de dar una etiqueta apresurada.",
      indicaciones: [
        "Cuando los síntomas aparecieron de forma brusca o tardía en la vida.",
        "Cuando varios cuadros se parecen y no está claro cuál explica mejor lo que ocurre.",
        "Cuando la persona usa alcohol, drogas o medicamentos de forma regular.",
        "Cuando hay enfermedades físicas que pueden producir síntomas emocionales o cognitivos.",
        "Cuando el tratamiento no responde como se esperaba y se duda del diagnóstico inicial.",
      ],
      precauciones: [
        "No dejar de preguntar por causas médicas por ser psicólogo: coordinar con medicina cuando haga falta.",
        "No suponer simulación por una presentación llamativa; hay motivos clínicos y culturales para expresar el malestar con intensidad.",
        "Evitar aplicar el árbol de forma mecánica: la historia de la persona pesa más que el orden de los pasos.",
        "Aceptar la incertidumbre: a veces el diagnóstico queda como provisional hasta tener más datos.",
      ],
      pasos: [
        "Recoger los síntomas actuales, su inicio y su curso a lo largo del tiempo.",
        "Preguntar si hay motivos para exagerar o fingir síntomas (litigio, beneficio, evitar algo) y observar la consistencia del relato.",
        "Explorar consumo de alcohol, drogas y medicamentos, y el momento en que comenzó cada síntoma frente al consumo.",
        "Revisar la salud física: enfermedades, golpes en la cabeza, dolor crónico, cambios hormonales; pedir valoración médica si hace falta.",
        "Comparar el cuadro con los diagnósticos que se le parecen, y ver qué datos favorecen a cada uno.",
        "Considerar la edad de inicio y la evolución, y si hay episodios previos.",
        "Decidir si hay un trastorno principal, varios coexistentes o si los síntomas son consecuencia de otro cuadro.",
        "Registrar las hipótesis que quedan abiertas y qué dato las resolvería.",
      ],
      dialogo: [
        "Terapeuta: Me dice que el miedo empezó hace tres meses. ¿Cambió algo en su salud o en lo que toma en esa época?",
        "Paciente: Empecé a tomar bastante café para aguantar el trabajo, y a veces pastillas para adelgazar.",
        "Terapeuta: ¿Y cómo ha estado de la tiroides o del corazón? ¿Le han hecho exámenes?",
        "Paciente: Hace años me dijeron que la tiroides andaba mal, pero no volví a ir.",
        "Terapeuta: Eso es importante. Antes de decidir si esto es ansiedad, conviene que un médico revise la tiroides y estas pastillas.",
        "Paciente: Entonces, ¿no son mis nervios?",
        "Terapeuta: Puede que sí, pero primero quiero descartar otras causas para no equivocarnos con el tratamiento.",
        "Paciente: Está bien, voy a sacar la cita.",
      ],
      errores: [
        "Decidir el diagnóstico en la primera sesión y buscar solo lo que lo confirma.",
        "No preguntar por sustancias y medicamentos, incluso los de venta libre y los remedios naturales.",
        "Atribuir todos los síntomas a un solo trastorno sin considerar la coexistencia de otros.",
        "Confundir el malestar normal ante una pérdida o una crisis con un trastorno.",
        "Dejar de revisar el diagnóstico cuando aparecen datos nuevos.",
        "Olvidar documentar qué se descartó y por qué.",
      ],
      evidencia:
        "El diagnóstico diferencial sistemático es una buena práctica ampliamente aceptada y ayuda a evitar errores. Los estudios sobre cuánto mejora los resultados del tratamiento son limitados, por lo que se enseña como parte del razonamiento clínico y no como garantía.",
      fichas: [],
      caso:
        "Don Rolando, de 52 años, albañil en Chimaltenango, llega con irritabilidad, insomnio y la idea de que su vecino lo vigila. Todo empezó hace dos semanas, según su esposa, desde que comenzó a tomar un medicamento que le dio un curandero y a beber más de lo usual. Antes no había tenido problemas parecidos. Hace unos meses se golpeó la cabeza en la obra. Sus hijos dicen que «está raro» y que se le olvidan las cosas.",
      preguntas: [
        "¿Qué posibles causas, además de un trastorno mental, debe considerar en don Rolando?",
        "¿Qué preguntas haría sobre el medicamento y el alcohol?",
        "¿Qué datos del inicio y del curso orientan el diagnóstico?",
        "¿Qué derivación o coordinación con medicina haría y por qué?",
      ],
      clave: "Antes de poner una etiqueta, se descartan simulación, sustancias y causas médicas, y se registra lo que queda abierto.",
      referencias: [
        "First, M. B. (2024). DSM-5-TR handbook of differential diagnosis. American Psychiatric Association Publishing.",
        "American Psychiatric Association. (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto revisado; DSM-5-TR). American Psychiatric Publishing.",
        "Morrison, J. (2014). The first interview (4.ª ed.). Guilford Press.",
      ],
    },

    // 6. DIAGNÓSTICO DSM / CIE
    {
      id: "diagnostico-dsm-cie",
      nombre: "Integrar el diagnóstico con DSM-5-TR y CIE-11",
      modelo: "Codificación, especificadores y diagnóstico provisional (APA, DSM-5-TR; OMS, CIE-11).",
      enPocasPalabras:
        "Es el paso de convertir lo evaluado en un diagnóstico con su código, usando uno de los dos manuales o ambos. Incluye elegir los especificadores, decidir cuándo corresponde «otro especificado» o «no especificado» y dejar claro cuándo el diagnóstico es provisional. El diagnóstico resume el cuadro, pero no sustituye la formulación del caso.",
      indicaciones: [
        "Al cerrar la evaluación inicial, cuando ya hay suficientes datos de entrevista, observación y pruebas.",
        "Cuando una institución, aseguradora o derivación pide un código diagnóstico.",
        "Para comunicarse con otros profesionales con un lenguaje compartido.",
        "Al revisar un caso que cambió de curso y requiere actualizar el diagnóstico.",
        "En la formación, para practicar el uso correcto de los manuales.",
      ],
      precauciones: [
        "No diagnosticar con una lista de síntomas sin considerar la duración, el malestar y el funcionamiento, que también cuentan.",
        "Cuando faltan datos, marcar el diagnóstico como provisional en lugar de forzar una certeza.",
        "Los manuales no coinciden en todo: indicar cuál se usa y no mezclar códigos sin aclararlo.",
        "Pensar en el impacto de la etiqueta en la persona y su entorno: explicarla con cuidado y sin que la defina.",
      ],
      pasos: [
        "Reunir los datos de la entrevista, la observación, las pruebas y la historia, y haber descartado causas alternativas.",
        "Comparar el cuadro con el manual elegido (DSM-5-TR o CIE-11), con la lectura completa de la descripción y no solo del título.",
        "Verificar la duración, el malestar significativo y el efecto en la vida diaria.",
        "Elegir los especificadores que apliquen, como gravedad, curso o rasgos asociados.",
        "Usar «otro especificado» o «no especificado» solo cuando el cuadro no cumple una categoría completa, y anotar la razón.",
        "Registrar el código del manual usado y, si se requiere, la equivalencia con el otro sistema.",
        "Marcar «provisional» si hacen falta más datos, y definir qué se necesita para confirmarlo.",
        "Explicar el diagnóstico a la persona y mantener la formulación del caso como guía del tratamiento.",
      ],
      dialogo: [
        "Terapeuta: Con lo que hemos visto en estas sesiones, mi impresión es que su cuadro encaja con un trastorno depresivo. ¿Le parece que le explique qué significa?",
        "Paciente: Sí, pero no quiero que me pongan una etiqueta de loca.",
        "Terapeuta: Entiendo. Es una forma de nombrar lo que le pasa para poder tratarlo, no dice quién es usted. Y lo dejo como provisional hasta confirmar un par de cosas.",
        "Paciente: ¿Qué cosas?",
        "Terapeuta: Quiero descartar que la tiroides tenga algo que ver. Si todo sale normal, lo confirmamos y seguimos con el plan.",
        "Paciente: Está bien. Me da alivio que tenga nombre.",
      ],
      errores: [
        "Dar un diagnóstico por la suma de síntomas sin revisar duración ni funcionamiento.",
        "Poner varios diagnósticos para «cubrir» todo, sin pensar si uno explica a los demás.",
        "Mezclar códigos del DSM y de la CIE sin indicarlo.",
        "Usar «no especificado» como atajo cuando faltó evaluar.",
        "Entregar la etiqueta sin explicarla ni conversar sobre su significado.",
        "Darlo por definitivo y no volver a revisarlo.",
      ],
      evidencia:
        "Los sistemas de clasificación dan un lenguaje común y mejoran la comunicación entre profesionales, pero sus categorías son convenciones que se revisan con el tiempo y no describen causas. La confiabilidad entre evaluadores varía según el cuadro y mejora con formación y entrevistas estructuradas.",
      fichas: [],
      caso:
        "Sofía, de 24 años, maestra de primaria en una escuela de Cobán, consulta por tristeza, desgano y llanto fácil desde hace cuatro meses. Ha dejado de salir con amigas y le cuesta preparar sus clases. Tiene un diagnóstico escrito en una receta anterior que dice solo «ansiedad», sin código. La coordinadora le pide un informe con código para tramitar un permiso. Sofía teme que el diagnóstico afecte su trabajo.",
      preguntas: [
        "¿Qué datos necesita confirmar antes de elegir un diagnóstico para Sofía?",
        "¿Cuándo sería adecuado dejarlo como provisional?",
        "¿Qué manual elegiría y cómo lo indicaría en el informe?",
        "¿Cómo le explicaría el diagnóstico para que no la defina?",
      ],
      clave: "El diagnóstico organiza el cuadro con un código y un manual claros, se marca provisional si faltan datos y no reemplaza la formulación.",
      referencias: [
        "American Psychiatric Association. (2022). Diagnostic and statistical manual of mental disorders (5.ª ed., texto revisado; DSM-5-TR). American Psychiatric Publishing.",
        "Organización Mundial de la Salud. (2019/2022). Clasificación Internacional de Enfermedades, 11.ª revisión (CIE-11).",
        "First, M. B. (2024). DSM-5-TR handbook of differential diagnosis. American Psychiatric Association Publishing.",
      ],
    },

    // 7. INFORME PSICOLÓGICO
    {
      id: "informe-psicologico",
      nombre: "Redacción del informe psicológico",
      modelo: "Estructura del informe y lenguaje claro: motivo, procedimiento, resultados, interpretación y recomendaciones (Groth-Marnat y Wright).",
      enPocasPalabras:
        "Es el documento escrito que comunica los resultados de una evaluación a una persona concreta que lo necesita. Sigue una estructura estable: motivo, procedimiento, resultados, interpretación integrada, conclusiones y recomendaciones. Se escribe en lenguaje claro, sin jerga ni etiquetas innecesarias, y solo con los datos que el destinatario requiere.",
      indicaciones: [
        "Al terminar una evaluación que debe comunicarse a otro profesional, una institución o la familia.",
        "Cuando una escuela, un juzgado o un empleador solicita un informe con un fin específico.",
        "Al derivar a psiquiatría, a neurología o a otro servicio.",
        "Para dejar constancia del proceso en el expediente.",
        "En la formación, para aprender a redactar con precisión y respeto.",
      ],
      precauciones: [
        "Escribir siempre para un destinatario concreto y para un fin claro; un informe sirve para una pregunta, no para todas.",
        "No incluir datos innecesarios, como detalles íntimos que no ayudan a responder la pregunta.",
        "Obtener el consentimiento de la persona (o de su representante) antes de entregar el informe a terceros.",
        "Evitar frases absolutas o etiquetas definitivas: describir y matizar, con las limitaciones de la evaluación.",
      ],
      pasos: [
        "Aclarar quién pedirá el informe, para qué y qué pregunta debe responder, antes de escribirlo.",
        "Redactar el motivo de evaluación y los datos de identificación necesarios, sin excederse.",
        "Describir el procedimiento: entrevistas, observación y pruebas aplicadas, con fechas y condiciones relevantes.",
        "Presentar los resultados de forma ordenada, con puntajes solo cuando se explican y se entienden.",
        "Integrar los datos en una interpretación coherente que responda la pregunta, sin repetir los resultados.",
        "Formular conclusiones claras y recomendaciones concretas y realizables.",
        "Revisar el lenguaje: frases cortas, sin jerga, sin juicios de valor y con las limitaciones señaladas.",
        "Firmar, fechar, guardar una copia y entregar solo a quien corresponde, con consentimiento.",
      ],
      dialogo: [
        "Terapeuta: La escuela me pide un informe sobre cómo aprende su hijo. ¿Le parece que incluya solo lo que ayude a la maestra, y no todo lo que me contó de la familia?",
        "Paciente: Sí, no quiero que sepan lo de nuestra separación.",
        "Terapeuta: Entonces solo pondré lo escolar: cómo atiende, cómo lee y qué estrategias le sirven. ¿Quiere leerlo antes de entregarlo?",
        "Paciente: Sí, por favor.",
        "Terapeuta: Con gusto. Después de que lo lea, le pido su firma de autorización para enviarlo.",
        "Paciente: Perfecto, gracias por cuidar eso.",
      ],
      errores: [
        "Escribir un informe general sin saber para quién ni para qué es.",
        "Incluir datos sensibles que no se necesitan, lo que viola la confidencialidad.",
        "Copiar puntajes y tablas sin interpretación, o con jerga que el destinatario no entiende.",
        "Usar etiquetas diagnósticas como si explicaran por sí solas la conducta.",
        "Hacer recomendaciones vagas o imposibles de cumplir en el contexto de la persona.",
        "Entregar el informe a terceros sin consentimiento ni revisión previa.",
      ],
      evidencia:
        "Hay poca investigación sobre cómo un informe cambia los resultados del paciente. Los estudios sobre la lectura de informes señalan que los destinatarios valoran los textos claros, breves y con recomendaciones prácticas, y que la jerga y los textos largos reducen su utilidad.",
      fichas: [],
      caso:
        "Una psicóloga de un colegio privado de Quetzaltenango evalúa a Diego, de 10 años, por problemas de atención y lectura. Un abogado de la familia le pide el informe «completo» para un trámite, y la mamá pide una copia para la pediatra. El informe borrador incluye el divorcio de los padres, los puntajes sin explicar y la frase «Diego tiene TDAH». La psicóloga duda a quién debe entregarlo y qué debe quedar fuera.",
      preguntas: [
        "¿Cuántos informes distintos haría para Diego y con qué destinatarios?",
        "¿Qué datos sacaría del borrador y por qué?",
        "¿Cómo reescribiría la frase «Diego tiene TDAH» de forma más prudente y útil?",
        "¿Qué consentimiento necesita antes de entregar cada versión?",
      ],
      clave: "Cada informe se escribe para un destinatario y un fin, en lenguaje claro, con solo los datos necesarios y con consentimiento.",
      referencias: [
        "Groth-Marnat, G. y Wright, A. J. (2016). Handbook of psychological assessment (6.ª ed.). Wiley.",
        "AERA, APA y NCME. (2014). Standards for educational and psychological testing. American Educational Research Association.",
        "Finn, S. E. (2007). In our clients' shoes: Theory and techniques of therapeutic assessment. Erlbaum.",
      ],
    },

    // 8. DEVOLUCIÓN DE RESULTADOS
    {
      id: "devolucion-resultados",
      nombre: "Devolución de resultados al paciente",
      modelo: "Evaluación terapéutica y devolución colaborativa (Finn).",
      enPocasPalabras:
        "Es la conversación en la que se comunican los resultados de la evaluación a la persona evaluada. En la versión colaborativa, se parte de lo que ella ya sabe y se pregunta, se usan palabras sencillas y se cuida que el resultado sea comprensible y útil. Busca que salga con mayor claridad sobre sí misma y con una esperanza realista.",
      indicaciones: [
        "Al terminar toda evaluación individual, antes de entregar o enviar el informe.",
        "Cuando los resultados pueden asustar o confundir a la persona.",
        "Cuando el paciente pidió la evaluación para entenderse mejor.",
        "Cuando hay que acordar el plan de tratamiento a partir de los hallazgos.",
        "Con adolescentes y su familia, en sesiones separadas o conjuntas según el caso.",
      ],
      precauciones: [
        "No dar resultados difíciles por mensaje o por teléfono; hacerlo en persona o en videollamada, con tiempo.",
        "Adaptar la cantidad de información al estado emocional de la persona; no abrumar con todo en una sola sesión.",
        "Con riesgo suicida o crisis, atender primero la seguridad y dejar la devolución completa para después.",
        "Cuando la devolución incluye a otros (pareja, familia, escuela), aclarar qué se comparte y con consentimiento.",
      ],
      pasos: [
        "Preparar la sesión: ordenar los hallazgos en pocas ideas centrales y pensar ejemplos de la vida de la persona.",
        "Empezar preguntando qué espera y qué cree que van a mostrar los resultados.",
        "Presentar cada hallazgo con palabras sencillas, uno a la vez, conectándolo con lo que la persona ya contó.",
        "Pedir su opinión después de cada punto: qué le suena, qué no encaja, qué le sorprende.",
        "Corregir o ajustar la interpretación con lo que ella aporta, en lugar de defenderla.",
        "Resaltar fortalezas y explicar lo que se puede hacer, con esperanza realista.",
        "Acordar recomendaciones y próximos pasos con la persona.",
        "Cerrar con un resumen, resolver dudas y ofrecer entregar el informe por escrito.",
      ],
      dialogo: [
        "Terapeuta: Antes de mostrarle los resultados, ¿qué le gustaría saber de ellos?",
        "Paciente: Si de verdad tengo algo o si solo soy desordenado, como dice mi esposa.",
        "Terapeuta: Veamos juntos. Los resultados muestran que le cuesta mucho mantener la atención cuando hay ruido alrededor. ¿Eso le suena?",
        "Paciente: Sí, en el trabajo me pasa todo el tiempo. Pensé que era pereza.",
        "Terapeuta: No es pereza. Su atención funciona distinto, y también tiene fortalezas: resuelve bien los problemas cuando se concentra. ¿Qué le parece?",
        "Paciente: Me da alivio. ¿Y qué puedo hacer?",
        "Terapeuta: Hay estrategias concretas que podemos probar, como organizar su espacio y sus tareas. ¿Empezamos con una?",
        "Paciente: Sí, quiero empezar con eso.",
      ],
      errores: [
        "Leer los puntajes en voz alta sin conectarlos con la vida de la persona.",
        "Dar toda la información de una vez, sin pausas ni espacio para reaccionar.",
        "Usar términos técnicos o etiquetas que la persona no entiende.",
        "Defender la interpretación cuando la persona no se reconoce en ella.",
        "Mostrar solo problemas y olvidar las fortalezas y la esperanza realista.",
        "Terminar sin acordar qué sigue ni cómo se usarán los resultados.",
      ],
      evidencia:
        "Los estudios sobre la evaluación terapéutica y la devolución colaborativa muestran beneficios en la comprensión de sí mismo y en la relación con el terapeuta, aunque muchos son de tamaño pequeño o moderado. Se necesita más investigación con distintas poblaciones, incluida la latinoamericana.",
      fichas: ["1.1"],
      caso:
        "Karla, de 22 años, estudiante de enfermería en San Marcos, pidió una evaluación porque siente que «no es normal» desde la niñez. Los resultados muestran mucha sensibilidad a los ruidos, dificultad para el contacto social y una gran memoria para los detalles. Llega a la devolución con su mamá, que cree que su hija «solo es rara». Karla teme que los resultados confirmen que algo anda mal en ella. La terapeuta debe elegir cómo presentarlos.",
      preguntas: [
        "¿Con qué pregunta abriría la devolución para Karla?",
        "¿Cómo explicaría la sensibilidad a los ruidos sin patologizarla?",
        "¿Cómo manejaría la presencia de la mamá y qué compartiría con ella?",
        "¿Qué fortalezas destacaría y qué recomendaciones concretas acordaría con Karla?",
      ],
      clave: "La devolución parte de lo que la persona ya sabe, usa palabras sencillas, pide su opinión y deja esperanza realista.",
      referencias: [
        "Finn, S. E. (2007). In our clients' shoes: Theory and techniques of therapeutic assessment. Erlbaum.",
        "Groth-Marnat, G. y Wright, A. J. (2016). Handbook of psychological assessment (6.ª ed.). Wiley.",
        "Morrison, J. (2014). The first interview (4.ª ed.). Guilford Press.",
      ],
    },
  ],
};
