"use client";

import {
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { ESTADOS, PRIORIDADES, estadoInfo, type GrupoRow, type ItemRow } from "@/lib/iglesia/types";
import { MenuAnclado, OpcionMenu } from "../ui";
import { CeldaFecha, CeldaResponsable, CeldaTexto, SelectorPastilla } from "./celdas";
import type { AccionesTablero } from "./tipos";

// Rejilla compartida por el encabezado y las filas para que las columnas
// queden alineadas sin usar una <table> (que complica el arrastre).
const COLUMNAS = "grid-cols-[28px_28px_minmax(200px,1fr)_150px_170px_130px_120px_40px_32px]";

type Destino = { grupoId: string; indice: number } | null;

export function VistaTabla({
  acciones,
  grupos,
  itemsPorGrupo,
  onEditarGrupo,
  onEliminarGrupo,
  onNuevoGrupo,
  onRenombrarGrupo,
  onToggleColapso,
}: {
  acciones: AccionesTablero;
  grupos: GrupoRow[];
  itemsPorGrupo: Record<string, ItemRow[]>;
  onEditarGrupo: (grupo: GrupoRow) => void;
  onEliminarGrupo: (grupo: GrupoRow) => void;
  onNuevoGrupo: () => void;
  onRenombrarGrupo: (grupo: GrupoRow, nombre: string) => void;
  onToggleColapso: (grupo: GrupoRow) => void;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [destino, setDestino] = useState<Destino>(null);

  const soltar = (grupoId: string, indice: number) => {
    if (arrastrando) acciones.moverItem(arrastrando, grupoId, indice);
    setArrastrando(null);
    setDestino(null);
  };

  return (
    <div className="grid gap-6">
      {grupos.map((grupo) => {
        const items = itemsPorGrupo[grupo.id] ?? [];
        return (
          <GrupoTabla
            acciones={acciones}
            arrastrando={arrastrando}
            destino={destino}
            grupo={grupo}
            items={items}
            key={grupo.id}
            onArrastrar={setArrastrando}
            onDestino={setDestino}
            onEditarGrupo={onEditarGrupo}
            onEliminarGrupo={onEliminarGrupo}
            onRenombrarGrupo={onRenombrarGrupo}
            onSoltar={soltar}
            onToggleColapso={onToggleColapso}
          />
        );
      })}

      <button
        className="flex w-fit items-center gap-2 border border-dashed border-white/20 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-300/50 hover:text-white"
        onClick={onNuevoGrupo}
        type="button"
      >
        <Plus className="h-4 w-4" />
        Agregar grupo
      </button>
    </div>
  );
}

function GrupoTabla({
  acciones,
  arrastrando,
  destino,
  grupo,
  items,
  onArrastrar,
  onDestino,
  onEditarGrupo,
  onEliminarGrupo,
  onRenombrarGrupo,
  onSoltar,
  onToggleColapso,
}: {
  acciones: AccionesTablero;
  arrastrando: string | null;
  destino: Destino;
  grupo: GrupoRow;
  items: ItemRow[];
  onArrastrar: (id: string | null) => void;
  onDestino: (destino: Destino) => void;
  onEditarGrupo: (grupo: GrupoRow) => void;
  onEliminarGrupo: (grupo: GrupoRow) => void;
  onRenombrarGrupo: (grupo: GrupoRow, nombre: string) => void;
  onSoltar: (grupoId: string, indice: number) => void;
  onToggleColapso: (grupo: GrupoRow) => void;
}) {
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuTrigger, setMenuTrigger] = useState<HTMLElement | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const listos = items.filter((item) => item.estado === "listo").length;
  const progreso = items.length ? Math.round((listos / items.length) * 100) : 0;

  return (
    <section>
      <div className="flex items-center gap-2">
        <button
          className="text-slate-400 transition hover:text-white"
          onClick={() => onToggleColapso(grupo)}
          title={grupo.colapsado ? "Expandir grupo" : "Colapsar grupo"}
          type="button"
        >
          {grupo.colapsado ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="h-4 w-1.5" style={{ backgroundColor: grupo.color }} />

        <CeldaTexto
          className="w-auto! min-w-[120px] text-base font-bold"
          onChange={(valor) => valor && onRenombrarGrupo(grupo, valor)}
          valor={grupo.nombre}
        />
        <span className="text-xs font-semibold text-slate-500">
          {items.length} {items.length === 1 ? "pendiente" : "pendientes"}
        </span>

        {items.length ? (
          <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <span className="w-28">
              <BarraEstados items={items} />
            </span>
            {progreso}% listo
          </span>
        ) : null}

        <button
          className="ml-auto text-slate-400 transition hover:text-white"
          onClick={(evento) => {
            setMenuTrigger(evento.currentTarget);
            setMenuAbierto(true);
          }}
          title="Opciones del grupo"
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuAbierto ? (
          <MenuAnclado ancho={210} onClose={() => setMenuAbierto(false)} trigger={menuTrigger}>
            <OpcionMenu
              onClick={() => {
                setMenuAbierto(false);
                onEditarGrupo(grupo);
              }}
            >
              Cambiar nombre y color
            </OpcionMenu>
            <OpcionMenu
              destructiva
              onClick={() => {
                setMenuAbierto(false);
                onEliminarGrupo(grupo);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar grupo
            </OpcionMenu>
          </MenuAnclado>
        ) : null}
      </div>

      {grupo.colapsado ? null : (
        <div className="mt-2 overflow-x-auto">
          <div className="min-w-[900px]">
            <div className={`grid ${COLUMNAS} items-center border-b border-white/10 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500`}>
              <span />
              <span />
              <span className="px-2">Pendiente</span>
              <span className="px-1.5">Responsable</span>
              <span className="px-2 text-center">Estado</span>
              <span className="px-2 text-center">Prioridad</span>
              <span className="px-1.5">Fecha límite</span>
              <span />
              <span />
            </div>

            {items.map((item, indice) => (
              <div key={item.id}>
                {destino && destino.grupoId === grupo.id && destino.indice === indice ? <LineaDestino /> : null}
                <FilaItem
                  acciones={acciones}
                  colorGrupo={grupo.color}
                  expandido={expandidos.has(item.id)}
                  item={item}
                  onArrastrar={onArrastrar}
                  onDestino={() => onDestino({ grupoId: grupo.id, indice })}
                  onExpandir={() =>
                    setExpandidos((prev) => {
                      const siguiente = new Set(prev);
                      if (siguiente.has(item.id)) siguiente.delete(item.id);
                      else siguiente.add(item.id);
                      return siguiente;
                    })
                  }
                  onSoltar={() => onSoltar(grupo.id, indice)}
                  seArrastra={arrastrando === item.id}
                />
              </div>
            ))}

            <div
              className="min-h-[8px]"
              onDragOver={(evento) => {
                evento.preventDefault();
                onDestino({ grupoId: grupo.id, indice: items.length });
              }}
              onDrop={() => onSoltar(grupo.id, items.length)}
            >
              {destino && destino.grupoId === grupo.id && destino.indice === items.length ? <LineaDestino /> : null}
            </div>

            <form
              className={`grid ${COLUMNAS} items-center border-b border-white/5`}
              onSubmit={(evento) => {
                evento.preventDefault();
                const limpio = nuevoTitulo.trim();
                if (!limpio) return;
                acciones.crearItem(grupo.id, limpio);
                setNuevoTitulo("");
              }}
            >
              <span />
              <span className="flex justify-center text-slate-600">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <input
                className="col-span-7 w-full border border-transparent bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/40"
                onChange={(evento) => setNuevoTitulo(evento.target.value)}
                placeholder="Agregar pendiente y presionar Enter"
                value={nuevoTitulo}
              />
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function LineaDestino() {
  return <div className="h-0.5 bg-emerald-300" />;
}

function FilaItem({
  acciones,
  colorGrupo,
  expandido,
  item,
  onArrastrar,
  onDestino,
  onExpandir,
  onSoltar,
  seArrastra,
}: {
  acciones: AccionesTablero;
  colorGrupo: string;
  expandido: boolean;
  item: ItemRow;
  onArrastrar: (id: string | null) => void;
  onDestino: () => void;
  onExpandir: () => void;
  onSoltar: () => void;
  seArrastra: boolean;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuTrigger, setMenuTrigger] = useState<HTMLElement | null>(null);
  const [nuevoSub, setNuevoSub] = useState("");
  const subitems = acciones.subitemsDe(item.id);
  const comentarios = acciones.conteoActualizaciones[item.id] ?? 0;
  const seleccionado = acciones.seleccion.has(item.id);

  return (
    <>
      <div
        className={`grid ${COLUMNAS} items-center border-b border-white/5 transition ${
          seArrastra ? "opacity-40" : "hover:bg-white/4"
        } ${seleccionado ? "bg-emerald-300/8" : ""}`}
        draggable
        onDragEnd={() => onArrastrar(null)}
        onDragOver={(evento) => {
          evento.preventDefault();
          onDestino();
        }}
        onDragStart={() => onArrastrar(item.id)}
        onDrop={onSoltar}
      >
        <div className="flex items-center gap-0.5 pl-0.5">
          <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-600" />
        </div>

        <div className="flex items-center justify-center">
          <input
            checked={seleccionado}
            className="h-3.5 w-3.5 accent-emerald-400"
            onChange={(evento) => acciones.alternarSeleccion(item.id, evento.target.checked)}
            type="checkbox"
          />
        </div>

        <div className="flex min-w-0 items-center gap-1 border-l-4 pl-1" style={{ borderColor: colorGrupo }}>
          <button
            className={`shrink-0 transition ${subitems.length ? "text-slate-400 hover:text-white" : "text-slate-700"}`}
            onClick={onExpandir}
            title={subitems.length ? "Ver subtareas" : "Agregar subtareas"}
            type="button"
          >
            {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <CeldaTexto
            className={item.estado === "listo" ? "text-slate-400 line-through" : ""}
            onChange={(valor) => valor && acciones.actualizarItem(item.id, { titulo: valor })}
            valor={item.titulo}
          />
          {subitems.length ? (
            <span className="shrink-0 border border-white/10 px-1 text-[10px] font-bold text-slate-400">
              {subitems.filter((sub) => sub.estado === "listo").length}/{subitems.length}
            </span>
          ) : null}
        </div>

        <div className="px-0.5">
          <CeldaResponsable
            onChange={(valor) => acciones.actualizarItem(item.id, { responsable: valor })}
            sugerencias={acciones.responsables}
            valor={item.responsable}
          />
        </div>

        <div className="px-1">
          <SelectorPastilla
            onChange={(valor) => acciones.actualizarItem(item.id, { estado: valor })}
            opciones={ESTADOS}
            valor={item.estado}
          />
        </div>

        <div className="px-1">
          <SelectorPastilla
            onChange={(valor) => acciones.actualizarItem(item.id, { prioridad: valor })}
            opciones={PRIORIDADES}
            valor={item.prioridad}
          />
        </div>

        <div className="px-0.5">
          <CeldaFecha
            estaListo={item.estado === "listo"}
            onChange={(valor) => acciones.actualizarItem(item.id, { fecha_limite: valor })}
            valor={item.fecha_limite}
          />
        </div>

        <button
          className="flex items-center justify-center gap-0.5 text-slate-500 transition hover:text-emerald-200"
          onClick={() => acciones.abrirItem(item.id)}
          title="Abrir actualizaciones"
          type="button"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {comentarios ? <span className="text-[10px] font-bold">{comentarios}</span> : null}
        </button>

        <button
          className="flex justify-center text-slate-500 transition hover:text-white"
          onClick={(evento) => {
            setMenuTrigger(evento.currentTarget);
            setMenuAbierto(true);
          }}
          title="Opciones"
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuAbierto ? (
          <MenuAnclado ancho={210} onClose={() => setMenuAbierto(false)} trigger={menuTrigger}>
            <OpcionMenu
              onClick={() => {
                setMenuAbierto(false);
                acciones.abrirItem(item.id);
              }}
            >
              Abrir detalle
            </OpcionMenu>
            <OpcionMenu
              onClick={() => {
                setMenuAbierto(false);
                acciones.duplicar(item.id);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicar
            </OpcionMenu>
            <OpcionMenu
              destructiva
              onClick={() => {
                setMenuAbierto(false);
                acciones.eliminarItem(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </OpcionMenu>
          </MenuAnclado>
        ) : null}
      </div>

      {expandido ? (
        <div className="border-b border-white/5 bg-white/3 py-1 pl-10">
          {subitems.map((sub) => (
            <div className="grid grid-cols-[minmax(160px,1fr)_150px_130px_40px] items-center gap-2 py-0.5" key={sub.id}>
              <CeldaTexto
                className={sub.estado === "listo" ? "text-slate-400 line-through" : ""}
                onChange={(valor) => valor && acciones.actualizarItem(sub.id, { titulo: valor })}
                valor={sub.titulo}
              />
              <CeldaResponsable
                onChange={(valor) => acciones.actualizarItem(sub.id, { responsable: valor })}
                sugerencias={acciones.responsables}
                valor={sub.responsable}
              />
              <SelectorPastilla
                compacto
                onChange={(valor) => acciones.actualizarItem(sub.id, { estado: valor })}
                opciones={ESTADOS}
                valor={sub.estado}
              />
              <button
                className="flex justify-center text-slate-600 transition hover:text-red-300"
                onClick={() => acciones.eliminarItem(sub.id)}
                title="Eliminar subtarea"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              const limpio = nuevoSub.trim();
              if (!limpio) return;
              acciones.crearSubitem(item, limpio);
              setNuevoSub("");
            }}
          >
            <input
              className="w-full max-w-md border border-transparent bg-transparent px-2 py-1 text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
              data-subitem-de={item.id}
              onChange={(evento) => setNuevoSub(evento.target.value)}
              placeholder="+ Agregar subtarea"
              value={nuevoSub}
            />
          </form>
        </div>
      ) : null}
    </>
  );
}

/** Resumen de estados de una lista de items (barra apilada del pie del grupo). */
export function BarraEstados({ items }: { items: ItemRow[] }) {
  if (!items.length) return null;
  return (
    <span className="flex h-2 w-full overflow-hidden">
      {ESTADOS.map((estado) => {
        const cantidad = items.filter((item) => item.estado === estado.valor).length;
        if (!cantidad) return null;
        return (
          <span
            key={estado.valor}
            style={{ backgroundColor: estadoInfo(estado.valor).color, width: `${(cantidad / items.length) * 100}%` }}
            title={`${estado.label}: ${cantidad}`}
          />
        );
      })}
    </span>
  );
}
