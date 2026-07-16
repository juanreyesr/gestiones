"use client";

import { CheckCheck, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { generarResumenIA } from "@/lib/clinica/ai-client";
import type { CompromisoRow, ResumenOrigen, SesionModalidad } from "@/lib/clinica/types";
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, Field } from "./ui";

export type CierreValues = {
  resumen: string;
  seguimiento: string;
  compromisos: string[];
  tareas: string[];
  resumenOrigen: ResumenOrigen;
  seguimientoIds: string[];
};

function ListaEditable({
  items,
  label,
  onChange,
  placeholder,
}: {
  items: string[];
  label: string;
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="field"
              onChange={(event) => onChange(items.map((value, i) => (i === index ? event.target.value : value)))}
              placeholder={placeholder}
              value={item}
            />
            <button
              aria-label="Quitar"
              className="shrink-0 border border-white/10 bg-white/8 p-2 text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-emerald-300 transition hover:text-emerald-200"
          onClick={() => onChange([...items, ""])}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>
    </div>
  );
}

export function CierreForm({
  modalidad,
  notas,
  onGuardar,
  onVolver,
  pendientes,
  resumenAnterior,
  saving,
  tema,
}: {
  modalidad: SesionModalidad | null;
  notas: string;
  onGuardar: (values: CierreValues) => void;
  onVolver: () => void;
  pendientes: CompromisoRow[];
  resumenAnterior: string | null;
  saving: boolean;
  tema: string | null;
}) {
  const [resumen, setResumen] = useState("");
  const [seguimiento, setSeguimiento] = useState("");
  const [compromisos, setCompromisos] = useState<string[]>([]);
  const [tareas, setTareas] = useState<string[]>([]);
  const [origen, setOrigen] = useState<ResumenOrigen>("manual");
  const [seguimientoIds, setSeguimientoIds] = useState<Set<string>>(new Set());
  const [generando, setGenerando] = useState(false);
  const [iaNoConfigurada, setIaNoConfigurada] = useState(false);
  const [iaError, setIaError] = useState("");
  const [error, setError] = useState("");

  const toggleSeguimiento = (id: string) =>
    setSeguimientoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleGenerar = async () => {
    if (generando) return;
    setGenerando(true);
    setIaError("");
    const { data, noConfigurado, error: genError } = await generarResumenIA({
      notas,
      tema,
      modalidad,
      resumenAnterior,
    });
    setGenerando(false);

    if (noConfigurado) {
      setIaNoConfigurada(true);
      return;
    }
    if (genError || !data) {
      setIaError(genError ?? "No se pudo generar el resumen.");
      return;
    }

    setResumen(data.resumen);
    setSeguimiento(data.seguimiento);
    setCompromisos(data.compromisos.length > 0 ? data.compromisos : []);
    setTareas(data.tareas.length > 0 ? data.tareas : []);
    setOrigen("ia");
  };

  const handleGuardar = () => {
    if (resumen.trim().length === 0) {
      setError("El resumen es obligatorio para finalizar la sesión.");
      return;
    }
    setError("");
    onGuardar({
      resumen: resumen.trim(),
      seguimiento: seguimiento.trim(),
      compromisos: compromisos.map((item) => item.trim()).filter(Boolean),
      tareas: tareas.map((item) => item.trim()).filter(Boolean),
      resumenOrigen: origen,
      seguimientoIds: Array.from(seguimientoIds),
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Cierre de la sesión</h3>
        {!iaNoConfigurada ? (
          <button className={BTN_ACCENT} disabled={generando || notas.trim().length === 0} onClick={handleGenerar} type="button">
            <Sparkles className="h-4 w-4" />
            {generando ? "Generando..." : "Generar resumen con IA"}
          </button>
        ) : (
          <span className="text-xs text-slate-400">
            La IA no está configurada (falta ANTHROPIC_API_KEY). Completa el cierre manualmente.
          </span>
        )}
      </div>

      {notas.trim().length === 0 && !iaNoConfigurada ? (
        <p className="text-xs text-slate-500">Escribe notas durante la sesión para poder generar el resumen con IA.</p>
      ) : null}
      {iaError ? <div className="border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-200">{iaError}</div> : null}
      {origen === "ia" ? (
        <p className="text-xs text-emerald-300">
          Resumen generado con IA. Revísalo y ajústalo antes de guardar: tú tienes la última palabra.
        </p>
      ) : null}

      <Field label="Resumen de la sesión *">
        <textarea
          className="field resize-y"
          onChange={(event) => {
            setResumen(event.target.value);
          }}
          placeholder="¿Qué se trabajó hoy? Principales temas, avances y observaciones."
          rows={6}
          value={resumen}
        />
      </Field>

      <Field label="Aspectos a dar seguimiento">
        <textarea
          className="field resize-y"
          onChange={(event) => setSeguimiento(event.target.value)}
          placeholder="Puntos que conviene retomar o vigilar en próximas sesiones."
          rows={3}
          value={seguimiento}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListaEditable
          items={compromisos}
          label="Compromisos del paciente"
          onChange={setCompromisos}
          placeholder="Ej. Practicar la técnica de respiración a diario"
        />
        <ListaEditable
          items={tareas}
          label="Tareas para la próxima sesión"
          onChange={setTareas}
          placeholder="Ej. Llevar registro de pensamientos"
        />
      </div>

      {pendientes.length > 0 ? (
        <div className="grid gap-2 border border-white/10 bg-white/4 p-4">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              Dar seguimiento a lo pendiente
            </span>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Marca los compromisos o tareas de la sesión anterior que sigan vigentes: se trasladarán a esta
              sesión para continuar dándoles seguimiento, sin volver a escribirlos.
            </p>
          </div>
          <ul className="grid gap-2">
            {pendientes.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-2.5 border border-white/10 bg-white/4 p-2.5 transition hover:border-emerald-300/40">
                  <input
                    checked={seguimientoIds.has(item.id)}
                    className="mt-1 h-4 w-4 accent-emerald-300"
                    onChange={() => toggleSeguimiento(item.id)}
                    type="checkbox"
                  />
                  <span>
                    <span className="block text-sm leading-5 text-slate-200">{item.descripcion}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {item.tipo === "compromiso" ? "Compromiso" : "Tarea"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button className={BTN_GHOST} disabled={saving} onClick={onVolver} type="button">
          Volver a la sesión
        </button>
        <button className={BTN_PRIMARY} disabled={saving} onClick={handleGuardar} type="button">
          <CheckCheck className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar y finalizar"}
        </button>
      </div>
    </div>
  );
}
