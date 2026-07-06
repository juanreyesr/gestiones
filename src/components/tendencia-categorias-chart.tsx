"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { CATEGORIA_COLORES } from "@/data/evaluacion";
import type { TendenciaCategoria } from "@/lib/evaluacion-helpers";

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 30;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";

export function TendenciaCategoriasChart({ series }: { series: TendenciaCategoria[] }) {
  if (!series.length) {
    return <p className="text-sm text-slate-400">Aun no hay suficiente historial para mostrar una tendencia.</p>;
  }

  const periodos = series[0].puntos.map((punto) => punto.periodo);
  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (index: number) =>
    PAD_LEFT + (periodos.length > 1 ? (index / (periodos.length - 1)) * innerWidth : innerWidth / 2);
  const yFor = (percent: number) => PAD_TOP + innerHeight - (Math.max(0, Math.min(100, percent)) / 100) * innerHeight;

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <svg
          className="min-w-[520px]"
          height={HEIGHT}
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-label="Tendencia de cada area evaluada a traves de los periodos"
        >
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                stroke="#2c2c2a"
                strokeWidth={1}
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(tick)}
                y2={yFor(tick)}
              />
              <text fill="#898781" fontSize={9} textAnchor="end" x={PAD_LEFT - 6} y={yFor(tick) + 3}>
                {tick}
              </text>
            </g>
          ))}

          {periodos.map((periodo, index) => (
            <text
              key={periodo}
              fill="#898781"
              fontSize={9}
              textAnchor="middle"
              x={xFor(index)}
              y={HEIGHT - PAD_BOTTOM + 14}
            >
              {periodo}
            </text>
          ))}

          {series.map((serie) => {
            const color = CATEGORIA_COLORES[serie.categoria] ?? "#94a3b8";
            const path = serie.puntos.map((punto, index) => `${index === 0 ? "M" : "L"}${xFor(index)},${yFor(punto.percent)}`).join(" ");
            return (
              <g key={serie.categoria}>
                <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                {serie.puntos.map((punto, index) => (
                  <circle key={index} cx={xFor(index)} cy={yFor(punto.percent)} fill={color} r={3}>
                    <title>
                      {serie.categoria} · {punto.periodo}: {punto.percent}%
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((serie) => {
          const color = CATEGORIA_COLORES[serie.categoria] ?? "#94a3b8";
          const primero = serie.puntos[0].percent;
          const ultimo = serie.puntos[serie.puntos.length - 1].percent;
          const delta = ultimo - primero;
          const mejorando = delta > 0;
          const empeorando = delta < 0;
          return (
            <div key={serie.categoria} className="flex items-center gap-2 text-xs text-slate-300">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="min-w-0 flex-1 truncate">{serie.categoria}</span>
              <span className="shrink-0 font-semibold text-slate-100">{ultimo}%</span>
              {mejorando ? (
                <span className="flex shrink-0 items-center gap-0.5 font-semibold" style={{ color: GOOD }}>
                  <TrendingUp className="h-3.5 w-3.5" />+{delta}
                </span>
              ) : empeorando ? (
                <span className="flex shrink-0 items-center gap-0.5 font-semibold" style={{ color: CRITICAL }}>
                  <TrendingDown className="h-3.5 w-3.5" />
                  {delta}
                </span>
              ) : (
                <span className="shrink-0 text-slate-500">=</span>
              )}
            </div>
          );
        })}
      </div>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer select-none font-semibold text-slate-300">Ver tabla de datos</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-1 pr-3">Area</th>
                {periodos.map((periodo) => (
                  <th key={periodo} className="pb-1 pr-3">
                    {periodo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((serie) => (
                <tr key={serie.categoria} className="border-t border-white/8">
                  <td className="py-1 pr-3 text-slate-200">{serie.categoria}</td>
                  {serie.puntos.map((punto, index) => (
                    <td key={index} className="py-1 pr-3 text-slate-300">
                      {punto.percent}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
