"use client";

import { CONVIVE_OPCIONES, type HijoInfo } from "@/lib/clinica/types";

export type SituacionValue = {
  tieneHijos: boolean | null;
  hijos: HijoInfo[];
  viveSolo: boolean | null;
  conviveCon: string[];
  conviveOtros: string;
  ocupacion: string;
  horarioTrabajo: string;
};

const NUMERO_ORDINAL = [
  "primer",
  "segundo",
  "tercer",
  "cuarto",
  "quinto",
  "sexto",
  "séptimo",
  "octavo",
  "noveno",
  "décimo",
];

function ordinalHijo(index: number) {
  return NUMERO_ORDINAL[index] ? `Nombre del ${NUMERO_ORDINAL[index]} hijo` : `Nombre del hijo ${index + 1}`;
}

function SiNo({
  light,
  onChange,
  value,
}: {
  light: boolean;
  onChange: (v: boolean) => void;
  value: boolean | null;
}) {
  const base = "min-w-[64px] border px-4 py-2 text-sm font-semibold transition";
  const activo = light
    ? "border-slate-900 bg-slate-900 text-white"
    : "border-emerald-300/60 bg-emerald-300/15 text-emerald-200";
  const inactivo = light
    ? "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
    : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30";
  return (
    <div className="flex gap-2">
      <button
        className={`${base} ${value === true ? activo : inactivo}`}
        onClick={() => onChange(true)}
        type="button"
      >
        Sí
      </button>
      <button
        className={`${base} ${value === false ? activo : inactivo}`}
        onClick={() => onChange(false)}
        type="button"
      >
        No
      </button>
    </div>
  );
}

export function SituacionFields({
  light = false,
  onChange,
  value,
}: {
  light?: boolean;
  onChange: (value: SituacionValue) => void;
  value: SituacionValue;
}) {
  const set = <K extends keyof SituacionValue>(key: K, v: SituacionValue[K]) => onChange({ ...value, [key]: v });

  const setNumHijos = (n: number) => {
    const next = value.hijos.slice(0, n);
    while (next.length < n) next.push({ nombre: "", edad: "" });
    set("hijos", next);
  };

  const setHijo = (index: number, campo: keyof HijoInfo, v: string) =>
    set(
      "hijos",
      value.hijos.map((h, i) => (i === index ? { ...h, [campo]: v } : h))
    );

  const toggleConvive = (opcion: string) =>
    set(
      "conviveCon",
      value.conviveCon.includes(opcion)
        ? value.conviveCon.filter((o) => o !== opcion)
        : [...value.conviveCon, opcion]
    );

  const fieldClass = light ? "field-light" : "field";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-400";
  const subLabelClass = "text-[11px] font-semibold uppercase tracking-wide text-slate-400";
  const boxClass = light ? "grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" : "grid gap-3 border border-white/10 bg-white/4 p-3";
  const dividerClass = light ? "border-t border-slate-100 pt-3" : "border-t border-white/10 pt-3";
  const chipBase = "border px-3 py-1.5 text-sm transition";
  const chipActivo = light
    ? "border-slate-900 bg-slate-900 text-white"
    : "border-emerald-300/60 bg-emerald-300/15 text-emerald-200";
  const chipInactivo = light
    ? "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
    : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30";

  return (
    <div className="grid gap-5">
      {/* Hijos */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={labelClass}>¿Tienes hijos?</span>
          <SiNo light={light} onChange={(v) => set("tieneHijos", v)} value={value.tieneHijos} />
        </div>
        {value.tieneHijos ? (
          <div className={boxClass}>
            <label className="grid gap-1.5 sm:max-w-[220px]">
              <span className={subLabelClass}>¿Cuántos?</span>
              <select
                className={fieldClass}
                onChange={(e) => setNumHijos(Number(e.target.value))}
                value={value.hijos.length || ""}
              >
                <option value="">Selecciona</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {value.hijos.map((hijo, index) => (
              <div key={index} className={`grid gap-2 sm:grid-cols-[1fr_120px] sm:items-end ${dividerClass}`}>
                <label className="grid gap-1.5">
                  <span className={subLabelClass}>{ordinalHijo(index)}</span>
                  <input
                    className={fieldClass}
                    onChange={(e) => setHijo(index, "nombre", e.target.value)}
                    placeholder="Nombre"
                    value={hijo.nombre}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={subLabelClass}>Edad</span>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    onChange={(e) => setHijo(index, "edad", e.target.value)}
                    placeholder="Edad"
                    value={hijo.edad}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Con quién vive */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={labelClass}>¿Vives solo/a?</span>
          <SiNo light={light} onChange={(v) => set("viveSolo", v)} value={value.viveSolo} />
        </div>
        {value.viveSolo === false ? (
          <div className={boxClass}>
            <span className={subLabelClass}>¿Con quién vives?</span>
            <div className="flex flex-wrap gap-2">
              {CONVIVE_OPCIONES.map((opcion) => {
                const activo = value.conviveCon.includes(opcion);
                return (
                  <button
                    key={opcion}
                    className={`${chipBase} ${activo ? chipActivo : chipInactivo}`}
                    onClick={() => toggleConvive(opcion)}
                    type="button"
                  >
                    {opcion}
                  </button>
                );
              })}
            </div>
            {value.conviveCon.includes("Otros") ? (
              <label className="grid gap-1.5">
                <span className={subLabelClass}>¿Quién más?</span>
                <input
                  className={fieldClass}
                  onChange={(e) => set("conviveOtros", e.target.value)}
                  placeholder="Escribe con quién más vives"
                  value={value.conviveOtros}
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Trabajo */}
      <div className="grid gap-2">
        <label className="grid gap-1.5">
          <span className={labelClass}>¿En qué trabajas actualmente?</span>
          <input
            className={fieldClass}
            onChange={(e) => set("ocupacion", e.target.value)}
            placeholder="Tu ocupación o trabajo actual"
            value={value.ocupacion}
          />
        </label>
        <p className="text-xs leading-5 text-slate-400">
          Si consideras que tu horario de trabajo te genera conflictos, anota tu horario de trabajo por favor.
        </p>
        <input
          className={fieldClass}
          onChange={(e) => set("horarioTrabajo", e.target.value)}
          placeholder="Horario de trabajo (opcional)"
          value={value.horarioTrabajo}
        />
      </div>
    </div>
  );
}
