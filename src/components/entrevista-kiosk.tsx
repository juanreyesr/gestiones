"use client";

import { CheckCircle2, KeyRound, Save } from "lucide-react";
import { useState } from "react";
import { ENTREVISTA_ESCALA, ENTREVISTA_PREGUNTAS } from "@/data/evaluacion";
import { ModalPortal } from "./modal-portal";

export function EntrevistaKiosk({
  codigoDesbloqueo,
  estudiante,
  respuestasIniciales,
  onCerrar,
  onGuardar,
}: {
  codigoDesbloqueo: string;
  estudiante: 1 | 2;
  respuestasIniciales: Record<number, number>;
  onCerrar: () => void;
  onGuardar: (respuestas: Record<number, number>) => void;
}) {
  const [respuestas, setRespuestas] = useState<Record<number, number>>(respuestasIniciales);
  const [finalizado, setFinalizado] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [codigoIncorrecto, setCodigoIncorrecto] = useState(false);

  const respondidas = ENTREVISTA_PREGUNTAS.filter(
    (pregunta) => respuestas[pregunta.id] !== undefined && respuestas[pregunta.id] !== null,
  ).length;
  const completo = respondidas === ENTREVISTA_PREGUNTAS.length;

  const handleGuardar = () => {
    if (!completo) return;
    onGuardar(respuestas);
    setFinalizado(true);
  };

  const handleDesbloquear = () => {
    if (codigoIngresado === codigoDesbloqueo) {
      onCerrar();
      return;
    }
    setCodigoIncorrecto(true);
    setCodigoIngresado("");
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-[100] overflow-y-auto bg-[#08111f]">
        {finalizado ? (
          <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md border border-emerald-300/30 bg-emerald-300/10 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
              <h2 className="mt-4 text-2xl font-semibold text-white">Gracias por tus respuestas</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Ha finalizado la entrevista.</p>
              <p className="mt-4 text-xs text-slate-400">Entrega el dispositivo al coordinador para continuar.</p>

              <div className="mt-6 grid gap-2 text-left">
                <label className="grid gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                    <KeyRound className="h-3.5 w-3.5" />
                    Codigo de desbloqueo del coordinador
                  </span>
                  <input
                    autoFocus
                    className="field text-center tracking-widest"
                    onChange={(event) => {
                      setCodigoIngresado(event.target.value);
                      setCodigoIncorrecto(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleDesbloquear();
                    }}
                    type="password"
                    value={codigoIngresado}
                  />
                </label>
                {codigoIncorrecto ? <p className="text-xs font-semibold text-red-300">Codigo incorrecto. Intenta de nuevo.</p> : null}
              </div>

              <button
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-40"
                disabled={!codigoIngresado}
                onClick={handleDesbloquear}
                type="button"
              >
                Aceptar
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
            <div>
              <h1 className="text-2xl font-semibold text-white">Entrevista - Estudiante {estudiante}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Responde con sinceridad. Tus respuestas son privadas: el otro estudiante y el docente no las veran.
              </p>
              <p className="mt-2 text-xs font-semibold uppercase text-emerald-200">
                {respondidas}/{ENTREVISTA_PREGUNTAS.length} preguntas respondidas
              </p>
            </div>

            <div className="grid gap-3">
              {ENTREVISTA_PREGUNTAS.map((pregunta) => (
                <div key={pregunta.id} className="border border-white/10 bg-white/6 p-4">
                  <p className="mb-3 text-sm leading-6 text-slate-100">{pregunta.texto}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ENTREVISTA_ESCALA.map((opcion) => (
                      <button
                        key={opcion.value}
                        className={`border px-3 py-1.5 text-xs font-semibold transition ${
                          respuestas[pregunta.id] === opcion.value
                            ? "border-emerald-300 bg-emerald-300 text-slate-950"
                            : "border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                        }`}
                        onClick={() => setRespuestas((current) => ({ ...current, [pregunta.id]: opcion.value }))}
                        type="button"
                      >
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 bg-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-40"
              disabled={!completo}
              onClick={handleGuardar}
              type="button"
            >
              <Save className="h-4 w-4" />
              {completo ? "Guardar respuestas" : `Responde todas las preguntas para guardar (${respondidas}/${ENTREVISTA_PREGUNTAS.length})`}
            </button>
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
