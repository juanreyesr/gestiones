"use client";

import { ArrowDownRight, ArrowUpRight, FileHeart, Minus } from "lucide-react";
import { useState } from "react";
import type { PacienteRow } from "@/lib/clinica/types";
import {
  fetchInformeAvance,
  guardarInformeAvance,
  publicarInformeAvance,
  retirarInformeAvance,
} from "@/lib/evaluaciones/evaluaciones";
import {
  agruparCambios,
  AREAS_INFORME_AVANCE,
  fraseCambio,
  informeAvancePaciente,
  motivos,
  opcionesPorDefectoAvance,
  respuestaTexto,
  type CambioArea,
  type Pregunta,
} from "@/lib/evaluaciones/evolucion-explicada";
import { InformePacientePanel, PROFESIONAL_INFORME, type AlmacenInforme } from "./informe-paciente-panel";
import { BTN_GHOST } from "./ui";

function ListaPreguntas({ titulo, preguntas }: { titulo: string; preguntas: Pregunta[] }) {
  if (!preguntas.length) return null;
  return (
    <div className="grid gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{titulo}</span>
      <ul className="grid gap-0.5 text-xs leading-5 text-slate-300">
        {preguntas.map((p) => (
          <li key={p.n}>
            • {respuestaTexto(p)}
            {p.sensible ? <span className="font-semibold text-red-300"> · pregunta sensible (no va al informe del paciente)</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tarjeta({ c, sesiones }: { c: CambioArea; sesiones: string[] }) {
  const m = motivos(c, 3);
  const mejora = c.tendencia === "mejora";
  const entre = sesiones.filter((f) => f > c.antes.fecha && f <= c.ahora.fecha).length;
  const sinPreguntas = !c.bajaron.length && !c.subieron.length;
  return (
    <div
      className={`grid gap-2 rounded-lg border p-3 ${mejora ? "border-emerald-400/30 bg-emerald-400/5" : c.claro ? "border-red-400/40 bg-red-400/5" : "border-amber-400/30 bg-amber-400/5"}`}
      data-cambio={c.id}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">
          {c.area} <span className="text-xs font-normal text-slate-400">· {c.sigla}</span>
        </div>
        <span className={`text-xs font-bold ${mejora ? "text-emerald-300" : c.claro ? "text-red-300" : "text-amber-200"}`}>
          {mejora ? (c.claro ? "Mejoró claramente" : "Mejoró un poco") : c.claro ? "Empeoró claramente" : "Empeoró un poco"}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-200">{fraseCambio(c)}</p>
      {mejora ? (
        <>
          <ListaPreguntas preguntas={m.bajaron} titulo="Por qué mejoró: las respuestas que más bajaron" />
          <ListaPreguntas preguntas={m.subieron.slice(0, 2)} titulo="Aunque subió" />
        </>
      ) : (
        <>
          <ListaPreguntas preguntas={m.subieron} titulo="Qué lo hizo subir: las respuestas que más aumentaron" />
          <ListaPreguntas preguntas={m.bajaron.slice(0, 2)} titulo="Aun así bajó" />
        </>
      )}
      {sinPreguntas ? <p className="text-xs text-slate-400">No se pudieron comparar las preguntas una por una.</p> : null}
      <p className="text-[11px] text-slate-500">
        Entre ambas evaluaciones: {entre} sesión{entre === 1 ? "" : "es"} finalizada{entre === 1 ? "" : "s"}.
      </p>
    </div>
  );
}

/**
 * Lo primero del panel de evolución: qué mejoró y qué empeoró frente a la
 * evaluación anterior, en lenguaje sencillo y con las respuestas que lo
 * explican; y el informe de avance simplificado para enviar al paciente.
 */
export function CambiosRecientes({ cambios, paciente, sesiones }: { cambios: CambioArea[]; paciente: PacienteRow; sesiones: string[] }) {
  const [verInforme, setVerInforme] = useState(false);
  if (!cambios.length) return null;
  const g = agruparCambios(cambios);
  const almacen: AlmacenInforme = {
    cargar: () => fetchInformeAvance(paciente.id),
    guardar: (c) => guardarInformeAvance(paciente.id, c),
    publicar: (contenido, token) => publicarInformeAvance(paciente.id, contenido, token),
    retirar: () => retirarInformeAvance(paciente.id),
  };
  return (
    <div className="grid gap-3" data-testid="cambios-recientes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Qué cambió desde la evaluación anterior</h3>
        <button className={BTN_GHOST} data-testid="abrir-informe-avance" onClick={() => setVerInforme((v) => !v)} type="button">
          <FileHeart className="h-4 w-4" />
          {verInforme ? "Ocultar informe para el paciente" : "Enviar informe de avance al paciente"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            <ArrowDownRight className="h-4 w-4" /> Lo que mejoró ({g.mejoras.length})
          </span>
          {g.mejoras.length ? g.mejoras.map((c) => <Tarjeta c={c} key={c.id} sesiones={sesiones} />) : <p className="text-xs text-slate-400">Nada mejoró frente a la vez anterior.</p>}
        </div>
        <div className="grid content-start gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-300">
            <ArrowUpRight className="h-4 w-4" /> Lo que empeoró ({g.empeoran.length})
          </span>
          {g.empeoran.length ? g.empeoran.map((c) => <Tarjeta c={c} key={c.id} sesiones={sesiones} />) : <p className="text-xs text-slate-400">Nada empeoró frente a la vez anterior.</p>}
        </div>
      </div>

      {g.iguales.length ? (
        <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
          <Minus className="h-3.5 w-3.5" /> Se mantiene parecido:{" "}
          {g.iguales.map((c) => `${c.area} (${c.antes.valor} → ${c.ahora.valor}, sigue en ${c.ahora.banda.toLowerCase()})`).join(" · ")}
        </p>
      ) : null}
      <p className="text-[11px] leading-5 text-slate-500">
        Las respuestas muestran <em>qué</em> cambió, no la causa: conviene preguntar en sesión qué pasó en ese tiempo (sucesos, tareas, cambios de
        medicación o de rutina).
      </p>

      {verInforme ? (
        <InformePacientePanel
          almacen={almacen}
          areas={AREAS_INFORME_AVANCE}
          construir={(o, notas) => informeAvancePaciente(cambios, o, { paciente: paciente.nombre, notas, profesional: PROFESIONAL_INFORME })}
          descripcion="Versión simplificada para el paciente: primero lo que mejoró y por qué, luego lo que aumentó y lo que se mantiene. No incluye puntajes (salvo que los actives), preguntas sensibles (ítem 9 del PHQ-9, desesperanza del DASS-21), alertas, hipótesis ni notas privadas."
          opcionesPorDefecto={opcionesPorDefectoAvance(cambios)}
          paciente={paciente}
          placeholderNotas="Por ejemplo: qué ha hecho bien, qué vamos a reforzar y qué veremos en la próxima sesión."
          respuestaId={`avance-${paciente.id}`}
          titulo="Informe de avance para el paciente"
        />
      ) : null}
    </div>
  );
}
