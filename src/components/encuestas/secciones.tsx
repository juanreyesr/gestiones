"use client";

import {
  EDAD_RANGO,
  EXPECTATIVA_UNIVERSIDAD,
  EXPECTATIVAS_CARRERA,
  FUENTE_CONOCIMIENTO,
  GENERO,
  QUIEN_INFLUYO,
  RAZONES_CARRERA,
  RAZONES_UNIVERSIDAD,
} from "@/lib/encuestas/catalogos";
import type { RespuestaEncuestaPayload } from "@/lib/encuestas/types";
import { EscalaBotones, SeleccionMultiple, SeleccionUnica, SiNoBotones } from "./campos";
import { Field } from "./ui";

type Props = {
  light?: boolean;
  onChange: (patch: Partial<RespuestaEncuestaPayload>) => void;
  valor: RespuestaEncuestaPayload;
};

export function SeccionComoLlego({ light = false, onChange, valor }: Props) {
  return (
    <div className="grid gap-4">
      <h3 className={`text-lg font-semibold ${light ? "text-slate-900" : "text-white"}`}>¿Cómo conociste la universidad?</h3>
      <SeleccionUnica
        light={light}
        onChange={(fuente_conocimiento) => onChange({ fuente_conocimiento })}
        opciones={FUENTE_CONOCIMIENTO}
        seleccionada={valor.fuente_conocimiento}
      />
    </div>
  );
}

export function SeccionUniversidad({ light = false, onChange, valor }: Props) {
  return (
    <div className="grid gap-4">
      <h3 className={`text-lg font-semibold ${light ? "text-slate-900" : "text-white"}`}>¿Por qué elegiste esta universidad?</h3>
      <p className="text-sm text-slate-400">Selecciona todas las que apliquen.</p>
      <SeleccionMultiple
        light={light}
        onChange={(razones_universidad) => onChange({ razones_universidad })}
        opciones={RAZONES_UNIVERSIDAD}
        seleccionadas={valor.razones_universidad}
      />
      {valor.razones_universidad.includes("otro") ? (
        <Field label="¿Cuál otra razón?">
          <input
            className={light ? "field-light" : "field"}
            maxLength={200}
            onChange={(event) => onChange({ razones_universidad_otro: event.target.value })}
            value={valor.razones_universidad_otro ?? ""}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function SeccionCarrera({ light = false, onChange, valor }: Props) {
  return (
    <div className="grid gap-4">
      <h3 className={`text-lg font-semibold ${light ? "text-slate-900" : "text-white"}`}>¿Por qué elegiste esta carrera?</h3>
      <p className="text-sm text-slate-400">Selecciona todas las que apliquen.</p>
      <SeleccionMultiple
        light={light}
        onChange={(razones_carrera) => onChange({ razones_carrera })}
        opciones={RAZONES_CARRERA}
        seleccionadas={valor.razones_carrera}
      />
      {valor.razones_carrera.includes("otro") ? (
        <Field label="¿Cuál otra razón?">
          <input
            className={light ? "field-light" : "field"}
            maxLength={200}
            onChange={(event) => onChange({ razones_carrera_otro: event.target.value })}
            value={valor.razones_carrera_otro ?? ""}
          />
        </Field>
      ) : null}

      <Field label="¿Fue tu primera opción de carrera?">
        <SiNoBotones light={light} onChange={(primera_opcion) => onChange({ primera_opcion })} valor={valor.primera_opcion} />
      </Field>

      <Field label="¿Quién influyó más en tu decisión?">
        <SeleccionUnica
          light={light}
          onChange={(quien_influyo) => onChange({ quien_influyo })}
          opciones={QUIEN_INFLUYO}
          seleccionada={valor.quien_influyo}
        />
      </Field>
    </div>
  );
}

export function SeccionExpectativas({ light = false, onChange, valor }: Props) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <h3 className={`text-lg font-semibold ${light ? "text-slate-900" : "text-white"}`}>¿Qué esperas de tu carrera?</h3>
        <SeleccionMultiple
          light={light}
          onChange={(expectativas_carrera) => onChange({ expectativas_carrera })}
          opciones={EXPECTATIVAS_CARRERA}
          seleccionadas={valor.expectativas_carrera}
        />
      </div>
      <div className="grid gap-3">
        <h3 className={`text-lg font-semibold ${light ? "text-slate-900" : "text-white"}`}>¿Qué esperas de la universidad?</h3>
        <SeleccionMultiple
          light={light}
          onChange={(expectativa_universidad) => onChange({ expectativa_universidad })}
          opciones={EXPECTATIVA_UNIVERSIDAD}
          seleccionadas={valor.expectativa_universidad}
        />
      </div>
      <Field label="Cuéntanos con tus palabras qué esperas lograr al terminar (opcional)">
        <textarea
          className={`${light ? "field-light" : "field"} resize-y`}
          maxLength={500}
          onChange={(event) => onChange({ expectativa_abierta: event.target.value })}
          rows={3}
          value={valor.expectativa_abierta ?? ""}
        />
      </Field>
    </div>
  );
}

export function SeccionCierre({ light = false, onChange, valor }: Props) {
  return (
    <div className="grid gap-5">
      <Field label="¿Qué tan seguro/a estás de tu elección de carrera? (1 = nada seguro, 5 = totalmente seguro)">
        <EscalaBotones
          light={light}
          max={5}
          min={1}
          onChange={(satisfaccion_eleccion) => onChange({ satisfaccion_eleccion })}
          valor={valor.satisfaccion_eleccion}
        />
      </Field>
      <Field label="Del 0 al 10, ¿qué tan probable es que recomiendes esta universidad?">
        <EscalaBotones
          light={light}
          max={10}
          min={0}
          onChange={(probabilidad_recomendar) => onChange({ probabilidad_recomendar })}
          valor={valor.probabilidad_recomendar}
        />
      </Field>
      <Field label="¿Algo más que quieras compartir? (opcional)">
        <textarea
          className={`${light ? "field-light" : "field"} resize-y`}
          maxLength={500}
          onChange={(event) => onChange({ comentario: event.target.value })}
          rows={2}
          value={valor.comentario ?? ""}
        />
      </Field>
    </div>
  );
}

export function SeccionPerfil({ light = false, onChange, valor }: Props) {
  return (
    <div className="grid gap-4">
      <h3 className={`text-lg font-semibold ${light ? "text-slate-900" : "text-white"}`}>Un poco sobre ti (opcional y anónimo)</h3>
      <Field label="Rango de edad">
        <SeleccionUnica light={light} onChange={(edad_rango) => onChange({ edad_rango })} opciones={EDAD_RANGO} seleccionada={valor.edad_rango ?? ""} />
      </Field>
      <Field label="Género">
        <SeleccionUnica light={light} onChange={(genero) => onChange({ genero })} opciones={GENERO} seleccionada={valor.genero ?? ""} />
      </Field>
      <Field label="¿Trabajas actualmente?">
        <SiNoBotones light={light} onChange={(trabaja) => onChange({ trabaja })} valor={valor.trabaja} />
      </Field>
      <Field label="¿Eres la primera persona de tu familia en ir a la universidad?">
        <SiNoBotones light={light} onChange={(primera_generacion) => onChange({ primera_generacion })} valor={valor.primera_generacion} />
      </Field>
    </div>
  );
}
