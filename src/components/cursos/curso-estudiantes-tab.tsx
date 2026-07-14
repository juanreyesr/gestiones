"use client";

import { ChevronDown, ChevronUp, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import {
  deleteEstudiante,
  fetchEstudiantes,
  fetchEventos,
  insertEstudiante,
  reincorporarEstudiante,
  retirarEstudiante,
} from "@/lib/cursos/estudiantes";
import {
  TIPO_EVENTO_LABELS,
  formatearFechaHora,
  type EstudianteEventoRow,
  type EstudianteRow,
} from "@/lib/cursos/types";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field } from "./ui";

export function CursoEstudiantesTab({ cursoId }: { cursoId: string }) {
  const [estudiantes, setEstudiantes] = useState<EstudianteRow[]>([]);
  const [eventos, setEventos] = useState<EstudianteEventoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [carne, setCarne] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [retirarObjetivo, setRetirarObjetivo] = useState<EstudianteRow | null>(null);
  const [eliminarObjetivo, setEliminarObjetivo] = useState<EstudianteRow | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data: estudiantesData, error: errorEstudiantes }, { data: eventosData }] = await Promise.all([
      fetchEstudiantes(cursoId),
      fetchEventos(cursoId),
    ]);
    setEstudiantes(estudiantesData);
    setEventos(eventosData);
    setError(errorEstudiantes ?? "");
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga estudiantes al cambiar de curso
    void cargar();
  }, [cargar]);

  const handleAgregar = async () => {
    if (!nombre.trim()) {
      setError("El nombre del estudiante es obligatorio.");
      return;
    }
    setGuardando(true);
    const { error: insertError } = await insertEstudiante({
      curso_id: cursoId,
      nombre: nombre.trim(),
      correo: correo.trim() || null,
      carne: carne.trim() || null,
    });
    setGuardando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    setNombre("");
    setCorreo("");
    setCarne("");
    setError("");
    await cargar();
  };

  const handleEliminar = async () => {
    if (!eliminarObjetivo) return;
    setEliminando(true);
    const { error: deleteError } = await deleteEstudiante(eliminarObjetivo.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminarObjetivo(null);
    await cargar();
  };

  const activos = estudiantes.filter((e) => e.estado === "activo");
  const retirados = estudiantes.filter((e) => e.estado === "retirado");
  const estudiantesPorId = new Map(estudiantes.map((e) => [e.id, e.nombre]));

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />

      <div className="grid gap-3 border border-white/10 bg-white/6 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="Nombre">
          <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
        </Field>
        <Field label="Correo">
          <input className="field" onChange={(event) => setCorreo(event.target.value)} value={correo} />
        </Field>
        <Field label="Carné">
          <input className="field" onChange={(event) => setCarne(event.target.value)} value={carne} />
        </Field>
        <div className="flex items-end">
          <button className={BTN_PRIMARY} disabled={guardando} onClick={handleAgregar} type="button">
            <UserPlus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : estudiantes.length === 0 ? (
        <EmptyState>Aún no hay estudiantes registrados en este curso.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {[...activos, ...retirados].map((estudiante) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-3"
              key={estudiante.id}
            >
              <div>
                <div className="text-sm font-semibold text-white">{estudiante.nombre}</div>
                <div className="text-xs text-slate-400">
                  {[estudiante.correo, estudiante.carne].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </div>
                <div className="text-xs text-slate-500">Asignado: {formatearFechaHora(estudiante.asignado_en)}</div>
              </div>
              <div className="flex items-center gap-2">
                {estudiante.estado === "activo" ? (
                  <button
                    className={BTN_GHOST}
                    onClick={() => setRetirarObjetivo(estudiante)}
                    type="button"
                  >
                    <UserMinus className="h-4 w-4" />
                    Retirar
                  </button>
                ) : (
                  <>
                    <span className="border border-slate-400/40 bg-slate-400/15 px-2 py-1 text-xs font-semibold text-slate-300">
                      Retirado el {formatearFechaHora(estudiante.retirado_en)}
                    </span>
                    <button
                      className={BTN_GHOST}
                      onClick={async () => {
                        const { error: reincorporarError } = await reincorporarEstudiante(estudiante.id, cursoId);
                        if (reincorporarError) setError(reincorporarError);
                        await cargar();
                      }}
                      type="button"
                    >
                      <UserPlus className="h-4 w-4" />
                      Reincorporar
                    </button>
                    <button
                      className="flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-300"
                      onClick={() => setEliminarObjetivo(estudiante)}
                      title="Eliminar definitivamente"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-white/10 bg-white/6">
        <button
          className="flex w-full items-center justify-between p-3 text-sm font-semibold text-slate-200"
          onClick={() => setHistorialAbierto((prev) => !prev)}
          type="button"
        >
          Historial de movimientos
          {historialAbierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {historialAbierto ? (
          <div className="grid gap-1.5 border-t border-white/10 p-3">
            {eventos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin movimientos registrados.</p>
            ) : (
              eventos.map((evento) => (
                <p className="text-xs text-slate-400" key={evento.id}>
                  {formatearFechaHora(evento.ocurrido_en)} · {estudiantesPorId.get(evento.estudiante_id) ?? "Estudiante"} ·{" "}
                  {TIPO_EVENTO_LABELS[evento.tipo]}
                  {evento.nota ? ` — ${evento.nota}` : ""}
                </p>
              ))
            )}
          </div>
        ) : null}
      </div>

      {retirarObjetivo ? (
        <RetirarModal
          cursoId={cursoId}
          estudiante={retirarObjetivo}
          onClose={() => setRetirarObjetivo(null)}
          onRetirado={async () => {
            setRetirarObjetivo(null);
            await cargar();
          }}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará este estudiante de forma definitiva, junto con su historial, asistencias y calificaciones."
        onCancel={() => setEliminarObjetivo(null)}
        onConfirm={handleEliminar}
        open={eliminarObjetivo !== null}
        title="Eliminar estudiante"
      />
    </div>
  );
}

function RetirarModal({
  cursoId,
  estudiante,
  onClose,
  onRetirado,
}: {
  cursoId: string;
  estudiante: EstudianteRow;
  onClose: () => void;
  onRetirado: () => void | Promise<void>;
}) {
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleRetirar = async () => {
    setGuardando(true);
    const { error: retirarError } = await retirarEstudiante(estudiante.id, cursoId, nota.trim() || null);
    setGuardando(false);
    if (retirarError) {
      setError(retirarError);
      return;
    }
    await onRetirado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-3 text-lg font-semibold text-white">Retirar a {estudiante.nombre}</h3>
          <Field label="Nota (opcional)">
            <textarea className="field" onChange={(event) => setNota(event.target.value)} rows={2} value={nota} />
          </Field>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleRetirar} type="button">
              {guardando ? "Guardando..." : "Confirmar retiro"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
