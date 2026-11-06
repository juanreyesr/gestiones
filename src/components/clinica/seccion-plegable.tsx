"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Secciones del expediente que se pliegan para que la ficha sea compacta.
 * - Cada sección recuerda en este dispositivo si la dejaste abierta.
 * - «Expandir todo / Contraer todo» y los atajos de «Antes de la próxima
 *   sesión» las abren con eventos (abrirSeccion / plegarTodas).
 */

const EVENTO_ABRIR = "gjj-expediente-abrir";
/** Abre el informe de una respuesta (lo escucha la sección de evaluaciones). */
export const EVENTO_ABRIR_RESPUESTA = "gjj-abrir-respuesta";
/** Algo de evaluaciones cambió (respuestas recargadas, alarma atendida…). */
export const EVENTO_EVALUACIONES_CAMBIO = "gjj-evaluaciones-cambio";
const EVENTO_TODAS = "gjj-expediente-todas";
const clave = (id: string) => `gjj-expediente-seccion-${id}`;

/** Abre una sección y la lleva a la vista. */
export function abrirSeccion(id: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: id }));
  setTimeout(() => document.getElementById(`seccion-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

/** Abre o cierra todas las secciones. */
export function plegarTodas(abiertas: boolean) {
  window.dispatchEvent(new CustomEvent(EVENTO_TODAS, { detail: abiertas }));
}

const leer = (id: string, porDefecto: boolean) => {
  try {
    const v = localStorage.getItem(clave(id));
    return v === null ? porDefecto : v === "1";
  } catch {
    return porDefecto;
  }
};

export type PlegableProps = {
  /** Identificador estable (también el ancla #seccion-<id>). */
  id: string;
  /** Resumen breve que se ve junto al título (abierta o cerrada). */
  resumen?: ReactNode;
  /** Estado inicial si nunca se ha tocado en este dispositivo. */
  abierta?: boolean;
  /** Lo que se ve con la sección cerrada (p. ej. la última sesión). */
  vistaCerrada?: ReactNode;
};

export function SeccionPlegable({
  abierta: abiertaPorDefecto = false,
  action,
  children,
  id,
  resumen,
  title,
  vistaCerrada,
}: PlegableProps & { action?: ReactNode; children: ReactNode; title: string }) {
  // Cerrada en el primer render (igual en servidor y cliente); luego se lee lo recordado.
  const [abierta, setAbierta] = useState(abiertaPorDefecto);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada en este dispositivo
    setAbierta(leer(id, abiertaPorDefecto));
  }, [id, abiertaPorDefecto]);

  const cambiar = (v: boolean) => {
    setAbierta(v);
    try {
      localStorage.setItem(clave(id), v ? "1" : "0");
    } catch {
      // sin almacenamiento local: solo no se recuerda
    }
  };

  useEffect(() => {
    const alAbrir = (e: Event) => (e as CustomEvent<string>).detail === id && cambiar(true);
    const alTodas = (e: Event) => cambiar((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENTO_ABRIR, alAbrir);
    window.addEventListener(EVENTO_TODAS, alTodas);
    return () => {
      window.removeEventListener(EVENTO_ABRIR, alAbrir);
      window.removeEventListener(EVENTO_TODAS, alTodas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cambiar solo usa setState y localStorage
  }, [id]);

  return (
    <section className="min-w-0 scroll-mt-4 border border-white/10 bg-white/6" data-abierta={abierta ? "si" : "no"} id={`seccion-${id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <button
          aria-expanded={abierta}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => cambiar(!abierta)}
          type="button"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${abierta ? "" : "-rotate-90"}`} />
          <span className="min-w-0">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
            {resumen ? <span className="block truncate text-xs text-slate-400">{resumen}</span> : null}
          </span>
        </button>
        {abierta ? action : null}
      </div>
      {abierta ? <div className="px-4 pb-4">{children}</div> : vistaCerrada ? <div className="px-4 pb-4">{vistaCerrada}</div> : null}
    </section>
  );
}
