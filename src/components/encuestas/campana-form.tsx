"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchCarreras, insertCampana, updateCampana } from "@/lib/encuestas/campanas";
import type { CampanaConConteo } from "@/lib/encuestas/types";
import { ModalPortal } from "../modal-portal";
import { BTN_GHOST, BTN_PRIMARY, Field } from "./ui";

export function CampanaForm({
  campana,
  onClose,
  onSaved,
}: {
  campana: CampanaConConteo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(campana?.titulo ?? "");
  const [anio, setAnio] = useState(campana?.anio ?? new Date().getFullYear());
  const [carreraId, setCarreraId] = useState(campana?.carrera_id ?? "");
  const [notas, setNotas] = useState(campana?.notas ?? "");
  const [carreras, setCarreras] = useState<Array<{ id: string; nombre: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await fetchCarreras();
      setCarreras(data);
    })();
  }, []);

  const handleGuardar = async () => {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    setError("");

    const payload = { titulo: titulo.trim(), anio, carrera_id: carreraId || null, notas: notas.trim() || null };
    const result = campana ? await updateCampana(campana.id, payload) : await insertCampana(payload);

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
        <div className="grid w-full max-w-md gap-4 border border-white/10 bg-slate-950 p-5" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{campana ? "Editar campaña" : "Nueva campaña"}</h3>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          <Field label="Título">
            <input
              autoFocus
              className="field"
              maxLength={120}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Encuesta de primer ingreso 2026"
              value={titulo}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Año">
              <input className="field" onChange={(event) => setAnio(Number(event.target.value))} type="number" value={anio} />
            </Field>
            <Field label="Carrera (opcional)">
              <select className="field" onChange={(event) => setCarreraId(event.target.value)} value={carreraId}>
                <option value="">Todas</option>
                {carreras.map((carrera) => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notas internas (opcional)">
            <textarea className="field resize-y" maxLength={300} onChange={(event) => setNotas(event.target.value)} rows={2} value={notas} />
          </Field>

          {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={!titulo.trim() || saving} onClick={() => void handleGuardar()} type="button">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
