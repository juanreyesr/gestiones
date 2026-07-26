// Tipos y catalogos compartidos del area Iglesia.
//
// Los valores de cada catalogo son EXACTAMENTE los del CHECK en
// supabase/migrations/014_gestionesjj_iglesia.sql. Si se agrega una opcion hay
// que tocar ambos lados.

// ============================================================
// PENDIENTES
// ============================================================

export type EstadoItem = "sin_empezar" | "en_proceso" | "atorado" | "en_revision" | "listo";
export type PrioridadItem = "sin_definir" | "baja" | "media" | "alta" | "critica";

export type TableroRow = {
  id: string;
  created_by: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  orden: number;
  archivado: boolean;
  created_at: string;
  updated_at: string;
};

export type GrupoRow = {
  id: string;
  created_by: string;
  tablero_id: string;
  nombre: string;
  color: string;
  orden: number;
  colapsado: boolean;
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  created_by: string;
  tablero_id: string;
  grupo_id: string;
  item_padre_id: string | null;
  titulo: string;
  estado: EstadoItem;
  prioridad: PrioridadItem;
  responsable: string | null;
  fecha_inicio: string | null;
  fecha_limite: string | null;
  etiquetas: string[];
  notas: string | null;
  orden: number;
  completado_en: string | null;
  evento_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ActualizacionRow = {
  id: string;
  created_by: string;
  item_id: string;
  texto: string;
  created_at: string;
};

/** Campos que la UI edita celda por celda (todo menos ids y sellos). */
export type ItemEditable = Partial<
  Pick<
    ItemRow,
    | "titulo"
    | "estado"
    | "prioridad"
    | "responsable"
    | "fecha_inicio"
    | "fecha_limite"
    | "etiquetas"
    | "notas"
    | "grupo_id"
    | "orden"
  >
>;

type OpcionColor = { valor: string; label: string; color: string; texto: string };

/**
 * Paleta de estados tomada de Monday (verde "Listo", naranja "Trabajando en
 * ello", rojo "Atorado", gris "Sin empezar") con un morado extra para la
 * revision. El color va en linea (style) porque son valores de datos, no
 * clases de Tailwind: asi la misma constante sirve para la tabla, el kanban,
 * el calendario y el documento de Word.
 */
export const ESTADOS: Array<OpcionColor & { valor: EstadoItem }> = [
  { valor: "sin_empezar", label: "Sin empezar", color: "#7e8397", texto: "#ffffff" },
  { valor: "en_proceso", label: "Trabajando en ello", color: "#fdab3d", texto: "#1b2033" },
  { valor: "atorado", label: "Atorado", color: "#e2445c", texto: "#ffffff" },
  { valor: "en_revision", label: "En revisión", color: "#a25ddc", texto: "#ffffff" },
  { valor: "listo", label: "Listo", color: "#00c875", texto: "#08301d" },
];

export const PRIORIDADES: Array<OpcionColor & { valor: PrioridadItem }> = [
  { valor: "sin_definir", label: "Sin definir", color: "#5a5f73", texto: "#ffffff" },
  { valor: "baja", label: "Baja", color: "#579bfc", texto: "#0b2544" },
  { valor: "media", label: "Media", color: "#5559df", texto: "#ffffff" },
  { valor: "alta", label: "Alta", color: "#401694", texto: "#ffffff" },
  { valor: "critica", label: "Crítica", color: "#333333", texto: "#ffffff" },
];

export const COLORES_GRUPO = [
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#0086c0",
  "#579bfc",
  "#ff642e",
  "#9cd326",
];

export const COLORES_TABLERO = ["#0073ea", "#00c875", "#a25ddc", "#e2445c", "#fdab3d", "#0086c0"];

export const estadoInfo = (estado: EstadoItem) => ESTADOS.find((e) => e.valor === estado) ?? ESTADOS[0];
export const prioridadInfo = (prioridad: PrioridadItem) =>
  PRIORIDADES.find((p) => p.valor === prioridad) ?? PRIORIDADES[0];

// ============================================================
// EVENTOS
// ============================================================

export type TipoEvento =
  | "boda"
  | "matrimonio_civil"
  | "aniversario_bodas"
  | "cumpleanos"
  | "quinceanos"
  | "bautizo"
  | "presentacion_ninos"
  | "dedicacion"
  | "funeral"
  | "accion_gracias"
  | "graduacion"
  | "otro";

export type EstadoEvento = "planificado" | "confirmado" | "realizado" | "cancelado";

export type RolParticipante =
  | "novio"
  | "novia"
  | "contrayente"
  | "festejado"
  | "homenajeado"
  | "bautizado"
  | "padre"
  | "madre"
  | "padrino"
  | "madrina"
  | "testigo"
  | "familiar"
  | "oficiante"
  | "difunto"
  | "participante";

export type EventoRow = {
  id: string;
  created_by: string;
  tipo: TipoEvento;
  titulo: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  direccion: string | null;
  oficiante: string | null;
  estado: EstadoEvento;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_correo: string | null;
  asistentes_estimados: number | null;
  programa: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type ParticipanteRow = {
  id: string;
  created_by: string;
  evento_id: string;
  rol: RolParticipante;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  notas: string | null;
  orden: number;
  created_at: string;
};

export type ParticipanteBorrador = {
  id?: string;
  rol: RolParticipante;
  nombre: string;
  documento: string;
  telefono: string;
  notas: string;
};

export const ROLES: Array<{ valor: RolParticipante; label: string }> = [
  { valor: "novio", label: "Novio" },
  { valor: "novia", label: "Novia" },
  { valor: "contrayente", label: "Contrayente" },
  { valor: "festejado", label: "Festejado/a" },
  { valor: "homenajeado", label: "Homenajeado/a" },
  { valor: "bautizado", label: "Bautizado/a" },
  { valor: "padre", label: "Padre" },
  { valor: "madre", label: "Madre" },
  { valor: "padrino", label: "Padrino" },
  { valor: "madrina", label: "Madrina" },
  { valor: "testigo", label: "Testigo" },
  { valor: "familiar", label: "Familiar" },
  { valor: "oficiante", label: "Oficiante" },
  { valor: "difunto", label: "Persona fallecida" },
  { valor: "participante", label: "Participante" },
];

export const rolLabel = (rol: RolParticipante) => ROLES.find((r) => r.valor === rol)?.label ?? rol;

/**
 * Cada tipo de evento define: como se llama el documento que se descarga en
 * Word, que roles se sugieren al crearlo (rolesBase se precargan vacios en el
 * formulario) y una lista de pendientes tipicos para el boton "generar
 * pendientes" que vuelca el evento en un tablero.
 */
export type TipoEventoInfo = {
  valor: TipoEvento;
  label: string;
  emoji: string;
  color: string;
  documento: string;
  rolesBase: RolParticipante[];
  rolesSugeridos: RolParticipante[];
  pendientes: string[];
};

export const TIPOS_EVENTO: TipoEventoInfo[] = [
  {
    valor: "boda",
    label: "Boda religiosa",
    emoji: "💍",
    color: "#e2445c",
    documento: "Constancia de matrimonio religioso",
    rolesBase: ["novio", "novia"],
    rolesSugeridos: ["novio", "novia", "padrino", "madrina", "testigo", "familiar", "oficiante"],
    pendientes: [
      "Confirmar fecha y hora con los novios",
      "Consejería prematrimonial",
      "Reservar y preparar el templo",
      "Confirmar testigos y padrinos",
      "Ensayo de la ceremonia",
      "Preparar la liturgia y música",
      "Elaborar la constancia de matrimonio",
    ],
  },
  {
    valor: "matrimonio_civil",
    label: "Matrimonio civil",
    emoji: "📜",
    color: "#0086c0",
    documento: "Acta de matrimonio civil",
    rolesBase: ["contrayente", "contrayente"],
    rolesSugeridos: ["contrayente", "testigo", "familiar", "oficiante"],
    pendientes: [
      "Recibir documentos de identificación",
      "Verificar requisitos legales",
      "Confirmar testigos",
      "Coordinar hora con el registro civil",
      "Elaborar el acta",
    ],
  },
  {
    valor: "aniversario_bodas",
    label: "Aniversario de bodas",
    emoji: "🎊",
    color: "#a25ddc",
    documento: "Constancia de aniversario",
    rolesBase: ["homenajeado", "homenajeado"],
    rolesSugeridos: ["homenajeado", "familiar", "oficiante"],
    pendientes: ["Confirmar fecha con la familia", "Preparar mensaje", "Coordinar refacción"],
  },
  {
    valor: "cumpleanos",
    label: "Cumpleaños",
    emoji: "🎂",
    color: "#fdab3d",
    documento: "Programa de cumpleaños",
    rolesBase: ["festejado"],
    rolesSugeridos: ["festejado", "familiar", "participante"],
    pendientes: [
      "Confirmar fecha y lugar",
      "Elaborar lista de invitados",
      "Coordinar refacción",
      "Preparar palabras de bendición",
    ],
  },
  {
    valor: "quinceanos",
    label: "Quince años",
    emoji: "👑",
    color: "#ff642e",
    documento: "Programa de quince años",
    rolesBase: ["festejado"],
    rolesSugeridos: ["festejado", "padre", "madre", "padrino", "madrina", "oficiante"],
    pendientes: [
      "Confirmar fecha y hora",
      "Reunión con la familia",
      "Preparar la liturgia",
      "Ensayo",
      "Coordinar música y decoración",
    ],
  },
  {
    valor: "bautizo",
    label: "Bautizo",
    emoji: "💧",
    color: "#0073ea",
    documento: "Constancia de bautismo",
    rolesBase: ["bautizado"],
    rolesSugeridos: ["bautizado", "padre", "madre", "padrino", "madrina", "oficiante"],
    pendientes: [
      "Clases de preparación bautismal",
      "Confirmar padrinos",
      "Preparar el bautisterio",
      "Elaborar la constancia de bautismo",
    ],
  },
  {
    valor: "presentacion_ninos",
    label: "Presentación de niños",
    emoji: "🍼",
    color: "#9cd326",
    documento: "Constancia de presentación",
    rolesBase: ["bautizado"],
    rolesSugeridos: ["bautizado", "padre", "madre", "padrino", "madrina", "oficiante"],
    pendientes: ["Confirmar fecha con los padres", "Preparar la oración de bendición", "Elaborar la constancia"],
  },
  {
    valor: "dedicacion",
    label: "Dedicación (casa, negocio, templo)",
    emoji: "🏠",
    color: "#00c875",
    documento: "Constancia de dedicación",
    rolesBase: ["participante"],
    rolesSugeridos: ["participante", "familiar", "oficiante"],
    pendientes: ["Confirmar dirección y hora", "Preparar el mensaje", "Coordinar equipo de sonido"],
  },
  {
    valor: "funeral",
    label: "Funeral / servicio fúnebre",
    emoji: "🕊️",
    color: "#7e8397",
    documento: "Constancia de servicio fúnebre",
    rolesBase: ["difunto"],
    rolesSugeridos: ["difunto", "familiar", "oficiante"],
    pendientes: [
      "Contactar a la familia",
      "Confirmar lugar y hora del servicio",
      "Preparar el mensaje",
      "Coordinar acompañamiento a la familia",
    ],
  },
  {
    valor: "accion_gracias",
    label: "Culto de acción de gracias",
    emoji: "🙏",
    color: "#5559df",
    documento: "Programa del culto",
    rolesBase: ["participante"],
    rolesSugeridos: ["participante", "familiar", "oficiante"],
    pendientes: ["Confirmar motivo y fecha", "Preparar el programa", "Coordinar participaciones"],
  },
  {
    valor: "graduacion",
    label: "Graduación",
    emoji: "🎓",
    color: "#579bfc",
    documento: "Programa de graduación",
    rolesBase: ["homenajeado"],
    rolesSugeridos: ["homenajeado", "familiar", "oficiante", "participante"],
    pendientes: ["Confirmar lista de graduandos", "Preparar diplomas", "Ensayo", "Coordinar el programa"],
  },
  {
    valor: "otro",
    label: "Otro evento",
    emoji: "📅",
    color: "#a25ddc",
    documento: "Constancia del evento",
    rolesBase: ["participante"],
    rolesSugeridos: ["participante", "familiar", "oficiante"],
    pendientes: ["Definir objetivo del evento", "Confirmar fecha y lugar", "Preparar el programa"],
  },
];

export const tipoEventoInfo = (tipo: TipoEvento) =>
  TIPOS_EVENTO.find((t) => t.valor === tipo) ?? TIPOS_EVENTO[TIPOS_EVENTO.length - 1];

export const ESTADOS_EVENTO: Array<{ valor: EstadoEvento; label: string; color: string; texto: string }> = [
  { valor: "planificado", label: "Planificado", color: "#7e8397", texto: "#ffffff" },
  { valor: "confirmado", label: "Confirmado", color: "#0073ea", texto: "#ffffff" },
  { valor: "realizado", label: "Realizado", color: "#00c875", texto: "#08301d" },
  { valor: "cancelado", label: "Cancelado", color: "#e2445c", texto: "#ffffff" },
];

export const estadoEventoInfo = (estado: EstadoEvento) =>
  ESTADOS_EVENTO.find((e) => e.valor === estado) ?? ESTADOS_EVENTO[0];
