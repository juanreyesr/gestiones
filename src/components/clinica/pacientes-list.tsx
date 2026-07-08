"use client";

import { Search, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type { PacienteRow } from "@/lib/clinica/types";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import { BTN_PRIMARY, EmptyState, PacienteBadge } from "./ui";

export function PacientesList({
  loading,
  onNuevo,
  onOpen,
  pacientes,
  ultimasSesiones,
}: {
  loading: boolean;
  onNuevo: () => void;
  onOpen: (paciente: PacienteRow) => void;
  pacientes: PacienteRow[];
  ultimasSesiones: Record<string, string>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return pacientes.filter((paciente) => {
      if (soloActivos && paciente.estado !== "activo") return false;
      if (!term) return true;
      return paciente.nombre.toLowerCase().includes(term) || paciente.telefono.includes(term);
    });
  }, [busqueda, pacientes, soloActivos]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="field pl-9"
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre o teléfono"
            value={busqueda}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              checked={soloActivos}
              className="h-4 w-4 accent-emerald-300"
              onChange={(event) => setSoloActivos(event.target.checked)}
              type="checkbox"
            />
            Solo activos
          </label>
          <button className={BTN_PRIMARY} onClick={onNuevo} type="button">
            <UserRoundPlus className="h-4 w-4" />
            Nuevo paciente
          </button>
        </div>
      </div>

      {loading ? (
        <EmptyState>Cargando pacientes...</EmptyState>
      ) : filtrados.length === 0 ? (
        <EmptyState>
          {pacientes.length === 0
            ? "Aún no tienes pacientes registrados. Crea el primero con el botón «Nuevo paciente»."
            : "Ningún paciente coincide con la búsqueda."}
        </EmptyState>
      ) : (
        <div className="grid gap-2">
          {filtrados.map((paciente) => (
            <button
              key={paciente.id}
              className="grid gap-2 border border-white/10 bg-white/6 p-4 text-left transition hover:border-emerald-300/50 hover:bg-white/10 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              onClick={() => onOpen(paciente)}
              type="button"
            >
              <span>
                <span className="block text-base font-semibold text-white">{paciente.nombre}</span>
                <span className="mt-0.5 block text-sm text-slate-400">{paciente.telefono}</span>
              </span>
              <span className="text-xs text-slate-400">
                {ultimasSesiones[paciente.id]
                  ? `Última sesión: ${formatoFechaCorta(ultimasSesiones[paciente.id])}`
                  : "Sin sesiones"}
              </span>
              <PacienteBadge estado={paciente.estado} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
