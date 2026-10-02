"use client";

import { Check, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fetchCalificaciones, publicarCalificacionesPendientes, upsertCalificacion } from "@/lib/cursos/actividades";
import { fetchEntregasDeActividad, type EntregaConArchivos } from "@/lib/cursos/entregas";
import {
  TIPO_ACTIVIDAD_LABELS,
  formatearFechaHora,
  type ActividadRow,
  type CalificacionRow,
  type EstudianteRow,
} from "@/lib/cursos/types";
import { ArchivoEntregaFila } from "./archivo-entrega-fila";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner } from "./ui";

type FilaCalificacion = { entregado: boolean; nota: string; comentario: string; publicado: boolean };

export function CalificarActividadModal({
  actividad,
  estudiantes,
  onCambio,
  onClose,
}: {
  actividad: ActividadRow;
  estudiantes: EstudianteRow[];
  /** Se llama al guardar o publicar, para refrescar contadores de pendientes. */
  onCambio?: () => void;
  onClose: () => void;
}) {
  const [filas, setFilas] = useState<Record<string, FilaCalificacion>>({});
  const [entregasPorEstudiante, setEntregasPorEstudiante] = useState<Record<string, EntregaConArchivos>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [guardadoId, setGuardadoId] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [soloConEntrega, setSoloConEntrega] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data, error: fetchError }, { data: entregasData, error: entregasError }] = await Promise.all([
      fetchCalificaciones(actividad.id),
      fetchEntregasDeActividad(actividad.id),
    ]);
    const porEstudiante = new Map<string, CalificacionRow>(data.map((item) => [item.estudiante_id, item]));
    // Las entregas se guardan con el ID global del estudiante (no el de la
    // inscripción al curso), así que se indexan por EstudianteRow.estudiante_id.
    const entregasPorGlobal = Object.fromEntries(entregasData.map((entrega) => [entrega.estudiante_id, entrega]));
    const iniciales: Record<string, FilaCalificacion> = {};
    for (const estudiante of estudiantes) {
      const existente = porEstudiante.get(estudiante.id);
      const entrego = Boolean(estudiante.estudiante_id && entregasPorGlobal[estudiante.estudiante_id]);
      iniciales[estudiante.id] = {
        entregado: existente?.entregado || entrego,
        nota: existente?.nota !== null && existente?.nota !== undefined ? String(existente.nota) : "",
        comentario: existente?.comentario ?? "",
        publicado: Boolean(existente?.publicado_en),
      };
    }
    setFilas(iniciales);
    setEntregasPorEstudiante(entregasPorGlobal);
    setSoloConEntrega(entregasData.length > 0);
    setError(fetchError ?? entregasError ?? "");
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
    onCambio?.();
    setTimeout(() => setGuardadoId((prev) => (prev === estudianteId ? null : prev)), 1500);
  };

  const handlePublicar = async () => {
    setPublicando(true);
    const { error: publicarError } = await publicarCalificacionesPendientes(actividad.id);
    setPublicando(false);
    if (publicarError) {
      setError(publicarError);
      return;
    }
    onCambio?.();
    await cargar();
  };

  const entregaDe = useCallback(
    (estudiante: EstudianteRow) => (estudiante.estudiante_id ? entregasPorEstudiante[estudiante.estudiante_id] : undefined),
    [entregasPorEstudiante],
  );

  // Primero quienes entregaron (lo más reciente arriba), luego el resto en orden alfabético.
  const estudiantesOrdenados = useMemo(() => {
    const conEntrega = estudiantes
      .filter((e) => entregaDe(e))
      .sort((a, b) => (entregaDe(b)?.entregado_en ?? "").localeCompare(entregaDe(a)?.entregado_en ?? ""));
    const sinEntrega = estudiantes.filter((e) => !entregaDe(e));
    return soloConEntrega ? conEntrega : [...conEntrega, ...sinEntrega];
  }, [entregaDe, estudiantes, soloConEntrega]);

  const totalEntregas = estudiantes.filter((e) => entregaDe(e)).length;
  const entregasSinNota = estudiantes.filter((e) => entregaDe(e) && !filas[e.id]?.nota.trim()).length;

  const pendientesDePublicar = Object.values(filas).filter((fila) => !fila.publicado && fila.nota.trim()).length;

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

          {!loading && actividad.entrega_habilitada ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/4 p-3 text-xs text-slate-300">
              <span>
                <b className="text-white">{totalEntregas}</b> de {estudiantes.length} entregaron
                {entregasSinNota > 0 ? (
                  <>
                    {" "}
                    · <b className="text-amber-200">{entregasSinNota}</b> sin nota
                  </>
                ) : null}
              </span>
              {totalEntregas > 0 ? (
                <label className="flex items-center gap-2">
                  <input checked={soloConEntrega} onChange={(event) => setSoloConEntrega(event.target.checked)} type="checkbox" />
                  Mostrar solo quienes entregaron
                </label>
              ) : null}
            </div>
          ) : null}

          {!loading && pendientesDePublicar > 0 ? (
            <div className="mb-3 flex items-center justify-between border border-amber-300/40 bg-amber-300/10 p-3">
              <p className="text-xs text-amber-200">
                {pendientesDePublicar} calificación{pendientesDePublicar === 1 ? "" : "es"} guardada
                {pendientesDePublicar === 1 ? "" : "s"} sin publicar: el estudiante todavía no la{pendientesDePublicar === 1 ? "" : "s"} ve.
              </p>
              <button className={BTN_PRIMARY} disabled={publicando} onClick={handlePublicar} type="button">
                <Send className="h-4 w-4" />
                {publicando ? "Publicando..." : "Publicar calificaciones"}
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-300">Cargando...</p>
          ) : estudiantes.length === 0 ? (
            <p className="text-sm text-slate-400">No hay estudiantes activos en este curso.</p>
          ) : (
            <div className="grid gap-3 overflow-y-auto">
              {estudiantesOrdenados.map((estudiante) => {
                const fila = filas[estudiante.id];
                if (!fila) return null;
                const entrega = entregaDe(estudiante);
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
                      <div className="flex items-center gap-2">
                        {fila.publicado ? (
                          <span className="border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                            Publicada
                          </span>
                        ) : (
                          <span className="border border-slate-400/40 bg-slate-400/15 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                            Sin publicar
                          </span>
                        )}
                        {guardadoId === estudiante.id ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                            <Check className="h-3.5 w-3.5" />
                            Guardado
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {entrega ? (
                      <div className="mt-2 border border-white/10 bg-white/4 p-2 text-xs text-slate-300">
                        <p className={entrega.tardia ? "font-semibold text-amber-300" : "text-slate-400"}>
                          Entregó el {formatearFechaHora(entrega.entregado_en)}
                          {entrega.tardia ? " · Tardía" : ""}
                        </p>
                        {entrega.comentario_estudiante ? (
                          <p className="mt-1 italic text-slate-300">“{entrega.comentario_estudiante}”</p>
                        ) : null}
                        {entrega.archivos.length ? (
                          <div className="mt-1 grid gap-1.5">
                            {entrega.archivos.map((archivo) => (
                              <ArchivoEntregaFila archivo={archivo} key={archivo.id} onError={setError} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

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
