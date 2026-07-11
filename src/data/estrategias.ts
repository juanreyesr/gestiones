/**
 * Banco de acciones de mejora por criterio de observacion (ids 9-29) y por
 * pregunta de entrevista estudiantil (ids 1-10). El modo presentacion arma la
 * estrategia de cada area de oportunidad a partir de los criterios que
 * realmente salieron bajos en los datos.
 */

export const ESTRATEGIAS_CRITERIOS: Record<number, string[]> = {
  9: [
    "Revision de avance programatico a mitad de trimestre con cada docente",
    "Acordar un plan de recuperacion de temas cuando exista atraso",
  ],
  10: [
    "Aplicar un diagnostico inicial del grupo en la primera semana",
    "Adaptar ejemplos y casos al perfil de la carrera y del grupo",
  ],
  11: [
    "Definir un plan anual de actualizacion disciplinar (cursos, certificaciones)",
    "Compartir lecturas y avances recientes de la disciplina en reuniones de claustro",
  ],
  12: [
    "Microcapacitaciones practicas de plataforma y herramientas digitales",
    "Acompanamiento entre pares con docentes que dominan la tecnologia",
  ],
  13: [
    "Taller de estrategias didacticas aplicadas a cada area",
    "Observacion entre pares con retroalimentacion estructurada",
  ],
  14: [
    "Taller breve de comunicacion asertiva y manejo de aula",
    "Acordar con el grupo normas de comunicacion claras desde el inicio",
  ],
  15: [
    "Establecer espacios fijos de consulta y atencion a estudiantes",
    "Encuesta rapida de percepcion a mitad de trimestre y seguimiento de casos",
  ],
  16: [
    "Crear un banco compartido de tecnicas didacticas innovadoras por materia",
    "Meta por docente: incorporar una tecnica nueva en cada unidad",
  ],
  17: [
    "Capacitacion especifica en la metodologia de aula invertida",
    "Pilotear aula invertida en una unidad y evaluar los resultados con el grupo",
  ],
  18: [
    "Revisar en conjunto la carga semanal de tareas entre cursos del mismo ano",
    "Validar el tiempo estimado que requiere cada asignacion antes de publicarla",
  ],
  19: [
    "Vincular cada tema con casos reales del ejercicio profesional",
    "Cerrar cada sesion con una sintesis de lo aprendido y su aplicacion",
  ],
  20: [
    "Usar un formato ligero de plan de sesion y revisarlo en el acompanamiento",
    "Iniciar cada sesion comunicando los objetivos y la agenda",
  ],
  21: [
    "Puntualidad estricta de inicio y cierre de la sesion",
    "Distribuir tiempos por actividad y hacerlos visibles al grupo",
  ],
  22: [
    "Incorporar trabajo colaborativo estructurado en cada sesion",
    "Rotar los equipos y usar tecnicas de discusion en pares y plenaria",
  ],
  23: [
    "Socializar rubricas y reglas de trabajo desde la primera semana",
    "Publicar las reglas en plataforma y recordarlas al iniciar cada unidad",
  ],
  24: [
    "Aplicar evaluaciones formativas breves en cada unidad",
    "Publicar el calendario de evaluacion y llevar registro de avance por estudiante",
  ],
  25: [
    "Diversificar instrumentos: proyectos, exposiciones, casos y quizzes",
    "Definir rubricas por tipo de actividad y revisar la ponderacion del curso",
  ],
  26: [
    "Acordar plazos maximos de retroalimentacion por entrega",
    "Retroalimentar de forma especifica y accionable, no solo con la nota",
  ],
  27: [
    "Checklist de curso completo en plataforma durante la primera semana",
    "Usar una plantilla estandar de organizacion del curso en plataforma",
  ],
  28: [
    "Plantilla de instrucciones: objetivo, pasos, criterios y fecha de entrega",
    "Revisar la redaccion de anuncios y confirmar comprension con el grupo",
  ],
  29: [
    "Registrar la retroalimentacion de cada entrega dentro de la plataforma",
    "Verificar que los comentarios sean visibles para el estudiante",
  ],
};

export const ESTRATEGIAS_ENTREVISTA: Record<number, string[]> = {
  1: [
    "Verificar comprension con preguntas durante la clase",
    "Variar ejemplos y apoyos visuales al explicar cada tema",
  ],
  2: [
    "Mantener actualizacion disciplinar continua",
    "Preparar cada sesion con casos y referencias actuales",
  ],
  3: [
    "Preparar las preguntas frecuentes de cada tema con anticipacion",
    "Cuando algo requiera investigarse, darle seguimiento en la siguiente sesion",
  ],
  4: [
    "Iniciar y cerrar la clase puntualmente",
    "Mantener visible la agenda y los tiempos de la sesion",
  ],
  5: [
    "Acordar normas de convivencia con el grupo",
    "Cuidar un trato uniforme en participacion y evaluacion",
  ],
  6: [
    "Usar tecnicas de participacion activa: preguntas dirigidas, debates, dinamicas",
    "Reconocer y valorar los aportes de los estudiantes",
  ],
  7: [
    "Construir un banco de casos reales por materia",
    "Invitar experiencias del ejercicio profesional a la clase",
  ],
  8: [
    "Publicar rubricas de calificacion antes de cada actividad",
    "Revisar calificaciones con retroalimentacion cuando haya dudas",
  ],
  9: [
    "Definir y comunicar un horario de consulta fuera de clase",
    "Acordar un canal de contacto con tiempo de respuesta claro",
  ],
  10: [
    "Dar comentarios especificos por entrega, no solo la nota",
    "Retroalimentar antes de la siguiente evaluacion para permitir mejorar",
  ],
};
