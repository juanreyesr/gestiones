"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CATEGORIA_COLORES, CATEGORIA_DESCRIPCIONES, CRITERIOS } from "@/data/evaluacion";
import { ESTRATEGIAS_CRITERIOS, ESTRATEGIAS_ENTREVISTA } from "@/data/estrategias";
import {
  aggregateCategoryAnalytics,
  aggregateEntrevistaPreguntas,
  aggregateFortalezas,
  aggregateItemAnalytics,
  aggregateTendenciaCategorias,
  agruparPorDocente,
  categoriasConOportunidad,
  fetchEvaluacionesPorPeriodo,
  promedioEntrevistas,
  promedioGeneral,
  type EvaluacionRow,
} from "@/lib/evaluacion-helpers";
import {
  contarEntrevistas,
  criteriosDebiles,
  fetchCursoCarreraMap,
  resumenPorCarrera,
  resumenPorPeriodo,
  type PeriodoResumen,
} from "@/lib/presentacion-helpers";
import { TendenciaCategoriasChart } from "./tendencia-categorias-chart";

const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";
const SERIE_UNICA = "#34d399";

function SlideHeader({ kicker, title, big }: { kicker: string; title: string; big?: boolean }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">{kicker}</p>
      <h2 className={`mt-3 font-bold text-white ${big ? "text-5xl" : "text-4xl"}`}>{title}</h2>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/8 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-5xl font-bold text-white">{value}</p>
    </div>
  );
}

function DeltaBadge({ delta, suffix = "puntos" }: { delta: number; suffix?: string }) {
  if (delta === 0) {
    return <span className="text-sm font-semibold text-slate-400">Sin cambio</span>;
  }
  const positivo = delta > 0;
  const Icon = positivo ? TrendingUp : TrendingDown;
  const color = positivo ? GOOD : CRITICAL;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color }}>
      <Icon className="h-4 w-4" />
      {positivo ? "+" : ""}
      {delta} {suffix}
    </span>
  );
}

function BarraH({
  label,
  sublabel,
  sublabelClassName = "text-xs text-slate-400",
  percent,
  color,
  trailing,
}: {
  label: string;
  sublabel?: string;
  sublabelClassName?: string;
  percent: number;
  color: string;
  trailing?: string;
}) {
  const ancho = Math.max(0, Math.min(100, percent));
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm font-semibold text-slate-100">{trailing ?? `${percent}%`}</span>
      </div>
      <div className="h-3.5 w-full bg-white/10">
        <div className="h-3.5 rounded-r-sm" style={{ width: `${ancho}%`, backgroundColor: color }} />
      </div>
      {sublabel ? <p className={sublabelClassName}>{sublabel}</p> : null}
    </div>
  );
}

const PLOT_HEIGHT = 220;
const COLUMN_MAX_WIDTH = 48;

function ColumnasPeriodo({ periodos }: { periodos: PeriodoResumen[] }) {
  return (
    <div className="grid gap-2">
      <div className="relative" style={{ height: PLOT_HEIGHT }}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="absolute inset-x-0 border-t border-white/10"
            style={{ bottom: `${(tick / 100) * (PLOT_HEIGHT - 24)}px` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end justify-center gap-6">
          {periodos.map((item) => (
            <div
              key={item.periodo}
              className="flex w-full flex-col items-center justify-end gap-1"
              style={{ maxWidth: COLUMN_MAX_WIDTH }}
            >
              <span className="text-sm font-semibold text-slate-100">{item.promedio}%</span>
              <div
                className="w-full bg-[#34d399]"
                style={{ height: `${(Math.max(0, Math.min(100, item.promedio)) / 100) * (PLOT_HEIGHT - 24)}px` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-6">
        {periodos.map((item) => (
          <span
            key={item.periodo}
            className="w-full text-center text-xs text-slate-400"
            style={{ maxWidth: COLUMN_MAX_WIDTH }}
          >
            {item.periodo}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PresentacionView() {
  const [rows, setRows] = useState<EvaluacionRow[]>([]);
  const [cursoCarrera, setCursoCarrera] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activo, setActivo] = useState(false);
  const [slide, setSlide] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [evalRes, carreraRes] = await Promise.all([
      fetchEvaluacionesPorPeriodo(null, "todos"),
      fetchCursoCarreraMap(),
    ]);
    if (evalRes.error) {
      setError(evalRes.error);
      setLoading(false);
      return;
    }
    setRows(evalRes.data);
    setCursoCarrera(carreraRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load();
  }, [load]);

  const docentesUnicos = useMemo(() => agruparPorDocente(rows).length, [rows]);
  const entrevistasCount = useMemo(() => contarEntrevistas(rows), [rows]);
  const promedioGral = useMemo(() => promedioGeneral(rows), [rows]);
  const promedioEntrev = useMemo(() => promedioEntrevistas(rows), [rows]);
  const periodos = useMemo(() => resumenPorPeriodo(rows), [rows]);
  const carreras = useMemo(() => resumenPorCarrera(rows, cursoCarrera), [rows, cursoCarrera]);

  const categoryAnalytics = useMemo(() => aggregateCategoryAnalytics(rows), [rows]);
  const categoriasOrdenadas = useMemo(
    () => [...categoryAnalytics].sort((a, b) => b.percent - a.percent),
    [categoryAnalytics],
  );
  const entrevistaPreguntas = useMemo(() => aggregateEntrevistaPreguntas(rows), [rows]);
  const entrevistasOrdenadas = useMemo(
    () => [...entrevistaPreguntas].sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0)),
    [entrevistaPreguntas],
  );
  const itemAnalytics = useMemo(() => aggregateItemAnalytics(rows), [rows]);
  const fortalezas = useMemo(() => aggregateFortalezas(rows), [rows]);
  const tendencia = useMemo(() => aggregateTendenciaCategorias(rows), [rows]);
  const oportunidades = useMemo(() => categoriasConOportunidad(categoryAnalytics, 3), [categoryAnalytics]);

  const textoToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const categoria of CRITERIOS) {
      for (const item of categoria.items) {
        map.set(item.texto, item.id);
      }
    }
    return map;
  }, []);

  const sobresalientes = useMemo(() => {
    const altas = categoriasOrdenadas.filter((item) => item.percent >= 90);
    return altas.length ? altas : categoriasOrdenadas.slice(0, 3);
  }, [categoriasOrdenadas]);

  const top3Entrevistas = useMemo(() => entrevistasOrdenadas.slice(0, 3), [entrevistasOrdenadas]);

  const soloSinCarrera = useMemo(
    () => carreras.length > 0 && carreras.every((item) => item.carrera === "Sin carrera asignada"),
    [carreras],
  );

  const preguntasBajasGlobal = useMemo(
    () =>
      [...entrevistaPreguntas]
        .filter((item) => (item.promedio ?? 0) < 100)
        .sort((a, b) => (a.promedio ?? 0) - (b.promedio ?? 0))
        .slice(0, 2),
    [entrevistaPreguntas],
  );

  const preguntasEstrategia = useMemo(
    () =>
      [...entrevistaPreguntas]
        .filter((item) => (item.promedio ?? 0) < 100)
        .sort((a, b) => (a.promedio ?? 0) - (b.promedio ?? 0))
        .slice(0, 3),
    [entrevistaPreguntas],
  );

  const heroDelta = periodos.length >= 2 ? periodos[periodos.length - 1].promedio - periodos[periodos.length - 2].promedio : null;
  const rangoPeriodos = periodos.length ? `${periodos[0].periodo} - ${periodos[periodos.length - 1].periodo}` : "";

  const slides = useMemo(() => {
    const items: Array<{ id: string; content: ReactNode }> = [];

    items.push({
      id: "portada",
      content: (
        <div className="flex h-full flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Coordinacion academica · Evaluacion docente 360
          </p>
          <h2 className="mt-3 text-5xl font-bold text-white">Resultados de evaluacion docente</h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Producto final integrado de observaciones de clase, entrevistas estudiantiles y fortalezas reconocidas
            {rangoPeriodos ? ` · Periodo: ${rangoPeriodos}` : ""} · Presenta: M.A. Juan J. Reyes
          </p>

          <div className="mt-10 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Promedio general historico</p>
              <p className="text-7xl font-bold text-white">{promedioGral}%</p>
            </div>
            {heroDelta !== null ? (
              <div className="flex items-center gap-2 pb-3">
                <DeltaBadge delta={heroDelta} />
                <span className="text-sm text-slate-400">vs trimestre anterior</span>
              </div>
            ) : null}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Evaluaciones realizadas" value={String(rows.length)} />
            <StatTile label="Docentes evaluados" value={String(docentesUnicos)} />
            <StatTile label="Entrevistas estudiantiles" value={String(entrevistasCount)} />
            <StatTile label="Promedio de entrevistas" value={`${promedioEntrev}%`} />
          </div>
        </div>
      ),
    });

    items.push({
      id: "positivo",
      content: (
        <div>
          <SlideHeader kicker="Aspectos positivos" title="Lo que como equipo estamos haciendo bien" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="border border-white/10 bg-white/8 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Areas sobresalientes</h3>
              <div className="mt-4 grid gap-4">
                {sobresalientes.map((item) => (
                  <BarraH
                    key={item.categoria}
                    label={item.categoria}
                    sublabel={CATEGORIA_DESCRIPCIONES[item.categoria]}
                    percent={item.percent}
                    color={CATEGORIA_COLORES[item.categoria] ?? SERIE_UNICA}
                  />
                ))}
              </div>
            </div>
            <div className="border border-white/10 bg-white/8 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">La voz de los estudiantes</h3>
              <div className="mt-4 grid gap-4">
                {top3Entrevistas.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{item.texto}</span>
                    <span className="text-3xl font-bold text-white">{item.promedio ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 border border-white/10 bg-white/8 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Fortalezas mas reconocidas</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {fortalezas.slice(0, 5).map((item) => (
                <span
                  key={item.texto}
                  className="border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-sm text-emerald-100"
                >
                  {item.texto} · {item.percent}%
                </span>
              ))}
            </div>
          </div>
        </div>
      ),
    });

    items.push({
      id: "observacion",
      content: (
        <div>
          <SlideHeader kicker="Metricas globales" title="Rendimiento global por area evaluada" />
          <div className="grid gap-5">
            {categoriasOrdenadas.map((item) => (
              <BarraH
                key={item.categoria}
                label={item.categoria}
                sublabel={CATEGORIA_DESCRIPCIONES[item.categoria]}
                percent={item.percent}
                color={CATEGORIA_COLORES[item.categoria] ?? SERIE_UNICA}
              />
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-400">
            Promedio general: {promedioGral}% · {rows.length} evaluaciones de {docentesUnicos} docentes
          </p>
        </div>
      ),
    });

    items.push({
      id: "entrevistas",
      content: (
        <div>
          <SlideHeader kicker="Entrevistas estudiantiles" title="Lo que responden los estudiantes" />
          {entrevistasOrdenadas.length === 0 ? (
            <p className="mt-16 text-center text-lg text-slate-400">
              Aun no hay entrevistas estudiantiles registradas.
            </p>
          ) : (
            <div className="grid gap-5">
              {entrevistasOrdenadas.map((item) => (
                <BarraH
                  key={item.id}
                  label={item.texto}
                  sublabel={`${item.respondidas} respuestas`}
                  sublabelClassName="text-xs text-slate-500"
                  percent={item.promedio ?? 0}
                  color={SERIE_UNICA}
                />
              ))}
            </div>
          )}
        </div>
      ),
    });

    items.push({
      id: "comparativa",
      content: (
        <div>
          <SlideHeader kicker="Evolucion trimestral" title="Como hemos avanzado trimestre a trimestre" />
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div className="border border-white/10 bg-white/8 p-5">
              {periodos.length < 2 ? (
                <p className="text-sm text-slate-400">
                  Este es el primer periodo evaluado; la comparativa aparecera cuando exista mas de un trimestre con
                  datos.
                </p>
              ) : (
                <>
                  <ColumnasPeriodo periodos={periodos} />
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <DeltaBadge delta={periodos[periodos.length - 1].promedio - periodos[periodos.length - 2].promedio} />
                    <span className="text-sm text-slate-400">frente al periodo anterior</span>
                  </div>
                </>
              )}
            </div>
            <div className="border border-white/10 bg-white/8 p-5">
              <p className="mb-4 text-sm text-slate-400">Evolucion de cada area</p>
              <TendenciaCategoriasChart series={tendencia} />
            </div>
          </div>
        </div>
      ),
    });

    items.push({
      id: "carreras",
      content: (
        <div>
          <SlideHeader kicker="Analisis por carrera" title="Rendimiento por carrera" />
          <div className="grid gap-5">
            {carreras.map((item) => (
              <BarraH
                key={item.carrera}
                label={item.carrera}
                sublabel={`${item.evaluaciones} evaluaciones · ${item.docentes} docentes`}
                sublabelClassName="text-xs text-slate-500"
                percent={item.promedio}
                color={SERIE_UNICA}
              />
            ))}
          </div>
          {soloSinCarrera ? (
            <p className="mt-8 text-sm text-slate-400">
              Asigna carrera a los cursos en Control de cursos y docentes para ver este analisis desglosado.
            </p>
          ) : null}
        </div>
      ),
    });

    if (oportunidades.length === 0) {
      items.push({
        id: "oportunidad-celebracion",
        content: (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Donde vamos a crecer</p>
            <h2 className="mt-3 text-4xl font-bold text-white">Areas de oportunidad</h2>
            <p className="mt-8 max-w-2xl text-xl text-slate-300">
              Todas las areas estan al maximo — el reto ahora es sostenerlo.
            </p>
          </div>
        ),
      });
      return items;
    }

    items.push({
      id: "oportunidad",
      content: (
        <div>
          <SlideHeader kicker="Donde vamos a crecer" title="Areas de oportunidad" />
          <div className="grid gap-6">
            {oportunidades.map((item) => {
              const color = CATEGORIA_COLORES[item.categoria] ?? SERIE_UNICA;
              const debiles = criteriosDebiles(itemAnalytics, item.categoria, 2);
              return (
                <div key={item.categoria} className="border border-white/10 bg-white/8 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-lg font-semibold text-slate-100">{item.categoria}</span>
                    </div>
                    <span className="text-2xl font-bold text-white">Solo faltan {100 - item.percent} puntos</span>
                  </div>
                  <div className="mt-3 h-3.5 w-full bg-white/10">
                    <div className="h-3.5 rounded-r-sm" style={{ width: `${item.percent}%`, backgroundColor: color }} />
                  </div>
                  {debiles.length ? (
                    <ul className="mt-4 grid gap-2">
                      {debiles.map((debil) => (
                        <li key={debil.texto} className="flex items-center justify-between gap-4 text-sm text-slate-300">
                          <span>{debil.texto}</span>
                          <span className="font-semibold text-slate-100">{debil.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
          {preguntasBajasGlobal.length ? (
            <div className="mt-8 border border-white/10 bg-white/8 p-5">
              <p className="text-sm font-semibold text-slate-300">La voz del estudiante tambien pide reforzar:</p>
              <div className="mt-3 grid gap-2">
                {preguntasBajasGlobal.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-sm text-slate-300">
                    <span>{item.texto}</span>
                    <span className="font-semibold text-slate-100">{item.promedio ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ),
    });

    for (const oportunidad of oportunidades) {
      const debiles = criteriosDebiles(itemAnalytics, oportunidad.categoria, 3);
      items.push({
        id: `estrategia-${oportunidad.categoria}`,
        content: (
          <div>
            <SlideHeader kicker="Plan de accion" title={`Estrategia: ${oportunidad.categoria}`} />
            <p className="mb-8 text-lg text-slate-300">
              {oportunidad.percent}% hoy → meta 100%
            </p>
            <div className="grid gap-6">
              {debiles.map((debil) => {
                const criterioId = textoToId.get(debil.texto);
                const acciones = criterioId ? ESTRATEGIAS_CRITERIOS[criterioId] ?? [] : [];
                return (
                  <div key={debil.texto} className="border border-white/10 bg-white/8 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-base font-semibold text-slate-100">{debil.texto}</span>
                      <span className="text-sm font-semibold text-slate-100">{debil.percent}%</span>
                    </div>
                    <ul className="mt-4 grid gap-2">
                      {acciones.map((accion) => (
                        <li key={accion} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{accion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      });
    }

    if (preguntasEstrategia.length > 0) {
      items.push({
        id: "estrategia-entrevista",
        content: (
          <div>
            <SlideHeader kicker="Plan de accion" title="Estrategia: la voz del estudiante" />
            <div className="grid gap-6">
              {preguntasEstrategia.map((pregunta) => {
                const acciones = ESTRATEGIAS_ENTREVISTA[pregunta.id] ?? [];
                return (
                  <div key={pregunta.id} className="border border-white/10 bg-white/8 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-base font-semibold text-slate-100">{pregunta.texto}</span>
                      <span className="text-sm font-semibold text-slate-100">{pregunta.promedio ?? 0}%</span>
                    </div>
                    <ul className="mt-4 grid gap-2">
                      {acciones.map((accion) => (
                        <li key={accion} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{accion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      });
    }

    const dosMejores = categoriasOrdenadas
      .slice(0, 2)
      .map((item) => item.categoria)
      .join(" y ");
    const nombresOportunidad = oportunidades.map((item) => item.categoria).join(", ");

    items.push({
      id: "cierre",
      content: (
        <div className="flex h-full flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Siguiente paso</p>
          <h2 className="mt-3 text-4xl font-bold text-white">Meta del proximo trimestre: todo sobresaliente</h2>
          <ul className="mt-10 grid gap-6">
            <li className="text-xl text-slate-200">Sostener lo que ya funciona: {dosMejores || "nuestras areas fuertes"}</li>
            <li className="text-xl text-slate-200">
              Enfocar el acompanamiento en: {nombresOportunidad || "sostener los resultados actuales"}
            </li>
            <li className="text-xl text-slate-200">Revisar el avance de este plan en la proxima evaluacion trimestral</li>
          </ul>
          <p className="mt-12 text-base text-slate-400">
            Gracias por el compromiso de cada docente y del equipo — M.A. Juan J. Reyes
          </p>
        </div>
      ),
    });

    return items;
  }, [
    rows,
    promedioGral,
    heroDelta,
    rangoPeriodos,
    docentesUnicos,
    entrevistasCount,
    promedioEntrev,
    sobresalientes,
    top3Entrevistas,
    fortalezas,
    categoriasOrdenadas,
    entrevistasOrdenadas,
    periodos,
    tendencia,
    carreras,
    soloSinCarrera,
    oportunidades,
    itemAnalytics,
    preguntasBajasGlobal,
    preguntasEstrategia,
    textoToId,
  ]);

  const currentIndex = Math.min(slide, slides.length - 1);
  const currentSlide = slides[currentIndex];

  useEffect(() => {
    if (!activo) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        setSlide((current) => Math.min(current + 1, slides.length - 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        setSlide((current) => Math.max(current - 1, 0));
      } else if (event.key === "Escape") {
        setActivo(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activo, slides.length]);

  const handleFullscreen = () => {
    const noop = () => undefined;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(noop);
    } else {
      overlayRef.current?.requestFullscreen().catch(noop);
    }
  };

  if (!activo) {
    return (
      <div className="border border-white/10 bg-white/8 p-6">
        <h2 className="text-lg font-semibold text-white">Modo presentacion</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Dashboard listo para proyectar a los colaboradores: logros, comparativa entre trimestres, analisis por
          carrera y estrategia de mejora.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Cargando datos...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Aun no hay evaluaciones registradas para presentar.</p>
        ) : (
          <p className="mt-4 text-sm text-slate-300">
            {rows.length} evaluaciones · {docentesUnicos} docentes · {periodos.length} periodos
          </p>
        )}

        <button
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
          disabled={loading || rows.length === 0}
          onClick={() => {
            setSlide(0);
            setActivo(true);
          }}
          type="button"
        >
          Iniciar presentacion
        </button>
      </div>
    );
  }

  // Portal al body: un ancestro con backdrop-filter (las tarjetas del app)
  // crea un containing block que atraparia el overlay fixed dentro de la tarjeta.
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_60%)]"
    >
      <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col overflow-y-auto px-8 py-10">
        {currentSlide?.content}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-slate-950/90 px-6 py-3 backdrop-blur-xl sm:gap-4">
        <button
          className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-40"
          disabled={currentIndex === 0}
          onClick={() => setSlide((current) => Math.max(current - 1, 0))}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 w-1.5 rounded-full ${index === currentIndex ? "bg-emerald-300" : "bg-white/20"}`}
            />
          ))}
        </div>

        <span className="text-xs text-slate-400">
          {currentIndex + 1} / {slides.length}
        </span>

        <button
          className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-40"
          disabled={currentIndex === slides.length - 1}
          onClick={() => setSlide((current) => Math.min(current + 1, slides.length - 1))}
          type="button"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
          onClick={handleFullscreen}
          type="button"
        >
          <Maximize2 className="h-4 w-4" />
          Pantalla completa
        </button>

        <button
          className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
          onClick={() => setActivo(false)}
          type="button"
        >
          <X className="h-4 w-4" />
          Salir
        </button>
      </div>
    </div>,
    document.body,
  );
}
