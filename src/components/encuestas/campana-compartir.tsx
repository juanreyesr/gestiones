"use client";

import { X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { CampanaConConteo } from "@/lib/encuestas/types";
import { ModalPortal } from "../modal-portal";

export function CampanaCompartir({ campana, onClose }: { campana: CampanaConConteo; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const enlace = typeof window !== "undefined" ? `${window.location.origin}/encuesta/${campana.token}` : "";

  useEffect(() => {
    if (!enlace) return;
    QRCode.toDataURL(enlace, { margin: 1, width: 320, color: { dark: "#052e1e", light: "#6ee7b7" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [enlace]);

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="grid w-full max-w-sm gap-4 border border-white/10 bg-slate-950 p-5 text-center"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{campana.titulo}</h3>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          {qrDataUrl ? (
            <img alt="Código QR de la encuesta" className="mx-auto w-full max-w-[240px] border-4 border-emerald-300/40" src={qrDataUrl} />
          ) : null}

          <p className="break-all text-xs text-slate-400">{enlace}</p>
        </div>
      </div>
    </ModalPortal>
  );
}
