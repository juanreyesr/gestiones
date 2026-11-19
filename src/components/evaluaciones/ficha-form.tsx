"use client";

import { useCallback, useMemo, useState } from "react";
import {
  camposDeFicha,
  fichaPorId,
  FICHA_AVISO_AYUDA,
  FICHA_GRACIAS,
  FICHA_INTRO_GENERAL,
  FICHA_TITULO_PUBLICO,
  type FichaId,
} from "@/lib/evaluaciones/fichas/catalogo";
import {
  avanceFicha,
  campoTieneContenido,
  respuestasVacias,
  type FichaBorrador,
  type RespuestasFicha,
} from "@/lib/evaluaciones/fichas/codigo";
import { riesgoFicha } from "@/lib/evaluaciones/fichas/riesgo";
import { EAPI_LINEAS_AYUDA } from "@/lib/evaluaciones/eapi/escalas";
import { CampoFicha, type Poner } from "./ficha-campos";
import { AvisoFalloEnvio, BarraGuardado, PantallaCerrada, PantallaEnviada, PieEnvio, useFormularioEvaluacion } from "./formulario-comun";

// Importante: este formulario NO importa la guía del terapeuta ni ninguna
// calificación: quien responde solo ve la parte para el paciente.

export function FichaForm({
  borradorInicial,
  codigoCaso,
  ficha: fichaId,
  token,
}: {
  borradorInicial: FichaBorrador | null;
  codigoCaso: string;
  ficha: FichaId;
  token: string;
}) {
  const ficha = fichaPorId(fichaId)!;
  const campos = useMemo(() => camposDeFicha(ficha), [ficha]);
  const [respuestas, setRespuestas] = useState<RespuestasFicha>(() => ({
    ...respuestasVacias(ficha),
    ...(borradorInicial?.ficha === fichaId ? borradorInicial.respuestas : {}),
  }));
  const [continua] = useState(() => Boolean(borradorInicial && borradorInicial.ficha === fichaId && avanceFicha(borradorInicial).respondidas > 0));

  const borrador = useCallback((): FichaBorrador => ({ ficha: fichaId, respuestas }), [fichaId, respuestas]);
  const { error, enviar: enviarRespuesta, faltan, fase, guardado, marcarFaltantes, quitarFalta } = useFormularioEvaluacion({ borrador, prefijoId: "ficha", token });

  const poner: Poner = (id, valor) => {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
    quitarFalta(id);
  };
  const { respondidas, total } = avanceFicha({ ficha: fichaId, respuestas });
  const hayRiesgo = useMemo(() => riesgoFicha(ficha, respuestas).riesgo, [ficha, respuestas]);

  const enviar = async () => {
    if (fase === "enviando") return;
    const obligatorios = campos.filter((c) => c.requerido && !campoTieneContenido(c, respuestas[c.id])).map((c) => c.id);
    if (marcarFaltantes(obligatorios, "Faltan campos obligatorios. Los hemos marcado en rojo.")) return;
    const vacios = total - respondidas;
    if (
      vacios > 0 &&
      !window.confirm(
        `Hay ${vacios} ${vacios === 1 ? "pregunta" : "preguntas"} sin responder. Puede enviarla así y conversarlo en la sesión.\n\nAl enviar, la ficha se cierra y ya no se puede modificar. ¿Desea enviarla?`
      )
    )
      return;
    await enviarRespuesta({ v: 1, instrumento: "FICHA", ficha: fichaId, respuestas, ref: codigoCaso, enviado: new Date().toISOString() });
  };

  if (fase === "enviado")
    return (
      <PantallaEnviada mensaje={`¡Gracias por responder! ${FICHA_GRACIAS}`} testId="ficha-gracias" trato="usted">
        {hayRiesgo ? (
          <div className="mx-auto grid max-w-md gap-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900" data-testid="ficha-ayuda">
            <p>{FICHA_AVISO_AYUDA}</p>
            <ul className="list-disc pl-5">
              {EAPI_LINEAS_AYUDA.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </PantallaEnviada>
    );
  if (fase === "cerrado") return <PantallaCerrada testId="ficha-cerrado" trato="usted" />;

  return (
    <div className="grid gap-5">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="ficha-guardado" total={total} trato="usted" unidad="preguntas respondidas" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => void enviar()} trato="usted" /> : null}

      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">{FICHA_TITULO_PUBLICO}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
          Ficha {ficha.id} · {ficha.titulo}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{ficha.tiempo}</p>
      </div>
      <div className="grid gap-2 rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
        {ficha.explicacion.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className="text-xs text-slate-500">{FICHA_INTRO_GENERAL}</p>
      </div>

      {ficha.secciones.map((s) => (
        <section className="grid gap-3" key={s.id}>
          <h2 className="border-t border-slate-100 pt-4 text-lg font-semibold text-slate-900">{s.titulo}</h2>
          <p className="-mt-1 rounded-xl bg-teal-50/60 p-3 text-sm leading-6 text-slate-700">{s.intro}</p>
          {s.campos.map((c) => (
            <CampoFicha c={c} falta={faltan.has(c.id)} key={c.id} poner={poner} respuestas={respuestas} />
          ))}
        </section>
      ))}

      <section className="grid gap-3">
        <h2 className="border-t border-slate-100 pt-4 text-lg font-semibold text-slate-900">{ficha.cierre.titulo}</h2>
        <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{ficha.cierre.texto}</p>
        {ficha.cierre.campos.map((c) => (
          <CampoFicha c={c} falta={faltan.has(c.id)} key={c.id} poner={poner} respuestas={respuestas} />
        ))}
      </section>

      <details className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">¿Necesita ayuda urgente?</summary>
        <div className="mt-2 grid gap-1 leading-6">
          <p>{FICHA_AVISO_AYUDA}</p>
          <ul className="list-disc pl-5">
            {EAPI_LINEAS_AYUDA.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </details>

      <PieEnvio error={error} fase={fase} onEnviar={() => void enviar()} />
    </div>
  );
}
