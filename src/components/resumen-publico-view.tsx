"use client";

import { BarChart3, Eye, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Trimestre } from "@/data/evaluacion";
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
import { exportResumenGeneralToPdf } from "@/lib/pdf";
import { ResumenGeneralPanel } from "./resumen-general-panel";

type PeriodoValor = Trimestre | "todos";
type Estado = "cargando" | "ok" | "inactivo" | "invalido" | "error";

const PERIODOS: Array<{ label: string; value: PeriodoValor }> = [
  { label: "Trimestre 1", value: 1 },
  { label: "Trimestre 2", value: 2 },
  { label: "Trimestre 3", value: 3 },
  { label: "Todo el año", value: "todos" },
];

const TODOS_LOS_ANIOS = "historico";

/**
 * Vista de solo lectura del "Resumen general" de Coordinacion, para el enlace
 * que se comparte con jefatura. Recibe de una sola vez todo el historial y
 * filtra en el navegador, de modo que quien lo abre puede moverse entre
 * cualquier trimestre y cualquier ano sin necesidad de cuenta. No hay ninguna
 * accion de escritura: ni crear, ni editar, ni borrar.
 */
export function ResumenPublicoView({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [etiqueta, setEtiqueta] = useState("");
  const [mostrarDocentes, setMostrarDocentes] = useState(false);
  const [todas, setTodas] = useState<EvaluacionRow[]>([]);
  const [anio, setAnio] = useState<string>(TODOS_LOS_ANIOS);
  const [periodo, setPeriodo] = useState<PeriodoValor>("todos");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await fetch(`/api/resumen/${token}`);
        const data = (await res.json().catch(() => null)) as
          | { estado?: string; etiqueta?: string; mostrarDocentes?: boolean; evaluaciones?: EvaluacionRow[] }
          | null;
        if (!activo) return;
        if (!res.ok || !data) {
          setEstado("error");
          return;
        }
        if (data.estado !== "ok") {
          setEstado(data.estado === "inactivo" ? "inactivo" : "invalido");
          return;
        }
        setEtiqueta(data.etiqueta ?? "");
        setMostrarDocentes(Boolean(data.mostrarDocentes));
        setTodas(data.evaluaciones ?? []);
        setEstado("ok");
      } catch {
        if (activo) setEstado("error");
      }
    })();
    return () => {
      activo = false;
    };
  }, [token]);

  const anios = useMemo(
    () => Array.from(new Set(todas.map((row) => row.anio))).sort((a, b) => b - a),
    [todas],
  );

  const rows = useMemo(() => {
    const porAnio = anio === TODOS_LOS_ANIOS ? todas : todas.filter((row) => row.anio === Number(anio));
    return periodo === "todos" ? porAnio : porAnio.filter((row) => row.trimestre === periodo);
  }, [todas, anio, periodo]);

  const handleDescargarPdf = async () => {
    if (!todas.length || exportando) return;
    setExportando(true);
    const categoriaAgg = aggregateCategoryAnalytics(todas);
    const fortalezaAgg = aggregateFortalezas(todas);
    const preguntasAgg = aggregateEntrevistaPreguntas(todas);
    await exportResumenGeneralToPdf(
      {
        rows: todas,
        porCurso: agruparPorCurso(todas),
        /* Sin nombres de docente salvo que el enlace los habilite: el PDF no
           debe exponer mas de lo que muestra la pantalla. */
        porDocente: mostrarDocentes ? agruparPorDocente(todas) : [],
        sobresalientes: combinarSobresalientes(categoriaAgg, fortalezaAgg),
        categoriasOportunidad: categoriasConOportunidad(categoriaAgg),
        preguntasDestacadas: [...preguntasAgg].sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0)).slice(0, 2),
        preguntasOportunidad: preguntasConOportunidadReal(preguntasAgg),
        tendenciaCategorias: aggregateTendenciaCategorias(todas),
        promedioGeneralValor: promedioGeneral(todas),
        promedioEntrevistasValor: promedioEntrevistas(todas),
        docentesUnicos: agruparPorDocente(todas).length,
      },
      "resumen-general-historico.pdf",
    );
    setExportando(false);
  };

  return (
    <main className="relative min-h-screen bg-[#08111f] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(16_185_129/0.12),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23/0.4),rgb(2_6_23/0.9))]"
      />
      <div className="coordinacion-scope relative mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        {estado === "cargando" ? <p className="py-16 text-center text-sm text-slate-400">Cargando resumen...</p> : null}

        {estado === "invalido" || estado === "inactivo" || estado === "error" ? (
          <div className="mx-auto grid max-w-md gap-3 border border-white/10 bg-white/6 p-8 text-center backdrop-blur-xl">
            <p className="text-lg font-semibold text-white">No se pudo abrir el resumen</p>
            <p className="text-sm leading-6 text-slate-400">
              {estado === "inactivo"
                ? "Este enlace fue desactivado por la coordinación académica."
                : estado === "error"
                  ? "Error de conexión. Intenta de nuevo en un momento."
                  : "Este enlace no existe o ya no es válido."}
            </p>
          </div>
        ) : null}

        {estado === "ok" ? (
          <div className="grid gap-5">
            <div className="flex flex-col gap-4 border border-white/10 bg-white/6 p-4 backdrop-blur-xl sm:p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
                  <BarChart3 className="h-4 w-4" />
                  Coordinacion academica
                </div>
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">Resumen general</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  Evaluacion docente: resultados de todos los trimestres y todos los anios registrados.
                  {etiqueta ? ` Enlace compartido con: ${etiqueta}.` : ""}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Eye className="h-3.5 w-3.5" />
                  Vista de solo lectura
                </p>
              </div>
              <button
                className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30 disabled:opacity-40"
                disabled={!todas.length || exportando}
                onClick={() => void handleDescargarPdf()}
                title="Incluye todo el historial, sin importar el filtro seleccionado"
                type="button"
              >
                <Printer className="h-4 w-4" />
                {exportando ? "Generando PDF..." : "Descargar informe completo en PDF"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PERIODOS.map((item) => (
                <button
                  key={item.label}
                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                    periodo === item.value
                      ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                      : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
                  }`}
                  onClick={() => setPeriodo(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
              <select className="field w-auto" onChange={(event) => setAnio(event.target.value)} value={anio}>
                <option value={TODOS_LOS_ANIOS}>Todos los años</option>
                {anios.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <ResumenGeneralPanel historicoRows={todas} rows={rows} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
