export type PacienteEstado = "activo" | "inactivo" | "alta";
export type SesionEstado = "en_curso" | "finalizada";
export type SesionModalidad = "seguimiento" | "tema_nuevo";
export type ResumenOrigen = "ia" | "manual";
export type CompromisoTipo = "compromiso" | "tarea";
export type CitaEstado = "pendiente" | "confirmada" | "completada" | "cancelada" | "no_asistio";
export type CitaOrigen = "interna" | "publica";
export type CitaModalidad = "presencial" | "virtual";
export type SolicitudEstado = "pendiente" | "aprobada" | "rechazada" | "expirada";
export type GcalSyncStatus = "sincronizada" | "pendiente" | "error" | "no_configurado";

export type PacienteRow = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  ocupacion: string | null;
  escolaridad: string | null;
  estadoCivil: string | null;
  direccion: string | null;
  emergenciaNombre: string | null;
  emergenciaTelefono: string | null;
  emergenciaRelacion: string | null;
  motivoConsulta: string | null;
  antecedentesMedicos: string | null;
  antecedentesPsicologicos: string | null;
  antecedentesFamiliares: string | null;
  medicacionActual: string | null;
  referidoPor: string | null;
  notasGenerales: string | null;
  estado: PacienteEstado;
  createdAt: string;
  datosToken: string | null;
  datosCompletadosAt: string | null;
  consentimientoAceptadoAt: string | null;
};

export type PacientePayload = {
  nombre: string;
  telefono: string;
  email?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  ocupacion?: string | null;
  escolaridad?: string | null;
  estado_civil?: string | null;
  direccion?: string | null;
  emergencia_nombre?: string | null;
  emergencia_telefono?: string | null;
  emergencia_relacion?: string | null;
  motivo_consulta?: string | null;
  antecedentes_medicos?: string | null;
  antecedentes_psicologicos?: string | null;
  antecedentes_familiares?: string | null;
  medicacion_actual?: string | null;
  referido_por?: string | null;
  notas_generales?: string | null;
  estado?: PacienteEstado;
};

export type CompromisoRow = {
  id: string;
  sesionId: string;
  pacienteId: string;
  tipo: CompromisoTipo;
  descripcion: string;
  cumplido: boolean;
  cumplidoEnSesionId: string | null;
  orden: number;
};

export type SesionRow = {
  id: string;
  pacienteId: string;
  citaId: string | null;
  estado: SesionEstado;
  modalidad: SesionModalidad | null;
  tema: string | null;
  notas: string | null;
  resumen: string | null;
  seguimiento: string | null;
  resumenOrigen: ResumenOrigen | null;
  iniciadaAt: string;
  finalizadaAt: string | null;
  compromisos: CompromisoRow[];
};

export type CitaRow = {
  id: string;
  pacienteId: string | null;
  pacienteNombre: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  inicio: string;
  fin: string;
  estado: CitaEstado;
  origen: CitaOrigen;
  modalidad: CitaModalidad | null;
  motivo: string | null;
  notas: string | null;
  motivoEstado: string | null;
  gcalEventId: string | null;
  gcalSyncStatus: GcalSyncStatus | null;
};

export type SolicitudRow = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  motivo: string | null;
  inicio: string;
  fin: string;
  estado: SolicitudEstado;
  pacienteId: string | null;
  citaId: string | null;
  createdAt: string;
  yaEsPaciente: boolean;
  primeraSesion: boolean;
  darSeguimiento: boolean;
};

export type RangoHorario = { inicio: string; fin: string };

export type HorarioSemanal = Record<string, RangoHorario[]>;

export type DisponibilidadConfig = {
  id: string | null;
  zonaHoraria: string;
  duracionMin: number;
  bufferMin: number;
  antelacionMinHoras: number;
  antelacionMaxDias: number;
  agendamientoPublico: boolean;
  horarioSemanal: HorarioSemanal;
  consentimientoTexto: string;
};

export const PACIENTE_ESTADOS: { value: PacienteEstado; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "alta", label: "Alta terapéutica" },
];

export const CITA_ESTADOS: { value: CitaEstado; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_asistio", label: "No asistió" },
];
