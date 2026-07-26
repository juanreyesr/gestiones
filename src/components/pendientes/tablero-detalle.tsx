"use client";

import {
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  FileDown,
  GanttChartSquare,
  KanbanSquare,
  ListFilter,
  Pencil,
  Plus,
  Rows3,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { diasRestantes } from "@/lib/fechas";
import {
  deleteItem,
  deleteItems,
  duplicarItem,
  fetchConteoActualizaciones,
  fetchItems,
  insertItem,
  reordenarItems,
  updateItem,
  updateItemsEnLote,
} from "@/lib/pendientes/items";
import { deleteGrupo, fetchGrupos, insertGrupo, updateGrupo } from "@/lib/pendientes/tableros";
import {
  COLORES_GRUPO,
  ESTADOS,
  PRIORIDADES,
  type EstadoItem,
  type GrupoRow,
  type ItemEditable,
  type ItemRow,
  type PrioridadItem,
  type TableroRow,
} from "@/lib/pendientes/types";
import { descargarTableroWord } from "@/lib/pendientes/word";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner, Field, INPUT, MenuAnclado, Modal, OpcionMenu } from "@/components/ui-comun";
import { ItemPanel } from "./item-panel";
import type { AccionesTablero } from "./tipos";
import { VistaCalendario } from "./vista-calendario";
import { VistaCronograma } from "./vista-cronograma";
import { VistaKanban } from "./vista-kanban";
import { VistaTabla } from "./vista-tabla";

type Vista = "tabla" | "kanban" | "calendario" | "cronograma";
type Orden = "manual" | "fecha" | "prioridad" | "estado" | "alfabetico";

const VISTAS: Array<{ valor: Vista; label: string; icono: React.ComponentType<{ className?: string }> }> = [
  { valor: "tabla", label: "Tabla", icono: Rows3 },
  { valor: "kanban", label: "Kanban", icono: KanbanSquare },
  { valor: "calendario", label: "Calendario", icono: CalendarDays },
  { valor: "cronograma", label: "Cronograma", icono: GanttChartSquare },
];

const PESO_PRIORIDAD: Record<PrioridadItem, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
  sin_definir: 4,
};

export function TableroDetalle({
  onEditarTablero,
  onVolver,
  tablero,
}: {
  onEditarTablero: () => void;
  onVolver: () => void;
  tablero: TableroRow;
}) {
  const [grupos, setGrupos] = useState<GrupoRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [conteoActualizaciones, setConteoActualizaciones] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [vista, setVista] = useState<Vista>("tabla");
  const [orden, setOrden] = useState<Orden>("manual");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstados, setFiltroEstados] = useState<EstadoItem[]>([]);
  const [filtroPrioridades, setFiltroPrioridades] = useState<PrioridadItem[]>([]);
  const [filtroResponsable, setFiltroResponsable] = useState<string>("");
  const [ocultarListos, setOcultarListos] = useState(false);

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [itemAbierto, setItemAbierto] = useState<string | null>(null);
  const [grupoEnEdicion, setGrupoEnEdicion] = useState<GrupoRow | "nuevo" | null>(null);
  const [grupoAEliminar, setGrupoAEliminar] = useState<GrupoRow | null>(null);
  const [itemAEliminar, setItemAEliminar] = useState<ItemRow | null>(null);
  const [descargando, setDescargando] = useState(false);

  const [menuFiltros, setMenuFiltros] = useState(false);
  const [menuOrden, setMenuOrden] = useState(false);
  const [menuLote, setMenuLote] = useState<"estado" | "grupo" | null>(null);
  // Los botones que abren un menu flotante se guardan en estado, no en refs:
  // MenuAnclado necesita el elemento durante el render para posicionarse.
  const [disparadorFiltros, setDisparadorFiltros] = useState<HTMLElement | null>(null);
  const [disparadorOrden, setDisparadorOrden] = useState<HTMLElement | null>(null);
  const [disparadorLote, setDisparadorLote] = useState<HTMLElement | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [gruposRes, itemsRes, conteoRes] = await Promise.all([
      fetchGrupos(tablero.id),
      fetchItems(tablero.id),
      fetchConteoActualizaciones(tablero.id),
    ]);
    setGrupos(gruposRes.data);
    setItems(itemsRes.data);
    setConteoActualizaciones(conteoRes.data);
    setError(gruposRes.error ?? itemsRes.error ?? "");
    setCargando(false);
  }, [tablero.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga el tablero al abrirlo
    void cargar();
  }, [cargar]);

  const recargarConteo = useCallback(async () => {
    const { data } = await fetchConteoActualizaciones(tablero.id);
    setConteoActualizaciones(data);
  }, [tablero.id]);

  // ----------------------------------------------------------------
  // Acciones sobre items (optimistas: la UI cambia primero y la base
  // despues, porque un tablero se edita a mucha velocidad)
  // ----------------------------------------------------------------

  const actualizarItem = useCallback((id: string, cambios: ItemEditable) => {
    setItems((previos) =>
      previos.map((item) =>
        item.id === id
          ? {
              ...item,
              ...cambios,
              // El sello de completado lo pone un trigger en la base; aqui se
              // refleja de inmediato para que la fila no parpadee.
              completado_en: cambios.estado
                ? cambios.estado === "listo"
                  ? (item.completado_en ?? new Date().toISOString())
                  : null
                : item.completado_en,
            }
          : item,
      ),
    );
    void updateItem(id, cambios).then(({ error: updateError }) => {
      if (updateError) {
        setError(updateError);
        void cargar();
      }
    });
  }, [cargar]);

  const crearItem = useCallback(
    (grupoId: string, titulo: string, extra?: ItemEditable) => {
      const orden = items.filter((item) => item.grupo_id === grupoId && !item.item_padre_id).length;
      void insertItem({ tablero_id: tablero.id, grupo_id: grupoId, titulo, orden, ...extra }).then(
        ({ data, error: insertError }) => {
          if (insertError || !data) {
            setError(insertError ?? "No se pudo crear el pendiente.");
            return;
          }
          setItems((previos) => [...previos, data]);
        },
      );
    },
    [items, tablero.id],
  );

  const crearSubitem = useCallback(
    (padre: ItemRow, titulo: string) => {
      const orden = items.filter((item) => item.item_padre_id === padre.id).length;
      void insertItem({
        tablero_id: padre.tablero_id,
        grupo_id: padre.grupo_id,
        item_padre_id: padre.id,
        titulo,
        orden,
      }).then(({ data, error: insertError }) => {
        if (insertError || !data) {
          setError(insertError ?? "No se pudo crear la subtarea.");
          return;
        }
        setItems((previos) => [...previos, data]);
      });
    },
    [items],
  );

  const eliminarItem = useCallback(
    (id: string) => {
      const item = items.find((candidato) => candidato.id === id);
      if (!item) return;
      // Las subtareas se borran sin preguntar (son de un clic); un pendiente
      // completo si pide confirmacion porque arrastra su hilo y sus subtareas.
      if (item.item_padre_id) {
        setItems((previos) => previos.filter((candidato) => candidato.id !== id));
        void deleteItem(id);
        return;
      }
      setItemAEliminar(item);
    },
    [items],
  );

  const confirmarEliminarItem = async () => {
    if (!itemAEliminar) return;
    const id = itemAEliminar.id;
    setItems((previos) => previos.filter((item) => item.id !== id && item.item_padre_id !== id));
    setItemAEliminar(null);
    if (itemAbierto === id) setItemAbierto(null);
    const { error: deleteError } = await deleteItem(id);
    if (deleteError) {
      setError(deleteError);
      await cargar();
    }
  };

  const duplicar = useCallback(
    (id: string) => {
      const item = items.find((candidato) => candidato.id === id);
      if (!item) return;
      void duplicarItem(
        item,
        items.filter((candidato) => candidato.item_padre_id === id),
      ).then(({ error: dupError }) => {
        if (dupError) setError(dupError);
        void cargar();
      });
    },
    [cargar, items],
  );

  const alternarSeleccion = useCallback((id: string, activo: boolean) => {
    setSeleccion((previa) => {
      const siguiente = new Set(previa);
      if (activo) siguiente.add(id);
      else siguiente.delete(id);
      return siguiente;
    });
  }, []);

  // ----------------------------------------------------------------
  // Filtros y orden
  // ----------------------------------------------------------------

  const principales = useMemo(() => items.filter((item) => !item.item_padre_id), [items]);

  const responsables = useMemo(() => {
    const nombres = new Set<string>();
    for (const item of items) if (item.responsable) nombres.add(item.responsable);
    return [...nombres].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hayFiltros =
    Boolean(busqueda.trim()) ||
    filtroEstados.length > 0 ||
    filtroPrioridades.length > 0 ||
    Boolean(filtroResponsable) ||
    ocultarListos;

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrados = principales.filter((item) => {
      if (ocultarListos && item.estado === "listo") return false;
      if (filtroEstados.length && !filtroEstados.includes(item.estado)) return false;
      if (filtroPrioridades.length && !filtroPrioridades.includes(item.prioridad)) return false;
      if (filtroResponsable && item.responsable !== filtroResponsable) return false;
      if (!texto) return true;
      return [item.titulo, item.notas ?? "", item.responsable ?? "", item.etiquetas.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });

    if (orden === "manual") return filtrados;

    return [...filtrados].sort((a, b) => {
      if (orden === "alfabetico") return a.titulo.localeCompare(b.titulo);
      if (orden === "prioridad") return PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad];
      if (orden === "estado") {
        const indice = (estado: EstadoItem) => ESTADOS.findIndex((opcion) => opcion.valor === estado);
        return indice(a.estado) - indice(b.estado);
      }
      // Por fecha: primero lo que vence antes; lo que no tiene fecha, al final.
      if (!a.fecha_limite && !b.fecha_limite) return 0;
      if (!a.fecha_limite) return 1;
      if (!b.fecha_limite) return -1;
      return a.fecha_limite.localeCompare(b.fecha_limite);
    });
  }, [busqueda, filtroEstados, filtroPrioridades, filtroResponsable, ocultarListos, orden, principales]);

  const itemsPorGrupo = useMemo(() => {
    const mapa: Record<string, ItemRow[]> = {};
    for (const grupo of grupos) mapa[grupo.id] = [];
    for (const item of visibles) (mapa[item.grupo_id] ??= []).push(item);
    return mapa;
  }, [grupos, visibles]);

  /**
   * Traduce "solto en la posicion N de lo que veo" a la posicion real dentro
   * del grupo destino, que puede tener items ocultos por el filtro.
   */
  const moverItem = useCallback(
    (itemId: string, grupoId: string, indice: number) => {
      const mostrados = itemsPorGrupo[grupoId] ?? [];
      const anclaId = mostrados[indice]?.id ?? null;

      const arrastrado = items.find((item) => item.id === itemId);
      if (!arrastrado) return;

      const destino = principales
        .filter((item) => item.grupo_id === grupoId && item.id !== itemId)
        .sort((a, b) => a.orden - b.orden);

      const posicion = anclaId ? destino.findIndex((item) => item.id === anclaId) : destino.length;
      const nuevaLista = [...destino];
      nuevaLista.splice(posicion < 0 ? destino.length : posicion, 0, { ...arrastrado, grupo_id: grupoId });

      const cambios = nuevaLista.map((item, posicionFinal) => ({
        id: item.id,
        grupo_id: grupoId,
        orden: posicionFinal,
      }));

      setItems((previos) =>
        previos.map((item) => {
          const cambio = cambios.find((candidato) => candidato.id === item.id);
          if (cambio) return { ...item, grupo_id: cambio.grupo_id, orden: cambio.orden };
          // Las subtareas siguen a su padre cuando cambia de grupo.
          if (item.item_padre_id === itemId) return { ...item, grupo_id: grupoId };
          return item;
        }),
      );

      void reordenarItems(cambios).then(({ error: ordenError }) => {
        if (ordenError) {
          setError(ordenError);
          void cargar();
        }
      });
    },
    [cargar, items, itemsPorGrupo, principales],
  );

  const acciones: AccionesTablero = useMemo(
    () => ({
      abrirItem: setItemAbierto,
      actualizarItem,
      alternarSeleccion,
      conteoActualizaciones,
      crearItem,
      crearSubitem,
      duplicar,
      eliminarItem,
      moverItem,
      responsables,
      seleccion,
      subitemsDe: (itemId: string) =>
        items.filter((item) => item.item_padre_id === itemId).sort((a, b) => a.orden - b.orden),
    }),
    [
      actualizarItem,
      alternarSeleccion,
      conteoActualizaciones,
      crearItem,
      crearSubitem,
      duplicar,
      eliminarItem,
      items,
      moverItem,
      responsables,
      seleccion,
    ],
  );

  // ----------------------------------------------------------------
  // Grupos
  // ----------------------------------------------------------------

  const guardarGrupo = async (nombre: string, color: string) => {
    if (grupoEnEdicion === "nuevo") {
      const { error: insertError } = await insertGrupo({
        tablero_id: tablero.id,
        nombre,
        color,
        orden: grupos.length,
      });
      if (insertError) setError(insertError);
    } else if (grupoEnEdicion) {
      setGrupos((previos) =>
        previos.map((grupo) => (grupo.id === grupoEnEdicion.id ? { ...grupo, nombre, color } : grupo)),
      );
      const { error: updateError } = await updateGrupo(grupoEnEdicion.id, { nombre, color });
      if (updateError) setError(updateError);
    }
    setGrupoEnEdicion(null);
    await cargar();
  };

  const confirmarEliminarGrupo = async () => {
    if (!grupoAEliminar) return;
    const id = grupoAEliminar.id;
    setGrupos((previos) => previos.filter((grupo) => grupo.id !== id));
    setItems((previos) => previos.filter((item) => item.grupo_id !== id));
    setGrupoAEliminar(null);
    const { error: deleteError } = await deleteGrupo(id);
    if (deleteError) {
      setError(deleteError);
      await cargar();
    }
  };

  const renombrarGrupo = (grupo: GrupoRow, nombre: string) => {
    setGrupos((previos) => previos.map((actual) => (actual.id === grupo.id ? { ...actual, nombre } : actual)));
    void updateGrupo(grupo.id, { nombre });
  };

  const alternarColapso = (grupo: GrupoRow) => {
    setGrupos((previos) =>
      previos.map((actual) => (actual.id === grupo.id ? { ...actual, colapsado: !actual.colapsado } : actual)),
    );
    void updateGrupo(grupo.id, { colapsado: !grupo.colapsado });
  };

  // ----------------------------------------------------------------
  // Acciones en lote
  // ----------------------------------------------------------------

  const aplicarLote = async (cambios: ItemEditable) => {
    const ids = [...seleccion];
    setItems((previos) => previos.map((item) => (seleccion.has(item.id) ? { ...item, ...cambios } : item)));
    setSeleccion(new Set());
    setMenuLote(null);
    const { error: loteError } = await updateItemsEnLote(ids, cambios);
    if (loteError) {
      setError(loteError);
      await cargar();
    }
  };

  const eliminarLote = async () => {
    const ids = [...seleccion];
    setItems((previos) => previos.filter((item) => !seleccion.has(item.id) && !ids.includes(item.item_padre_id ?? "")));
    setSeleccion(new Set());
    const { error: loteError } = await deleteItems(ids);
    if (loteError) {
      setError(loteError);
      await cargar();
    }
  };

  const descargarWord = async () => {
    setDescargando(true);
    try {
      await descargarTableroWord({ grupos, items, tablero });
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo generar el documento.");
    }
    setDescargando(false);
  };

  // ----------------------------------------------------------------
  // Metricas del encabezado
  // ----------------------------------------------------------------

  const total = principales.length;
  const listos = principales.filter((item) => item.estado === "listo").length;
  const enProceso = principales.filter((item) => item.estado === "en_proceso").length;
  const vencidos = principales.filter((item) => {
    if (item.estado === "listo") return false;
    const dias = diasRestantes(item.fecha_limite);
    return dias !== null && dias < 0;
  }).length;

  const itemActual = itemAbierto ? items.find((item) => item.id === itemAbierto) : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className={BTN_GHOST} onClick={onVolver} type="button">
          <ChevronLeft className="h-4 w-4" />
          Tableros
        </button>
        <div className="h-5 w-1.5" style={{ backgroundColor: tablero.color }} />
        <h3 className="text-lg font-semibold text-white">{tablero.nombre}</h3>
        <button
          className="text-slate-500 transition hover:text-white"
          onClick={onEditarTablero}
          title="Editar tablero"
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className={BTN_GHOST} disabled={descargando} onClick={descargarWord} type="button">
            <FileDown className="h-4 w-4" />
            {descargando ? "Generando..." : "Word"}
          </button>
          <button
            className={BTN_PRIMARY}
            onClick={() => {
              if (!grupos.length) {
                setGrupoEnEdicion("nuevo");
                return;
              }
              crearItem(grupos[0].id, "Nuevo pendiente");
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Nuevo pendiente
          </button>
        </div>
      </div>

      {tablero.descripcion ? <p className="text-sm text-slate-400">{tablero.descripcion}</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metrica etiqueta="Pendientes" valor={total} />
        <Metrica color="#00c875" etiqueta="Listos" valor={listos} />
        <Metrica color="#fdab3d" etiqueta="En proceso" valor={enProceso} />
        <Metrica color="#e2445c" etiqueta="Vencidos" valor={vencidos} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <div className="flex">
          {VISTAS.map((opcion) => {
            const Icono = opcion.icono;
            return (
              <button
                className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-semibold transition ${
                  vista === opcion.valor
                    ? "border-emerald-300 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                key={opcion.valor}
                onClick={() => setVista(opcion.valor)}
                type="button"
              >
                <Icono className="h-4 w-4" />
                <span className="hidden sm:inline">{opcion.label}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-white/10 bg-white/8 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              className="w-32 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:w-44"
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar"
              value={busqueda}
            />
            {busqueda ? (
              <button className="text-slate-500 hover:text-white" onClick={() => setBusqueda("")} type="button">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <button
            className={`${BTN_GHOST} ${hayFiltros ? "border-emerald-300/50 text-emerald-100" : ""}`}
            onClick={(evento) => {
              setDisparadorFiltros(evento.currentTarget);
              setMenuFiltros(true);
            }}
            type="button"
          >
            <ListFilter className="h-4 w-4" />
            Filtros
          </button>

          <button
            className={BTN_GHOST}
            onClick={(evento) => {
              setDisparadorOrden(evento.currentTarget);
              setMenuOrden(true);
            }}
            type="button"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">
              {orden === "manual"
                ? "Manual"
                : orden === "fecha"
                  ? "Fecha"
                  : orden === "prioridad"
                    ? "Prioridad"
                    : orden === "estado"
                      ? "Estado"
                      : "A-Z"}
            </span>
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {cargando ? (
        <p className="text-sm text-slate-300">Cargando tablero...</p>
      ) : vista === "tabla" ? (
        <VistaTabla
          acciones={acciones}
          grupos={grupos}
          itemsPorGrupo={itemsPorGrupo}
          onEditarGrupo={setGrupoEnEdicion}
          onEliminarGrupo={setGrupoAEliminar}
          onNuevoGrupo={() => setGrupoEnEdicion("nuevo")}
          onRenombrarGrupo={renombrarGrupo}
          onToggleColapso={alternarColapso}
        />
      ) : vista === "kanban" ? (
        <VistaKanban acciones={acciones} grupos={grupos} items={visibles} />
      ) : vista === "calendario" ? (
        <VistaCalendario acciones={acciones} items={visibles} />
      ) : (
        <VistaCronograma acciones={acciones} grupos={grupos} items={visibles} />
      )}

      {orden !== "manual" && vista === "tabla" ? (
        <p className="text-xs text-slate-500">
          El tablero está ordenado automáticamente; vuelve a &quot;Manual&quot; para reordenar arrastrando.
        </p>
      ) : null}

      {/* Barra de acciones en lote, fija abajo como en Monday */}
      {seleccion.size ? (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 border border-emerald-300/40 bg-slate-950/95 p-2 backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center bg-emerald-300 text-sm font-bold text-slate-950">
            {seleccion.size}
          </span>
          <span className="text-sm font-semibold text-slate-200">
            {seleccion.size === 1 ? "pendiente seleccionado" : "pendientes seleccionados"}
          </span>

          <button className={BTN_GHOST} onClick={() => void aplicarLote({ estado: "listo" })} type="button">
            Marcar listo
          </button>
          <button
            className={BTN_GHOST}
            onClick={(evento) => {
              setDisparadorLote(evento.currentTarget);
              setMenuLote("estado");
            }}
            type="button"
          >
            Cambiar estado
          </button>
          <button
            className={BTN_GHOST}
            onClick={(evento) => {
              setDisparadorLote(evento.currentTarget);
              setMenuLote("grupo");
            }}
            type="button"
          >
            Mover a grupo
          </button>
          <button
            className="inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300"
            onClick={() => void eliminarLote()}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
          <button
            className="ml-auto text-sm font-semibold text-slate-400 transition hover:text-white"
            onClick={() => setSeleccion(new Set())}
            type="button"
          >
            Limpiar
          </button>

          {menuLote ? (
            <MenuAnclado ancho={220} onClose={() => setMenuLote(null)} trigger={disparadorLote}>
              {menuLote === "estado"
                ? ESTADOS.map((estado) => (
                    <button
                      className="mb-1 flex w-full items-center px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                      key={estado.valor}
                      onClick={() => void aplicarLote({ estado: estado.valor })}
                      style={{ backgroundColor: estado.color, color: estado.texto }}
                      type="button"
                    >
                      {estado.label}
                    </button>
                  ))
                : grupos.map((grupo) => (
                    <OpcionMenu key={grupo.id} onClick={() => void aplicarLote({ grupo_id: grupo.id })}>
                      <span className="h-3 w-1.5" style={{ backgroundColor: grupo.color }} />
                      {grupo.nombre}
                    </OpcionMenu>
                  ))}
            </MenuAnclado>
          ) : null}
        </div>
      ) : null}

      {menuFiltros ? (
        <MenuAnclado ancho={260} onClose={() => setMenuFiltros(false)} trigger={disparadorFiltros}>
          <div className="grid gap-3 p-2">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Estado</p>
              <div className="grid gap-1">
                {ESTADOS.map((estado) => (
                  <label className="flex items-center gap-2 text-sm text-slate-200" key={estado.valor}>
                    <input
                      checked={filtroEstados.includes(estado.valor)}
                      className="h-3.5 w-3.5 accent-emerald-400"
                      onChange={(evento) =>
                        setFiltroEstados((previos) =>
                          evento.target.checked
                            ? [...previos, estado.valor]
                            : previos.filter((valor) => valor !== estado.valor),
                        )
                      }
                      type="checkbox"
                    />
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: estado.color }} />
                    {estado.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Prioridad</p>
              <div className="grid gap-1">
                {PRIORIDADES.map((prioridad) => (
                  <label className="flex items-center gap-2 text-sm text-slate-200" key={prioridad.valor}>
                    <input
                      checked={filtroPrioridades.includes(prioridad.valor)}
                      className="h-3.5 w-3.5 accent-emerald-400"
                      onChange={(evento) =>
                        setFiltroPrioridades((previos) =>
                          evento.target.checked
                            ? [...previos, prioridad.valor]
                            : previos.filter((valor) => valor !== prioridad.valor),
                        )
                      }
                      type="checkbox"
                    />
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: prioridad.color }} />
                    {prioridad.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Responsable</p>
              <select
                className={INPUT}
                onChange={(evento) => setFiltroResponsable(evento.target.value)}
                value={filtroResponsable}
              >
                <option value="">Todos</option>
                {responsables.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                checked={ocultarListos}
                className="h-3.5 w-3.5 accent-emerald-400"
                onChange={(evento) => setOcultarListos(evento.target.checked)}
                type="checkbox"
              />
              Ocultar los que ya están listos
            </label>

            {hayFiltros ? (
              <button
                className="w-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30"
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstados([]);
                  setFiltroPrioridades([]);
                  setFiltroResponsable("");
                  setOcultarListos(false);
                }}
                type="button"
              >
                Quitar filtros
              </button>
            ) : null}
          </div>
        </MenuAnclado>
      ) : null}

      {menuOrden ? (
        <MenuAnclado ancho={220} onClose={() => setMenuOrden(false)} trigger={disparadorOrden}>
          {(
            [
              ["manual", "Manual (arrastrando)"],
              ["fecha", "Fecha límite"],
              ["prioridad", "Prioridad"],
              ["estado", "Estado"],
              ["alfabetico", "Alfabético"],
            ] as Array<[Orden, string]>
          ).map(([valor, label]) => (
            <OpcionMenu
              key={valor}
              onClick={() => {
                setOrden(valor);
                setMenuOrden(false);
              }}
            >
              {orden === valor ? "• " : ""}
              {label}
            </OpcionMenu>
          ))}
        </MenuAnclado>
      ) : null}

      {grupoEnEdicion ? (
        <FormularioGrupo
          grupo={grupoEnEdicion === "nuevo" ? null : grupoEnEdicion}
          onCerrar={() => setGrupoEnEdicion(null)}
          onGuardar={guardarGrupo}
        />
      ) : null}

      {itemActual ? (
        <ItemPanel
          acciones={acciones}
          grupos={grupos}
          item={itemActual}
          onCambioActualizaciones={() => void recargarConteo()}
          onCerrar={() => setItemAbierto(null)}
        />
      ) : null}

      <ConfirmDialog
        message={`Se eliminará el grupo "${grupoAEliminar?.nombre ?? ""}" y todos sus pendientes. Esta acción no se puede deshacer.`}
        onCancel={() => setGrupoAEliminar(null)}
        onConfirm={() => void confirmarEliminarGrupo()}
        open={Boolean(grupoAEliminar)}
        title="Eliminar grupo"
      />

      <ConfirmDialog
        message={`Se eliminará "${itemAEliminar?.titulo ?? ""}" con sus subtareas y actualizaciones.`}
        onCancel={() => setItemAEliminar(null)}
        onConfirm={() => void confirmarEliminarItem()}
        open={Boolean(itemAEliminar)}
        title="Eliminar pendiente"
      />
    </div>
  );
}

function Metrica({ color, etiqueta, valor }: { color?: string; etiqueta: string; valor: number }) {
  return (
    <div className="border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="text-xl font-bold" style={{ color: color ?? "#e2e8f0" }}>
        {valor}
      </p>
    </div>
  );
}

function FormularioGrupo({
  grupo,
  onCerrar,
  onGuardar,
}: {
  grupo: GrupoRow | null;
  onCerrar: () => void;
  onGuardar: (nombre: string, color: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(grupo?.nombre ?? "");
  const [color, setColor] = useState(grupo?.color ?? COLORES_GRUPO[0]);
  const [guardando, setGuardando] = useState(false);

  return (
    <Modal ancho="max-w-md" onClose={onCerrar} titulo={grupo ? "Editar grupo" : "Nuevo grupo"}>
      <form
        className="grid gap-4"
        onSubmit={async (evento) => {
          evento.preventDefault();
          if (!nombre.trim()) return;
          setGuardando(true);
          await onGuardar(nombre.trim(), color);
          setGuardando(false);
        }}
      >
        <Field label="Nombre del grupo">
          <input
            autoFocus
            className={INPUT}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="Ej. Esta semana"
            value={nombre}
          />
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORES_GRUPO.map((opcion) => (
              <button
                className={`h-7 w-7 border-2 transition ${color === opcion ? "border-white" : "border-transparent"}`}
                key={opcion}
                onClick={() => setColor(opcion)}
                style={{ backgroundColor: opcion }}
                type="button"
              />
            ))}
          </div>
        </Field>

        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cancelar
          </button>
          <button className={BTN_PRIMARY} disabled={guardando || !nombre.trim()} type="submit">
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
