// Tipos de aviso de Telegram, compartidos entre el servidor y el panel.

export type TipoNotificacion =
  | "citas_solicitudes"
  | "reservas_google"
  | "citas_recordatorio"
  | "google_recordatorio"
  | "estudiantes_mensajes"
  | "estudiantes_entregas"
  | "cursos_solicitudes"
  | "encuestas_respuestas"
  | "resumen_diario";

export const NOTIFICACIONES: { id: TipoNotificacion; etiqueta: string; porDefecto: boolean }[] = [
  { id: "citas_solicitudes", etiqueta: "Solicitudes de cita (Clínica)", porDefecto: true },
  { id: "reservas_google", etiqueta: "Reservas de Calendly u otros sistemas (vía Google Calendar)", porDefecto: true },
  { id: "citas_recordatorio", etiqueta: "Recordatorio 1 hora antes de cada cita", porDefecto: true },
  { id: "google_recordatorio", etiqueta: "Aviso 1 hora antes de mis compromisos de Google Calendar", porDefecto: true },
  { id: "estudiantes_mensajes", etiqueta: "Mensajes de estudiantes", porDefecto: true },
  { id: "estudiantes_entregas", etiqueta: "Entregas de tareas", porDefecto: true },
  { id: "cursos_solicitudes", etiqueta: "Solicitudes de inscripción a cursos", porDefecto: true },
  { id: "encuestas_respuestas", etiqueta: "Respuestas de encuestas", porDefecto: false },
  { id: "resumen_diario", etiqueta: "Resumen diario (7:00 a. m.)", porDefecto: true },
];

export type Preferencias = Record<TipoNotificacion, boolean>;
