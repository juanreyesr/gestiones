"use client";

import { Download, Eye, Headphones, X } from "lucide-react";
import { useState } from "react";
import { AudioNota } from "@/components/audio-nota";
import { abrirArchivoEntrega, esAudioEntrega, urlFirmadaEntrega } from "@/lib/cursos/entregas";
import type { EntregaArchivoRow } from "@/lib/cursos/types";

const BTN_ARCHIVO =
  "inline-flex items-center gap-1.5 border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-emerald-300/50";

/**
 * Un archivo entregado por el estudiante: Ver, Descargar y, si es una nota de
 * voz, Escuchar aquí mismo para calificar sin salir del modal.
 */
export function ArchivoEntregaFila({ archivo, onError }: { archivo: EntregaArchivoRow; onError: (mensaje: string) => void }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cargandoAudio, setCargandoAudio] = useState(false);
  const esAudio = esAudioEntrega(archivo);

  const handleArchivo = async (modo: "ver" | "descargar") => {
    const { error } = await abrirArchivoEntrega(archivo, modo);
    if (error) onError(error);
  };

  const handleEscuchar = async () => {
    if (audioUrl) {
      setAudioUrl(null);
      return;
    }
    setCargandoAudio(true);
    // 1 hora: alcanza para escuchar con calma y volver a reproducir.
    const { url, error } = await urlFirmadaEntrega(archivo.archivo_path, { expiresSeconds: 3600 });
    setCargandoAudio(false);
    if (!url) {
      onError(error ?? "No se pudo cargar el audio.");
      return;
    }
    setAudioUrl(url);
  };

  return (
    <div className="mt-1 grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200" title={archivo.archivo_nombre ?? undefined}>
          {esAudio ? "🎙️" : "📎"} {archivo.archivo_nombre ?? "Archivo"}
        </span>
        {esAudio ? (
          <button
            className="inline-flex items-center gap-1.5 border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:border-emerald-300/70"
            disabled={cargandoAudio}
            onClick={() => void handleEscuchar()}
            type="button"
          >
            {audioUrl ? <X className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}
            {cargandoAudio ? "Cargando..." : audioUrl ? "Cerrar" : "Escuchar"}
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-1.5 border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:border-emerald-300/70"
            onClick={() => void handleArchivo("ver")}
            type="button"
          >
            <Eye className="h-3 w-3" />
            Ver
          </button>
        )}
        <button className={BTN_ARCHIVO} onClick={() => void handleArchivo("descargar")} type="button">
          <Download className="h-3 w-3" />
          Descargar
        </button>
      </div>
      {audioUrl ? (
        <AudioNota autoPlay className="h-9 w-full" src={audioUrl} />
      ) : null}
    </div>
  );
}
