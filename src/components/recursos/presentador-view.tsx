"use client";

import { CheckCircle2, ChevronLeft, Play, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPreguntas } from "@/lib/recursos/recursos";
import { activarPregunta, cerrarSesion, fetchParticipantes, fetchRespuestas, fetchSesion } from "@/lib/recursos/sesiones";
import { getSupabaseClient } from "@/lib/supabase";
import type { PreguntaRow, RespuestaRow, SesionRow } from "@/lib/recursos/types";
import { ConfirmDialog } from "../confirm-dialog";
import { ResultadosPregunta } from "./resultados-pregunta";
import { BTN_GHOST, ErrorBanner } from "./ui";

export function PresentadorView({
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
  const [sesion, setSesion] = useState<SesionRow | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaRow[]>([]);
  const [participantesCount, setParticipantesCount] = useState(0);
  const [respuestas, setRespuestas] = useState<RespuestaRow[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const preguntaActivaIdRef = useRef<string | null>(null);

  const enlace = typeof window !== "undefined" ? `${window.location.origin}/vivo/${pin}` : "";

  useEffect(() => {
    if (!enlace) return;
    QRCode.toDataURL(enlace, { margin: 1, width: 320, color: { dark: "#052e1e", light: "#6ee7b7" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [enlace]);

  const cargarInicial = useCallback(async () => {
    const sesionRes = await fetchSesion(sesionId);
    if (sesionRes.error) setError(sesionRes.error);
    if (!sesionRes.data) return;

    setSesion(sesionRes.data);
    preguntaActivaIdRef.current = sesionRes.data.pregunta_activa_id;

    const [preguntasRes, participantesRes] = await Promise.all([
      fetchPreguntas(sesionRes.data.recurso_id),
      fetchParticipantes(sesionId),
    ]);
    setPreguntas(preguntasRes.data);
    setParticipantesCount(participantesRes.data.length);

    if (sesionRes.data.pregunta_activa_id) {
      const { data } = await fetchRespuestas(sesionId, sesionRes.data.pregunta_activa_id);
      setRespuestas(data);
    }
  }, [sesionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de la sesion, preguntas y participantes
    void cargarInicial();
  }, [cargarInicial]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`recurso_sesion_${sesionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gestionesjj_recurso_participantes", filter: `sesion_id=eq.${sesionId}` },
        () => setParticipantesCount((count) => count + 1),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gestionesjj_recurso_respuestas", filter: `sesion_id=eq.${sesionId}` },
        (payload) => {
          const nueva = payload.new as RespuestaRow;
          if (nueva.pregunta_id !== preguntaActivaIdRef.current) return;
          setRespuestas((current) => [...current, nueva]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sesionId]);

  const preguntaActiva = useMemo(
    () => preguntas.find((pregunta) => pregunta.id === sesion?.pregunta_activa_id) ?? null,
    [preguntas, sesion],
  );

  const handleMostrarPregunta = async (preguntaId: string) => {
    setError("");
    const { error: activarError } = await activarPregunta(sesionId, preguntaId);
    if (activarError) {
      setError(activarError);
      return;
    }
    preguntaActivaIdRef.current = preguntaId;
    const { data } = await fetchRespuestas(sesionId, preguntaId);
    setRespuestas(data);
    setSesion((current) => (current ? { ...current, estado: "activa", pregunta_activa_id: preguntaId } : current));
  };

  const handleCerrarSesion = async () => {
    const { error: closeError } = await cerrarSesion(sesionId);
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
          <button className="inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300" onClick={() => setConfirmandoCierre(true)} type="button">
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

        <div className="grid gap-4">
          <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl">
            {preguntaActiva ? (
              <div className="grid gap-4">
                <p className="text-lg font-semibold text-white">{preguntaActiva.texto}</p>
                <ResultadosPregunta pregunta={preguntaActiva} respuestas={respuestas} />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                Activa una pregunta de la lista para mostrar resultados en vivo.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Preguntas</h3>
            {preguntas.map((pregunta, index) => (
              <button
                className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-left text-sm transition ${
                  pregunta.id === preguntaActiva?.id
                    ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                    : "border-white/10 bg-white/6 text-slate-200 hover:border-white/30"
                }`}
                key={pregunta.id}
                onClick={() => void handleMostrarPregunta(pregunta.id)}
                type="button"
              >
                <span className="truncate">
                  {index + 1}. {pregunta.texto}
                </span>
                {pregunta.id === preguntaActiva?.id ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                ) : (
                  <Play className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        message="La sesión se cerrará y los participantes ya no podrán responder. Los resultados quedarán guardados en el historial."
        onCancel={() => setConfirmandoCierre(false)}
        onConfirm={() => void handleCerrarSesion()}
        open={confirmandoCierre}
        title="Finalizar sesión"
      />
    </div>
  );
}
