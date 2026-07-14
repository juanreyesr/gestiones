"use client";

import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { deleteActividad, insertActividad, updateActividad } from "@/lib/cursos/actividades";
import { TIPO_ACTIVIDAD_LABELS, type ActividadRow, type EstudianteRow, type TipoActividad } from "@/lib/cursos/types";
import { CalificarActividadModal } from "./calificar-actividad-modal";
import { BTN_GHOST, BTN_PRIMARY, Chip, EmptyState, ErrorBanner, Field } from "./ui";

export function SemanaActividadesSection({
  actividades,
  estudiantesActivos,
  onReload,
  semanaId,
}: {
  actividades: ActividadRow[];
  estudiantesActivos: EstudianteRow[];
  onReload: () => void | Promise<void>;
  semanaId: string;
}) {
  const [modal, setModal] = useState<{ open: false } | { open: true; actividad: ActividadRow | null }>({ open: false });
  const [eliminar, setEliminar] = useState<ActividadRow | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  const [calificando, setCalificando] = useState<ActividadRow | null>(null);

  const handleEliminar = async () => {
    if (!eliminar) return;
    setEliminando(true);
    const { error: deleteError } = await deleteActividad(eliminar.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminar(null);
    await onReload();
  };

  return (
    <section className="border border-white/10 bg-white/6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Tareas y actividades</h3>
        <button className={BTN_GHOST} onClick={() => setModal({ open: true, actividad: null })} type="button">
          <Plus className="h-4 w-4" />
          Nueva tarea
        </button>
      </div>

      <ErrorBanner message={error} />

      {actividades.length === 0 ? (
        <EmptyState>Aún no hay tareas ni actividades para esta semana.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {actividades.map((actividad) => (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-3" key={actividad.id}>
              <div>
                <div className="flex items-center gap-2">
                  <Chip className="border-violet-300/40 bg-violet-300/15 text-violet-200">
                    {TIPO_ACTIVIDAD_LABELS[actividad.tipo]}
                  </Chip>
                  <span className="text-sm font-semibold text-white">{actividad.titulo}</span>
                </div>
                {actividad.descripcion ? <p className="mt-1 text-xs text-slate-400">{actividad.descripcion}</p> : null}
                <div className="mt-1 text-xs text-slate-500">
                  {actividad.punteo !== null ? `${actividad.punteo} pts · ` : ""}
                  {actividad.entrega_proxima_semana ? "Se entrega la próxima semana" : "Sin fecha de entrega definida"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className={BTN_GHOST} onClick={() => setCalificando(actividad)} type="button">
                  <ClipboardCheck className="h-4 w-4" />
                  Calificar
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                  onClick={() => setModal({ open: true, actividad })}
                  title="Editar"
                  type="button"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-300"
                  onClick={() => setEliminar(actividad)}
                  title="Eliminar"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open ? (
        <ActividadModal
          actividad={modal.actividad}
          onClose={() => setModal({ open: false })}
          onGuardado={async () => {
            setModal({ open: false });
            await onReload();
          }}
          semanaId={semanaId}
        />
      ) : null}

      {calificando ? (
        <CalificarActividadModal
          actividad={calificando}
          estudiantes={estudiantesActivos}
          onClose={() => setCalificando(null)}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará esta tarea junto con las calificaciones registradas."
        onCancel={() => setEliminar(null)}
        onConfirm={handleEliminar}
        open={eliminar !== null}
        title="Eliminar tarea"
      />
    </section>
  );
}

function ActividadModal({
  actividad,
  onClose,
  onGuardado,
  semanaId,
}: {
  actividad: ActividadRow | null;
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
  semanaId: string;
}) {
  const [tipo, setTipo] = useState<TipoActividad>(actividad?.tipo ?? "tarea");
  const [titulo, setTitulo] = useState(actividad?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "");
  const [entregaProximaSemana, setEntregaProximaSemana] = useState(actividad?.entrega_proxima_semana ?? true);
  const [tienePunteo, setTienePunteo] = useState(actividad?.punteo !== null && actividad?.punteo !== undefined);
  const [punteo, setPunteo] = useState(actividad?.punteo !== null && actividad?.punteo !== undefined ? String(actividad.punteo) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    const payload = {
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      entrega_proxima_semana: entregaProximaSemana,
      punteo: tienePunteo && punteo.trim() ? Number(punteo) : null,
    };
    const { error: saveError } = actividad
      ? await updateActividad(actividad.id, payload)
      : await insertActividad({ semana_id: semanaId, ...payload });
    setGuardando(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    await onGuardado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-md border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">{actividad ? "Editar tarea" : "Nueva tarea"}</h3>
          <div className="grid gap-3">
            <Field label="Tipo">
              <select className="field" onChange={(event) => setTipo(event.target.value as TipoActividad)} value={tipo}>
                {(Object.keys(TIPO_ACTIVIDAD_LABELS) as TipoActividad[]).map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {TIPO_ACTIVIDAD_LABELS[opcion]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Título">
              <input className="field" onChange={(event) => setTitulo(event.target.value)} value={titulo} />
            </Field>
            <Field label="Descripción">
              <textarea className="field" onChange={(event) => setDescripcion(event.target.value)} rows={2} value={descripcion} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                checked={entregaProximaSemana}
                onChange={(event) => setEntregaProximaSemana(event.target.checked)}
                type="checkbox"
              />
              Se entrega la próxima semana
            </label>
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">¿Deseas asignarle un punteo?</span>
              <div className="flex gap-2">
                <button
                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                    tienePunteo
                      ? "border-emerald-300 bg-emerald-300 text-slate-950"
                      : "border-white/10 bg-white/8 text-slate-300"
                  }`}
                  onClick={() => setTienePunteo(true)}
                  type="button"
                >
                  Sí
                </button>
                <button
                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                    !tienePunteo
                      ? "border-emerald-300 bg-emerald-300 text-slate-950"
                      : "border-white/10 bg-white/8 text-slate-300"
                  }`}
                  onClick={() => setTienePunteo(false)}
                  type="button"
                >
                  No
                </button>
              </div>
              {tienePunteo ? (
                <input
                  className="field"
                  min={0}
                  onChange={(event) => setPunteo(event.target.value)}
                  placeholder="Puntos"
                  type="number"
                  value={punteo}
                />
              ) : null}
            </div>
          </div>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleGuardar} type="button">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
