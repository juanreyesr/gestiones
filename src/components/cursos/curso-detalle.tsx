"use client";

import { CalendarDays, ChevronLeft, ClipboardList, FileText, Users } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { CursoImpartidoRow, SemanaRow, UniversidadRow } from "@/lib/cursos/types";
import { ESTADO_CURSO_LABELS } from "@/lib/cursos/types";
import { CursoEstudiantesTab } from "./curso-estudiantes-tab";
import { CursoPlanificacionTab } from "./curso-planificacion-tab";
import { CursoReporteTab } from "./curso-reporte-tab";
import { CursoSemanasTab } from "./curso-semanas-tab";
import { BTN_GHOST, Chip } from "./ui";

type CursoTab = "semanas" | "estudiantes" | "planificacion" | "reporte";

const ESTADO_CHIP: Record<string, string> = {
  activo: "border-emerald-300/40 bg-emerald-300/15 text-emerald-200",
  finalizado: "border-sky-300/40 bg-sky-300/15 text-sky-200",
  archivado: "border-slate-400/40 bg-slate-400/15 text-slate-300",
};

export function CursoDetalle({
  curso,
  onOpenSemana,
  onVolver,
  universidad,
}: {
  curso: CursoImpartidoRow;
  onOpenSemana: (semana: SemanaRow) => void;
  onVolver: () => void;
  universidad: UniversidadRow;
}) {
  const [tab, setTab] = useState<CursoTab>("semanas");

  return (
    <div className="grid gap-5">
      <button className={`${BTN_GHOST} w-fit`} onClick={onVolver} type="button">
        <ChevronLeft className="h-4 w-4" />
        Volver a {universidad.nombre}
      </button>

      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
        <Chip className={ESTADO_CHIP[curso.estado]}>{ESTADO_CURSO_LABELS[curso.estado]}</Chip>
        <div>
          <h2 className="text-xl font-semibold text-white">{curso.nombre}</h2>
          <p className="text-sm text-slate-400">
            {[curso.codigo, curso.periodo, curso.horario].filter(Boolean).join(" · ") || "Sin datos adicionales"}
          </p>
        </div>
      </div>

      <CursoTabs onChange={setTab} value={tab} />

      {tab === "semanas" ? <CursoSemanasTab cursoId={curso.id} onOpenSemana={onOpenSemana} /> : null}
      {tab === "estudiantes" ? <CursoEstudiantesTab cursoId={curso.id} /> : null}
      {tab === "planificacion" ? <CursoPlanificacionTab cursoId={curso.id} /> : null}
      {tab === "reporte" ? <CursoReporteTab curso={curso} universidad={universidad} /> : null}
    </div>
  );
}

function CursoTabs({ onChange, value }: { onChange: (value: CursoTab) => void; value: CursoTab }) {
  const tabs: Array<{ value: CursoTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: "semanas", label: "Semanas", icon: CalendarDays },
    { value: "estudiantes", label: "Estudiantes", icon: Users },
    { value: "planificacion", label: "Planificación", icon: FileText },
    { value: "reporte", label: "Reporte", icon: ClipboardList },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;
        return (
          <button
            className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition ${
              active
                ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
