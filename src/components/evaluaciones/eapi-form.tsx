"use client";

import { LifeBuoy } from "lucide-react";
import { useCallback, useState } from "react";
import {
  minutosEapi,
  preguntasEapi,
  type EapiBorrador,
  type ModuloEapi,
} from "@/lib/evaluaciones/eapi/codigo";
import {
  DASS21,
  DASS_LABELS,
  DOCS,
  EAPI_ABIERTA,
  EAPI_BLOQUES,
  EAPI_CRISIS,
  EAPI_GRACIAS,
  EAPI_INTRO,
  EAPI_LINEAS_AYUDA,
  EAPI_TITULO_PACIENTE,
  GAD7,
  GAD_FUNC,
  GAD_LABELS,
  PTQ,
  PTQ_LABELS,
  SAFETY,
} from "@/lib/evaluaciones/eapi/escalas";

import {
  AvisoFalloEnvio,
  BarraGuardado,
  PantallaCerrada,
  PantallaEnviada,
  PieEnvio,
  Pregunta,
  useFormularioEvaluacion,
} from "./formulario-comun";

// Importante: este formulario NO importa la calificación. El paciente no ve
// puntuaciones, bandas, etiquetas diagnósticas ni comentarios.

type Lista = "gad" | "dass" | "ptq" | "docs";

const vacio = (n: number) => Array<number | null>(n).fill(null);

// La pregunta de opción única vive en el molde común; se reexporta por compatibilidad.
export { Pregunta };

function Escala({ etiquetas }: { etiquetas: readonly string[] }) {
  return (
    <p className="mt-1 text-xs leading-5 text-slate-500">
      {etiquetas.map((e, i) => `${i} = ${e}`).join(" · ")}
    </p>
  );
}

export function EapiForm({
  borradorInicial,
  codigoCaso,
  modulos,
  token,
}: {
  borradorInicial: EapiBorrador | null;
  codigoCaso: string;
  /** Escalas asignadas por el psicólogo (la pregunta de seguridad va siempre). */
  modulos: readonly ModuloEapi[];
  token: string;
}) {
  const tiene = (m: ModuloEapi) => modulos.includes(m);
  // Numeración de bloques según las escalas asignadas.
  const numeroBloque = (m: ModuloEapi) => modulos.indexOf(m) + 1;
  const tituloBloque = (m: ModuloEapi) =>
    EAPI_BLOQUES[m].titulo.replace(/^Bloque \d+/, `Bloque ${numeroBloque(m)}`);
  const b = borradorInicial;
  const [listas, setListas] = useState<Record<Lista, (number | null)[]>>(
    () => ({
      gad: b?.gad ?? vacio(7),
      dass: b?.dass ?? vacio(21),
      ptq: b?.ptq ?? vacio(15),
      docs: b?.docs ?? vacio(20),
    }),
  );
  const [func, setFunc] = useState<number | null>(b?.func ?? null);
  const [safety, setSafety] = useState<number | null>(b?.safety ?? null);
  const [abierta, setAbierta] = useState(b?.abierta ?? "");
  const [seguridadEnviada, setSeguridadEnviada] = useState(0);
  const [continua] = useState(() =>
    Boolean(
      b &&
      [...b.gad, ...b.dass, ...b.ptq, ...b.docs].some((v) => v !== null),
    ),
  );

  const borrador = useCallback(
    (): EapiBorrador => ({
      // Nombre, edad y fecha se toman del expediente al enviar.
      nombre: "",
      edad: "",
      fecha: "",
      gad: listas.gad,
      func,
      dass: listas.dass,
      ptq: listas.ptq,
      docs: listas.docs,
      safety,
      abierta,
    }),
    [listas, func, safety, abierta],
  );

  const { error, enviar: enviarRespuesta, faltan, fase, guardado, marcarFaltantes, quitarFalta } = useFormularioEvaluacion({
    borrador,
    prefijoId: "ea",
    token,
  });

  const elegir = (lista: Lista, i: number, v: number) => {
    setListas((prev) => ({
      ...prev,
      [lista]: prev[lista].map((x, j) => (j === i ? v : x)),
    }));
    quitarFalta(`${lista}${i + 1}`);
  };

  const requeridas = preguntasEapi(modulos);
  const respondidas =
    modulos.reduce(
      (n, m) => n + listas[m].filter((v) => v !== null).length,
      0,
    ) + (safety !== null ? 1 : 0);

  const enviar = async () => {
    if (fase === "enviando") return;
    const faltantes: string[] = [];
    for (const m of modulos)
      listas[m].forEach((v, i) => v === null && faltantes.push(`${m}${i + 1}`));
    if (safety === null) faltantes.push("safety");
    if (marcarFaltantes(faltantes)) return;
    const respuesta = {
      v: 1,
      instrumento: "AEI",
      gad: tiene("gad") ? listas.gad : null,
      dass: tiene("dass") ? listas.dass : null,
      ptq: tiene("ptq") ? listas.ptq : null,
      docs: tiene("docs") ? listas.docs : null,
      safety,
      func: tiene("gad") ? func : null,
      ref: codigoCaso,
      nombre: "",
      edad: null,
      fecha: "",
      abierta: abierta.trim(),
      enviado: new Date().toISOString(),
    };
    if (await enviarRespuesta(respuesta)) setSeguridadEnviada(safety ?? 0);
  };

  if (fase === "enviado") {
    return (
      <PantallaEnviada mensaje={`Gracias por responder. ${EAPI_GRACIAS}`} testId="ea-gracias" trato="usted">
        {seguridadEnviada >= 1 ? (
          <div
            className="mx-auto grid max-w-lg gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950"
            data-testid="ea-crisis"
          >
            <p className="flex items-center gap-2 font-semibold">
              <LifeBuoy className="h-4 w-4" />
              Un mensaje importante para usted.
            </p>
            <p>{EAPI_CRISIS}</p>
            <ul className="list-disc pl-5">
              {EAPI_LINEAS_AYUDA.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </PantallaEnviada>
    );
  }
  if (fase === "cerrado") return <PantallaCerrada testId="ea-cerrado" trato="usted" />;

  const bloque = (
    titulo: string,
    intro: string,
    etiquetas?: readonly string[],
  ) => (
    <div className="pt-2">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{intro}</p>
      {etiquetas ? <Escala etiquetas={etiquetas} /> : null}
    </div>
  );

  return (
    <div className="grid gap-5">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="ea-guardado" total={requeridas} trato="usted" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => void enviar()} trato="usted" /> : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
          {EAPI_TITULO_PACIENTE}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tiempo aproximado: {minutosEapi(modulos)} minutos. Sus respuestas las
          revisará únicamente su psicólogo. Puede cerrar la página y continuar
          después con el mismo enlace.
        </p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
        {EAPI_INTRO}
      </div>

      {tiene("gad") ? (
        <>
          {bloque(tituloBloque("gad"), EAPI_BLOQUES.gad.intro, GAD_LABELS)}
          <div className="grid gap-2">
            {GAD7.map((t, i) => (
              <Pregunta
                etiquetas={GAD_LABELS}
                falta={faltan.has(`gad${i + 1}`)}
                id={`gad${i + 1}`}
                key={i}
                numero={String(i + 1)}
                onElegir={(v) => elegir("gad", i, v)}
                texto={t}
                valor={listas.gad[i]}
              />
            ))}
            <Pregunta
              etiquetas={GAD_FUNC.labels}
              falta={false}
              id="func"
              numero="+"
              onElegir={setFunc}
              texto={`${GAD_FUNC.t} (opcional)`}
              valor={func}
            />
          </div>
        </>
      ) : null}

      {tiene("dass") ? (
        <>
          {bloque(tituloBloque("dass"), EAPI_BLOQUES.dass.intro, DASS_LABELS)}
          <div className="grid gap-2">
            {DASS21.map((t, i) => (
              <Pregunta
                etiquetas={DASS_LABELS}
                falta={faltan.has(`dass${i + 1}`)}
                id={`dass${i + 1}`}
                key={i}
                numero={String(i + 1)}
                onElegir={(v) => elegir("dass", i, v)}
                texto={t}
                valor={listas.dass[i]}
              />
            ))}
          </div>
        </>
      ) : null}

      {tiene("ptq") ? (
        <>
          {bloque(tituloBloque("ptq"), EAPI_BLOQUES.ptq.intro, PTQ_LABELS)}
          <div className="grid gap-2">
            {PTQ.map((t, i) => (
              <Pregunta
                etiquetas={PTQ_LABELS}
                falta={faltan.has(`ptq${i + 1}`)}
                id={`ptq${i + 1}`}
                key={i}
                numero={String(i + 1)}
                onElegir={(v) => elegir("ptq", i, v)}
                texto={t}
                valor={listas.ptq[i]}
              />
            ))}
          </div>
        </>
      ) : null}

      {tiene("docs") ? (
        <>
          {bloque(tituloBloque("docs"), EAPI_BLOQUES.docs.intro)}
          {DOCS.map((cat, ci) => (
            <div
              className="grid gap-2 rounded-2xl border border-slate-200 p-3"
              key={cat.id}
            >
              <h3 className="text-base font-semibold text-slate-900">
                Categoría {ci + 1}: {cat.name}
              </h3>
              <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <strong>Ejemplos…</strong>
                <ul className="mt-1 list-disc pl-5">
                  {cat.ex.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm leading-6 text-slate-600">{cat.lead}</p>
              {cat.q.map((q, qi) => {
                const i = ci * 5 + qi;
                return (
                  <Pregunta
                    etiquetas={q.l}
                    falta={faltan.has(`docs${i + 1}`)}
                    id={`docs${i + 1}`}
                    key={qi}
                    numero={`${ci + 1}.${qi + 1}`}
                    onElegir={(v) => elegir("docs", i, v)}
                    texto={q.t}
                    valor={listas.docs[i]}
                  />
                );
              })}
            </div>
          ))}
        </>
      ) : null}

      {bloque(EAPI_BLOQUES.safety.titulo, EAPI_BLOQUES.safety.intro)}
      <Pregunta
        etiquetas={SAFETY.labels}
        falta={faltan.has("safety")}
        id="safety"
        numero="S"
        onElegir={(v) => {
          setSafety(v);
          quitarFalta("safety");
        }}
        texto={SAFETY.t}
        valor={safety}
      />

      <h2 className="pt-2 text-lg font-semibold text-slate-900">
        Para terminar
      </h2>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">
          {EAPI_ABIERTA} (opcional)
        </span>
        <textarea
          className="field-light min-h-28 resize-y"
          onChange={(e) => setAbierta(e.target.value)}
          value={abierta}
        />
      </label>

      <PieEnvio error={error} fase={fase} onEnviar={() => void enviar()} />
      <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
        Cuestionario de orientación para su atención psicológica. Sus respuestas
        son confidenciales; los resultados los interpreta y conversa con usted
        su psicólogo.
      </p>
    </div>
  );
}
