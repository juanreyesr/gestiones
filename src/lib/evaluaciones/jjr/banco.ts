/**
 * Banco de actividades y campos de «Intereses Vocacionales JJR Actualizada»
 * (Lic. Juan J. Reyes). GENERADO desde los documentos fuente
 * (JJR-84 v0.2.0-experimental y banco ampliado JJR-INV-176 v0.3.0-investigación):
 * no editar textos a mano; un cambio de texto exige nueva versión.
 *
 * Las 84 anclas (grupo «ancla», forma «AB») tienen el mismo texto en ambas
 * versiones. Los candidatos (56) y las áreas exploratorias (36) solo existen
 * en JJR-INV-176 y se reparten entre las formas A y B.
 */

export type CampoPrincipal = "ING" | "CIE" | "SAL" | "AMB" | "TEC" | "DAT" | "EDU" | "SOC" | "NEG" | "OPE" | "COM" | "VIS" | "MUS" | "JUR";
export type CampoExploratorio = "TUR" | "DEP" | "ESC" | "ANI" | "PER" | "AGR";
export type CampoJjr = CampoPrincipal | CampoExploratorio;
export type ItemJjr = {
  id: string;
  campo: CampoJjr;
  actividad: string;
  origen: "v0.2" | "nuevo_0.3";
  /** Etiqueta editorial de cobertura; no es subescala. */
  faceta: string;
  grupo: "ancla" | "candidato" | "exploratorio";
  /** «AB» = en ambas formas (no es una forma adicional). */
  forma: "AB" | "A" | "B";
};

/** Orden fijo de presentación y de informe (14 principales + 6 exploratorias). */
export const CAMPOS_JJR: readonly CampoJjr[] = ["ING","CIE","SAL","AMB","TEC","DAT","EDU","SOC","NEG","OPE","COM","VIS","MUS","JUR","TUR","DEP","ESC","ANI","PER","AGR"];
export const CAMPOS_PRINCIPALES: readonly CampoPrincipal[] = ["ING","CIE","SAL","AMB","TEC","DAT","EDU","SOC","NEG","OPE","COM","VIS","MUS","JUR"];

/** Nombre y aspecto a vigilar en la revisión (tabla del banco ampliado). */
export const NOMBRES_CAMPOS: Record<CampoJjr, { nombre: string; atencion: string }> = {
  "ING": {
    "nombre": "Ingeniería aplicada, construcción y oficios técnicos",
    "atencion": "mantenimiento, construcción, instalaciones y trabajo manual; revisar diversidad de oficios"
  },
  "CIE": {
    "nombre": "Investigación científica",
    "atencion": "investigación física y biológica; separar interés científico de manejo de equipo"
  },
  "SAL": {
    "nombre": "Salud y atención clínica",
    "atencion": "prevención, atención y recuperación; no inferir aptitud clínica"
  },
  "AMB": {
    "nombre": "Ambiente, territorio y producción sostenible",
    "atencion": "recursos y entorno; riesgo de solapamiento con AGR"
  },
  "TEC": {
    "nombre": "Software, sistemas digitales y seguridad",
    "atencion": "software, redes y seguridad; exposición digital"
  },
  "DAT": {
    "nombre": "Datos, modelación e inteligencia artificial",
    "atencion": "análisis numérico e IA; solapamiento con CIE y TEC"
  },
  "EDU": {
    "nombre": "Educación y aprendizaje",
    "atencion": "enseñanza, materiales y evaluación"
  },
  "SOC": {
    "nombre": "Acompañamiento y desarrollo comunitario",
    "atencion": "escucha, apoyos y colaboración social; solapamiento con SAL y EDU"
  },
  "NEG": {
    "nombre": "Negocios, emprendimiento y dirección",
    "atencion": "oferta, emprendimiento y coordinación; solapamiento con OPE"
  },
  "OPE": {
    "nombre": "Operaciones, finanzas y gestión de información",
    "atencion": "registros, logística y finanzas"
  },
  "COM": {
    "nombre": "Lenguaje, comunicación e investigación social",
    "atencion": "escritura, lenguaje y análisis social; distinguir de JUR"
  },
  "VIS": {
    "nombre": "Diseño y creación visual o espacial",
    "atencion": "creación visual, objetos y espacios"
  },
  "MUS": {
    "nombre": "Música y creación sonora",
    "atencion": "interpretación, composición y sonido; acceso a instrumentos"
  },
  "JUR": {
    "nombre": "Derecho, políticas públicas y asuntos colectivos",
    "atencion": "normas, argumentación y asuntos públicos"
  },
  "TUR": {
    "nombre": "Turismo, gastronomía y hospitalidad",
    "atencion": "gastronomía y atención a visitantes pueden ser dimensiones diferentes"
  },
  "DEP": {
    "nombre": "Deporte y actividad física",
    "atencion": "práctica, enseñanza y organización deportiva pueden diferir"
  },
  "ESC": {
    "nombre": "Artes escénicas y expresión corporal",
    "atencion": "actuación, danza y producción escénica no necesariamente se unen"
  },
  "ANI": {
    "nombre": "Cuidado y trabajo con animales",
    "atencion": "cuidado de animales domésticos, productivos y silvestres puede diferir"
  },
  "PER": {
    "nombre": "Servicios personales y cuidado estético",
    "atencion": "estética es solo una parte de los servicios personales; evitar estereotipos"
  },
  "AGR": {
    "nombre": "Producción agropecuaria y actividades rurales",
    "atencion": "cultivo y actividades rurales; no confundir con todo el sector agropecuario ni con conservación"
  }
};

/** Definición, límite interpretativo, relación RIASEC (hipótesis conceptual) y rutas ilustrativas. */
export const INFO_CAMPOS: Record<CampoPrincipal, { definicion: string; limite: string; riasec: string; rutas: string }> = {
  "ING": {
    "definicion": "Trabajar sobre objetos, instalaciones y sistemas físicos para construirlos, mantenerlos o mejorarlos.",
    "limite": "No equivale a habilidad manual, fuerza física o formación en ingeniería.",
    "riasec": "R/I",
    "rutas": "Ingeniería mecánica, eléctrica, civil o industrial; formación técnica en mantenimiento, construcción, refrigeración o mecatrónica."
  },
  "CIE": {
    "definicion": "Formular preguntas sobre fenómenos naturales y contrastarlas mediante observación y experimentación.",
    "limite": "No equivale a curiosidad general ni a rendimiento en ciencias; reúne contenidos físicos y biológicos cuya unión debe probarse.",
    "riasec": "I",
    "rutas": "Física, química, biología, bioquímica, ciencias de materiales; formación técnica de laboratorio."
  },
  "SAL": {
    "definicion": "Participar en actividades de prevención, atención y recuperación de la salud de personas.",
    "limite": "No mide aptitud clínica ni tolerancia real a todos los contextos sanitarios.",
    "riasec": "S/I",
    "rutas": "Medicina, enfermería, nutrición, fisioterapia, terapia ocupacional; formación técnica sanitaria según regulación local."
  },
  "AMB": {
    "definicion": "Trabajar sobre conservación, recursos naturales y formas de producción que reduzcan impactos ambientales.",
    "limite": "No mide virtud moral, activismo ni conocimientos ambientales; evitar interpretar desinterés como falta de ética.",
    "riasec": "I/R",
    "rutas": "Ciencias ambientales, agronomía, gestión forestal, geografía, ingeniería ambiental y energías renovables; formación técnica agroecológica."
  },
  "TEC": {
    "definicion": "Crear, configurar y proteger herramientas o sistemas digitales.",
    "limite": "No equivale a usar redes sociales, poseer equipo, saber programar ni tener alfabetización digital. Software y seguridad pueden requerir separación empírica.",
    "riasec": "I/R",
    "rutas": "Ingeniería de software, informática, sistemas, redes, ciberseguridad; formación técnica en desarrollo, soporte y automatización."
  },
  "DAT": {
    "definicion": "Examinar información cuantitativa y construir o evaluar modelos para responder preguntas.",
    "limite": "No mide inteligencia, dominio matemático ni entusiasmo por la inteligencia artificial. Puede solaparse con CIE y TEC.",
    "riasec": "I/C",
    "rutas": "Estadística, matemáticas aplicadas, ciencia de datos, investigación de operaciones; especialización en aprendizaje automático y evaluación de modelos."
  },
  "EDU": {
    "definicion": "Ayudar a otras personas a aprender mediante explicación, diseño y evaluación de experiencias educativas.",
    "limite": "No mide capacidad docente ni exige preferencia por una edad específica.",
    "riasec": "S/A",
    "rutas": "Educación, pedagogía, docencia por disciplina, diseño instruccional y tecnología educativa."
  },
  "SOC": {
    "definicion": "Escuchar, orientar y colaborar en procesos de apoyo a personas y comunidades.",
    "limite": "No es una prueba de empatía, personalidad o aptitud terapéutica; evitar deseabilidad social.",
    "riasec": "S",
    "rutas": "Trabajo social, psicología, desarrollo comunitario, gerontología y gestión de programas sociales; revisar requisitos profesionales locales."
  },
  "NEG": {
    "definicion": "Identificar oportunidades de intercambio y coordinar recursos o equipos para desarrollar proyectos.",
    "limite": "No mide liderazgo, tolerancia al riesgo o éxito empresarial; no confundir interés con estatus o riqueza.",
    "riasec": "E",
    "rutas": "Administración, emprendimiento, comercio, mercadotecnia, gestión de proyectos y dirección de organizaciones."
  },
  "OPE": {
    "definicion": "Mantener registros y procesos organizados, verificables y útiles para la operación de una organización.",
    "limite": "No equivale a obediencia, orden personal o competencia financiera. Finanzas y logística podrían formar factores distintos.",
    "riasec": "C/E",
    "rutas": "Contaduría, finanzas, administración, logística, gestión documental y gestión de calidad; rutas técnicas administrativas."
  },
  "COM": {
    "definicion": "Interpretar y producir mensajes, textos e información sobre la vida social.",
    "limite": "No mide sociabilidad, extroversión ni popularidad digital. Traducción, periodismo e investigación social pueden separarse.",
    "riasec": "A/I",
    "rutas": "Comunicación, periodismo, letras, lingüística, traducción, historia, sociología y antropología."
  },
  "VIS": {
    "definicion": "Desarrollar imágenes, objetos, espacios o interfaces considerando forma y experiencia de uso.",
    "limite": "No mide talento artístico ni dominio de programas; no representa por sí solo todas las artes escénicas.",
    "riasec": "A/R",
    "rutas": "Diseño gráfico, industrial, de interacción, de interiores; arquitectura, artes visuales, animación y producción audiovisual."
  },
  "MUS": {
    "definicion": "Crear, interpretar y trabajar con sonidos y composiciones musicales.",
    "limite": "No mide oído, destreza instrumental ni acceso previo a formación musical; evitar confundir consumo con práctica.",
    "riasec": "A",
    "rutas": "Interpretación musical, composición, producción sonora, ingeniería de audio y educación musical."
  },
  "JUR": {
    "definicion": "Analizar reglas y decisiones públicas y argumentar sobre problemas colectivos.",
    "limite": "No mide ética personal ni ideología política. Derecho y políticas públicas pueden requerir factores separados.",
    "riasec": "E/I/S",
    "rutas": "Derecho, ciencia política, administración pública, relaciones internacionales y análisis de políticas públicas."
  }
};

export const BANCO_JJR: readonly ItemJjr[] = [
  {
    "id": "ING01",
    "campo": "ING",
    "actividad": "Construir una maqueta para probar cómo funcionaría un mecanismo.",
    "origen": "v0.2",
    "faceta": "diseño físico",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "CIE01",
    "campo": "CIE",
    "actividad": "Diseñar un experimento para averiguar por qué ocurre un fenómeno natural.",
    "origen": "v0.2",
    "faceta": "método",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SAL01",
    "campo": "SAL",
    "actividad": "Explicar a una persona medidas para prevenir un problema de salud.",
    "origen": "v0.2",
    "faceta": "prevención",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "AMB01",
    "campo": "AMB",
    "actividad": "Observar cambios en un río, bosque u otro entorno natural para proponer formas de cuidarlo.",
    "origen": "v0.2",
    "faceta": "conservación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "TEC01",
    "campo": "TEC",
    "actividad": "Escribir instrucciones para que un programa de computadora realice una tarea.",
    "origen": "v0.2",
    "faceta": "software",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "DAT01",
    "campo": "DAT",
    "actividad": "Revisar una tabla de datos para encontrar tendencias o patrones.",
    "origen": "v0.2",
    "faceta": "análisis",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "EDU01",
    "campo": "EDU",
    "actividad": "Explicar una idea de distintas maneras hasta que otra persona la comprenda.",
    "origen": "v0.2",
    "faceta": "enseñanza",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SOC01",
    "campo": "SOC",
    "actividad": "Escuchar a una persona para ayudarla a aclarar una dificultad que enfrenta.",
    "origen": "v0.2",
    "faceta": "acompañamiento",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "NEG01",
    "campo": "NEG",
    "actividad": "Investigar qué necesita un grupo de clientes antes de ofrecer un servicio.",
    "origen": "v0.2",
    "faceta": "oportunidades",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "OPE01",
    "campo": "OPE",
    "actividad": "Revisar registros de ingresos y gastos para encontrar errores.",
    "origen": "v0.2",
    "faceta": "finanzas",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "COM01",
    "campo": "COM",
    "actividad": "Investigar varias fuentes para escribir una explicación sobre un asunto público.",
    "origen": "v0.2",
    "faceta": "investigación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "VIS01",
    "campo": "VIS",
    "actividad": "Crear una imagen para comunicar una idea sin usar mucho texto.",
    "origen": "v0.2",
    "faceta": "visual",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "MUS01",
    "campo": "MUS",
    "actividad": "Interpretar una pieza musical con un instrumento o con la voz.",
    "origen": "v0.2",
    "faceta": "interpretación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "JUR01",
    "campo": "JUR",
    "actividad": "Examinar una ley o regla para comprender cómo se aplica a un caso.",
    "origen": "v0.2",
    "faceta": "derecho",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "ING02",
    "campo": "ING",
    "actividad": "Revisar un aparato para encontrar la causa de una falla.",
    "origen": "v0.2",
    "faceta": "mantenimiento",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "CIE02",
    "campo": "CIE",
    "actividad": "Comparar explicaciones científicas usando las evidencias disponibles.",
    "origen": "v0.2",
    "faceta": "método",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SAL02",
    "campo": "SAL",
    "actividad": "Diseñar una actividad comunitaria para promover hábitos de salud.",
    "origen": "v0.2",
    "faceta": "prevención",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "AMB02",
    "campo": "AMB",
    "actividad": "Planear la recuperación de un espacio natural deteriorado.",
    "origen": "v0.2",
    "faceta": "conservación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "TEC02",
    "campo": "TEC",
    "actividad": "Encontrar y corregir un error en el funcionamiento de un programa.",
    "origen": "v0.2",
    "faceta": "software",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "DAT02",
    "campo": "DAT",
    "actividad": "Preparar una gráfica que ayude a responder una pregunta con datos.",
    "origen": "v0.2",
    "faceta": "análisis",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "EDU02",
    "campo": "EDU",
    "actividad": "Guiar una práctica para que alguien aprenda una habilidad nueva.",
    "origen": "v0.2",
    "faceta": "enseñanza",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SOC02",
    "campo": "SOC",
    "actividad": "Acompañar a alguien en la búsqueda de apoyos disponibles en su comunidad.",
    "origen": "v0.2",
    "faceta": "acompañamiento",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "NEG02",
    "campo": "NEG",
    "actividad": "Proponer una forma de vender un producto que responda a una necesidad concreta.",
    "origen": "v0.2",
    "faceta": "oportunidades",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "OPE02",
    "campo": "OPE",
    "actividad": "Preparar un presupuesto para dar seguimiento a los recursos de una organización.",
    "origen": "v0.2",
    "faceta": "finanzas",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "COM02",
    "campo": "COM",
    "actividad": "Entrevistar a personas para comprender una experiencia social.",
    "origen": "v0.2",
    "faceta": "investigación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "VIS02",
    "campo": "VIS",
    "actividad": "Organizar imágenes en una secuencia para contar una historia.",
    "origen": "v0.2",
    "faceta": "visual",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "MUS02",
    "campo": "MUS",
    "actividad": "Practicar una parte musical para integrarla en una interpretación de grupo.",
    "origen": "v0.2",
    "faceta": "interpretación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "JUR02",
    "campo": "JUR",
    "actividad": "Construir un argumento usando las reglas y los hechos de una situación.",
    "origen": "v0.2",
    "faceta": "derecho",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "ING03",
    "campo": "ING",
    "actividad": "Planear cómo instalar de forma segura un sistema eléctrico sencillo.",
    "origen": "v0.2",
    "faceta": "instalaciones",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "CIE03",
    "campo": "CIE",
    "actividad": "Observar muestras de seres vivos para identificar diferencias.",
    "origen": "v0.2",
    "faceta": "vida",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SAL03",
    "campo": "SAL",
    "actividad": "Revisar información sobre la salud de una persona para comprender su situación.",
    "origen": "v0.2",
    "faceta": "atención",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "AMB03",
    "campo": "AMB",
    "actividad": "Comparar formas de cultivo para reducir el desperdicio de agua.",
    "origen": "v0.2",
    "faceta": "producción",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "TEC03",
    "campo": "TEC",
    "actividad": "Configurar herramientas digitales para que compartan información entre sí.",
    "origen": "v0.2",
    "faceta": "integración",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "DAT03",
    "campo": "DAT",
    "actividad": "Usar números para comparar lo que podría ocurrir en diferentes situaciones.",
    "origen": "v0.2",
    "faceta": "modelación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "EDU03",
    "campo": "EDU",
    "actividad": "Crear una actividad para enseñar un tema difícil.",
    "origen": "v0.2",
    "faceta": "diseño",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SOC03",
    "campo": "SOC",
    "actividad": "Reunir las opiniones de un grupo para identificar una necesidad compartida.",
    "origen": "v0.2",
    "faceta": "comunidad",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "NEG03",
    "campo": "NEG",
    "actividad": "Negociar las condiciones de un acuerdo comercial.",
    "origen": "v0.2",
    "faceta": "negociación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "OPE03",
    "campo": "OPE",
    "actividad": "Planear el recorrido de entregas para reducir retrasos.",
    "origen": "v0.2",
    "faceta": "operaciones",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "COM03",
    "campo": "COM",
    "actividad": "Escribir un relato para expresar una idea o una experiencia.",
    "origen": "v0.2",
    "faceta": "escritura",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "VIS03",
    "campo": "VIS",
    "actividad": "Diseñar la forma de un objeto pensando en cómo se usará.",
    "origen": "v0.2",
    "faceta": "espacial",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "MUS03",
    "campo": "MUS",
    "actividad": "Crear una melodía para expresar una idea o emoción.",
    "origen": "v0.2",
    "faceta": "composición",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "JUR03",
    "campo": "JUR",
    "actividad": "Comparar propuestas públicas para resolver un problema de una comunidad.",
    "origen": "v0.2",
    "faceta": "políticas",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "ING04",
    "campo": "ING",
    "actividad": "Buscar la causa de una falla en una máquina.",
    "origen": "v0.2",
    "faceta": "mantenimiento",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "CIE04",
    "campo": "CIE",
    "actividad": "Investigar cómo influyen las condiciones del entorno en el crecimiento de una planta.",
    "origen": "v0.2",
    "faceta": "vida",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SAL04",
    "campo": "SAL",
    "actividad": "Acompañar a una persona durante un procedimiento de atención sanitaria.",
    "origen": "v0.2",
    "faceta": "atención",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "AMB04",
    "campo": "AMB",
    "actividad": "Buscar maneras de disminuir la pérdida de alimentos durante su producción.",
    "origen": "v0.2",
    "faceta": "producción",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "TEC04",
    "campo": "TEC",
    "actividad": "Programar una herramienta digital para que realice una tarea repetitiva.",
    "origen": "v0.2",
    "faceta": "integración",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "DAT04",
    "campo": "DAT",
    "actividad": "Revisar si un cálculo permite anticipar resultados al usar datos nuevos.",
    "origen": "v0.2",
    "faceta": "modelación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "EDU04",
    "campo": "EDU",
    "actividad": "Crear un material para enseñar un tema sin usar internet.",
    "origen": "v0.2",
    "faceta": "diseño",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SOC04",
    "campo": "SOC",
    "actividad": "Organizar con una comunidad acciones para mejorar un problema local.",
    "origen": "v0.2",
    "faceta": "comunidad",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "NEG04",
    "campo": "NEG",
    "actividad": "Presentar una propuesta para conseguir apoyo para un proyecto.",
    "origen": "v0.2",
    "faceta": "negociación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "OPE04",
    "campo": "OPE",
    "actividad": "Revisar un proceso de trabajo para detectar dónde se acumulan tareas.",
    "origen": "v0.2",
    "faceta": "operaciones",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "COM04",
    "campo": "COM",
    "actividad": "Revisar un texto para que comunique con claridad lo que quiere decir.",
    "origen": "v0.2",
    "faceta": "escritura",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "VIS04",
    "campo": "VIS",
    "actividad": "Proponer la distribución de un espacio para una actividad concreta.",
    "origen": "v0.2",
    "faceta": "espacial",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "MUS04",
    "campo": "MUS",
    "actividad": "Proponer cambios en una composición para darle un carácter diferente.",
    "origen": "v0.2",
    "faceta": "composición",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "JUR04",
    "campo": "JUR",
    "actividad": "Revisar si un programa del gobierno logró lo que se proponía.",
    "origen": "v0.2",
    "faceta": "políticas",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "ING05",
    "campo": "ING",
    "actividad": "Proponer una mejora en el diseño de una estructura.",
    "origen": "v0.2",
    "faceta": "diseño físico",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "CIE05",
    "campo": "CIE",
    "actividad": "Medir cómo cambia un material al variar su temperatura.",
    "origen": "v0.2",
    "faceta": "materia",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SAL05",
    "campo": "SAL",
    "actividad": "Guiar ejercicios de recuperación física siguiendo un plan profesional.",
    "origen": "v0.2",
    "faceta": "rehabilitación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "AMB05",
    "campo": "AMB",
    "actividad": "Evaluar opciones para aprovechar energía solar en una comunidad.",
    "origen": "v0.2",
    "faceta": "recursos",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "TEC05",
    "campo": "TEC",
    "actividad": "Buscar posibles formas de acceso no autorizado a un sistema para prevenirlas.",
    "origen": "v0.2",
    "faceta": "seguridad",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "DAT05",
    "campo": "DAT",
    "actividad": "Investigar en qué situaciones se equivoca una herramienta de inteligencia artificial.",
    "origen": "v0.2",
    "faceta": "evaluación IA",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "EDU05",
    "campo": "EDU",
    "actividad": "Revisar trabajos de estudiantes para identificar qué necesitan aprender después.",
    "origen": "v0.2",
    "faceta": "evaluación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SOC05",
    "campo": "SOC",
    "actividad": "Ayudar a dos personas a dialogar sobre un desacuerdo.",
    "origen": "v0.2",
    "faceta": "mediación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "NEG05",
    "campo": "NEG",
    "actividad": "Coordinar las tareas de un equipo para alcanzar una meta.",
    "origen": "v0.2",
    "faceta": "dirección",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "OPE05",
    "campo": "OPE",
    "actividad": "Organizar documentos para que puedan encontrarse y verificarse con facilidad.",
    "origen": "v0.2",
    "faceta": "información",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "COM05",
    "campo": "COM",
    "actividad": "Adaptar un mensaje para que lo comprenda un público con otra forma de hablar.",
    "origen": "v0.2",
    "faceta": "lenguaje",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "VIS05",
    "campo": "VIS",
    "actividad": "Dibujar distintas formas de organizar las pantallas de una aplicación.",
    "origen": "v0.2",
    "faceta": "interacción",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "MUS05",
    "campo": "MUS",
    "actividad": "Combinar sonidos para ambientar una historia.",
    "origen": "v0.2",
    "faceta": "producción",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "JUR05",
    "campo": "JUR",
    "actividad": "Investigar cómo una decisión institucional afecta a distintos grupos.",
    "origen": "v0.2",
    "faceta": "asuntos colectivos",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "ING06",
    "campo": "ING",
    "actividad": "Organizar los pasos para montar una instalación de agua.",
    "origen": "v0.2",
    "faceta": "instalaciones",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "CIE06",
    "campo": "CIE",
    "actividad": "Investigar qué propiedades hacen útil a un material para una aplicación.",
    "origen": "v0.2",
    "faceta": "materia",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SAL06",
    "campo": "SAL",
    "actividad": "Adaptar una actividad cotidiana para apoyar a alguien durante su recuperación.",
    "origen": "v0.2",
    "faceta": "rehabilitación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "AMB06",
    "campo": "AMB",
    "actividad": "Investigar cómo reducir los residuos generados por una actividad productiva.",
    "origen": "v0.2",
    "faceta": "recursos",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "TEC06",
    "campo": "TEC",
    "actividad": "Diseñar medidas para proteger la información de una organización.",
    "origen": "v0.2",
    "faceta": "seguridad",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "DAT06",
    "campo": "DAT",
    "actividad": "Comparar resultados de una herramienta de inteligencia artificial para detectar errores que afecten a determinados grupos de personas.",
    "origen": "v0.2",
    "faceta": "evaluación IA",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "EDU06",
    "campo": "EDU",
    "actividad": "Comprobar si una actividad de enseñanza ayudó a aprender lo esperado.",
    "origen": "v0.2",
    "faceta": "evaluación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "SOC06",
    "campo": "SOC",
    "actividad": "Facilitar una reunión para que un grupo encuentre acuerdos.",
    "origen": "v0.2",
    "faceta": "mediación",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "NEG06",
    "campo": "NEG",
    "actividad": "Decidir cómo distribuir los recursos limitados de un proyecto.",
    "origen": "v0.2",
    "faceta": "dirección",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "OPE06",
    "campo": "OPE",
    "actividad": "Comprobar si una lista de registros está completa y sin datos repetidos.",
    "origen": "v0.2",
    "faceta": "información",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "COM06",
    "campo": "COM",
    "actividad": "Analizar cómo cambia el significado de un mensaje según las palabras utilizadas.",
    "origen": "v0.2",
    "faceta": "lenguaje",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "VIS06",
    "campo": "VIS",
    "actividad": "Observar cómo una persona usa un diseño para proponer mejoras.",
    "origen": "v0.2",
    "faceta": "interacción",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "MUS06",
    "campo": "MUS",
    "actividad": "Ajustar una grabación para que sus sonidos se escuchen con claridad.",
    "origen": "v0.2",
    "faceta": "producción",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "JUR06",
    "campo": "JUR",
    "actividad": "Preparar una propuesta para que una institución atienda una necesidad colectiva.",
    "origen": "v0.2",
    "faceta": "asuntos colectivos",
    "grupo": "ancla",
    "forma": "AB"
  },
  {
    "id": "ING07",
    "campo": "ING",
    "actividad": "Revisar una tubería para encontrar dónde ocurre una fuga.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "ING08",
    "campo": "ING",
    "actividad": "Ensamblar las piezas de un mueble siguiendo un plano.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "ING09",
    "campo": "ING",
    "actividad": "Comprobar si una instalación eléctrica funciona correctamente.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "ING10",
    "campo": "ING",
    "actividad": "Preparar una mezcla de materiales para una obra de construcción.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "CIE07",
    "campo": "CIE",
    "actividad": "Observar un fenómeno natural durante varios días para registrar sus cambios.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "CIE08",
    "campo": "CIE",
    "actividad": "Comparar muestras de agua para investigar sus características.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "CIE09",
    "campo": "CIE",
    "actividad": "Plantear una pregunta que pueda investigarse mediante un experimento.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "CIE10",
    "campo": "CIE",
    "actividad": "Examinar con una lupa o microscopio las partes de una muestra.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "SAL07",
    "campo": "SAL",
    "actividad": "Explicar a una persona cómo prepararse para un procedimiento de salud.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "SAL08",
    "campo": "SAL",
    "actividad": "Tomar medidas como el pulso o la temperatura para registrar el estado de una persona.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "SAL09",
    "campo": "SAL",
    "actividad": "Preparar materiales para atender a una persona en un servicio de salud.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "SAL10",
    "campo": "SAL",
    "actividad": "Orientar a una persona sobre cómo seguir un plan de alimentación indicado por un profesional.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "AMB07",
    "campo": "AMB",
    "actividad": "Observar las condiciones de un río para identificar cambios en su entorno.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "AMB08",
    "campo": "AMB",
    "actividad": "Revisar el uso del agua en una finca para encontrar maneras de reducir su desperdicio.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "AMB09",
    "campo": "AMB",
    "actividad": "Participar en el cuidado de un vivero de árboles para recuperar un terreno.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "AMB10",
    "campo": "AMB",
    "actividad": "Examinar qué materiales de una actividad podrían volver a utilizarse.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "TEC07",
    "campo": "TEC",
    "actividad": "Configurar una computadora para utilizarla en un lugar de trabajo.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "TEC08",
    "campo": "TEC",
    "actividad": "Crear una página web sencilla para presentar información.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "TEC09",
    "campo": "TEC",
    "actividad": "Revisar por qué un dispositivo no logra conectarse a una red.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "TEC10",
    "campo": "TEC",
    "actividad": "Definir quién puede acceder a la información guardada en un sistema digital.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "DAT07",
    "campo": "DAT",
    "actividad": "Comparar datos de varios meses para identificar cambios en las ventas de un negocio.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "DAT08",
    "campo": "DAT",
    "actividad": "Calcular promedios para resumir los resultados de una encuesta.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "DAT09",
    "campo": "DAT",
    "actividad": "Buscar valores atípicos en una lista de mediciones.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "DAT10",
    "campo": "DAT",
    "actividad": "Organizar datos de una encuesta para estudiar una pregunta.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "EDU07",
    "campo": "EDU",
    "actividad": "Preparar una demostración práctica para enseñar una actividad a un grupo.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "EDU08",
    "campo": "EDU",
    "actividad": "Inventar un ejemplo cotidiano para explicar una idea.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "EDU09",
    "campo": "EDU",
    "actividad": "Acompañar a una persona mientras practica lo que está aprendiendo.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "EDU10",
    "campo": "EDU",
    "actividad": "Preparar preguntas para conocer qué entendió un grupo sobre un tema.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "SOC07",
    "campo": "SOC",
    "actividad": "Escuchar las experiencias de personas que buscan apoyo en su comunidad.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "SOC08",
    "campo": "SOC",
    "actividad": "Identificar servicios disponibles para orientar a una familia que necesita apoyo.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "SOC09",
    "campo": "SOC",
    "actividad": "Conversar con un grupo sobre las dificultades que enfrenta en su comunidad.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "SOC10",
    "campo": "SOC",
    "actividad": "Acompañar a un grupo mientras organiza una actividad para resolver una necesidad común.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "NEG07",
    "campo": "NEG",
    "actividad": "Comparar precios antes de decidir cómo ofrecer un producto.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "NEG08",
    "campo": "NEG",
    "actividad": "Conversar con posibles clientes para conocer qué servicio necesitan.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "NEG09",
    "campo": "NEG",
    "actividad": "Planear cómo dar a conocer un pequeño negocio.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "NEG10",
    "campo": "NEG",
    "actividad": "Buscar proveedores para un producto que se desea vender.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "OPE07",
    "campo": "OPE",
    "actividad": "Registrar las entradas y salidas de productos de una bodega.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "OPE08",
    "campo": "OPE",
    "actividad": "Comprobar que los datos de una factura coincidan con los de un pedido.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "OPE09",
    "campo": "OPE",
    "actividad": "Ordenar los turnos de entrega de varios pedidos.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "OPE10",
    "campo": "OPE",
    "actividad": "Clasificar comprobantes de pago para llevar un registro.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "COM07",
    "campo": "COM",
    "actividad": "Escribir una noticia sobre una actividad de la comunidad.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "COM08",
    "campo": "COM",
    "actividad": "Preparar preguntas para entrevistar a una persona sobre su experiencia.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "COM09",
    "campo": "COM",
    "actividad": "Traducir el sentido de un mensaje a otro idioma que se pueda aprender.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "COM10",
    "campo": "COM",
    "actividad": "Revisar distintas fuentes para explicar un acontecimiento histórico.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "VIS07",
    "campo": "VIS",
    "actividad": "Diseñar un cartel para una actividad cultural de la comunidad.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "VIS08",
    "campo": "VIS",
    "actividad": "Crear una ilustración para acompañar un cuento.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "VIS09",
    "campo": "VIS",
    "actividad": "Dibujar una propuesta para organizar los muebles de una habitación.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "VIS10",
    "campo": "VIS",
    "actividad": "Elegir colores y formas para identificar visualmente un proyecto.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "MUS07",
    "campo": "MUS",
    "actividad": "Ensayar una canción para interpretarla ante otras personas.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "MUS08",
    "campo": "MUS",
    "actividad": "Explorar cómo combinar varios instrumentos en una pieza musical.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "MUS09",
    "campo": "MUS",
    "actividad": "Escribir una letra para una canción.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "MUS10",
    "campo": "MUS",
    "actividad": "Editar una grabación musical para quitar sonidos no deseados.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "JUR07",
    "campo": "JUR",
    "actividad": "Revisar documentos de un caso para identificar qué reglas podrían aplicarse.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "JUR08",
    "campo": "JUR",
    "actividad": "Examinar un contrato para comprender las obligaciones de las partes.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "JUR09",
    "campo": "JUR",
    "actividad": "Preparar razones para defender una posición en una discusión sobre una norma.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "A"
  },
  {
    "id": "JUR10",
    "campo": "JUR",
    "actividad": "Consultar leyes relacionadas con un problema que afecta a una comunidad.",
    "origen": "nuevo_0.3",
    "faceta": "candidato",
    "grupo": "candidato",
    "forma": "B"
  },
  {
    "id": "TUR01",
    "campo": "TUR",
    "actividad": "Preparar una ruta para que visitantes conozcan lugares de una región.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "TUR02",
    "campo": "TUR",
    "actividad": "Explicar a visitantes la historia de un lugar.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "TUR03",
    "campo": "TUR",
    "actividad": "Preparar alimentos siguiendo una receta para servir a otras personas.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "TUR04",
    "campo": "TUR",
    "actividad": "Planear el menú para una actividad con varios comensales.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "TUR05",
    "campo": "TUR",
    "actividad": "Organizar las reservas de alojamiento para un grupo de visitantes.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "TUR06",
    "campo": "TUR",
    "actividad": "Atender las solicitudes de huéspedes durante su estadía.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "DEP01",
    "campo": "DEP",
    "actividad": "Guiar una práctica de un deporte con un grupo.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "DEP02",
    "campo": "DEP",
    "actividad": "Enseñar los movimientos básicos de una actividad física.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "DEP03",
    "campo": "DEP",
    "actividad": "Planear los ejercicios de una sesión de entrenamiento.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "DEP04",
    "campo": "DEP",
    "actividad": "Organizar un encuentro deportivo entre equipos.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "DEP05",
    "campo": "DEP",
    "actividad": "Observar una práctica deportiva para proponer cambios en la técnica.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "DEP06",
    "campo": "DEP",
    "actividad": "Preparar el espacio y los materiales para una actividad física.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "ESC01",
    "campo": "ESC",
    "actividad": "Interpretar un personaje en una obra de teatro.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "ESC02",
    "campo": "ESC",
    "actividad": "Practicar una secuencia de movimientos para una presentación de danza.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "ESC03",
    "campo": "ESC",
    "actividad": "Ensayar un diálogo para presentarlo ante un público.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "ESC04",
    "campo": "ESC",
    "actividad": "Crear movimientos para expresar una idea en una presentación.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "ESC05",
    "campo": "ESC",
    "actividad": "Dirigir los ensayos de una escena teatral.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "ESC06",
    "campo": "ESC",
    "actividad": "Organizar los objetos que se usarán en el escenario de una obra.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "ANI01",
    "campo": "ANI",
    "actividad": "Preparar el alimento para los animales de un centro de cuidado.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "ANI02",
    "campo": "ANI",
    "actividad": "Observar el comportamiento de un animal para identificar cambios.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "ANI03",
    "campo": "ANI",
    "actividad": "Limpiar y preparar el espacio donde se cuidan animales.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "ANI04",
    "campo": "ANI",
    "actividad": "Acompañar a un profesional durante la atención de un animal.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "ANI05",
    "campo": "ANI",
    "actividad": "Revisar las condiciones de crianza de animales en una finca.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "ANI06",
    "campo": "ANI",
    "actividad": "Ayudar en actividades para proteger animales silvestres.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "PER01",
    "campo": "PER",
    "actividad": "Cortar el cabello siguiendo el estilo solicitado por una persona.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "PER02",
    "campo": "PER",
    "actividad": "Preparar las herramientas para un servicio de cuidado personal.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "PER03",
    "campo": "PER",
    "actividad": "Aplicar maquillaje para una presentación o evento.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "PER04",
    "campo": "PER",
    "actividad": "Conversar con una persona sobre el estilo de peinado que desea.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "PER05",
    "campo": "PER",
    "actividad": "Realizar el cuidado de las uñas de una persona.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "PER06",
    "campo": "PER",
    "actividad": "Probar combinaciones de colores para un servicio de maquillaje.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "AGR01",
    "campo": "AGR",
    "actividad": "Preparar un terreno para sembrar un cultivo.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "AGR02",
    "campo": "AGR",
    "actividad": "Revisar el crecimiento de plantas para decidir cuándo regarlas.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "AGR03",
    "campo": "AGR",
    "actividad": "Cosechar productos agrícolas cuando están listos.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "AGR04",
    "campo": "AGR",
    "actividad": "Seleccionar semillas para una siembra.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  },
  {
    "id": "AGR05",
    "campo": "AGR",
    "actividad": "Organizar los productos cosechados para su venta.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "A"
  },
  {
    "id": "AGR06",
    "campo": "AGR",
    "actividad": "Revisar herramientas de cultivo antes de usarlas.",
    "origen": "nuevo_0.3",
    "faceta": "exploratoria",
    "grupo": "exploratorio",
    "forma": "B"
  }
];
