"use client";

import { useCallback, useState } from "react";
import type { RiasecBorrador } from "@/lib/evaluaciones/riasec/codigo";
import {
  RIASEC_ESCALA,
  RIASEC_ESTUDIOS,
  RIASEC_GRACIAS,
  RIASEC_INTRO,
  RIASEC_ITEMS,
  RIASEC_ORDEN,
  RIASEC_PREGUNTA_CARRERAS,
  RIASEC_PREGUNTA_ESCALA,
  RIASEC_TITULO_PACIENTE,
} from "@/lib/evaluaciones/riasec/escalas";
import {
  AvisoFalloEnvio,
  BarraGuardado,
  PantallaCerrada,
  PantallaEnviada,
  PieEnvio,
  Pregunta,
  useFormularioEvaluacion,
} from "./formulario-comun";

// Importante: este formulario NO importa la calificación ni el código de tipo
// de cada pregunta: quien responde no ve puntuaciones ni a qué tipo pertenece cada frase.

export function RiasecForm({ borradorInicial, codigoCaso, token }: { borradorInicial: RiasecBorrador | null; codigoCaso: string; token: string }) {
  const b = borradorInicial;
  const [estudios, setEstudios] = useState(b?.estudios ?? "");
  const [carreras, setCarreras] = useState(b?.carreras ?? "");
  const [items, setItems] = useState<(number | null)[]>(() => b?.items ?? Array(36).fill(null));
  const [continua] = useState(() => Boolean(b && b.items.some((v) => v !== null)));

  // Nombre, edad y fecha se toman del expediente al enviar.
  const borrador = useCallback(
    (): RiasecBorrador => ({ nombre: "", edad: "", estudios, carreras, fecha: "", items }),
    [estudios, carreras, items]
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
    // En el orden en que se muestran, para llevar a la primera que falta.
    RIASEC_ORDEN.forEach((n) => items[n - 1] === null && faltantes.push(`it${n}`));
    if (marcarFaltantes(faltantes, "Faltan preguntas por responder. Las hemos marcado en rojo.")) return;
    const respuesta = {
      v: 1,
      instrumento: "RIASEC",
      items,
      nombre: "",
      edad: null,
      estudios,
      carreras: carreras.trim(),
      fecha: "",
      ref: codigoCaso,
      enviado: new Date().toISOString(),
    };
    await enviarRespuesta(respuesta);
  };

  if (fase === "enviado") return <PantallaEnviada mensaje={`¡Gracias por responder! ${RIASEC_GRACIAS}`} testId="ri-gracias" trato="tu" />;
  if (fase === "cerrado") return <PantallaCerrada testId="ri-cerrado" trato="tu" />;

  return (
    <div className="grid gap-5">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="ri-guardado" total={36} trato="tu" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => void enviar()} trato="tu" /> : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{RIASEC_TITULO_PACIENTE}</h1>
        <p className="mt-2 text-sm text-slate-500">Tiempo aproximado: 8 a 10 minutos. Puedes cerrar la página y continuar después con el mismo enlace.</p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">{RIASEC_INTRO}</div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 p-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Nivel de estudios actual</span>
          <select className="field-light" onChange={(e) => setEstudios(e.target.value)} value={estudios}>
            <option value="">Seleccione…</option>
            {RIASEC_ESTUDIOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900">{RIASEC_PREGUNTA_ESCALA}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{RIASEC_ESCALA.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      </div>
      <div className="grid gap-2">
        {RIASEC_ORDEN.map((n, pos) => (
          <Pregunta
            etiquetas={RIASEC_ESCALA}
            falta={faltan.has(`it${n}`)}
            id={`it${n}`}
            key={n}
            numero={String(pos + 1)}
            onElegir={(v) => {
              setItems((prev) => prev.map((x, j) => (j === n - 1 ? v : x)));
              quitarFalta(`it${n}`);
            }}
            texto={RIASEC_ITEMS[n - 1]}
            valor={items[n - 1]}
          />
        ))}
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">{RIASEC_PREGUNTA_CARRERAS}</span>
        <textarea className="field-light min-h-24 resize-y" maxLength={2000} onChange={(e) => setCarreras(e.target.value)} value={carreras} />
      </label>

      <PieEnvio error={error} fase={fase} onEnviar={() => void enviar()} />
    </div>
  );
}
