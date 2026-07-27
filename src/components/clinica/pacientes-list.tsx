"use client";

import { ChevronRight, Search, Trash2, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { deletePaciente, setEstadoPaciente } from "@/lib/clinica/pacientes";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteEstado, PacienteRow } from "@/lib/clinica/types";
import { PACIENTE_ESTADOS } from "@/lib/clinica/types";
import { ConfirmDialog } from "../confirm-dialog";
import { BTN_PRIMARY, EmptyState } from "./ui";

export function PacientesList({
  loading,
  onChanged,
  onNuevo,
  onOpen,
  pacientes,
  ultimasSesiones,
}: {
  loading: boolean;
  onChanged: () => void;
  onNuevo: () => void;
  onOpen: (paciente: PacienteRow) => void;
  pacientes: PacienteRow[];
  ultimasSesiones: Record<string, string>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<PacienteRow | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return pacientes.filter((paciente) => {
      if (soloActivos && paciente.estado !== "activo") return false;
      if (!term) return true;
      return paciente.nombre.toLowerCase().includes(term) || paciente.telefono.includes(term);
    });
  }, [busqueda, pacientes, soloActivos]);

  const cambiarEstado = async (paciente: PacienteRow, estado: PacienteEstado) => {
    if (estado === paciente.estado) return;
    setBusyId(paciente.id);
    setError("");
    const { error: err } = await setEstadoPaciente(paciente.id, estado);
    setBusyId(null);
    if (err) {
      setError(err);
      return;
    }
    onChanged();
  };

  const confirmarBorrar = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    setError("");
    const { error: err } = await deletePaciente(aBorrar.id);
    setBorrando(false);
    setABorrar(null);
    if (err) {
      setError(err);
      return;
    }
    onChanged();
  };

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

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

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
            <div
              key={paciente.id}
              className="grid gap-3 border border-white/10 bg-white/6 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <button
                className="group grid gap-0.5 text-left"
                onClick={() => onOpen(paciente)}
                type="button"
              >
                <span className="flex items-center gap-1.5 text-base font-semibold text-white">
                  {paciente.nombre}
                  <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                </span>
                <span className="text-sm text-slate-400">{paciente.telefono}</span>
                <span className="text-xs text-slate-500">
                  {ultimasSesiones[paciente.id]
                    ? `Última sesión: ${formatoFechaCorta(ultimasSesiones[paciente.id])}`
                    : "Sin sesiones"}
                </span>
              </button>

              <div className="flex items-center gap-2 sm:justify-end">
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estado</span>
                  <select
                    aria-label={`Estado de ${paciente.nombre}`}
                    className="field h-9 py-1 text-sm"
                    disabled={busyId === paciente.id}
                    onChange={(event) => cambiarEstado(paciente, event.target.value as PacienteEstado)}
                    value={paciente.estado}
                  >
                    {PACIENTE_ESTADOS.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label={`Eliminar a ${paciente.nombre}`}
                  className="mt-4 shrink-0 border border-white/10 bg-white/8 p-2 text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
                  onClick={() => setABorrar(paciente)}
                  title="Eliminar paciente"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        busy={borrando}
        message={
          aBorrar
            ? `Vas a eliminar a ${aBorrar.nombre} de forma permanente. Se borrarán también todas sus sesiones, resúmenes, compromisos y tareas, y sus citas quedarán sin paciente asignado. Esta acción NO se puede deshacer. Si solo quieres dejar de verlo en la lista, mejor cámbialo a «Inactivo» en lugar de eliminarlo.`
            : ""
        }
        onCancel={() => setABorrar(null)}
        onConfirm={confirmarBorrar}
        open={aBorrar !== null}
        title="Eliminar paciente"
      />
    </div>
  );
}
