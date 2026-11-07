"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { validarBBreve, type BBreveDatos } from "@/lib/evaluaciones/b-breve/codigo";
import { informeBBreveHtml, type AplicacionBBreve } from "@/lib/evaluaciones/b-breve/informe-html";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { InformeFrame } from "./informe-frame";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);
const normalizar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Datos B-Breve de una respuesta guardada (null si el registro no es válido). */
export function datosBBreve(r: EvaluacionRespuestaRow): BBreveDatos | null {
  const v = validarBBreve(r.datos);
  return v.ok ? v.datos : null;
}

function aplicacion(r: EvaluacionRespuestaRow, datos: BBreveDatos): AplicacionBBreve {
  return { datos, nombre: r.respondienteNombre, relacion: r.respondienteRelacion ?? "", fecha: fechaDe(r) };
}

/** Informe B-Breve con comparación opcional (segundo cuidador y aplicación anterior). */
export function InformeBBreve({
  actual,
  paciente,
  respuestas,
}: {
  actual: EvaluacionRespuestaRow;
  paciente: PacienteRow;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const mismas = useMemo(
    () => respuestas.filter((r) => r.id !== actual.id && r.instrumento === actual.instrumento && datosBBreve(r)),
    [respuestas, actual]
  );

  // Por defecto: cuidador 2 = otra respuesta del mismo enlace (o de ±14 días) de otra persona;
  // anterior = la más reciente previa de la misma persona (relación y nombre), si no, misma relación.
  const sugerencias = useMemo(() => {
    const mismaPersona = (r: EvaluacionRespuestaRow) =>
      normalizar(r.respondienteRelacion) === normalizar(actual.respondienteRelacion) &&
      normalizar(r.respondienteNombre) === normalizar(actual.respondienteNombre);
    const dias = (r: EvaluacionRespuestaRow) => Math.abs(new Date(fechaDe(r)).getTime() - new Date(fechaDe(actual)).getTime()) / 86_400_000;
    const c2 =
      mismas.find((r) => r.evaluacionId && r.evaluacionId === actual.evaluacionId && !mismaPersona(r)) ??
      mismas.find((r) => !mismaPersona(r) && dias(r) <= 14);
    const previas = mismas.filter((r) => fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt));
    const ant =
      previas.find(mismaPersona) ??
      previas.find((r) => normalizar(r.respondienteRelacion) === normalizar(actual.respondienteRelacion) && r.id !== c2?.id);
    return { c2: c2?.id ?? "", ant: ant?.id ?? "" };
  }, [actual, mismas]);

  const [c2Id, setC2Id] = useState(sugerencias.c2);
  const [antId, setAntId] = useState(sugerencias.ant);
  const [notasPrivadas, setNotasPrivadas] = useState("");

  const datos = datosBBreve(actual);
  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;
  const etiqueta = (r: EvaluacionRespuestaRow) =>
    `${formatoFechaCorta(fechaDe(r))} · ${r.respondienteNombre}${r.respondienteRelacion ? ` (${r.respondienteRelacion})` : ""}`;
  const buscar = (id: string) => {
    const r = mismas.find((x) => x.id === id);
    const d = r ? datosBBreve(r) : null;
    return r && d ? aplicacion(r, d) : null;
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Comparar con segundo cuidador">
          <select className="field" onChange={(e) => setC2Id(e.target.value)} value={c2Id}>
            <option value="">Sin comparación</option>
            {mismas.map((r) => (
              <option key={r.id} value={r.id}>
                {etiqueta(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Seguimiento: aplicación anterior">
          <select className="field" onChange={(e) => setAntId(e.target.value)} value={antId}>
            <option value="">Sin comparación</option>
            {mismas.map((r) => (
              <option key={r.id} value={r.id}>
                {etiqueta(r)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <NotasPrivadas onCambio={setNotasPrivadas} pacienteId={paciente.id} respuestaId={actual.id} />
      <InformeFrame html={informeBBreveHtml(aplicacion(actual, datos), buscar(c2Id), buscar(antId), notasPrivadas)} titulo="Informe B-Breve" />
    </>
  );
}
