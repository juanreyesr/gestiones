"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fetchAsistencias, upsertAsistencia } from "@/lib/cursos/asistencias";
import { fetchEstudiantes } from "@/lib/cursos/estudiantes";
import { ESTADO_ASISTENCIA_LABELS, type AsistenciaRow, type EstadoAsistencia, type EstudianteRow } from "@/lib/cursos/types";
import { BTN_GHOST, ErrorBanner } from "./ui";

const ESTADOS_SEGMENTADOS: EstadoAsistencia[] = ["presente", "ausente", "excusa", "tarde"];

const ESTADO_ESTILOS: Record<EstadoAsistencia, { activo: string; inactivo: string }> = {
  sin_marcar: { activo: "", inactivo: "" },
  presente: {
    activo: "border-emerald-300 bg-emerald-300 text-slate-950",
    inactivo: "border-emerald-300/40 text-emerald-200 hover:border-emerald-300/70",
  },
  ausente: {
    activo: "border-red-400 bg-red-400 text-slate-950",
    inactivo: "border-red-400/40 text-red-200 hover:border-red-400/70",
  },
  excusa: {
    activo: "border-amber-300 bg-amber-300 text-slate-950",
    inactivo: "border-amber-300/40 text-amber-200 hover:border-amber-300/70",
  },
  tarde: {
    activo: "border-sky-300 bg-sky-300 text-slate-950",
    inactivo: "border-sky-300/40 text-sky-200 hover:border-sky-300/70",
  },
};

export function AsistenciaPanel({
  cursoId,
  onClose,
  semanaAnteriorId,
  semanaId,
}: {
  cursoId: string;
  onClose: () => void;
  semanaAnteriorId: string | null;
  semanaId: string;
}) {
  const [estudiantes, setEstudiantes] = useState<EstudianteRow[]>([]);
  const [asistencias, setAsistencias] = useState<Record<string, AsistenciaRow>>({});
  const [asistenciasAnteriores, setAsistenciasAnteriores] = useState<Record<string, AsistenciaRow>>({});
  const [notasLocales, setNotasLocales] = useState<Record<string, string>>({});
  const [guardadoId, setGuardadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data: estudiantesData, error: errorEstudiantes }, { data: asistenciasData }] = await Promise.all([
      fetchEstudiantes(cursoId),
      fetchAsistencias(semanaId),
    ]);
    setEstudiantes(estudiantesData.filter((e) => e.estado === "activo"));
    const mapa: Record<string, AsistenciaRow> = {};
    for (const item of asistenciasData) mapa[item.estudiante_id] = item;
    setAsistencias(mapa);

    if (semanaAnteriorId) {
      const { data: anteriores } = await fetchAsistencias(semanaAnteriorId);
      const mapaAnterior: Record<string, AsistenciaRow> = {};
      for (const item of anteriores) mapaAnterior[item.estudiante_id] = item;
      setAsistenciasAnteriores(mapaAnterior);
    }

    setError(errorEstudiantes ?? "");
    setLoading(false);
  }, [cursoId, semanaId, semanaAnteriorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga estudiantes y asistencias al abrir el panel
    void cargar();
  }, [cargar]);

  const marcarEstado = async (estudianteId: string, estado: EstadoAsistencia) => {
    const notaActual = notasLocales[estudianteId] ?? asistencias[estudianteId]?.nota ?? "";
    setAsistencias((prev) => ({
      ...prev,
      [estudianteId]: {
        ...(prev[estudianteId] ?? {
          id: "",
          created_by: "",
          semana_id: semanaId,
          estudiante_id: estudianteId,
          created_at: "",
          updated_at: "",
        }),
        estado,
        nota: notaActual || null,
      },
    }));
    const { error: upsertError } = await upsertAsistencia({
      semana_id: semanaId,
      estudiante_id: estudianteId,
      estado,
      nota: notaActual || null,
    });
    if (upsertError) {
      setError(upsertError);
      return;
    }
    setGuardadoId(estudianteId);
    setTimeout(() => setGuardadoId((prev) => (prev === estudianteId ? null : prev)), 1500);
  };

  const guardarNota = async (estudianteId: string) => {
    const estado = asistencias[estudianteId]?.estado ?? "sin_marcar";
    const nota = notasLocales[estudianteId] ?? asistencias[estudianteId]?.nota ?? "";
    const { error: upsertError } = await upsertAsistencia({
      semana_id: semanaId,
      estudiante_id: estudianteId,
      estado,
      nota: nota || null,
    });
    if (upsertError) {
      setError(upsertError);
      return;
    }
    setGuardadoId(estudianteId);
    setTimeout(() => setGuardadoId((prev) => (prev === estudianteId ? null : prev)), 1500);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="flex max-h-[85vh] w-full max-w-3xl flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Gestionar asistencia</h3>
            <button
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/8 text-slate-200 hover:border-white/30"
              onClick={onClose}
              title="Cerrar"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ErrorBanner message={error} />

          {loading ? (
            <p className="text-sm text-slate-300">Cargando...</p>
          ) : estudiantes.length === 0 ? (
            <p className="text-sm text-slate-400">No hay estudiantes activos en este curso.</p>
          ) : (
            <div className="grid gap-3 overflow-y-auto">
              {estudiantes.map((estudiante) => {
                const actual = asistencias[estudiante.id];
                const anterior = asistenciasAnteriores[estudiante.id];
                return (
                  <div className="border border-white/10 bg-white/6 p-3" key={estudiante.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{estudiante.nombre}</div>
                        {anterior && anterior.estado !== "sin_marcar" ? (
                          <div className="text-xs text-amber-200">
                            Semana pasada: {ESTADO_ASISTENCIA_LABELS[anterior.estado]}
                            {anterior.nota ? ` — ${anterior.nota}` : ""}
                          </div>
                        ) : null}
                      </div>
                      {guardadoId === estudiante.id ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                          <Check className="h-3.5 w-3.5" />
                          Guardado
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {ESTADOS_SEGMENTADOS.map((estado) => {
                        const activo = actual?.estado === estado;
                        const estilos = ESTADO_ESTILOS[estado];
                        return (
                          <button
                            className={`border px-3 py-1.5 text-xs font-semibold transition ${
                              activo ? estilos.activo : estilos.inactivo
                            }`}
                            key={estado}
                            onClick={() => marcarEstado(estudiante.id, estado)}
                            type="button"
                          >
                            {ESTADO_ASISTENCIA_LABELS[estado]}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        className="field"
                        onBlur={() => guardarNota(estudiante.id)}
                        onChange={(event) =>
                          setNotasLocales((prev) => ({ ...prev, [estudiante.id]: event.target.value }))
                        }
                        placeholder="Nota (ej. mandó excusa)"
                        value={notasLocales[estudiante.id] ?? actual?.nota ?? ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
