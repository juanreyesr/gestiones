"use client";

import { CalendarClock, CheckCircle2, ClipboardCheck, Download, FileCheck2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TRIMESTRES, type CarreraRow, type Trimestre } from "@/data/evaluacion";
import {
  aplicarCambio,
  ESTADO_VACIO,
  fetchFechaLimite,
  fetchFilasRevision,
  guardarFechaLimite,
  guardarFilaRevision,
  OPCIONES,
  TIPOS_EVALUACION,
  type CampoFecha,
  type CampoOpcion,
  type EstadoRevision,
  type TipoEvaluacion,
} from "@/lib/control-revision";
import type { FilaControlExcel } from "@/lib/control-revision-excel";
import { fetchCarreras, fetchCursosAdmin, type CursoAdminRow } from "@/lib/cursos-admin";
import { fetchDocentesAdmin, type DocenteAdminRow } from "@/lib/docentes-admin";
import { currentTrimestre } from "@/lib/evaluacion-helpers";
import { formatoLargo, hoyISO } from "@/lib/fechas";
import { esCursoDelCoordinador } from "@/lib/supervision";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT } from "./ui-comun";

type Fila = FilaControlExcel & { cursoId: string };

const VERDES = new Set(["Entregado", "Revisado", "Enviada", "Recibida", "Sí", "OK"]);
const AMBAR = new Set(["Pendiente", "En proceso", "En revisión"]);

function claseValor(valor: string | null) {
  if (!valor) return "border-white/10 bg-slate-950/70 text-slate-500";
  if (VERDES.has(valor)) return "border-emerald-300/40 bg-emerald-300/12 text-emerald-100";
  if (AMBAR.has(valor)) return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  return "border-red-400/40 bg-red-400/10 text-red-200";
}

const CELDA = "border-b border-white/8 px-2 py-1.5 align-middle";
const CONTROL = "w-full min-w-0 border px-1.5 py-1 text-xs outline-none transition focus:border-emerald-300/60 disabled:opacity-40";

/** Columnas con lista, en el orden del formato institucional. */
const COLUMNAS_OPCION: Array<{ campo: CampoOpcion | CampoFecha; titulo: string; ancho: string }> = [
  { campo: "fecha_recepcion", titulo: "Fecha de recepción", ancho: "w-32" },
  { campo: "estado_entrega", titulo: "Estado de entrega", ancho: "w-28" },
  { campo: "fecha_revision", titulo: "Fecha de revisión", ancho: "w-32" },
  { campo: "estatus_revision", titulo: "Estatus de revisión", ancho: "w-28" },
  { campo: "retro_enviada", titulo: "Retroalimentación enviada", ancho: "w-28" },
  { campo: "fecha_retro", titulo: "Fecha retroalimentación", ancho: "w-32" },
  { campo: "version_corregida", titulo: "Versión corregida recibida", ancho: "w-28" },
  { campo: "fecha_version_corregida", titulo: "Fecha versión corregida", ancho: "w-32" },
  { campo: "version_final_aprobada", titulo: "Versión final aprobada", ancho: "w-20" },
  { campo: "fecha_aprobacion", titulo: "Fecha aprobación", ancho: "w-32" },
  { campo: "contenidos_semana6", titulo: "Contenidos hasta semana 6", ancho: "w-28" },
  { campo: "formato_oficial", titulo: "Formato oficial", ancho: "w-20" },
  { campo: "punteo_100", titulo: "Punteo total = 100", ancho: "w-20" },
  { campo: "instrucciones_claras", titulo: "Instrucciones y ponderación claras", ancho: "w-28" },
  { campo: "aplicacion_caso", titulo: "Aplicación / análisis / caso", ancho: "w-28" },
  { campo: "rubrica", titulo: "Rúbrica / criterios (si aplica)", ancho: "w-28" },
];

const esCampoFecha = (campo: string): campo is CampoFecha => campo.startsWith("fecha_");

export function ControlRevisionView() {
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre>(() => currentTrimestre());
  const [tipo, setTipo] = useState<TipoEvaluacion>("parcial");
  const [carreraId, setCarreraId] = useState("");
  const [cursos, setCursos] = useState<CursoAdminRow[]>([]);
  const [carreras, setCarreras] = useState<CarreraRow[]>([]);
  const [docentes, setDocentes] = useState<DocenteAdminRow[]>([]);
  const [estados, setEstados] = useState<Map<string, EstadoRevision>>(new Map());
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);
  const [fechaInicial, setFechaInicial] = useState("");
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");

  const clave = useMemo(() => ({ anio, trimestre, tipo }), [anio, trimestre, tipo]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resCursos, resCarreras, resDocentes, resLimite, resFilas] = await Promise.all([
      fetchCursosAdmin(),
      fetchCarreras(),
      fetchDocentesAdmin(),
      fetchFechaLimite(clave),
      fetchFilasRevision(clave),
    ]);
    setError(resCursos.error ?? resCarreras.error ?? resDocentes.error ?? resLimite.error ?? resFilas.error ?? "");
    setCursos(resCursos.data);
    setCarreras(resCarreras.data);
    setDocentes(resDocentes.data);
    setFechaLimite(resLimite.data);
    setFechaInicial("");
    setEstados(resFilas.data);
    setCargando(false);
  }, [clave]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos del periodo
    cargar();
  }, [cargar]);

  /** Cursos del periodo con docente asignado (sin los cursos propios del coordinador). */
  const cursosPeriodo = useMemo(() => {
    const docentesPorId = new Map(docentes.map((d) => [d.id, d]));
    return cursos.filter((c) => {
      if (!c.activo || c.anio !== anio || c.trimestre !== trimestre || !c.docenteId) return false;
      const nombre = docentesPorId.get(c.docenteId)?.nombre ?? c.docenteNombre;
      return !esCursoDelCoordinador(nombre);
    });
  }, [cursos, docentes, anio, trimestre]);

  const carrerasPeriodo = useMemo(() => {
    const ids = new Set(cursosPeriodo.map((c) => c.carreraId));
    return carreras.filter((c) => ids.has(c.id));
  }, [carreras, cursosPeriodo]);

  const filas: Fila[] = useMemo(() => {
    const docentesPorId = new Map(docentes.map((d) => [d.id, d]));
    const nombreCarrera = new Map(carreras.map((c) => [c.id, c.nombre]));
    return cursosPeriodo
      .filter((c) => !carreraId || c.carreraId === carreraId)
      .sort(
        (a, b) =>
          (nombreCarrera.get(a.carreraId) ?? "").localeCompare(nombreCarrera.get(b.carreraId) ?? "") ||
          a.anioCarrera - b.anioCarrera ||
          a.nombre.localeCompare(b.nombre),
      )
      .map((c) => {
        const docente = c.docenteId ? docentesPorId.get(c.docenteId) : undefined;
        const estado = estados.get(c.id) ?? ESTADO_VACIO;
        return {
          cursoId: c.id,
          campus: estado.campus ?? (c.virtual ? "Virtual" : "Presencial"),
          carrera: nombreCarrera.get(c.carreraId) ?? "",
          curso: c.nombre,
          docente: docente?.nombre ?? c.docenteNombre ?? "",
          correo: docente?.correo ?? "",
          estado,
        };
      });
  }, [cursosPeriodo, carreraId, docentes, carreras, estados]);

  const resumen = useMemo(
    () => ({
      total: filas.length,
      entregadas: filas.filter((f) => f.estado.estado_entrega === "Entregado").length,
      revisadas: filas.filter((f) => f.estado.estatus_revision === "Revisado").length,
      aprobadas: filas.filter((f) => f.estado.version_final_aprobada === "Sí").length,
    }),
    [filas],
  );

  const cambiar = (cursoId: string, campo: Parameters<typeof aplicarCambio>[1], valor: string | null) => {
    const actual = estados.get(cursoId) ?? ESTADO_VACIO;
    const nuevo = aplicarCambio(actual, campo, valor, hoyISO());
    setEstados((previo) => new Map(previo).set(cursoId, nuevo));
    guardarFilaRevision(clave, cursoId, nuevo).then(({ error: errorGuardado }) => {
      if (errorGuardado) {
        setError(`No se guardó el cambio: ${errorGuardado}`);
        setEstados((previo) => new Map(previo).set(cursoId, actual));
      }
    });
  };

  const actualizarLimite = async (valor: string) => {
    if (!valor) return;
    const previo = fechaLimite;
    setFechaLimite(valor);
    const { error: errorGuardado } = await guardarFechaLimite(clave, valor);
    if (errorGuardado) {
      setError(`No se guardó la fecha límite: ${errorGuardado}`);
      setFechaLimite(previo);
    }
  };

  const handleExportar = async () => {
    if (exportando || !fechaLimite) return;
    setExportando(true);
    try {
      const { exportControlRevisionToExcel } = await import("@/lib/control-revision-excel");
      await exportControlRevisionToExcel({ anio, trimestre, tipo, fechaLimite, filas });
    } catch (e) {
      setError(`No se generó el Excel: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExportando(false);
    }
  };

  const tipoTexto = tipo === "parcial" ? "parciales" : "finales";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ClipboardCheck className="h-5 w-5 text-emerald-200" />
            Control de revisión de evaluaciones
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Entrega y revisión de las evaluaciones {tipoTexto} de cada docente del trimestre. Al marcar
            &quot;Entregado&quot; se inicia la revisión con los valores del formato; las fechas de revisión,
            retroalimentación, versión corregida y aprobación se ponen solas al cambiar su estado (y se pueden corregir).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={BTN_GHOST} disabled={cargando} onClick={cargar} type="button">
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            className={BTN_PRIMARY}
            disabled={exportando || !fechaLimite || !filas.length}
            onClick={handleExportar}
            type="button"
          >
            <Download className="h-4 w-4" />
            {exportando ? "Generando..." : "Descargar Excel"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Año">
          <input className={INPUT} min={2024} type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
        </Field>
        <Field label="Trimestre">
          <select className={INPUT} value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value) as Trimestre)}>
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>
                Trimestre {t}
                {t === currentTrimestre() && anio === new Date().getFullYear() ? " (activo)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Evaluación">
          <select className={INPUT} value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvaluacion)}>
            {TIPOS_EVALUACION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Carrera">
          <select className={INPUT} value={carreraId} onChange={(e) => setCarreraId(e.target.value)}>
            <option value="">Todas las carreras</option>
            {carrerasPeriodo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha límite de entrega">
          <input
            className={INPUT}
            disabled={!fechaLimite}
            type="date"
            value={fechaLimite ?? ""}
            onChange={(e) => actualizarLimite(e.target.value)}
          />
        </Field>
      </div>

      <ErrorBanner message={error} />

      {cargando ? (
        <EmptyState>Cargando el control del periodo...</EmptyState>
      ) : !fechaLimite ? (
        <form
          className="grid max-w-xl gap-3 border border-amber-300/40 bg-amber-300/8 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            actualizarLimite(fechaInicial);
          }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <CalendarClock className="h-4 w-4" />
            Primera vez en las evaluaciones {tipoTexto} del {anio}, trimestre {trimestre}
          </p>
          <p className="text-sm text-slate-300">
            Indica la fecha límite de entrega: se cargará en todas las filas de esta evaluación ({cursosPeriodo.length}{" "}
            cursos con docente asignado). Después se puede cambiar arriba.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              className={`${INPUT} max-w-48`}
              required
              type="date"
              value={fechaInicial}
              onChange={(e) => setFechaInicial(e.target.value)}
            />
            <button className={BTN_PRIMARY} disabled={!fechaInicial} type="submit">
              Iniciar control
            </button>
          </div>
        </form>
      ) : !filas.length ? (
        <EmptyState>
          No hay cursos activos con docente asignado en el {anio}, trimestre {trimestre}. Asígnalos en &quot;Control de
          cursos y docentes&quot;.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="border border-white/10 bg-white/6 px-3 py-1.5 text-slate-200">
              Fecha límite: {formatoLargo(fechaLimite)}
            </span>
            <span className="inline-flex items-center gap-1.5 border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">
              <FileCheck2 className="h-3.5 w-3.5" />
              Entregadas {resumen.entregadas} de {resumen.total}
            </span>
            <span className="border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-sky-100">
              Revisadas {resumen.revisadas}
            </span>
            <span className="inline-flex items-center gap-1.5 border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprobadas {resumen.aprobadas}
            </span>
          </div>

          <div className="overflow-x-auto border border-white/10">
            <table className="w-max min-w-full border-collapse text-left text-xs text-slate-200">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide">
                  <th className="bg-yellow-300 px-2 py-1 text-center text-slate-950" colSpan={18}>
                    Administrativo
                  </th>
                  <th className="bg-amber-400 px-2 py-1 text-center text-slate-950" colSpan={7}>
                    Pedagógico
                  </th>
                </tr>
                <tr className="bg-[#0f2b5b] text-[11px] font-semibold text-white">
                  <th className="sticky left-0 z-10 bg-[#0f2b5b] px-2 py-2">No.</th>
                  <th className="px-2 py-2">Campus / modalidad</th>
                  <th className="px-2 py-2">Carrera</th>
                  <th className="px-2 py-2">Curso</th>
                  <th className="px-2 py-2">Docente</th>
                  <th className="px-2 py-2">Correo docente</th>
                  <th className="px-2 py-2">Fecha límite de entrega</th>
                  <th className="px-2 py-2">{COLUMNAS_OPCION[0].titulo}</th>
                  <th className="px-2 py-2">{COLUMNAS_OPCION[1].titulo}</th>
                  <th className="px-2 py-2">Revisor / coordinador</th>
                  {COLUMNAS_OPCION.slice(2).map((col) => (
                    <th key={col.campo} className="max-w-32 px-2 py-2 whitespace-normal">
                      {col.titulo}
                    </th>
                  ))}
                  <th className="px-2 py-2">Observaciones / seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => {
                  const entregado = fila.estado.estado_entrega === "Entregado";
                  const celdaOpcion = (campo: CampoOpcion | CampoFecha, ancho: string) => {
                    const valor = fila.estado[campo];
                    if (esCampoFecha(campo)) {
                      return (
                        <td key={campo} className={CELDA}>
                          <input
                            className={`${CONTROL} ${ancho} border-white/10 bg-slate-950/70 text-slate-100`}
                            disabled={!entregado}
                            type="date"
                            value={valor ?? ""}
                            onChange={(e) => cambiar(fila.cursoId, campo, e.target.value || null)}
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={campo} className={CELDA}>
                        <select
                          className={`${CONTROL} ${ancho} ${claseValor(valor)}`}
                          disabled={campo !== "estado_entrega" && !entregado}
                          value={valor ?? ""}
                          onChange={(e) => cambiar(fila.cursoId, campo, e.target.value)}
                        >
                          {valor ? null : <option value="">—</option>}
                          {OPCIONES[campo].map((opcion) => (
                            <option key={opcion} value={opcion}>
                              {opcion}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  };
                  return (
                    <tr key={fila.cursoId} className={i % 2 === 0 ? "bg-white/[0.03]" : ""}>
                      <td className={`${CELDA} sticky left-0 z-10 bg-slate-950 text-center font-semibold`}>{i + 1}</td>
                      <td className={CELDA}>
                        <input
                          key={`${fila.cursoId}-${fila.campus}`}
                          className={`${CONTROL} w-28 border-white/10 bg-slate-950/70 text-slate-100`}
                          defaultValue={fila.campus}
                          onBlur={(e) => {
                            const valor = e.target.value.trim();
                            if (valor && valor !== fila.campus) cambiar(fila.cursoId, "campus", valor);
                          }}
                        />
                      </td>
                      <td className={`${CELDA} max-w-48 whitespace-normal`}>{fila.carrera}</td>
                      <td className={`${CELDA} max-w-48 whitespace-normal font-semibold text-white`}>{fila.curso}</td>
                      <td className={`${CELDA} max-w-48 whitespace-normal`}>{fila.docente}</td>
                      <td className={CELDA}>{fila.correo}</td>
                      <td className={`${CELDA} text-center`}>{fechaDMY(fechaLimite)}</td>
                      {celdaOpcion("fecha_recepcion", "w-32")}
                      {celdaOpcion("estado_entrega", "w-28")}
                      <td className={`${CELDA} whitespace-nowrap`}>{fila.estado.revisor ?? ""}</td>
                      {COLUMNAS_OPCION.slice(2).map((col) => celdaOpcion(col.campo, col.ancho))}
                      <td className={CELDA}>
                        <textarea
                          key={`${fila.cursoId}-${fila.estado.observaciones ?? ""}`}
                          className={`${CONTROL} w-64 resize-y border-white/10 bg-slate-950/70 text-slate-100`}
                          defaultValue={fila.estado.observaciones ?? ""}
                          maxLength={2000}
                          placeholder="Observaciones..."
                          rows={1}
                          onBlur={(e) => {
                            const valor = e.target.value.trim();
                            if (valor !== (fila.estado.observaciones ?? "")) {
                              cambiar(fila.cursoId, "observaciones", valor || null);
                            }
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Se listan los cursos activos del trimestre con docente asignado (sin tus cursos propios). Al aprobar la versión
            final, lo que esté &quot;En revisión&quot; pasa a &quot;Sí&quot; y la rúbrica a &quot;OK&quot;; cada columna
            también se puede aprobar por separado.
          </p>
        </>
      )}
    </div>
  );
}

function fechaDMY(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
