"use client";

import { KeyRound, X } from "lucide-react";
import { useState } from "react";
import { ModalPortal } from "./modal-portal";

export function CodigoKioscoModal({
  error,
  onClose,
  onGuardar,
  open,
  saving,
}: {
  error: string;
  onClose: () => void;
  onGuardar: (nuevoCodigo: string) => void;
  open: boolean;
  saving: boolean;
}) {
  const [codigo, setCodigo] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  if (!open) return null;

  const coinciden = codigo.length >= 4 && codigo === confirmacion;

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="w-full max-w-sm border border-white/10 bg-slate-950 p-5" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <KeyRound className="h-5 w-5 text-amber-200" />
              Cambiar codigo de modo kiosco
            </h3>
            <button onClick={onClose} type="button">
              <X className="h-5 w-5 text-slate-400 hover:text-white" />
            </button>
          </div>

          <p className="mb-4 text-sm leading-6 text-slate-300">
            Este codigo lo pedira el modo entrevista al estudiante antes de devolverte el dispositivo, para evitar que
            vea por error la evaluacion del docente.
          </p>

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Nuevo codigo</span>
              <input className="field" onChange={(event) => setCodigo(event.target.value)} type="password" value={codigo} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Confirmar codigo</span>
              <input
                className="field"
                onChange={(event) => setConfirmacion(event.target.value)}
                type="password"
                value={confirmacion}
              />
            </label>
          </div>

          {codigo && codigo.length < 4 ? (
            <p className="mt-3 text-xs font-semibold text-amber-300">El codigo debe tener al menos 4 caracteres.</p>
          ) : codigo && confirmacion && !coinciden ? (
            <p className="mt-3 text-xs font-semibold text-amber-300">Los codigos no coinciden.</p>
          ) : null}

          {error ? <p className="mt-3 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-3">
            <button
              className="border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
              disabled={!coinciden || saving}
              onClick={() => onGuardar(codigo)}
              type="button"
            >
              {saving ? "Guardando..." : "Guardar codigo"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
