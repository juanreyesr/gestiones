import type { GrupoRow, ItemEditable, ItemRow } from "@/lib/iglesia/types";

/**
 * Contrato que el tablero pasa a cada vista (tabla, kanban, calendario,
 * cronograma). Todas las vistas leen los mismos datos ya filtrados y escriben
 * con las mismas acciones, de modo que un cambio hecho en el kanban se ve
 * igual al volver a la tabla.
 */
export type AccionesTablero = {
  abrirItem: (id: string) => void;
  actualizarItem: (id: string, cambios: ItemEditable) => void;
  conteoActualizaciones: Record<string, number>;
  crearItem: (grupoId: string, titulo: string, extra?: ItemEditable) => void;
  crearSubitem: (padre: ItemRow, titulo: string) => void;
  duplicar: (id: string) => void;
  eliminarItem: (id: string) => void;
  moverItem: (itemId: string, grupoId: string, indice: number) => void;
  responsables: string[];
  seleccion: Set<string>;
  subitemsDe: (itemId: string) => ItemRow[];
  alternarSeleccion: (id: string, activo: boolean) => void;
};

export type DatosVista = {
  acciones: AccionesTablero;
  grupos: GrupoRow[];
  itemsPorGrupo: Record<string, ItemRow[]>;
};
