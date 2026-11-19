"use client";

import type { ReactNode } from "react";
import type { PacienteRow } from "@/lib/clinica/types";
import { NOMBRES_MODULOS } from "@/lib/evaluaciones/eapi/calificacion";
import { FORMA_MODULOS, MODULOS_EAPI, minutosEapi, modulosDeOpciones, preguntasEapi } from "@/lib/evaluaciones/eapi/codigo";
import type { EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { ETAPAS_FICHAS, FICHAS, type FichaId } from "@/lib/evaluaciones/fichas/catalogo";
import { opcionesFicha } from "@/lib/evaluaciones/fichas/codigo";
import { fichasRespondidas, fichasSugeridas } from "@/lib/evaluaciones/fichas/sugeridas";
import { formaDeOpciones } from "@/lib/evaluaciones/jjr/codigo";
import { InformeBBreve } from "./informe-b-breve";
import { InformeEapi } from "./informe-eapi";
import { InformeFicha } from "./informe-ficha";
import { InformeJjr } from "./informe-jjr";
import { InformeMcea } from "./informe-mcea";
import { InformeRiasec } from "./informe-riasec";
import { InformeTemperamentos } from "./informe-temperamentos";
import { InformeValores } from "./informe-valores";

/**
 * Registro de informes del expediente y de opciones al asignar: un
 * instrumento nuevo agrega aquí su informe (y sus opciones, si las tiene);
 * el panel de evaluaciones no tiene ramas por instrumento.
 */
type PropsInforme = { actual: EvaluacionRespuestaRow; paciente: PacienteRow; respuestas: EvaluacionRespuestaRow[] };

export const INFORMES: Record<string, (p: PropsInforme) => ReactNode> = {
  "b-breve": (p) => <InformeBBreve {...p} />,
  eapi: (p) => <InformeEapi {...p} />,
  riasec: (p) => <InformeRiasec {...p} />,
  valores: (p) => <InformeValores {...p} />,
  temperamentos: (p) => <InformeTemperamentos {...p} />,
  jjr84: (p) => <InformeJjr {...p} />,
  jjr176: (p) => <InformeJjr {...p} />,
  mcea: (p) => <InformeMcea {...p} />,
  ficha: (p) => <InformeFicha {...p} />,
};

type Opciones = Record<string, unknown>;
export type OpcionesAsignar = {
  inicial: () => Opciones;
  /** `respuestas`: las del paciente (p. ej. para sugerir fichas según su último EAPI o MCEA). */
  Componente: (p: { valor: Opciones; onCambio: (o: Opciones) => void; respuestas: EvaluacionRespuestaRow[] }) => ReactNode;
  /** Mensaje si las opciones no permiten asignar. */
  error?: (o: Opciones) => string | null;
  /** Opciones finales que se guardan en el enlace (p. ej. sortea la forma). */
  preparar?: (o: Opciones) => Opciones;
};

function EscalasEapi({ valor, onCambio }: { valor: Opciones; onCambio: (o: Opciones) => void }) {
  const modulos = modulosDeOpciones(valor);
  const elegidos = Array.isArray(valor.modulos) ? modulos : [];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold text-slate-200">Escalas a aplicar (cada una puede enviarse por separado)</legend>
      {MODULOS_EAPI.map((m) => (
        <label className="flex items-start gap-2 text-sm text-slate-200" key={m}>
          <input
            checked={elegidos.includes(m)}
            className="mt-1"
            onChange={(e) => onCambio({ modulos: MODULOS_EAPI.filter((x) => (x === m ? e.target.checked : elegidos.includes(x))) })}
            type="checkbox"
          />
          <span>
            {NOMBRES_MODULOS[m].completo}
            <span className="block text-xs text-slate-400">
              {FORMA_MODULOS[m].items} preguntas · {NOMBRES_MODULOS[m].mide}
              {m === "docs" ? ". Recomendado solo si sospechas síntomas obsesivo-compulsivos." : "."}
            </span>
          </span>
        </label>
      ))}
      <p className="text-xs text-slate-400">
        {elegidos.length
          ? `Total: ${preguntasEapi(elegidos)} preguntas (incluye siempre la pregunta de seguridad), unos ${minutosEapi(elegidos)} minutos. Los informes pueden verse por escala o unificados, también uniendo escalas enviadas en enlaces distintos.`
          : "Elige al menos una escala."}
      </p>
    </fieldset>
  );
}

function FormaJjr({ valor, onCambio }: { valor: Opciones; onCambio: (o: Opciones) => void }) {
  const v = valor.forma === "A" || valor.forma === "B" ? valor.forma : "azar";
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold text-slate-200">Forma del piloto (130 actividades cada una)</legend>
      {[
        ["azar", "Al azar (recomendado)", "Se sortea A o B al crear el enlace y queda registrado; así cada candidato se aplica a la mitad de las personas."],
        ["A", "Forma A", "Anclas + candidatos con número impar."],
        ["B", "Forma B", "Anclas + candidatos con número par."],
      ].map(([id, titulo, detalle]) => (
        <label className="flex items-start gap-2 text-sm text-slate-200" key={id}>
          <input checked={v === id} className="mt-1" name="forma-jjr" onChange={() => onCambio(id === "azar" ? {} : { forma: id })} type="radio" />
          <span>
            {titulo}
            <span className="block text-xs text-slate-400">{detalle}</span>
          </span>
        </label>
      ))}
      <p className="text-xs text-slate-400">Las nuevas aplicaciones y los seguimientos repiten la misma forma, para que sean comparables.</p>
    </fieldset>
  );
}

function ModoMcea({ valor, onCambio }: { valor: Opciones; onCambio: (o: Opciones) => void }) {
  const modo = valor.modo === "full" ? "full" : "adapt";
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold text-slate-200">Modo de aplicación</legend>
      {[
        ["adapt", "Adaptativo (recomendado)", "Empieza con pocas preguntas y solo abre los módulos que la persona necesita (6 a 15 minutos)."],
        ["full", "Completo", "Aplica todos los módulos, sin importar las respuestas de filtro."],
      ].map(([id, titulo, detalle]) => (
        <label className="flex items-start gap-2 text-sm text-slate-200" key={id}>
          <input checked={modo === id} className="mt-1" name="modo-mcea" onChange={() => onCambio({ ...valor, modo: id })} type="radio" />
          <span>
            {titulo}
            <span className="block text-xs text-slate-400">{detalle}</span>
          </span>
        </label>
      ))}
      <p className="text-xs text-slate-400">«Nueva aplicación (seguimiento)» repite los módulos abiertos en la línea base para poder calcular el cambio fiable.</p>
    </fieldset>
  );
}

function ElegirFicha({ valor, onCambio, respuestas }: { valor: Opciones; onCambio: (o: Opciones) => void; respuestas: EvaluacionRespuestaRow[] }) {
  const elegida = opcionesFicha(valor).ficha;
  const sugeridas = new Map<FichaId, string[]>(fichasSugeridas(respuestas).map((s) => [s.ficha, s.motivos]));
  const hechas = fichasRespondidas(respuestas);
  const etapas = [...new Set(FICHAS.map((f) => f.etapa))];
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold text-slate-200">Ficha a enviar</legend>
      {etapas.map((etapa) => (
        <div className="grid gap-2" key={etapa}>
          <p className="text-xs font-semibold uppercase text-slate-400">
            Etapa {etapa} · {ETAPAS_FICHAS[etapa]}
          </p>
          {FICHAS.filter((f) => f.etapa === etapa).map((f) => (
            <label className={`flex items-start gap-2 border p-2 text-sm text-slate-200 ${elegida === f.id ? "border-emerald-300/60 bg-emerald-300/10" : "border-white/10"}`} key={f.id}>
              <input checked={elegida === f.id} className="mt-1" name="ficha-jjr" onChange={() => onCambio({ ficha: f.id })} type="radio" />
              <span className="grid gap-0.5">
                <span>
                  <strong>{f.id}</strong> · {f.titulo}
                  {sugeridas.has(f.id) ? (
                    <span className="ml-2 inline-block rounded bg-amber-300/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200" title={sugeridas.get(f.id)!.join(" · ")}>
                      Sugerida por sus resultados
                    </span>
                  ) : null}
                  {hechas.has(f.id) ? <span className="ml-2 text-[11px] text-slate-400">Ya respondida antes</span> : null}
                </span>
                <span className="text-xs text-slate-400">{f.paraQue}</span>
                {sugeridas.has(f.id) ? <span className="text-xs text-amber-200/80">{sugeridas.get(f.id)!.join(" · ")}</span> : null}
              </span>
            </label>
          ))}
        </div>
      ))}
      <p className="text-xs text-slate-400">El paciente verá «Ficha {elegida}» con su explicación y los campos para responder. Al asignarla se agrega una tarea a su sesión en curso o a la última.</p>
    </fieldset>
  );
}

export const OPCIONES_ASIGNAR: Record<string, OpcionesAsignar> = {
  eapi: {
    inicial: () => ({ modulos: ["gad", "dass", "ptq"] }),
    Componente: EscalasEapi,
    error: (o) => (Array.isArray(o.modulos) && o.modulos.length ? null : "Elige al menos una escala del EAPI."),
  },
  jjr176: {
    inicial: () => ({}),
    Componente: FormaJjr,
    preparar: (o) => {
      if (formaDeOpciones(o)) return { forma: formaDeOpciones(o), asignacion: "manual" };
      const azar = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? "A" : "B";
      return { forma: azar, asignacion: "azar-v1" };
    },
  },
  mcea: {
    inicial: () => ({ modo: "adapt" }),
    Componente: ModoMcea,
  },
  ficha: {
    inicial: () => ({ ficha: FICHAS[0].id }),
    Componente: ElegirFicha,
    preparar: (o) => ({ ficha: opcionesFicha(o).ficha }),
  },
};
