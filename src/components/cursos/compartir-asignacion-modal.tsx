"use client";

import { Check, Copy, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";

export function CompartirAsignacionModal({
  cursoNombre,
  onClose,
  token,
}: {
  cursoNombre: string;
  onClose: () => void;
  token: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiado, setCopiado] = useState(false);
  const enlace = typeof window !== "undefined" ? `${window.location.origin}/asignacion/${token}` : "";

  useEffect(() => {
    if (!enlace) return;
    QRCode.toDataURL(enlace, { margin: 1, width: 320, color: { dark: "#052e1e", light: "#6ee7b7" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [enlace]);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Portapapeles no disponible: el enlace ya esta visible para copiar a mano.
    }
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="grid w-full max-w-sm gap-4 border border-white/10 bg-slate-950 p-5 text-center"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{cursoNombre}</h3>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Comparte este código o enlace para que las personas puedan pedir su asignación a este curso.
          </p>

          {qrDataUrl ? (
            <img alt="Código QR de asignación al curso" className="mx-auto w-full max-w-[240px] border-4 border-emerald-300/40" src={qrDataUrl} />
          ) : null}

          <div className="flex items-center gap-2 border border-white/10 bg-white/6 p-2">
            <p className="flex-1 truncate text-left text-xs text-slate-300">{enlace}</p>
            <button
              className="flex shrink-0 items-center gap-1.5 border border-white/10 bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-300/50"
              onClick={() => void handleCopiar()}
              type="button"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
