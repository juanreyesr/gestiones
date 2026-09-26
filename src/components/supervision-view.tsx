"use client";

import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Clock,
  Download,
  LayoutGrid,
  Monitor,
  PlayCircle,
  RefreshCw,
  Table2,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TRIMESTRES, type CarreraRow, type DocenteRow, type Trimestre } from "@/data/evaluacion";
import { fetchCarreras, fetchCursosAdmin, type CursoAdminRow } from "@/lib/cursos-admin";
import { currentTrimestre, fetchEvaluacionesPorPeriodo, type EvaluacionRow } from "@/lib/evaluacion-helpers";
import { formatoCorto, hoyISO } from "@/lib/fechas";
import {
  esCursoDelCoordinador,
  estadoItem,
  finPorDefecto,
  generarPlan,
  horasDeHorario,
  inicioClasesPorDefecto,
  logroSemanal,
  marcaCelda,
  mesDeFecha,
  MINIMO_POR_SABADO,
  rotuloTrimestreCarrera,
  sabadoDeSemana,
  sabadoEnOPosterior,
  sabadosEntre,
  type EstadoItem,
  type ItemSupervision,
  type LogroSemana,
  type MarcaCelda,
} from "@/lib/supervision";
import type { GrupoProgramacion, SupervisionRealizada } from "@/lib/supervision-excel";
import { ErrorBanner, Field, INPUT } from "./ui-comun";

export type IniciarSupervision = {
  docenteId: string;
  cursoId: string;
  anio: number;
  trimestre: Trimestre;
};

/**
 * inicioClases: sabado de la semana 1 del trimestre (desde ahi se mide el
 * logro, retroactivo incluido). inicio: desde cuando se reparte la propuesta.
 * parcial: numero de semana de parciales, sin supervisiones programadas.
 */
type Rango = { inicioClases: string; inicio: string; fin: string; parcial: number | null };

const SEMANA_PARCIAL_POR_DEFECTO = 8;

const claveRango = (anio: number, trimestre: Trimestre) => `gestionesjj:supervision:${anio}-T${trimestre}`;

/**
 * El rango se fija la primera vez que se abre el periodo: si el inicio del
 * plan se recalculara con "hoy" en cada visita, la propuesta se correria sola
 * cada semana. Se guarda solo en este navegador (es una preferencia de vista).
 */
function leerRango(anio: number, trimestre: Trimestre): Rango {
  const fin = finPorDefecto(anio, trimestre);
  const porDefecto: Rango = {
    inicioClases: inicioClasesPorDefecto(fin),
    inicio: sabadoEnOPosterior(hoyISO()),
    fin,
    parcial: SEMANA_PARCIAL_POR_DEFECTO,
  };
  try {
    const guardado = window.localStorage.getItem(claveRango(anio, trimestre));
    if (guardado) {
      const valor = JSON.parse(guardado) as Partial<Rango>;
      if (valor.inicio && valor.fin) {
        // Rangos guardados antes de existir la semana 1 y los parciales.
        return {
          inicioClases: valor.inicioClases ?? inicioClasesPorDefecto(valor.fin),
          inicio: valor.inicio,
          fin: valor.fin,
          parcial: valor.parcial === undefined ? SEMANA_PARCIAL_POR_DEFECTO : valor.parcial,
        };
      }
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
  parcial: { texto: "Parciales", barra: "bg-sky-300/40", chip: "text-sky-200" },
};

const MARCAS: Record<Exclude<MarcaCelda, "">, { clase: string; titulo: string }> = {
  X: { clase: "bg-emerald-300/25 text-emerald-100", titulo: "Supervisión realizada: abrir la evaluación" },
  P: { clase: "bg-amber-300/20 text-amber-100", titulo: "Programada: iniciar la supervisión" },
  NR: { clase: "bg-red-400/20 text-red-200", titulo: "Programada y no realizada: iniciar la supervisión" },
};

type Origen = "plan" | "retroactiva" | "fuera-plan";

const ORIGENES: Record<Origen, string> = {
  plan: "Del plan",
  retroactiva: "Antes del plan",
  "fuera-plan": "Fuera del plan",
};

export function SupervisionView({
  docentes,
  onAbrirEvaluacion,
  onIniciar,
}: {
  docentes: DocenteRow[];
  onAbrirEvaluacion: (row: EvaluacionRow) => void;
  onIniciar: (datos: IniciarSupervision) => void;
}) {
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre>(() => currentTrimestre());
  const [rango, setRango] = useState<Rango | null>(null);
  const [vista, setVista] = useState<"calendario" | "formato">("calendario");
  const [cursos, setCursos] = useState<CursoAdminRow[]>([]);
  const [carreras, setCarreras] = useState<CarreraRow[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const hoy = hoyISO();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el rango vive en localStorage, solo existe en el navegador
    setRango(leerRango(anio, trimestre));
  }, [anio, trimestre]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resCursos, resEvaluaciones, resCarreras] = await Promise.all([
      fetchCursosAdmin(),
      fetchEvaluacionesPorPeriodo(anio, trimestre),
      fetchCarreras(),
    ]);
    setError(resCursos.error ?? resEvaluaciones.error ?? resCarreras.error ?? "");
    setCursos(resCursos.data);
    setEvaluaciones(resEvaluaciones.data);
    setCarreras(resCarreras.data);
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

  /** Cursos que se pueden supervisar (docente activo y no es el coordinador). */
  const planificables = useMemo(
    () => new Set(cursosPeriodo.filter((c) => c.docenteId && docentesActivos.has(c.docenteId)).map((c) => c.id)),
    [cursosPeriodo, docentesActivos],
  );

  const semanas = useMemo(() => (rango ? sabadosEntre(rango.inicioClases, rango.fin) : []), [rango]);
  const semanaParcial = rango?.parcial ? (semanas[rango.parcial - 1] ?? null) : null;

  const plan = useMemo(() => {
    if (!rango) return null;
    const previas = evaluaciones.filter((e) => e.fecha_observacion < rango.inicio);
    return generarPlan({
      cursos: cursosPeriodo
        .filter((c) => planificables.has(c.id))
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
      semanasExcluidas: semanaParcial ? new Set([semanaParcial]) : undefined,
    });
  }, [rango, evaluaciones, cursosPeriodo, planificables, docentesActivos, semanaParcial]);

  const itemsPorSemana = useMemo(() => new Map(plan?.semanas.map((s) => [s.semana, s.items]) ?? []), [plan]);
  const itemPorCursoSemana = useMemo(() => {
    const mapa = new Map<string, ItemSupervision>();
    for (const s of plan?.semanas ?? []) for (const item of s.items) mapa.set(`${item.cursoId}|${s.semana}`, item);
    return mapa;
  }, [plan]);

  /** De donde viene cada evaluacion: del plan, de antes del plan, o fuera de el. */
  const origenDe = useCallback(
    (e: EvaluacionRow): Origen => {
      const semana = sabadoDeSemana(e.fecha_observacion);
      if (rango && semana < sabadoEnOPosterior(rango.inicio)) return "retroactiva";
      return e.curso_id && itemPorCursoSemana.has(`${e.curso_id}|${semana}`) ? "plan" : "fuera-plan";
    },
    [rango, itemPorCursoSemana],
  );

  const logros = useMemo(
    () =>
      logroSemanal({
        semanas,
        programadasPorSemana: new Map([...itemsPorSemana].map(([semana, items]) => [semana, items.length])),
        evaluaciones,
        hoy,
        parcial: semanaParcial,
      }),
    [semanas, itemsPorSemana, evaluaciones, hoy, semanaParcial],
  );

  const indicadores = useMemo(() => {
    const cerradas = logros.filter((l) => l.nivel !== "futura" && l.nivel !== "parcial");
    const promedio = (valores: number[]) =>
      valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
    const items = plan?.semanas.flatMap((s) => s.items) ?? [];
    const cumplidas = items.filter((i) => {
      const estado = estadoItem(i, evaluaciones, hoy);
      return estado === "realizada" || estado === "otra-fecha";
    }).length;
    const docentesPeriodo = new Set(
      cursosPeriodo.filter((c) => planificables.has(c.id)).map((c) => c.docenteId as string),
    );
    const docentesVistos = new Set(evaluaciones.map((e) => e.docente_id).filter((id) => id && docentesPeriodo.has(id)));
    const cursosVistos = new Set(evaluaciones.map((e) => e.curso_id).filter((id) => id && planificables.has(id)));
    return {
      semanasCerradas: cerradas.length,
      logroEsperado: promedio(cerradas.map((l) => l.pctEsperado)),
      logroOptimo: promedio(cerradas.map((l) => l.pctOptimo)),
      semanasOptimas: cerradas.filter((l) => l.nivel === "optimo").length,
      cumplidas,
      programadas: items.length,
      totalRealizadas: evaluaciones.length,
      fueraDelPlan: evaluaciones.filter((e) => origenDe(e) !== "plan").length,
      docentesVistos: docentesVistos.size,
      docentesTotal: docentesPeriodo.size,
      cursosVistos: cursosVistos.size,
      cursosTotal: planificables.size,
    };
  }, [logros, plan, evaluaciones, hoy, cursosPeriodo, planificables, origenDe]);

  /** Filas del formato institucional: una seccion por trimestre de la carrera. */
  const grupos = useMemo(() => {
    const nombreCarrera = new Map(carreras.map((c) => [c.id, c.nombre]));
    const porGrupo = new Map<string, { rotulo: string; orden: string; cursos: CursoAdminRow[] }>();
    for (const curso of cursosDelPeriodo) {
      const clave = `${curso.carreraId}|${curso.anioCarrera}`;
      const carrera = nombreCarrera.get(curso.carreraId) ?? "";
      const grupo = porGrupo.get(clave) ?? {
        rotulo: rotuloTrimestreCarrera(curso.anioCarrera, trimestre, carrera),
        orden: `${carrera}|${curso.anioCarrera}`,
        cursos: [],
      };
      grupo.cursos.push(curso);
      porGrupo.set(clave, grupo);
    }
    return [...porGrupo.values()]
      .sort((a, b) => a.orden.localeCompare(b.orden))
      .map((g) => ({
        rotulo: g.rotulo,
        cursos: g.cursos.sort(
          (a, b) => (a.horario ?? "").localeCompare(b.horario ?? "") || a.nombre.localeCompare(b.nombre),
        ),
      }));
  }, [carreras, cursosDelPeriodo, trimestre]);

  const marcaDe = useCallback(
    (cursoId: string, semana: string) =>
      marcaCelda({ cursoId, semana, evaluaciones, item: itemPorCursoSemana.get(`${cursoId}|${semana}`), hoy }),
    [evaluaciones, itemPorCursoSemana, hoy],
  );

  const iniciarCurso = (curso: CursoAdminRow) => {
    if (!curso.docenteId || !planificables.has(curso.id)) return;
    onIniciar({ docenteId: curso.docenteId, cursoId: curso.id, anio, trimestre });
  };

  const handleExportar = async () => {
    if (exportando) return;
    setExportando(true);
    const { exportSupervisionToExcel } = await import("@/lib/supervision-excel");
    const gruposExcel: GrupoProgramacion[] = grupos.map((g) => ({
      rotulo: g.rotulo,
      filas: g.cursos.map((c) => ({
        docente: nombreDocente(c) ?? (c.virtual ? "UPANA virtual" : ""),
        curso: c.nombre,
        nrc: c.nrc ?? "",
        horario: horasDeHorario(c.horario),
        marcas: semanas.map((semana) => marcaDe(c.id, semana)),
      })),
    }));
    const realizadas: SupervisionRealizada[] = [...evaluaciones]
      .sort((a, b) => a.fecha_observacion.localeCompare(b.fecha_observacion))
      .map((e) => {
        const indice = semanas.indexOf(sabadoDeSemana(e.fecha_observacion));
        return {
          fecha: e.fecha_observacion,
          semana: indice === -1 ? null : indice + 1,
          docente: e.docente_nombre,
          curso: e.curso_nombre,
          porcentaje: e.porcentaje,
          origen: ORIGENES[origenDe(e)],
        };
      });
    await exportSupervisionToExcel({
      anio,
      trimestre,
      semanas,
      parcial: semanaParcial,
      grupos: gruposExcel,
      logros,
      realizadas,
    });
    setExportando(false);
  };

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
            por sábado y nunca dos a la misma hora. Las evaluaciones ya registradas (antes del plan o fuera de él) también cuentan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 bg-emerald-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
            disabled={cargando || exportando || !semanas.length}
            onClick={handleExportar}
            type="button"
          >
            <Download className="h-4 w-4" />
            {exportando ? "Generando..." : "Descargar Excel"}
          </button>
          <button
            className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60"
            disabled={cargando}
            onClick={cargar}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
        <Field label="Semana 1 (inicio de clases)">
          <input
            className={INPUT}
            type="date"
            value={rango?.inicioClases ?? ""}
            onChange={(e) => e.target.value && actualizarRango({ inicioClases: e.target.value })}
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
        <Field label="Plan desde">
          <input
            className={INPUT}
            type="date"
            value={rango?.inicio ?? ""}
            onChange={(e) => e.target.value && actualizarRango({ inicio: e.target.value })}
          />
        </Field>
        <Field label="Semana de parciales">
          <select
            className={INPUT}
            value={rango?.parcial ?? ""}
            onChange={(e) => actualizarRango({ parcial: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Ninguna</option>
            {semanas.map((semana, i) => (
              <option key={semana} value={i + 1}>
                Semana {i + 1} · {formatoCorto(semana)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        {semanas.length} semanas de clase. Las evaluaciones anteriores a &quot;Plan desde&quot; se descuentan de la propuesta; las
        posteriores solo marcan el avance, así el calendario no se reacomoda solo. En la semana de parciales no se programan
        supervisiones ni se exige meta.{" "}
        <button
          className="font-semibold text-emerald-200 underline-offset-2 hover:underline"
          onClick={() => actualizarRango({ inicio: sabadoEnOPosterior(hoy) })}
          type="button"
        >
          Replanificar desde este sábado
        </button>
      </p>

      <ErrorBanner message={error} />

      {cargando && !semanas.length ? <p className="text-sm text-slate-300">Cargando cursos y evaluaciones...</p> : null}

      {plan ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Indicador
              detalle={`${indicadores.semanasCerradas} semana(s) transcurrida(s) · meta: 1 por semana`}
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
              detalle={`${indicadores.cumplidas} de ${indicadores.programadas} supervisiones del plan`}
              icono={CalendarCheck2}
              titulo="Avance del plan"
              valor={`${indicadores.programadas ? Math.round((indicadores.cumplidas / indicadores.programadas) * 100) : 0}%`}
            />
            <Indicador
              detalle={`${indicadores.fueraDelPlan} antes o fuera del plan`}
              icono={ClipboardCheck}
              titulo="Supervisiones realizadas"
              valor={`${indicadores.totalRealizadas}`}
            />
            <Indicador
              detalle={`Cursos: ${indicadores.cursosVistos} de ${indicadores.cursosTotal} supervisados`}
              icono={Users}
              titulo="Docentes supervisados"
              valor={`${indicadores.docentesVistos}/${indicadores.docentesTotal}`}
            />
          </div>

          <GraficaSemanal logros={logros} semanaActual={semanaActual} />

          {plan.docentesSinCupo.length ||
          plan.cursosSinCupo.length ||
          plan.sinHorario.length ||
          cursosSinDocente.length ||
          cursosPropios.length ? (
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

          <div className="flex flex-wrap gap-2">
            {(
              [
                { valor: "calendario", texto: "Calendario", icono: LayoutGrid },
                { valor: "formato", texto: "Formato institucional", icono: Table2 },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.valor}
                className={`inline-flex items-center gap-2 border px-3 py-1.5 text-sm font-semibold transition ${
                  vista === opcion.valor
                    ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                    : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
                }`}
                onClick={() => setVista(opcion.valor)}
                type="button"
              >
                <opcion.icono className="h-4 w-4" />
                {opcion.texto}
              </button>
            ))}
          </div>

          {!semanas.length ? (
            <p className="border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
              No hay sábados entre el inicio y el fin de clases elegidos. Revisa las fechas.
            </p>
          ) : vista === "formato" ? (
            <TablaFormato
              grupos={grupos}
              marcaDe={marcaDe}
              nombreDocente={nombreDocente}
              onAbrir={(cursoId, semana) => {
                const evaluacion = evaluaciones.find(
                  (e) => e.curso_id === cursoId && sabadoDeSemana(e.fecha_observacion) === semana,
                );
                if (evaluacion) onAbrirEvaluacion(evaluacion);
              }}
              onIniciar={iniciarCurso}
              planificables={planificables}
              semanaActual={semanaActual}
              semanaParcial={semanaParcial}
              semanas={semanas}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {semanas.map((semana, indice) => {
                const logro = logros[indice];
                const nivel = NIVELES[logro.nivel];
                const items = itemsPorSemana.get(semana) ?? [];
                const cursosDelPlan = new Set(items.map((i) => i.cursoId));
                const registradas = evaluaciones.filter(
                  (e) => sabadoDeSemana(e.fecha_observacion) === semana && !(e.curso_id && cursosDelPlan.has(e.curso_id)),
                );
                const esRetro = rango ? semana < sabadoEnOPosterior(rango.inicio) : false;
                return (
                  <section
                    key={semana}
                    className={`grid content-start gap-2 border p-3 ${
                      semana === semanaActual ? "border-emerald-300/50 bg-emerald-300/6" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <header className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Semana {indice + 1}
                          {semana === semanaParcial ? " · Parcial" : ""}
                          {esRetro ? " · Retroactivo" : ""}
                        </p>
                        <p className="text-base font-semibold text-white">Sábado {formatoCorto(semana)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold uppercase ${nivel.chip}`}>{nivel.texto}</p>
                        <p className="text-xs text-slate-400">
                          {logro.realizadas} realizada(s){logro.nivel === "parcial" ? "" : ` · ${logro.pctOptimo}%`}
                        </p>
                      </div>
                    </header>
                    {items.map((item) => (
                      <TarjetaSupervision
                        key={item.id}
                        estado={estadoItem(item, evaluaciones, hoy)}
                        item={item}
                        onIniciar={() => {
                          const hecha = evaluaciones.find(
                            (e) => e.curso_id === item.cursoId && sabadoDeSemana(e.fecha_observacion) === semana,
                          );
                          if (hecha) onAbrirEvaluacion(hecha);
                          else onIniciar({ docenteId: item.docenteId, cursoId: item.cursoId, anio, trimestre });
                        }}
                      />
                    ))}
                    {registradas.map((e) => (
                      <TarjetaRegistrada key={e.id} evaluacion={e} onAbrir={() => onAbrirEvaluacion(e)} origen={origenDe(e)} />
                    ))}
                    {!items.length && !registradas.length ? (
                      <p className="text-xs text-slate-400">
                        {semana === semanaParcial
                          ? "Semana de parciales: sin supervisiones programadas."
                          : esRetro
                            ? "Sin supervisiones registradas."
                            : "Sin cursos disponibles para este sábado."}
                      </p>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/** Evaluacion registrada que no estaba en el plan de esa semana. */
function TarjetaRegistrada({
  evaluacion,
  onAbrir,
  origen,
}: {
  evaluacion: EvaluacionRow;
  onAbrir: () => void;
  origen: Origen;
}) {
  return (
    <button
      className="grid gap-1 border border-sky-300/25 bg-sky-300/6 p-2.5 text-left transition hover:border-sky-300/60"
      onClick={onAbrir}
      title="Abrir la evaluación registrada"
      type="button"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-300">{formatoCorto(evaluacion.fecha_observacion)}</span>
        <span className="inline-flex items-center gap-1 border border-emerald-300/50 bg-emerald-300/12 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-100">
          <CheckCircle2 className="h-3 w-3" />
          {ORIGENES[origen]} · {evaluacion.porcentaje}%
        </span>
      </span>
      <span className="text-sm font-semibold text-slate-100">{evaluacion.curso_nombre}</span>
      <span className="text-xs text-slate-300">{evaluacion.docente_nombre}</span>
    </button>
  );
}

/**
 * El formato que pide la institucion: meses arriba, una columna por semana,
 * secciones por trimestre de la carrera y la marca de cada supervision. Cada
 * celda es un acceso directo: X abre la evaluacion, P/NR la inicia, y una
 * celda vacia registra una supervision fuera del plan.
 */
function TablaFormato({
  grupos,
  marcaDe,
  nombreDocente,
  onAbrir,
  onIniciar,
  planificables,
  semanaActual,
  semanaParcial,
  semanas,
}: {
  grupos: Array<{ rotulo: string; cursos: CursoAdminRow[] }>;
  marcaDe: (cursoId: string, semana: string) => MarcaCelda;
  nombreDocente: (c: CursoAdminRow) => string | null;
  onAbrir: (cursoId: string, semana: string) => void;
  onIniciar: (curso: CursoAdminRow) => void;
  planificables: Set<string>;
  semanaActual: string;
  semanaParcial: string | null;
  semanas: string[];
}) {
  const meses: Array<{ mes: string; columnas: number }> = [];
  for (const semana of semanas) {
    const mes = mesDeFecha(semana);
    const ultimo = meses[meses.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.columnas += 1;
    else meses.push({ mes, columnas: 1 });
  }
  const celdaFija = "border border-white/15 px-2 py-1.5";
  const primerNumero = grupos.map((_, i) => grupos.slice(0, i).reduce((n, g) => n + g.cursos.length, 1));

  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto border border-white/10">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-0" colSpan={5} />
              {meses.map((m, i) => (
                <th key={`${m.mes}-${i}`} className="border border-white/15 bg-sky-300/12 px-2 py-1 font-semibold text-sky-100" colSpan={m.columnas}>
                  {m.mes}
                </th>
              ))}
            </tr>
            <tr className="bg-[#1f4e79] text-white">
              <th className={celdaFija}>No.</th>
              <th className={`${celdaFija} min-w-44 text-left`}>Docente</th>
              <th className={`${celdaFija} min-w-48 text-left`}>Curso</th>
              <th className={celdaFija}>NRC</th>
              <th className={`${celdaFija} whitespace-nowrap`}>Horario -sábado-</th>
              {semanas.map((semana, i) => (
                <th
                  key={semana}
                  className={`${celdaFija} min-w-16 font-semibold ${semana === semanaActual ? "bg-emerald-400/30" : ""}`}
                  title={`Sábado ${formatoCorto(semana)}`}
                >
                  Semana {i + 1}
                  <span className="block text-[10px] font-normal text-slate-200">
                    {semana === semanaParcial ? "PARCIAL" : formatoCorto(semana)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo, indiceGrupo) => (
              <GrupoFilas key={grupo.rotulo} columnas={5 + semanas.length} rotulo={grupo.rotulo}>
                {grupo.cursos.map((curso, indiceCurso) => {
                  const numero = primerNumero[indiceGrupo] + indiceCurso;
                  const supervisable = planificables.has(curso.id);
                  return (
                    <tr key={curso.id} className="text-slate-200">
                      <td className={`${celdaFija} text-center text-slate-400`}>{numero}</td>
                      <td className={celdaFija}>{nombreDocente(curso) ?? (curso.virtual ? "UPANA virtual" : "—")}</td>
                      <td className={celdaFija}>{curso.nombre}</td>
                      <td className={`${celdaFija} text-center`}>{curso.nrc ?? ""}</td>
                      <td className={`${celdaFija} whitespace-nowrap text-center`}>{horasDeHorario(curso.horario)}</td>
                      {semanas.map((semana) => {
                        const marca = marcaDe(curso.id, semana);
                        const esParcial = semana === semanaParcial;
                        const accion = marca === "X" ? () => onAbrir(curso.id, semana) : supervisable ? () => onIniciar(curso) : null;
                        return (
                          <td
                            key={semana}
                            className={`border border-white/15 p-0 text-center ${esParcial && !marca ? "bg-white/8" : ""}`}
                          >
                            {accion ? (
                              <button
                                className={`h-8 w-full font-bold transition hover:bg-emerald-300/30 ${marca ? MARCAS[marca].clase : "text-transparent hover:text-emerald-200"}`}
                                onClick={accion}
                                title={marca ? MARCAS[marca].titulo : "Registrar una supervisión fuera del plan"}
                                type="button"
                              >
                                {marca || "+"}
                              </button>
                            ) : (
                              <span className="block h-8" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </GrupoFilas>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          <b className="text-emerald-200">X</b> realizada (toca para abrir la evaluación)
        </span>
        <span>
          <b className="text-amber-200">P</b> programada
        </span>
        <span>
          <b className="text-red-300">NR</b> programada y no realizada
        </span>
        <span>
          <b className="text-emerald-200">+</b> celda vacía: registrar una supervisión fuera del plan
        </span>
      </p>
    </div>
  );
}

function GrupoFilas({ children, columnas, rotulo }: { children: React.ReactNode; columnas: number; rotulo: string }) {
  return (
    <>
      <tr>
        <td className="border border-white/15 bg-sky-300/14 px-2 py-1.5 text-sm font-semibold text-sky-50" colSpan={columnas}>
          {rotulo}
        </td>
      </tr>
      {children}
    </>
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
          {(["optimo", "esperado", "sin-logro", "futura", "parcial"] as const).map((nivel) => (
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
