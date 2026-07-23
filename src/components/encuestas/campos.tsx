"use client";

import type { OpcionCatalogo } from "@/lib/encuestas/catalogos";

const CHIP_BASE = "border px-3 py-2 text-left text-sm font-semibold transition";
const CHIP_ACTIVO = "border-emerald-300/70 bg-emerald-300/14 text-white";
const CHIP_INACTIVO = "border-white/10 bg-white/6 text-slate-300 hover:border-white/30";

export function SeleccionMultiple({
  onChange,
  opciones,
  seleccionadas,
}: {
  onChange: (valores: string[]) => void;
  opciones: OpcionCatalogo[];
  seleccionadas: string[];
}) {
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
          className={`${CHIP_BASE} ${seleccionadas.includes(opcion.id) ? CHIP_ACTIVO : CHIP_INACTIVO}`}
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
  onChange,
  opciones,
  seleccionada,
}: {
  onChange: (valor: string) => void;
  opciones: OpcionCatalogo[];
  seleccionada: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {opciones.map((opcion) => (
        <button
          className={`${CHIP_BASE} ${seleccionada === opcion.id ? CHIP_ACTIVO : CHIP_INACTIVO}`}
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
  max = 5,
  min = 1,
  onChange,
  valor,
}: {
  max?: number;
  min?: number;
  onChange: (valor: number) => void;
  valor: number;
}) {
  const opciones = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((n) => (
        <button
          className={`flex h-11 w-11 items-center justify-center border text-base font-bold transition ${
            valor === n ? CHIP_ACTIVO : CHIP_INACTIVO
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

export function SiNoBotones({ onChange, valor }: { onChange: (valor: boolean) => void; valor: boolean | null }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        className={`${CHIP_BASE} justify-center ${valor === true ? CHIP_ACTIVO : CHIP_INACTIVO}`}
        onClick={() => onChange(true)}
        type="button"
      >
        Sí
      </button>
      <button
        className={`${CHIP_BASE} justify-center ${valor === false ? CHIP_ACTIVO : CHIP_INACTIVO}`}
        onClick={() => onChange(false)}
        type="button"
      >
        No
      </button>
    </div>
  );
}
