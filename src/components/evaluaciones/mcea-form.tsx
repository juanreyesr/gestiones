"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BEH, EMO, FOCUS, INS, MCEA_CRISIS } from "@/lib/evaluaciones/mcea/contenido";
import { opcionesMcea, type MceaBorrador } from "@/lib/evaluaciones/mcea/codigo";
import { buildPlan, etiquetas, type MceaEstado, type RegistroGuiado } from "@/lib/evaluaciones/mcea/motor";
import { AvisoFalloEnvio, BarraGuardado, PantallaCerrada, PantallaEnviada, useFormularioEvaluacion } from "./formulario-comun";

// Formulario público del MCEA: una pregunta por pantalla; el plan se recalcula
// con cada respuesta (solo se abren los módulos que la persona necesita).
// No muestra puntuaciones.

const BTN = "rounded-xl border-2 px-4 py-3 text-left text-[15px] transition";
const btnOpcion = (activo: boolean) =>
  `${BTN} ${activo ? "border-teal-600 bg-teal-50 font-semibold text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`;
const PRIMARIO = "rounded-xl bg-teal-700 px-5 py-3 text-base font-bold text-white transition hover:bg-teal-800 disabled:opacity-60";
const SECUNDARIO = "rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50";

function Crisis() {
  return (
    <ul className="list-disc pl-5 text-sm leading-6">
      {MCEA_CRISIS.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

export function MceaForm({ borradorInicial, opciones, token }: { borradorInicial: MceaBorrador | null; opciones: Record<string, unknown> | null | undefined; token: string }) {
  const op = opcionesMcea(opciones);
  const b = borradorInicial;
  const [estado, setEstado] = useState<MceaEstado>(() => ({
    modo: op.modo,
    anchor: op.anchor,
    focus: b?.focus ?? [],
    gate: b?.gate ?? null,
    answers: b?.answers ?? {},
    risk: b?.risk ?? { self: null },
    tr: b?.tr ?? null,
  }));
  const [pos, setPos] = useState(() => b?.pos ?? 0);
  const [inicio] = useState(() => b?.inicio || new Date().toISOString());
  const [continua] = useState(() => Boolean(b && b.pos > 0));
  const [aceptado, setAceptado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [riesgoEtapa, setRiesgoEtapa] = useState<1 | 2>(1);
  const [focoSel, setFocoSel] = useState<string[]>(() => b?.focus ?? []);
  const [registro, setRegistro] = useState<RegistroGuiado>({ sit: "", emo: [], int: 50, pen: "", f1: "", f2: "", beh: [], dis: [] });
  const mostrado = useRef(0);

  const borrador = useCallback((): MceaBorrador => ({ ...estado, pos, inicio }), [estado, pos, inicio]);
  const { enviar: enviarRespuesta, fase, guardado, error } = useFormularioEvaluacion({ borrador, prefijoId: "mc", token });

  const plan = buildPlan(estado);
  const i = Math.min(pos, plan.length - 1);
  const paso = plan[i];
  const items = plan.filter((p) => p.t === "item");
  const respondidas = items.filter((p) => p.t === "item" && estado.answers[`${p.ins}_${p.i}`]).length;

  useEffect(() => {
    mostrado.current = Date.now();
    window.scrollTo({ top: 0 });
  }, [i, riesgoEtapa]);

  const enviar = useCallback(
    (e: MceaEstado, detenida = false) =>
      void enviarRespuesta({ v: 1, ...e, estado: detenida ? "detenida" : "completa", inicio }),
    [enviarRespuesta, inicio]
  );

  /** Avanza al siguiente paso con el estado nuevo; al llegar al final, envía. */
  const avanzar = (nuevo: MceaEstado) => {
    setEstado(nuevo);
    setRiesgoEtapa(1);
    setAviso("");
    const p = buildPlan(nuevo);
    const sig = Math.min(i + 1, p.length - 1);
    setPos(sig);
    if (p[sig].t === "end") enviar(nuevo);
  };
  const atras = () => {
    setRiesgoEtapa(1);
    setPos(Math.max(0, i - 1));
  };

  if (fase === "enviado")
    return (
      <PantallaEnviada
        mensaje="Sus respuestas quedaron guardadas. Su psicólogo las revisará y conversará con usted sobre lo que muestran."
        testId="mc-gracias"
        trato="usted"
      >
        <div className="mx-auto max-w-md rounded-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-left text-slate-700">
          <p className="mb-1 text-sm font-semibold">Si necesita ayuda antes de su próxima cita:</p>
          <Crisis />
        </div>
      </PantallaEnviada>
    );
  if (fase === "cerrado") return <PantallaCerrada testId="mc-cerrado" trato="usted" />;

  const anterior = i > 0 && paso.t !== "end" ? (
    <button className={SECUNDARIO} onClick={atras} type="button">
      Anterior
    </button>
  ) : null;

  let contenido: React.ReactNode = null;
  if (paso.t === "consent") {
    contenido = (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Antes de empezar</h1>
        <p className="text-[15px] leading-7 text-slate-700">
          Este cuestionario ayuda a entender cómo se ha sentido y qué formas de pensar pueden estar influyendo. No es un examen y no hay respuestas
          buenas o malas.
        </p>
        <ul className="list-disc pl-5 text-[15px] leading-7 text-slate-700">
          <li>Dura entre 6 y 15 minutos. Se ajusta a lo que usted responda.</li>
          <li>Sus respuestas las verá únicamente su psicólogo y se guardan de forma confidencial.</li>
          <li>La confidencialidad tiene un límite: si hay riesgo para su vida o la de otra persona, su psicólogo actuará para protegerle.</li>
          <li>Puede detenerse cuando quiera y continuar después con el mismo enlace.</li>
          <li>Es un tamizaje. No da un diagnóstico por sí mismo.</li>
        </ul>
        <label className="flex items-start gap-2 text-[15px] text-slate-800">
          <input checked={aceptado} className="mt-1 h-4 w-4" onChange={(e) => setAceptado(e.target.checked)} type="checkbox" />
          <span>Ya firmé el consentimiento informado y acepto responder.</span>
        </label>
        {aviso ? <p className="text-sm text-red-700">{aviso}</p> : null}
        <button
          className={PRIMARIO}
          onClick={() => (aceptado ? avanzar(estado) : setAviso("Marque la casilla para continuar."))}
          type="button"
        >
          Comenzar
        </button>
      </div>
    );
  } else if (paso.t === "focus") {
    contenido = (
      <div className="grid gap-4">
        <p className="text-xl font-semibold leading-snug text-slate-900">¿Qué describe mejor lo que le trae hoy?</p>
        <p className="text-sm text-slate-500">Puede marcar más de una opción.</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS.map(([id, t]) => {
            const on = focoSel.includes(id);
            return (
              <button
                className={`rounded-full border px-4 py-2 text-sm transition ${on ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                key={id}
                onClick={() => setFocoSel((l) => (on ? l.filter((x) => x !== id) : [...l, id]))}
                type="button"
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {anterior}
          <button className={PRIMARIO} onClick={() => avanzar({ ...estado, focus: focoSel })} type="button">
            Continuar
          </button>
        </div>
      </div>
    );
  } else if (paso.t === "item") {
    const I = INS[paso.ins];
    const clave = `${paso.ins}_${paso.i}`;
    const actual = estado.answers[clave]?.v;
    contenido = (
      <div className="grid gap-4">
        <p className="text-sm text-slate-500">{I.stem}</p>
        <p className="text-xl font-semibold leading-snug text-slate-900">{I.items[paso.i - 1]}</p>
        <div className="grid gap-2">
          {etiquetas(paso.ins).map((l, v) => (
            <button
              className={btnOpcion(actual === v)}
              key={l}
              onClick={() => avanzar({ ...estado, answers: { ...estado.answers, [clave]: { v, t: Date.now() - mostrado.current } } })}
              type="button"
            >
              {l}
            </button>
          ))}
        </div>
        <div>{anterior}</div>
      </div>
    );
  } else if (paso.t === "risk") {
    const urgente = estado.risk.self !== "no";
    contenido =
      riesgoEtapa === 1 ? (
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Gracias por decirlo con sinceridad</h2>
          <p className="text-[15px] leading-7 text-slate-700">
            Marcó que ha tenido pensamientos de que estaría mejor muerto(a) o de hacerse daño. Eso merece atención y no tiene que cargarlo a solas. Su
            psicólogo verá esta respuesta.
          </p>
          <p className="text-xl font-semibold leading-snug text-slate-900">¿Siente que hoy podría hacerse daño?</p>
          <div className="grid gap-2">
            {(
              [
                ["no", "No"],
                ["duda", "No estoy seguro(a)"],
                ["si", "Sí"],
              ] as const
            ).map(([v, t]) => (
              <button
                className={btnOpcion(estado.risk.self === v)}
                key={v}
                onClick={() => {
                  setEstado({ ...estado, risk: { self: v } });
                  setRiesgoEtapa(2);
                }}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950" role="alert">
            <h2 className="text-lg font-semibold">{urgente ? "Por favor, busque ayuda ahora" : "Si en algún momento esto cambia"}</h2>
            <p className="text-sm leading-6">
              {urgente
                ? "Lo que siente es importante y hay personas preparadas para acompañarle en este momento. Llame a una de estas líneas o pida a alguien de confianza que se quede con usted. Si está en peligro inmediato, llame a emergencias."
                : "Si esos pensamientos se vuelven más fuertes, puede llamar a cualquiera de estas líneas a cualquier hora."}
            </p>
            <Crisis />
          </div>
          <p className="text-[15px] text-slate-700">{urgente ? "Puede detenerse aquí. Su psicólogo recibirá el aviso." : "Puede continuar cuando esté listo(a)."}</p>
          <div className="flex flex-wrap gap-2">
            <button className={PRIMARIO} onClick={() => avanzar(estado)} type="button">
              Continuar la evaluación
            </button>
            <button className={SECUNDARIO} disabled={fase === "enviando"} onClick={() => enviar(estado, true)} type="button">
              Detenerme aquí
            </button>
          </div>
        </div>
      );
  } else if (paso.t === "gate") {
    contenido = (
      <div className="grid gap-4">
        <p className="text-xl font-semibold leading-snug text-slate-900">¿Tiene pareja actualmente o tuvo una relación en los últimos 12 meses?</p>
        <div className="grid gap-2">
          {(
            [
              ["si", "Sí, tengo pareja"],
              ["ex", "No ahora, pero tuve una en los últimos 12 meses"],
              ["no", "No"],
            ] as const
          ).map(([v, t]) => (
            <button className={btnOpcion(estado.gate === v)} key={v} onClick={() => avanzar({ ...estado, gate: v })} type="button">
              {t}
            </button>
          ))}
        </div>
        <div>{anterior}</div>
      </div>
    );
  } else if (paso.t === "tr") {
    const chip = (grupo: "emo" | "beh" | "dis", v: string, texto: React.ReactNode, cuadrado = false) => {
      const on = registro[grupo].includes(v);
      return (
        <button
          className={`border px-3 py-2 text-left text-sm transition ${cuadrado ? "rounded-lg" : "rounded-full"} ${on ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          key={v}
          onClick={() => setRegistro((r) => ({ ...r, [grupo]: on ? r[grupo].filter((x) => x !== v) : [...r[grupo], v] }))}
          type="button"
        >
          {texto}
        </button>
      );
    };
    const campo = (k: "sit" | "pen" | "f1" | "f2", label: string, area = true) => (
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        {label}
        {area ? (
          <textarea className="field-light min-h-20 resize-y" maxLength={1500} onChange={(e) => setRegistro((r) => ({ ...r, [k]: e.target.value }))} value={registro[k]} />
        ) : (
          <input className="field-light" maxLength={500} onChange={(e) => setRegistro((r) => ({ ...r, [k]: e.target.value }))} value={registro[k]} />
        )}
      </label>
    );
    contenido = (
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">Un momento reciente</h2>
        <p className="text-sm text-slate-500">
          Esta parte es opcional y no tiene puntuación. Sirve para que usted y su psicólogo vean cómo se conectan lo que pasa, lo que piensa, lo que
          siente y lo que hace.
        </p>
        {campo("sit", "Piense en un momento reciente en que se sintió mal. ¿Qué estaba pasando?")}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">¿Qué sintió?</span>
          <div className="flex flex-wrap gap-2">{EMO.map((e) => chip("emo", e, e))}</div>
        </div>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          ¿Con qué intensidad? {registro.int} de 100
          <input max={100} min={0} onChange={(e) => setRegistro((r) => ({ ...r, int: Number(e.target.value) }))} type="range" value={registro.int} />
        </label>
        {campo("pen", "¿Qué pasó por su mente en ese momento?")}
        {campo("f1", "Si eso fuera cierto, ¿qué significaría para usted?", false)}
        {campo("f2", "Y si eso también fuera cierto, ¿qué diría de usted, de los demás o de su futuro?", false)}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">¿Qué hizo después?</span>
          <div className="flex flex-wrap gap-2">{BEH.map((e) => chip("beh", e, e))}</div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">¿Reconoce alguna de estas formas de pensar en ese momento?</span>
          <div className="grid gap-2">
            {INS.DC.names!.map((n, k) =>
              chip(
                "dis",
                n,
                <>
                  <b>{n}.</b> {INS.DC.defs![k]}
                </>,
                true
              )
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {anterior}
          <button
            className={PRIMARIO}
            disabled={fase === "enviando"}
            onClick={() => {
              const vacio = !registro.sit.trim() && !registro.pen.trim() && !registro.emo.length;
              avanzar({ ...estado, tr: vacio ? { skip: true } : { ...registro, sit: registro.sit.trim(), pen: registro.pen.trim(), f1: registro.f1.trim(), f2: registro.f2.trim() } });
            }}
            type="button"
          >
            Guardar y terminar
          </button>
          <button className={SECUNDARIO} disabled={fase === "enviando"} onClick={() => avanzar({ ...estado, tr: { skip: true } })} type="button">
            Omitir esta parte
          </button>
        </div>
      </div>
    );
  } else {
    contenido = (
      <div className="grid gap-3 py-6 text-center">
        <p className="text-lg font-semibold text-slate-900">{fase === "enviando" ? "Enviando sus respuestas…" : "Listo, gracias"}</p>
        {fase !== "enviando" && fase !== "fallo-envio" ? (
          <button className={PRIMARIO} onClick={() => enviar(estado)} type="button">
            Enviar respuestas
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5" data-testid="mc-form">
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="mc-guardado" total={items.length} trato="usted" />
      {fase === "fallo-envio" ? <AvisoFalloEnvio onReintentar={() => enviar(estado, estado.risk.self !== null && paso.t === "risk")} trato="usted" /> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
      {contenido}
    </div>
  );
}
