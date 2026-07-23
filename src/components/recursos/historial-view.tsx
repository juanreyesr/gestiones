"use client";

import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchQaPreguntas } from "@/lib/recursos/qa";
import { fetchPreguntas } from "@/lib/recursos/recursos";
import { fetchHistorial, fetchParticipantes, fetchRespuestas } from "@/lib/recursos/sesiones";
import type { PreguntaRow, QaPreguntaOwnerRow, RespuestaRow, SesionConRecurso } from "@/lib/recursos/types";
import { ResultadosPregunta } from "./resultados-pregunta";
import { CardBox, EmptyState, ErrorBanner } from "./ui";

function formatearFechaHora(iso: string | null) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

export function HistorialView() {
  const [sesiones, setSesiones] = useState<SesionConRecurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sesionActiva, setSesionActiva] = useState<SesionConRecurso | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchHistorial();
    setSesiones(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del historial de sesiones cerradas
    void cargar();
  }, [cargar]);

  if (sesionActiva) {
    return sesionActiva.gestionesjj_recursos?.tipo === "qa" ? (
      <SesionHistorialQa onVolver={() => setSesionActiva(null)} sesion={sesionActiva} />
    ) : (
      <SesionHistorialDetalle onVolver={() => setSesionActiva(null)} sesion={sesionActiva} />
    );
  }

  return (
    <div className="grid gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Sesiones anteriores</h3>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-sm text-slate-400">Cargando historial...</p>
      ) : sesiones.length === 0 ? (
        <EmptyState>Aún no hay sesiones finalizadas.</EmptyState>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sesiones.map((sesion) => (
            <CardBox key={sesion.id} onClick={() => setSesionActiva(sesion)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{sesion.gestionesjj_recursos?.titulo ?? "Encuesta"}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatearFechaHora(sesion.cerrada_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-emerald-200" />
              </div>
            </CardBox>
          ))}
        </div>
      )}
    </div>
  );
}

function SesionHistorialDetalle({ onVolver, sesion }: { onVolver: () => void; sesion: SesionConRecurso }) {
  const [preguntas, setPreguntas] = useState<PreguntaRow[]>([]);
  const [respuestasPorPregunta, setRespuestasPorPregunta] = useState<Record<string, RespuestaRow[]>>({});
  const [participantesCount, setParticipantesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      const [preguntasRes, participantesRes] = await Promise.all([
        fetchPreguntas(sesion.recurso_id),
        fetchParticipantes(sesion.id),
      ]);
      if (!activo) return;
      setPreguntas(preguntasRes.data);
      setParticipantesCount(participantesRes.data.length);

      const entries = await Promise.all(
        preguntasRes.data.map(async (pregunta) => {
          const { data } = await fetchRespuestas(sesion.id, pregunta.id);
          return [pregunta.id, data] as const;
        }),
      );
      if (!activo) return;
      setRespuestasPorPregunta(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => {
      activo = false;
    };
  }, [sesion.id, sesion.recurso_id]);

  return (
    <div className="grid gap-5">
      <button className="inline-flex w-fit items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30" onClick={onVolver} type="button">
        <ChevronLeft className="h-4 w-4" />
        Historial
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{sesion.gestionesjj_recursos?.titulo ?? "Encuesta"}</h2>
          <p className="text-sm text-slate-400">{formatearFechaHora(sesion.cerrada_at)}</p>
        </div>
        <span className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-slate-200">
          <Users className="h-4 w-4 text-emerald-300" />
          {participantesCount} participantes
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando resultados...</p>
      ) : (
        <div className="grid gap-4">
          {preguntas.map((pregunta, index) => (
            <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl" key={pregunta.id}>
              <p className="mb-3 text-sm font-semibold text-white">
                {index + 1}. {pregunta.texto}
              </p>
              <ResultadosPregunta pregunta={pregunta} respuestas={respuestasPorPregunta[pregunta.id] ?? []} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SesionHistorialQa({ onVolver, sesion }: { onVolver: () => void; sesion: SesionConRecurso }) {
  const [preguntas, setPreguntas] = useState<QaPreguntaOwnerRow[]>([]);
  const [participantesCount, setParticipantesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      const [preguntasRes, participantesRes] = await Promise.all([fetchQaPreguntas(sesion.id), fetchParticipantes(sesion.id)]);
      if (!activo) return;
      setPreguntas(preguntasRes.data);
      setParticipantesCount(participantesRes.data.length);
      setLoading(false);
    })();
    return () => {
      activo = false;
    };
  }, [sesion.id]);

  return (
    <div className="grid gap-5">
      <button
        className="inline-flex w-fit items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
        onClick={onVolver}
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
        Historial
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{sesion.gestionesjj_recursos?.titulo ?? "Preguntas del público"}</h2>
          <p className="text-sm text-slate-400">{formatearFechaHora(sesion.cerrada_at)}</p>
        </div>
        <span className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-slate-200">
          <Users className="h-4 w-4 text-emerald-300" />
          {participantesCount} participantes
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando preguntas...</p>
      ) : preguntas.length === 0 ? (
        <EmptyState>Nadie envió preguntas en esta sesión.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {preguntas.map((pregunta) => (
            <div
              className={`border p-3 ${pregunta.destacada ? "border-amber-300/60 bg-amber-300/10" : "border-white/10 bg-white/6"}`}
              key={pregunta.id}
            >
              <p className="text-sm leading-6 text-white">{pregunta.texto}</p>
              <p className="mt-1 text-xs text-slate-400">
                {pregunta.gestionesjj_recurso_participantes?.apodo ?? "Participante"} · {pregunta.votos} votos
                {pregunta.estado === "respondida" ? " · Respondida" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
