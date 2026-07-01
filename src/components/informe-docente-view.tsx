"use client";

import { GraduationCap, Printer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DocenteRow } from "@/data/evaluacion";
import {
  deleteEvaluacion,
  type EvaluacionRow,
  fetchEvaluacionesPorDocente,
  promedioEntrevistas,
  promedioGeneral,
  summarizeEntrevistas,
  summarizeImprovementAreas,
  summarizeScores,
} from "@/lib/evaluacion-helpers";
import { ConfirmDialog } from "./confirm-dialog";
import { EvaluacionDetalleModal } from "./evaluacion-detalle-modal";
import { PrintPortal } from "./print-portal";
import { ReportePrintable, type ReporteData } from "./reporte-printable";

function agruparPorAnio(rows: EvaluacionRow[]) {
  const map = new Map<number, EvaluacionRow[]>();
  for (const row of rows) {
    const list = map.get(row.anio) ?? [];
    list.push(row);
    map.set(row.anio, list);
  }
  return Array.from(map.entries())
    .map(([anio, items]) => ({ anio, count: items.length, promedio: promedioGeneral(items) }))
    .sort((a, b) => b.anio - a.anio);
}

function rowToReporteData(row: EvaluacionRow): ReporteData {
  return {
    docenteNombre: row.docente_nombre,
    cursoNombre: row.curso_nombre,
    anio: row.anio,
    trimestre: row.trimestre,
    fecha: row.fecha_observacion,
    pct: row.porcentaje,
    total: row.puntaje_total,
    max: row.puntaje_maximo,
    categoryAnalytics: summarizeScores(row.scores),
    entrevistaStats: summarizeEntrevistas(row.entrevistas),
    fortalezas: row.fortalezas ?? [],
    improvementAreas: summarizeImprovementAreas(row.scores),
    observaciones: row.observaciones ?? "",
  };
}

export function InformeDocenteView({ docentes }: { docentes: DocenteRow[] }) {
  const [docenteId, setDocenteId] = useState<string>("");
  const [rows, setRows] = useState<EvaluacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [printingResumen, setPrintingResumen] = useState(false);
  const [viewRow, setViewRow] = useState<EvaluacionRow | null>(null);
  const [printRow, setPrintRow] = useState<EvaluacionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvaluacionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const docente = docentes.find((item) => item.id === docenteId);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await fetchEvaluacionesPorDocente(id);
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (docentes.length && !docenteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- selects the first docente once the list loads
      setDocenteId(docentes[0].id);
    }
  }, [docentes, docenteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch whenever the selected docente changes
    load(docenteId);
  }, [docenteId, load]);

  const porAnio = useMemo(() => agruparPorAnio(rows), [rows]);

  const handlePrintResumen = () => {
    setPrintRow(null);
    setPrintingResumen(true);
    requestAnimationFrame(() => window.print());
  };

  const handlePrintFila = () => {
    if (!viewRow) return;
    setPrintingResumen(false);
    setPrintRow(viewRow);
    requestAnimationFrame(() => window.print());
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
    setDeleteTarget(null);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <GraduationCap className="h-4 w-4" />
            Informe por docente
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Historial completo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Todas las evaluaciones guardadas de un docente a lo largo de su recorrido en la universidad.
          </p>
        </div>
        <button
          className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30 disabled:opacity-40"
          disabled={!rows.length}
          onClick={handlePrintResumen}
          type="button"
        >
          <Printer className="h-4 w-4" />
          Imprimir informe
        </button>
      </div>

      <Field label="Docente">
        <select className="field max-w-md" onChange={(event) => setDocenteId(event.target.value)} value={docenteId}>
          {docentes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>
      </Field>

      {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-300">Cargando historial...</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard title="Evaluaciones registradas" value={`${rows.length}`} />
            <SummaryCard title="Promedio historico" value={`${promedioGeneral(rows)}%`} />
            <SummaryCard title="Entrevistas promedio" value={`${promedioEntrevistas(rows)}%`} />
          </div>

          <div className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 text-sm font-semibold">Rendimiento por año</div>
            {porAnio.length ? (
              <div className="grid gap-3">
                {porAnio.map((item) => (
                  <div key={item.anio}>
                    <div className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>
                        {item.anio} <span className="text-slate-500">({item.count} evaluaciones)</span>
                      </span>
                      <span>{item.promedio}%</span>
                    </div>
                    <div className="h-2 bg-slate-800">
                      <div className="h-full bg-emerald-300" style={{ width: `${item.promedio}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">Este docente aun no tiene evaluaciones guardadas.</p>
            )}
          </div>

          <div className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 text-sm font-semibold">Detalle de evaluaciones</div>
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-slate-400">
                      <th className="pb-2 pr-3">Curso</th>
                      <th className="pb-2 pr-3">Periodo</th>
                      <th className="pb-2 pr-3">Fecha</th>
                      <th className="pb-2 pr-3">%</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-white/8">
                        <td className="py-2 pr-3">{row.curso_nombre}</td>
                        <td className="py-2 pr-3">
                          T{row.trimestre} {row.anio}
                        </td>
                        <td className="py-2 pr-3">{row.fecha_observacion}</td>
                        <td className="py-2 pr-3">{row.porcentaje}%</td>
                        <td className="py-2">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <PrintPortal>
        {printRow ? (
          <ReportePrintable data={rowToReporteData(printRow)} />
        ) : printingResumen && docente ? (
          <div className="mx-auto max-w-3xl p-8 text-slate-900">
            <h1 className="text-2xl font-bold">Informe de docente</h1>
            <p className="mt-1 text-sm text-slate-600">M. A. Juan J. Reyes - Coordinacion academica</p>

            <div className="mt-6 text-sm">
              <strong>Docente:</strong> {docente.nombre}
            </div>

            <h2 className="mt-8 text-lg font-bold">Resumen historico</h2>
            <dl className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-slate-600">Evaluaciones</dt>
                <dd className="text-xl font-semibold">{rows.length}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Promedio historico</dt>
                <dd className="text-xl font-semibold">{promedioGeneral(rows)}%</dd>
              </div>
              <div>
                <dt className="text-slate-600">Entrevistas promedio</dt>
                <dd className="text-xl font-semibold">{promedioEntrevistas(rows)}%</dd>
              </div>
            </dl>

            <h2 className="mt-8 text-lg font-bold">Rendimiento por año</h2>
            <div className="mt-3 grid gap-3">
              {porAnio.map((item) => (
                <div key={item.anio}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {item.anio} ({item.count} evaluaciones)
                    </span>
                    <span>{item.promedio}%</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full max-w-md bg-slate-200">
                    <div className="h-full bg-slate-700" style={{ width: `${item.promedio}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mt-8 text-lg font-bold">Detalle de evaluaciones</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="py-1 pr-3">Curso</th>
                  <th className="py-1 pr-3">Periodo</th>
                  <th className="py-1 pr-3">Fecha</th>
                  <th className="py-1 pr-3">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-1 pr-3">{row.curso_nombre}</td>
                    <td className="py-1 pr-3">
                      T{row.trimestre} {row.anio}
                    </td>
                    <td className="py-1 pr-3">{row.fecha_observacion}</td>
                    <td className="py-1 pr-3">{row.porcentaje}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PrintPortal>

      <EvaluacionDetalleModal
        data={viewRow ? rowToReporteData(viewRow) : null}
        onClose={() => setViewRow(null)}
        onPrint={handlePrintFila}
      />

      <ConfirmDialog
        busy={deleting}
        message={`Se eliminara la evaluacion de ${deleteTarget?.docente_nombre ?? ""} (${deleteTarget?.curso_nombre ?? ""}, ${deleteTarget ? `T${deleteTarget.trimestre} ${deleteTarget.anio}` : ""}). Esta accion no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Borrar evaluacion"
      />
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="text-xs font-semibold uppercase text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
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
