"use client";

import { ArrowBigUp, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type QaPreguntaPublica = {
  id: string;
  texto: string;
  autorApodo: string | null;
  votos: number;
  estado: string;
  destacada: boolean;
  yoVote: boolean;
  esMia: boolean;
};

export function VivoQa({ participanteId, recursoTitulo }: { participanteId: string; recursoTitulo: string }) {
  const [preguntas, setPreguntas] = useState<QaPreguntaPublica[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [votandoId, setVotandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/recursos/qa/lista?participanteId=${participanteId}`);
      const data = (await res.json().catch(() => null)) as { preguntas?: QaPreguntaPublica[] } | null;
      if (data?.preguntas) setPreguntas(data.preguntas);
    } catch {
      // Se reintenta en el siguiente ciclo.
    }
  }, [participanteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de preguntas al montar el Q&A
    void cargar();
    const interval = setInterval(cargar, 2000);
    return () => clearInterval(interval);
  }, [cargar]);

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/recursos/qa/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId, texto: texto.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setEnviando(false);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar la pregunta.");
        return;
      }
      setTexto("");
      void cargar();
    } catch {
      setEnviando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  const handleVotar = async (preguntaId: string) => {
    if (votandoId) return;
    setVotandoId(preguntaId);
    setPreguntas((current) =>
      current.map((pregunta) =>
        pregunta.id === preguntaId
          ? { ...pregunta, yoVote: !pregunta.yoVote, votos: pregunta.votos + (pregunta.yoVote ? -1 : 1) }
          : pregunta,
      ),
    );
    try {
      await fetch("/api/recursos/qa/votar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId, preguntaId }),
      });
    } finally {
      setVotandoId(null);
      void cargar();
    }
  };

  return (
    <div className="grid gap-4 text-left">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">{recursoTitulo || "Preguntas del público"}</h1>
        <p className="mt-1 text-sm text-slate-400">Envía tu pregunta y vota las que más te interesen.</p>
      </div>

      <div className="grid gap-2">
        <textarea
          className="field resize-none"
          maxLength={280}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Escribe tu pregunta..."
          rows={2}
          value={texto}
        />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
          disabled={!texto.trim() || enviando}
          onClick={() => void handleEnviar()}
          type="button"
        >
          <Send className="h-4 w-4" />
          {enviando ? "Enviando..." : "Enviar pregunta"}
        </button>
        {error ? <p className="text-center text-sm font-semibold text-red-300">{error}</p> : null}
      </div>

      <div className="grid max-h-[45vh] gap-2 overflow-y-auto">
        {preguntas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Aún no hay preguntas. ¡Sé el primero!</p>
        ) : (
          preguntas.map((pregunta) => (
            <div
              className={`flex items-start gap-3 border p-3 ${
                pregunta.destacada ? "border-amber-300/60 bg-amber-300/10" : "border-white/10 bg-white/4"
              } ${pregunta.estado === "respondida" ? "opacity-60" : ""}`}
              key={pregunta.id}
            >
              <button
                className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border px-2.5 py-1.5 text-xs font-bold transition ${
                  pregunta.yoVote
                    ? "border-emerald-300 bg-emerald-300 text-slate-950"
                    : "border-white/10 bg-white/8 text-slate-300 hover:border-emerald-300/50"
                }`}
                onClick={() => void handleVotar(pregunta.id)}
                type="button"
              >
                <ArrowBigUp className="h-4 w-4" />
                {pregunta.votos}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-white">{pregunta.texto}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {pregunta.autorApodo ?? "Anónimo"}
                  {pregunta.estado === "respondida" ? " · Respondida" : ""}
                  {pregunta.esMia ? " · Tu pregunta" : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
