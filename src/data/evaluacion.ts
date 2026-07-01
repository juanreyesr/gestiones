export type Trimestre = 1 | 2 | 3;

export type CursoRow = {
  id: string;
  nombre: string;
  horario: string | null;
  grupo: string | null;
  edificio: string | null;
  anio: number;
  trimestre: Trimestre;
};

export type DocenteRow = {
  id: string;
  nombre: string;
  correo: string | null;
  femenino: boolean;
  cursos: CursoRow[];
};

export type Criterio = {
  id: number;
  texto: string;
};

export type CategoriaCriterio = {
  id: string;
  categoria: string;
  items: Criterio[];
};

export type EntrevistaPregunta = {
  id: number;
  texto: string;
};

export const AREAS = [
  { id: "iglesia", nombre: "Iglesia", descripcion: "Agenda, acompanamiento, actividades y responsabilidades ministeriales." },
  { id: "clinica", nombre: "Clinica", descripcion: "Pacientes, sesiones, seguimientos, ingresos y organizacion operativa." },
  { id: "coordinacion", nombre: "Coordinacion", descripcion: "Evaluacion docente, rendimiento academico y mejora continua." },
  { id: "cursos", nombre: "Cursos", descripcion: "Planificacion, materiales, avances, tareas y desempeno por curso." },
  { id: "caeduc", nombre: "CAEDUC", descripcion: "Procesos, reportes, acompanamiento y acciones institucionales." },
] as const;

export const TRIMESTRES: Trimestre[] = [1, 2, 3];

export const CRITERIOS: CategoriaCriterio[] = [
  { id: "planeacion", categoria: "Planeacion", items: [
    { id: 9, texto: "Cumple con el desarrollo del programa propuesto" },
    { id: 10, texto: "Contextualiza el programa del curso al grupo de estudiantes" },
  ]},
  { id: "docente", categoria: "Docente", items: [
    { id: 11, texto: "Tiene conocimiento profundo y actualizado de la materia" },
    { id: 12, texto: "Evidencia manejo de tecnologia" },
    { id: 13, texto: "Evidencia conocimiento didactico al desarrollar el curso" },
    { id: 14, texto: "Mantiene una comunicacion asertiva con sus estudiantes" },
    { id: 15, texto: "Muestra interes por las inquietudes de sus estudiantes" },
  ]},
  { id: "metodologia", categoria: "Metodologia", items: [
    { id: 16, texto: "Utiliza diversidad de estrategias y tecnicas didacticas innovadoras" },
    { id: 17, texto: "Utiliza el aula invertida como metodologia de trabajo" },
    { id: 18, texto: "Equilibra la asignacion de actividades y tareas para alcanzar los aprendizajes" },
    { id: 19, texto: "Guia a los estudiantes para alcanzar aprendizajes significativos" },
  ]},
  { id: "sesiones", categoria: "Sesiones de Aprendizaje", items: [
    { id: 20, texto: "Evidencia planificacion de las actividades de cada sesion" },
    { id: 21, texto: "El horario de la sesion se aprovecha adecuadamente" },
    { id: 22, texto: "Estimula la interaccion entre companeros en las actividades" },
    { id: 23, texto: "Establece claramente la forma de trabajar en clase" },
  ]},
  { id: "evaluacion", categoria: "Evaluacion", items: [
    { id: 24, texto: "Evalua continua y oportunamente el proceso de aprendizaje" },
    { id: 25, texto: "Evalua a traves de distintos tipos de actividades" },
    { id: 26, texto: "Retroalimenta el avance del aprendizaje" },
  ]},
  { id: "plataforma", categoria: "Uso de Plataforma", items: [
    { id: 27, texto: "El programa y materiales del curso se encuentran en plataforma" },
    { id: 28, texto: "Las tareas y anuncios en plataforma son de facil comprension" },
    { id: 29, texto: "Se evidencia la retroalimentacion de los aprendizajes" },
  ]},
];

export const SCORE_LABELS = ["", "Insuficiente", "Regular", "Aceptable", "Bueno", "Excelente"];

export const ENTREVISTA_ESCALA = [
  { value: 4, label: "Siempre" },
  { value: 3, label: "Casi siempre" },
  { value: 2, label: "A veces" },
  { value: 1, label: "Rara vez" },
  { value: 0, label: "Nunca" },
] as const;

export const ENTREVISTA_PREGUNTAS: EntrevistaPregunta[] = [
  { id: 1, texto: "Explica los temas con claridad y de forma comprensible" },
  { id: 2, texto: "Domina los contenidos de la materia" },
  { id: 3, texto: "Responde con seguridad a las preguntas de los estudiantes" },
  { id: 4, texto: "Es puntual y aprovecha bien el tiempo de clase" },
  { id: 5, texto: "Trata a los estudiantes con respeto y equidad" },
  { id: 6, texto: "Motiva la participacion activa en clase" },
  { id: 7, texto: "Utiliza ejemplos practicos o casos reales" },
  { id: 8, texto: "Es justo/a al calificar y evaluar" },
  { id: 9, texto: "Esta disponible para consultas fuera de clase" },
  { id: 10, texto: "Brinda retroalimentacion util sobre tareas y examenes" },
];

export const FORTALEZAS_OPCIONES: string[] = [
  "Dominio del contenido",
  "Claridad al explicar",
  "Puntualidad y manejo del tiempo",
  "Trato respetuoso con los estudiantes",
  "Metodologia innovadora",
  "Retroalimentacion oportuna",
  "Manejo de grupo y disciplina",
  "Motivacion y entusiasmo",
  "Evaluacion justa y objetiva",
  "Disponibilidad para consultas",
  "Uso de tecnologia educativa",
  "Fomento del pensamiento critico",
  "Actualizacion profesional",
  "Vinculacion teoria-practica",
];
