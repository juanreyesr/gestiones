"use client";

import { CalendarDays, Check, ChevronRight, CircleDollarSign, Inbox, Users } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cambiarEstadoCita, fetchCitas, fetchCitasSinPagar } from "@/lib/clinica/citas";
import { syncCitaConGoogle } from "@/lib/clinica/google-client";
import { formatoFechaHora, formatoHora } from "@/lib/clinica/slots";
import type { CitaRow, PacienteRow } from "@/lib/clinica/types";
import { PagadaCheckbox } from "./pagos";
import { CitaBadge, EmptyState, Metric, SectionCard } from "./ui";

export function ClinicaDashboard({
  onIrAPacientes,
  onIrASolicitudes,
  onOpenPaciente,
  pacientes,
  solicitudesPendientes,
}: {
  onIrAPacientes: () => void;
  onIrASolicitudes: () => void;
  onOpenPaciente: (pacienteId: string) => void;
  pacientes: PacienteRow[];
  solicitudesPendientes: number;
}) {
  const [citasHoy, setCitasHoy] = useState<CitaRow[]>([]);
  const [sinPagar, setSinPagar] = useState<CitaRow[]>([]);
  const [error, setError] = useState("");
  const agendaRef = useRef<HTMLDivElement>(null);
  const pagosRef = useRef<HTMLDivElement>(null);

  const irA = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cargar = useCallback(async () => {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(inicioDia);
    finDia.setDate(finDia.getDate() + 1);

    const [citasRes, sinPagarRes] = await Promise.all([
      fetchCitas(inicioDia.toISOString(), finDia.toISOString()),
      fetchCitasSinPagar(),
    ]);

    if (citasRes.error) {
      setError(citasRes.error);
      return;
    }
    setError("");
    setCitasHoy(citasRes.data);
    setSinPagar(sinPagarRes.data);
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

  // Pacientes con alguna cita atendida sin pagar (agrupadas por paciente).
  const pagosPorPaciente = useMemo(() => {
    const grupos = new Map<string, { pacienteId: string | null; nombre: string; citas: CitaRow[] }>();
    for (const cita of sinPagar) {
      const clave = cita.pacienteId ?? `contacto:${cita.contactoNombre ?? cita.id}`;
      const grupo = grupos.get(clave) ?? {
        pacienteId: cita.pacienteId,
        nombre: cita.pacienteNombre ?? cita.contactoNombre ?? "Sin nombre",
        citas: [],
      };
      grupo.citas.push(cita);
      grupos.set(clave, grupo);
    }
    return Array.from(grupos.entries());
  }, [sinPagar]);

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
          onClick={() => irA(agendaRef)}
          title="Citas de hoy"
          value={String(activas.length)}
        />
        <Metric
          detail="por aprobar"
          icon={Inbox}
          onClick={onIrASolicitudes}
          title="Solicitudes"
          value={String(solicitudesPendientes)}
        />
        <Metric
          detail="en tratamiento"
          icon={Users}
          onClick={onIrAPacientes}
          title="Pacientes activos"
          value={String(pacientesActivos.length)}
        />
        <Metric
          detail={sinPagar.length === 1 ? "1 cita sin pagar" : `${sinPagar.length} citas sin pagar`}
          icon={CircleDollarSign}
          onClick={() => irA(pagosRef)}
          title="Pendientes de pago"
          value={String(pagosPorPaciente.length)}
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
        <div className="scroll-mt-4" ref={agendaRef}>
          <SectionCard title="Agenda de hoy">
            {citasHoy.length === 0 ? (
              <EmptyState>No tienes citas programadas para hoy.</EmptyState>
            ) : (
              <div className="grid gap-2">
                {citasHoy.map((cita) => {
                  const nombre = cita.pacienteNombre ?? cita.contactoNombre ?? "Sin nombre";
                  const conPago = cita.estado !== "cancelada" && cita.estado !== "no_asistio";
                  return (
                    <div
                      key={cita.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/4 p-3"
                    >
                      {cita.pacienteId ? (
                        <button
                          className="group min-w-0 text-left"
                          onClick={() => onOpenPaciente(cita.pacienteId as string)}
                          title="Abrir expediente y sesión"
                          type="button"
                        >
                          <span className="flex items-center gap-1 text-sm font-semibold text-white group-hover:text-emerald-200">
                            {formatoHora(cita.inicio)} · {nombre}
                            <ChevronRight className="h-4 w-4 text-emerald-300" />
                          </span>
                          {cita.motivo ? (
                            <span className="mt-0.5 block truncate text-xs text-slate-400">{cita.motivo}</span>
                          ) : null}
                        </button>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {formatoHora(cita.inicio)} · {nombre}
                          </div>
                          {cita.motivo ? <div className="mt-0.5 truncate text-xs text-slate-400">{cita.motivo}</div> : null}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <CitaBadge estado={cita.estado} />
                        {conPago ? (
                          <PagadaCheckbox key={`${cita.id}-${cita.pagada}`} cita={cita} onChanged={() => void cargar()} />
                        ) : null}
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
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="scroll-mt-4" ref={pagosRef}>
          <SectionCard title="Pendientes de pago">
            {pagosPorPaciente.length === 0 ? (
              <EmptyState>Todas las citas atendidas están pagadas.</EmptyState>
            ) : (
              <div className="grid gap-3">
                {pagosPorPaciente.map(([clave, grupo]) => (
                  <div key={clave} className="border border-white/10 bg-white/4 p-3">
                    {grupo.pacienteId ? (
                      <button
                        className="flex items-center gap-1 text-left text-sm font-semibold text-white transition hover:text-emerald-200"
                        onClick={() => onOpenPaciente(grupo.pacienteId as string)}
                        type="button"
                      >
                        {grupo.nombre}
                        <ChevronRight className="h-4 w-4 text-emerald-300" />
                      </button>
                    ) : (
                      <div className="text-sm font-semibold text-white">{grupo.nombre}</div>
                    )}
                    <ul className="mt-2 grid gap-1.5">
                      {grupo.citas.map((cita) => (
                        <li key={cita.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                          <span>{formatoFechaHora(cita.inicio)}</span>
                          <PagadaCheckbox cita={cita} label="Marcar pagada" onChanged={() => void cargar()} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
