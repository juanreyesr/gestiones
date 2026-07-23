"use client";

import { BarChart3, MessageSquareText, Percent, ThumbsUp, Users } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCampanas } from "@/lib/encuestas/campanas";
import {
  LABELS_EXPECTATIVA_UNIVERSIDAD,
  LABELS_EXPECTATIVAS_CARRERA,
  LABELS_FUENTE_CONOCIMIENTO,
  LABELS_QUIEN_INFLUYO,
  LABELS_RAZONES_CARRERA,
  LABELS_RAZONES_UNIVERSIDAD,
} from "@/lib/encuestas/catalogos";
import { fetchRespuestas } from "@/lib/encuestas/respuestas";
import type { CampanaConConteo, RespuestaEncuestaRow } from "@/lib/encuestas/types";
import { EmptyState, ErrorBanner, PanelBox } from "./ui";

function contarArreglo(respuestas: RespuestaEncuestaRow[], campo: "razones_universidad" | "razones_carrera" | "expectativas_carrera" | "expectativa_universidad") {
  const mapa = new Map<string, number>();
  for (const respuesta of respuestas) {
    for (const valor of respuesta[campo]) {
      mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
    }
  }
  return mapa;
}

function contarUnico(respuestas: RespuestaEncuestaRow[], campo: "fuente_conocimiento" | "quien_influyo") {
  const mapa = new Map<string, number>();
  for (const respuesta of respuestas) {
    const valor = respuesta[campo];
    mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
  }
  return mapa;
}

function Metric({ detail, icon: Icon, title, value }: { detail: string; icon: React.ComponentType<{ className?: string }>; title: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400">{title}</span>
        <Icon className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-300">{detail}</div>
    </div>
  );
}

function BarrasConteo({ mapa, labels, total }: { mapa: Map<string, number>; labels: Record<string, string>; total: number }) {
  const filas = Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  if (filas.length === 0) return <p className="text-sm text-slate-400">Sin datos.</p>;

  return (
    <div className="grid gap-2.5">
      {filas.map(([id, cantidad]) => {
        const pct = total ? Math.round((cantidad / total) * 100) : 0;
        return (
          <div key={id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-white">{labels[id] ?? id}</span>
              <span className="text-slate-400">
                {cantidad} · {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-white/8">
              <div className="h-2.5 bg-emerald-300 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardEncuestas() {
  const [campanas, setCampanas] = useState<CampanaConConteo[]>([]);
  const [aniosSeleccionados, setAniosSeleccionados] = useState<number[]>([]);
  const [carreraFiltro, setCarreraFiltro] = useState("");
  const [respuestas, setRespuestas] = useState<RespuestaEncuestaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarCampanas = useCallback(async () => {
    const { data, error: fetchError } = await fetchCampanas();
    setCampanas(data);
    setError(fetchError ?? "");
    const anios = Array.from(new Set(data.map((c) => c.anio))).sort((a, b) => b - a);
    if (anios.length > 0) {
      setAniosSeleccionados((actual) => (actual.length > 0 ? actual : [anios[0]]));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de campanas para los filtros
    void cargarCampanas();
  }, [cargarCampanas]);

  const aniosDisponibles = useMemo(() => Array.from(new Set(campanas.map((c) => c.anio))).sort((a, b) => b - a), [campanas]);
  const carrerasDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of campanas) {
      if (c.carrera_id && c.gestionesjj_carreras) mapa.set(c.carrera_id, c.gestionesjj_carreras.nombre);
    }
    return Array.from(mapa.entries());
  }, [campanas]);

  const campanasFiltradas = useMemo(
    () =>
      campanas.filter(
        (c) => (aniosSeleccionados.length === 0 || aniosSeleccionados.includes(c.anio)) && (!carreraFiltro || c.carrera_id === carreraFiltro),
      ),
    [campanas, aniosSeleccionados, carreraFiltro],
  );

  const campanaAnioPorId = useMemo(() => new Map(campanas.map((c) => [c.id, c.anio])), [campanas]);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      const ids = campanasFiltradas.map((c) => c.id);
      const { data, error: fetchError } = await fetchRespuestas(ids);
      if (!activo) return;
      setRespuestas(data);
      if (fetchError) setError(fetchError);
      setLoading(false);
    })();
    return () => {
      activo = false;
    };
  }, [campanasFiltradas]);

  const total = respuestas.length;

  const metricas = useMemo(() => {
    if (total === 0) return { pctPrimeraOpcion: 0, promedioSatisfaccion: 0, nps: 0 };
    const primeraOpcion = respuestas.filter((r) => r.primera_opcion).length;
    const promedioSatisfaccion = respuestas.reduce((sum, r) => sum + r.satisfaccion_eleccion, 0) / total;
    const promotores = respuestas.filter((r) => r.probabilidad_recomendar >= 9).length;
    const detractores = respuestas.filter((r) => r.probabilidad_recomendar <= 6).length;
    const nps = Math.round(((promotores - detractores) / total) * 100);
    return { pctPrimeraOpcion: Math.round((primeraOpcion / total) * 100), promedioSatisfaccion, nps };
  }, [respuestas, total]);

  const comentarios = useMemo(
    () => respuestas.map((r) => r.expectativa_abierta).filter((texto): texto is string => Boolean(texto?.trim())),
    [respuestas],
  );

  // Tendencia interanual: % de menciones de cada razon de universidad, por ano.
  const tendenciaRazonesUniversidad = useMemo(() => {
    const anios = Array.from(new Set(campanasFiltradas.map((c) => c.anio))).sort((a, b) => a - b);
    if (anios.length < 2) return null;

    const porAnio = new Map<number, RespuestaEncuestaRow[]>();
    for (const respuesta of respuestas) {
      const anio = campanaAnioPorId.get(respuesta.campana_id);
      if (anio === undefined) continue;
      if (!porAnio.has(anio)) porAnio.set(anio, []);
      porAnio.get(anio)!.push(respuesta);
    }

    const todasLasRazones = new Set<string>();
    for (const respuesta of respuestas) {
      for (const razon of respuesta.razones_universidad) todasLasRazones.add(razon);
    }

    const filas = Array.from(todasLasRazones).map((razon) => ({
      razon,
      porAnio: anios.map((anio) => {
        const grupo = porAnio.get(anio) ?? [];
        const cantidad = grupo.filter((r) => r.razones_universidad.includes(razon)).length;
        return grupo.length ? Math.round((cantidad / grupo.length) * 100) : 0;
      }),
    }));

    filas.sort((a, b) => (b.porAnio.at(-1) ?? 0) - (a.porAnio.at(-1) ?? 0));

    return { anios, filas };
  }, [campanasFiltradas, respuestas, campanaAnioPorId]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 border border-white/10 bg-white/6 p-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Años a incluir</p>
          <div className="flex flex-wrap gap-1.5">
            {aniosDisponibles.map((anio) => (
              <button
                className={`border px-3 py-1.5 text-sm font-semibold transition ${
                  aniosSeleccionados.includes(anio)
                    ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                    : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
                }`}
                key={anio}
                onClick={() =>
                  setAniosSeleccionados((actual) =>
                    actual.includes(anio) ? actual.filter((a) => a !== anio) : [...actual, anio],
                  )
                }
                type="button"
              >
                {anio}
              </button>
            ))}
          </div>
        </div>
        {carrerasDisponibles.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Carrera</p>
            <select className="field" onChange={(event) => setCarreraFiltro(event.target.value)} value={carreraFiltro}>
              <option value="">Todas</option>
              {carrerasDisponibles.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-slate-400">Cargando respuestas...</p>
      ) : total === 0 ? (
        <EmptyState>No hay respuestas para los filtros seleccionados.</EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric detail="En el periodo filtrado" icon={Users} title="Respuestas" value={String(total)} />
            <Metric detail="Eligieron la carrera como primera opción" icon={Percent} title="Primera opción" value={`${metricas.pctPrimeraOpcion}%`} />
            <Metric detail="Seguridad de su elección (1-5)" icon={BarChart3} title="Satisfacción" value={metricas.promedioSatisfaccion.toFixed(1)} />
            <Metric detail="Probabilidad de recomendar (0-10)" icon={ThumbsUp} title="NPS" value={String(metricas.nps)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">¿Por qué esta universidad?</h3>
              <BarrasConteo mapa={contarArreglo(respuestas, "razones_universidad")} labels={LABELS_RAZONES_UNIVERSIDAD} total={total} />
            </PanelBox>
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">¿Por qué esta carrera?</h3>
              <BarrasConteo mapa={contarArreglo(respuestas, "razones_carrera")} labels={LABELS_RAZONES_CARRERA} total={total} />
            </PanelBox>
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">¿Cómo nos conoció?</h3>
              <BarrasConteo mapa={contarUnico(respuestas, "fuente_conocimiento")} labels={LABELS_FUENTE_CONOCIMIENTO} total={total} />
            </PanelBox>
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">¿Quién influyó en la decisión?</h3>
              <BarrasConteo mapa={contarUnico(respuestas, "quien_influyo")} labels={LABELS_QUIEN_INFLUYO} total={total} />
            </PanelBox>
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Expectativas de la carrera</h3>
              <BarrasConteo mapa={contarArreglo(respuestas, "expectativas_carrera")} labels={LABELS_EXPECTATIVAS_CARRERA} total={total} />
            </PanelBox>
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Expectativas de la universidad</h3>
              <BarrasConteo mapa={contarArreglo(respuestas, "expectativa_universidad")} labels={LABELS_EXPECTATIVA_UNIVERSIDAD} total={total} />
            </PanelBox>
          </div>

          {tendenciaRazonesUniversidad ? (
            <PanelBox>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                Tendencia interanual — ¿por qué esta universidad? (% de menciones por año)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase text-slate-400">
                      <th className="py-1.5 pr-3">Razón</th>
                      {tendenciaRazonesUniversidad.anios.map((anio) => (
                        <th className="px-2 py-1.5 text-right" key={anio}>
                          {anio}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tendenciaRazonesUniversidad.filas.map((fila) => (
                      <tr className="border-b border-white/5" key={fila.razon}>
                        <td className="py-1.5 pr-3 text-slate-200">{LABELS_RAZONES_UNIVERSIDAD[fila.razon] ?? fila.razon}</td>
                        {fila.porAnio.map((pct, index) => (
                          <td className="px-2 py-1.5 text-right font-semibold text-white" key={tendenciaRazonesUniversidad.anios[index]}>
                            {pct}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelBox>
          ) : null}

          {comentarios.length > 0 ? (
            <PanelBox>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                <MessageSquareText className="h-4 w-4" />
                Qué esperan lograr (respuestas abiertas)
              </h3>
              <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                {comentarios.map((texto, index) => (
                  <div className="border border-white/10 bg-white/6 p-3 text-sm leading-6 text-slate-100" key={index}>
                    {texto}
                  </div>
                ))}
              </div>
            </PanelBox>
          ) : null}
        </>
      )}
    </div>
  );
}
