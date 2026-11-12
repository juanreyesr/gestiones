"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { validarTemperamentos } from "@/lib/evaluaciones/temperamentos/codigo";
import { informeTemperamentosHtml, type AplicacionTemperamentos } from "@/lib/evaluaciones/temperamentos/informe-html";
import { AREAS_TEMPERAMENTOS, informePacienteTemperamentos, opcionesPorDefectoTemperamentos } from "@/lib/evaluaciones/temperamentos/informe-paciente";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Datos del cuestionario de temperamento de una respuesta guardada (null si no es válida). */
export function datosTemperamentos(r: EvaluacionRespuestaRow) {
  const v = validarTemperamentos(r.datos);
  return v.ok ? v.datos : null;
}

export function InformeTemperamentos({
  actual,
  paciente,
  respuestas,
}: {
  actual: EvaluacionRespuestaRow;
  paciente: PacienteRow;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const datos = useMemo(() => datosTemperamentos(actual), [actual]);
  const anteriores = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          r.id !== actual.id &&
          r.instrumento === "temperamentos" &&
          (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
          datosTemperamentos(r)
      ),
    [respuestas, actual]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;

  const anterior = anteriores.find((r) => r.id === antId);
  const datosAnt = anterior ? datosTemperamentos(anterior) : null;
  const ant: AplicacionTemperamentos | null = anterior && datosAnt ? { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) } : null;
  const html = informeTemperamentosHtml({ datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual) }, ant, notasPrivadas);

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
      <InformeFrame html={html} textoBoton="Descargar PDF (informe profesional)" titulo="Informe de temperamento" />
      <InformePacientePanel
        areas={AREAS_TEMPERAMENTOS}
        conAyuda={false}
        construir={(opciones, notas) =>
          informePacienteTemperamentos(datos, opciones, {
            paciente: paciente.nombre,
            fechaAplicacion: fechaDe(actual),
            notas,
            profesional: PROFESIONAL_INFORME,
          })
        }
        descripcion="Abre con su temperamento dominante, una gráfica de los cuatro y tarjetas con aspectos positivos y a cuidar, su perfil combinado (cómo se comporta, de qué cuidarse, en qué ser más observador, cómo aprovechar sus puntos fuertes), relaciones, trabajo o estudio, estrés e ideas para crecer. Sin observaciones clínicas ni puntajes (a menos que los incluyas). Elige qué tarjetas incluir, agrega tus comentarios y envíaselo."
        opcionesPorDefecto={opcionesPorDefectoTemperamentos()}
        paciente={paciente}
        placeholderNotas="Ej. Su forma de ser tiene mucho valor porque… Para el trabajo, le sugiero… En la próxima sesión revisaremos…"
        respuestaId={actual.id}
      />
    </div>
  );
}
