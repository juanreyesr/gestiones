"use client";

import { AlertTriangle, ChevronDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import type { PacienteRow } from "@/lib/clinica/types";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { fichaPorId, type Ficha } from "@/lib/evaluaciones/fichas/catalogo";
import { datosFichaGuardados } from "@/lib/evaluaciones/fichas/codigo";
import { GUIA_TERAPEUTA } from "@/lib/evaluaciones/fichas/guia-terapeuta";
import { fichaEnBlancoHtml, fichaRespondidaHtml } from "@/lib/evaluaciones/fichas/informe-html";
import { riesgoFicha } from "@/lib/evaluaciones/fichas/riesgo";
import { descargarPdfDeHtml, nombrePdf } from "@/lib/pdf-desde-html";
import { InformeFrame } from "./informe-frame";
import { NotasPrivadas } from "./notas-privadas";
import { BTN_GHOST } from "./ui";
import { comparativaMotivo } from "@/lib/evaluaciones/fichas/motivo";
import { ComparativaMotivoVista } from "./comparativa-motivo";

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

const Lista = ({ titulo, items }: { titulo: string; items: readonly string[] }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-slate-400">{titulo}</p>
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-200">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  </div>
);

/** La guía «Para el terapeuta» de una ficha, plegable (la usan el informe y el editor de «Intervención guiada»). */
export function GuiaTerapeutaFicha({ ficha }: { ficha: Ficha }) {
  const guia = GUIA_TERAPEUTA[ficha.id];
  return (
    <details className="group border border-white/10 bg-white/4 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-100">
        Para el terapeuta · Ficha {ficha.id}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-xs text-slate-400">Fundamento: {guia.base}</p>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Objetivo</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">{guia.objetivo}</p>
        </div>
        <Lista items={guia.cuandoUsarla} titulo="Cuándo usarla" />
        <Lista items={guia.cuandoNoUsarla} titulo="Cuándo no usarla" />
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Cómo presentarla en sesión</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-200">
            {guia.presentar.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
        <Lista items={guia.errores} titulo="Errores frecuentes" />
        <Lista items={guia.revisar} titulo="Cómo revisarla en la siguiente sesión" />
      </div>
    </details>
  );
}

/** Informe de una ficha terapéutica: guía del terapeuta (plegable), respuestas del paciente y PDF A4 en blanco o con respuestas. */
export function InformeFicha({ actual, paciente }: { actual: EvaluacionRespuestaRow; paciente: PacienteRow; respuestas: EvaluacionRespuestaRow[] }) {
  const datos = useMemo(() => datosFichaGuardados(actual.datos), [actual]);
  const comparativa = useMemo(() => comparativaMotivo(actual), [actual]);
  const [notasPrivadas, setNotasPrivadas] = useState("");
  const [generando, setGenerando] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  const ficha = fichaPorId(datos?.ficha);
  if (!datos || !ficha) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para mostrar.</p>;

  const riesgo = riesgoFicha(ficha, datos.respuestas);
  const html = fichaRespondidaHtml({ ficha, respuestas: datos.respuestas, nombre: actual.respondienteNombre || paciente.nombre, fecha: fechaDe(actual), riesgo, notasPrivadas, autor: datos.autor });

  const descargarEnBlanco = async () => {
    setGenerando(true);
    setErrorPdf("");
    try {
      await descargarPdfDeHtml(fichaEnBlancoHtml(ficha), nombrePdf(`Ficha ${ficha.id} en blanco ${ficha.titulo}`));
    } catch {
      setErrorPdf("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="grid gap-4">
      {datos.autor === "terapeuta" ? (
        <p className="w-fit border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-sm font-semibold text-amber-100" data-testid="ficha-autor-terapeuta">
          Llenada por el terapeuta
        </p>
      ) : null}
      {riesgo.riesgo ? (
        <div className="grid gap-1 border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-100" data-testid="ficha-alarma" role="alert">
          <strong className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Posible señal de riesgo en el texto libre
          </strong>
          <span>Lee la respuesta completa y valora el riesgo antes de la próxima sesión (detección por palabras; no sustituye tu criterio).</span>
          {riesgo.coincidencias.map((c, i) => (
            <span className="text-red-200" key={i}>
              • «{c.fragmento}» · {c.campo}
            </span>
          ))}
        </div>
      ) : null}

      {comparativa ? (
        <div className="grid gap-2 rounded-lg border border-white/10 p-3">
          <h4 className="text-sm font-semibold text-white">Motivo de consulta: inicial frente a la ficha</h4>
          <ComparativaMotivoVista c={comparativa} />
        </div>
      ) : null}

      <GuiaTerapeutaFicha ficha={ficha} />

      <div className="flex flex-wrap items-center gap-2">
        <button className={BTN_GHOST} disabled={generando} onClick={() => void descargarEnBlanco()} type="button">
          <Download className="h-4 w-4" />
          {generando ? "Generando PDF…" : "Descargar ficha en blanco (PDF A4)"}
        </button>
        {errorPdf ? <span className="text-xs text-red-300">{errorPdf}</span> : null}
      </div>

      <NotasPrivadas onCambio={setNotasPrivadas} pacienteId={paciente.id} respuestaId={actual.id} />
      <InformeFrame html={html} textoBoton="Descargar respuestas (PDF)" titulo={`Ficha ${ficha.id} ${ficha.titulo}`} />
    </div>
  );
}
