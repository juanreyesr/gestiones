"use client";

import { AlertTriangle, FileSpreadsheet, Plus, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ANIOS_CARRERA,
  HORARIOS_FIJOS,
  TRIMESTRES,
  type AnioCarrera,
  type CarreraRow,
  type Trimestre,
} from "@/data/evaluacion";
import type { CursoAdminRow } from "@/lib/cursos-admin";
import { fetchDocentesAdmin, type DocenteAdminRow } from "@/lib/docentes-admin";
import { currentTrimestre } from "@/lib/evaluacion-helpers";
import { exportOfertaToExcel } from "@/lib/oferta-excel";
import {
  completarSalones,
  confirmarOferta,
  fetchOferta,
  proponerCursos,
  siguientePeriodo,
  upsertOferta,
  type OfertaCurso,
  type OfertaRow,
} from "@/lib/ofertas";

export function OfertaAcademica({
  carreras,
  cursosAdmin,
  onConfirmada,
}: {
  carreras: CarreraRow[];
  cursosAdmin: CursoAdminRow[];
  onConfirmada: () => void;
}) {
  const [docentes, setDocentes] = useState<DocenteAdminRow[]>([]);
  const [docentesError, setDocentesError] = useState("");

  const [carreraId, setCarreraId] = useState("");
  const [anioDestino, setAnioDestino] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre>(() => currentTrimestre());

  const [estado, setEstado] = useState<"borrador" | "confirmada" | null>(null);
  const [cursos, setCursos] = useState<OfertaCurso[]>([]);
  const [generado, setGenerado] = useState(false);

  const [avisoPropuesta, setAvisoPropuesta] = useState("");
  const [avisoIntercambio, setAvisoIntercambio] = useState("");
  const [loadingPropuesta, setLoadingPropuesta] = useState(false);
  const [propuestaError, setPropuestaError] = useState("");

  const [savingBorrador, setSavingBorrador] = useState(false);
  const [borradorMensaje, setBorradorMensaje] = useState("");

  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const docentesActivos = useMemo(() => docentes.filter((item) => item.activo), [docentes]);

  useEffect(() => {
    (async () => {
      const { data, error } = await fetchDocentesAdmin();
      if (error) setDocentesError(error);
      setDocentes(data);
    })();
  }, []);

  useEffect(() => {
    if (carreras.length && !carreraId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- selecciona la primera carrera al cargar
      setCarreraId(carreras[0].id);
    }
  }, [carreras, carreraId]);

  useEffect(() => {
    if (!avisoIntercambio) return undefined;
    const timer = setTimeout(() => setAvisoIntercambio(""), 5000);
    return () => clearTimeout(timer);
  }, [avisoIntercambio]);

  const carreraNombre = carreras.find((item) => item.id === carreraId)?.nombre ?? "";

  const generarPropuesta = useCallback(
    async (carrera: string, anio: number, tri: Trimestre) => {
      if (!carrera) return;
      setLoadingPropuesta(true);
      setPropuestaError("");
      setAvisoPropuesta("");
      setBorradorMensaje("");
      setConfirmStep(false);
      setConfirmError("");

      const { data, error } = await fetchOferta(carrera, anio, tri);
      if (error) {
        setPropuestaError(error);
        setLoadingPropuesta(false);
        return;
      }

      if (data) {
        setEstado(data.estado);
        setCursos(completarSalones(data.cursos, cursosAdmin, carrera));
        setAvisoPropuesta("Se cargo el borrador guardado.");
      } else {
        const { anioFuente, cursos: propuestos } = proponerCursos(cursosAdmin, carrera, tri, anio);
        setEstado(null);
        setCursos(propuestos);
        setAvisoPropuesta(
          anioFuente
            ? `Propuesta basada en los cursos de ${anioFuente}.`
            : "No hay cursos previos de este trimestre; agrega los cursos manualmente.",
        );
      }
      setGenerado(true);
      setLoadingPropuesta(false);
    },
    [cursosAdmin],
  );

  const handleGenerarPropuesta = useCallback(
    () => generarPropuesta(carreraId, anioDestino, trimestre),
    [generarPropuesta, carreraId, anioDestino, trimestre],
  );

  // Al entrar, propone en automatico el periodo siguiente al ultimo con
  // cursos activos (tras el T3 sigue el T1 del anio siguiente) y genera la
  // propuesta sin necesidad de tocar los selectores.
  const [autoGenerado, setAutoGenerado] = useState(false);
  useEffect(() => {
    if (autoGenerado || generado || !carreraId || !cursosAdmin.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- inicializacion unica al abrir la seccion
    setAutoGenerado(true);
    const proximo = siguientePeriodo(cursosAdmin, carreraId);
    setAnioDestino(proximo.anio);
    setTrimestre(proximo.trimestre);
    generarPropuesta(carreraId, proximo.anio, proximo.trimestre);
  }, [autoGenerado, generado, carreraId, cursosAdmin, generarPropuesta]);

  const porAnioCarrera = useMemo(
    () =>
      ANIOS_CARRERA.map((item) => ({
        ...item,
        cursos: cursos.filter((curso) => curso.anioCarrera === item.value),
      })),
    [cursos],
  );

  const choques = useMemo(() => {
    const map = new Map<string, string>();
    cursos.forEach((curso) => {
      if (!curso.docenteId || !curso.horario) return;
      const enConflicto = cursos.some(
        (other) => other.id !== curso.id && other.docenteId === curso.docenteId && other.horario === curso.horario,
      );
      if (enConflicto) {
        const docente = docentesActivos.find((item) => item.id === curso.docenteId);
        map.set(curso.id, `Choque de horario: ${docente?.nombre ?? "el docente"} tiene 2 cursos a la misma hora`);
      }
    });
    return map;
  }, [cursos, docentesActivos]);

  const hayChoques = choques.size > 0;
  const hayCursoConNombre = cursos.some((curso) => curso.nombre.trim());

  const addCurso = (anioCarrera: AnioCarrera) => {
    setCursos((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        anioCarrera,
        nombre: "",
        docenteId: null,
        horario: null,
        edificio: "",
        nrc: "",
        noEstudiantes: "",
      },
    ]);
  };

  const removeCurso = (id: string) => {
    setCursos((current) => current.filter((curso) => curso.id !== id));
  };

  const updateCurso = (id: string, patch: Partial<OfertaCurso>) => {
    setCursos((current) => current.map((curso) => (curso.id === id ? { ...curso, ...patch } : curso)));
  };

  const handleHorarioChange = (id: string, nuevoHorario: string | null) => {
    setCursos((current) => {
      const actual = current.find((curso) => curso.id === id);
      if (!actual) return current;
      const anterior = actual.horario;
      const intercambio = nuevoHorario
        ? current.find(
            (curso) => curso.id !== id && curso.anioCarrera === actual.anioCarrera && curso.horario === nuevoHorario,
          )
        : undefined;

      if (intercambio) {
        setAvisoIntercambio(`Se intercambio el horario con "${intercambio.nombre || "curso sin nombre"}".`);
      }

      return current.map((curso) => {
        if (curso.id === id) return { ...curso, horario: nuevoHorario };
        if (intercambio && curso.id === intercambio.id) return { ...curso, horario: anterior };
        return curso;
      });
    });
  };

  const handleGuardarBorrador = async () => {
    if (!carreraId || savingBorrador) return;
    setSavingBorrador(true);
    setBorradorMensaje("");
    const { error } = await upsertOferta({ carreraId, anio: anioDestino, trimestre, estado: "borrador", cursos });
    setSavingBorrador(false);
    if (error) {
      setBorradorMensaje(`No se pudo guardar el borrador: ${error}`);
      return;
    }
    setEstado("borrador");
    setBorradorMensaje("Borrador guardado.");
  };

  const handleExportar = async () => {
    await exportOfertaToExcel({ carreraNombre, anio: anioDestino, trimestre, cursos, docentes: docentesActivos });
  };

  const handleConfirmar = async () => {
    if (!carreraId || confirmando) return;
    setConfirmando(true);
    setConfirmError("");

    const { id, error: upsertError } = await upsertOferta({
      carreraId,
      anio: anioDestino,
      trimestre,
      estado: "borrador",
      cursos,
    });
    if (upsertError || !id) {
      setConfirmando(false);
      setConfirmError(upsertError ?? "No se pudo guardar la oferta antes de confirmar.");
      return;
    }

    const ofertaRow: OfertaRow = { id, carreraId, anio: anioDestino, trimestre, estado: "borrador", cursos };
    const { error } = await confirmarOferta(ofertaRow);
    setConfirmando(false);
    if (error) {
      setConfirmError(error);
      return;
    }

    setEstado("confirmada");
    setConfirmStep(false);
    onConfirmada();
  };

  return (
    <div className="grid gap-5 border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Oferta academica</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Generar oferta academica</h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Propone los cursos del periodo a partir del historico, permite ajustarlos y reemplaza los cursos activos
          del periodo al confirmar.
        </p>
      </div>

      {docentesError ? (
        <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{docentesError}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Carrera">
          <select className="field max-w-md" onChange={(event) => setCarreraId(event.target.value)} value={carreraId}>
            {carreras.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Año destino">
          <input
            className="field w-28"
            onChange={(event) => setAnioDestino(Number(event.target.value))}
            type="number"
            value={anioDestino}
          />
        </Field>
        <Field label="Trimestre">
          <select
            className="field w-40"
            onChange={(event) => setTrimestre(Number(event.target.value) as Trimestre)}
            value={trimestre}
          >
            {TRIMESTRES.map((value) => (
              <option key={value} value={value}>
                Trimestre {value}
              </option>
            ))}
          </select>
        </Field>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
          disabled={!carreraId || loadingPropuesta}
          onClick={handleGenerarPropuesta}
          type="button"
        >
          {loadingPropuesta ? "Generando..." : "Generar propuesta"}
        </button>
      </div>

      {propuestaError ? (
        <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{propuestaError}</p>
      ) : null}
      {avisoPropuesta ? <p className="text-sm text-emerald-200">{avisoPropuesta}</p> : null}

      {generado ? (
        <div className="grid gap-4">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-slate-950/90 p-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {estado === "confirmada" ? (
                <span className="border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 font-semibold text-emerald-200">
                  Oferta confirmada
                </span>
              ) : (
                <span className="border border-amber-300/40 bg-amber-300/10 px-2 py-1 font-semibold text-amber-200">
                  Borrador
                </span>
              )}
              {avisoIntercambio ? <span className="text-sky-200">{avisoIntercambio}</span> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30"
                onClick={handleExportar}
                type="button"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Exportar Excel
              </button>
              <button
                className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-50"
                disabled={savingBorrador}
                onClick={handleGuardarBorrador}
                type="button"
              >
                <Save className="h-3.5 w-3.5" />
                {savingBorrador ? "Guardando..." : "Guardar borrador"}
              </button>
              <button
                className="inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
                disabled={hayChoques || !hayCursoConNombre}
                onClick={() => setConfirmStep(true)}
                type="button"
              >
                Confirmar oferta academica
              </button>
            </div>
          </div>

          {borradorMensaje ? <p className="text-sm text-emerald-200">{borradorMensaje}</p> : null}

          {confirmStep ? (
            <div className="grid gap-3 border border-amber-300/40 bg-amber-300/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esto desactivara los cursos actuales de {carreraNombre} T{trimestre} {anioDestino} y los reemplazara
                con esta oferta. ¿Confirmas?
              </p>
              {confirmError ? <p className="text-sm text-red-300">{confirmError}</p> : null}
              <div className="flex gap-3">
                <button
                  className="bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
                  disabled={confirmando}
                  onClick={handleConfirmar}
                  type="button"
                >
                  {confirmando ? "Confirmando..." : "Si, confirmar"}
                </button>
                <button
                  className="border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
                  disabled={confirmando}
                  onClick={() => setConfirmStep(false)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            {porAnioCarrera.map((grupo) => (
              <div key={grupo.value} className="border border-white/10 bg-white/6 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-base font-semibold text-white">{grupo.label}</h4>
                  <button
                    className="inline-flex items-center gap-2 border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300"
                    onClick={() => addCurso(grupo.value)}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar curso
                  </button>
                </div>

                {grupo.cursos.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin cursos en este año.</p>
                ) : (
                  <div className="grid gap-3">
                    {grupo.cursos.map((curso) => {
                      const ocupados = new Set(
                        cursos
                          .filter(
                            (other) =>
                              other.id !== curso.id &&
                              other.horario &&
                              other.horario === curso.horario &&
                              other.docenteId,
                          )
                          .map((other) => other.docenteId),
                      );
                      const choqueMsg = choques.get(curso.id);
                      return (
                        <div key={curso.id} className="grid min-w-0 gap-2 border border-white/10 bg-white/5 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              aria-label="Nombre del curso"
                              className="field min-w-[200px] flex-1"
                              onChange={(event) => updateCurso(curso.id, { nombre: event.target.value })}
                              placeholder="Nombre del curso"
                              value={curso.nombre}
                            />
                            <select
                              aria-label="Docente"
                              className="field w-full sm:w-52"
                              onChange={(event) => updateCurso(curso.id, { docenteId: event.target.value || null })}
                              value={curso.docenteId ?? ""}
                            >
                              <option value="">Sin docente</option>
                              {docentesActivos.map((docente) => {
                                const ocupado = ocupados.has(docente.id) && docente.id !== curso.docenteId;
                                return (
                                  <option key={docente.id} disabled={ocupado} value={docente.id}>
                                    {docente.nombre}
                                    {ocupado ? " (ocupado a esa hora)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                            <select
                              aria-label="Horario"
                              className="field w-full sm:w-56"
                              onChange={(event) => handleHorarioChange(curso.id, event.target.value || null)}
                              value={curso.horario ?? ""}
                            >
                              <option value="">Sin horario</option>
                              {HORARIOS_FIJOS.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label="Edificio o salon"
                              className="field w-full sm:w-32"
                              onChange={(event) => updateCurso(curso.id, { edificio: event.target.value })}
                              placeholder="Edificio/salon"
                              value={curso.edificio}
                            />
                            <input
                              aria-label="NRC"
                              className="field w-full sm:w-24"
                              onChange={(event) => updateCurso(curso.id, { nrc: event.target.value })}
                              placeholder="NRC"
                              value={curso.nrc}
                            />
                            <input
                              aria-label="Numero de estudiantes"
                              className="field w-full sm:w-28"
                              onChange={(event) => updateCurso(curso.id, { noEstudiantes: event.target.value })}
                              placeholder="No. est."
                              type="number"
                              value={curso.noEstudiantes}
                            />
                            <button
                              aria-label="Eliminar curso"
                              className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-300/40 bg-red-400/10 text-red-200 transition hover:border-red-300/70"
                              onClick={() => removeCurso(curso.id)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {choqueMsg ? <p className="text-xs font-semibold text-red-300">{choqueMsg}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
