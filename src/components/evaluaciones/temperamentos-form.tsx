"use client";

import { useCallback, useState } from "react";
import type { TemperamentosBorrador } from "@/lib/evaluaciones/temperamentos/codigo";
import {
  TEMPERAMENTOS_ESCALA,
  TEMPERAMENTOS_GRACIAS,
  TEMPERAMENTOS_INTRO,
  TEMPERAMENTOS_ITEMS,
  TEMPERAMENTOS_N_ITEMS,
  TEMPERAMENTOS_PREGUNTA_ABIERTA,
  TEMPERAMENTOS_PREGUNTA_ESCALA,
  TEMPERAMENTOS_SITUACION,
  TEMPERAMENTOS_TIEMPO,
  TEMPERAMENTOS_TITULO_PACIENTE,
} from "@/lib/evaluaciones/temperamentos/escalas";
import {
  AvisoFalloEnvio,
  BarraGuardado,
  PantallaCerrada,
  PantallaEnviada,
  PieEnvio,
  Pregunta,
  useFormularioEvaluacion,
} from "./formulario-comun";

// Importante: este formulario NO importa la calificación ni el contenido
// interpretativo: quien responde no ve puntuaciones ni nombres de temperamentos.
// Los ítems se guardan en el orden en que se muestran (ítem n = posición n).

export function TemperamentosForm({ borradorInicial, codigoCaso, token }: { borradorInicial: TemperamentosBorrador | null; codigoCaso: string; token: string }) {
  const b = borradorInicial;
  const [situacion, setSituacion] = useState(b?.situacion ?? "");
  const [abierta, setAbierta] = useState(b?.abierta ?? "");
  const [items, setItems] = useState<(number | null)[]>(() => b?.items ?? Array(TEMPERAMENTOS_N_ITEMS).fill(null));
  const [continua] = useState(() => Boolean(b && b.items.some((v) => v !== null)));

  const borrador = useCallback(
    // Nombre, edad y fecha se toman del expediente al enviar.
    (): TemperamentosBorrador => ({ nombre: "", edad: "", situacion, abierta, fecha: "", items }),
    [situacion, abierta, items]
  );

  const { error, enviar: enviarRespuesta, faltan, fase, guardado, marcarFaltantes, quitarFalta } = useFormularioEvaluacion({
    borrador,
    prefijoId: "ea",
    token,
  });

  const respondidas = items.filter((v) => v !== null).length;

  const enviar = async () => {
    if (fase === "enviando") return;
    const faltantes: string[] = [];
    items.forEach((v, i) => v === null && faltantes.push(`it${i + 1}`));
    if (marcarFaltantes(faltantes, "Faltan preguntas por responder. Las hemos marcado en rojo.")) return;
    const respuesta = {
      v: 1,
      instrumento: "TEMPERAMENTOS",
      items,
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

  if (fase === "enviado") return <PantallaEnviada mensaje={`¡Gracias por responder! ${TEMPERAMENTOS_GRACIAS}`} testId="te-gracias" trato="usted" />;
  if (fase === "cerrado") return <PantallaCerrada testId="te-cerrado" trato="usted" />;

  return (
    <div className="grid gap-5">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="te-guardado" total={TEMPERAMENTOS_N_ITEMS} trato="usted" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => void enviar()} trato="usted" /> : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{TEMPERAMENTOS_TITULO_PACIENTE}</h1>
        <p className="mt-2 text-sm text-slate-500">{TEMPERAMENTOS_TIEMPO}</p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">{TEMPERAMENTOS_INTRO}</div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 p-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Actualmente usted está</span>
          <select className="field-light" onChange={(e) => setSituacion(e.target.value)} value={situacion}>
            <option value="">Seleccione…</option>
            {TEMPERAMENTOS_SITUACION.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900">{TEMPERAMENTOS_PREGUNTA_ESCALA}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{TEMPERAMENTOS_ESCALA.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      </div>
      <div className="grid gap-2">
        {TEMPERAMENTOS_ITEMS.map((texto, i) => (
          <Pregunta
            etiquetas={TEMPERAMENTOS_ESCALA}
            falta={faltan.has(`it${i + 1}`)}
            id={`it${i + 1}`}
            key={i}
            numero={String(i + 1)}
            onElegir={(v) => {
              setItems((prev) => prev.map((x, j) => (j === i ? v : x)));
              quitarFalta(`it${i + 1}`);
            }}
            texto={texto}
            valor={items[i]}
          />
        ))}
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">{TEMPERAMENTOS_PREGUNTA_ABIERTA}</span>
        <textarea className="field-light min-h-24 resize-y" maxLength={2000} onChange={(e) => setAbierta(e.target.value)} value={abierta} />
      </label>

      <PieEnvio error={error} fase={fase} onEnviar={() => void enviar()} />
    </div>
  );
}
