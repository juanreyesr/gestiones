"use client";

import type { OpcionCatalogo } from "@/lib/encuestas/catalogos";

const CHIP_BASE = "border px-3 py-2 text-left text-sm font-semibold transition";
const CHIP_ACTIVO = "border-emerald-300/70 bg-emerald-300/14 text-white";
const CHIP_INACTIVO = "border-white/10 bg-white/6 text-slate-300 hover:border-white/30";
const CHIP_ACTIVO_LIGHT = "border-slate-900 bg-slate-900 text-white";
const CHIP_INACTIVO_LIGHT = "border-slate-200 bg-white text-slate-500 hover:border-slate-400";

export function SeleccionMultiple({
  light = false,
  onChange,
  opciones,
  seleccionadas,
}: {
  light?: boolean;
  onChange: (valores: string[]) => void;
  opciones: OpcionCatalogo[];
  seleccionadas: string[];
}) {
  const activo = light ? CHIP_ACTIVO_LIGHT : CHIP_ACTIVO;
  const inactivo = light ? CHIP_INACTIVO_LIGHT : CHIP_INACTIVO;
  const toggle = (id: string) => {
    if (seleccionadas.includes(id)) {
      onChange(seleccionadas.filter((item) => item !== id));
    } else {
      onChange([...seleccionadas, id]);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {opciones.map((opcion) => (
        <button
          className={`${CHIP_BASE} ${seleccionadas.includes(opcion.id) ? activo : inactivo}`}
          key={opcion.id}
          onClick={() => toggle(opcion.id)}
          type="button"
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );
}

export function SeleccionUnica({
  light = false,
  onChange,
  opciones,
  seleccionada,
}: {
  light?: boolean;
  onChange: (valor: string) => void;
  opciones: OpcionCatalogo[];
  seleccionada: string;
}) {
  const activo = light ? CHIP_ACTIVO_LIGHT : CHIP_ACTIVO;
  const inactivo = light ? CHIP_INACTIVO_LIGHT : CHIP_INACTIVO;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {opciones.map((opcion) => (
        <button
          className={`${CHIP_BASE} ${seleccionada === opcion.id ? activo : inactivo}`}
          key={opcion.id}
          onClick={() => onChange(opcion.id)}
          type="button"
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );
}

export function EscalaBotones({
  light = false,
  max = 5,
  min = 1,
  onChange,
  valor,
}: {
  light?: boolean;
  max?: number;
  min?: number;
  onChange: (valor: number) => void;
  valor: number;
}) {
  const activo = light ? CHIP_ACTIVO_LIGHT : CHIP_ACTIVO;
  const inactivo = light ? CHIP_INACTIVO_LIGHT : CHIP_INACTIVO;
  const opciones = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((n) => (
        <button
          className={`flex h-11 w-11 items-center justify-center border text-base font-bold transition ${
            valor === n ? activo : inactivo
          }`}
          key={n}
          onClick={() => onChange(n)}
          type="button"
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function SiNoBotones({
  light = false,
  onChange,
  valor,
}: {
  light?: boolean;
  onChange: (valor: boolean) => void;
  valor: boolean | null;
}) {
  const activo = light ? CHIP_ACTIVO_LIGHT : CHIP_ACTIVO;
  const inactivo = light ? CHIP_INACTIVO_LIGHT : CHIP_INACTIVO;
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        className={`${CHIP_BASE} justify-center ${valor === true ? activo : inactivo}`}
        onClick={() => onChange(true)}
        type="button"
      >
        Sí
      </button>
      <button
        className={`${CHIP_BASE} justify-center ${valor === false ? activo : inactivo}`}
        onClick={() => onChange(false)}
        type="button"
      >
        No
      </button>
    </div>
  );
}
