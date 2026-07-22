// Tipos y constantes compartidas del modulo Recursos (encuestas/quiz/qa en vivo).

export type TipoRecurso = "encuesta" | "quiz" | "qa";
export type TipoPregunta = "opcion_multiple" | "nube_palabras" | "abierta" | "escala";
export type EstadoSesion = "espera" | "activa" | "cerrada";

export type OpcionPregunta = { id: string; texto: string };

export type RecursoRow = {
  id: string;
  created_by: string;
  tipo: TipoRecurso;
  titulo: string;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
};

export type RecursoConConteo = RecursoRow & { preguntasCount: number };

export type PreguntaRow = {
  id: string;
  created_by: string;
  recurso_id: string;
  orden: number;
  tipo_pregunta: TipoPregunta;
  texto: string;
  opciones: OpcionPregunta[] | null;
  escala_min: number;
  escala_max: number;
  created_at: string;
  updated_at: string;
};

export type SesionRow = {
  id: string;
  created_by: string;
  recurso_id: string;
  pin: string;
  estado: EstadoSesion;
  pregunta_activa_id: string | null;
  created_at: string;
  updated_at: string;
  cerrada_at: string | null;
};

export type SesionConRecurso = SesionRow & { gestionesjj_recursos: { titulo: string; tipo: TipoRecurso } | null };

export type ParticipanteRow = {
  id: string;
  sesion_id: string;
  apodo: string;
  created_at: string;
};

export type RespuestaValor = { opcion_id: string } | { texto: string } | { valor: number };

export type RespuestaRow = {
  id: string;
  sesion_id: string;
  pregunta_id: string;
  participante_id: string;
  valor: RespuestaValor;
  created_at: string;
};

export const TIPO_PREGUNTA_LABELS: Record<TipoPregunta, string> = {
  opcion_multiple: "Opción múltiple",
  nube_palabras: "Nube de palabras",
  abierta: "Pregunta abierta",
  escala: "Escala de valoración",
};

export const TIPO_RECURSO_LABELS: Record<TipoRecurso, string> = {
  encuesta: "Encuesta",
  quiz: "Quiz",
  qa: "Preguntas del público",
};

export function nuevaOpcionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `op-${Date.now()}-${Math.random()}`;
}
