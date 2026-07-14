"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fetchCalificaciones, upsertCalificacion } from "@/lib/cursos/actividades";
import { TIPO_ACTIVIDAD_LABELS, type ActividadRow, type CalificacionRow, type EstudianteRow } from "@/lib/cursos/types";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner } from "./ui";

type FilaCalificacion = { entregado: boolean; nota: string; comentario: string };

export function CalificarActividadModal({
  actividad,
  estudiantes,
  onClose,
}: {
  actividad: ActividadRow;
  estudiantes: EstudianteRow[];
  onClose: () => void;
}) {
  const [filas, setFilas] = useState<Record<string, FilaCalificacion>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [guardadoId, setGuardadoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchCalificaciones(actividad.id);
    const porEstudiante = new Map<string, CalificacionRow>(data.map((item) => [item.estudiante_id, item]));
    const iniciales: Record<string, FilaCalificacion> = {};
    for (const estudiante of estudiantes) {
      const existente = porEstudiante.get(estudiante.id);
      iniciales[estudiante.id] = {
        entregado: existente?.entregado ?? false,
        nota: existente?.nota !== null && existente?.nota !== undefined ? String(existente.nota) : "",
        comentario: existente?.comentario ?? "",
      };
    }
    setFilas(iniciales);
    setError(fetchError ?? "");
    setLoading(false);
  }, [actividad.id, estudiantes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga las calificaciones existentes al abrir el modal
    void cargar();
  }, [cargar]);

  const handleGuardar = async (estudianteId: string) => {
    const fila = filas[estudianteId];
    if (!fila) return;

    const notaNum = fila.nota.trim() ? Number(fila.nota) : null;
    if (notaNum !== null) {
      if (Number.isNaN(notaNum) || notaNum < 0) {
        setError("La nota debe ser un número válido y no puede ser negativa.");
        return;
      }
      if (actividad.punteo !== null && notaNum > actividad.punteo) {
        setError(`La nota no puede ser mayor al punteo máximo de la actividad (${actividad.punteo} pts).`);
        return;
      }
    }

    setError("");
    setGuardandoId(estudianteId);
    const { error: upsertError } = await upsertCalificacion({
      actividad_id: actividad.id,
      estudiante_id: estudianteId,
      entregado: fila.entregado,
      nota: notaNum,
      comentario: fila.comentario.trim() || null,
    });
    setGuardandoId(null);
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
          className="flex max-h-[85vh] w-full max-w-2xl flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Calificar: {actividad.titulo}</h3>
              <p className="text-xs text-slate-400">
                {TIPO_ACTIVIDAD_LABELS[actividad.tipo]}
                {actividad.punteo !== null ? ` · ${actividad.punteo} pts` : ""}
              </p>
            </div>
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
                const fila = filas[estudiante.id];
                if (!fila) return null;
                return (
                  <div className="border border-white/10 bg-white/6 p-3" key={estudiante.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-white">
                        <input
                          checked={fila.entregado}
                          onChange={(event) =>
                            setFilas((prev) => ({
                              ...prev,
                              [estudiante.id]: { ...fila, entregado: event.target.checked },
                            }))
                          }
                          type="checkbox"
                        />
                        {estudiante.nombre}
                      </label>
                      {guardadoId === estudiante.id ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                          <Check className="h-3.5 w-3.5" />
                          Guardado
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                      <input
                        className="field"
                        onChange={(event) =>
                          setFilas((prev) => ({ ...prev, [estudiante.id]: { ...fila, nota: event.target.value } }))
                        }
                        placeholder={actividad.punteo !== null ? `/${actividad.punteo} pts` : "Nota"}
                        type="number"
                        value={fila.nota}
                      />
                      <input
                        className="field"
                        onChange={(event) =>
                          setFilas((prev) => ({ ...prev, [estudiante.id]: { ...fila, comentario: event.target.value } }))
                        }
                        placeholder="Comentario"
                        value={fila.comentario}
                      />
                      <button
                        className={BTN_GHOST}
                        disabled={guardandoId === estudiante.id}
                        onClick={() => handleGuardar(estudiante.id)}
                        type="button"
                      >
                        {guardandoId === estudiante.id ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button className={BTN_PRIMARY} onClick={onClose} type="button">
              Listo
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
