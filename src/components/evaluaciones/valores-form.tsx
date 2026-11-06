"use client";

import { useCallback, useState } from "react";
import type { ValoresBorrador } from "@/lib/evaluaciones/valores/codigo";
import {
  VALORES_ESCALA,
  VALORES_GRACIAS,
  VALORES_IDS,
  VALORES_INTRO,
  VALORES_ITEMS,
  VALORES_NOMBRES,
  VALORES_ORDEN,
  VALORES_PREGUNTA_ABIERTA,
  VALORES_PREGUNTA_ELEGIR,
  VALORES_PREGUNTA_ESCALA,
  VALORES_SITUACION,
  VALORES_TITULO_PACIENTE,
  type ValorId,
} from "@/lib/evaluaciones/valores/escalas";
import {
  AvisoFalloEnvio,
  BarraGuardado,
  PantallaCerrada,
  PantallaEnviada,
  PieEnvio,
  Pregunta,
  useFormularioEvaluacion,
} from "./formulario-comun";

// Importante: este formulario NO importa la calificación ni el valor al que
// pertenece cada frase: quien responde no ve puntuaciones.

export function ValoresForm({ borradorInicial, codigoCaso, token }: { borradorInicial: ValoresBorrador | null; codigoCaso: string; token: string }) {
  const b = borradorInicial;
  const [situacion, setSituacion] = useState(b?.situacion ?? "");
  const [abierta, setAbierta] = useState(b?.abierta ?? "");
  const [elegidos, setElegidos] = useState<ValorId[]>(b?.elegidos ?? []);
  const [items, setItems] = useState<(number | null)[]>(() => b?.items ?? Array(24).fill(null));
  const [continua] = useState(() => Boolean(b && (b.items.some((v) => v !== null) || b.elegidos.length)));

  const borrador = useCallback(
    // Nombre, edad y fecha se toman del expediente al enviar.
    (): ValoresBorrador => ({ nombre: "", edad: "", situacion, abierta, fecha: "", items, elegidos }),
    [situacion, abierta, items, elegidos]
  );

  const { error, enviar: enviarRespuesta, faltan, fase, guardado, marcarFaltantes, quitarFalta } = useFormularioEvaluacion({
    borrador,
    prefijoId: "ea",
    token,
  });

  const respondidas = items.filter((v) => v !== null).length + (elegidos.length === 3 ? 1 : 0);
  const total = 25;

  const alternarValor = (v: ValorId) => {
    setElegidos((l) => (l.includes(v) ? l.filter((x) => x !== v) : l.length < 3 ? [...l, v] : l));
    quitarFalta("elegidos");
  };

  const enviar = async () => {
    if (fase === "enviando") return;
    const faltantes: string[] = [];
    // En el orden en que se muestran, para llevar a la primera que falta.
    VALORES_ORDEN.forEach((n) => items[n - 1] === null && faltantes.push(`it${n}`));
    if (elegidos.length !== 3) faltantes.push("elegidos");
    if (marcarFaltantes(faltantes, faltantes.length === 1 && faltantes[0] === "elegidos"
          ? "Elige los 3 valores más importantes para ti."
          : "Faltan preguntas por responder. Las hemos marcado en rojo.")) return;
    const respuesta = {
      v: 1,
      instrumento: "VALORES",
      items,
      elegidos,
      nombre: "",
      edad: null,
      situacion,
      abierta: abierta.trim(),
      fecha: "",
      ref: codigoCaso,
      enviado: new Date().toISOString(),
    };
    await enviarRespuesta(respuesta);
  };

  if (fase === "enviado") return <PantallaEnviada mensaje={`¡Gracias por responder! ${VALORES_GRACIAS}`} testId="va-gracias" trato="tu" />;
  if (fase === "cerrado") return <PantallaCerrada testId="va-cerrado" trato="tu" />;

  return (
    <div className="grid gap-5">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="va-guardado" total={total} trato="tu" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => void enviar()} trato="tu" /> : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{VALORES_TITULO_PACIENTE}</h1>
        <p className="mt-2 text-sm text-slate-500">Tiempo aproximado: 5 a 7 minutos. Puedes cerrar la página y continuar después con el mismo enlace.</p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">{VALORES_INTRO}</div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 p-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Actualmente estás</span>
          <select className="field-light" onChange={(e) => setSituacion(e.target.value)} value={situacion}>
            <option value="">Seleccione…</option>
            {VALORES_SITUACION.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900">{VALORES_PREGUNTA_ESCALA}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{VALORES_ESCALA.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      </div>
      <div className="grid gap-2">
        {VALORES_ORDEN.map((n, pos) => (
          <Pregunta
            etiquetas={VALORES_ESCALA}
            falta={faltan.has(`it${n}`)}
            id={`it${n}`}
            key={n}
            numero={String(pos + 1)}
            onElegir={(v) => {
              setItems((prev) => prev.map((x, j) => (j === n - 1 ? v : x)));
              quitarFalta(`it${n}`);
            }}
            texto={VALORES_ITEMS[n - 1]}
            valor={items[n - 1]}
          />
        ))}
      </div>

      <fieldset
        className={`grid gap-2 rounded-xl border p-3 ${faltan.has("elegidos") ? "border-red-300 bg-red-50/60" : "border-slate-200"}`}
        data-falta={faltan.has("elegidos") ? "si" : undefined}
        id="ea-elegidos"
      >
        <legend className="px-1 text-lg font-semibold text-slate-900">{VALORES_PREGUNTA_ELEGIR}</legend>
        <p className="text-xs text-slate-500">Elegidos: {elegidos.length} de 3. Para cambiar uno, desmárcalo primero.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VALORES_IDS.map((v) => {
            const activo = elegidos.includes(v);
            const bloqueado = !activo && elegidos.length >= 3;
            return (
              <label
                className={`flex min-h-12 cursor-pointer items-start gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm leading-tight transition ${
                  activo ? "border-teal-600 bg-teal-50 text-teal-900" : bloqueado ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
                key={v}
              >
                <input checked={activo} className="mt-0.5" disabled={bloqueado} onChange={() => alternarValor(v)} type="checkbox" />
                <span>
                  <strong className="block">{VALORES_NOMBRES[v].nombre}</strong>
                  <span className="text-xs">{VALORES_NOMBRES[v].frase}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">{VALORES_PREGUNTA_ABIERTA}</span>
        <textarea className="field-light min-h-24 resize-y" maxLength={2000} onChange={(e) => setAbierta(e.target.value)} value={abierta} />
      </label>

      <PieEnvio error={error} fase={fase} onEnviar={() => void enviar()} />
    </div>
  );
}
