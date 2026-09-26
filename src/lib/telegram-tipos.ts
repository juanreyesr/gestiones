// Tipos de aviso de Telegram, compartidos entre el servidor y el panel.

export type TipoNotificacion =
  | "citas_solicitudes"
  | "estudiantes_mensajes"
  | "estudiantes_entregas"
  | "cursos_solicitudes"
  | "encuestas_respuestas"
  | "resumen_diario";

export const NOTIFICACIONES: { id: TipoNotificacion; etiqueta: string; porDefecto: boolean }[] = [
  { id: "citas_solicitudes", etiqueta: "Solicitudes de cita (Clínica)", porDefecto: true },
  { id: "estudiantes_mensajes", etiqueta: "Mensajes de estudiantes", porDefecto: true },
  { id: "estudiantes_entregas", etiqueta: "Entregas de tareas", porDefecto: true },
  { id: "cursos_solicitudes", etiqueta: "Solicitudes de inscripción a cursos", porDefecto: true },
  { id: "encuestas_respuestas", etiqueta: "Respuestas de encuestas", porDefecto: false },
  { id: "resumen_diario", etiqueta: "Resumen diario (7:00 a. m.)", porDefecto: true },
];

export type Preferencias = Record<TipoNotificacion, boolean>;
