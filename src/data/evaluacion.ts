export type Curso = {
  nombre: string;
  horario: string;
  grupo: string;
  edificio: string;
  anio: number;
  trimestre: 1 | 2 | 3 | 4;
};

export type Docente = {
  nombre: string;
  femenino: boolean;
  correo: string;
  cursos: Curso[];
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

export const AREAS = [
  { id: "iglesia", nombre: "Iglesia", descripcion: "Agenda, acompanamiento, actividades y responsabilidades ministeriales." },
  { id: "clinica", nombre: "Clinica", descripcion: "Pacientes, sesiones, seguimientos, ingresos y organizacion operativa." },
  { id: "coordinacion", nombre: "Coordinacion", descripcion: "Evaluacion docente, rendimiento academico y mejora continua." },
  { id: "cursos", nombre: "Cursos", descripcion: "Planificacion, materiales, avances, tareas y desempeno por curso." },
  { id: "caeduc", nombre: "CAEDUC", descripcion: "Procesos, reportes, acompanamiento y acciones institucionales." },
] as const;

export const DOCENTES_DATA: Docente[] = [
  { nombre: "Sara Castellanos", femenino: true, correo: "", cursos: [
    { nombre: "Inteligencia Emocional", horario: "Sabado 07:00 a 09:00 horas", grupo: "Primer Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "302", anio: 2026, trimestre: 1 },
    { nombre: "Psicologia de la Personalidad", horario: "Sabado 09:30 a 11:30 horas", grupo: "Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "303", anio: 2026, trimestre: 1 },
    { nombre: "Practica en Medicion Psicologica", horario: "Sabado 11:45 a 13:45 horas", grupo: "Tercer Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "304", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Elly Giron de Leon", femenino: true, correo: "", cursos: [
    { nombre: "Psicologia General", horario: "Sabado 09:30 a 11:30 horas", grupo: "Primer Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "302", anio: 2026, trimestre: 1 },
    { nombre: "Consejeria Familiar y de Pareja", horario: "Sabado 07:00 a 09:00 horas", grupo: "Cuarto Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "305", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Consuelo Alejandra Garcia", femenino: true, correo: "", cursos: [
    { nombre: "Sociologia General", horario: "Sabado 11:45 a 13:45 horas", grupo: "Primer Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "302", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Cristina Ventura Aneliess Garcia", femenino: true, correo: "", cursos: [
    { nombre: "Estadistica Basica", horario: "Sabado 07:00 a 09:00 horas", grupo: "Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "303", anio: 2026, trimestre: 1 },
    { nombre: "Estadistica Basica", horario: "Martes 18:00 a 20:00 horas", grupo: "Primer Ano - LICP", edificio: "203", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Glenda Cecilia Corado Franco", femenino: true, correo: "", cursos: [
    { nombre: "Psicologia del Aprendizaje", horario: "Sabado 11:45 a 13:45 horas", grupo: "Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "303", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Brigette Marroquin Castillo", femenino: true, correo: "", cursos: [
    { nombre: "Practica Intervencion Psicologica Preventiva", horario: "Sabado 14:00 a 16:00 horas", grupo: "Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "303", anio: 2026, trimestre: 1 },
    { nombre: "Psicopatologia II", horario: "Sabado 07:00 a 09:00 horas", grupo: "Tercer Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "304", anio: 2026, trimestre: 1 },
    { nombre: "Psicoterapia del Adulto", horario: "Sabado 09:30 a 11:30 horas", grupo: "Quinto Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "306", anio: 2026, trimestre: 1 },
    { nombre: "Psicologia General", horario: "Lunes 18:00 a 20:00 horas", grupo: "Primer Ano - LICP", edificio: "203", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Shara Barrios", femenino: true, correo: "", cursos: [
    { nombre: "Psicometria: Pruebas Proyectivas", horario: "Sabado 09:30 a 11:30 horas", grupo: "Tercer Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "304", anio: 2026, trimestre: 1 },
    { nombre: "Metodos de Diagnostico", horario: "Sabado 11:45 a 13:45 horas", grupo: "Cuarto Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "305", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Shirley Rosicela Rosales Ramos", femenino: true, correo: "", cursos: [
    { nombre: "Fundamentos de Psicoterapia", horario: "Sabado 09:30 a 11:30 horas", grupo: "Cuarto Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "305", anio: 2026, trimestre: 1 },
  ]},
  { nombre: "Juan Jose Reyes Rodriguez", femenino: false, correo: "", cursos: [
    { nombre: "Psicopatologia Social", horario: "Sabado 07:00 a 09:00 horas", grupo: "Quinto Ano - Lic. en Psicologia Clinica y Consejeria Social", edificio: "306", anio: 2026, trimestre: 1 },
  ]},
];

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
