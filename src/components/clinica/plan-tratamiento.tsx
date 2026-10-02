"use client";

import { Ban, Check, ChevronDown, ChevronUp, ClipboardCheck, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { actualizarPropuestasSesion } from "@/lib/clinica/sesiones";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PropuestaClinica, SesionRow } from "@/lib/clinica/types";
import { SectionCard } from "./ui";

type Estado = NonNullable<PropuestaClinica["estado"]>;

type ItemPlan = PropuestaClinica & {
  sesionId: string;
  sesionFecha: string;
  indice: number;
  estadoActual: Estado;
};

const TIPO_LABEL: Record<PropuestaClinica["tipo"], string> = {
  tecnica: "Técnica",
  terapia: "Terapia",
  evaluacion: "Evaluación",
};

/**
 * Plan de tratamiento: reune las propuestas de la IA guardadas en todas las
 * sesiones del paciente para marcar cuales ya se aplicaron o se descartaron.
 */
export function PlanTratamiento({ onCambio, sesiones }: { onCambio: () => void; sesiones: SesionRow[] }) {
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [verCerradas, setVerCerradas] = useState(false);

  const items = useMemo<ItemPlan[]>(
    () =>
      sesiones.flatMap((sesion) =>
        sesion.propuestasIa.map((propuesta, indice) => ({
          ...propuesta,
          sesionId: sesion.id,
          sesionFecha: sesion.iniciadaAt,
          indice,
          estadoActual: propuesta.estado ?? "pendiente",
        })),
      ),
    [sesiones],
  );

  if (items.length === 0) {
    return (
      <SectionCard title="Plan de tratamiento">
        <p className="text-sm leading-6 text-slate-400">
          Aún no hay propuestas guardadas. Al cerrar una sesión usa «Sugerir seguimiento y técnicas (IA)» y deja
          marcadas las propuestas que quieras incluir en el plan.
        </p>
      </SectionCard>
    );
  }

  const pendientes = items.filter((item) => item.estadoActual === "pendiente");
  const aplicadas = items.filter((item) => item.estadoActual === "aplicada");
  const descartadas = items.filter((item) => item.estadoActual === "descartada");

  const cambiarEstado = async (item: ItemPlan, estado: Estado) => {
    const sesion = sesiones.find((s) => s.id === item.sesionId);
    if (!sesion) return;
    const clave = `${item.sesionId}-${item.indice}`;
    setGuardando(clave);
    setError("");
    const propuestas = sesion.propuestasIa.map((propuesta, indice) =>
      indice === item.indice
        ? { ...propuesta, estado, estadoAt: estado === "pendiente" ? null : new Date().toISOString() }
        : propuesta,
    );
    const { error: err } = await actualizarPropuestasSesion(sesion.id, propuestas);
    setGuardando(null);
    if (err) {
      setError(err);
      return;
    }
    onCambio();
  };

  const fila = (item: ItemPlan) => {
    const clave = `${item.sesionId}-${item.indice}`;
    const ocupado = guardando === clave;
    return (
      <li key={clave} className="grid gap-2 border border-white/10 bg-white/4 p-3">
        <div>
          <div className="text-sm leading-5 text-slate-100">
            <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-300">
              {TIPO_LABEL[item.tipo] ?? "Propuesta"}
            </span>
            <b className={`font-semibold ${item.estadoActual === "descartada" ? "text-slate-500 line-through" : "text-white"}`}>
              {item.nombre}
            </b>
          </div>
          {item.justificacion ? <p className="mt-0.5 text-xs leading-5 text-slate-400">{item.justificacion}</p> : null}
          <p className="mt-0.5 text-[11px] text-slate-500">
            Propuesta en la sesión del {formatoFechaCorta(item.sesionFecha)}
            {item.estadoAt && item.estadoActual !== "pendiente"
              ? ` · ${item.estadoActual === "aplicada" ? "aplicada" : "descartada"} el ${formatoFechaCorta(item.estadoAt)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.estadoActual === "pendiente" ? (
            <>
              <button
                className="inline-flex items-center gap-1.5 border border-emerald-300/50 bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-50"
                disabled={ocupado}
                onClick={() => void cambiarEstado(item, "aplicada")}
                type="button"
              >
                <Check className="h-3.5 w-3.5" />
                Aplicada
              </button>
              <button
                className="inline-flex items-center gap-1.5 border border-white/15 bg-white/8 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-white/30 disabled:opacity-50"
                disabled={ocupado}
                onClick={() => void cambiarEstado(item, "descartada")}
                type="button"
              >
                <Ban className="h-3.5 w-3.5" />
                Descartar
              </button>
            </>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
              disabled={ocupado}
              onClick={() => void cambiarEstado(item, "pendiente")}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Volver a pendiente
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <SectionCard
      action={
        <span className="text-xs font-semibold text-slate-400">
          {aplicadas.length} de {items.length - descartadas.length} aplicadas
        </span>
      }
      title="Plan de tratamiento"
    >
      <div className="grid gap-3">
        {error ? <div className="border border-red-400/40 bg-red-400/10 p-2 text-xs text-red-200">{error}</div> : null}
        {pendientes.length > 0 ? (
          <ul className="grid gap-2">{pendientes.map(fila)}</ul>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
            <ClipboardCheck className="h-4 w-4" />
            No hay propuestas pendientes.
          </p>
        )}
        {aplicadas.length + descartadas.length > 0 ? (
          <div>
            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400 transition hover:text-slate-200"
              onClick={() => setVerCerradas((prev) => !prev)}
              type="button"
            >
              Aplicadas ({aplicadas.length}) · Descartadas ({descartadas.length})
              {verCerradas ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {verCerradas ? <ul className="mt-2 grid gap-2">{[...aplicadas, ...descartadas].map(fila)}</ul> : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
