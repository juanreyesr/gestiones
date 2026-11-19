"use client";

import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  camposDeFicha,
  fichaPorId,
  FICHA_AVISO_AYUDA,
  FICHA_GRACIAS,
  FICHA_INTRO_GENERAL,
  FICHA_TITULO_PUBLICO,
  type Campo,
  type CampoCasillas,
  type CampoEscala,
  type CampoLista,
  type CampoTabla,
  type FichaId,
} from "@/lib/evaluaciones/fichas/catalogo";
import {
  avanceFicha,
  campoTieneContenido,
  respuestasVacias,
  type FichaBorrador,
  type RespuestasFicha,
  type ValorCampo,
  type ValorCasillas,
} from "@/lib/evaluaciones/fichas/codigo";
import { riesgoFicha } from "@/lib/evaluaciones/fichas/riesgo";
import { EAPI_LINEAS_AYUDA } from "@/lib/evaluaciones/eapi/escalas";
import { AvisoFalloEnvio, BarraGuardado, PantallaCerrada, PantallaEnviada, PieEnvio, useFormularioEvaluacion } from "./formulario-comun";

// Importante: este formulario NO importa la guía del terapeuta ni ninguna
// calificación: quien responde solo ve la parte para el paciente.

type Poner = (id: string, valor: ValorCampo) => void;

const Etiqueta = ({ c }: { c: Campo }) => (
  <div className="grid gap-0.5">
    <span className="text-sm font-semibold text-slate-800">
      {c.etiqueta}
      {c.requerido ? <span className="text-red-600"> *</span> : null}
    </span>
    {c.ayuda ? <span className="text-xs leading-5 text-slate-500">{c.ayuda}</span> : null}
  </div>
);

function EscalaCampo({ c, valor, onCambio }: { c: CampoEscala; valor: number | null; onCambio: (v: number | null) => void }) {
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11" role="radiogroup" aria-label={c.etiqueta}>
        {Array.from({ length: 11 }, (_, i) => (
          <button
            aria-checked={valor === i}
            className={`h-10 rounded-lg border-2 text-sm font-bold transition ${
              valor === i ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
            key={i}
            onClick={() => onCambio(valor === i ? null : i)}
            role="radio"
            type="button"
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between gap-3 text-xs text-slate-500">
        <span>{c.extremos[0]}</span>
        <span className="text-right">{c.extremos[1]}</span>
      </div>
    </div>
  );
}

function ListaCampo({ c, valor, onCambio }: { c: CampoLista; valor: string[]; onCambio: (v: string[]) => void }) {
  const filas = Math.max(c.minFilas, valor.length);
  const cambiar = (i: number, texto: string) => {
    const nuevo = Array.from({ length: filas }, (_, j) => valor[j] ?? "");
    nuevo[i] = texto;
    onCambio(nuevo);
  };
  return (
    <div className="grid gap-2">
      {Array.from({ length: filas }, (_, i) => (
        <div className="flex items-center gap-2" key={i}>
          <span className="w-5 text-right text-sm text-slate-400">{i + 1}.</span>
          <input
            aria-label={`${c.etiqueta}, fila ${i + 1}`}
            className="field-light w-full"
            maxLength={300}
            onChange={(e) => cambiar(i, e.target.value)}
            placeholder={i === 0 ? c.ejemplo : undefined}
            value={valor[i] ?? ""}
          />
        </div>
      ))}
      {filas < Math.min(c.maxFilas, 20) ? (
        <button className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => onCambio([...valor, ""])} type="button">
          <Plus className="h-4 w-4" />
          Agregar otra
        </button>
      ) : null}
    </div>
  );
}

function CasillasCampo({ c, valor, onCambio }: { c: CampoCasillas; valor: ValorCasillas; onCambio: (v: ValorCasillas) => void }) {
  const alternar = (o: string) => onCambio({ ...valor, marcadas: valor.marcadas.includes(o) ? valor.marcadas.filter((x) => x !== o) : [...valor.marcadas, o] });
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {c.opciones.map((o) => {
          const activo = valor.marcadas.includes(o);
          return (
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm leading-5 transition ${
                activo ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
              key={o}
            >
              <input checked={activo} className="mt-1" onChange={() => alternar(o)} type="checkbox" />
              <span>{o}</span>
            </label>
          );
        })}
      </div>
      {c.conOtra ? (
        <label className="grid gap-1 text-sm text-slate-600">
          Otra (escríbala si lo desea)
          <input className="field-light" maxLength={300} onChange={(e) => onCambio({ ...valor, otra: e.target.value })} value={valor.otra} />
        </label>
      ) : null}
    </div>
  );
}

function TablaCampo({ c, valor, onCambio }: { c: CampoTabla; valor: string[][]; onCambio: (v: string[][]) => void }) {
  const fijas = Boolean(c.filasFijas);
  const filas = fijas ? c.filasFijas!.length : Math.max(c.filas, valor.length);
  const celda = (i: number, j: number) => valor[i]?.[j] ?? "";
  const cambiar = (i: number, j: number, texto: string) => {
    const nuevo = Array.from({ length: filas }, (_, a) => c.columnas.map((_, b) => celda(a, b)));
    nuevo[i][j] = texto;
    onCambio(nuevo);
  };
  const ejemploDe = (i: number, j: number) => (i === 0 && !fijas ? c.columnas[j].ejemplo : undefined);
  const rotulo = (i: number) => (fijas ? c.filasFijas![i] : `${c.id === "metas" ? "Meta" : "Fila"} ${i + 1}`);
  return (
    <div className="grid gap-2">
      {/* Pantallas anchas: tabla. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {fijas ? <th className="w-32 border border-slate-200 bg-slate-50 p-2" /> : null}
              {c.columnas.map((k) => (
                <th className="border border-slate-200 bg-slate-50 p-2 text-left align-top text-xs font-semibold text-slate-600" key={k.id}>
                  {k.titulo}
                  {k.ayuda ? <span className="block font-normal text-slate-500">{k.ayuda}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: filas }, (_, i) => (
              <tr key={i}>
                {fijas ? <td className="border border-slate-200 bg-slate-50 p-2 align-top text-xs font-semibold text-slate-700">{rotulo(i)}</td> : null}
                {c.columnas.map((k, j) => (
                  <td className="border border-slate-200 p-1 align-top" key={k.id}>
                    <textarea
                      aria-label={`${rotulo(i)}: ${k.titulo}`}
                      className="field-light min-h-16 w-full resize-y"
                      maxLength={500}
                      onChange={(e) => cambiar(i, j, e.target.value)}
                      placeholder={ejemploDe(i, j)}
                      value={celda(i, j)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Teléfono: cada fila como tarjeta. */}
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: filas }, (_, i) => (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3" key={i}>
            <p className="text-xs font-bold uppercase text-slate-500">{rotulo(i)}</p>
            {c.columnas.map((k, j) => (
              <label className="grid gap-1" key={k.id}>
                <span className="text-xs font-semibold text-slate-600">
                  {k.titulo}
                  {k.ayuda ? <span className="font-normal text-slate-500"> · {k.ayuda}</span> : null}
                </span>
                <textarea className="field-light min-h-14 resize-y" maxLength={500} onChange={(e) => cambiar(i, j, e.target.value)} placeholder={ejemploDe(i, j)} value={celda(i, j)} />
              </label>
            ))}
          </div>
        ))}
      </div>
      {!fijas && filas < Math.min(c.maxFilas, 20) ? (
        <button
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={() => onCambio([...Array.from({ length: filas }, (_, a) => c.columnas.map((_, b) => celda(a, b))), c.columnas.map(() => "")])}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Agregar otra fila
        </button>
      ) : null}
    </div>
  );
}

function CampoFicha({ c, respuestas, poner, falta }: { c: Campo; respuestas: RespuestasFicha; poner: Poner; falta: boolean }) {
  const v = respuestas[c.id];
  let control;
  switch (c.tipo) {
    case "texto":
      control = <input className="field-light w-full" maxLength={300} onChange={(e) => poner(c.id, e.target.value)} placeholder={c.ejemplo} value={typeof v === "string" ? v : ""} />;
      break;
    case "parrafo":
      control = (
        <textarea className="field-light min-h-28 w-full resize-y" maxLength={3000} onChange={(e) => poner(c.id, e.target.value)} placeholder={c.ejemplo} value={typeof v === "string" ? v : ""} />
      );
      break;
    case "escala":
      control = <EscalaCampo c={c} onCambio={(x) => poner(c.id, x)} valor={typeof v === "number" ? v : null} />;
      break;
    case "lista":
      control = <ListaCampo c={c} onCambio={(x) => poner(c.id, x)} valor={Array.isArray(v) ? (v as string[]) : []} />;
      break;
    case "casillas":
      control = <CasillasCampo c={c} onCambio={(x) => poner(c.id, x)} valor={v && typeof v === "object" && !Array.isArray(v) ? (v as ValorCasillas) : { marcadas: [], otra: "" }} />;
      break;
    case "tabla":
      control = <TablaCampo c={c} onCambio={(x) => poner(c.id, x)} valor={Array.isArray(v) ? (v as string[][]) : []} />;
      break;
  }
  return (
    <div
      className={`grid gap-2 rounded-xl border p-3 ${falta ? "border-red-300 bg-red-50/60" : "border-transparent"}`}
      data-falta={falta ? "si" : undefined}
      id={`ficha-${c.id}`}
    >
      <Etiqueta c={c} />
      {control}
    </div>
  );
}

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
        `Hay ${vacios} ${vacios === 1 ? "campo" : "campos"} sin responder. Puede enviarla así y conversarlo en la sesión.\n\nAl enviar, la ficha se cierra y ya no se puede modificar. ¿Desea enviarla?`
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
      <BarraGuardado continua={continua} guardado={guardado} respondidas={respondidas} testId="ficha-guardado" total={total} trato="usted" />
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
          {s.intro ? <p className="-mt-1 text-sm leading-6 text-slate-600">{s.intro}</p> : null}
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
