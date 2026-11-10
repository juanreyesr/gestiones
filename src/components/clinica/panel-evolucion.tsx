"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PacienteRow, SesionRow } from "@/lib/clinica/types";
import type { Tendencia } from "@/lib/evaluaciones/eapi/calificacion";
import { fetchEvaluacionesDePaciente, type EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import {
  diasDesde,
  evolucionDelPaciente,
  resumenEvolucion,
  type SerieEvolucion,
} from "@/lib/evaluaciones/evolucion-paciente";
import { SectionCard } from "./ui";
import { perfilesJjr } from "@/lib/evaluaciones/jjr/evolucion";
import { PerfilJjrTiempo } from "./perfil-jjr-tiempo";
import { perfilIntegrado } from "@/lib/evaluaciones/perfil-integrado";
import { PerfilIntegradoTarjeta } from "./perfil-integrado";
import { AREA_SENCILLA, cambiosRecientes } from "@/lib/evaluaciones/evolucion-explicada";
import { CambiosRecientes } from "./cambios-recientes";

const TENDENCIA: Record<Tendencia | "mixto", { texto: string; clase: string; Icono: typeof ArrowRight }> = {
  mejora: { texto: "Mejora", clase: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300", Icono: ArrowDownRight },
  igual: { texto: "Sigue igual", clase: "border-white/15 bg-white/5 text-slate-300", Icono: ArrowRight },
  empeora: { texto: "Empeora", clase: "border-rose-400/40 bg-rose-400/10 text-rose-300", Icono: ArrowUpRight },
  mixto: { texto: "Cambios mixtos", clase: "border-amber-400/40 bg-amber-400/10 text-amber-200", Icono: ArrowRight },
};
const COLOR_BANDA = { low: "#10b981", mid: "#f59e0b", high: "#f43f5e" } as const;
/** Días sugeridos entre aplicaciones del EAPI para el seguimiento. */
const DIAS_SEGUIMIENTO = 28;

const ms = (fecha: string) => {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).getTime();
};
/** Fecha AAAA-MM-DD en hora local (sin desfase de zona horaria). */
const formatoFechaCorta = (fecha: string) =>
  new Date(ms(fecha)).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "2-digit" });
const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Insignia({ t, prefijo }: { t: Tendencia | "mixto"; prefijo?: string }) {
  const { texto, clase, Icono } = TENDENCIA[t];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${clase}`}>
      <Icono className="h-3.5 w-3.5" />
      {prefijo ? `${prefijo}: ` : ""}
      {texto}
    </span>
  );
}

/** Gráfica de una escala: bandas de severidad de fondo, puntos unidos y sesiones como marcas abajo. */
function Grafica({ serie, desde, hasta, sesiones }: { serie: SerieEvolucion; desde: number; hasta: number; sesiones: string[] }) {
  const W = 520;
  const H = 190;
  const m = { izq: 34, der: 12, arr: 20, aba: 34 };
  const ancho = W - m.izq - m.der;
  const alto = H - m.arr - m.aba;
  const rango = Math.max(hasta - desde, 86_400_000);
  // 6 % de aire a cada lado para que el primer y el último punto no queden pegados al borde.
  const x = (f: string) => m.izq + ancho * (0.06 + 0.88 * ((ms(f) - desde) / rango));
  const y = (v: number) => m.arr + alto - (v / serie.max) * alto;
  const franjas = serie.bandas.map((b, i) => ({ y1: y(b.hasta), y2: y(i ? serie.bandas[i - 1].hasta : 0), b }));
  const linea = serie.puntos.map((p) => `${x(p.fecha).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const marcasFecha = [...new Set(serie.puntos.map((p) => p.fecha))];
  return (
    <svg aria-label={`Evolución de ${serie.sigla}`} className="h-auto w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
      {franjas.map(({ y1, y2, b }) => (
        <g key={b.etiqueta}>
          <rect fill={COLOR_BANDA[b.k]} fillOpacity={0.12} height={Math.max(y2 - y1, 0)} width={ancho} x={m.izq} y={y1} />
          <text fill="#94a3b8" fillOpacity={0.8} fontSize="9" x={m.izq + 4} y={y1 + 10}>
            {b.etiqueta}
          </text>
        </g>
      ))}
      {[0, serie.max / 2, serie.max].map((v) => (
        <text fill="#64748b" fontSize="10" key={v} textAnchor="end" x={m.izq - 5} y={y(v) + 3}>
          {Math.round(v)}
        </text>
      ))}
      <line stroke="#334155" x1={m.izq} x2={W - m.der} y1={m.arr + alto} y2={m.arr + alto} />
      {sesiones.map((s, i) => (
        <line key={`${s}-${i}`} stroke="#38bdf8" strokeOpacity={0.55} strokeWidth={1.5} x1={x(s)} x2={x(s)} y1={m.arr + alto} y2={m.arr + alto + 6}>
          <title>Sesión · {formatoFechaCorta(s)}</title>
        </line>
      ))}
      {marcasFecha.map((f) => (
        <text fill="#94a3b8" fontSize="9.5" key={f} textAnchor="middle" x={x(f)} y={H - 6}>
          {formatoFechaCorta(f)}
        </text>
      ))}
      {serie.puntos.length > 1 ? <polyline fill="none" points={linea} stroke="#c7d2fe" strokeWidth={2} /> : null}
      {serie.puntos.map((p) => {
        const k = serie.bandas.find((b) => b.etiqueta === p.banda)?.k ?? "mid";
        return (
          <g key={p.respuestaId}>
            <circle cx={x(p.fecha)} cy={y(p.valor)} fill={COLOR_BANDA[k]} r={5} stroke="#0f172a" strokeWidth={1.5}>
              <title>
                {formatoFechaCorta(p.fecha)} · {p.valor}/{serie.max} · {p.banda}
                {serie.grupo === "B-Breve" ? ` · ${p.quien}` : ""}
              </title>
            </circle>
            <text fill="#e2e8f0" fontSize="10.5" fontWeight="700" textAnchor="middle" x={x(p.fecha)} y={y(p.valor) - 9}>
              {p.valor}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Evolución del paciente en el expediente: todas las escalas en el tiempo
 * (con bandas de severidad y las sesiones marcadas), tendencia frente a la
 * aplicación anterior y a la primera, hitos (vocacional, valores) y
 * sugerencia de reevaluación.
 */
export function PanelEvolucion({ paciente, sesiones }: { paciente: PacienteRow; sesiones: SesionRow[] }) {
  const pacienteId = paciente.id;
  const [respuestas, setRespuestas] = useState<EvaluacionRespuestaRow[] | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  useEffect(() => {
    let vivo = true;
    void fetchEvaluacionesDePaciente(pacienteId).then((r) => vivo && setRespuestas(r.respuestas));
    return () => {
      vivo = false;
    };
  }, [pacienteId]);

  const { series, hitos } = useMemo(() => evolucionDelPaciente(respuestas ?? []), [respuestas]);
  const resumen = useMemo(() => resumenEvolucion(series), [series]);
  const perfiles = useMemo(() => perfilesJjr(respuestas ?? []), [respuestas]);
  const integrado = useMemo(() => perfilIntegrado(respuestas ?? []), [respuestas]);
  const cambios = useMemo(() => cambiosRecientes(respuestas ?? [], series), [respuestas, series]);
  const fechasSesiones = useMemo(
    () => sesiones.filter((s) => s.estado === "finalizada").map((s) => s.iniciadaAt.slice(0, 10)),
    [sesiones]
  );

  if (!respuestas) return null;
  if (!series.length && !hitos.length) return null;

  const todas = [...series.flatMap((s) => s.puntos.map((p) => p.fecha)), ...hitos.map((h) => h.fecha)].sort();
  const primeraEval = todas[0];
  const ultimaEval = todas[todas.length - 1];
  const desde = ms([primeraEval, ...fechasSesiones].sort()[0]);
  const hasta = ms([ultimaEval, ...fechasSesiones].sort().at(-1)!);
  const sesionesEnRango = fechasSesiones.filter((f) => ms(f) >= desde && ms(f) <= hasta);
  const ultimaEapi = series
    .filter((s) => s.grupo === "EAPI")
    .flatMap((s) => s.puntos.map((p) => p.fecha))
    .sort()
    .at(-1);
  const diasEapi = ultimaEapi ? diasDesde(ultimaEapi) : null;
  const sesionesDesdeEapi = ultimaEapi ? fechasSesiones.filter((f) => f > ultimaEapi).length : 0;
  const conMasDeUna = series.filter((s) => s.puntos.length > 1);
  const visibles = verTodas ? series : conMasDeUna.length ? conMasDeUna : series;

  return (
    <SectionCard
      plegable={{
        id: "evolucion",
        resumen: `${series.length} escala${series.length === 1 ? "" : "s"}${resumen.global ? ` · ${TENDENCIA[resumen.global].texto.toLowerCase()}` : ""}`,
      }}
      title="Evolución del paciente"
    >
      <div className="grid gap-4" data-testid="panel-evolucion">
        <CambiosRecientes cambios={cambios} paciente={paciente} sesiones={fechasSesiones} />
        <PerfilIntegradoTarjeta perfil={integrado} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { v: fechasSesiones.length, l: "Sesiones finalizadas" },
            { v: respuestas.length, l: "Evaluaciones respondidas" },
            { v: ultimaEval ? formatoFechaCorta(ultimaEval) : "—", l: `Última evaluación${ultimaEval ? ` (hace ${diasDesde(ultimaEval)} d)` : ""}` },
            { v: resumen.global ? TENDENCIA[resumen.global].texto : "—", l: "Comparado con la vez anterior" },
          ].map((k) => (
            <div className="rounded-lg border border-white/10 bg-white/4 p-3" key={k.l}>
              <div className="text-lg font-bold text-white">{k.v}</div>
              <div className="text-[11px] text-slate-400">{k.l}</div>
            </div>
          ))}
        </div>

        {resumen.comparables ? null : (
          <p className="text-sm text-slate-400">Cuando haya una segunda aplicación de alguna escala verás aquí, primero, qué mejoró, qué empeoró y por qué.</p>
        )}

        {diasEapi !== null && diasEapi >= DIAS_SEGUIMIENTO ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Han pasado {diasEapi} días desde el último EAPI{sesionesDesdeEapi ? ` y ${sesionesDesdeEapi} sesión${sesionesDesdeEapi === 1 ? "" : "es"}` : ""}. Considera
              una nueva aplicación (botón «Nueva aplicación (seguimiento)» en su informe) para medir el avance.
            </span>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map((s) => {
            const ult = s.puntos[s.puntos.length - 1];
            return (
              <div className="grid gap-2 rounded-lg border border-white/10 bg-slate-950/40 p-3" data-serie={s.id} key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {AREA_SENCILLA[s.id] ?? s.nombre} <span className="font-normal text-slate-400">· {s.sigla}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Último resultado: <strong className="text-slate-200">{ult.valor}</strong>/{s.max} · {ult.banda} · {s.puntos.length} aplicación
                      {s.puntos.length === 1 ? "" : "es"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.tendencia ? <Insignia prefijo="Desde la anterior" t={s.tendencia} /> : null}
                    {s.tendenciaInicio ? <Insignia prefijo="Desde el inicio" t={s.tendenciaInicio} /> : null}
                  </div>
                </div>
                <Grafica desde={desde} hasta={hasta} serie={s} sesiones={sesionesEnRango} />
              </div>
            );
          })}
        </div>
        {conMasDeUna.length && conMasDeUna.length < series.length ? (
          <button className="w-fit text-xs font-semibold text-indigo-300 underline-offset-2 hover:underline" onClick={() => setVerTodas((v) => !v)} type="button">
            {verTodas ? "Ver solo escalas con seguimiento" : series.length - conMasDeUna.length === 1
                ? "Ver también la escala con una sola aplicación"
                : `Ver también las ${series.length - conMasDeUna.length} escalas con una sola aplicación`}
          </button>
        ) : null}

        {perfiles.map((p) => (
          <PerfilJjrTiempo key={p.clave} perfil={p} />
        ))}

        {hitos.length ? (
          <div className="grid gap-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Orientación vocacional</div>
            {hitos.map((h) => (
              <div className="text-sm text-slate-300" key={h.respuestaId}>
                <span className="text-slate-500">{formatoFechaCorta(h.fecha)} · </span>
                <strong className="text-white">{h.titulo}</strong> — {h.detalle}
              </div>
            ))}
          </div>
        ) : null}

        <p className="text-[11px] leading-5 text-slate-500">
          Cómo leer las gráficas: un número más bajo = menos molestias. El fondo indica el nivel (verde bajo, amarillo intermedio, rojo
          alto) y las marcas azules abajo son las sesiones. Cuenta como cambio claro: preocupación y nervios (GAD-7) 4 puntos o más, ánimo
          (PHQ-9) 6 o más, pensamientos que dan vueltas (PTQ) 11 o más; en las demás escalas, pasar a otro nivel. Hoy:{" "}
          {formatoFechaCorta(hoyIso())}.
        </p>
      </div>
    </SectionCard>
  );
}
