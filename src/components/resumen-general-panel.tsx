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
 * vista privada (`consultas-view`, con acciones de ver/borrar) y el enlace
 * publico de solo lectura (`/resumen/[token]`, sin ninguna accion). Asi lo que
 * ven los jefes es exactamente lo mismo que ve la coordinacion, sin copias que
 * se desincronicen.
 */
export function ResumenGeneralPanel({
  acciones,
  historicoRows,
  rows,
}: {
  /* Cuando no se pasa, la tabla queda de solo lectura (sin columna de botones). */
  acciones?: (row: EvaluacionRow) => ReactNode;
  /* Todo el historial: alimenta la grafica de tendencia, sin importar el filtro. */
  historicoRows: EvaluacionRow[];
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

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Promedio general" value={`${promedioGeneral(rows)}%`} detail="Observacion de clase" />
        <SummaryCard title="Promedio entrevistas" value={`${promedioEntrevistas(rows)}%`} detail="Percepcion estudiantil" />
        <SummaryCard title="Evaluaciones registradas" value={`${rows.length}`} detail="En este periodo" />
        <SummaryCard title="Docentes evaluados" value={`${docentesUnicos}`} detail="En este periodo" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 text-emerald-300" />
            Areas mas sobresalientes (general)
          </div>
          {rows.length ? (
            <div className="grid gap-2">
              {sobresalientes.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm text-slate-200"
                >
                  <span className="min-w-0">{item.label}</span>
                  <span className="shrink-0 font-semibold text-emerald-200">{item.percent}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin datos para este periodo.</p>
          )}
        </div>

        <div className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 text-amber-300" />
            Areas de oportunidad (general)
          </div>
          <p className="mb-2 text-xs text-slate-400">Porcentaje que aun falta por mejorar en cada area.</p>
          {categoriasOportunidad.length ? (
            <div className="grid gap-2">
              {categoriasOportunidad.map((item) => (
                <div key={item.categoria} className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span className="min-w-0">{item.categoria}</span>
                  <span className="shrink-0 font-semibold text-amber-200">{100 - item.percent}%</span>
                </div>
              ))}
            </div>
          ) : rows.length ? (
            <p className="text-sm text-emerald-200">Todas las areas evaluadas estan al 100% en este periodo.</p>
          ) : (
            <p className="text-sm text-slate-400">Sin datos para este periodo.</p>
          )}
        </div>

        <div className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-emerald-300" />
            Mas valorado segun estudiantes
          </div>
          {preguntasDestacadas.length ? (
            <div className="grid gap-2">
              {preguntasDestacadas.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span className="min-w-0">{item.texto}</span>
                  <span className="shrink-0 font-semibold text-emerald-200">{item.promedio}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin entrevistas registradas en este periodo.</p>
          )}
        </div>

        <div className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-amber-300" />
            A reforzar segun estudiantes
          </div>
          <p className="mb-2 text-xs text-slate-400">Porcentaje que aun falta por mejorar segun los estudiantes.</p>
          {preguntasOportunidad.length ? (
            <div className="grid gap-2">
              {preguntasOportunidad.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span className="min-w-0">{item.texto}</span>
                  <span className="shrink-0 font-semibold text-amber-200">{100 - (item.promedio ?? 0)}%</span>
                </div>
              ))}
            </div>
          ) : preguntasAgg.length ? (
            <p className="text-sm text-emerald-200">Los estudiantes calificaron todo con el maximo puntaje en este periodo.</p>
          ) : (
            <p className="text-sm text-slate-400">Sin entrevistas registradas en este periodo.</p>
          )}
        </div>
      </div>

      <div className="border border-white/10 bg-white/6 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-sky-300" />
          Comparativo por curso
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Solo se muestra el curso y la nota, sin el nombre del docente, para poder compartir esta vista con el equipo.
        </p>
        {porCurso.length ? (
          <div className="grid gap-3">
            {porCurso.map((item) => (
              <div key={item.cursoId ?? item.nombre}>
                <div className="mb-1 flex justify-between gap-3 text-xs text-slate-300">
                  <span className="min-w-0">
                    {item.nombre} <span className="text-slate-500">({item.count})</span>
                  </span>
                  <span className="shrink-0">{item.promedio}%</span>
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
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-sky-300" />
          Tendencia por area (todo el historial)
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Avance de cada area evaluada a traves de los periodos, para ver si viene mejorando o empeorando.
        </p>
        <TendenciaCategoriasChart series={tendenciaCategorias} />
      </div>

      <div className="border border-white/10 bg-white/6 p-4">
        <div className="mb-3 text-sm font-semibold">Evaluaciones registradas</div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400">
                  <th className="pb-2 pr-3">Curso</th>
                  <th className="pb-2 pr-3">Periodo</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 pr-3">%</th>
                  {acciones ? <th className="pb-2" /> : null}
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
                    {acciones ? <td className="py-2">{acciones(row)}</td> : null}
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
