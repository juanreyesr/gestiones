"use client";

import { CalendarDays, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { formatoCorto } from "@/lib/fechas";
import { ESTADOS, prioridadInfo, type GrupoRow, type ItemRow } from "@/lib/pendientes/types";
import { Avatar, Pastilla } from "@/components/ui-comun";
import type { AccionesTablero } from "./tipos";

/**
 * Kanban por estado. Arrastrar una tarjeta a otra columna cambia su estado,
 * que es la forma en que Monday relaciona su vista de tablero con la columna
 * de estado de la tabla: es la misma informacion vista de otro modo.
 */
export function VistaKanban({
  acciones,
  grupos,
  items,
}: {
  acciones: AccionesTablero;
  grupos: GrupoRow[];
  items: ItemRow[];
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null);
  const [nuevoEn, setNuevoEn] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");

  const nombreGrupo = (grupoId: string) => grupos.find((grupo) => grupo.id === grupoId)?.nombre ?? "";
  const colorGrupo = (grupoId: string) => grupos.find((grupo) => grupo.id === grupoId)?.color ?? "#7e8397";

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {ESTADOS.map((estado) => {
        const columna = items.filter((item) => item.estado === estado.valor);
        return (
          <div
            className={`flex w-[270px] shrink-0 flex-col border transition ${
              columnaActiva === estado.valor ? "border-emerald-300/60 bg-emerald-300/5" : "border-white/10 bg-white/4"
            }`}
            key={estado.valor}
            onDragLeave={() => setColumnaActiva((previo) => (previo === estado.valor ? null : previo))}
            onDragOver={(evento) => {
              evento.preventDefault();
              setColumnaActiva(estado.valor);
            }}
            onDrop={() => {
              if (arrastrando) acciones.actualizarItem(arrastrando, { estado: estado.valor });
              setArrastrando(null);
              setColumnaActiva(null);
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b-4 px-3 py-2" style={{ borderColor: estado.color }}>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-200">{estado.label}</span>
              <span className="text-xs font-bold text-slate-500">{columna.length}</span>
            </div>

            <div className="flex flex-col gap-2 p-2">
              {columna.map((item) => (
                <article
                  className="cursor-grab border border-white/10 bg-slate-950/70 p-2.5 transition hover:border-emerald-300/40"
                  draggable
                  key={item.id}
                  onClick={() => acciones.abrirItem(item.id)}
                  onDragEnd={() => setArrastrando(null)}
                  onDragStart={() => setArrastrando(item.id)}
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0" style={{ backgroundColor: colorGrupo(item.grupo_id) }} />
                    <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {nombreGrupo(item.grupo_id)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold leading-snug text-slate-100">{item.titulo}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.prioridad !== "sin_definir" ? (
                      <Pastilla
                        color={prioridadInfo(item.prioridad).color}
                        texto={prioridadInfo(item.prioridad).texto}
                        titulo={prioridadInfo(item.prioridad).label}
                      />
                    ) : null}
                    {item.fecha_limite ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <CalendarDays className="h-3 w-3" />
                        {formatoCorto(item.fecha_limite)}
                      </span>
                    ) : null}
                    {acciones.conteoActualizaciones[item.id] ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <MessageSquare className="h-3 w-3" />
                        {acciones.conteoActualizaciones[item.id]}
                      </span>
                    ) : null}
                    {item.responsable ? <Avatar nombre={item.responsable} size={20} /> : null}
                  </div>
                </article>
              ))}

              {nuevoEn === estado.valor ? (
                <form
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    const limpio = titulo.trim();
                    if (!limpio || !grupos.length) return;
                    acciones.crearItem(grupos[0].id, limpio, { estado: estado.valor });
                    setTitulo("");
                    setNuevoEn(null);
                  }}
                >
                  <input
                    autoFocus
                    className="w-full border border-emerald-300/50 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none"
                    onBlur={() => setNuevoEn(null)}
                    onChange={(evento) => setTitulo(evento.target.value)}
                    placeholder="Título del pendiente"
                    value={titulo}
                  />
                </form>
              ) : (
                <button
                  className="flex items-center gap-1.5 px-1 py-1 text-xs font-semibold text-slate-500 transition hover:text-emerald-200"
                  onClick={() => {
                    setTitulo("");
                    setNuevoEn(estado.valor);
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
