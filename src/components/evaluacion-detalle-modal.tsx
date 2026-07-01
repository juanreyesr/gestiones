"use client";

import { Download, Printer, X } from "lucide-react";
import { ModalPortal } from "./modal-portal";
import { ReportePrintable, type ReporteData } from "./reporte-printable";

export function EvaluacionDetalleModal({
  data,
  onClose,
  onPrint,
  printing,
}: {
  data: ReporteData | null;
  onClose: () => void;
  onPrint: () => void;
  printing?: boolean;
}) {
  if (!data) return null;

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-white/10 bg-slate-100"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-300 bg-slate-100 p-3">
            <button
              className="inline-flex items-center gap-2 border border-slate-400 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:border-slate-600 disabled:opacity-60"
              disabled={printing}
              onClick={onPrint}
              type="button"
            >
              {printing ? <Printer className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}
              {printing ? "Generando PDF..." : "Descargar PDF"}
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ReportePrintable data={data} />
        </div>
      </div>
    </ModalPortal>
  );
}
