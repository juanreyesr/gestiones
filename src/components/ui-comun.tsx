"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";

export const BTN_PRIMARY =
  "inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60";
export const BTN_GHOST =
  "inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60";
export const BTN_DANGER =
  "inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300 disabled:opacity-60";
export const INPUT =
  "w-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-300/60";

export function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{message}</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/15 bg-white/4 p-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

/** Pastilla de color plano al estilo de las columnas de estado de Monday. */
export function Pastilla({
  className = "",
  color,
  texto,
  titulo,
}: {
  className?: string;
  color: string;
  texto: string;
  titulo: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${className}`}
      style={{ backgroundColor: color, color: texto }}
    >
      {titulo}
    </span>
  );
}

/** Color estable a partir de un nombre, para los avatares de responsable. */
export function colorDeNombre(nombre: string) {
  const paleta = ["#0073ea", "#00c875", "#a25ddc", "#e2445c", "#fdab3d", "#0086c0", "#ff642e", "#9cd326"];
  let suma = 0;
  for (let i = 0; i < nombre.length; i += 1) suma += nombre.charCodeAt(i);
  return paleta[suma % paleta.length];
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((parte) => parte.charAt(0).toUpperCase()).join("") || "?";
}

export function Avatar({ nombre, size = 26 }: { nombre: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ backgroundColor: colorDeNombre(nombre), height: size, width: size, fontSize: size * 0.4 }}
      title={nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}

/**
 * Menu flotante anclado a un disparador. Se dibuja en un portal con position
 * fixed calculada sobre el rectangulo del boton: dentro del tablero hay
 * contenedores con overflow (scroll horizontal de columnas, kanban), y un
 * menu absoluto normal se cortaria contra sus bordes.
 */
export function MenuAnclado({
  ancho = 220,
  children,
  onClose,
  trigger,
}: {
  ancho?: number;
  children: React.ReactNode;
  onClose: () => void;
  trigger: HTMLElement | null;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const alto = panelRef.current?.offsetHeight ?? 240;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - ancho - 8);
    const cabeAbajo = rect.bottom + alto + 8 < window.innerHeight;
    setPos({ left, top: cabeAbajo ? rect.bottom + 4 : Math.max(8, rect.top - alto - 4) });
  }, [ancho, trigger]);

  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclear);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60]" onClick={onClose} onContextMenu={(evento) => evento.preventDefault()}>
        <div
          className="fixed border border-white/15 bg-slate-950 p-1.5 shadow-2xl shadow-black/60"
          onClick={(evento) => evento.stopPropagation()}
          ref={panelRef}
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: ancho, visibility: pos ? "visible" : "hidden" }}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

export function OpcionMenu({
  children,
  destructiva,
  onClick,
}: {
  children: React.ReactNode;
  destructiva?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm font-semibold transition hover:bg-white/10 ${
        destructiva ? "text-red-200" : "text-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/** Modal simple centrado, reutilizado por los formularios del area. */
export function Modal({
  ancho = "max-w-lg",
  children,
  onClose,
  titulo,
}: {
  ancho?: string;
  children: React.ReactNode;
  onClose: () => void;
  titulo: string;
}) {
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10" onClick={onClose}>
        <div
          className={`w-full ${ancho} border border-white/10 bg-slate-950 p-5`}
          onClick={(evento) => evento.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">{titulo}</h3>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}
