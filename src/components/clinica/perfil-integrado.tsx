"use client";

import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Layers } from "lucide-react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { MedidaArea, Nivel, PerfilIntegrado } from "@/lib/evaluaciones/perfil-integrado";

const COLOR: Record<Nivel, string> = {
  bajo: "border-emerald-400/40 text-emerald-200",
  medio: "border-amber-400/40 text-amber-200",
  alto: "border-red-400/50 text-red-200",
};
const TEND = {
  mejora: { Icono: ArrowDownRight, clase: "text-emerald-300", texto: "mejora" },
  igual: { Icono: ArrowRight, clase: "text-slate-400", texto: "igual" },
  empeora: { Icono: ArrowUpRight, clase: "text-red-300", texto: "empeora" },
} as const;

function Medida({ m, secundaria = false }: { m: MedidaArea; secundaria?: boolean }) {
  const t = m.tendencia ? TEND[m.tendencia] : null;
  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${secundaria ? "text-[11px] text-slate-400" : "text-xs text-slate-300"}`}>
      <strong className={secundaria ? "text-slate-300" : "text-white"}>{m.sigla}</strong>
      <span>
        {m.valor}/{m.max} · {m.banda}
      </span>
      <span className="text-slate-500">{formatoFechaCorta(m.fecha)}</span>
      {t ? (
        <span className={`inline-flex items-center gap-0.5 ${t.clase}`}>
          <t.Icono className="h-3 w-3" />
          {t.texto}
        </span>
      ) : null}
      {m.deterioroFiable ? <span className="font-semibold text-red-300">deterioro fiable</span> : null}
    </span>
  );
}

/** Perfil integrado: último dato de cada área a partir de todas las evaluaciones (reglas fijas, verificables). */
export function PerfilIntegradoTarjeta({ perfil }: { perfil: PerfilIntegrado }) {
  if (!perfil.areas.length && !perfil.patrones && !perfil.orientacion.length) return null;
  return (
    <div className="grid gap-3 rounded-lg border border-indigo-300/30 bg-indigo-400/5 p-3" data-testid="perfil-integrado">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Layers className="h-4 w-4 text-indigo-300" />
          Perfil integrado
        </div>
        {perfil.desde ? (
          <span className="text-[11px] text-slate-400">
            Datos del {formatoFechaCorta(perfil.desde)}
            {perfil.hasta !== perfil.desde ? ` al ${formatoFechaCorta(perfil.hasta!)}` : ""}
          </span>
        ) : null}
      </div>

      {perfil.sintesis.length ? (
        <ul className="grid gap-0.5 text-sm text-slate-200">
          {perfil.sintesis.map((s) => (
            <li className={s.startsWith("⚠️") ? "font-semibold text-red-200" : ""} key={s}>
              {s}
            </li>
          ))}
        </ul>
      ) : null}

      {perfil.areas.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {perfil.areas.map((a) => (
            <div className={`grid gap-1 rounded-md border bg-slate-950/40 p-2.5 ${COLOR[a.principal.nivel]}`} key={a.id}>
              <span className="text-xs font-semibold uppercase tracking-wide">{a.nombre}</span>
              <Medida m={a.principal} />
              {a.otras.map((m) => (
                <Medida key={m.sigla} m={m} secundaria />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {perfil.patrones?.items.length ? (
        <div className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Patrones cognitivos y recursos (MCEA, {formatoFechaCorta(perfil.patrones.fecha)})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {perfil.patrones.items.map((p) => (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${COLOR[p.nivel]}`} key={p.nombre} title={p.detalle.join(" · ")}>
                {p.nombre.split(" · ").pop()}: {p.etiqueta}
                {p.detalle.length ? ` (${p.detalle.join(", ")})` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {perfil.orientacion.length ? (
        <div className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Intereses y valores</span>
          {perfil.orientacion.map((o) => (
            <span className="text-xs text-slate-300" key={o.titulo}>
              <strong className="text-white">{o.titulo}</strong> — {o.detalle} <span className="text-slate-500">({formatoFechaCorta(o.fecha)})</span>
            </span>
          ))}
        </div>
      ) : null}

      {perfil.riesgo ? (
        <p className="flex items-center gap-1.5 text-xs text-red-200">
          <AlertTriangle className="h-3.5 w-3.5" /> {perfil.riesgo.texto} · {formatoFechaCorta(perfil.riesgo.fecha)}
        </p>
      ) : null}

      <p className="text-[11px] leading-5 text-slate-500">
        Reglas fijas: por área se muestra la medida más reciente (si la misma escala se aplicó en varias evaluaciones, cuenta como una sola) y
        debajo las otras escalas del área. Los niveles son las bandas de cada escala; «deterioro fiable» usa el cambio mínimo fiable. Es un
        resumen para orientar la sesión, no un diagnóstico.
      </p>
    </div>
  );
}
