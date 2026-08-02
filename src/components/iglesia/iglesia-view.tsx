"use client";

import { CalendarHeart, CalendarRange, ChevronLeft, ChevronRight, Church, ClipboardList, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchEventos } from "@/lib/iglesia/eventos";
import { hoyISO } from "@/lib/fechas";
import { EventosView } from "./eventos/eventos-view";
import { PredicasView } from "./predicas/predicas-view";
import { ProtocolosView } from "./protocolos/protocolos-view";

type Recurso = "predicas" | "eventos" | "protocolos";

const RECURSOS: Array<{
  clave: Recurso;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
  color: string;
  titulo: string;
}> = [
  {
    clave: "predicas",
    titulo: "Prédicas del mes",
    descripcion:
      "Calendario mensual de predicadores: las tres celebraciones de cada domingo y la del martes, con catálogo de predicadores, aviso de repeticiones y exportación a Excel.",
    icono: CalendarRange,
    color: "#6d5bd0",
  },
  {
    clave: "protocolos",
    titulo: "Protocolos para actividades",
    descripcion:
      "El paso a paso de cada actividad, con formato y listas. Se abre a pantalla completa y con el texto tan grande como haga falta para seguirlo en vivo.",
    icono: ClipboardList,
    color: "#0086c0",
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
 *
 * La gestion de pendientes vivio aqui en su primera version, pero sirve para
 * cualquier area (clinica, cursos, coordinacion), asi que se movio al menu
 * principal como area propia. Los eventos si pueden generar pendientes desde
 * su detalle, y ese puente sigue funcionando.
 */
export function IglesiaView() {
  const [recurso, setRecurso] = useState<Recurso | null>(null);
  const [proximos, setProximos] = useState(0);

  const cargarResumen = useCallback(async () => {
    const hoy = hoyISO();
    const { data } = await fetchEventos();
    setProximos(data.filter((evento) => evento.fecha >= hoy).length);
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
          <span className="font-semibold text-white">{RECURSOS.find((item) => item.clave === recurso)?.titulo}</span>
        </nav>

        {recurso === "predicas" ? <PredicasView /> : recurso === "protocolos" ? <ProtocolosView /> : <EventosView />}
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

          return (
            <button
              className="group border border-white/10 bg-white/8 p-5 text-left backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12"
              key={item.clave}
              onClick={() => setRecurso(item.clave)}
              type="button"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center" style={{ backgroundColor: item.color }}>
                <Icono className="h-5 w-5 text-slate-950" />
              </span>
              <h3 className="text-lg font-semibold text-white">{item.titulo}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{item.descripcion}</p>
              {item.clave === "eventos" ? (
                <p className="mt-3 text-xs font-semibold text-emerald-200">{proximos} eventos próximos</p>
              ) : null}
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
