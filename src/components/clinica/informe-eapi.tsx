"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { NOMBRES_MODULOS, unirEapi, type ModuloEapi } from "@/lib/evaluaciones/eapi/calificacion";
import { MODULOS_EAPI, validarEapi } from "@/lib/evaluaciones/eapi/codigo";
import { informeEapiHtml, soloModuloEapi, type AplicacionEapi } from "@/lib/evaluaciones/eapi/informe-html";
import { areasEapi, informePacienteEapi, opcionesPorDefectoEapi } from "@/lib/evaluaciones/eapi/informe-paciente";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Datos EAPI de una respuesta guardada (null si el registro no es válido). */
export function datosEapi(r: EvaluacionRespuestaRow) {
  const d = (r.datos ?? {}) as Record<string, unknown>;
  const modulos = MODULOS_EAPI.filter((m) => Array.isArray(d[m]));
  if (!modulos.length) return null;
  const v = validarEapi(r.datos, modulos);
  return v.ok ? v.datos : null;
}

const siglas = (d: { gad: unknown; dass: unknown; ptq: unknown; docs: unknown }) =>
  MODULOS_EAPI.filter((m) => d[m])
    .map((m) => NOMBRES_MODULOS[m].sigla)
    .join(", ");

export function InformeEapi({
  actual,
  paciente,
  respuestas,
}: {
  actual: EvaluacionRespuestaRow;
  paciente: PacienteRow;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const datos = useMemo(() => datosEapi(actual), [actual]);
  // Aplicaciones anteriores a esta, de la más reciente a la más antigua.
  const anteriores = useMemo(
    () =>
      respuestas
        .filter(
          (r) =>
            r.id !== actual.id &&
            r.instrumento === "eapi" &&
            (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
            datosEapi(r)
        )
        .sort((a, b) => (fechaDe(b) + b.createdAt).localeCompare(fechaDe(a) + a.createdAt)),
    [respuestas, actual]
  );
  // Otras aplicaciones EAPI del paciente (cualquier fecha) para el informe unificado.
  const otras = useMemo(
    () =>
      respuestas
        .filter((r) => r.id !== actual.id && r.instrumento === "eapi" && datosEapi(r))
        .sort((a, b) => (fechaDe(b) + b.createdAt).localeCompare(fechaDe(a) + a.createdAt)),
    [respuestas, actual]
  );
  // "auto" = evaluación anterior de cada escala (la más reciente que la tenga).
  const [antId, setAntId] = useState(anteriores.length ? "auto" : "");
  const [notasPrivadas, setNotasPrivadas] = useState("");
  // "todo" = informe unificado; un módulo = informe separado de esa escala.
  const [vista, setVista] = useState<"todo" | ModuloEapi>("todo");
  const [unirIds, setUnirIds] = useState<string[]>([]);

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;

  // Unificado: esta aplicación + las elegidas (cada escala se toma de la más reciente que la tenga, empezando por esta).
  const elegidas = otras.filter((r) => unirIds.includes(r.id));
  const origen: Partial<Record<ModuloEapi, string>> = {};
  for (const r of [actual, ...elegidas]) {
    const d = r.id === actual.id ? datos : datosEapi(r);
    for (const m of MODULOS_EAPI) if (d?.[m] && !origen[m]) origen[m] = fechaDe(r);
  }
  const unidos = elegidas.length ? unirEapi([datos, ...elegidas.map((r) => datosEapi(r)!)]) : datos;
  const modulosDisponibles = MODULOS_EAPI.filter((m) => unidos[m]);
  const vistaValida = vista !== "todo" && unidos[vista] ? vista : "todo";
  const efectivos = vistaValida === "todo" ? unidos : soloModuloEapi(unidos, vistaValida);

  let ant: AplicacionEapi | null = null;
  const previas = anteriores.filter((r) => !unirIds.includes(r.id));
  if (antId === "auto" && previas.length) {
    const origenAnt: Partial<Record<ModuloEapi, string>> = {};
    for (const r of previas) for (const m of MODULOS_EAPI) if (datosEapi(r)?.[m] && !origenAnt[m]) origenAnt[m] = fechaDe(r);
    ant = {
      datos: unirEapi(previas.map((r) => datosEapi(r)!)),
      nombre: previas[0].respondienteNombre,
      fecha: fechaDe(previas[0]),
      origen: origenAnt,
    };
  } else {
    const anterior = anteriores.find((r) => r.id === antId);
    const datosAnt = anterior ? datosEapi(anterior) : null;
    if (anterior && datosAnt) ant = { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) };
  }
  // La pregunta de seguridad de la anterior: la de la aplicación más reciente, no el máximo histórico.
  if (ant && antId === "auto" && previas.length) ant = { ...ant, datos: { ...ant.datos, safety: datosEapi(previas[0])!.safety } };
  const html = informeEapiHtml(
    { datos: efectivos, nombre: actual.respondienteNombre, fecha: fechaDe(actual) },
    ant,
    notasPrivadas,
    elegidas.length ? origen : null
  );

  return (
    <div className="grid gap-4">
      <Field label="Informe">
        <select className="field" onChange={(e) => setVista(e.target.value as "todo" | ModuloEapi)} value={vistaValida}>
          <option value="todo">Unificado ({siglas(unidos)})</option>
          {modulosDisponibles.length > 1
            ? modulosDisponibles.map((m) => (
                <option key={m} value={m}>
                  Separado: solo {NOMBRES_MODULOS[m].sigla}
                </option>
              ))
            : null}
        </select>
      </Field>
      {otras.length ? (
        <div className="grid gap-1.5">
          <p className="text-xs font-semibold text-slate-300">Unir con otras aplicaciones EAPI del paciente (para un informe unificado)</p>
          {otras.map((r) => (
            <label className="flex items-start gap-2 text-xs text-slate-300" key={r.id}>
              <input
                checked={unirIds.includes(r.id)}
                className="mt-0.5"
                onChange={(e) => setUnirIds((l) => (e.target.checked ? [...l, r.id] : l.filter((x) => x !== r.id)))}
                type="checkbox"
              />
              <span>
                {formatoFechaCorta(fechaDe(r))} · {siglas(datosEapi(r)!)}
              </span>
            </label>
          ))}
          <p className="text-[11px] text-slate-500">
            Cada escala se toma de esta aplicación si la tiene; si no, de la más reciente marcada. La pregunta de seguridad toma el valor más alto.
          </p>
        </div>
      ) : null}
      <Field label="Evolución: comparar con">
        <select className="field" onChange={(e) => setAntId(e.target.value)} value={antId}>
          <option value="">Sin comparación</option>
          {anteriores.length ? <option value="auto">La evaluación anterior de cada escala (recomendado)</option> : null}
          {anteriores.map((r) => (
            <option key={r.id} value={r.id}>
              {formatoFechaCorta(fechaDe(r))} · {siglas(datosEapi(r)!)}
            </option>
          ))}
        </select>
      </Field>
      {!anteriores.length ? (
        <p className="-mt-2 text-xs text-slate-400">
          Es la primera aplicación. Con «Nueva aplicación (seguimiento)» envías otra con las mismas escalas y aquí verás la evolución ítem por ítem.
        </p>
      ) : null}
      <NotasPrivadas onCambio={setNotasPrivadas} pacienteId={paciente.id} respuestaId={actual.id} />
      <InformeFrame html={html} textoBoton="Descargar PDF (informe profesional)" titulo="Informe EAPI" />
      <InformePacientePanel
        areas={areasEapi(efectivos, Boolean(ant))}
        avisoAyuda={
          efectivos.safety >= 1 ? (
            <span className="text-xs text-red-300">Marcó la pregunta de seguridad: se recomienda dejar las líneas de ayuda.</span>
          ) : null
        }
        construir={(opciones, notas) =>
          informePacienteEapi(efectivos, opciones, {
            anterior: ant ? { datos: ant.datos, fecha: ant.fecha } : null,
            // Historial para la tendencia: cada aplicación anterior por separado (la más antigua primero).
            historial: [...previas].reverse().map((r) => ({ datos: datosEapi(r)!, fecha: fechaDe(r) })),
            paciente: paciente.nombre,
            fechaAplicacion: fechaDe(actual),
            notas,
            profesional: PROFESIONAL_INFORME,
          })
        }
        descripcion="En lenguaje sencillo, sin códigos diagnósticos, señales clínicas ni la pregunta de seguridad. Elige qué incluir, agrega tus comentarios y envíaselo. Lo que publiques queda fijo hasta que lo actualices."
        opcionesPorDefecto={opcionesPorDefectoEapi(efectivos)}
        paciente={paciente}
        placeholderNotas="Ej. Lo que más destaca es… En la próxima sesión trabajaremos… Mientras tanto te recomiendo…"
        respuestaId={actual.id}
      />
    </div>
  );
}
