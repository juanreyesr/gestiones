"use client";

import { GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type React from "react";

export function PortadaView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <p className="mb-3 text-sm font-medium tracking-wide text-slate-400">GestionesJJ</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Bienvenido</h1>
        <p className="mt-4 max-w-xl text-lg text-slate-500">Elige cómo quieres entrar.</p>

        <div className="mt-14 grid w-full gap-5 sm:grid-cols-2">
          <PortadaOpcion
            descripcion="Revisa tus cursos, tareas, calificaciones y mensajes con tu docente."
            href="/estudiante"
            icono={GraduationCap}
            titulo="Acceso a estudiantes"
          />
          <PortadaOpcion
            descripcion="Gestiona cursos, estudiantes, contenidos y reportes."
            href="/admin"
            icono={ShieldCheck}
            titulo="Acceso administrativo"
          />
        </div>
      </div>
    </div>
  );
}

function PortadaOpcion({
  descripcion,
  href,
  icono: Icono,
  titulo,
}: {
  descripcion: string;
  href: string;
  icono: React.ComponentType<{ className?: string }>;
  titulo: string;
}) {
  return (
    <Link
      className="group flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
      href={href}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
        <Icono className="h-6 w-6" />
      </span>
      <span className="text-lg font-semibold text-slate-900">{titulo}</span>
      <span className="text-sm text-slate-500">{descripcion}</span>
    </Link>
  );
}
