"use client";

import { GraduationCap, X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";

/**
 * Vista previa de lo que vería un estudiante genérico de este curso. Por
 * ahora (Fase 0) todavía no hay semanas/contenidos publicables, así que
 * muestra el mismo estado vacío que verá el estudiante real; cuando la
 * Fase 1 agregue contenidos y tareas, este mismo componente reutilizará el
 * panel del estudiante para mostrarlos tal cual se ven allá.
 */
export function VistaPreviaEstudianteModal({
  cursoNombre,
  onClose,
  universidadNombre,
}: {
  cursoNombre: string;
  onClose: () => void;
  universidadNombre: string;
}) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-lg overflow-hidden border border-white/10 bg-white text-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Vista previa · así lo ve un estudiante
            </span>
            <button className="text-slate-300 hover:text-white" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{universidadNombre}</p>
                <h3 className="text-lg font-semibold text-slate-900">{cursoNombre}</h3>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">
                Aún no hay semanas publicadas para estudiantes en este curso.
                <br />
                En cuanto habilites una semana, su contenido aparecerá aquí exactamente así.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
