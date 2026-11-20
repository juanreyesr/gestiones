"use client";

import { BookOpen, ChevronLeft, ChevronRight, PenLine, Send, X } from "lucide-react";
import { useState } from "react";
import { FichaBibliotecaVista } from "@/components/bibliotecas/ficha-biblioteca-vista";
import { BIBLIOTECAS, fichaBibliotecaPorId, fichaClinicaPorId, type VistaFicha } from "@/lib/bibliotecas";
import { ModalPortal } from "../modal-portal";
import { EVENTO_ACCION_FICHA, type AccionFicha } from "./seccion-plegable";
import { BTN_GHOST } from "./ui";

const pedir = (detalle: AccionFicha) => window.dispatchEvent(new CustomEvent(EVENTO_ACCION_FICHA, { detail: detalle }));

/**
 * Ventana con una ficha clínica (vista del terapeuta). Se puede pasar a las demás fichas de la
 * biblioteca; las fichas terapéuticas del plan se llenan o envían desde aquí (las ejecuta
 * «Intervención guiada», que está en el mismo expediente).
 */
export function FichaClinicaModal({
  fichaId,
  onCerrar,
  conAcciones = true,
  vista = "terapeuta",
}: {
  fichaId: string;
  onCerrar: () => void;
  conAcciones?: boolean;
  /** «estudiante»: como la verá el Aula (para la vista previa del docente). */
  vista?: VistaFicha;
}) {
  const [id, setId] = useState(fichaId);
  const actual = fichaBibliotecaPorId(id) ?? fichaBibliotecaPorId(fichaId);
  if (!actual) return null;
  const { ficha, biblioteca } = actual;
  const i = biblioteca.fichas.findIndex((f) => f.id === ficha.id);
  const ir = (d: number) => setId(biblioteca.fichas[(i + d + biblioteca.fichas.length) % biblioteca.fichas.length].id);
  const accion = (ficha: string, a: AccionFicha["accion"]) => {
    pedir({ ficha, accion: a });
    onCerrar();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6" onClick={onCerrar}>
        <div
          aria-label={`Ficha clínica: ${ficha.nombre}`}
          aria-modal="true"
          className="grid w-full max-w-3xl gap-4 border border-white/10 bg-slate-950 p-4 sm:p-6"
          data-testid="ficha-clinica-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <BookOpen className="h-4 w-4" /> Biblioteca {biblioteca.titulo} · {i + 1} de {biblioteca.fichas.length}
            </span>
            <div className="flex items-center gap-1">
              <select
                aria-label="Ir a otra ficha"
                className="field max-w-[14rem] py-1 text-xs"
                onChange={(e) => setId(e.target.value)}
                value={ficha.id}
              >
                {BIBLIOTECAS.map((b) => (
                  <optgroup key={b.id} label={b.titulo}>
                    {b.fichas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button aria-label="Ficha anterior" className={BTN_GHOST} onClick={() => ir(-1)} type="button">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button aria-label="Ficha siguiente" className={BTN_GHOST} onClick={() => ir(1)} type="button">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button aria-label="Cerrar" className={BTN_GHOST} onClick={onCerrar} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <FichaBibliotecaVista
            accionesFicha={
              conAcciones
                ? (f) => (
                    <span className="flex gap-1">
                      <button className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 hover:bg-white/10" onClick={() => accion(f, "llenar")} type="button">
                        <PenLine className="h-3.5 w-3.5" /> Llenarla yo
                      </button>
                      <button className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 hover:bg-white/10" onClick={() => accion(f, "enviar")} type="button">
                        <Send className="h-3.5 w-3.5" /> Enviar al paciente
                      </button>
                    </span>
                  )
                : undefined
            }
            biblioteca={biblioteca}
            ficha={ficha}
            vista={vista}
          />
        </div>
      </div>
    </ModalPortal>
  );
}

/** Fila de «Fichas clínicas relacionadas» (sobre el informe EAPI o MCEA). No dibuja nada si no hay. */
export function FichasClinicasRelacionadas({ ids }: { ids: string[] }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const fichas = ids.map((id) => fichaClinicaPorId(id)?.ficha).filter((f) => f !== undefined);
  if (!fichas.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border border-sky-300/30 bg-sky-300/5 p-3" data-testid="fichas-clinicas-relacionadas">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
        <BookOpen className="h-4 w-4" /> Fichas clínicas relacionadas con sus hipótesis:
      </span>
      {fichas.map((f) => (
        <button className="rounded border border-sky-300/40 px-2 py-1 text-xs text-sky-100 hover:bg-sky-300/10" key={f.id} onClick={() => setAbierta(f.id)} type="button">
          {f.nombre}
        </button>
      ))}
      {abierta ? <FichaClinicaModal fichaId={abierta} onCerrar={() => setAbierta(null)} /> : null}
    </div>
  );
}

/** Botón «Biblioteca clínica» (abre la primera ficha; dentro se navega por todas). */
export function BotonBibliotecaClinica() {
  const [abierta, setAbierta] = useState(false);
  const primera = BIBLIOTECAS[0]?.fichas[0]?.id;
  if (!primera) return null;
  return (
    <>
      <button className={BTN_GHOST} data-testid="abrir-biblioteca-clinica" onClick={() => setAbierta(true)} type="button">
        <BookOpen className="h-4 w-4" /> Biblioteca clínica
      </button>
      {abierta ? <FichaClinicaModal fichaId={primera} onCerrar={() => setAbierta(false)} /> : null}
    </>
  );
}
