"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Circle, NotebookPen, Sparkles } from "lucide-react";
import { useState } from "react";
import type { SesionRow } from "@/lib/clinica/types";
import { formatoFechaLarga, formatoHora } from "@/lib/clinica/slots";

export function SesionDetalle({ sesion }: { sesion: SesionRow }) {
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const compromisos = sesion.compromisos.filter((item) => item.tipo === "compromiso");
  const tareas = sesion.compromisos.filter((item) => item.tipo === "tarea");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span className="font-semibold text-white">{formatoFechaLarga(sesion.iniciadaAt)}</span>
        <span>· {formatoHora(sesion.iniciadaAt)}</span>
        {sesion.modalidad ? (
          <span className="inline-flex border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {sesion.modalidad === "seguimiento" ? "Seguimiento" : "Tema específico"}
          </span>
        ) : null}
        {sesion.resumenOrigen === "ia" ? (
          <span className="inline-flex items-center gap-1 border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
            <Sparkles className="h-3 w-3" />
            Resumen con IA
          </span>
        ) : null}
      </div>

      {sesion.tema ? (
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Tema abordado</div>
          <p className="mt-1 text-sm leading-6 text-slate-200">{sesion.tema}</p>
        </div>
      ) : null}

      {sesion.resumen ? (
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Resumen de la sesión</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">{sesion.resumen}</p>
        </div>
      ) : null}

      {sesion.seguimiento ? (
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Aspectos a dar seguimiento</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">{sesion.seguimiento}</p>
        </div>
      ) : null}

      {compromisos.length > 0 || tareas.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {compromisos.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">Compromisos</div>
              <ul className="mt-1 grid gap-1">
                {compromisos.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm leading-6 text-slate-200">
                    {item.cumplido ? (
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                    ) : (
                      <Circle className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span className={item.cumplido ? "text-slate-400 line-through" : undefined}>{item.descripcion}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {tareas.length > 0 ? (
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">Tareas para la próxima sesión</div>
              <ul className="mt-1 grid gap-1">
                {tareas.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm leading-6 text-slate-200">
                    {item.cumplido ? (
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                    ) : (
                      <Circle className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span className={item.cumplido ? "text-slate-400 line-through" : undefined}>{item.descripcion}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {sesion.notas ? (
        <div>
          <button
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 transition hover:text-slate-200"
            onClick={() => setNotasAbiertas((prev) => !prev)}
            type="button"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Notas de la sesión
            {notasAbiertas ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {notasAbiertas ? (
            <p className="mt-2 whitespace-pre-wrap border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-300">
              {sesion.notas}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
