"use client";

import { CalendarClock, ChevronLeft, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  crearSesionManual,
  editarSesion,
  type ItemSesion,
  type SesionEditableInput,
} from "@/lib/clinica/sesiones";
import { claveDiaLocal } from "@/lib/clinica/slots";
import type { PacienteRow, SesionModalidad, SesionRow } from "@/lib/clinica/types";
import { BTN_GHOST, BTN_PRIMARY, Field } from "./ui";

type ItemEditable = { key: string; id?: string; descripcion: string };

function toLocalInput(iso: string) {
  const date = new Date(iso);
  return `${claveDiaLocal(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function nuevaFechaPorDefecto() {
  const ahora = new Date();
  ahora.setHours(9, 0, 0, 0);
  return toLocalInput(ahora.toISOString());
}

function itemsDesde(items: { id: string; descripcion: string }[]): ItemEditable[] {
  return items.map((item, index) => ({ key: `${item.id}-${index}`, id: item.id, descripcion: item.descripcion }));
}

function ListaItems({
  items,
  label,
  onChange,
  placeholder,
}: {
  items: ItemEditable[];
  label: string;
  onChange: (items: ItemEditable[]) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2">
            <input
              className="field"
              onChange={(event) =>
                onChange(items.map((it, i) => (i === index ? { ...it, descripcion: event.target.value } : it)))
              }
              placeholder={placeholder}
              value={item.descripcion}
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
          onClick={() => onChange([...items, { key: `nuevo-${Date.now()}-${items.length}`, descripcion: "" }])}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>
    </div>
  );
}

export function SesionEditor({
  onCancelar,
  onGuardado,
  paciente,
  sesion,
}: {
  onCancelar: () => void;
  onGuardado: () => void;
  paciente: PacienteRow;
  sesion: SesionRow | null;
}) {
  const esNueva = sesion === null;

  const [fecha, setFecha] = useState(() => (sesion ? toLocalInput(sesion.iniciadaAt) : nuevaFechaPorDefecto()));
  const [modalidad, setModalidad] = useState<SesionModalidad | null>(sesion?.modalidad ?? null);
  const [tema, setTema] = useState(sesion?.tema ?? "");
  const [notas, setNotas] = useState(sesion?.notas ?? "");
  const [resumen, setResumen] = useState(sesion?.resumen ?? "");
  const [seguimiento, setSeguimiento] = useState(sesion?.seguimiento ?? "");
  const [compromisos, setCompromisos] = useState<ItemEditable[]>(() =>
    itemsDesde((sesion?.compromisos ?? []).filter((c) => c.tipo === "compromiso"))
  );
  const [tareas, setTareas] = useState<ItemEditable[]>(() =>
    itemsDesde((sesion?.compromisos ?? []).filter((c) => c.tipo === "tarea"))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fechaValida = useMemo(() => fecha.length > 0 && !Number.isNaN(new Date(fecha).getTime()), [fecha]);

  const handleGuardar = async () => {
    if (saving) return;
    if (!fechaValida) {
      setError("Indica una fecha válida para la sesión.");
      return;
    }
    setSaving(true);
    setError("");

    const limpiar = (items: ItemEditable[]): ItemSesion[] =>
      items
        .filter((item) => item.descripcion.trim().length > 0)
        .map((item) => ({ id: item.id, descripcion: item.descripcion.trim() }));

    const input: SesionEditableInput = {
      fechaIso: new Date(fecha).toISOString(),
      modalidad,
      tema: tema.trim() || null,
      notas: notas.trim() || null,
      resumen: resumen.trim() || null,
      seguimiento: seguimiento.trim() || null,
      compromisos: limpiar(compromisos),
      tareas: limpiar(tareas),
    };

    const { error: saveError } = esNueva
      ? await crearSesionManual(paciente.id, input)
      : await editarSesion(sesion!.id, paciente.id, input);

    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    onGuardado();
  };

  return (
    <div className="grid gap-4">
      <button className={`${BTN_GHOST} w-fit`} onClick={onCancelar} type="button">
        <ChevronLeft className="h-4 w-4" />
        Volver al expediente
      </button>

      <h2 className="text-xl font-semibold text-white">
        {esNueva ? "Agregar sesión anterior" : "Editar sesión"} · {paciente.nombre}
      </h2>
      {esNueva ? (
        <p className="text-sm text-slate-400">
          Registra una sesión que ocurrió antes de usar el sistema. Indica su fecha real y captura las notas del día.
        </p>
      ) : null}

      <div className="grid gap-4 border border-white/10 bg-white/6 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha y hora de la sesión *">
            <input className="field" onChange={(event) => setFecha(event.target.value)} type="datetime-local" value={fecha} />
          </Field>
          <Field label="Tipo de sesión">
            <select
              className="field"
              onChange={(event) => setModalidad((event.target.value || null) as SesionModalidad | null)}
              value={modalidad ?? ""}
            >
              <option value="">Sin especificar</option>
              <option value="seguimiento">Seguimiento de la sesión anterior</option>
              <option value="tema_nuevo">Tema específico</option>
            </select>
          </Field>
        </div>

        {modalidad === "tema_nuevo" ? (
          <Field label="Tema abordado">
            <input className="field" onChange={(event) => setTema(event.target.value)} placeholder="Tema de la sesión" value={tema} />
          </Field>
        ) : null}

        <Field label="Notas de la sesión">
          <textarea
            className="field min-h-[140px] resize-y leading-7"
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Lo que se trabajó ese día."
            value={notas}
          />
        </Field>

        <Field label="Resumen">
          <textarea
            className="field resize-y"
            onChange={(event) => setResumen(event.target.value)}
            placeholder="Resumen de la sesión."
            rows={4}
            value={resumen}
          />
        </Field>

        <Field label="Aspectos a dar seguimiento">
          <textarea
            className="field resize-y"
            onChange={(event) => setSeguimiento(event.target.value)}
            rows={2}
            value={seguimiento}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ListaItems items={compromisos} label="Compromisos" onChange={setCompromisos} placeholder="Compromiso del paciente" />
          <ListaItems items={tareas} label="Tareas para la próxima sesión" onChange={setTareas} placeholder="Tarea asignada" />
        </div>
      </div>

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={BTN_PRIMARY} disabled={saving || !fechaValida} onClick={handleGuardar} type="button">
          {esNueva ? <CalendarClock className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando..." : esNueva ? "Guardar sesión anterior" : "Guardar cambios"}
        </button>
        <button className={BTN_GHOST} disabled={saving} onClick={onCancelar} type="button">
          <Trash2 className="h-4 w-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
