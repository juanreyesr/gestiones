"use client";

import { useEffect, useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { atencionDe, fetchInforme, type EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { datosMceaGuardados } from "@/lib/evaluaciones/mcea/codigo";
import { informeMceaHtml, type AplicacionMcea } from "@/lib/evaluaciones/mcea/informe-html";
import { AREAS_MCEA, informePacienteMcea, opcionesPorDefectoMcea } from "@/lib/evaluaciones/mcea/informe-paciente";
import { A } from "@/lib/evaluaciones/mcea/motor";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { NotasPrivadas } from "./notas-privadas";
import { EVENTO_EVALUACIONES_CAMBIO } from "./seccion-plegable";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);
const minutos = (r: EvaluacionRespuestaRow, inicio: string | null) =>
  inicio ? Math.max(1, Math.round((new Date(r.createdAt).getTime() - new Date(inicio).getTime()) / 60000)) : null;

/** Informe del MCEA: clínico (con comparación) + informe para el paciente. */
export function InformeMcea({ actual, paciente, respuestas }: { actual: EvaluacionRespuestaRow; paciente: PacienteRow; respuestas: EvaluacionRespuestaRow[] }) {
  const datos = useMemo(() => datosMceaGuardados(actual.datos), [actual]);
  const anteriores = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          r.id !== actual.id &&
          r.instrumento === "mcea" &&
          (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
          datosMceaGuardados(r.datos)
      ),
    [respuestas, actual]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");
  // Alerta de riesgo: el informe al paciente se libera solo después de registrar la atención.
  const [atendida, setAtendida] = useState<boolean | null>(null);
  const conAlerta = (datos ? (A(datos, "PHQ9_9") ?? 0) : 0) >= 1;

  useEffect(() => {
    if (!conAlerta) return;
    let vivo = true;
    const leer = () => void fetchInforme(actual.id).then(({ data }) => vivo && setAtendida(Boolean(atencionDe(data))));
    leer();
    window.addEventListener(EVENTO_EVALUACIONES_CAMBIO, leer);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_EVALUACIONES_CAMBIO, leer);
    };
  }, [actual.id, conAlerta]);

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;
  const anterior = anteriores.find((r) => r.id === antId);
  const datosAnt = anterior ? datosMceaGuardados(anterior.datos) : null;
  const ant: AplicacionMcea | null = anterior && datosAnt ? { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) } : null;
  const html = informeMceaHtml(
    { datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual), minutos: minutos(actual, datos.inicio) },
    ant,
    notasPrivadas
  );

  return (
    <div className="grid gap-4">
      {anteriores.length > 0 ? (
        <Field label="Comparar con la aplicación anterior (cambio fiable)">
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
      <InformeFrame html={html} textoBoton="Descargar PDF (informe clínico)" titulo="Informe MCEA" />
      {conAlerta && !atendida ? (
        <p className="border border-red-400/40 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
          {atendida === null
            ? "Revisando la alerta de riesgo…"
            : "Hay una alerta de riesgo (ítem 9 del PHQ-9). Registra primero la atención con «Marcar como atendida» (arriba); después podrás enviar el informe al paciente."}
        </p>
      ) : (
        <InformePacientePanel
          areas={AREAS_MCEA}
          avisoAyuda="Incluye las líneas de ayuda en crisis (Guatemala), como en el informe original."
          construir={(opciones, notas) =>
            informePacienteMcea(datos, opciones, {
              paciente: paciente.nombre,
              fechaAplicacion: fechaDe(actual),
              notas,
              profesional: PROFESIONAL_INFORME,
              anterior: ant ? { datos: ant.datos, fecha: ant.fecha } : null,
            })
          }
          descripcion={`En lenguaje sencillo: cómo ha estado, lo que su mente suele hacer, formas de pensar, patrones que le frenan o en su pareja, su mapa de un momento difícil y sus recursos${ant ? ", y lo que ha cambiado desde la aplicación anterior" : ""}. Elige qué incluir, agrega tus comentarios y envíaselo por WhatsApp.`}
          opcionesPorDefecto={opcionesPorDefectoMcea()}
          paciente={paciente}
          placeholderNotas="Ej. Revisamos esto juntos el martes. Fíjese sobre todo en su mapa."
          respuestaId={actual.id}
        />
      )}
    </div>
  );
}
