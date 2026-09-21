"use client";

import { Star, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  aggregateCategoryAnalytics,
  aggregateEntrevistaPreguntas,
  aggregateFortalezas,
  aggregateTendenciaCategorias,
  agruparPorCurso,
  agruparPorDocente,
  categoriasConOportunidad,
  combinarSobresalientes,
  type EvaluacionRow,
  preguntasConOportunidadReal,
  promedioEntrevistas,
  promedioGeneral,
} from "@/lib/evaluacion-helpers";
import { TendenciaCategoriasChart } from "./tendencia-categorias-chart";

/**
 * Los bloques del "Resumen general" (tarjetas, areas, comparativo por curso,
 * tendencia y tabla de registros). Vive aparte porque lo usan dos pantallas: la
 * vista privada (`consultas-view`, con acciones de ver/borrar, tema oscuro) y
 * el enlace publico de solo lectura (`/resumen/[token]`, sin ninguna accion,
 * tema claro via `light`). Asi lo que ven los jefes es exactamente lo mismo
 * que ve la coordinacion, sin copias que se desincronicen.
 */
export function ResumenGeneralPanel({
  acciones,
  historicoRows,
  light = false,
  rows,
}: {
  /* Cuando no se pasa, la tabla queda de solo lectura (sin columna de botones). */
  acciones?: (row: EvaluacionRow) => ReactNode;
  /* Todo el historial: alimenta la grafica de tendencia, sin importar el filtro. */
  historicoRows: EvaluacionRow[];
  /* Tema claro para el enlace publico; por defecto conserva el tema oscuro del admin. */
  light?: boolean;
  /* Las evaluaciones del periodo filtrado. */
  rows: EvaluacionRow[];
}) {
  const docentesUnicos = useMemo(() => agruparPorDocente(rows).length, [rows]);
  const porCurso = useMemo(() => agruparPorCurso(rows), [rows]);

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

  const tendenciaCategorias = useMemo(() => aggregateTendenciaCategorias(historicoRows), [historicoRows]);

  const cardClass = light ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm" : "border border-white/10 bg-white/6 p-4";
  const rowTextClass = light ? "text-slate-600" : "text-slate-200";
  const mutedClass = light ? "text-slate-400" : "text-slate-400";
  const emptyClass = light ? "text-slate-400" : "text-slate-300";
  const rowBorderClass = light ? "border-slate-100" : "border-white/8";
  const headTextClass = light ? "text-slate-400" : "text-slate-400";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard detail="Observacion de clase" light={light} title="Promedio general" value={`${promedioGeneral(rows)}%`} />
        <SummaryCard detail="Percepcion estudiantil" light={light} title="Promedio entrevistas" value={`${promedioEntrevistas(rows)}%`} />
        <SummaryCard detail="En este periodo" light={light} title="Evaluaciones registradas" value={`${rows.length}`} />
        <SummaryCard detail="En este periodo" light={light} title="Docentes evaluados" value={`${docentesUnicos}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>
            <Star className={`h-4 w-4 ${light ? "text-emerald-600" : "text-emerald-300"}`} />
            Areas mas sobresalientes (general)
          </div>
          {rows.length ? (
            <div className="grid gap-2">
              {sobresalientes.map((item, index) => (
                <div key={`${item.label}-${index}`} className={`flex items-center justify-between gap-3 text-sm ${rowTextClass}`}>
                  <span className="min-w-0">{item.label}</span>
                  <span className={`shrink-0 font-semibold ${light ? "text-emerald-600" : "text-emerald-200"}`}>{item.percent}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${mutedClass}`}>Sin datos para este periodo.</p>
          )}
        </div>

        <div className={cardClass}>
          <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>
            <Star className={`h-4 w-4 ${light ? "text-amber-500" : "text-amber-300"}`} />
            Areas de oportunidad (general)
          </div>
          <p className={`mb-2 text-xs ${mutedClass}`}>Porcentaje que aun falta por mejorar en cada area.</p>
          {categoriasOportunidad.length ? (
            <div className="grid gap-2">
              {categoriasOportunidad.map((item) => (
                <div key={item.categoria} className={`flex items-center justify-between gap-3 text-sm ${rowTextClass}`}>
                  <span className="min-w-0">{item.categoria}</span>
                  <span className={`shrink-0 font-semibold ${light ? "text-amber-600" : "text-amber-200"}`}>{100 - item.percent}%</span>
                </div>
              ))}
            </div>
          ) : rows.length ? (
            <p className={`text-sm ${light ? "text-emerald-600" : "text-emerald-200"}`}>Todas las areas evaluadas estan al 100% en este periodo.</p>
          ) : (
            <p className={`text-sm ${mutedClass}`}>Sin datos para este periodo.</p>
          )}
        </div>

        <div className={cardClass}>
          <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>
            <Users className={`h-4 w-4 ${light ? "text-emerald-600" : "text-emerald-300"}`} />
            Mas valorado segun estudiantes
          </div>
          {preguntasDestacadas.length ? (
            <div className="grid gap-2">
              {preguntasDestacadas.map((item) => (
                <div key={item.id} className={`flex items-center justify-between gap-3 text-sm ${rowTextClass}`}>
                  <span className="min-w-0">{item.texto}</span>
                  <span className={`shrink-0 font-semibold ${light ? "text-emerald-600" : "text-emerald-200"}`}>{item.promedio}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${mutedClass}`}>Sin entrevistas registradas en este periodo.</p>
          )}
        </div>

        <div className={cardClass}>
          <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>
            <Users className={`h-4 w-4 ${light ? "text-amber-500" : "text-amber-300"}`} />
            A reforzar segun estudiantes
          </div>
          <p className={`mb-2 text-xs ${mutedClass}`}>Porcentaje que aun falta por mejorar segun los estudiantes.</p>
          {preguntasOportunidad.length ? (
            <div className="grid gap-2">
              {preguntasOportunidad.map((item) => (
                <div key={item.id} className={`flex items-center justify-between gap-3 text-sm ${rowTextClass}`}>
                  <span className="min-w-0">{item.texto}</span>
                  <span className={`shrink-0 font-semibold ${light ? "text-amber-600" : "text-amber-200"}`}>{100 - (item.promedio ?? 0)}%</span>
                </div>
              ))}
            </div>
          ) : preguntasAgg.length ? (
            <p className={`text-sm ${light ? "text-emerald-600" : "text-emerald-200"}`}>Los estudiantes calificaron todo con el maximo puntaje en este periodo.</p>
          ) : (
            <p className={`text-sm ${mutedClass}`}>Sin entrevistas registradas en este periodo.</p>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>
          <Users className={`h-4 w-4 ${light ? "text-sky-500" : "text-sky-300"}`} />
          Comparativo por curso
        </div>
        <p className={`mb-3 text-xs ${mutedClass}`}>
          Solo se muestra el curso y la nota, sin el nombre del docente, para poder compartir esta vista con el equipo.
        </p>
        {porCurso.length ? (
          <div className="grid gap-3">
            {porCurso.map((item) => (
              <div key={item.cursoId ?? item.nombre}>
                <div className={`mb-1 flex justify-between gap-3 text-xs ${light ? "text-slate-500" : "text-slate-300"}`}>
                  <span className="min-w-0">
                    {item.nombre} <span className={light ? "text-slate-400" : "text-slate-500"}>({item.count})</span>
                  </span>
                  <span className="shrink-0">{item.promedio}%</span>
                </div>
                <div className={`h-2 ${light ? "bg-slate-100" : "bg-slate-800"}`}>
                  <div className={`h-full ${light ? "bg-sky-500" : "bg-sky-300"}`} style={{ width: `${item.promedio}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${emptyClass}`}>No hay evaluaciones guardadas para este periodo.</p>
        )}
      </div>

      <div className={cardClass}>
        <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>
          <TrendingUp className={`h-4 w-4 ${light ? "text-sky-500" : "text-sky-300"}`} />
          Tendencia por area (todo el historial)
        </div>
        <p className={`mb-3 text-xs ${mutedClass}`}>
          Avance de cada area evaluada a traves de los periodos, para ver si viene mejorando o empeorando.
        </p>
        <TendenciaCategoriasChart light={light} series={tendenciaCategorias} />
      </div>

      <div className={cardClass}>
        <div className={`mb-3 text-sm font-semibold ${light ? "text-slate-900" : ""}`}>Evaluaciones registradas</div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`text-xs uppercase ${headTextClass}`}>
                  <th className="pb-2 pr-3">Curso</th>
                  <th className="pb-2 pr-3">Periodo</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 pr-3">%</th>
                  {acciones ? <th className="pb-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={`border-t ${rowBorderClass}`}>
                    <td className={`py-2 pr-3 ${rowTextClass}`}>{row.curso_nombre}</td>
                    <td className={`py-2 pr-3 ${rowTextClass}`}>
                      T{row.trimestre} {row.anio}
                    </td>
                    <td className={`py-2 pr-3 ${rowTextClass}`}>{row.fecha_observacion}</td>
                    <td className={`py-2 pr-3 ${rowTextClass}`}>{row.porcentaje}%</td>
                    {acciones ? <td className="py-2">{acciones(row)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={`text-sm ${emptyClass}`}>No hay evaluaciones guardadas para este periodo.</p>
        )}
      </div>
    </>
  );
}

function SummaryCard({ detail, light, title, value }: { detail: string; light: boolean; title: string; value: string }) {
  return (
    <div className={light ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm" : "border border-white/10 bg-white/8 p-4 backdrop-blur-xl"}>
      <div className={`text-xs font-semibold uppercase ${light ? "text-slate-400" : "text-slate-400"}`}>{title}</div>
      <div className={`mt-2 text-3xl font-semibold ${light ? "text-slate-900" : "text-white"}`}>{value}</div>
      <div className={`mt-1 text-sm ${light ? "text-slate-500" : "text-slate-300"}`}>{detail}</div>
    </div>
  );
}
