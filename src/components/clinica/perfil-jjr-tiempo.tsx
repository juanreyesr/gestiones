"use client";

import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PerfilJjrEnElTiempo } from "@/lib/evaluaciones/jjr/evolucion";
import { JJR_ESCALA } from "@/lib/evaluaciones/jjr/codigo";

// Secuencial de un solo tono: la aplicación más antigua más tenue, la última más intensa.
const TONOS = ["#0f766e", "#14b8a6", "#99f6e4"];
const tonoDe = (i: number, n: number) => TONOS[TONOS.length - n + i];
const num = (m: number) => m.toFixed(2).replace(".", ",");

/**
 * Intereses JJR por campo en el tiempo: barras 0–4 de las últimas aplicaciones
 * del mismo protocolo, en orden fijo de campos. Descriptivo: no hay error de
 * medida estimado, así que no se marca mejora ni empeoramiento.
 */
export function PerfilJjrTiempo({ perfil }: { perfil: PerfilJjrEnElTiempo }) {
  const n = perfil.aplicaciones.length;
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/40 p-3" data-testid="perfil-jjr">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">
            Intereses JJR por campo <span className="font-normal text-slate-400">· {perfil.titulo}</span>
          </div>
          <div className="text-xs text-slate-400">
            Media 0–4 de las 6 actividades base · {n === perfil.total ? `${n} aplicación${n === 1 ? "" : "es"}` : `últimas ${n} de ${perfil.total}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300" aria-label="Leyenda">
          {perfil.aplicaciones.map((a, i) => (
            <span className="inline-flex items-center gap-1.5" key={a.respuestaId}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: tonoDe(i, n) }} />
              {formatoFechaCorta(a.fecha)}
              {a.perfilCompleto ? "" : " (incompleto)"}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2" role="list">
        <div aria-hidden className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] gap-2 text-[10px] text-slate-500 sm:grid-cols-[minmax(0,15rem)_1fr_2.5rem]">
          <span />
          <span className="flex justify-between">
            {[0, 1, 2, 3, 4].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </span>
          <span />
        </div>
        {perfil.campos.map((c) => {
          const ult = c.puntos[c.puntos.length - 1];
          return (
            <div
              aria-label={`${c.nombre}: ${c.puntos.map((p, i) => `${formatoFechaCorta(perfil.aplicaciones[i].fecha)} ${p.media === null ? "sin media" : num(p.media)}`).join(", ")}`}
              className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2 sm:grid-cols-[minmax(0,15rem)_1fr_2.5rem]"
              key={c.campo}
              role="listitem"
            >
              <span className="truncate text-xs text-slate-300" title={c.nombre}>
                <strong className="text-slate-100">{c.campo}</strong> {c.nombre}
              </span>
              <span className="relative grid gap-[2px] py-0.5">
                {/* Guías en 1, 2 y 3 */}
                {[25, 50, 75].map((x) => (
                  <span aria-hidden className="absolute inset-y-0 w-px bg-white/5" key={x} style={{ left: `${x}%` }} />
                ))}
                {c.puntos.map((p, i) => (
                  <span
                    className="relative h-2 rounded-r-full"
                    key={i}
                    style={{ width: p.media === null ? 0 : `${Math.max(1.5, p.media * 25)}%`, background: tonoDe(i, n), opacity: p.estado === "parcial" ? 0.6 : 1 }}
                    title={`${formatoFechaCorta(perfil.aplicaciones[i].fecha)} · ${
                      p.media === null ? "sin media (pocas respuestas)" : `media ${num(p.media)}${p.estado === "parcial" ? " (parcial, 5 de 6)" : ""} · cerca de «${JJR_ESCALA[Math.round(p.media)]}»`
                    }`}
                  />
                ))}
              </span>
              <span className="text-right text-xs font-semibold text-slate-200">{ult.media === null ? "—" : num(ult.media)}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] leading-5 text-slate-500">
        Mismo protocolo, versión y forma (sin estudio de enlace no se comparan JJR-84 y JJR-INV-176 ni las formas A y B). La cifra de la
        derecha es la última aplicación; las barras más tenues, las anteriores; atenuada = parcial; sin barra = sin media. Diferencias
        pequeñas no son cambios firmes: no hay error de medida estimado, y más interés no es «mejor».
      </p>
    </div>
  );
}
