"use client";

import { BarChart3, Link2, Printer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Trimestre } from "@/data/evaluacion";
import {
  aggregateCategoryAnalytics,
  aggregateEntrevistaPreguntas,
  aggregateFortalezas,
  aggregateTendenciaCategorias,
  agruparPorCurso,
  agruparPorDocente,
  categoriasConOportunidad,
  combinarSobresalientes,
  currentTrimestre,
  deleteEvaluacion,
  type EvaluacionRow,
  fetchEvaluacionesPorPeriodo,
  preguntasConOportunidadReal,
  promedioEntrevistas,
  promedioGeneral,
  rowToReporteData,
} from "@/lib/evaluacion-helpers";
import { exportReporteToPdf, exportResumenGeneralToPdf } from "@/lib/pdf";
import { CompartirResumenModal } from "./compartir-resumen-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { EvaluacionDetalleModal } from "./evaluacion-detalle-modal";
import { ResumenGeneralPanel } from "./resumen-general-panel";

type PeriodoValor = Trimestre | "todos" | "historico";

const PERIODOS: Array<{ label: string; value: PeriodoValor }> = [
  { label: "Trimestre 1", value: 1 },
  { label: "Trimestre 2", value: 2 },
  { label: "Trimestre 3", value: 3 },
  { label: "Todo el año", value: "todos" },
  { label: "Todo el historial", value: "historico" },
];

export function ConsultasView() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodo, setPeriodo] = useState<PeriodoValor>(currentTrimestre());
  const [rows, setRows] = useState<EvaluacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState<EvaluacionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvaluacionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [historicoRows, setHistoricoRows] = useState<EvaluacionRow[]>([]);
  const [exportingResumenCompleto, setExportingResumenCompleto] = useState(false);
  const [compartirOpen, setCompartirOpen] = useState(false);

  const esHistorico = periodo === "historico";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await fetchEvaluacionesPorPeriodo(
      esHistorico ? null : anio,
      esHistorico ? "todos" : periodo,
    );
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    setRows(data);
    setLoading(false);
  }, [anio, periodo, esHistorico]);

  const loadHistorico = useCallback(async () => {
    const { data, error: fetchError } = await fetchEvaluacionesPorPeriodo(null, "todos");
    if (!fetchError) setHistoricoRows(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch whenever the period filter changes
    load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the full historial once, independent of the period filter, for the trend chart and the full PDF report
    loadHistorico();
  }, [loadHistorico]);

  const handleImprimirResumenCompleto = async () => {
    if (!historicoRows.length || exportingResumenCompleto) return;
    setExportingResumenCompleto(true);
    const categoriaAggCompleto = aggregateCategoryAnalytics(historicoRows);
    const fortalezaAggCompleto = aggregateFortalezas(historicoRows);
    const preguntasAggCompleto = aggregateEntrevistaPreguntas(historicoRows);
    await exportResumenGeneralToPdf(
      {
        rows: historicoRows,
        porCurso: agruparPorCurso(historicoRows),
        porDocente: agruparPorDocente(historicoRows),
        sobresalientes: combinarSobresalientes(categoriaAggCompleto, fortalezaAggCompleto),
        categoriasOportunidad: categoriasConOportunidad(categoriaAggCompleto),
        preguntasDestacadas: [...preguntasAggCompleto].sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0)).slice(0, 2),
        preguntasOportunidad: preguntasConOportunidadReal(preguntasAggCompleto),
        tendenciaCategorias: aggregateTendenciaCategorias(historicoRows),
        promedioGeneralValor: promedioGeneral(historicoRows),
        promedioEntrevistasValor: promedioEntrevistas(historicoRows),
        docentesUnicos: agruparPorDocente(historicoRows).length,
      },
      `resumen-general-historico.pdf`,
    );
    setExportingResumenCompleto(false);
  };

  const handlePrint = async () => {
    if (!viewRow || exportingPdf) return;
    setExportingPdf(true);
    const filename = `reporte-${viewRow.docente_nombre}-T${viewRow.trimestre}-${viewRow.anio}.pdf`;
    await exportReporteToPdf(rowToReporteData(viewRow), filename);
    setExportingPdf(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: deleteError } = await deleteEvaluacion(deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError);
      setDeleteTarget(null);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== deleteTarget.id));
    setHistoricoRows((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  /* Los botones por fila viven aqui (y no en el panel) porque el mismo panel lo
     reusa el enlace publico, que es de solo lectura. */
  const acciones = (row: EvaluacionRow) => (
    <div className="flex gap-2">
      <button
        className="border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-slate-100 transition hover:border-white/30"
        onClick={() => setViewRow(row)}
        type="button"
      >
        Ver
      </button>
      <button
        className="flex items-center justify-center border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/60"
        onClick={() => setDeleteTarget(row)}
        title="Borrar registro"
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <BarChart3 className="h-4 w-4" />
            Consultas
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Resumen general</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Analisis de las evaluaciones ya guardadas. Filtra por trimestre, revisa el año completo o todo el historial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30"
            onClick={() => setCompartirOpen(true)}
            title="Genera un enlace de solo lectura para jefatura, con todos los trimestres y años"
            type="button"
          >
            <Link2 className="h-4 w-4" />
            Compartir con jefatura
          </button>
          <button
            className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30 disabled:opacity-40"
            disabled={!historicoRows.length || exportingResumenCompleto}
            onClick={handleImprimirResumenCompleto}
            title="Incluye todo el historial, sin importar el filtro de periodo seleccionado arriba"
            type="button"
          >
            <Printer className="h-4 w-4" />
            {exportingResumenCompleto ? "Generando PDF..." : "Descargar informe completo en PDF"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((item) => (
          <button
            key={item.label}
            className={`border px-3 py-1.5 text-xs font-semibold transition ${
              periodo === item.value
                ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            onClick={() => setPeriodo(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
        <input
          className="field w-28 disabled:opacity-40"
          disabled={esHistorico}
          onChange={(event) => setAnio(Number(event.target.value))}
          type="number"
          value={anio}
        />
      </div>

      {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-300">Cargando evaluaciones...</p> : null}

      {!loading && !error ? <ResumenGeneralPanel acciones={acciones} historicoRows={historicoRows} rows={rows} /> : null}

      <EvaluacionDetalleModal
        data={viewRow ? rowToReporteData(viewRow) : null}
        onClose={() => setViewRow(null)}
        onPrint={handlePrint}
        printing={exportingPdf}
      />

      <ConfirmDialog
        busy={deleting}
        message={`Se eliminará la evaluación de ${deleteTarget?.docente_nombre ?? ""} (${deleteTarget?.curso_nombre ?? ""}, ${deleteTarget ? `T${deleteTarget.trimestre} ${deleteTarget.anio}` : ""}). Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Borrar evaluación"
      />

      {compartirOpen ? <CompartirResumenModal onClose={() => setCompartirOpen(false)} /> : null}
    </div>
  );
}
