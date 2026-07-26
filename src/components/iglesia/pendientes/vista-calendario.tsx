"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { fechaISO } from "@/lib/iglesia/fechas";
import { estadoInfo, type ItemRow } from "@/lib/iglesia/types";
import type { AccionesTablero } from "./tipos";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Rejilla del mes empezando en lunes, incluyendo el relleno de los extremos. */
function diasDelMes(ancla: Date) {
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
  const desplazamiento = (primero.getDay() + 6) % 7; // lunes = 0
  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - desplazamiento);

  return Array.from({ length: 42 }, (_, indice) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + indice);
    return dia;
  });
}

/**
 * Calendario por fecha limite. Arrastrar una tarjeta a otro dia reprograma el
 * pendiente: es la operacion que mas se hace en una agenda de iglesia (se
 * mueve una visita, se corre una reunion) y evita abrir el detalle.
 */
export function VistaCalendario({ acciones, items }: { acciones: AccionesTablero; items: ItemRow[] }) {
  const [ancla, setAncla] = useState(() => new Date());
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [diaActivo, setDiaActivo] = useState<string | null>(null);

  const dias = diasDelMes(ancla);
  const hoy = fechaISO(new Date());
  const sinFecha = items.filter((item) => !item.fecha_limite);

  const porDia = items.reduce<Record<string, ItemRow[]>>((acumulado, item) => {
    if (!item.fecha_limite) return acumulado;
    (acumulado[item.fecha_limite] ??= []).push(item);
    return acumulado;
  }, {});

  const mover = (clave: string) => {
    if (arrastrando) acciones.actualizarItem(arrastrando, { fecha_limite: clave });
    setArrastrando(null);
    setDiaActivo(null);
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            className="border border-white/10 bg-white/8 p-1.5 text-slate-200 transition hover:border-white/30"
            onClick={() => setAncla(new Date(ancla.getFullYear(), ancla.getMonth() - 1, 1))}
            title="Mes anterior"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="border border-white/10 bg-white/8 p-1.5 text-slate-200 transition hover:border-white/30"
            onClick={() => setAncla(new Date(ancla.getFullYear(), ancla.getMonth() + 1, 1))}
            title="Mes siguiente"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-bold capitalize text-white">
            {new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(ancla)}
          </span>
        </div>
        <button
          className="text-xs font-semibold text-slate-400 transition hover:text-white"
          onClick={() => setAncla(new Date())}
          type="button"
        >
          Ir a hoy
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-white/10 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {DIAS.map((dia) => (
              <span className="px-2" key={dia}>
                {dia}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {dias.map((dia) => {
              const clave = fechaISO(dia);
              const delMes = dia.getMonth() === ancla.getMonth();
              const delDia = porDia[clave] ?? [];

              return (
                <div
                  className={`min-h-[104px] border-b border-r border-white/8 p-1.5 transition ${
                    delMes ? "" : "bg-black/20 opacity-50"
                  } ${diaActivo === clave ? "bg-emerald-300/10" : ""}`}
                  key={clave}
                  onDragOver={(evento) => {
                    evento.preventDefault();
                    setDiaActivo(clave);
                  }}
                  onDrop={() => mover(clave)}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        clave === hoy ? "bg-emerald-300 px-1.5 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                  </div>

                  <div className="grid gap-1">
                    {delDia.map((item) => (
                      <button
                        className="w-full truncate border-l-2 bg-white/8 px-1.5 py-1 text-left text-[11px] font-semibold text-slate-100 transition hover:bg-white/15"
                        draggable
                        key={item.id}
                        onClick={() => acciones.abrirItem(item.id)}
                        onDragEnd={() => setArrastrando(null)}
                        onDragStart={() => setArrastrando(item.id)}
                        style={{ borderColor: estadoInfo(item.estado).color }}
                        title={item.titulo}
                        type="button"
                      >
                        {item.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sinFecha.length ? (
        <div className="border border-white/10 bg-white/4 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Sin fecha ({sinFecha.length}) — arrástralos a un día para programarlos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sinFecha.map((item) => (
              <button
                className="cursor-grab border-l-2 bg-white/8 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/15"
                draggable
                key={item.id}
                onClick={() => acciones.abrirItem(item.id)}
                onDragEnd={() => setArrastrando(null)}
                onDragStart={() => setArrastrando(item.id)}
                style={{ borderColor: estadoInfo(item.estado).color }}
                type="button"
              >
                {item.titulo}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
