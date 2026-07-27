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
  onChange,
  value,
}: {
  onChange: (v: boolean) => void;
  value: boolean | null;
}) {
  const base = "min-w-[64px] border px-4 py-2 text-sm font-semibold transition";
  return (
    <div className="flex gap-2">
      <button
        className={`${base} ${value === true ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30"}`}
        onClick={() => onChange(true)}
        type="button"
      >
        Sí
      </button>
      <button
        className={`${base} ${value === false ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30"}`}
        onClick={() => onChange(false)}
        type="button"
      >
        No
      </button>
    </div>
  );
}

export function SituacionFields({
  onChange,
  value,
}: {
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

  return (
    <div className="grid gap-5">
      {/* Hijos */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">¿Tienes hijos?</span>
          <SiNo onChange={(v) => set("tieneHijos", v)} value={value.tieneHijos} />
        </div>
        {value.tieneHijos ? (
          <div className="grid gap-3 border border-white/10 bg-white/4 p-3">
            <label className="grid gap-1.5 sm:max-w-[220px]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">¿Cuántos?</span>
              <select
                className="field"
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
              <div key={index} className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[1fr_120px] sm:items-end">
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {ordinalHijo(index)}
                  </span>
                  <input
                    className="field"
                    onChange={(e) => setHijo(index, "nombre", e.target.value)}
                    placeholder="Nombre"
                    value={hijo.nombre}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Edad</span>
                  <input
                    className="field"
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
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">¿Vives solo/a?</span>
          <SiNo onChange={(v) => set("viveSolo", v)} value={value.viveSolo} />
        </div>
        {value.viveSolo === false ? (
          <div className="grid gap-3 border border-white/10 bg-white/4 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">¿Con quién vives?</span>
            <div className="flex flex-wrap gap-2">
              {CONVIVE_OPCIONES.map((opcion) => {
                const activo = value.conviveCon.includes(opcion);
                return (
                  <button
                    key={opcion}
                    className={`border px-3 py-1.5 text-sm transition ${activo ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30"}`}
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
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">¿Quién más?</span>
                <input
                  className="field"
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
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            ¿En qué trabajas actualmente?
          </span>
          <input
            className="field"
            onChange={(e) => set("ocupacion", e.target.value)}
            placeholder="Tu ocupación o trabajo actual"
            value={value.ocupacion}
          />
        </label>
        <p className="text-xs leading-5 text-slate-400">
          Si consideras que tu horario de trabajo te genera conflictos, anota tu horario de trabajo por favor.
        </p>
        <input
          className="field"
          onChange={(e) => set("horarioTrabajo", e.target.value)}
          placeholder="Horario de trabajo (opcional)"
          value={value.horarioTrabajo}
        />
      </div>
    </div>
  );
}
