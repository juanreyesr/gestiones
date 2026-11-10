"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConsentimientoRow } from "@/lib/clinica/pacientes";
import { formatoFechaCorta, formatoHora } from "@/lib/clinica/slots";
import type { CitaRow, CompromisoRow, PacienteRow, SesionRow } from "@/lib/clinica/types";
import {
  atencionDe,
  fetchEvaluacionesDePaciente,
  fetchInformesDeRespuestas,
  fetchSeguimientos,
  type EvaluacionRespuestaRow,
  type EvaluacionRow,
  type InformeRow,
  type SeguimientoRow,
} from "@/lib/evaluaciones/evaluaciones";
import { deteriorosFiables, diasDesde, evolucionDelPaciente } from "@/lib/evaluaciones/evolucion-paciente";
import { nombreCortoInstrumento } from "@/lib/evaluaciones/registro";
import { resumenRespuesta } from "@/lib/evaluaciones/resumen-respuesta";
import { AlarmaAtencion } from "./alarma-atencion";
import { abrirSeccion, EVENTO_ABRIR_RESPUESTA, EVENTO_EVALUACIONES_CAMBIO, plegarTodas } from "./seccion-plegable";

const DIAS_REEVALUACION = 28;
const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);
const nombreInstrumento = (instrumento: string, opciones?: Record<string, unknown>) =>
  instrumento === "eapi" ? nombreCortoInstrumento(instrumento, opciones) : nombreCortoInstrumento(instrumento, opciones).replace(/ \([^)]*\)$/, "");

type Punto = { clave: string; nivel: "urgente" | "revisar" | "info"; texto: string; detalle?: string; ir?: () => void; etiquetaIr?: string };

function abrirRespuesta(id: string) {
  abrirSeccion("evaluaciones");
  setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_RESPUESTA, { detail: id })), 80);
}

/**
 * «Antes de la próxima sesión»: lo urgente y lo que conviene revisar, arriba
 * del expediente. Cada punto lleva a su sección. Las alarmas se pueden marcar
 * como atendidas aquí mismo.
 */
export function AntesProximaSesion({
  citasSinPagar,
  compromisos,
  consentimientos,
  paciente,
  proximaCita,
  sesiones,
}: {
  citasSinPagar: CitaRow[];
  compromisos: CompromisoRow[];
  consentimientos: ConsentimientoRow[];
  paciente: PacienteRow;
  proximaCita: CitaRow | null;
  sesiones: SesionRow[];
}) {
  const [datos, setDatos] = useState<{
    respuestas: EvaluacionRespuestaRow[];
    evaluaciones: EvaluacionRow[];
    informes: Record<string, InformeRow>;
    seguimientos: SeguimientoRow[];
  } | null>(null);

  const cargar = useCallback(async () => {
    const [ev, seguimientos] = await Promise.all([fetchEvaluacionesDePaciente(paciente.id), fetchSeguimientos(paciente.id)]);
    const informes = await fetchInformesDeRespuestas(ev.respuestas.map((r) => r.id));
    setDatos({ respuestas: ev.respuestas, evaluaciones: ev.evaluaciones, informes, seguimientos });
  }, [paciente.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void cargar();
    const alCambiar = () => void cargar();
    window.addEventListener(EVENTO_EVALUACIONES_CAMBIO, alCambiar);
    return () => window.removeEventListener(EVENTO_EVALUACIONES_CAMBIO, alCambiar);
  }, [cargar]);

  const ultimaSesion = sesiones[0]?.iniciadaAt ?? null;

  const { alarmas, puntos } = useMemo(() => {
    const puntos: Punto[] = [];
    if (!datos) return { alarmas: [] as EvaluacionRespuestaRow[], puntos };
    const { respuestas, evaluaciones, informes, seguimientos } = datos;

    // Urgente: alarmas sin atender y consentimiento faltante.
    const alarmas = respuestas.filter((r) => resumenRespuesta(r).alertas.length && !atencionDe(informes[r.id]));
    if (!consentimientos.length && !paciente.consentimientoAceptadoAt) {
      puntos.push({
        clave: "consentimiento",
        nivel: "urgente",
        texto: "Falta el consentimiento informado",
        detalle: "Se puede firmar en la hoja de datos o al abrir cualquier evaluación.",
        ir: () => abrirSeccion("datos"),
        etiquetaIr: "Ver hoja de datos",
      });
    }

    // Revisar.
    const nuevas = respuestas.filter((r) => !ultimaSesion || r.createdAt > ultimaSesion);
    for (const r of nuevas) {
      puntos.push({
        clave: `nueva-${r.id}`,
        nivel: "revisar",
        texto: `Respuesta nueva: ${nombreInstrumento(r.instrumento)}`,
        detalle: `${formatoFechaCorta(fechaDe(r))} · ${r.respondienteNombre}${ultimaSesion ? " · después de la última sesión" : ""}`,
        ir: () => abrirRespuesta(r.id),
        etiquetaIr: "Ver informe",
      });
    }
    if (compromisos.length) {
      puntos.push({
        clave: "compromisos",
        nivel: "revisar",
        texto: `${compromisos.length} compromiso${compromisos.length === 1 ? "" : "s"} o tarea${compromisos.length === 1 ? "" : "s"} pendiente${compromisos.length === 1 ? "" : "s"}`,
        detalle: compromisos
          .slice(0, 3)
          .map((c) => c.descripcion)
          .join(" · "),
        ir: () => abrirSeccion("compromisos"),
        etiquetaIr: "Ver",
      });
    }
    for (const ev of evaluaciones.filter((e) => e.estado === "abierta")) {
      const dias = diasDesde(ev.createdAt.slice(0, 10));
      if (dias < 2) continue;
      puntos.push({
        clave: `enlace-${ev.id}`,
        nivel: "revisar",
        texto: `Sin responder: ${nombreInstrumento(ev.instrumento, ev.opciones)}${ev.etiqueta ? ` · ${ev.etiqueta}` : ""}`,
        detalle: `Enviado hace ${dias} días${ev.borrador ? " · ya empezó a responder" : ""}`,
        ir: () => abrirSeccion("evaluaciones"),
        etiquetaIr: "Reenviar",
      });
    }
    const { series } = evolucionDelPaciente(respuestas);
    // Deterioro fiable: el aumento supera el cambio mínimo fiable de la escala (no es variación del día a día).
    const fiables = deteriorosFiables(series);
    if (fiables.length) {
      puntos.push({
        clave: "deterioro-fiable",
        nivel: "urgente",
        texto: `Deterioro fiable frente a la aplicación anterior: ${fiables.map((x) => x.sigla).join(", ")}`,
        detalle: fiables
          .map((x) => `${x.sigla} ${x.antes} → ${x.ahora} (+${x.ahora - x.antes}; mínimo fiable ${String(Math.round(x.minimo * 10) / 10).replace(".", ",")}) · ${x.banda}`)
          .join(" · "),
        ir: () => abrirSeccion("evolucion"),
        etiquetaIr: "Ver evolución",
      });
    }
    const empeoran = series.filter((x) => x.tendencia === "empeora" && !fiables.some((f) => f.id === x.id));
    if (empeoran.length) {
      puntos.push({
        clave: "empeoran",
        nivel: "revisar",
        texto: `Empeoró frente a la aplicación anterior: ${empeoran.map((x) => x.sigla).join(", ")}`,
        detalle: empeoran
          .map((x) => {
            const [a, b] = x.puntos.slice(-2);
            return `${x.sigla} ${a.valor} → ${b.valor} (${b.banda})`;
          })
          .join(" · "),
        ir: () => abrirSeccion("evolucion"),
        etiquetaIr: "Ver evolución",
      });
    }
    const ultimoEapi = respuestas
      .filter((r) => r.instrumento === "eapi")
      .map(fechaDe)
      .sort()
      .at(-1);
    const seguimientoEapi = seguimientos.some((s) => s.activo && s.instrumento === "eapi");
    if (ultimoEapi && !seguimientoEapi && diasDesde(ultimoEapi) >= DIAS_REEVALUACION) {
      puntos.push({
        clave: "reevaluar",
        nivel: "revisar",
        texto: `Reevaluación sugerida: último EAPI hace ${diasDesde(ultimoEapi)} días`,
        detalle: "Con «Nueva aplicación (seguimiento)» o programando un seguimiento automático.",
        ir: () => abrirSeccion("evaluaciones"),
        etiquetaIr: "Ir a evaluaciones",
      });
    }
    for (const s of seguimientos.filter((x) => x.activo && diasDesde(x.proximaFecha) >= -7)) {
      const dias = -diasDesde(s.proximaFecha);
      puntos.push({
        clave: `seguimiento-${s.id}`,
        nivel: "info",
        texto: `Seguimiento programado: ${nombreInstrumento(s.instrumento, s.opciones)}`,
        detalle: dias <= 0 ? "Se envía hoy" : `Próximo envío en ${dias} día${dias === 1 ? "" : "s"} (${formatoFechaCorta(s.proximaFecha)})`,
        ir: () => abrirSeccion("evaluaciones"),
        etiquetaIr: "Ver",
      });
    }
    if (citasSinPagar.length) {
      puntos.push({
        clave: "pagos",
        nivel: "revisar",
        texto: `${citasSinPagar.length} cita${citasSinPagar.length === 1 ? "" : "s"} sin pagar`,
        ir: () => abrirSeccion("pago"),
        etiquetaIr: "Ver pagos",
      });
    }
    const orden = { urgente: 0, revisar: 1, info: 2 } as const;
    puntos.sort((x, y) => orden[x.nivel] - orden[y.nivel]);
    return { alarmas, puntos };
  }, [datos, consentimientos, paciente.consentimientoAceptadoAt, compromisos, citasSinPagar, ultimaSesion]);

  // detail "alarma": la sección de evaluaciones actualiza sus distintivos de alarma.
  const avisarCambio = () => window.dispatchEvent(new CustomEvent(EVENTO_EVALUACIONES_CAMBIO, { detail: "alarma" }));
  const nada = datos && !alarmas.length && !puntos.length;

  return (
    <section className="grid min-w-0 gap-3 border border-amber-300/30 bg-amber-300/[0.06] p-4" data-testid="antes-proxima-sesion">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-100">
          <ClipboardList className="h-4 w-4" />
          Antes de la próxima sesión
        </h3>
        <div className="flex gap-3 text-xs font-semibold text-slate-400">
          <button className="hover:text-slate-200" onClick={() => plegarTodas(true)} type="button">
            Expandir todo
          </button>
          <button className="hover:text-slate-200" onClick={() => plegarTodas(false)} type="button">
            Contraer todo
          </button>
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-200">
        <CalendarClock className="h-4 w-4 text-amber-200" />
        {proximaCita ? (
          <>
            Próxima cita: <strong>{formatoFechaCorta(proximaCita.inicio)}</strong> a las {formatoHora(proximaCita.inicio)}
            {proximaCita.modalidad ? ` · ${proximaCita.modalidad}` : ""}
          </>
        ) : (
          <span className="text-slate-400">Sin próxima cita agendada.</span>
        )}
      </p>

      {!datos ? <p className="text-xs text-slate-500">Revisando…</p> : null}

      {alarmas.map((r) => (
        <div className="grid gap-1" key={r.id}>
          <button className="w-fit text-left text-xs font-semibold text-red-200 hover:underline" onClick={() => abrirRespuesta(r.id)} type="button">
            {nombreInstrumento(r.instrumento)} · {formatoFechaCorta(fechaDe(r))} · ver informe
          </button>
          <AlarmaAtencion compacta informe={datos?.informes[r.id]} onCambio={avisarCambio} pacienteId={paciente.id} respuesta={r} />
        </div>
      ))}

      {puntos.length ? (
        <ul className="grid min-w-0 gap-1.5">
          {puntos.map((p) => (
            <li
              className={`flex min-w-0 flex-wrap items-center justify-between gap-2 border px-3 py-2 text-sm ${
                p.nivel === "urgente"
                  ? "border-red-400/40 bg-red-400/10 text-red-100"
                  : p.nivel === "revisar"
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-50"
                    : "border-white/10 bg-white/4 text-slate-200"
              }`}
              key={p.clave}
            >
              <span className="flex min-w-0 flex-1 items-start gap-2">
                {p.nivel === "urgente" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
                <span className="min-w-0">
                  {p.texto}
                  {p.detalle ? <span className="block break-words text-xs opacity-75">{p.detalle}</span> : null}
                </span>
              </span>
              {p.ir ? (
                <button className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold opacity-90 hover:underline" onClick={p.ir} type="button">
                  {p.etiquetaIr ?? "Ver"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {nada ? (
        <p className="flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Nada urgente ni pendiente para revisar.
        </p>
      ) : null}
    </section>
  );
}
