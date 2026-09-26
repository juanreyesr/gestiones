"use client";

import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  CircleDashed,
  Clock,
  Monitor,
  PlayCircle,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TRIMESTRES, type DocenteRow, type Trimestre } from "@/data/evaluacion";
import { fetchCursosAdmin, type CursoAdminRow } from "@/lib/cursos-admin";
import { currentTrimestre, fetchEvaluacionesPorPeriodo, type EvaluacionRow } from "@/lib/evaluacion-helpers";
import { formatoCorto, hoyISO } from "@/lib/fechas";
import {
  esCursoDelCoordinador,
  estadoItem,
  finPorDefecto,
  generarPlan,
  logroSemanal,
  MINIMO_POR_SABADO,
  sabadoDeSemana,
  sabadoEnOPosterior,
  type EstadoItem,
  type ItemSupervision,
  type LogroSemana,
} from "@/lib/supervision";
import { ErrorBanner, Field, INPUT } from "./ui-comun";

export type IniciarSupervision = {
  docenteId: string;
  cursoId: string;
  anio: number;
  trimestre: Trimestre;
};

type Rango = { inicio: string; fin: string };

const claveRango = (anio: number, trimestre: Trimestre) => `gestionesjj:supervision:${anio}-T${trimestre}`;

/**
 * El inicio del plan se fija la primera vez que se abre el periodo: si se
 * recalculara con "hoy" en cada visita, la propuesta se correria sola cada
 * semana. Se guarda solo en este navegador (es una preferencia de vista).
 */
function leerRango(anio: number, trimestre: Trimestre): Rango {
  const porDefecto = { inicio: sabadoEnOPosterior(hoyISO()), fin: finPorDefecto(anio, trimestre) };
  try {
    const guardado = window.localStorage.getItem(claveRango(anio, trimestre));
    if (guardado) {
      const valor = JSON.parse(guardado) as Partial<Rango>;
      if (valor.inicio && valor.fin) return { inicio: valor.inicio, fin: valor.fin };
    }
    window.localStorage.setItem(claveRango(anio, trimestre), JSON.stringify(porDefecto));
  } catch {
    // Sin almacenamiento disponible: se usa el rango por defecto.
  }
  return porDefecto;
}

function guardarRango(anio: number, trimestre: Trimestre, rango: Rango) {
  try {
    window.localStorage.setItem(claveRango(anio, trimestre), JSON.stringify(rango));
  } catch {
    // Ignorado: el rango sigue vigente mientras la vista este abierta.
  }
}

const ESTADOS: Record<EstadoItem, { texto: string; clase: string; icono: React.ComponentType<{ className?: string }> }> = {
  realizada: { texto: "Realizada", clase: "border-emerald-300/50 bg-emerald-300/12 text-emerald-100", icono: CheckCircle2 },
  "otra-fecha": { texto: "Hecha otra fecha", clase: "border-sky-300/40 bg-sky-300/10 text-sky-100", icono: CheckCircle2 },
  hoy: { texto: "Hoy", clase: "border-amber-300/60 bg-amber-300/14 text-amber-100", icono: PlayCircle },
  vencida: { texto: "No realizada", clase: "border-red-400/40 bg-red-400/10 text-red-200", icono: AlertTriangle },
  pendiente: { texto: "Programada", clase: "border-white/10 bg-white/6 text-slate-200", icono: CircleDashed },
};

const MOTIVOS: Record<ItemSupervision["motivo"], string> = {
  docente: "1.ª visita al docente",
  curso: "1.ª visita al curso",
  seguimiento: "Seguimiento",
};

const NIVELES: Record<LogroSemana["nivel"], { texto: string; barra: string; chip: string }> = {
  optimo: { texto: "Óptimo", barra: "bg-emerald-300", chip: "text-emerald-200" },
  esperado: { texto: "Esperado", barra: "bg-amber-300", chip: "text-amber-200" },
  "sin-logro": { texto: "Sin logro", barra: "bg-red-400", chip: "text-red-300" },
  futura: { texto: "Por venir", barra: "bg-white/15", chip: "text-slate-400" },
};

export function SupervisionView({
  docentes,
  onIniciar,
}: {
  docentes: DocenteRow[];
  onIniciar: (datos: IniciarSupervision) => void;
}) {
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre>(() => currentTrimestre());
  const [rango, setRango] = useState<Rango | null>(null);
  const [cursos, setCursos] = useState<CursoAdminRow[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const hoy = hoyISO();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el rango vive en localStorage, solo existe en el navegador
    setRango(leerRango(anio, trimestre));
  }, [anio, trimestre]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resCursos, resEvaluaciones] = await Promise.all([fetchCursosAdmin(), fetchEvaluacionesPorPeriodo(anio, trimestre)]);
    setError(resCursos.error ?? resEvaluaciones.error ?? "");
    setCursos(resCursos.data);
    setEvaluaciones(resEvaluaciones.data);
    setCargando(false);
  }, [anio, trimestre]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos del periodo
    cargar();
  }, [cargar]);

  const actualizarRango = (cambio: Partial<Rango>) => {
    if (!rango) return;
    const nuevo = { ...rango, ...cambio };
    setRango(nuevo);
    guardarRango(anio, trimestre, nuevo);
  };

  const docentesActivos = useMemo(() => new Map(docentes.map((d) => [d.id, d.nombre])), [docentes]);

  const cursosDelPeriodo = useMemo(
    () => cursos.filter((c) => c.activo && c.anio === anio && c.trimestre === trimestre),
    [cursos, anio, trimestre],
  );

  const nombreDocente = useCallback(
    (c: CursoAdminRow) => (c.docenteId ? (docentesActivos.get(c.docenteId) ?? c.docenteNombre) : c.docenteNombre),
    [docentesActivos],
  );

  const cursosPropios = useMemo(
    () => cursosDelPeriodo.filter((c) => esCursoDelCoordinador(nombreDocente(c))),
    [cursosDelPeriodo, nombreDocente],
  );

  const cursosPeriodo = useMemo(
    () => cursosDelPeriodo.filter((c) => !esCursoDelCoordinador(nombreDocente(c))),
    [cursosDelPeriodo, nombreDocente],
  );

  const cursosSinDocente = useMemo(
    () => cursosPeriodo.filter((c) => !c.docenteId || !docentesActivos.has(c.docenteId)),
    [cursosPeriodo, docentesActivos],
  );

  const plan = useMemo(() => {
    if (!rango) return null;
    const previas = evaluaciones.filter((e) => e.fecha_observacion < rango.inicio);
    return generarPlan({
      cursos: cursosPeriodo
        .filter((c) => c.docenteId && docentesActivos.has(c.docenteId))
        .map((c) => ({
          id: c.id,
          nombre: c.nombre,
          horario: c.horario,
          edificio: c.edificio,
          virtual: c.virtual,
          docenteId: c.docenteId as string,
          docenteNombre: docentesActivos.get(c.docenteId as string) ?? c.docenteNombre ?? "Docente",
        })),
      inicio: rango.inicio,
      fin: rango.fin,
      docentesYaSupervisados: new Set(previas.map((e) => e.docente_id).filter((id): id is string => !!id)),
      cursosYaSupervisados: new Set(previas.map((e) => e.curso_id).filter((id): id is string => !!id)),
    });
  }, [rango, evaluaciones, cursosPeriodo, docentesActivos]);

  const logros = useMemo(() => (plan ? logroSemanal(plan.semanas, evaluaciones, hoy) : []), [plan, evaluaciones, hoy]);

  const indicadores = useMemo(() => {
    const cerradas = logros.filter((l) => l.nivel !== "futura");
    const promedio = (valores: number[]) =>
      valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
    const items = plan?.semanas.flatMap((s) => s.items) ?? [];
    const realizadas = items.filter((i) => {
      const estado = estadoItem(i, evaluaciones, hoy);
      return estado === "realizada" || estado === "otra-fecha";
    }).length;
    const planificables = cursosPeriodo.filter((c) => c.docenteId && docentesActivos.has(c.docenteId));
    const docentesPeriodo = new Set(planificables.map((c) => c.docenteId as string));
    const docentesVistos = new Set(evaluaciones.map((e) => e.docente_id).filter((id) => id && docentesPeriodo.has(id)));
    const cursosVistos = new Set(
      evaluaciones.map((e) => e.curso_id).filter((id) => id && planificables.some((c) => c.id === id)),
    );
    return {
      semanasCerradas: cerradas.length,
      logroEsperado: promedio(cerradas.map((l) => l.pctEsperado)),
      logroOptimo: promedio(cerradas.map((l) => l.pctOptimo)),
      semanasOptimas: cerradas.filter((l) => l.nivel === "optimo").length,
      realizadas,
      programadas: items.length,
      docentesVistos: docentesVistos.size,
      docentesTotal: docentesPeriodo.size,
      cursosVistos: cursosVistos.size,
      cursosTotal: planificables.length,
    };
  }, [logros, plan, evaluaciones, hoy, cursosPeriodo, docentesActivos]);

  const semanaActual = sabadoDeSemana(hoy);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <CalendarCheck2 className="h-4 w-4" />
            Programación de supervisiones
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Supervisión docente del trimestre</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Propuesta automática: primero una visita a cada docente, luego a cada curso, con al menos {MINIMO_POR_SABADO} supervisiones
            por sábado y nunca dos a la misma hora. Toca un curso para abrir su evaluación con los datos cargados.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60"
          disabled={cargando}
          onClick={cargar}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          Actualizar avance
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Año">
          <input className={INPUT} min={2024} type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
        </Field>
        <Field label="Trimestre">
          <select className={INPUT} value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value) as Trimestre)}>
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>
                Trimestre {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Inicio del plan">
          <input
            className={INPUT}
            type="date"
            value={rango?.inicio ?? ""}
            onChange={(e) => e.target.value && actualizarRango({ inicio: e.target.value })}
          />
        </Field>
        <Field label="Fin de clases">
          <input
            className={INPUT}
            type="date"
            value={rango?.fin ?? ""}
            onChange={(e) => e.target.value && actualizarRango({ fin: e.target.value })}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Las evaluaciones anteriores al inicio del plan se descuentan de la propuesta; las posteriores solo marcan el avance, así el
        calendario no se reacomoda solo.{" "}
        <button
          className="font-semibold text-emerald-200 underline-offset-2 hover:underline"
          onClick={() => actualizarRango({ inicio: sabadoEnOPosterior(hoy) })}
          type="button"
        >
          Replanificar desde este sábado
        </button>
      </p>

      <ErrorBanner message={error} />

      {cargando && !plan?.semanas.length ? <p className="text-sm text-slate-300">Cargando cursos y evaluaciones...</p> : null}

      {plan ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              detalle={`${indicadores.semanasCerradas} semana(s) evaluada(s) · meta: 1 por semana`}
              icono={Target}
              titulo="Logro esperado"
              valor={`${indicadores.logroEsperado}%`}
            />
            <Indicador
              detalle={`${indicadores.semanasOptimas} semana(s) con 2 o más · meta: 2 por semana`}
              icono={Trophy}
              titulo="Logro óptimo"
              valor={`${indicadores.logroOptimo}%`}
            />
            <Indicador
              detalle={`${indicadores.realizadas} de ${indicadores.programadas} supervisiones del plan`}
              icono={CalendarCheck2}
              titulo="Avance del plan"
              valor={`${indicadores.programadas ? Math.round((indicadores.realizadas / indicadores.programadas) * 100) : 0}%`}
            />
            <Indicador
              detalle={`Cursos: ${indicadores.cursosVistos} de ${indicadores.cursosTotal} supervisados`}
              icono={Users}
              titulo="Docentes supervisados"
              valor={`${indicadores.docentesVistos}/${indicadores.docentesTotal}`}
            />
          </div>

          <GraficaSemanal logros={logros} semanaActual={semanaActual} />

          {plan.docentesSinCupo.length || plan.cursosSinCupo.length || plan.sinHorario.length || cursosSinDocente.length || cursosPropios.length ? (
            <div className="grid gap-1 border border-amber-300/30 bg-amber-300/8 p-3 text-sm text-amber-100">
              {plan.docentesSinCupo.length ? (
                <p>
                  No alcanzan los sábados para visitar a: {plan.docentesSinCupo.join(", ")}. Amplía la fecha de fin o adelanta el inicio.
                </p>
              ) : null}
              {plan.cursosSinCupo.filter((c) => c.motivo === "curso").length ? (
                <p>
                  {plan.cursosSinCupo.filter((c) => c.motivo === "curso").length} curso(s) quedan sin visita por falta de franjas
                  libres; los docentes sí quedan cubiertos.
                </p>
              ) : null}
              {plan.sinHorario.length ? (
                <p>Sin horario legible (no se programan): {plan.sinHorario.map((c) => c.nombre).join(", ")}.</p>
              ) : null}
              {cursosPropios.length ? (
                <p>Tus cursos no se programan (no te supervisas a ti mismo): {cursosPropios.map((c) => c.nombre).join(", ")}.</p>
              ) : null}
              {cursosSinDocente.length ? (
                <p>
                  Sin docente activo asignado (no se programan): {cursosSinDocente.map((c) => c.nombre).join(", ")}.
                </p>
              ) : null}
            </div>
          ) : null}

          {plan.semanas.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plan.semanas.map(({ semana, items }, indice) => {
                const logro = logros[indice];
                const nivel = NIVELES[logro.nivel];
                return (
                  <section
                    key={semana}
                    className={`grid content-start gap-2 border p-3 ${
                      semana === semanaActual ? "border-emerald-300/50 bg-emerald-300/6" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <header className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Semana {indice + 1}</p>
                        <p className="text-base font-semibold text-white">Sábado {formatoCorto(semana)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold uppercase ${nivel.chip}`}>{nivel.texto}</p>
                        <p className="text-xs text-slate-400">
                          {logro.realizadas} realizada(s) · {logro.pctOptimo}%
                        </p>
                      </div>
                    </header>
                    {items.length ? (
                      items.map((item) => (
                        <TarjetaSupervision
                          key={item.id}
                          estado={estadoItem(item, evaluaciones, hoy)}
                          item={item}
                          onIniciar={() =>
                            onIniciar({ docenteId: item.docenteId, cursoId: item.cursoId, anio, trimestre })
                          }
                        />
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Sin cursos disponibles para este sábado.</p>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
              No hay sábados entre el inicio y el fin elegidos. Revisa las fechas.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function TarjetaSupervision({
  estado,
  item,
  onIniciar,
}: {
  estado: EstadoItem;
  item: ItemSupervision;
  onIniciar: () => void;
}) {
  const info = ESTADOS[estado];
  const Icono = info.icono;
  const esOtroDia = item.fecha !== item.semana;
  return (
    <button
      className="group grid gap-1 border border-white/10 bg-slate-950/50 p-2.5 text-left transition hover:border-emerald-300/60 hover:bg-emerald-300/8"
      onClick={onIniciar}
      title="Abrir la evaluación con este docente y curso"
      type="button"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
          <Clock className="h-3.5 w-3.5 text-emerald-300" />
          {item.inicio}
          {item.fin ? `–${item.fin}` : ""}
          {esOtroDia ? <span className="font-normal text-slate-400">({formatoCorto(item.fecha)})</span> : null}
        </span>
        <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px] font-semibold ${info.clase}`}>
          <Icono className="h-3 w-3" />
          {info.texto}
        </span>
      </span>
      <span className="text-sm font-semibold text-slate-100">{item.cursoNombre}</span>
      <span className="text-xs text-slate-300">{item.docenteNombre}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
        <span>{MOTIVOS[item.motivo]}</span>
        {item.virtual ? (
          <span className="inline-flex items-center gap-1">
            <Monitor className="h-3 w-3" /> Virtual
          </span>
        ) : item.edificio ? (
          <span>Salón {item.edificio}</span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1 font-semibold text-emerald-200 opacity-0 transition group-hover:opacity-100">
          <PlayCircle className="h-3 w-3" /> Iniciar
        </span>
      </span>
    </button>
  );
}

function Indicador({
  detalle,
  icono: Icono,
  titulo,
  valor,
}: {
  detalle: string;
  icono: React.ComponentType<{ className?: string }>;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="border border-white/10 bg-white/8 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400">{titulo}</span>
        <Icono className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="text-3xl font-semibold text-white">{valor}</div>
      <div className="mt-1 text-xs text-slate-300">{detalle}</div>
    </div>
  );
}

/**
 * Supervisiones realizadas por semana contra las dos metas: la linea de 1
 * (logro esperado) y la de 2 (logro optimo). El color de cada barra indica el
 * nivel alcanzado y siempre va acompanado de su etiqueta.
 */
function GraficaSemanal({ logros, semanaActual }: { logros: LogroSemana[]; semanaActual: string }) {
  if (!logros.length) return null;
  const tope = Math.max(3, ...logros.map((l) => l.realizadas));
  const alto = (valor: number) => `${(valor / tope) * 100}%`;

  return (
    <figure className="grid gap-3 border border-white/10 bg-white/5 p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">Logro semana a semana</span>
        <span className="flex flex-wrap gap-3 text-xs text-slate-300">
          {(["optimo", "esperado", "sin-logro", "futura"] as const).map((nivel) => (
            <span key={nivel} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${NIVELES[nivel].barra}`} />
              {NIVELES[nivel].texto}
            </span>
          ))}
        </span>
      </figcaption>

      <div className="relative h-44 pl-6">
        {/* Lineas de meta: 1 = esperado, 2 = optimo. */}
        {[1, 2].map((meta) => (
          <div
            key={meta}
            className="pointer-events-none absolute left-6 right-0 border-t border-dashed border-white/25"
            style={{ bottom: alto(meta) }}
          >
            <span className="absolute -left-6 -top-2 text-[10px] font-semibold text-slate-400">{meta}</span>
            <span className="absolute right-0 -top-4 text-[10px] text-slate-400">{meta === 1 ? "Esperado" : "Óptimo"}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 left-6 right-0 flex items-end gap-[2px] border-b border-white/15">
          {logros.map((logro, indice) => (
            <div
              key={logro.semana}
              className="group relative flex h-full flex-1 items-end justify-center"
              title={`Semana ${indice + 1} (sáb. ${formatoCorto(logro.semana)}): ${logro.realizadas} realizada(s) de ${logro.programadas} programada(s) · esperado ${logro.pctEsperado}% · óptimo ${logro.pctOptimo}%`}
            >
              <div
                className={`w-full max-w-10 rounded-t-[4px] transition group-hover:opacity-80 ${NIVELES[logro.nivel].barra}`}
                style={{ height: logro.realizadas ? alto(logro.realizadas) : "3px" }}
              />
              {logro.realizadas ? (
                <span className="absolute text-[11px] font-semibold text-white" style={{ bottom: `calc(${alto(logro.realizadas)} + 2px)` }}>
                  {logro.realizadas}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-[2px] pl-6">
        {logros.map((logro, indice) => (
          <span
            key={logro.semana}
            className={`flex-1 text-center text-[10px] ${logro.semana === semanaActual ? "font-bold text-emerald-200" : "text-slate-400"}`}
          >
            S{indice + 1}
            <span className="hidden sm:inline"> · {formatoCorto(logro.semana)}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}
