"use client";

import { Download, Maximize, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { esImagen, esPdf, esPresentacionOffice, officeViewerUrl, urlFirmada } from "@/lib/cursos/archivos";
import { BTN_GHOST } from "./ui";

export function PresentacionArchivo({
  archivoMime,
  archivoNombre,
  archivoPath,
  onClose,
  titulo,
}: {
  archivoMime: string | null;
  archivoNombre: string | null;
  archivoPath: string | null;
  onClose: () => void;
  titulo: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    if (!archivoPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deriva el mensaje de error del prop archivoPath al montar
      setError("Este contenido no tiene un archivo asociado.");
      return;
    }
    urlFirmada(archivoPath, 3600 * 8).then(({ url: signedUrl, error: fetchError }) => {
      if (cancelado) return;
      if (fetchError) setError(fetchError);
      setUrl(signedUrl);
    });
    return () => {
      cancelado = true;
    };
  }, [archivoPath]);

  const handlePantallaCompleta = () => {
    // iOS Safari no implementa la Fullscreen API en divs: verificar antes de invocar.
    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === "function") void document.exitFullscreen();
    } else if (typeof contenedorRef.current?.requestFullscreen === "function") {
      void contenedorRef.current.requestFullscreen();
    }
  };

  const handleDescargar = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const esPdfArchivo = esPdf(archivoMime, archivoNombre);
  const esOffice = esPresentacionOffice(archivoMime, archivoNombre);
  const esImg = esImagen(archivoMime, archivoNombre);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex flex-col bg-black" ref={contenedorRef}>
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950 px-4 py-2.5">
          <span className="truncate text-sm font-semibold text-white">{titulo}</span>
          <div className="flex items-center gap-2">
            <button className={BTN_GHOST} onClick={handlePantallaCompleta} type="button">
              <Maximize className="h-4 w-4" />
              Pantalla completa
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/8 text-slate-200 hover:border-white/30"
              onClick={onClose}
              title="Cerrar"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900">
          {!url ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {error || "Cargando archivo..."}
            </div>
          ) : esPdfArchivo ? (
            <iframe className="h-full w-full" src={url} title={titulo} />
          ) : esOffice ? (
            <iframe className="h-full w-full" src={officeViewerUrl(url)} title={titulo} />
          ) : esImg ? (
            <div className="flex h-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={titulo} className="max-h-full max-w-full object-contain" src={url} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-300">
              <p>Este tipo de archivo no se puede previsualizar.</p>
              <button className={BTN_GHOST} onClick={handleDescargar} type="button">
                <Download className="h-4 w-4" />
                Descargar archivo
              </button>
            </div>
          )}
        </div>

        {url && (esOffice || esPdfArchivo) ? (
          <div className="border-t border-white/10 bg-slate-950 px-4 py-2 text-center">
            <button className={`${BTN_GHOST} mx-auto text-xs`} onClick={handleDescargar} type="button">
              <Download className="h-3.5 w-3.5" />
              ¿No carga? Descargar archivo
            </button>
          </div>
        ) : null}
      </div>
    </ModalPortal>
  );
}
