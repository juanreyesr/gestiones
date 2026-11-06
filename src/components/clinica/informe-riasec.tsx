"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { validarRiasec } from "@/lib/evaluaciones/riasec/codigo";
import { informeRiasecHtml, type AplicacionRiasec } from "@/lib/evaluaciones/riasec/informe-html";
import { AREAS_RIASEC, informePacienteRiasec, opcionesPorDefectoRiasec } from "@/lib/evaluaciones/riasec/informe-paciente";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Datos del test vocacional de una respuesta guardada (null si no es válida). */
export function datosRiasec(r: EvaluacionRespuestaRow) {
  const v = validarRiasec(r.datos);
  return v.ok ? v.datos : null;
}

export function InformeRiasec({
  actual,
  paciente,
  respuestas,
}: {
  actual: EvaluacionRespuestaRow;
  paciente: PacienteRow;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const datos = useMemo(() => datosRiasec(actual), [actual]);
  const anteriores = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          r.id !== actual.id &&
          r.instrumento === "riasec" &&
          (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
          datosRiasec(r)
      ),
    [respuestas, actual]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;

  const anterior = anteriores.find((r) => r.id === antId);
  const datosAnt = anterior ? datosRiasec(anterior) : null;
  const ant: AplicacionRiasec | null = anterior && datosAnt ? { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) } : null;
  const html = informeRiasecHtml({ datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual) }, ant, notasPrivadas);

  return (
    <div className="grid gap-4">
      {anteriores.length > 0 ? (
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
      ) : null}
      <NotasPrivadas onCambio={setNotasPrivadas} pacienteId={paciente.id} respuestaId={actual.id} />
      <InformeFrame html={html} textoBoton="Imprimir o guardar PDF (informe profesional)" titulo="Informe vocacional" />
      <InformePacientePanel
        areas={AREAS_RIASEC}
        conAyuda={false}
        construir={(opciones, notas) =>
          informePacienteRiasec(datos, opciones, {
            paciente: paciente.nombre,
            fechaAplicacion: fechaDe(actual),
            notas,
            profesional: PROFESIONAL_INFORME,
          })
        }
        descripcion="Muestra su código de intereses, la descripción de cada tipo (de mayor a menor) y carreras para explorar en los tres principales. Sin observaciones clínicas. Elige qué tipos incluir, agrega tus comentarios y envíaselo."
        opcionesPorDefecto={opcionesPorDefectoRiasec()}
        paciente={paciente}
        placeholderNotas="Ej. Tus intereses apuntan a… Te recomiendo investigar… En la próxima sesión revisaremos tus aptitudes y opciones de estudio."
        respuestaId={actual.id}
      />
    </div>
  );
}
