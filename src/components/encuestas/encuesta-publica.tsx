"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { respuestaVacia, type RespuestaEncuestaPayload } from "@/lib/encuestas/types";
import {
  SeccionCarrera,
  SeccionCierre,
  SeccionComoLlego,
  SeccionExpectativas,
  SeccionPerfil,
  SeccionUniversidad,
} from "./secciones";

type Paso = "cargando" | "invalida" | "encuesta" | "enviada";

const TOTAL_PASOS = 6;

export function EncuestaPublica({ token }: { token: string }) {
  const [paso, setPaso] = useState<Paso>("cargando");
  const [titulo, setTitulo] = useState("");
  const [pasoActual, setPasoActual] = useState(0);
  const [valor, setValor] = useState<RespuestaEncuestaPayload>(respuestaVacia());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await fetch(`/api/encuestas/info?token=${token}`);
        const data = (await res.json().catch(() => null)) as { titulo?: string; error?: string } | null;
        if (!activo) return;
        if (!res.ok || !data) {
          setError(data?.error ?? "Esta encuesta no está disponible.");
          setPaso("invalida");
          return;
        }
        setTitulo(data.titulo ?? "Encuesta estudiantil");
        setPaso("encuesta");
      } catch {
        if (!activo) return;
        setError("Error de conexión. Intenta de nuevo.");
        setPaso("invalida");
      }
    })();
    return () => {
      activo = false;
    };
  }, [token]);

  const onChange = (patch: Partial<RespuestaEncuestaPayload>) => setValor((current) => ({ ...current, ...patch }));

  const puedeAvanzar = (() => {
    switch (pasoActual) {
      case 0:
        return valor.fuente_conocimiento.trim() !== "";
      case 1:
        return valor.razones_universidad.length > 0;
      case 2:
        return valor.razones_carrera.length > 0 && valor.quien_influyo.trim() !== "";
      case 3:
        return valor.expectativas_carrera.length > 0 && valor.expectativa_universidad.length > 0;
      default:
        return true;
    }
  })();

  const handleEnviar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/encuestas/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...valor }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setEnviando(false);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar la encuesta.");
        return;
      }
      setPaso("enviada");
    } catch {
      setEnviando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {paso === "cargando" ? <p className="py-10 text-center text-sm text-slate-400">Cargando encuesta...</p> : null}

          {paso === "invalida" ? (
            <div className="grid gap-3 py-8 text-center">
              <p className="text-lg font-semibold text-slate-900">No se pudo abrir la encuesta</p>
              <p className="text-sm leading-6 text-slate-400">{error}</p>
            </div>
          ) : null}

          {paso === "encuesta" ? (
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{titulo}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Paso {pasoActual + 1} de {TOTAL_PASOS}
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${((pasoActual + 1) / TOTAL_PASOS) * 100}%` }}
                  />
                </div>
              </div>

              {pasoActual === 0 ? <SeccionComoLlego light onChange={onChange} valor={valor} /> : null}
              {pasoActual === 1 ? <SeccionUniversidad light onChange={onChange} valor={valor} /> : null}
              {pasoActual === 2 ? <SeccionCarrera light onChange={onChange} valor={valor} /> : null}
              {pasoActual === 3 ? <SeccionExpectativas light onChange={onChange} valor={valor} /> : null}
              {pasoActual === 4 ? <SeccionPerfil light onChange={onChange} valor={valor} /> : null}
              {pasoActual === 5 ? <SeccionCierre light onChange={onChange} valor={valor} /> : null}

              {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-30"
                  disabled={pasoActual === 0}
                  onClick={() => setPasoActual((p) => Math.max(0, p - 1))}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Atrás
                </button>

                {pasoActual < TOTAL_PASOS - 1 ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-40"
                    disabled={!puedeAvanzar}
                    onClick={() => setPasoActual((p) => Math.min(TOTAL_PASOS - 1, p + 1))}
                    type="button"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-40"
                    disabled={enviando}
                    onClick={() => void handleEnviar()}
                    type="button"
                  >
                    <Send className="h-4 w-4" />
                    {enviando ? "Enviando..." : "Enviar encuesta"}
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {paso === "enviada" ? (
            <div className="grid gap-3 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">¡Gracias por responder!</p>
              <p className="text-sm leading-6 text-slate-400">Tu respuesta es anónima y ayuda a mejorar la universidad.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
