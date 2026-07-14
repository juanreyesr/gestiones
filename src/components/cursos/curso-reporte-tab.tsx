"use client";

import { CalendarDays, ClipboardCheck, Printer, UserCheck, UserMinus } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchActividadesDeCurso, fetchCalificacionesDeCurso } from "@/lib/cursos/actividades";
import { fetchAsistenciasDeCurso } from "@/lib/cursos/asistencias";
import { fetchEventos, fetchEstudiantes } from "@/lib/cursos/estudiantes";
import { exportReporteCursoPdf } from "@/lib/cursos/reporte-pdf";
import { fetchSemanas } from "@/lib/cursos/semanas";
import type { CursoImpartidoRow, UniversidadRow } from "@/lib/cursos/types";
import { BTN_PRIMARY, ErrorBanner } from "./ui";

export function CursoReporteTab({ curso, universidad }: { curso: CursoImpartidoRow; universidad: UniversidadRow }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [metricas, setMetricas] = useState({ semanas: 0, activos: 0, retirados: 0, asistenciaGlobal: 0 });

  const cargarResumen = useCallback(async () => {
    setLoading(true);
    const [
      { data: semanas, error: errorSemanas },
      { data: estudiantes, error: errorEstudiantes },
      { data: asistencias, error: errorAsistencias },
    ] = await Promise.all([
      fetchSemanas(curso.id),
      fetchEstudiantes(curso.id),
      fetchAsistenciasDeCurso(curso.id),
    ]);
    setError(errorSemanas ?? errorEstudiantes ?? errorAsistencias ?? "");
    const activos = estudiantes.filter((e) => e.estado === "activo").length;
    const retirados = estudiantes.filter((e) => e.estado === "retirado").length;
    const validos = asistencias
      .map((a) => (a.estado === "sin_marcar" ? null : a.estado === "presente" || a.estado === "tarde" ? 1 : 0))
      .filter((v): v is 0 | 1 => v !== null);
    const asistenciaGlobal = validos.length
      ? Math.round((validos.reduce<number>((a, b) => a + b, 0) / validos.length) * 100)
      : 0;

    setMetricas({ semanas: semanas.length, activos, retirados, asistenciaGlobal });
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
