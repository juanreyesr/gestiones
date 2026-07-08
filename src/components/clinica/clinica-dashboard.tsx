"use client";

import { CalendarDays, Check, ClipboardList, Inbox, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cambiarEstadoCita, fetchCitas } from "@/lib/clinica/citas";
import { fetchCompromisosPendientes, type CompromisoPendiente } from "@/lib/clinica/compromisos";
import { syncCitaConGoogle } from "@/lib/clinica/google-client";
import { formatoHora } from "@/lib/clinica/slots";
import type { CitaRow, PacienteRow } from "@/lib/clinica/types";
import { CitaBadge, EmptyState, Metric, SectionCard } from "./ui";

export function ClinicaDashboard({
  onIrASolicitudes,
  onOpenPaciente,
  pacientes,
  solicitudesPendientes,
}: {
  onIrASolicitudes: () => void;
  onOpenPaciente: (pacienteId: string) => void;
  pacientes: PacienteRow[];
  solicitudesPendientes: number;
}) {
  const [citasHoy, setCitasHoy] = useState<CitaRow[]>([]);
  const [pendientes, setPendientes] = useState<CompromisoPendiente[]>([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(inicioDia);
    finDia.setDate(finDia.getDate() + 1);

    const [citasRes, compromisosRes] = await Promise.all([
      fetchCitas(inicioDia.toISOString(), finDia.toISOString()),
      fetchCompromisosPendientes(),
    ]);

    if (citasRes.error) {
      setError(citasRes.error);
      return;
    }
    setError("");
    setCitasHoy(citasRes.data);
    setPendientes(compromisosRes.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const activas = useMemo(
    () => citasHoy.filter((cita) => cita.estado === "pendiente" || cita.estado === "confirmada"),
    [citasHoy]
  );
  const pacientesActivos = useMemo(() => pacientes.filter((paciente) => paciente.estado === "activo"), [pacientes]);

  const tareasPorPaciente = useMemo(() => {
    const grupos = new Map<string, { nombre: string; items: CompromisoPendiente[] }>();
    for (const item of pendientes) {
      const grupo = grupos.get(item.pacienteId) ?? { nombre: item.pacienteNombre ?? "Paciente", items: [] };
      grupo.items.push(item);
      grupos.set(item.pacienteId, grupo);
    }
    return Array.from(grupos.entries());
  }, [pendientes]);

  const handleCompletar = async (cita: CitaRow) => {
    const { error: err } = await cambiarEstadoCita(cita.id, "completada");
    if (err) {
      setError(err);
      return;
    }
    void syncCitaConGoogle(cita.id, "update");
    void cargar();
  };

  return (
    <div className="grid gap-5">
      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          detail={activas.length === 1 ? "cita activa" : "citas activas"}
          icon={CalendarDays}
          title="Citas de hoy"
          value={String(activas.length)}
        />
        <Metric
          detail={solicitudesPendientes === 1 ? "por aprobar" : "por aprobar"}
          icon={Inbox}
          title="Solicitudes"
          value={String(solicitudesPendientes)}
        />
        <Metric detail="en tratamiento" icon={Users} title="Pacientes activos" value={String(pacientesActivos.length)} />
        <Metric
          detail="compromisos y tareas"
          icon={ClipboardList}
          title="Pendientes"
          value={String(pendientes.length)}
        />
      </div>

      {solicitudesPendientes > 0 ? (
        <button
          className="flex items-center justify-between border border-amber-300/40 bg-amber-300/10 p-4 text-left transition hover:bg-amber-300/15"
          onClick={onIrASolicitudes}
          type="button"
        >
          <span className="text-sm font-semibold text-amber-200">
            Tienes {solicitudesPendientes} {solicitudesPendientes === 1 ? "solicitud de cita" : "solicitudes de cita"} por
            revisar.
          </span>
          <span className="text-sm font-bold text-amber-300">Revisar →</span>
        </button>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Agenda de hoy">
          {citasHoy.length === 0 ? (
            <EmptyState>No tienes citas programadas para hoy.</EmptyState>
          ) : (
            <div className="grid gap-2">
              {citasHoy.map((cita) => (
                <div
                  key={cita.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/4 p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {formatoHora(cita.inicio)} · {cita.pacienteNombre ?? cita.contactoNombre ?? "Sin nombre"}
                    </div>
                    {cita.motivo ? <div className="mt-0.5 truncate text-xs text-slate-400">{cita.motivo}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <CitaBadge estado={cita.estado} />
                    {cita.estado === "confirmada" ? (
                      <button
                        aria-label="Marcar completada"
                        className="border border-sky-300/40 bg-sky-300/10 p-1.5 text-sky-200 transition hover:bg-sky-300/20"
                        onClick={() => handleCompletar(cita)}
                        title="Marcar completada"
                        type="button"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Compromisos y tareas por paciente">
          {tareasPorPaciente.length === 0 ? (
            <EmptyState>No hay compromisos ni tareas pendientes.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {tareasPorPaciente.map(([pacienteId, grupo]) => (
                <button
                  key={pacienteId}
                  className="border border-white/10 bg-white/4 p-3 text-left transition hover:border-emerald-300/40"
                  onClick={() => onOpenPaciente(pacienteId)}
                  type="button"
                >
                  <div className="text-sm font-semibold text-white">{grupo.nombre}</div>
                  <ul className="mt-1.5 grid gap-1">
                    {grupo.items.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs leading-5 text-slate-300">
                        <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                        {item.descripcion}
                      </li>
                    ))}
                    {grupo.items.length > 3 ? (
                      <li className="text-xs text-slate-500">y {grupo.items.length - 3} más...</li>
                    ) : null}
                  </ul>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
