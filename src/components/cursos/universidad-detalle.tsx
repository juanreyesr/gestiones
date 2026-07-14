"use client";

import { Building2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { urlFirmada } from "@/lib/cursos/archivos";
import {
  clonarCurso,
  deleteCurso,
  fetchCursosPorUniversidad,
  fetchTodosLosCursos,
  insertCurso,
  updateCurso,
} from "@/lib/cursos/cursos";
import { ESTADO_CURSO_LABELS, type CursoConUniversidadRow, type CursoImpartidoRow, type UniversidadRow } from "@/lib/cursos/types";
import { BTN_GHOST, BTN_PRIMARY, CardBox, Chip, EmptyState, ErrorBanner, Field } from "./ui";

const ESTADO_CHIP: Record<string, string> = {
  activo: "border-emerald-300/40 bg-emerald-300/15 text-emerald-200",
  finalizado: "border-sky-300/40 bg-sky-300/15 text-sky-200",
  archivado: "border-slate-400/40 bg-slate-400/15 text-slate-300",
};

export function UniversidadDetalle({
  onOpenCurso,
  onUniversidadesChanged,
  universidad,
}: {
  onOpenCurso: (curso: CursoImpartidoRow) => void;
  onUniversidadesChanged: () => void | Promise<void>;
  universidad: UniversidadRow;
}) {
  const [cursos, setCursos] = useState<CursoImpartidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editando, setEditando] = useState<CursoImpartidoRow | null>(null);
  const [eliminarCurso, setEliminarCurso] = useState<CursoImpartidoRow | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarCursos = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchCursosPorUniversidad(universidad.id);
    setCursos(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, [universidad.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga los cursos al cambiar de universidad
    void cargarCursos();
  }, [cargarCursos]);

  useEffect(() => {
    let cancelado = false;
    if (!universidad.logo_path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia la url del logo cuando la universidad ya no tiene logo_path
      setLogoUrl(null);
      return;
    }
    urlFirmada(universidad.logo_path).then(({ url }) => {
      if (!cancelado) setLogoUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [universidad.logo_path]);

  const handleEliminarCurso = async () => {
    if (!eliminarCurso) return;
    setEliminando(true);
    const { error: deleteError } = await deleteCurso(eliminarCurso.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminarCurso(null);
    await cargarCursos();
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center overflow-hidden text-lg font-bold text-slate-950"
            style={{ background: universidad.logo_path ? undefined : universidad.color || "#6ee7b7" }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={universidad.nombre} className="h-full w-full object-cover" src={logoUrl} />
            ) : (
              <span>{(universidad.siglas || universidad.nombre).slice(0, 3).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{universidad.nombre}</h2>
            {universidad.siglas ? <p className="text-sm text-slate-400">{universidad.siglas}</p> : null}
          </div>
        </div>
        <button className={BTN_PRIMARY} onClick={() => setWizardOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          Crear curso
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : cursos.length === 0 ? (
        <EmptyState>
          <Building2 className="mx-auto mb-2 h-6 w-6 text-slate-500" />
          Aún no hay cursos en esta universidad.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cursos.map((curso) => (
            <CardBox key={curso.id} onClick={() => onOpenCurso(curso)}>
              <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                <button
                  className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-slate-200 hover:border-emerald-300/50"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditando(curso);
                  }}
                  title="Editar curso"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center border border-red-400/30 bg-slate-950/80 text-red-200 hover:border-red-300"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEliminarCurso(curso);
                  }}
                  title="Eliminar curso"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <Chip className={ESTADO_CHIP[curso.estado]}>{ESTADO_CURSO_LABELS[curso.estado]}</Chip>
              <div className="mt-2 text-base font-semibold text-white">{curso.nombre}</div>
              {curso.codigo ? <div className="text-sm text-slate-400">{curso.codigo}</div> : null}
              <div className="mt-2 grid gap-0.5 text-xs text-slate-400">
                {curso.periodo ? <span>Periodo: {curso.periodo}</span> : null}
                {curso.horario ? <span>Horario: {curso.horario}</span> : null}
              </div>
            </CardBox>
          ))}
        </div>
      )}

      {wizardOpen ? (
        <CrearCursoWizard
          onClose={() => setWizardOpen(false)}
          onCreado={async () => {
            setWizardOpen(false);
            await cargarCursos();
            await onUniversidadesChanged();
          }}
          universidadId={universidad.id}
        />
      ) : null}

      {editando ? (
        <EditarCursoModal
          curso={editando}
          onClose={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null);
            await cargarCursos();
          }}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará este curso junto con sus semanas, contenidos, estudiantes, asistencias y calificaciones."
        onCancel={() => setEliminarCurso(null)}
        onConfirm={handleEliminarCurso}
        open={eliminarCurso !== null}
        title="Eliminar curso"
      />
    </div>
  );
}

function EditarCursoModal({
  curso,
  onClose,
  onGuardado,
}: {
  curso: CursoImpartidoRow;
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [nombre, setNombre] = useState(curso.nombre);
  const [codigo, setCodigo] = useState(curso.codigo ?? "");
  const [periodo, setPeriodo] = useState(curso.periodo ?? "");
  const [horario, setHorario] = useState(curso.horario ?? "");
  const [descripcion, setDescripcion] = useState(curso.descripcion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    const { error: updateError } = await updateCurso(curso.id, {
      nombre: nombre.trim(),
      codigo: codigo.trim() || null,
      periodo: periodo.trim() || null,
      horario: horario.trim() || null,
      descripcion: descripcion.trim() || null,
    });
    setGuardando(false);
    if (updateError) {
      setError(updateError);
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
          <h3 className="mb-4 text-lg font-semibold text-white">Editar curso</h3>
          <div className="grid gap-3">
            <Field label="Nombre">
              <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
            </Field>
            <Field label="Código">
              <input className="field" onChange={(event) => setCodigo(event.target.value)} value={codigo} />
            </Field>
            <Field label="Periodo">
              <input className="field" onChange={(event) => setPeriodo(event.target.value)} value={periodo} />
            </Field>
            <Field label="Horario">
              <input className="field" onChange={(event) => setHorario(event.target.value)} value={horario} />
            </Field>
            <Field label="Descripción">
              <textarea
                className="field"
                onChange={(event) => setDescripcion(event.target.value)}
                rows={3}
                value={descripcion}
              />
            </Field>
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

type PasoWizard = "elegir" | "formulario";

function CrearCursoWizard({
  onClose,
  onCreado,
  universidadId,
}: {
  onClose: () => void;
  onCreado: () => void | Promise<void>;
  universidadId: string;
}) {
  const [paso, setPaso] = useState<PasoWizard>("elegir");
  const [cursosDisponibles, setCursosDisponibles] = useState<CursoConUniversidadRow[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [origenId, setOrigenId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [horario, setHorario] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [clonando, setClonando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTodosLosCursos().then(({ data }) => {
      setCursosDisponibles(data);
      setCargandoCursos(false);
    });
  }, []);

  const elegirOrigen = (curso: CursoConUniversidadRow | null) => {
    setOrigenId(curso?.id ?? null);
    setNombre(curso?.nombre ?? "");
    setCodigo(curso?.codigo ?? "");
    setPeriodo(curso?.periodo ?? "");
    setHorario(curso?.horario ?? "");
    setDescripcion(curso?.descripcion ?? "");
    setPaso("formulario");
  };

  const handleCrear = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError("");
    setClonando(true);

    if (origenId) {
      const { error: cloneError } = await clonarCurso(origenId, {
        universidad_id: universidadId,
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        periodo: periodo.trim() || null,
        horario: horario.trim() || null,
        descripcion: descripcion.trim() || null,
      });
      setClonando(false);
      if (cloneError) {
        setError(cloneError);
        return;
      }
    } else {
      const { error: insertError } = await insertCurso({
        universidad_id: universidadId,
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        periodo: periodo.trim() || null,
        horario: horario.trim() || null,
        descripcion: descripcion.trim() || null,
      });
      setClonando(false);
      if (insertError) {
        setError(insertError);
        return;
      }
    }

    await onCreado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">Crear curso</h3>

          {paso === "elegir" ? (
            <div className="grid gap-3 overflow-y-auto">
              <p className="text-sm text-slate-300">¿Quieres reutilizar materiales de un curso anterior?</p>
              <button
                className="flex items-center gap-2 border border-emerald-300/40 bg-emerald-300/10 p-3 text-left text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/70"
                onClick={() => elegirOrigen(null)}
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                Crear curso nuevo desde cero
              </button>

              {cargandoCursos ? (
                <p className="text-sm text-slate-300">Cargando cursos...</p>
              ) : cursosDisponibles.length === 0 ? (
                <p className="text-sm text-slate-400">No hay cursos anteriores para reutilizar.</p>
              ) : (
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {cursosDisponibles.map((curso) => (
                    <button
                      className="border border-white/10 bg-white/6 p-3 text-left transition hover:border-white/30"
                      key={curso.id}
                      onClick={() => elegirOrigen(curso)}
                      type="button"
                    >
                      <div className="text-sm font-semibold text-white">{curso.nombre}</div>
                      <div className="text-xs text-slate-400">
                        {curso.gestionesjj_universidades?.nombre ?? "Universidad"}
                        {curso.periodo ? ` · ${curso.periodo}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 flex justify-end">
                <button className={BTN_GHOST} onClick={onClose} type="button">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 overflow-y-auto">
              {origenId ? (
                <p className="border border-emerald-300/30 bg-emerald-300/10 p-2 text-xs text-emerald-100">
                  Se copiarán las planificaciones, semanas, contenidos y tareas del curso de origen.
                </p>
              ) : null}
              <Field label="Nombre">
                <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
              </Field>
              <Field label="Código">
                <input className="field" onChange={(event) => setCodigo(event.target.value)} value={codigo} />
              </Field>
              <Field label="Periodo">
                <input className="field" onChange={(event) => setPeriodo(event.target.value)} value={periodo} />
              </Field>
              <Field label="Horario">
                <input className="field" onChange={(event) => setHorario(event.target.value)} value={horario} />
              </Field>
              <Field label="Descripción">
                <textarea
                  className="field"
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={3}
                  value={descripcion}
                />
              </Field>

              <ErrorBanner message={error} />

              <div className="mt-2 flex justify-end gap-3">
                <button className={BTN_GHOST} disabled={clonando} onClick={() => setPaso("elegir")} type="button">
                  Atrás
                </button>
                <button className={BTN_PRIMARY} disabled={clonando} onClick={handleCrear} type="button">
                  {clonando ? "Clonando materiales..." : "Crear curso"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
