"use client";

import { AlertTriangle } from "lucide-react";
import { ModalPortal } from "./modal-portal";

export function ConfirmDialog({
  busy,
  message,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  busy?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
        <div
          className="w-full max-w-sm border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <p className="text-sm leading-6 text-slate-300">{message}</p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              className="border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="bg-red-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-red-300 disabled:opacity-60"
              disabled={busy}
              onClick={onConfirm}
              type="button"
            >
              {busy ? "Borrando..." : "Sí, borrar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
