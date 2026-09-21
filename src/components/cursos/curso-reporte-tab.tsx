"use client";

import { CalendarDays, ClipboardCheck, Printer, UserCheck, UserMinus } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchActividadesDeCurso, fetchCalificacionesDeCurso } from "@/lib/cursos/actividades";
import { fetchAsistenciasDeCurso } from "@/lib/cursos/asistencias";
import { AVANCE_VACIO, calcularAvancePorEstudiante, type AvanceEstudiante } from "@/lib/cursos/avance";
import { fetchEventos, fetchEstudiantes } from "@/lib/cursos/estudiantes";
import { fetchPerfilesGlobalesPorIds, fotoPerfilComoDataUrl } from "@/lib/cursos/perfil-estudiante";
import { exportReporteCursoPdf, type FichaPerfilReporte } from "@/lib/cursos/reporte-pdf";
import { fetchSemanas } from "@/lib/cursos/semanas";
import type { CursoImpartidoRow, EstudianteRow, UniversidadRow } from "@/lib/cursos/types";
import { BTN_PRIMARY, ErrorBanner } from "./ui";

export function CursoReporteTab({ curso, universidad }: { curso: CursoImpartidoRow; universidad: UniversidadRow }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [metricas, setMetricas] = useState({ semanas: 0, activos: 0, retirados: 0, asistenciaGlobal: 0 });
  const [estudiantesActivos, setEstudiantesActivos] = useState<EstudianteRow[]>([]);
  const [avancePorEstudiante, setAvancePorEstudiante] = useState<Map<string, AvanceEstudiante>>(new Map());

  const cargarResumen = useCallback(async () => {
    setLoading(true);
    const [
      { data: semanas, error: errorSemanas },
      { data: estudiantes, error: errorEstudiantes },
      { data: asistencias, error: errorAsistencias },
      { data: actividades, error: errorActividades },
      { data: calificaciones, error: errorCalificaciones },
    ] = await Promise.all([
      fetchSemanas(curso.id),
      fetchEstudiantes(curso.id),
      fetchAsistenciasDeCurso(curso.id),
      fetchActividadesDeCurso(curso.id),
      fetchCalificacionesDeCurso(curso.id),
    ]);
    setError(errorSemanas ?? errorEstudiantes ?? errorAsistencias ?? errorActividades ?? errorCalificaciones ?? "");
    const activos = estudiantes.filter((e) => e.estado === "activo");
    const retirados = estudiantes.filter((e) => e.estado === "retirado").length;
    const validos = asistencias
      .map((a) => (a.estado === "sin_marcar" ? null : a.estado === "presente" || a.estado === "tarde" ? 1 : 0))
      .filter((v): v is 0 | 1 => v !== null);
    const asistenciaGlobal = validos.length
      ? Math.round((validos.reduce<number>((a, b) => a + b, 0) / validos.length) * 100)
      : 0;

    setMetricas({ semanas: semanas.length, activos: activos.length, retirados, asistenciaGlobal });
    setEstudiantesActivos(activos);
    setAvancePorEstudiante(calcularAvancePorEstudiante(actividades, calificaciones));
    setLoading(false);
  }, [curso.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recalcula el resumen al cambiar de curso
    void cargarResumen();
  }, [cargarResumen]);

  const handleDescargar = async () => {
    setExportando(true);
    setError("");
    const [
      { data: semanas },
      { data: estudiantes },
      { data: eventos },
      { data: asistencias },
      { data: actividades },
      { data: calificaciones },
    ] = await Promise.all([
      fetchSemanas(curso.id),
      fetchEstudiantes(curso.id),
      fetchEventos(curso.id),
      fetchAsistenciasDeCurso(curso.id),
      fetchActividadesDeCurso(curso.id),
      fetchCalificacionesDeCurso(curso.id),
    ]);

    const idsGlobales = estudiantes
      .filter((e) => e.estado === "activo")
      .map((e) => e.estudiante_id)
      .filter((id): id is string => Boolean(id));
    const { data: perfiles } = await fetchPerfilesGlobalesPorIds(idsGlobales);
    const fichasPerfil: FichaPerfilReporte[] = [];
    for (const estudiante of estudiantes) {
      if (estudiante.estado !== "activo" || !estudiante.estudiante_id) continue;
      const perfil = perfiles.get(estudiante.estudiante_id);
      if (!perfil) continue;
      if (!perfil.foto_path && !perfil.fecha_nacimiento && !perfil.pais) continue;
      const fotoDataUrl = perfil.foto_path ? await fotoPerfilComoDataUrl(perfil.foto_path) : null;
      fichasPerfil.push({
        estudianteNombre: estudiante.nombre,
        fotoDataUrl,
        fechaNacimiento: perfil.fecha_nacimiento,
        pais: perfil.pais,
      });
    }

    try {
      await exportReporteCursoPdf({
        universidadNombre: universidad.nombre,
        cursoNombre: curso.nombre,
        periodo: curso.periodo,
        semanas,
        estudiantes,
        eventos,
        asistencias,
        actividades,
        calificaciones,
        fichasPerfil,
      });
    } catch {
      setError("No se pudo generar el reporte PDF.");
    }
    setExportando(false);
  };

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-slate-300">Cargando resumen...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={CalendarDays} title="Semanas" value={`${metricas.semanas}`} />
          <Metric icon={UserCheck} title="Estudiantes activos" value={`${metricas.activos}`} />
          <Metric icon={UserMinus} title="Estudiantes retirados" value={`${metricas.retirados}`} />
          <Metric icon={ClipboardCheck} title="Asistencia global" value={`${metricas.asistenciaGlobal}%`} />
        </div>
      )}

      {!loading ? (
        <div className="border border-white/10 bg-white/6 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-300">Avance por estudiante</h3>
          <p className="mb-3 text-xs text-slate-500">
            Promedio de las actividades ya calificadas con punteo asignado (cada una pesa igual, sin importar cuántas haya). Aprueba con 60% o
            más. Es el estado en este momento, no el final del curso.
          </p>
          {estudiantesActivos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay estudiantes activos en este curso.</p>
          ) : (
            <div className="grid gap-2">
              {estudiantesActivos.map((estudiante) => {
                const avance = avancePorEstudiante.get(estudiante.id) ?? AVANCE_VACIO;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/6 px-3 py-2" key={estudiante.id}>
                    <span className="text-sm text-slate-200">{estudiante.nombre}</span>
                    {avance.aprobado === null ? (
                      <span className="text-xs text-slate-500">Sin calificaciones con punteo aún</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{avance.actividadesCalificadas} calificada{avance.actividadesCalificadas === 1 ? "" : "s"}</span>
                        <span className="text-sm font-semibold text-white">{Math.round(avance.porcentaje ?? 0)}%</span>
                        <span
                          className={`border px-2 py-0.5 text-[11px] font-semibold ${
                            avance.aprobado
                              ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                              : "border-red-400/40 bg-red-400/10 text-red-200"
                          }`}
                        >
                          {avance.aprobado ? "Aprobado" : "Reprobado"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div>
        <button className={BTN_PRIMARY} disabled={exportando} onClick={handleDescargar} type="button">
          <Printer className="h-4 w-4" />
          {exportando ? "Generando reporte..." : "Descargar reporte PDF del curso"}
        </button>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400">{title}</span>
        <Icon className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
