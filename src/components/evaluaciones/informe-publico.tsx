"use client";

import { ClipboardList, HeartPulse, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import type { InformePaciente } from "@/lib/evaluaciones/informe-paciente";
import { InformePacienteVista } from "./informe-paciente-vista";

/** Página pública /informe/<token>: el informe que el psicólogo publicó para el paciente. */
export function InformePublico({ token }: { token: string }) {
  const [estado, setEstado] = useState<"cargando" | "ok" | "invalido">("cargando");
  const [informe, setInforme] = useState<InformePaciente | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/informe/${token}`)
      .then((r) => r.json())
      .then((d: { estado?: string; informe?: InformePaciente }) => {
        if (!vivo) return;
        if (d.estado === "ok" && d.informe) {
          setInforme(d.informe);
          setEstado("ok");
        } else setEstado("invalido");
      })
      .catch(() => vivo && setEstado("invalido"));
    return () => {
      vivo = false;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-white text-slate-900 print:bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 print:p-0">
        <div className="mb-6 flex items-center justify-between gap-2 print:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
              <HeartPulse className="h-4 w-4 text-emerald-600" />
            </span>
            Atención psicológica · Lic. Juan J. Reyes
          </span>
          {estado === "ok" ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir o guardar PDF
            </button>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 print:border-0 print:p-0 print:shadow-none">
          {estado === "cargando" ? <p className="py-10 text-center text-sm text-slate-400">Cargando...</p> : null}
          {estado === "invalido" ? (
            <div className="grid gap-3 py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-base font-semibold text-slate-900">Informe no disponible</p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
                Este enlace no es válido o el informe ya no está disponible. Consulte a su psicólogo.
              </p>
            </div>
          ) : null}
          {estado === "ok" && informe ? <InformePacienteVista informe={informe} /> : null}
        </div>
      </div>
    </main>
  );
}
