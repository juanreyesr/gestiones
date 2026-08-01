"use client";

import { GraduationCap, Mail, Pencil, Printer, Star, Trash2, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DocenteRow, Trimestre } from "@/data/evaluacion";
import {
  aggregateCategoryAnalytics,
  aggregateEntrevistaPreguntas,
  aggregateFortalezas,
  aggregateItemAnalytics,
  aggregateTendenciaCategorias,
  categoriasConOportunidad,
  combinarSobresalientes,
  currentTrimestre,
  deleteEvaluacion,
  type EvaluacionRow,
  fetchEvaluacionesPorDocente,
  preguntasConOportunidadReal,
  promedioEntrevistas,
  promedioGeneral,
  rowToReporteData,
} from "@/lib/evaluacion-helpers";
import { exportInformeDocenteToPdf, exportReporteToPdf } from "@/lib/pdf";
import { ConfirmDialog } from "./confirm-dialog";
import { EvaluacionDetalleModal } from "./evaluacion-detalle-modal";
import { TendenciaCategoriasChart } from "./tendencia-categorias-chart";
import { EmptyState, Field } from "./ui-comun";

type PeriodoValor = Trimestre | "todos" | "historico";

const PERIODOS: Array<{ label: string; value: PeriodoValor }> = [
  { label: "Trimestre 1", value: 1 },
  { label: "Trimestre 2", value: 2 },
  { label: "Trimestre 3", value: 3 },
  { label: "Todo el año", value: "todos" },
  { label: "Todo el historial", value: "historico" },
];

/* Las acciones de cada evaluacion aparecen dos veces: en la tabla de escritorio
   y en las tarjetas de movil. Los estilos viven aqui para que ambas se vean
   igual y solo cambie el tamano del area tactil. */
const ACCION = "inline-flex items-center justify-center gap-1 border px-2 py-1 text-xs font-semibold transition";
const ACCION_VER = `${ACCION} border-white/10 bg-white/8 text-slate-100 hover:border-white/30`;
const ACCION_EDITAR = `${ACCION} border-sky-400/30 bg-sky-400/10 text-sky-200 hover:border-sky-400/60`;
const ACCION_CORREO = `${ACCION} border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-400/60`;
const ACCION_BORRAR = `${ACCION} border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-400/60`;

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

export function InformeDocenteView({
  docentes,
  onEditar,
  onGenerarCorreo,
}: {
  docentes: DocenteRow[];
  onEditar: (row: EvaluacionRow) => void;
  onGenerarCorreo: (row: EvaluacionRow) => void;
}) {
  const [docenteId, setDocenteId] = useState<string>("");
  const [allRows, setAllRows] = useState<EvaluacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState<EvaluacionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvaluacionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingResumen, setExportingResumen] = useState(false);
  const [exportingFila, setExportingFila] = useState(false);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodo, setPeriodo] = useState<PeriodoValor>(currentTrimestre());

  const docente = docentes.find((item) => item.id === docenteId);
  const esHistorico = periodo === "historico";

  const load = useCallback(async (id: string) => {
    if (!id) {
      setAllRows([]);
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
    setAllRows(data);
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

  const rows = useMemo(() => {
    if (esHistorico) return allRows;
    return allRows.filter((row) => row.anio === anio && (periodo === "todos" || row.trimestre === periodo));
  }, [allRows, anio, periodo, esHistorico]);

  const porAnio = useMemo(() => agruparPorAnio(rows), [rows]);

  const categoriaAgg = useMemo(() => aggregateCategoryAnalytics(rows), [rows]);
  const fortalezaAgg = useMemo(() => aggregateFortalezas(rows), [rows]);
  const sobresalientes = useMemo(
    () => combinarSobresalientes(categoriaAgg, fortalezaAgg),
    [categoriaAgg, fortalezaAgg],
  );
  const categoriasOportunidad = useMemo(() => categoriasConOportunidad(categoriaAgg), [categoriaAgg]);

  const preguntasAgg = useMemo(() => aggregateEntrevistaPreguntas(rows), [rows]);
  const preguntasDestacadas = useMemo(
    () => [...preguntasAgg].sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0)).slice(0, 2),
    [preguntasAgg],
  );
  const preguntasOportunidad = useMemo(() => preguntasConOportunidadReal(preguntasAgg), [preguntasAgg]);

  const tendenciaCategorias = useMemo(() => aggregateTendenciaCategorias(allRows), [allRows]);
  const itemAnalytics = useMemo(() => aggregateItemAnalytics(rows), [rows]);

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
        sobresalientes,
        categoriasOportunidad,
        preguntasDestacadas,
        preguntasOportunidad,
        itemAnalytics,
        tendenciaCategorias,
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
    setAllRows((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <GraduationCap className="h-4 w-4 shrink-0" />
            Informe por docente
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Historial completo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Todas las evaluaciones guardadas de un docente a lo largo de su recorrido en la universidad.
          </p>
        </div>
        <button
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30 disabled:opacity-40 lg:w-fit"
          disabled={!rows.length || exportingResumen}
          onClick={handlePrintResumen}
          type="button"
        >
          <Printer className="h-4 w-4 shrink-0" />
          {exportingResumen ? "Generando PDF..." : "Descargar informe en PDF"}
        </button>
      </div>

      {/* Filtros agrupados: en movil ocupan el ancho completo y se apilan, para
          que ningun control quede fuera de la pantalla. */}
      <div className="grid gap-4 border border-white/10 bg-white/6 p-4">
        {docentes.length ? (
          <Field label="Docente">
            <select className="field sm:max-w-md" onChange={(event) => setDocenteId(event.target.value)} value={docenteId}>
              {docentes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-sm text-slate-400">Aún no hay docentes registrados.</p>
        )}

        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
          <div className="grid min-w-0 gap-1.5">
            <span className="text-xs font-semibold uppercase text-slate-400">Periodo</span>
            <div className="flex flex-wrap gap-2">
              {PERIODOS.map((item) => (
                <button
                  key={item.label}
                  aria-pressed={periodo === item.value}
                  className={`inline-flex h-9 items-center border px-3 text-xs font-semibold transition ${
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
            </div>
          </div>

          <Field label="Año">
            <input
              className="field w-28 disabled:opacity-40"
              disabled={esHistorico}
              onChange={(event) => setAnio(Number(event.target.value))}
              title={esHistorico ? "Todo el historial no depende de un año" : undefined}
              type="number"
              value={anio}
            />
          </Field>
        </div>
      </div>

      {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-300">Cargando historial...</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard title="Evaluaciones registradas" value={`${rows.length}`} />
            <SummaryCard title="Promedio del periodo" value={`${promedioGeneral(rows)}%`} />
            <SummaryCard title="Entrevistas promedio" value={`${promedioEntrevistas(rows)}%`} />
          </div>

          {rows.length ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Panel icon={Star} iconClass="text-emerald-300" title="Áreas más sobresalientes">
                  <div className="grid gap-3">
                    {sobresalientes.map((item, index) => (
                      <MetricaFila key={`${item.label}-${index}`} label={item.label} percent={item.percent} tono="emerald" />
                    ))}
                  </div>
                </Panel>

                <Panel
                  icon={Star}
                  iconClass="text-amber-300"
                  subtitle="Porcentaje que aún falta por mejorar en cada área."
                  title="Áreas de oportunidad"
                >
                  {categoriasOportunidad.length ? (
                    <div className="grid gap-3">
                      {categoriasOportunidad.map((item) => (
                        <MetricaFila key={item.categoria} label={item.categoria} percent={100 - item.percent} tono="amber" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-200">Todas las áreas evaluadas están al 100% en este periodo.</p>
                  )}
                </Panel>

                <Panel icon={Users} iconClass="text-emerald-300" title="Más valorado según estudiantes">
                  {preguntasDestacadas.length ? (
                    <div className="grid gap-3">
                      {preguntasDestacadas.map((item) => (
                        <MetricaFila key={item.id} label={item.texto} percent={item.promedio ?? 0} tono="emerald" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin entrevistas registradas en este periodo.</p>
                  )}
                </Panel>

                <Panel
                  icon={Users}
                  iconClass="text-amber-300"
                  subtitle="Porcentaje que aún falta por mejorar según los estudiantes."
                  title="A reforzar según estudiantes"
                >
                  {preguntasOportunidad.length ? (
                    <div className="grid gap-3">
                      {preguntasOportunidad.map((item) => (
                        <MetricaFila key={item.id} label={item.texto} percent={100 - (item.promedio ?? 0)} tono="amber" />
                      ))}
                    </div>
                  ) : preguntasAgg.length ? (
                    <p className="text-sm text-emerald-200">
                      Los estudiantes calificaron todo con el máximo puntaje en este periodo.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">Sin entrevistas registradas en este periodo.</p>
                  )}
                </Panel>
              </div>

              <Panel title="Rendimiento por año">
                <div className="grid gap-3">
                  {porAnio.map((item) => (
                    <div key={item.anio} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-xs text-slate-300">
                        <span className="min-w-0">
                          {item.anio} <span className="text-slate-500">({item.count} evaluaciones)</span>
                        </span>
                        <span className="shrink-0 tabular-nums">{item.promedio}%</span>
                      </div>
                      <Barra percent={item.promedio} tono="emerald" />
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          ) : (
            <EmptyState>
              No hay evaluaciones guardadas en este periodo. Cambia el periodo o el año para ver otros registros.
            </EmptyState>
          )}

          <Panel
            icon={TrendingUp}
            iconClass="text-sky-300"
            subtitle="Avance de cada área evaluada a través de los periodos, para ver si viene mejorando o empeorando."
            title="Tendencia por área (todo el historial de este docente)"
          >
            <TendenciaCategoriasChart series={tendenciaCategorias} />
          </Panel>

          {rows.length ? (
            <Panel title="Detalle de evaluaciones">
              {/* En movil una tabla obliga a desplazarse en horizontal y los
                  botones quedan fuera de la pantalla, asi que cada evaluacion
                  se muestra como tarjeta con sus acciones a la vista. */}
              <div className="grid gap-2 md:hidden">
                {rows.map((row) => (
                  <div key={row.id} className="border border-white/10 bg-white/4 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">{row.curso_nombre}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          T{row.trimestre} {row.anio} · {row.fecha_observacion}
                        </p>
                      </div>
                      <span className="shrink-0 border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-sm font-bold tabular-nums text-emerald-200">
                        {row.porcentaje}%
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className={`${ACCION_VER} h-9`} onClick={() => setViewRow(row)} type="button">
                        Ver
                      </button>
                      <button className={`${ACCION_EDITAR} h-9`} onClick={() => onEditar(row)} type="button">
                        <Pencil className="h-3.5 w-3.5 shrink-0" />
                        Editar
                      </button>
                      <button className={`${ACCION_CORREO} h-9`} onClick={() => onGenerarCorreo(row)} type="button">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        Correo
                      </button>
                      <button className={`${ACCION_BORRAR} h-9`} onClick={() => setDeleteTarget(row)} type="button">
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
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
                        <td className="whitespace-nowrap py-2 pr-3">
                          T{row.trimestre} {row.anio}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3">{row.fecha_observacion}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.porcentaje}%</td>
                        <td className="py-2">
                          <div className="flex justify-end gap-2">
                            <button className={ACCION_VER} onClick={() => setViewRow(row)} type="button">
                              Ver
                            </button>
                            <button
                              className={ACCION_EDITAR}
                              onClick={() => onEditar(row)}
                              title="Editar evaluacion"
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              className={ACCION_CORREO}
                              onClick={() => onGenerarCorreo(row)}
                              title="Generar correo para el docente"
                              type="button"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Correo
                            </button>
                            <button
                              className={ACCION_BORRAR}
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
            </Panel>
          ) : null}
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

/** Tarjeta contenedora de cada bloque del informe, con su titulo y ayuda. */
function Panel({
  children,
  icon: Icon,
  iconClass = "",
  subtitle,
  title,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="border border-white/10 bg-white/6 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        {Icon ? <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} /> : null}
        <span className="min-w-0">{title}</span>
      </div>
      {subtitle ? <p className="mt-1.5 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/8 p-4 backdrop-blur-xl sm:block">
      <div className="min-w-0 text-xs font-semibold uppercase text-slate-400">{title}</div>
      <div className="shrink-0 text-2xl font-semibold tabular-nums text-white sm:mt-2 sm:text-3xl">{value}</div>
    </div>
  );
}

/** Etiqueta + porcentaje + barra: el mismo dato se lee de un vistazo. */
function MetricaFila({ label, percent, tono }: { label: string; percent: number; tono: "amber" | "emerald" }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm text-slate-200">
        <span className="min-w-0">{label}</span>
        <span className={`shrink-0 font-semibold tabular-nums ${tono === "emerald" ? "text-emerald-200" : "text-amber-200"}`}>
          {percent}%
        </span>
      </div>
      <Barra percent={percent} tono={tono} />
    </div>
  );
}

function Barra({ percent, tono }: { percent: number; tono: "amber" | "emerald" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
      <div
        className={`h-full rounded-full ${tono === "emerald" ? "bg-emerald-300" : "bg-amber-300"}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}
