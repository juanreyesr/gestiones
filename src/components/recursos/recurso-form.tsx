"use client";

import { Gamepad2, ListChecks, X } from "lucide-react";
import { useState } from "react";
import { insertRecurso } from "@/lib/recursos/recursos";
import type { TipoRecurso } from "@/lib/recursos/types";
import { ModalPortal } from "../modal-portal";
import { BTN_GHOST, BTN_PRIMARY, Field } from "./ui";

export function RecursoForm({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const [tipo, setTipo] = useState<TipoRecurso>("encuesta");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    setError("");
    const { id, error: saveError } = await insertRecurso({
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
    });
    setSaving(false);
    if (saveError || !id) {
      setError(saveError ?? "No se pudo crear el recurso.");
      return;
    }
    onSaved(id);
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="grid w-full max-w-md gap-4 border border-white/10 bg-slate-950 p-5" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Nuevo recurso</h3>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className={`flex flex-col items-center gap-2 border px-3 py-3 text-sm font-semibold transition ${
                tipo === "encuesta" ? "border-emerald-300/70 bg-emerald-300/14 text-white" : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
              }`}
              onClick={() => setTipo("encuesta")}
              type="button"
            >
              <ListChecks className="h-5 w-5" />
              Encuesta
            </button>
            <button
              className={`flex flex-col items-center gap-2 border px-3 py-3 text-sm font-semibold transition ${
                tipo === "quiz" ? "border-emerald-300/70 bg-emerald-300/14 text-white" : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
              }`}
              onClick={() => setTipo("quiz")}
              type="button"
            >
              <Gamepad2 className="h-5 w-5" />
              Quiz
            </button>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            {tipo === "encuesta"
              ? "Preguntas de opinión sin respuesta correcta ni puntaje."
              : "Preguntas con respuesta correcta, temporizador y puntos por rapidez."}
          </p>

          <Field label="Título">
            <input autoFocus className="field" maxLength={120} onChange={(event) => setTitulo(event.target.value)} value={titulo} />
          </Field>
          <Field label="Descripción (opcional)">
            <textarea className="field resize-y" maxLength={300} onChange={(event) => setDescripcion(event.target.value)} rows={2} value={descripcion} />
          </Field>

          {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={!titulo.trim() || saving} onClick={() => void handleGuardar()} type="button">
              {saving ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
