"use client";

import { BarChart3, Printer, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Trimestre } from "@/data/evaluacion";
import {
  agruparPorDocente,
  currentTrimestre,
  type EvaluacionRow,
  fetchEvaluacionesPorPeriodo,
  promedioEntrevistas,
  promedioGeneral,
  summarizeEntrevistas,
  summarizeImprovementAreas,
  summarizeScores,
} from "@/lib/evaluacion-helpers";
import { PrintPortal } from "./print-portal";
import { ReportePrintable, type ReporteData } from "./reporte-printable";

const PERIODOS: Array<{ label: string; value: Trimestre | "todos" }> = [
  { label: "Trimestre 1", value: 1 },
  { label: "Trimestre 2", value: 2 },
  { label: "Trimestre 3", value: 3 },
  { label: "Todo el ano", value: "todos" },
];

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

export function ConsultasView() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre | "todos">(currentTrimestre());
  const [rows, setRows] = useState<EvaluacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [printRow, setPrintRow] = useState<EvaluacionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await fetchEvaluacionesPorPeriodo(anio, trimestre);
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    setRows(data);
    setLoading(false);
  }, [anio, trimestre]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch whenever the period filter changes
    load();
  }, [load]);

  const porDocente = useMemo(() => agruparPorDocente(rows), [rows]);
  const docentesUnicos = porDocente.length;

  const handlePrint = (row: EvaluacionRow) => {
    setPrintRow(row);
    requestAnimationFrame(() => window.print());
  };

  return (
    <div className="grid gap-5">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
          <BarChart3 className="h-4 w-4" />
          Consultas
        </div>
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Resumen general</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Analisis de las evaluaciones ya guardadas. Filtra por trimestre o revisa el ano completo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((periodo) => (
          <button
            key={periodo.label}
            className={`border px-3 py-1.5 text-xs font-semibold transition ${
              trimestre === periodo.value
                ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            onClick={() => setTrimestre(periodo.value)}
            type="button"
          >
            {periodo.label}
          </button>
        ))}
        <input
          className="field w-28"
          onChange={(event) => setAnio(Number(event.target.value))}
          type="number"
          value={anio}
        />
      </div>

      {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-300">Cargando evaluaciones...</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Promedio general" value={`${promedioGeneral(rows)}%`} detail="Observacion de clase" />
            <SummaryCard title="Promedio entrevistas" value={`${promedioEntrevistas(rows)}%`} detail="Percepcion estudiantil" />
            <SummaryCard title="Evaluaciones registradas" value={`${rows.length}`} detail="En este periodo" />
            <SummaryCard title="Docentes evaluados" value={`${docentesUnicos}`} detail="En este periodo" />
          </div>

          <div className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-sky-300" />
              Comparativo por docente
            </div>
            {porDocente.length ? (
              <div className="grid gap-3">
                {porDocente.map((item) => (
                  <div key={item.docenteId ?? item.nombre}>
                    <div className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>
                        {item.nombre} <span className="text-slate-500">({item.count})</span>
                      </span>
                      <span>{item.promedio}%</span>
                    </div>
                    <div className="h-2 bg-slate-800">
                      <div className="h-full bg-sky-300" style={{ width: `${item.promedio}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">No hay evaluaciones guardadas para este periodo.</p>
            )}
          </div>

          <div className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 text-sm font-semibold">Evaluaciones registradas</div>
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-slate-400">
                      <th className="pb-2 pr-3">Docente</th>
                      <th className="pb-2 pr-3">Curso</th>
                      <th className="pb-2 pr-3">Trimestre</th>
                      <th className="pb-2 pr-3">Fecha</th>
                      <th className="pb-2 pr-3">%</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-white/8">
                        <td className="py-2 pr-3">{row.docente_nombre}</td>
                        <td className="py-2 pr-3">{row.curso_nombre}</td>
                        <td className="py-2 pr-3">T{row.trimestre}</td>
                        <td className="py-2 pr-3">{row.fecha_observacion}</td>
                        <td className="py-2 pr-3">{row.porcentaje}%</td>
                        <td className="py-2">
                          <button
                            className="inline-flex items-center gap-1 border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-slate-100 transition hover:border-white/30"
                            onClick={() => handlePrint(row)}
                            type="button"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Imprimir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-300">No hay evaluaciones guardadas para este periodo.</p>
            )}
          </div>
        </>
      ) : null}

      <PrintPortal>
        <ReportePrintable data={printRow ? rowToReporteData(printRow) : null} />
      </PrintPortal>
    </div>
  );
}

function SummaryCard({ detail, title, value }: { detail: string; title: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="text-xs font-semibold uppercase text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-300">{detail}</div>
    </div>
  );
}
