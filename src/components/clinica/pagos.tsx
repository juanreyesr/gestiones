"use client";

import { CircleDollarSign } from "lucide-react";
import { useState } from "react";
import { marcarCitaPagada } from "@/lib/clinica/citas";
import { formatoFechaHora } from "@/lib/clinica/slots";
import type { CitaRow } from "@/lib/clinica/types";

/** Casilla "Pagada" de una cita (control de pagos). */
export function PagadaCheckbox({
  cita,
  label = "Pagada",
  onChanged,
}: {
  cita: CitaRow;
  label?: string;
  onChanged: (pagada: boolean) => void;
}) {
  const [pagada, setPagada] = useState(cita.pagada);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    const nuevo = !pagada;
    setGuardando(true);
    setError("");
    setPagada(nuevo);
    const { error: err } = await marcarCitaPagada(cita.id, nuevo);
    setGuardando(false);
    if (err) {
      setPagada(!nuevo);
      setError(err);
      return;
    }
    onChanged(nuevo);
  };

  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-2 border px-2.5 py-1.5 text-xs font-semibold transition ${
        pagada
          ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
          : "border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300/15"
      } ${guardando ? "opacity-60" : ""}`}
      onClick={(event) => event.stopPropagation()}
      title={error || undefined}
    >
      <input
        checked={pagada}
        className="h-4 w-4 accent-emerald-300"
        disabled={guardando}
        onChange={() => void toggle()}
        type="checkbox"
      />
      {error ? "Error, reintenta" : pagada ? "Pagada" : label}
    </label>
  );
}

/** Aviso "tiene N cita(s) sin pagar" con casilla para marcar cada una como pagada. */
export function CitasSinPagarAviso({ citas, onChanged }: { citas: CitaRow[]; onChanged: () => void }) {
  if (citas.length === 0) return null;
  return (
    <div className="grid gap-2 border border-amber-300/40 bg-amber-300/10 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <CircleDollarSign className="h-4 w-4" />
        {citas.length === 1 ? "Tiene una cita sin pagar" : `Tiene ${citas.length} citas sin pagar`}
      </div>
      <ul className="grid gap-1.5">
        {citas.map((cita) => (
          <li key={cita.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-200">
            <span>{formatoFechaHora(cita.inicio)}</span>
            <PagadaCheckbox cita={cita} label="Marcar pagada" onChanged={onChanged} />
          </li>
        ))}
      </ul>
    </div>
  );
}
