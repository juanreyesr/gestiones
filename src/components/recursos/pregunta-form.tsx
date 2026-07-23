"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { insertPregunta, updatePregunta } from "@/lib/recursos/recursos";
import { nuevaOpcionId, TIPO_PREGUNTA_LABELS, type OpcionPregunta, type PreguntaRow, type TipoPregunta } from "@/lib/recursos/types";
import { ModalPortal } from "../modal-portal";
import { BTN_GHOST, BTN_PRIMARY, Field } from "./ui";

const TIPOS: TipoPregunta[] = ["opcion_multiple", "nube_palabras", "abierta", "escala"];

export function PreguntaForm({
  esQuiz,
  onClose,
  onSaved,
  orden,
  pregunta,
  recursoId,
}: {
  esQuiz: boolean;
  onClose: () => void;
  onSaved: () => void;
  orden: number;
  pregunta: PreguntaRow | null;
  recursoId: string;
}) {
  const [tipo, setTipo] = useState<TipoPregunta>(pregunta?.tipo_pregunta ?? "opcion_multiple");
  const [texto, setTexto] = useState(pregunta?.texto ?? "");
  const [opciones, setOpciones] = useState<OpcionPregunta[]>(
    pregunta?.opciones ?? [
      { id: nuevaOpcionId(), texto: "" },
      { id: nuevaOpcionId(), texto: "" },
    ],
  );
  const [escalaMin, setEscalaMin] = useState(pregunta?.escala_min ?? 1);
  const [escalaMax, setEscalaMax] = useState(pregunta?.escala_max ?? 5);
  const [tiempoLimite, setTiempoLimite] = useState(pregunta?.tiempo_limite ?? 20);
  const [puntos, setPuntos] = useState(pregunta?.puntos ?? 1000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const opcionesValidas = opciones.filter((op) => op.texto.trim().length > 0);
  const tieneCorrecta = !esQuiz || opcionesValidas.some((op) => op.correcta);
  const puedeGuardar =
    texto.trim().length > 0 &&
    (tipo !== "opcion_multiple" || opcionesValidas.length >= 2) &&
    (tipo !== "escala" || escalaMax > escalaMin) &&
    tieneCorrecta;

  const handleGuardar = async () => {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    setError("");

    const payload = {
      texto: texto.trim(),
      opciones: tipo === "opcion_multiple" ? opcionesValidas : null,
      escala_min: escalaMin,
      escala_max: escalaMax,
      tiempo_limite: esQuiz ? tiempoLimite : null,
      puntos: esQuiz ? puntos : 1000,
    };

    const result = pregunta
      ? await updatePregunta(pregunta.id, payload)
      : await insertPregunta({ recurso_id: recursoId, orden, tipo_pregunta: esQuiz ? "opcion_multiple" : tipo, ...payload });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="grid max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{pregunta ? "Editar pregunta" : "Nueva pregunta"}</h3>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          {esQuiz ? null : (
            <Field label="Tipo de pregunta">
              <select className="field" onChange={(event) => setTipo(event.target.value as TipoPregunta)} value={tipo}>
                {TIPOS.map((item) => (
                  <option key={item} value={item}>
                    {TIPO_PREGUNTA_LABELS[item]}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Pregunta">
            <textarea
              className="field resize-y"
              maxLength={300}
              onChange={(event) => setTexto(event.target.value)}
              rows={2}
              value={texto}
            />
          </Field>

          {esQuiz ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tiempo límite (segundos)">
                <input
                  className="field"
                  min={5}
                  max={120}
                  onChange={(event) => setTiempoLimite(Number(event.target.value))}
                  type="number"
                  value={tiempoLimite}
                />
              </Field>
              <Field label="Puntos máximos">
                <input className="field" min={100} step={100} onChange={(event) => setPuntos(Number(event.target.value))} type="number" value={puntos} />
              </Field>
            </div>
          ) : null}

          {tipo === "opcion_multiple" ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Opciones{esQuiz ? " (marca la correcta)" : ""}
              </span>
              {opciones.map((opcion, index) => (
                <div className="flex items-center gap-2" key={opcion.id}>
                  {esQuiz ? (
                    <button
                      className={`flex h-10 w-10 shrink-0 items-center justify-center border transition ${
                        opcion.correcta ? "border-emerald-300 bg-emerald-300 text-slate-950" : "border-white/10 bg-white/8 text-slate-400 hover:border-emerald-300/50"
                      }`}
                      onClick={() =>
                        setOpciones((current) => current.map((op, i) => ({ ...op, correcta: i === index })))
                      }
                      title="Marcar como correcta"
                      type="button"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : null}
                  <input
                    className="field"
                    onChange={(event) =>
                      setOpciones((current) =>
                        current.map((op, i) => (i === index ? { ...op, texto: event.target.value } : op)),
                      )
                    }
                    placeholder={`Opción ${index + 1}`}
                    value={opcion.texto}
                  />
                  <button
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/8 text-red-300 transition hover:border-red-400/60 disabled:opacity-30"
                    disabled={opciones.length <= 2}
                    onClick={() => setOpciones((current) => current.filter((_, i) => i !== index))}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
                onClick={() => setOpciones((current) => [...current, { id: nuevaOpcionId(), texto: "" }])}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar opción
              </button>
              {esQuiz && !tieneCorrecta ? <p className="text-xs font-semibold text-amber-300">Marca cuál opción es la correcta.</p> : null}
            </div>
          ) : null}

          {tipo === "escala" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor mínimo">
                <input
                  className="field"
                  min={0}
                  onChange={(event) => setEscalaMin(Number(event.target.value))}
                  type="number"
                  value={escalaMin}
                />
              </Field>
              <Field label="Valor máximo">
                <input
                  className="field"
                  min={escalaMin + 1}
                  onChange={(event) => setEscalaMax(Number(event.target.value))}
                  type="number"
                  value={escalaMax}
                />
              </Field>
            </div>
          ) : null}

          {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={!puedeGuardar || saving} onClick={() => void handleGuardar()} type="button">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
