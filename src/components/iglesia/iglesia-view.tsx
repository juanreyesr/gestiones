"use client";

import { CalendarHeart, ChevronLeft, ChevronRight, Church, ListChecks, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchEventos } from "@/lib/iglesia/eventos";
import { hoyISO } from "@/lib/iglesia/fechas";
import { fetchItemsPendientes } from "@/lib/iglesia/items";
import { EventosView } from "./eventos/eventos-view";
import { PendientesView } from "./pendientes/pendientes-view";

type Recurso = "pendientes" | "eventos";

const RECURSOS: Array<{
  clave: Recurso;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
  color: string;
  titulo: string;
}> = [
  {
    clave: "pendientes",
    titulo: "Gestión de pendientes",
    descripcion:
      "Tableros de tareas y proyectos con grupos, estados, responsables, fechas y subtareas. Vistas de tabla, kanban, calendario y cronograma.",
    icono: ListChecks,
    color: "#00c875",
  },
  {
    clave: "eventos",
    titulo: "Bodas, cumpleaños y eventos",
    descripcion:
      "Bodas, matrimonios, bautizos, quince años, funerales y más: participantes, programa y descarga de la constancia en Word.",
    icono: CalendarHeart,
    color: "#a25ddc",
  },
];

/**
 * Portada del area Iglesia. Es deliberadamente una rejilla de "botones":
 * agregar un recurso nuevo mas adelante es anadir una entrada a RECURSOS y su
 * vista, sin tocar nada de lo que ya funciona.
 */
export function IglesiaView() {
  const [recurso, setRecurso] = useState<Recurso | null>(null);
  const [resumen, setResumen] = useState({ pendientes: 0, vencidos: 0, eventos: 0 });

  const cargarResumen = useCallback(async () => {
    const hoy = hoyISO();
    const [itemsRes, eventosRes] = await Promise.all([fetchItemsPendientes(), fetchEventos()]);
    setResumen({
      pendientes: itemsRes.data.length,
      vencidos: itemsRes.data.filter((item) => item.fecha_limite && item.fecha_limite < hoy).length,
      eventos: eventosRes.data.filter((evento) => evento.fecha >= hoy).length,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resumen de la portada del área
    void cargarResumen();
  }, [cargarResumen]);

  if (recurso) {
    return (
      <div className="grid gap-4">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm">
          <button
            className="inline-flex items-center gap-1 font-semibold text-slate-400 transition hover:text-emerald-200"
            onClick={() => {
              setRecurso(null);
              void cargarResumen();
            }}
            type="button"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Iglesia
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-semibold text-white">
            {RECURSOS.find((item) => item.clave === recurso)?.titulo}
          </span>
        </nav>

        {recurso === "pendientes" ? <PendientesView /> : <EventosView />}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
        <Church className="h-4 w-4" />
        Área Iglesia
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {RECURSOS.map((item) => {
          const Icono = item.icono;
          const contador =
            item.clave === "pendientes"
              ? `${resumen.pendientes} pendientes abiertos${resumen.vencidos ? ` · ${resumen.vencidos} vencidos` : ""}`
              : `${resumen.eventos} eventos próximos`;

          return (
            <button
              className="group border border-white/10 bg-white/8 p-5 text-left backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12"
              key={item.clave}
              onClick={() => setRecurso(item.clave)}
              type="button"
            >
              <span
                className="mb-3 flex h-11 w-11 items-center justify-center"
                style={{ backgroundColor: item.color }}
              >
                <Icono className="h-5 w-5 text-slate-950" />
              </span>
              <h3 className="text-lg font-semibold text-white">{item.titulo}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{item.descripcion}</p>
              <p className="mt-3 text-xs font-semibold text-emerald-200">{contador}</p>
            </button>
          );
        })}

        <div className="flex items-center gap-3 border border-dashed border-white/15 bg-white/3 p-5 text-sm text-slate-500">
          <Plus className="h-5 w-5 shrink-0" />
          Aquí se irán sumando los demás recursos del área (visitas, células, finanzas, membresía...).
        </div>
      </div>
    </div>
  );
}
