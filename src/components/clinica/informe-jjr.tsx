"use client";

import { useMemo, useState } from "react";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { datosJjrGuardados } from "@/lib/evaluaciones/jjr/codigo";
import { informeJjrHtml, type AplicacionJjr, type RiasecParaJjr } from "@/lib/evaluaciones/jjr/informe-html";
import { areasJjr, informePacienteJjr, opcionesPorDefectoJjr } from "@/lib/evaluaciones/jjr/informe-paciente";
import { calificarRiasec } from "@/lib/evaluaciones/riasec/calificacion";
import { InformeFrame } from "./informe-frame";
import { InformePacientePanel, PROFESIONAL_INFORME } from "./informe-paciente-panel";
import { datosRiasec } from "./informe-riasec";
import { NotasPrivadas } from "./notas-privadas";
import { Field } from "./ui";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Edad (años cumplidos) en la fecha de aplicación, si el expediente tiene la fecha de nacimiento. */
export function edadEn(fechaNacimiento: string | null, fecha: string) {
  if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}/.test(fechaNacimiento)) return null;
  const [a, m, d] = fechaNacimiento.slice(0, 10).split("-").map(Number);
  const [fa, fm, fd] = fecha.slice(0, 10).split("-").map(Number);
  return fa - a - (fm < m || (fm === m && fd < d) ? 1 : 0);
}

/** Informe de Intereses Vocacionales JJR (JJR-84 o JJR-INV-176): profesional + para el paciente. */
export function InformeJjr({ actual, paciente, respuestas }: { actual: EvaluacionRespuestaRow; paciente: PacienteRow; respuestas: EvaluacionRespuestaRow[] }) {
  const datos = useMemo(() => datosJjrGuardados(actual.datos), [actual]);
  // RIASEC más reciente: solo para contrastar la hipótesis conceptual (no se convierte).
  const riasec = useMemo((): RiasecParaJjr | null => {
    const r = respuestas
      .filter((x) => x.instrumento === "riasec" && datosRiasec(x))
      .sort((a, b) => (fechaDe(b) + b.createdAt).localeCompare(fechaDe(a) + a.createdAt))[0];
    return r ? { codigo: calificarRiasec(datosRiasec(r)!).codigo, fecha: fechaDe(r) } : null;
  }, [respuestas]);
  // Solo el mismo protocolo, versión y forma son comparables.
  const anteriores = useMemo(
    () =>
      respuestas.filter((r) => {
        if (r.id === actual.id || r.instrumento !== actual.instrumento) return false;
        if (!(fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt))) return false;
        const d = datosJjrGuardados(r.datos);
        return Boolean(d && datos && d.version === datos.version && d.forma === datos.forma);
      }),
    [respuestas, actual, datos]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;
  const investigacion = datos.instrumento === "JJR-INV-176";
  const anterior = anteriores.find((r) => r.id === antId);
  const datosAnt = anterior ? datosJjrGuardados(anterior.datos) : null;
  const ant: AplicacionJjr | null = anterior && datosAnt ? { datos: datosAnt, nombre: anterior.respondienteNombre, fecha: fechaDe(anterior) } : null;
  const edad = edadEn(paciente.fechaNacimiento, fechaDe(actual));
  const html = informeJjrHtml({ datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual), edad }, ant, notasPrivadas, riasec);

  return (
    <div className="grid gap-4">
      {edad !== null && edad < 16 ? (
        <p className="border border-amber-300/40 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          El paciente tenía {edad} años: el cuestionario está pensado para personas de 16 años o más.
        </p>
      ) : null}
      {anteriores.length > 0 ? (
        <Field label="Seguimiento: aplicación anterior (mismo protocolo)">
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
      <InformeFrame html={html} textoBoton="Descargar PDF (informe profesional)" titulo="Informe de intereses JJR" />
      <InformePacientePanel
        areas={areasJjr(investigacion)}
        conAyuda={false}
        construir={(opciones, notas) =>
          informePacienteJjr(datos, opciones, { paciente: paciente.nombre, fechaAplicacion: fechaDe(actual), notas, profesional: PROFESIONAL_INFORME })
        }
        descripcion="Ya calificado: muestra la gráfica de barras y las áreas de mayor a menor inclinación, con qué es cada una, las actividades que más le gustaron y rutas para conocer. Elige qué campos incluir, agrega tus comentarios y envíaselo por WhatsApp con un toque."
        opcionesPorDefecto={opcionesPorDefectoJjr(investigacion)}
        paciente={paciente}
        placeholderNotas="Ej. Te llamaron la atención las actividades de… Para conocerlas mejor, te propongo… En la próxima sesión revisaremos…"
        respuestaId={actual.id}
      />
    </div>
  );
}
