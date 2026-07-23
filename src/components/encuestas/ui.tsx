"use client";

import type React from "react";

export const BTN_PRIMARY =
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

export function CardBox({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className={`group relative border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12${
        onClick ? " cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function PanelBox({ children }: { children: React.ReactNode }) {
  return <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">{children}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/15 bg-white/4 p-6 text-center text-sm text-slate-400">{children}</div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{message}</p>;
}

export function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}
