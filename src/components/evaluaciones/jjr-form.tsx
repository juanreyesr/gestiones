"use client";

import { useCallback, useState } from "react";
import {
  itemsJjr,
  JJR_ESCALA,
  JJR_INSTRUCCIONES,
  JJR_NC,
  JJR_PREGUNTAS_ABIERTAS,
  JJR_TITULO_PACIENTE,
  type FormaJjr,
  type InstrumentoJjr,
  type JjrBorrador,
  type ValorJjr,
} from "@/lib/evaluaciones/jjr/codigo";
import { AvisoFalloEnvio, BarraGuardado, PantallaCerrada, PantallaEnviada, PieEnvio, useFormularioEvaluacion } from "./formulario-comun";

// Importante: este formulario NO importa la calificación ni muestra el campo,
// la clave ni la forma: quien responde solo ve las actividades.

export function JjrForm({
  borradorInicial,
  forma,
  instrumento,
  token,
}: {
  borradorInicial: JjrBorrador | null;
  forma: FormaJjr | null;
  instrumento: InstrumentoJjr;
  token: string;
}) {
  const items = itemsJjr(instrumento, forma);
  const b = borradorInicial;
  const [respuestas, setRespuestas] = useState<Record<string, ValorJjr>>(() => b?.respuestas ?? {});
  const [otras, setOtras] = useState(b?.otras ?? "");
  const [noConocia, setNoConocia] = useState(b?.noConocia ?? "");
  const [inicio] = useState(() => b?.inicio || new Date().toISOString());
  const [continua] = useState(() => Boolean(b && Object.keys(b.respuestas).length));
  const [avisoOmitidas, setAvisoOmitidas] = useState(false);

  const borrador = useCallback((): JjrBorrador => ({ respuestas, otras, noConocia, inicio }), [respuestas, otras, noConocia, inicio]);
  const { error, enviar: enviarRespuesta, faltan, fase, guardado, marcarFaltantes, quitarFalta, setError } = useFormularioEvaluacion({
    borrador,
    prefijoId: "jj",
    token,
  });

  const respondidas = items.filter((i) => respuestas[i.id] !== undefined && respuestas[i.id] !== null).length;

  const elegir = (id: string, v: ValorJjr) => {
    setRespuestas((prev) => ({ ...prev, [id]: v }));
    quitarFalta(id);
  };

  const enviar = async () => {
    if (fase === "enviando") return;
    const sin = items.filter((i) => respuestas[i.id] === undefined || respuestas[i.id] === null).map((i) => i.id);
    if (sin.length === items.length) {
      setError("Responde al menos una actividad antes de enviar.");
      return;
    }
    // Las omisiones se permiten, pero primero se muestran (segundo toque = enviar así).
    if (sin.length && !avisoOmitidas) {
      setAvisoOmitidas(true);
      marcarFaltantes(
        sin,
        `Quedan ${sin.length} ${sin.length === 1 ? "actividad" : "actividades"} sin responder (marcadas en rojo). Puedes responderlas o volver a presionar «Enviar respuestas» para enviar así.`
      );
      return;
    }
    await enviarRespuesta({
      v: 1,
      respuestas: Object.fromEntries(items.map((i) => [i.id, respuestas[i.id] ?? null])),
      abiertas: { otras: otras.trim(), noConocia: noConocia.trim() },
      inicio,
    });
  };

  if (fase === "enviado")
    return (
      <PantallaEnviada
        mensaje="¡Gracias por responder! Tu psicólogo revisará tus respuestas y las conversarán juntos. Recuerda: este cuestionario explora lo que te gustaría hacer; no mide lo que sabes ni decide tu carrera."
        testId="jj-gracias"
        trato="tu"
      />
    );
  if (fase === "cerrado") return <PantallaCerrada testId="jj-cerrado" trato="tu" />;

  return (
    <div className="grid gap-5">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="jj-guardado" total={items.length} trato="tu" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => void enviar()} trato="tu" /> : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{JJR_TITULO_PACIENTE}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {items.length} actividades. Tómate tu tiempo: puedes cerrar la página y continuar después con el mismo enlace.
        </p>
      </div>
      <div className="grid gap-2 rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
        {JJR_INSTRUCCIONES.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p className="text-xs text-slate-500">{JJR_ESCALA.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      </div>

      <div className="grid gap-2">
        {items.map((it, pos) => {
          const valor = respuestas[it.id] ?? null;
          const falta = faltan.has(it.id);
          return (
            <fieldset
              className={`rounded-xl border p-3 ${falta ? "border-red-300 bg-red-50/60" : "border-transparent"}`}
              data-falta={falta ? "si" : undefined}
              id={`jj-${it.id}`}
              key={it.id}
            >
              <legend className="sr-only">Actividad {pos + 1}</legend>
              <div className="mb-3 flex gap-3">
                <span
                  className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold ${
                    falta ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {pos + 1}
                </span>
                <p className="pt-1 text-[15px] leading-6 text-slate-800">{it.actividad}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {JJR_ESCALA.map((etiqueta, v) => (
                  <Opcion activo={valor === v} falta={falta} key={v} nombre={it.id} onElegir={() => elegir(it.id, v as ValorJjr)}>
                    <span className="text-base font-bold text-slate-900">{v}</span>
                    <span>{etiqueta}</span>
                  </Opcion>
                ))}
                <Opcion activo={valor === "NC"} falta={falta} nombre={it.id} onElegir={() => elegir(it.id, "NC")} secundaria>
                  <span>{JJR_NC}</span>
                </Opcion>
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="grid gap-4 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500">Para terminar, dos preguntas opcionales (no tienen puntaje):</p>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">{JJR_PREGUNTAS_ABIERTAS.otras}</span>
          <textarea className="field-light min-h-20 resize-y" maxLength={2000} onChange={(e) => setOtras(e.target.value)} value={otras} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">{JJR_PREGUNTAS_ABIERTAS.noConocia}</span>
          <textarea className="field-light min-h-20 resize-y" maxLength={2000} onChange={(e) => setNoConocia(e.target.value)} value={noConocia} />
        </label>
      </div>

      <PieEnvio error={error} fase={fase} onEnviar={() => void enviar()} />
    </div>
  );
}

function Opcion({
  activo,
  children,
  falta,
  nombre,
  onElegir,
  secundaria = false,
}: {
  activo: boolean;
  children: React.ReactNode;
  falta: boolean;
  nombre: string;
  onElegir: () => void;
  secundaria?: boolean;
}) {
  return (
    <label
      className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-xs leading-tight transition ${
        secundaria ? "col-span-2 sm:col-span-5" : ""
      } ${
        activo
          ? secundaria
            ? "border-slate-500 bg-slate-100 text-slate-800"
            : "border-teal-600 bg-teal-50 text-teal-900"
          : falta
            ? "border-red-300 bg-white text-slate-600"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      <input checked={activo} className="sr-only" name={nombre} onChange={onElegir} type="radio" />
      {children}
    </label>
  );
}
