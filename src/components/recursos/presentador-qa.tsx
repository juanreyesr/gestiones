"use client";

import { CheckCircle2, ChevronLeft, EyeOff, Star, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { fetchQaPreguntas, ocultarQaPregunta, updateQaPregunta } from "@/lib/recursos/qa";
import { cerrarSesion, fetchParticipantes } from "@/lib/recursos/sesiones";
import { getSupabaseClient } from "@/lib/supabase";
import type { QaPreguntaOwnerRow } from "@/lib/recursos/types";
import { ConfirmDialog } from "../confirm-dialog";
import { BTN_GHOST, EmptyState, ErrorBanner } from "./ui";

export function PresentadorQA({
  onCerrar,
  pin,
  recursoTitulo,
  sesionId,
}: {
  onCerrar: () => void;
  pin: string;
  recursoTitulo: string;
  sesionId: string;
}) {
  const [preguntas, setPreguntas] = useState<QaPreguntaOwnerRow[]>([]);
  const [participantesCount, setParticipantesCount] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const enlace = typeof window !== "undefined" ? `${window.location.origin}/vivo/${pin}` : "";

  useEffect(() => {
    if (!enlace) return;
    QRCode.toDataURL(enlace, { margin: 1, width: 320, color: { dark: "#052e1e", light: "#6ee7b7" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [enlace]);

  const cargar = useCallback(async () => {
    const [preguntasRes, participantesRes] = await Promise.all([fetchQaPreguntas(sesionId), fetchParticipantes(sesionId)]);
    setPreguntas(preguntasRes.data);
    setParticipantesCount(participantesRes.data.length);
    if (preguntasRes.error) setError(preguntasRes.error);
  }, [sesionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de preguntas y participantes
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`recurso_qa_${sesionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gestionesjj_recurso_participantes", filter: `sesion_id=eq.${sesionId}` },
        () => setParticipantesCount((count) => count + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gestionesjj_recurso_qa_preguntas", filter: `sesion_id=eq.${sesionId}` },
        () => void cargar(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cargar, sesionId]);

  const handleMarcarRespondida = async (id: string) => {
    await updateQaPregunta(id, { estado: "respondida" });
    void cargar();
  };

  const handleDestacar = async (pregunta: QaPreguntaOwnerRow) => {
    await updateQaPregunta(pregunta.id, { destacada: !pregunta.destacada });
    void cargar();
  };

  const handleOcultar = async (id: string) => {
    await ocultarQaPregunta(id);
    void cargar();
  };

  const handleCerrarSesion = async () => {
    setCerrando(true);
    const { error: closeError } = await cerrarSesion(sesionId);
    setCerrando(false);
    setConfirmandoCierre(false);
    if (closeError) {
      setError(closeError);
      return;
    }
    onCerrar();
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className={BTN_GHOST} onClick={onCerrar} type="button">
          <ChevronLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-slate-200">
            <Users className="h-4 w-4 text-emerald-300" />
            {participantesCount} conectados
          </span>
          <button
            className="inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300"
            onClick={() => setConfirmandoCierre(true)}
            type="button"
          >
            <X className="h-4 w-4" />
            Finalizar sesión
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="grid content-start gap-4 border border-white/10 bg-slate-950/58 p-4 text-center backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">{recursoTitulo}</p>
          {qrDataUrl ? (
            <img alt="Código QR para unirse" className="mx-auto w-full max-w-[240px] border-4 border-emerald-300/40" src={qrDataUrl} />
          ) : null}
          <div>
            <p className="text-xs uppercase text-slate-400">PIN</p>
            <p className="text-4xl font-bold tracking-[0.3em] text-white">{pin}</p>
          </div>
          <p className="break-all text-xs text-slate-500">{enlace}</p>
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Preguntas del público ({preguntas.length})</h3>
          {preguntas.length === 0 ? (
            <EmptyState>Aún no llegan preguntas. Comparte el PIN o el QR para que el público empiece a enviarlas.</EmptyState>
          ) : (
            preguntas.map((pregunta) => (
              <div
                className={`flex items-start justify-between gap-3 border p-3 ${
                  pregunta.destacada ? "border-amber-300/60 bg-amber-300/10" : "border-white/10 bg-white/6"
                } ${pregunta.estado === "respondida" ? "opacity-60" : ""}`}
                key={pregunta.id}
              >
                <div className="min-w-0">
                  <p className="text-sm leading-6 text-white">{pregunta.texto}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {pregunta.gestionesjj_recurso_participantes?.apodo ?? "Participante"} · {pregunta.votos} votos
                    {pregunta.estado === "respondida" ? " · Respondida" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className={`flex h-8 w-8 items-center justify-center border transition ${
                      pregunta.destacada
                        ? "border-amber-300 bg-amber-300 text-slate-950"
                        : "border-white/10 bg-white/8 text-slate-300 hover:border-amber-300/50"
                    }`}
                    onClick={() => void handleDestacar(pregunta)}
                    title="Destacar"
                    type="button"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-emerald-300 transition hover:border-emerald-300/50 disabled:opacity-30"
                    disabled={pregunta.estado === "respondida"}
                    onClick={() => void handleMarcarRespondida(pregunta.id)}
                    title="Marcar respondida"
                    type="button"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-red-300 transition hover:border-red-400/60"
                    onClick={() => void handleOcultar(pregunta.id)}
                    title="Ocultar"
                    type="button"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        busy={cerrando}
        message="La sesión se cerrará y el público ya no podrá enviar ni votar preguntas. Las preguntas quedarán guardadas en el historial."
        onCancel={() => setConfirmandoCierre(false)}
        onConfirm={() => void handleCerrarSesion()}
        open={confirmandoCierre}
        title="Finalizar sesión"
      />
    </div>
  );
}
