"use client";

import { Download, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { formatearFechaHora } from "@/lib/cursos/types";
import {
  enviarMensaje,
  fetchMisMensajes,
  marcarMensajesLeidos,
  obtenerUrlAdjuntoMensaje,
  type MiMensaje,
} from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";

const INTERVALO_MS = 4000;

export function ChatModal({ onClose, onLeido }: { onClose: () => void; onLeido: () => void | Promise<void> }) {
  const [mensajes, setMensajes] = useState<MiMensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const { t } = useIdioma();

  const cargar = useCallback(async () => {
    const { data, error: fetchError } = await fetchMisMensajes();
    setMensajes(data);
    if (fetchError) setError(fetchError);
  }, []);

  useEffect(() => {
    (async () => {
      setCargando(true);
      await cargar();
      setCargando(false);
      await marcarMensajesLeidos();
      await onLeido();
    })();
    const interval = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se ejecuta al montar el chat
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

  const handleEnviar = async () => {
    if ((!texto.trim() && !archivo) || enviando) return;
    setEnviando(true);
    const { error: sendError } = await enviarMensaje(texto.trim(), archivo);
    setEnviando(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setTexto("");
    setArchivo(null);
    setError("");
    await cargar();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
        <div
          className="flex h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">{t("chat_titulo")}</h3>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {cargando ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("central_cargando")}</p>
          ) : mensajes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("chat_sin_mensajes")}</p>
          ) : (
            <div className="grid gap-2">
              {mensajes.map((mensaje) => (
                <div className={`flex ${mensaje.remitente === "estudiante" ? "justify-end" : "justify-start"}`} key={mensaje.id}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      mensaje.remitente === "estudiante" ? "bg-slate-900 text-white" : "bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {mensaje.contenido ? <p className="whitespace-pre-wrap break-words">{mensaje.contenido}</p> : null}
                    {mensaje.tieneArchivo ? <AdjuntoMensaje mensaje={mensaje} /> : null}
                    <p className={`mt-1 text-[10px] ${mensaje.remitente === "estudiante" ? "text-slate-300" : "text-slate-400"}`}>
                      {formatearFechaHora(mensaje.creadoEn)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={finRef} />
            </div>
          )}
        </div>

        {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}

        {archivo ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{archivo.name}</span>
            <button onClick={() => setArchivo(null)} title="Quitar" type="button">
              <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex items-end gap-2">
          <label
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800"
            title={t("chat_adjuntar")}
          >
            <Paperclip className="h-4 w-4" />
            <input className="hidden" onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} type="file" />
          </label>
          <textarea
            className="field-light flex-1 resize-none"
            maxLength={4000}
            onChange={(event) => setTexto(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleEnviar();
              }
            }}
            placeholder={t("chat_placeholder")}
            rows={2}
            value={texto}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
            disabled={(!texto.trim() && !archivo) || enviando}
            onClick={() => void handleEnviar()}
            type="button"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function AdjuntoMensaje({ mensaje }: { mensaje: MiMensaje }) {
  const [abriendo, setAbriendo] = useState(false);
  const { t } = useIdioma();

  const handleAbrir = async () => {
    if (abriendo) return;
    setAbriendo(true);
    const { url } = await obtenerUrlAdjuntoMensaje(mensaje.id);
    setAbriendo(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      className={`mt-1.5 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
        mensaje.remitente === "estudiante"
          ? "border-white/20 bg-white/10 text-white hover:border-white/40"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
      }`}
      disabled={abriendo}
      onClick={() => void handleAbrir()}
      type="button"
    >
      <Download className="h-3.5 w-3.5" />
      {abriendo ? t("chat_abriendo") : (mensaje.archivoNombre ?? t("chat_archivo_generico"))}
    </button>
  );
}
