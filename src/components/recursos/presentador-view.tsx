"use client";

import { CheckCircle2, ChevronLeft, Medal, Play, Timer, Trophy, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPreguntas } from "@/lib/recursos/recursos";
import {
  activarPregunta,
  cerrarSesion,
  fetchParticipantes,
  fetchRanking,
  fetchRespuestas,
  fetchSesion,
} from "@/lib/recursos/sesiones";
import { getSupabaseClient } from "@/lib/supabase";
import type { ParticipanteRow, PreguntaRow, RespuestaRow, SesionRow, TipoRecurso } from "@/lib/recursos/types";
import { ConfirmDialog } from "../confirm-dialog";
import { ResultadosPregunta } from "./resultados-pregunta";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner } from "./ui";

export function PresentadorView({
  onCerrar,
  pin,
  recursoTipo,
  recursoTitulo,
  sesionId,
}: {
  onCerrar: () => void;
  pin: string;
  recursoTipo: TipoRecurso;
  recursoTitulo: string;
  sesionId: string;
}) {
  const esQuiz = recursoTipo === "quiz";

  const [sesion, setSesion] = useState<SesionRow | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaRow[]>([]);
  const [participantesCount, setParticipantesCount] = useState(0);
  const [respuestas, setRespuestas] = useState<RespuestaRow[]>([]);
  const [ranking, setRanking] = useState<ParticipanteRow[]>([]);
  const [podioFinal, setPodioFinal] = useState<ParticipanteRow[] | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
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

    if (esQuiz) {
      const rankingRes = await fetchRanking(sesionId);
      setRanking(rankingRes.data);
    }

    if (sesionRes.data.pregunta_activa_id) {
      const { data } = await fetchRespuestas(sesionId, sesionRes.data.pregunta_activa_id);
      setRespuestas(data);
    }
  }, [esQuiz, sesionId]);

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
          if (nueva.pregunta_id === preguntaActivaIdRef.current) {
            setRespuestas((current) => [...current, nueva]);
          }
          if (esQuiz) {
            void fetchRanking(sesionId).then(({ data }) => setRanking(data));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [esQuiz, sesionId]);

  const preguntaActiva = useMemo(
    () => preguntas.find((pregunta) => pregunta.id === sesion?.pregunta_activa_id) ?? null,
    [preguntas, sesion],
  );

  useEffect(() => {
    if (!esQuiz || !preguntaActiva?.tiempo_limite || sesion?.estado !== "activa") return;
    const interval = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(interval);
  }, [esQuiz, preguntaActiva?.id, preguntaActiva?.tiempo_limite, sesion?.estado]);

  const restanteSeg = useMemo(() => {
    if (!esQuiz || !preguntaActiva?.tiempo_limite || !sesion?.pregunta_activa_iniciada_at || sesion.estado !== "activa") return null;
    const limiteMs = preguntaActiva.tiempo_limite * 1000;
    const transcurridoMs = ahora - new Date(sesion.pregunta_activa_iniciada_at).getTime();
    return Math.max(0, Math.ceil((limiteMs - transcurridoMs) / 1000));
  }, [ahora, esQuiz, preguntaActiva, sesion]);

  const handleMostrarPregunta = async (preguntaId: string) => {
    setError("");
    const { error: activarError } = await activarPregunta(sesionId, preguntaId);
    if (activarError) {
      setError(activarError);
      return;
    }
    preguntaActivaIdRef.current = preguntaId;
    const { data } = await fetchRespuestas(sesionId, preguntaId);
    const iniciadaAt = new Date();
    setRespuestas(data);
    setAhora(iniciadaAt.getTime());
    setSesion((current) =>
      current ? { ...current, estado: "activa", pregunta_activa_id: preguntaId, pregunta_activa_iniciada_at: iniciadaAt.toISOString() } : current,
    );
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
    if (esQuiz) {
      const { data } = await fetchRanking(sesionId);
      setPodioFinal(data);
      return;
    }
    onCerrar();
  };

  if (podioFinal) {
    return <PodioFinal onVolver={onCerrar} podio={podioFinal} recursoTitulo={recursoTitulo} />;
  }

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
        <div className="grid content-start gap-4">
          <div className="grid gap-4 border border-white/10 bg-slate-950/58 p-4 text-center backdrop-blur-xl">
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

          {esQuiz ? (
            <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                <Trophy className="h-4 w-4 text-amber-300" />
                Ranking
              </h3>
              {ranking.length === 0 ? (
                <p className="text-sm text-slate-400">Aún no hay puntajes.</p>
              ) : (
                <ol className="grid gap-1.5">
                  {ranking.slice(0, 5).map((participante, index) => (
                    <li className="flex items-center justify-between gap-2 text-sm" key={participante.id}>
                      <span className="truncate text-slate-200">
                        {index + 1}. {participante.apodo}
                      </span>
                      <span className="shrink-0 font-semibold text-emerald-200">{participante.puntaje}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl">
            {preguntaActiva ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{preguntaActiva.texto}</p>
                  {restanteSeg !== null ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 border px-3 py-1 text-sm font-bold ${
                        restanteSeg <= 5 ? "border-red-400/50 bg-red-400/10 text-red-200" : "border-white/10 bg-white/8 text-slate-200"
                      }`}
                    >
                      <Timer className="h-3.5 w-3.5" />
                      {restanteSeg}s
                    </span>
                  ) : null}
                </div>
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
        busy={cerrando}
        message="La sesión se cerrará y los participantes ya no podrán responder. Los resultados quedarán guardados en el historial."
        onCancel={() => setConfirmandoCierre(false)}
        onConfirm={() => void handleCerrarSesion()}
        open={confirmandoCierre}
        title="Finalizar sesión"
      />
    </div>
  );
}

const MEDALLA_COLORES = ["text-amber-300", "text-slate-300", "text-orange-400"];

function PodioFinal({
  onVolver,
  podio,
  recursoTitulo,
}: {
  onVolver: () => void;
  podio: ParticipanteRow[];
  recursoTitulo: string;
}) {
  const top3 = podio.slice(0, 3);
  const resto = podio.slice(3, 10);

  return (
    <div className="grid gap-6 py-6">
      <div className="text-center">
        <Trophy className="mx-auto h-10 w-10 text-amber-300" />
        <h2 className="mt-2 text-2xl font-semibold text-white">{recursoTitulo}</h2>
        <p className="text-sm text-slate-400">Resultado final</p>
      </div>

      {top3.length === 0 ? (
        <p className="text-center text-sm text-slate-400">Nadie respondió ninguna pregunta.</p>
      ) : (
        <div className="mx-auto grid w-full max-w-lg gap-2">
          {top3.map((participante, index) => (
            <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/8 px-4 py-3" key={participante.id}>
              <span className="flex items-center gap-2 font-semibold text-white">
                <Medal className={`h-5 w-5 ${MEDALLA_COLORES[index]}`} />
                {index + 1}. {participante.apodo}
              </span>
              <span className="font-bold text-emerald-200">{participante.puntaje}</span>
            </div>
          ))}
          {resto.map((participante, index) => (
            <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/4 px-4 py-2 text-sm" key={participante.id}>
              <span className="text-slate-300">
                {index + 4}. {participante.apodo}
              </span>
              <span className="text-slate-400">{participante.puntaje}</span>
            </div>
          ))}
        </div>
      )}

      <button className={`${BTN_PRIMARY} mx-auto`} onClick={onVolver} type="button">
        Volver a mis recursos
      </button>
    </div>
  );
}
