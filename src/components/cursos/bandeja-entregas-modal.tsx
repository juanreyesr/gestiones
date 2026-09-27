"use client";

import { ClipboardCheck, Download, Eye, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fetchCalificacionesDeCurso } from "@/lib/cursos/actividades";
import { abrirArchivoEntrega, entregasSinNota, fetchEntregasDeCurso, type EntregaDeCurso } from "@/lib/cursos/entregas";
import { fetchEstudiantes } from "@/lib/cursos/estudiantes";
import { formatearFechaHora, type ActividadRow, type EntregaArchivoRow, type EstudianteRow } from "@/lib/cursos/types";
import { CalificarActividadModal } from "./calificar-actividad-modal";
import { BTN_PRIMARY, ErrorBanner } from "./ui";

type Grupo = { actividad: EntregaDeCurso["actividad"]; entregas: EntregaDeCurso[] };

/**
 * Bandeja de entregas del curso: todo lo que los estudiantes subieron y aún
 * no tiene nota, agrupado por semana y tarea, con acceso directo a los
 * archivos y al modal de calificación.
 */
export function BandejaEntregasModal({
  cursoId,
  onCambio,
  onClose,
}: {
  cursoId: string;
  onCambio?: () => void;
  onClose: () => void;
}) {
  const [pendientes, setPendientes] = useState<EntregaDeCurso[]>([]);
  const [activos, setActivos] = useState<EstudianteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calificando, setCalificando] = useState<ActividadRow | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data: entregas, error: entregasError }, { data: estudiantes, error: estudiantesError }, { data: calificaciones }] =
      await Promise.all([fetchEntregasDeCurso(cursoId), fetchEstudiantes(cursoId), fetchCalificacionesDeCurso(cursoId)]);
    const estudiantesActivos = estudiantes.filter((e) => e.estado === "activo");
    setActivos(estudiantesActivos);
    setPendientes(entregasSinNota(entregas, calificaciones, estudiantesActivos));
    setError(entregasError ?? estudiantesError ?? "");
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga la bandeja al abrir el modal
    void cargar();
  }, [cargar]);

  const nombrePorGlobal = useMemo(
    () => new Map(activos.filter((e) => e.estudiante_id).map((e) => [e.estudiante_id as string, e.nombre])),
    [activos],
  );

  const grupos = useMemo(() => {
    const porActividad = new Map<string, Grupo>();
    for (const entrega of pendientes) {
      const grupo = porActividad.get(entrega.actividad_id) ?? { actividad: entrega.actividad, entregas: [] };
      grupo.entregas.push(entrega);
      porActividad.set(entrega.actividad_id, grupo);
    }
    return [...porActividad.values()].sort(
      (a, b) =>
        (a.actividad.gestionesjj_curso_semanas?.numero ?? 0) - (b.actividad.gestionesjj_curso_semanas?.numero ?? 0) ||
        a.actividad.titulo.localeCompare(b.actividad.titulo),
    );
  }, [pendientes]);

  const handleArchivo = async (archivo: EntregaArchivoRow, modo: "ver" | "descargar") => {
    const { error: archivoError } = await abrirArchivoEntrega(archivo, modo);
    if (archivoError) setError(archivoError);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="flex max-h-[85vh] w-full max-w-3xl flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Tareas por calificar</h3>
              <p className="text-xs text-slate-400">Entregas de tus estudiantes que todavía no tienen nota, por semana.</p>
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
          ) : grupos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay entregas pendientes de calificar. 🎉</p>
          ) : (
            <div className="grid gap-3 overflow-y-auto">
              {grupos.map(({ actividad, entregas }) => (
                <div className="border border-white/10 bg-white/6 p-3" key={actividad.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-200">
                        Semana {actividad.gestionesjj_curso_semanas?.numero ?? "?"}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {actividad.titulo}
                        {actividad.punteo !== null ? <span className="text-slate-400"> · {actividad.punteo} pts</span> : null}
                      </p>
                    </div>
                    <button className={BTN_PRIMARY} onClick={() => setCalificando(actividad)} type="button">
                      <ClipboardCheck className="h-4 w-4" />
                      Calificar ({entregas.length})
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {entregas.map((entrega) => (
                      <div className="border border-white/10 bg-white/4 p-2 text-xs" key={entrega.id}>
                        <p className="text-slate-200">
                          <b>{nombrePorGlobal.get(entrega.estudiante_id) ?? "Estudiante"}</b>
                          <span className={entrega.tardia ? "font-semibold text-amber-300" : "text-slate-400"}>
                            {" "}
                            · {formatearFechaHora(entrega.entregado_en)}
                            {entrega.tardia ? " · Tardía" : ""}
                          </span>
                        </p>
                        {entrega.archivos.map((archivo) => (
                          <div className="mt-1 flex flex-wrap items-center gap-2" key={archivo.id}>
                            <span className="min-w-0 flex-1 truncate text-slate-300" title={archivo.archivo_nombre ?? undefined}>
                              📎 {archivo.archivo_nombre ?? "Archivo"}
                            </span>
                            <button
                              className="inline-flex items-center gap-1.5 border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:border-emerald-300/70"
                              onClick={() => handleArchivo(archivo, "ver")}
                              type="button"
                            >
                              <Eye className="h-3 w-3" />
                              Ver
                            </button>
                            <button
                              className="inline-flex items-center gap-1.5 border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-emerald-300/50"
                              onClick={() => handleArchivo(archivo, "descargar")}
                              type="button"
                            >
                              <Download className="h-3 w-3" />
                              Descargar
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {calificando ? (
        <CalificarActividadModal
          actividad={calificando}
          estudiantes={activos}
          onCambio={onCambio}
          onClose={() => {
            setCalificando(null);
            void cargar();
          }}
        />
      ) : null}
    </ModalPortal>
  );
}
