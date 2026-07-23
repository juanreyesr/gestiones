// Tipos y constantes compartidas del modulo Recursos (encuestas/quiz/qa en vivo).

export type TipoRecurso = "encuesta" | "quiz" | "qa";
export type TipoPregunta = "opcion_multiple" | "nube_palabras" | "abierta" | "escala";
export type EstadoSesion = "espera" | "activa" | "cerrada";

export type OpcionPregunta = { id: string; texto: string; correcta?: boolean };

export type RecursoRow = {
  id: string;
  created_by: string;
  tipo: TipoRecurso;
  titulo: string;
  descripcion: string | null;
  qa_anonimo: boolean;
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
  tiempo_limite: number | null;
  puntos: number;
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
  pregunta_activa_iniciada_at: string | null;
  created_at: string;
  updated_at: string;
  cerrada_at: string | null;
};

export type SesionConRecurso = SesionRow & { gestionesjj_recursos: { titulo: string; tipo: TipoRecurso } | null };

export type ParticipanteRow = {
  id: string;
  sesion_id: string;
  apodo: string;
  puntaje: number;
  created_at: string;
};

export type RespuestaValor = { opcion_id: string } | { texto: string } | { valor: number };

export type RespuestaRow = {
  id: string;
  sesion_id: string;
  pregunta_id: string;
  participante_id: string;
  valor: RespuestaValor;
  es_correcta: boolean | null;
  puntos_obtenidos: number;
  tiempo_ms: number | null;
  created_at: string;
};

export type EstadoQaPregunta = "visible" | "respondida" | "oculta";

export type QaPreguntaOwnerRow = {
  id: string;
  sesion_id: string;
  participante_id: string;
  texto: string;
  estado: EstadoQaPregunta;
  destacada: boolean;
  votos: number;
  created_at: string;
  gestionesjj_recurso_participantes: { apodo: string } | null;
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
