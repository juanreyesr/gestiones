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
  rowToReporteData,
} from "@/lib/evaluacion-helpers";
import { exportInformeDocenteToPdf, exportReporteToPdf } from "@/lib/pdf";
import { ConfirmDialog } from "./confirm-dialog";
import { EvaluacionDetalleModal } from "./evaluacion-detalle-modal";

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

export function InformeDocenteView({ docentes }: { docentes: DocenteRow[] }) {
  const [docenteId, setDocenteId] = useState<string>("");
  const [rows, setRows] = useState<EvaluacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState<EvaluacionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvaluacionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingResumen, setExportingResumen] = useState(false);
  const [exportingFila, setExportingFila] = useState(false);

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

  const handlePrintResumen = async () => {
    if (!docente || !rows.length || exportingResumen) return;
    setExportingResumen(true);
    await exportInformeDocenteToPdf(
      {
        docenteNombre: docente.nombre,
        rows,
        porAnio,
        promedioHistorico: promedioGeneral(rows),
        promedioEntrevistas: promedioEntrevistas(rows),
      },
      `informe-${docente.nombre}.pdf`,
    );
    setExportingResumen(false);
  };

  const handlePrintFila = async () => {
    if (!viewRow || exportingFila) return;
    setExportingFila(true);
    const filename = `reporte-${viewRow.docente_nombre}-T${viewRow.trimestre}-${viewRow.anio}.pdf`;
    await exportReporteToPdf(rowToReporteData(viewRow), filename);
    setExportingFila(false);
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
          disabled={!rows.length || exportingResumen}
          onClick={handlePrintResumen}
          type="button"
        >
          <Printer className="h-4 w-4" />
          {exportingResumen ? "Generando PDF..." : "Descargar informe en PDF"}
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

      <EvaluacionDetalleModal
        data={viewRow ? rowToReporteData(viewRow) : null}
        onClose={() => setViewRow(null)}
        onPrint={handlePrintFila}
        printing={exportingFila}
      />

      <ConfirmDialog
        busy={deleting}
        message={`Se eliminará la evaluación de ${deleteTarget?.docente_nombre ?? ""} (${deleteTarget?.curso_nombre ?? ""}, ${deleteTarget ? `T${deleteTarget.trimestre} ${deleteTarget.anio}` : ""}). Esta acción no se puede deshacer.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Borrar evaluación"
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
