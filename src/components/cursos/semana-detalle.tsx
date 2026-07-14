"use client";

import { AlertTriangle, ChevronLeft, ClipboardCheck, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchActividades } from "@/lib/cursos/actividades";
import { fetchAsistencias } from "@/lib/cursos/asistencias";
import { fetchContenidos } from "@/lib/cursos/contenidos";
import { fetchEstudiantes } from "@/lib/cursos/estudiantes";
import { fetchSemanas } from "@/lib/cursos/semanas";
import {
  ESTADO_ASISTENCIA_LABELS,
  TIPO_SESION_LABELS,
  formatearFecha,
  type ActividadRow,
  type AsistenciaRow,
  type ContenidoRow,
  type CursoImpartidoRow,
  type EstudianteRow,
  type SemanaRow,
} from "@/lib/cursos/types";
import { AsistenciaPanel } from "./asistencia-panel";
import { CalificarActividadModal } from "./calificar-actividad-modal";
import { SemanaActividadesSection } from "./semana-actividades-section";
import { SemanaContenidosSection } from "./semana-contenidos-section";
import { BTN_GHOST, BTN_PRIMARY, Chip, ErrorBanner } from "./ui";

const TIPO_SESION_CHIP: Record<string, string> = {
  normal: "",
  examen_parcial: "border-amber-300/40 bg-amber-300/15 text-amber-200",
  examen_final: "border-rose-300/40 bg-rose-300/15 text-rose-200",
};

export function SemanaDetalle({
  curso,
  onVolver,
  semana,
}: {
  curso: CursoImpartidoRow;
  onVolver: () => void;
  semana: SemanaRow;
}) {
  const [contenidos, setContenidos] = useState<ContenidoRow[]>([]);
  const [actividades, setActividades] = useState<ActividadRow[]>([]);
  const [estudiantes, setEstudiantes] = useState<EstudianteRow[]>([]);
  const [estudiantesActivos, setEstudiantesActivos] = useState<EstudianteRow[]>([]);
  const [semanaAnterior, setSemanaAnterior] = useState<SemanaRow | null>(null);
  const [tareasPendientes, setTareasPendientes] = useState<ActividadRow[]>([]);
  const [notasSemanaAnterior, setNotasSemanaAnterior] = useState<AsistenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [asistenciaAbierta, setAsistenciaAbierta] = useState(false);
  const [calificandoBanner, setCalificandoBanner] = useState<ActividadRow | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [
      { data: contenidosData, error: errorContenidos },
      { data: actividadesData },
      { data: estudiantesData },
      { data: semanasData },
    ] = await Promise.all([
      fetchContenidos(semana.id),
      fetchActividades(semana.id),
      fetchEstudiantes(curso.id),
      fetchSemanas(curso.id),
    ]);

    setContenidos(contenidosData);
    setActividades(actividadesData);
    setEstudiantes(estudiantesData);
    setEstudiantesActivos(estudiantesData.filter((e) => e.estado === "activo"));
    setError(errorContenidos ?? "");

    const anterior = semanasData.find((s) => s.numero === semana.numero - 1) ?? null;
    setSemanaAnterior(anterior);

    if (anterior) {
      const [{ data: actividadesAnteriores }, { data: asistenciasAnteriores }] = await Promise.all([
        fetchActividades(anterior.id),
        fetchAsistencias(anterior.id),
      ]);
      setTareasPendientes(actividadesAnteriores.filter((a) => a.entrega_proxima_semana));
      setNotasSemanaAnterior(
        asistenciasAnteriores.filter(
          (a) => a.estado === "ausente" || a.estado === "excusa" || a.estado === "tarde" || (a.nota && a.nota.trim()),
        ),
      );
    } else {
      setTareasPendientes([]);
      setNotasSemanaAnterior([]);
    }

    setLoading(false);
  }, [curso.id, semana.id, semana.numero]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga los datos de la semana al navegar a otra
    void cargar();
  }, [cargar]);

  const contenidosNormales = contenidos.filter((c) => c.categoria === "contenido");
  const materialesExtra = contenidos.filter((c) => c.categoria === "material_extra");
  // Incluye tambien a los retirados para que el seguimiento de la semana
  // pasada muestre su nombre aunque ya no esten activos.
  const estudiantesPorId = new Map(estudiantes.map((e) => [e.id, e.nombre]));

  return (
    <div className="grid gap-5">
      <button className={`${BTN_GHOST} w-fit`} onClick={onVolver} type="button">
        <ChevronLeft className="h-4 w-4" />
        Volver a {curso.nombre}
      </button>

      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Semana {semana.numero}
            {semana.titulo ? ` — ${semana.titulo}` : ""}
          </h2>
          <p className="text-sm text-slate-400">{formatearFecha(semana.fecha)}</p>
        </div>
        {semana.tipo_sesion !== "normal" ? (
          <Chip className={TIPO_SESION_CHIP[semana.tipo_sesion]}>{TIPO_SESION_LABELS[semana.tipo_sesion]}</Chip>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : (
        <>
          {tareasPendientes.length > 0 ? (
            <div className="border border-amber-300/40 bg-amber-300/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-200">
                <ClipboardCheck className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Esta semana entregan</h3>
              </div>
              <div className="grid gap-2">
                {tareasPendientes.map((tarea) => (
                  <button
                    className="flex items-center justify-between border border-amber-300/30 bg-white/6 px-3 py-2 text-left text-sm text-amber-100 transition hover:border-amber-300/60"
                    key={tarea.id}
                    onClick={() => setCalificandoBanner(tarea)}
                    type="button"
                  >
                    <span>
                      {tarea.titulo}
                      {tarea.punteo !== null ? ` (${tarea.punteo} pts)` : ""}
                    </span>
                    <span className="text-xs font-semibold uppercase text-amber-300">Calificar</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {notasSemanaAnterior.length > 0 ? (
            <div className="border border-white/10 bg-white/6 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-200">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Seguimiento de la semana pasada</h3>
              </div>
              <div className="grid gap-1">
                {notasSemanaAnterior.map((registro) => (
                  <p className="text-xs text-slate-300" key={registro.id}>
                    {estudiantesPorId.get(registro.estudiante_id) ?? "Estudiante"} —{" "}
                    {ESTADO_ASISTENCIA_LABELS[registro.estado]}
                    {registro.nota ? `: ${registro.nota}` : ""}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <SemanaContenidosSection
            categoria="contenido"
            contenidos={contenidosNormales}
            cursoId={curso.id}
            onReload={cargar}
            semanaId={semana.id}
            titulo="Contenidos"
          />

          <SemanaContenidosSection
            categoria="material_extra"
            contenidos={materialesExtra}
            cursoId={curso.id}
            onReload={cargar}
            semanaId={semana.id}
            titulo="Materiales extra"
          />

          <SemanaActividadesSection
            actividades={actividades}
            estudiantesActivos={estudiantesActivos}
            onReload={cargar}
            semanaId={semana.id}
          />

          <section className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Asistencia</h3>
              <button className={BTN_PRIMARY} onClick={() => setAsistenciaAbierta(true)} type="button">
                <ClipboardList className="h-4 w-4" />
                Gestionar asistencia
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Marca la asistencia de los estudiantes activos para esta semana y registra notas relevantes.
            </p>
          </section>
        </>
      )}

      {asistenciaAbierta ? (
        <AsistenciaPanel
          cursoId={curso.id}
          onClose={() => setAsistenciaAbierta(false)}
          semanaAnteriorId={semanaAnterior?.id ?? null}
          semanaId={semana.id}
        />
      ) : null}

      {calificandoBanner ? (
        <CalificarActividadModal
          actividad={calificandoBanner}
          estudiantes={estudiantesActivos}
          onClose={() => setCalificandoBanner(null)}
        />
      ) : null}
    </div>
  );
}
