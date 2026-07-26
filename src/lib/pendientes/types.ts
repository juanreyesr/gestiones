// Tipos y catalogos del modulo Pendientes (gestion de tareas y proyectos).
//
// Los valores de cada catalogo son EXACTAMENTE los del CHECK de las tablas
// gestionesjj_pendientes_*, creadas en supabase/migrations/014 (cuando el
// modulo vivia dentro del area Iglesia) y renombradas en la 016. Si se agrega
// una opcion hay que tocar ambos lados.


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
