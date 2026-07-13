"use client";

import { CalendarClock, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ANIOS_CARRERA,
  HORARIOS_FIJOS,
  TRIMESTRES,
  type AnioCarrera,
  type CarreraRow,
  type DocenteRow,
  type Trimestre,
} from "@/data/evaluacion";
import {
  createCarrera,
  deleteCursoAdmin,
  fetchCarreras,
  fetchCursosAdmin,
  upsertCursoAdmin,
  type CursoAdminPayload,
  type CursoAdminRow,
} from "@/lib/cursos-admin";
import { currentTrimestre } from "@/lib/evaluacion-helpers";
import { ConfirmDialog } from "./confirm-dialog";
import { ModalPortal } from "./modal-portal";
import { OfertaAcademica } from "./oferta-academica";

type CursoFormState = {
  nombre: string;
  docenteId: string;
  horario: string;
  edificio: string;
  anioCarrera: AnioCarrera;
  anio: number;
  trimestre: Trimestre;
  activo: boolean;
};

export function ControlCursosView({ docentes }: { docentes: DocenteRow[] }) {
  const [carreras, setCarreras] = useState<CarreraRow[]>([]);
  const [carrerasError, setCarrerasError] = useState("");
  const [carreraId, setCarreraId] = useState("");
  const [addCarreraOpen, setAddCarreraOpen] = useState(false);
  const [newCarreraNombre, setNewCarreraNombre] = useState("");
  const [savingCarrera, setSavingCarrera] = useState(false);

  const [cursos, setCursos] = useState<CursoAdminRow[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [cursosError, setCursosError] = useState("");

  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre>(() => currentTrimestre());

  const [editTarget, setEditTarget] = useState<CursoAdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CursoFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CursoAdminRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [ofertaAbierta, setOfertaAbierta] = useState(false);

  const loadCarreras = useCallback(async () => {
    const { data, error } = await fetchCarreras();
    if (error) {
      setCarrerasError(error);
      return;
    }
    setCarrerasError("");
    setCarreras(data);
  }, []);

  const loadCursos = useCallback(async () => {
    setLoadingCursos(true);
    const { data, error } = await fetchCursosAdmin();
    if (error) {
      setCursosError(error);
      setLoadingCursos(false);
      return;
    }
    setCursosError("");
    setCursos(data);
    setLoadingCursos(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadCarreras();
    loadCursos();
  }, [loadCarreras, loadCursos]);

  useEffect(() => {
    if (carreras.length && !carreraId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- selects the first carrera once the list loads
      setCarreraId(carreras[0].id);
    }
  }, [carreras, carreraId]);

  const cursosDelPeriodo = useMemo(
    () => cursos.filter((item) => item.carreraId === carreraId && item.anio === anio && item.trimestre === trimestre),
    [cursos, carreraId, anio, trimestre],
  );

  const porAnioCarrera = useMemo(
    () =>
      ANIOS_CARRERA.map((item) => ({
        ...item,
        cursos: cursosDelPeriodo
          .filter((curso) => curso.anioCarrera === item.value)
          .sort((a, b) => HORARIOS_FIJOS.indexOf(a.horario ?? "") - HORARIOS_FIJOS.indexOf(b.horario ?? "")),
      })),
    [cursosDelPeriodo],
  );

  const handleAddCarrera = async () => {
    if (!newCarreraNombre.trim() || savingCarrera) return;
    setSavingCarrera(true);
    const { id, error } = await createCarrera(newCarreraNombre.trim());
    setSavingCarrera(false);
    if (error) {
      setCarrerasError(error);
      return;
    }
    setNewCarreraNombre("");
    setAddCarreraOpen(false);
    await loadCarreras();
    if (id) setCarreraId(id);
  };

  const openCrear = (anioCarrera: AnioCarrera) => {
    setEditTarget(null);
    setCreating(true);
    setForm({ nombre: "", docenteId: "", horario: "", edificio: "", anioCarrera, anio, trimestre, activo: true });
    setSaveError("");
  };

  const openEditar = (curso: CursoAdminRow) => {
    setCreating(false);
    setEditTarget(curso);
    setForm({
      nombre: curso.nombre,
      docenteId: curso.docenteId ?? "",
      horario: curso.horario ?? "",
      edificio: curso.edificio ?? "",
      anioCarrera: curso.anioCarrera,
      anio: curso.anio,
      trimestre: curso.trimestre,
      activo: curso.activo,
    });
    setSaveError("");
  };

  const closeModal = () => {
    setEditTarget(null);
    setCreating(false);
    setForm(null);
  };

  const horarioOcupadoPor = useMemo(() => {
    if (!form || !form.horario || !carreraId) return null;
    return (
      cursos.find(
        (item) =>
          item.id !== editTarget?.id &&
          item.carreraId === carreraId &&
          item.anio === form.anio &&
          item.trimestre === form.trimestre &&
          item.anioCarrera === form.anioCarrera &&
          item.horario === form.horario,
      ) ?? null
    );
  }, [cursos, form, carreraId, editTarget]);

  const handleGuardar = async () => {
    if (!form || !form.nombre.trim() || !carreraId || saving) return;
    setSaving(true);
    setSaveError("");
    const payload: CursoAdminPayload = {
      nombre: form.nombre.trim(),
      horario: form.horario || null,
      edificio: form.edificio.trim() || null,
      anio: form.anio,
      trimestre: form.trimestre,
      anio_carrera: form.anioCarrera,
      carrera_id: carreraId,
      docente_id: form.docenteId || null,
      activo: form.activo,
    };
    const { error } = await upsertCursoAdmin(editTarget?.id ?? null, payload);
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    closeModal();
    await loadCursos();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteCursoAdmin(deleteTarget.id);
    setDeleting(false);
    if (error) {
      setCursosError(error);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    await loadCursos();
  };

  const modalOpen = Boolean(editTarget) || creating;

  return (
    <div className="grid gap-5">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
          <CalendarClock className="h-4 w-4" />
          Control de cursos y docentes
        </div>
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Malla de horarios por carrera</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Cursos, docentes, horarios y salones de cada año de la carrera. Los horarios de los sábados son fijos: no se
          permite repetir un horario en el mismo año dentro del mismo periodo.
        </p>
      </div>

      <button
        className="inline-flex w-fit items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
        onClick={() => setOfertaAbierta((current) => !current)}
        type="button"
      >
        {ofertaAbierta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Generar oferta academica
      </button>

      {ofertaAbierta ? (
        <OfertaAcademica carreras={carreras} cursosAdmin={cursos} onConfirmada={loadCursos} />
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Carrera">
          <div className="flex gap-2">
            <select className="field max-w-md" onChange={(event) => setCarreraId(event.target.value)} value={carreraId}>
              {carreras.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/8 text-slate-200 transition hover:border-emerald-300/50"
              onClick={() => setAddCarreraOpen((current) => !current)}
              title="Agregar carrera"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          {TRIMESTRES.map((value) => (
            <button
              key={value}
              className={`border px-3 py-1.5 text-xs font-semibold transition ${
                trimestre === value
                  ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                  : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
              }`}
              onClick={() => setTrimestre(value)}
              type="button"
            >
              Trimestre {value}
            </button>
          ))}
          <input
            className="field w-28"
            onChange={(event) => setAnio(Number(event.target.value))}
            type="number"
            value={anio}
          />
        </div>
      </div>

      {addCarreraOpen ? (
        <div className="flex flex-wrap items-end gap-3 border border-white/10 bg-white/6 p-4">
          <Field label="Nueva carrera">
            <input
              className="field min-w-72"
              onChange={(event) => setNewCarreraNombre(event.target.value)}
              value={newCarreraNombre}
            />
          </Field>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
            disabled={!newCarreraNombre.trim() || savingCarrera}
            onClick={handleAddCarrera}
            type="button"
          >
            {savingCarrera ? "Guardando..." : "Agregar"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center border border-white/10 bg-white/8 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/30"
            onClick={() => setAddCarreraOpen(false)}
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {carrerasError ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{carrerasError}</p> : null}
      {cursosError ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{cursosError}</p> : null}
      {loadingCursos ? <p className="text-sm text-slate-300">Cargando cursos...</p> : null}

      {!loadingCursos && carreraId ? (
        <div className="grid gap-4">
          {porAnioCarrera.map((grupo) => (
            <div key={grupo.value} className="border border-white/10 bg-white/6 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">{grupo.label}</h3>
                <button
                  className="inline-flex items-center gap-2 border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300"
                  onClick={() => openCrear(grupo.value)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar curso
                </button>
              </div>
              {grupo.cursos.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-slate-400">
                        <th className="pb-2 pr-3">Horario</th>
                        <th className="pb-2 pr-3">Curso</th>
                        <th className="pb-2 pr-3">Docente</th>
                        <th className="pb-2 pr-3">Salón</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.cursos.map((curso) => (
                        <tr key={curso.id} className={`border-t border-white/8 ${curso.activo ? "" : "opacity-50"}`}>
                          <td className="whitespace-nowrap py-2 pr-3">{curso.horario ?? "Sin definir"}</td>
                          <td className="py-2 pr-3">{curso.nombre}</td>
                          <td className="py-2 pr-3">{curso.docenteNombre ?? "Sin docente"}</td>
                          <td className="py-2 pr-3">{curso.edificio ?? "-"}</td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <button
                                className="flex items-center gap-1 border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-xs font-semibold text-sky-200 transition hover:border-sky-400/60"
                                onClick={() => openEditar(curso)}
                                title="Editar curso"
                                type="button"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                className="flex items-center justify-center border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/60"
                                onClick={() => setDeleteTarget(curso)}
                                title="Borrar curso"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin cursos registrados para este periodo.</p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {modalOpen && form ? (
        <ModalPortal>
          <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeModal}>
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-slate-950 p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold text-white">{editTarget ? "Editar curso" : "Nuevo curso"}</h3>
              <div className="grid gap-3">
                <Field label="Nombre del curso">
                  <input
                    className="field"
                    onChange={(event) => setForm((current) => (current ? { ...current, nombre: event.target.value } : current))}
                    value={form.nombre}
                  />
                </Field>

                <Field label="Docente">
                  <select
                    className="field"
                    onChange={(event) => setForm((current) => (current ? { ...current, docenteId: event.target.value } : current))}
                    value={form.docenteId}
                  >
                    <option value="">Sin docente</option>
                    {docentes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Año de la carrera">
                    <select
                      className="field"
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, anioCarrera: Number(event.target.value) as AnioCarrera } : current,
                        )
                      }
                      value={form.anioCarrera}
                    >
                      {ANIOS_CARRERA.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Trimestre">
                    <select
                      className="field"
                      onChange={(event) =>
                        setForm((current) =>
                          current ? { ...current, trimestre: Number(event.target.value) as Trimestre } : current,
                        )
                      }
                      value={form.trimestre}
                    >
                      {TRIMESTRES.map((value) => (
                        <option key={value} value={value}>
                          Trimestre {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Año (calendario)">
                  <input
                    className="field"
                    min={2024}
                    onChange={(event) => setForm((current) => (current ? { ...current, anio: Number(event.target.value) } : current))}
                    type="number"
                    value={form.anio}
                  />
                </Field>

                <Field label="Horario (fijo)">
                  <select
                    className="field"
                    onChange={(event) => setForm((current) => (current ? { ...current, horario: event.target.value } : current))}
                    value={form.horario}
                  >
                    <option value="">Sin definir</option>
                    {HORARIOS_FIJOS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                {horarioOcupadoPor ? (
                  <p className="border border-amber-300/30 bg-amber-300/10 p-3 text-xs font-semibold text-amber-100">
                    Ese horario ya lo ocupa &quot;{horarioOcupadoPor.nombre}&quot; en{" "}
                    {ANIOS_CARRERA.find((item) => item.value === form.anioCarrera)?.label} durante ese periodo.
                  </p>
                ) : null}

                <Field label="Salón">
                  <input
                    className="field"
                    onChange={(event) => setForm((current) => (current ? { ...current, edificio: event.target.value } : current))}
                    value={form.edificio}
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    checked={form.activo}
                    onChange={(event) => setForm((current) => (current ? { ...current, activo: event.target.checked } : current))}
                    type="checkbox"
                  />
                  Curso activo
                </label>
              </div>

              {saveError ? (
                <p className="mt-3 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{saveError}</p>
              ) : null}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  className="border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
                  onClick={closeModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
                  disabled={!form.nombre.trim() || saving || Boolean(horarioOcupadoPor)}
                  onClick={handleGuardar}
                  type="button"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      <ConfirmDialog
        busy={deleting}
        message={`Se eliminará el curso "${deleteTarget?.nombre ?? ""}". Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Borrar curso"
      />
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}
