// Tipos y constantes compartidas del modulo Cursos.

export type EstadoCurso = "activo" | "finalizado" | "archivado";
export type TipoPlanificacion = "planificacion" | "calendario" | "otro";
export type TipoSesion = "normal" | "examen_parcial" | "examen_final";
export type EstadoEstudiante = "activo" | "retirado";
export type TipoEventoEstudiante = "asignacion" | "retiro" | "reincorporacion";
export type CategoriaContenido = "contenido" | "material_extra";
export type TipoActividad = "tarea" | "actividad" | "examen_parcial" | "examen_final";
export type EstadoAsistencia = "sin_marcar" | "presente" | "ausente" | "excusa" | "tarde";

export type UniversidadRow = {
  id: string;
  created_by: string;
  nombre: string;
  siglas: string | null;
  color: string | null;
  logo_path: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CursoImpartidoRow = {
  id: string;
  created_by: string;
  universidad_id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  periodo: string | null;
  horario: string | null;
  estado: EstadoCurso;
  origen_curso_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CursoConUniversidadRow = CursoImpartidoRow & {
  gestionesjj_universidades: { nombre: string } | null;
};

export type PlanificacionRow = {
  id: string;
  created_by: string;
  curso_id: string;
  tipo: TipoPlanificacion;
  titulo: string;
  descripcion: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  archivo_mime: string | null;
  url_externa: string | null;
  created_at: string;
};

export type SemanaRow = {
  id: string;
  created_by: string;
  curso_id: string;
  numero: number;
  titulo: string | null;
  fecha: string | null;
  tipo_sesion: TipoSesion;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type EstudianteRow = {
  id: string;
  created_by: string;
  curso_id: string;
  nombre: string;
  correo: string | null;
  carne: string | null;
  estado: EstadoEstudiante;
  asignado_en: string;
  retirado_en: string | null;
  created_at: string;
  updated_at: string;
};

export type EstudianteEventoRow = {
  id: string;
  created_by: string;
  curso_id: string;
  estudiante_id: string;
  tipo: TipoEventoEstudiante;
  nota: string | null;
  ocurrido_en: string;
};

export type ContenidoRow = {
  id: string;
  created_by: string;
  semana_id: string;
  categoria: CategoriaContenido;
  titulo: string;
  descripcion: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  archivo_mime: string | null;
  url_externa: string | null;
  orden: number;
  created_at: string;
};

export type ActividadRow = {
  id: string;
  created_by: string;
  semana_id: string;
  tipo: TipoActividad;
  titulo: string;
  descripcion: string | null;
  punteo: number | null;
  entrega_proxima_semana: boolean;
  created_at: string;
  updated_at: string;
};

export type ActividadConSemanaRow = ActividadRow & {
  gestionesjj_curso_semanas: { curso_id: string; numero: number } | null;
};

export type CalificacionRow = {
  id: string;
  created_by: string;
  actividad_id: string;
  estudiante_id: string;
  entregado: boolean;
  nota: number | null;
  comentario: string | null;
  created_at: string;
  updated_at: string;
};

export type AsistenciaRow = {
  id: string;
  created_by: string;
  semana_id: string;
  estudiante_id: string;
  estado: EstadoAsistencia;
  nota: string | null;
  created_at: string;
  updated_at: string;
};

export type AsistenciaConSemanaRow = AsistenciaRow & {
  gestionesjj_curso_semanas: { curso_id: string; numero: number } | null;
};

export const ESTADO_CURSO_LABELS: Record<EstadoCurso, string> = {
  activo: "Activo",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

export const TIPO_PLANIFICACION_LABELS: Record<TipoPlanificacion, string> = {
  planificacion: "Planificación",
  calendario: "Calendario",
  otro: "Otro",
};

export const TIPO_SESION_LABELS: Record<TipoSesion, string> = {
  normal: "Semana normal",
  examen_parcial: "Examen parcial",
  examen_final: "Examen final",
};

export const TIPO_EVENTO_LABELS: Record<TipoEventoEstudiante, string> = {
  asignacion: "Asignación",
  retiro: "Retiro",
  reincorporacion: "Reincorporación",
};

export const TIPO_ACTIVIDAD_LABELS: Record<TipoActividad, string> = {
  tarea: "Tarea",
  actividad: "Actividad",
  examen_parcial: "Examen parcial",
  examen_final: "Examen final",
};

export const ESTADO_ASISTENCIA_LABELS: Record<EstadoAsistencia, string> = {
  sin_marcar: "Sin marcar",
  presente: "Presente",
  ausente: "Ausente",
  excusa: "Ausente con excusa",
  tarde: "Llegó tarde",
};

export const COLORES_UNIVERSIDAD: string[] = [
  "#6ee7b7", // emerald
  "#7dd3fc", // sky
  "#c4b5fd", // violet
  "#fcd34d", // amber
  "#fda4af", // rose
  "#67e8f9", // cyan
  "#bef264", // lime
  "#f0abfc", // fuchsia
];

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}
