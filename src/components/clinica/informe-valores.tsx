"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { calificarRiasec, RIASEC_INFO } from "@/lib/evaluaciones/riasec/calificacion";
import { validarValores } from "@/lib/evaluaciones/valores/codigo";
import { informeValoresHtml, type AplicacionValores, type RiasecParaValores } from "@/lib/evaluaciones/valores/informe-html";
import { AREAS_VALORES, informePacienteValores, opcionesPorDefectoValores } from "@/lib/evaluaciones/valores/informe-paciente";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { datosRiasec } from "./informe-riasec";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Datos del cuestionario de valores laborales de una respuesta guardada (null si no es válida). */
export function datosValores(r: EvaluacionRespuestaRow) {
  const v = validarValores(r.datos);
  return v.ok ? v.datos : null;
}

export function InformeValores({
  actual,
  paciente,
  respuestas,
}: {
  actual: EvaluacionRespuestaRow;
  paciente: PacienteRow;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const datos = useMemo(() => datosValores(actual), [actual]);
  // Test de intereses (RIASEC) más reciente del paciente, para integrarlo.
  const riasec = useMemo((): RiasecParaValores | null => {
    const r = respuestas
      .filter((x) => x.instrumento === "riasec" && datosRiasec(x))
      .sort((a, b) => (fechaDe(b) + b.createdAt).localeCompare(fechaDe(a) + a.createdAt))[0];
    if (!r) return null;
    const c = calificarRiasec(datosRiasec(r)!);
    return { codigo: c.codigo, fecha: fechaDe(r), nombres: c.orden.slice(0, 3).map((t) => RIASEC_INFO[t].nombre) };
  }, [respuestas]);
  const anteriores = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          r.id !== actual.id &&
          r.instrumento === "valores" &&
          (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
          datosValores(r)
      ),
    [respuestas, actual]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;

  const anterior = anteriores.find((r) => r.id === antId);
  const datosAnt = anterior ? datosValores(anterior) : null;
  const ant: AplicacionValores | null = anterior && datosAnt ? { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) } : null;
  const html = informeValoresHtml({ datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual) }, ant, notasPrivadas, riasec);

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
      <InformeFrame html={html} textoBoton="Descargar PDF (informe profesional)" titulo="Informe de valores laborales" />
      <InformePacientePanel
        areas={AREAS_VALORES}
        conAyuda={false}
        construir={(opciones, notas) =>
          informePacienteValores(datos, opciones, {
            paciente: paciente.nombre,
            fechaAplicacion: fechaDe(actual),
            notas,
            profesional: PROFESIONAL_INFORME,
            codigoRiasec: riasec?.codigo ?? null,
          })
        }
        descripcion={`Muestra sus valores principales, qué buscar en un trabajo y preguntas útiles para comparar opciones${riasec ? `, y cómo se relacionan con su código de intereses (${riasec.codigo})` : ""}. Sin observaciones clínicas. Elige qué valores incluir, agrega tus comentarios y envíaselo.`}
        opcionesPorDefecto={opcionesPorDefectoValores()}
        paciente={paciente}
        placeholderNotas="Ej. Lo que más necesitas de un trabajo es… Al comparar carreras, fíjate en… En la próxima sesión revisaremos…"
        respuestaId={actual.id}
      />
    </div>
  );
}
