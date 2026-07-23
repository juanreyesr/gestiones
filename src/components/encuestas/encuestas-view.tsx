"use client";

import { BarChart3, ClipboardList, NotebookPen } from "lucide-react";
import { useState } from "react";
import type { CampanaConConteo } from "@/lib/encuestas/types";
import { CampanasList } from "./campanas-list";
import { CapturaRapida } from "./captura-rapida";
import { DashboardEncuestas } from "./dashboard-encuestas";

type Pestana = "campanas" | "captura" | "dashboard";

export function EncuestasView() {
  const [pestana, setPestana] = useState<Pestana>("campanas");
  const [campanaSeleccionada, setCampanaSeleccionada] = useState<CampanaConConteo | null>(null);

  const tabs: Array<{ value: Pestana; label: string; icon: typeof ClipboardList }> = [
    { value: "campanas", label: "Campañas", icon: ClipboardList },
    { value: "captura", label: "Captura rápida", icon: NotebookPen },
    { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
        <ClipboardList className="h-4 w-4" />
        Encuesta estudiantil
      </div>
      <p className="-mt-3 text-sm text-slate-400">
        Mide, año contra año, por qué los estudiantes de primer ingreso eligieron la universidad y la carrera, y qué esperan de ambas.
      </p>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const activo = pestana === tab.value;
          return (
            <button
              className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition ${
                activo ? "border-emerald-300/70 bg-emerald-300/14 text-white" : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
              }`}
              key={tab.value}
              onClick={() => setPestana(tab.value)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {pestana === "campanas" ? (
        <CampanasList
          onSeleccionarCampana={(campana) => {
            setCampanaSeleccionada(campana);
            setPestana("captura");
          }}
        />
      ) : null}
      {pestana === "captura" ? <CapturaRapida campanaPreseleccionada={campanaSeleccionada} /> : null}
      {pestana === "dashboard" ? <DashboardEncuestas /> : null}
    </div>
  );
}
