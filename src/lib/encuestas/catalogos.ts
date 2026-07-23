// Catalogos cerrados de la encuesta estudiantil. Estos mismos valores estan
// fijados con CHECK en supabase/migrations/013_gestionesjj_encuestas_estudiantiles.sql
// (gestionesjj_encuestas_respuestas) — si se agrega una opcion aqui hay que
// agregarla tambien alla.

export type OpcionCatalogo = { id: string; label: string };

export const EDAD_RANGO: OpcionCatalogo[] = [
  { id: "16-18", label: "16 a 18 años" },
  { id: "19-21", label: "19 a 21 años" },
  { id: "22-25", label: "22 a 25 años" },
  { id: "26-30", label: "26 a 30 años" },
  { id: "31+", label: "31 años o más" },
];

export const GENERO: OpcionCatalogo[] = [
  { id: "femenino", label: "Femenino" },
  { id: "masculino", label: "Masculino" },
  { id: "otro", label: "Otro" },
  { id: "prefiero_no_decir", label: "Prefiero no decir" },
];

export const FUENTE_CONOCIMIENTO: OpcionCatalogo[] = [
  { id: "redes_sociales", label: "Redes sociales" },
  { id: "recomendacion_familiar", label: "Recomendación de un familiar" },
  { id: "recomendacion_amigo", label: "Recomendación de un amigo" },
  { id: "egresado", label: "Soy o conozco a un egresado" },
  { id: "feria_o_visita_colegio", label: "Feria educativa o visita al colegio" },
  { id: "publicidad", label: "Publicidad" },
  { id: "busqueda_internet", label: "Búsqueda en internet" },
  { id: "otro", label: "Otro" },
];

export const RAZONES_UNIVERSIDAD: OpcionCatalogo[] = [
  { id: "prestigio", label: "Prestigio de la universidad" },
  { id: "costo_accesible", label: "Costo accesible" },
  { id: "beca", label: "Obtuve una beca" },
  { id: "ubicacion", label: "Ubicación / cercanía" },
  { id: "horarios_flexibles", label: "Horarios flexibles" },
  { id: "modalidad_virtual", label: "Modalidad virtual o a distancia" },
  { id: "recomendacion", label: "Me la recomendaron" },
  { id: "unica_con_la_carrera", label: "Era la única con esta carrera" },
  { id: "ambiente_valores", label: "Ambiente y valores de la institución" },
  { id: "calidad_docente", label: "Calidad docente" },
  { id: "instalaciones", label: "Instalaciones y tecnología" },
  { id: "otro", label: "Otro" },
];

export const RAZONES_CARRERA: OpcionCatalogo[] = [
  { id: "vocacion", label: "Vocación / me apasiona" },
  { id: "empleabilidad", label: "Buenas oportunidades de empleo" },
  { id: "ingresos_esperados", label: "Ingresos económicos esperados" },
  { id: "influencia_familiar", label: "Influencia familiar" },
  { id: "experiencia_personal", label: "Experiencia personal o de vida" },
  { id: "ayudar_a_otros", label: "Deseo de ayudar a otros" },
  { id: "continuacion_estudios", label: "Continuación de estudios previos" },
  { id: "prestigio_profesion", label: "Prestigio de la profesión" },
  { id: "descarte_otras", label: "Descarté otras opciones" },
  { id: "otro", label: "Otro" },
];

export const QUIEN_INFLUYO: OpcionCatalogo[] = [
  { id: "decision_propia", label: "Decisión propia" },
  { id: "padres", label: "Mis padres" },
  { id: "familia", label: "Otro familiar" },
  { id: "amigos", label: "Amigos" },
  { id: "orientador", label: "Orientador vocacional" },
  { id: "docente", label: "Un docente" },
  { id: "otro", label: "Otro" },
];

export const EXPECTATIVAS_CARRERA: OpcionCatalogo[] = [
  { id: "empleo_rapido", label: "Conseguir empleo rápido al graduarme" },
  { id: "buen_salario", label: "Un buen salario" },
  { id: "crecimiento_personal", label: "Crecimiento personal" },
  { id: "conocimiento_practico", label: "Conocimiento práctico y aplicable" },
  { id: "emprender", label: "Poder emprender" },
  { id: "servir_comunidad", label: "Servir a mi comunidad" },
  { id: "estabilidad", label: "Estabilidad laboral" },
  { id: "otro", label: "Otro" },
];

export const EXPECTATIVA_UNIVERSIDAD: OpcionCatalogo[] = [
  { id: "buena_docencia", label: "Docentes de calidad" },
  { id: "acompanamiento", label: "Acompañamiento y atención personalizada" },
  { id: "practicas_reales", label: "Prácticas o experiencia real" },
  { id: "flexibilidad", label: "Flexibilidad de horarios/modalidad" },
  { id: "tecnologia", label: "Buena tecnología y plataformas" },
  { id: "bolsa_trabajo", label: "Bolsa de trabajo / vinculación laboral" },
  { id: "vida_estudiantil", label: "Vida estudiantil y actividades" },
  { id: "otro", label: "Otro" },
];

function toMapa(opciones: OpcionCatalogo[]): Record<string, string> {
  return Object.fromEntries(opciones.map((o) => [o.id, o.label]));
}

export const LABELS_FUENTE_CONOCIMIENTO = toMapa(FUENTE_CONOCIMIENTO);
export const LABELS_RAZONES_UNIVERSIDAD = toMapa(RAZONES_UNIVERSIDAD);
export const LABELS_RAZONES_CARRERA = toMapa(RAZONES_CARRERA);
export const LABELS_QUIEN_INFLUYO = toMapa(QUIEN_INFLUYO);
export const LABELS_EXPECTATIVAS_CARRERA = toMapa(EXPECTATIVAS_CARRERA);
export const LABELS_EXPECTATIVA_UNIVERSIDAD = toMapa(EXPECTATIVA_UNIVERSIDAD);
export const LABELS_GENERO = toMapa(GENERO);
export const LABELS_EDAD_RANGO = toMapa(EDAD_RANGO);
