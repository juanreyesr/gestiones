"use client";

import type React from "react";
import type { CitaEstado, PacienteEstado, SolicitudEstado } from "@/lib/clinica/types";

export const BTN_PRIMARY =
  "inline-flex items-center gap-2 bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60";
export const BTN_ACCENT =
  "inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60";
export const BTN_GHOST =
  "inline-flex items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60";
export const BTN_DANGER =
  "inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300 disabled:opacity-60";

export function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function SectionCard({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border border-white/10 bg-white/6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Metric({
  detail,
  icon: Icon,
  title,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400">{title}</span>
        <Icon className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-300">{detail}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/15 bg-white/4 p-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

const PACIENTE_BADGES: Record<PacienteEstado, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-emerald-300/15 text-emerald-200 border-emerald-300/40" },
  inactivo: { label: "Inactivo", className: "bg-slate-400/15 text-slate-300 border-slate-400/40" },
  alta: { label: "Alta", className: "bg-sky-300/15 text-sky-200 border-sky-300/40" },
};

export function PacienteBadge({ estado }: { estado: PacienteEstado }) {
  const badge = PACIENTE_BADGES[estado];
  return (
    <span className={`inline-flex border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export const CITA_BADGES: Record<CitaEstado, { label: string; className: string; dot: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-300/15 text-amber-200 border-amber-300/40", dot: "bg-amber-300" },
  confirmada: { label: "Confirmada", className: "bg-emerald-300/15 text-emerald-200 border-emerald-300/40", dot: "bg-emerald-300" },
  completada: { label: "Completada", className: "bg-sky-300/15 text-sky-200 border-sky-300/40", dot: "bg-sky-300" },
  cancelada: { label: "Cancelada", className: "bg-slate-400/15 text-slate-300 border-slate-400/40", dot: "bg-slate-400" },
  no_asistio: { label: "No asistió", className: "bg-red-400/15 text-red-200 border-red-400/40", dot: "bg-red-400" },
};

export function CitaBadge({ estado }: { estado: CitaEstado }) {
  const badge = CITA_BADGES[estado];
  return (
    <span className={`inline-flex border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  );
}

const SOLICITUD_BADGES: Record<SolicitudEstado, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-300/15 text-amber-200 border-amber-300/40" },
  aprobada: { label: "Aprobada", className: "bg-emerald-300/15 text-emerald-200 border-emerald-300/40" },
  rechazada: { label: "Rechazada", className: "bg-red-400/15 text-red-200 border-red-400/40" },
  expirada: { label: "Expirada", className: "bg-slate-400/15 text-slate-300 border-slate-400/40" },
};

export function SolicitudBadge({ estado }: { estado: SolicitudEstado }) {
  const badge = SOLICITUD_BADGES[estado];
  return (
    <span className={`inline-flex border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  );
}
