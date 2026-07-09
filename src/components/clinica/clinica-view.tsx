"use client";

import { CalendarDays, Inbox, LayoutDashboard, Settings2, Users } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchPacientes } from "@/lib/clinica/pacientes";
import { contarSolicitudesPendientes } from "@/lib/clinica/solicitudes";
import { fetchUltimasSesiones } from "@/lib/clinica/ultimas-sesiones";
import type { PacienteRow } from "@/lib/clinica/types";
import { AgendaView } from "./agenda-view";
import { ClinicaDashboard } from "./clinica-dashboard";
import { DisponibilidadConfigView } from "./disponibilidad-config";
import { PacienteExpediente } from "./paciente-expediente";
import { PacienteForm } from "./paciente-form";
import { PacientesList } from "./pacientes-list";
import { SolicitudesView } from "./solicitudes-view";
import { BTN_GHOST } from "./ui";

type ClinicaTab = "dashboard" | "pacientes" | "agenda" | "solicitudes" | "configuracion";
type PacientesScreen = { view: "lista" } | { view: "nuevo" } | { view: "expediente"; pacienteId: string };

function ClinicaTabs({
  onChange,
  solicitudesPendientes,
  value,
}: {
  onChange: (value: ClinicaTab) => void;
  solicitudesPendientes: number;
  value: ClinicaTab;
}) {
  const tabs: Array<{ value: ClinicaTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: "dashboard", label: "Inicio", icon: LayoutDashboard },
    { value: "pacientes", label: "Pacientes", icon: Users },
    { value: "agenda", label: "Agenda", icon: CalendarDays },
    { value: "solicitudes", label: "Solicitudes", icon: Inbox },
    { value: "configuracion", label: "Configuración", icon: Settings2 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition ${
              active
                ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.value === "solicitudes" && solicitudesPendientes > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1 text-[11px] font-bold text-slate-950">
                {solicitudesPendientes}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ClinicaView() {
  const [tab, setTab] = useState<ClinicaTab>("dashboard");
  const [pacientesScreen, setPacientesScreen] = useState<PacientesScreen>({ view: "lista" });
  const [pacientes, setPacientes] = useState<PacienteRow[]>([]);
  const [ultimasSesiones, setUltimasSesiones] = useState<Record<string, string>>({});
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  const cargarPacientes = useCallback(async () => {
    setLoadingPacientes(true);
    const [{ data }, ultimas] = await Promise.all([fetchPacientes(), fetchUltimasSesiones()]);
    setLoadingPacientes(false);
    setPacientes(data);
    setUltimasSesiones(ultimas);
  }, []);

  const cargarBadge = useCallback(async () => {
    const { count } = await contarSolicitudesPendientes();
    setSolicitudesPendientes(count);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargarPacientes();
    void cargarBadge();
  }, [cargarPacientes, cargarBadge]);

  const openPaciente = (pacienteId: string) => {
    setPacientesScreen({ view: "expediente", pacienteId });
    setTab("pacientes");
  };

  return (
    <div className="grid gap-5">
      <ClinicaTabs
        onChange={(value) => {
          setTab(value);
          if (value === "pacientes" && pacientesScreen.view === "nuevo") {
            setPacientesScreen({ view: "lista" });
          }
          if (value === "solicitudes") {
            void cargarBadge();
          }
        }}
        solicitudesPendientes={solicitudesPendientes}
        value={tab}
      />

      {tab === "dashboard" ? (
        <ClinicaDashboard
          onIrASolicitudes={() => setTab("solicitudes")}
          onOpenPaciente={openPaciente}
          pacientes={pacientes}
          solicitudesPendientes={solicitudesPendientes}
        />
      ) : null}

      {tab === "pacientes" ? (
        pacientesScreen.view === "lista" ? (
          <PacientesList
            loading={loadingPacientes}
            onNuevo={() => setPacientesScreen({ view: "nuevo" })}
            onOpen={(paciente) => setPacientesScreen({ view: "expediente", pacienteId: paciente.id })}
            pacientes={pacientes}
            ultimasSesiones={ultimasSesiones}
          />
        ) : pacientesScreen.view === "nuevo" ? (
          <div className="grid gap-4">
            <button className={`${BTN_GHOST} w-fit`} onClick={() => setPacientesScreen({ view: "lista" })} type="button">
              ← Volver a pacientes
            </button>
            <h2 className="text-xl font-semibold text-white">Nuevo paciente · Hoja de datos generales</h2>
            <PacienteForm
              onSaved={(id) => {
                void cargarPacientes();
                setPacientesScreen({ view: "expediente", pacienteId: id });
              }}
              paciente={null}
            />
          </div>
        ) : (
          <PacienteExpediente
            onDatosGuardados={() => void cargarPacientes()}
            onVolver={() => {
              setPacientesScreen({ view: "lista" });
              void cargarPacientes();
            }}
            pacienteId={pacientesScreen.pacienteId}
          />
        )
      ) : null}

      {tab === "agenda" ? <AgendaView pacientes={pacientes} /> : null}

      {tab === "solicitudes" ? (
        <SolicitudesView
          onCambio={() => {
            void cargarBadge();
            void cargarPacientes();
          }}
          pacientes={pacientes}
        />
      ) : null}

      {tab === "configuracion" ? <DisponibilidadConfigView /> : null}
    </div>
  );
}
