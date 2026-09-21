"use client";

import { MessageCircle, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { enviarMensajeDocente, fetchMensajes, marcarMensajesLeidosDocente } from "@/lib/cursos/mensajes";
import { formatearFechaHora, type MensajeRow } from "@/lib/cursos/types";
import { BTN_PRIMARY, ErrorBanner } from "./ui";

const INTERVALO_MS = 4000;

export function ChatEstudianteModal({
  estudianteId,
  estudianteNombre,
  onClose,
  onLeido,
}: {
  estudianteId: string;
  estudianteNombre: string;
  onClose: () => void;
  onLeido: () => void | Promise<void>;
}) {
  const [mensajes, setMensajes] = useState<MensajeRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const { data, error: fetchError } = await fetchMensajes(estudianteId);
    setMensajes(data);
    if (fetchError) setError(fetchError);
  }, [estudianteId]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      await cargar();
      setCargando(false);
      await marcarMensajesLeidosDocente(estudianteId);
      await onLeido();
    })();
    const interval = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo depende del estudiante abierto, onLeido/cargar cambian de identidad cada render
  }, [estudianteId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const { error: sendError } = await enviarMensajeDocente(estudianteId, texto.trim());
    setEnviando(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setTexto("");
    setError("");
    await cargar();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="flex h-[80vh] w-full max-w-lg flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-300" />
            <h3 className="text-lg font-semibold text-white">Chat con {estudianteNombre}</h3>
          </div>

          <div className="flex-1 overflow-y-auto rounded border border-white/10 bg-white/4 p-3">
            {cargando ? (
              <p className="py-6 text-center text-sm text-slate-400">Cargando...</p>
            ) : mensajes.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Aún no hay mensajes con este estudiante.</p>
            ) : (
              <div className="grid gap-2">
                {mensajes.map((mensaje) => (
                  <div className={`flex ${mensaje.remitente === "docente" ? "justify-end" : "justify-start"}`} key={mensaje.id}>
                    <div
                      className={`max-w-[80%] px-3 py-2 text-sm ${
                        mensaje.remitente === "docente" ? "bg-emerald-300/15 text-emerald-100" : "bg-white/8 text-slate-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{mensaje.contenido}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{formatearFechaHora(mensaje.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={finRef} />
              </div>
            )}
          </div>

          <ErrorBanner message={error} />

          <div className="mt-3 flex items-end gap-2">
            <textarea
              className="field flex-1 resize-none"
              maxLength={4000}
              onChange={(event) => setTexto(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleEnviar();
                }
              }}
              placeholder="Escribe un mensaje..."
              rows={2}
              value={texto}
            />
            <button className={BTN_PRIMARY} disabled={!texto.trim() || enviando} onClick={() => void handleEnviar()} type="button">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
