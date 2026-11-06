"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { validarEapi } from "@/lib/evaluaciones/eapi/codigo";
import { informeEapiHtml, type AplicacionEapi } from "@/lib/evaluaciones/eapi/informe-html";
import { AREAS_EAPI, informePacienteEapi, opcionesPorDefectoEapi } from "@/lib/evaluaciones/eapi/informe-paciente";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Datos EAPI de una respuesta guardada (null si el registro no es válido). */
export function datosEapi(r: EvaluacionRespuestaRow) {
  const v = validarEapi(r.datos, Array.isArray((r.datos as { docs?: unknown }).docs));
  return v.ok ? v.datos : null;
}

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
  const anteriores = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          r.id !== actual.id &&
          r.instrumento === "eapi" &&
          (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
          datosEapi(r)
      ),
    [respuestas, actual]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;

  const anterior = anteriores.find((r) => r.id === antId);
  const datosAnt = anterior ? datosEapi(anterior) : null;
  const ant: AplicacionEapi | null = anterior && datosAnt ? { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) } : null;
  const html = informeEapiHtml({ datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual) }, ant, notasPrivadas);

  return (
    <div className="grid gap-4">
      <Field label="Seguimiento: aplicación anterior">
        <select className="field" onChange={(e) => setAntId(e.target.value)} value={antId}>
          <option value="">Sin comparación</option>
          {anteriores.map((r) => (
            <option key={r.id} value={r.id}>
              {formatoFechaCorta(fechaDe(r))} · {r.respondienteNombre}
            </option>
          ))}
        </select>
      </Field>
      <NotasPrivadas onCambio={setNotasPrivadas} pacienteId={paciente.id} respuestaId={actual.id} />
      <InformeFrame html={html} textoBoton="Imprimir o guardar PDF (informe profesional)" titulo="Informe EAPI" />
      <InformePacientePanel
        areas={AREAS_EAPI.filter((a) => a.id !== "docs" || datos.docs)}
        avisoAyuda={
          datos.safety >= 1 ? (
            <span className="text-xs text-red-300">Marcó la pregunta de seguridad: se recomienda dejar las líneas de ayuda.</span>
          ) : null
        }
        construir={(opciones, notas) =>
          informePacienteEapi(datos, opciones, {
            paciente: paciente.nombre,
            fechaAplicacion: fechaDe(actual),
            notas,
            profesional: PROFESIONAL_INFORME,
          })
        }
        descripcion="En lenguaje sencillo, sin códigos diagnósticos, señales clínicas ni la pregunta de seguridad. Elige qué incluir, agrega tus comentarios y envíaselo. Lo que publiques queda fijo hasta que lo actualices."
        opcionesPorDefecto={opcionesPorDefectoEapi(datos)}
        paciente={paciente}
        placeholderNotas="Ej. Lo que más destaca es… En la próxima sesión trabajaremos… Mientras tanto te recomiendo…"
        respuestaId={actual.id}
      />
    </div>
  );
}
