"use client";

import { useEffect, useState } from "react";
import { fetchCitasDePaciente } from "@/lib/clinica/citas";
import { formatoFechaHora } from "@/lib/clinica/slots";
import type { CitaRow } from "@/lib/clinica/types";
import { CitaBadge, EmptyState, SectionCard } from "./ui";

/**
 * Bitácora de citas del paciente: todas sus citas con su estado y la nota de
 * las canceladas o en las que no asistió (la que se escribe al marcarlas, en
 * la agenda o respondiendo en Telegram).
 */
export function BitacoraCitas({ pacienteId, recarga }: { pacienteId: string; recarga?: unknown }) {
  const [citas, setCitas] = useState<CitaRow[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void fetchCitasDePaciente(pacienteId).then(({ data }) => vivo && setCitas(data));
    return () => {
      vivo = false;
    };
  }, [pacienteId, recarga]);

  if (!citas) return null;
  const canceladas = citas.filter((c) => c.estado === "cancelada").length;
  const faltas = citas.filter((c) => c.estado === "no_asistio").length;
  const resumen = [
    `${citas.length} cita${citas.length === 1 ? "" : "s"}`,
    canceladas ? `${canceladas} cancelada${canceladas === 1 ? "" : "s"}` : "",
    faltas ? `${faltas} sin asistir` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SectionCard plegable={{ id: "bitacora-citas", resumen }} title="Bitácora de citas">
      {citas.length === 0 ? (
        <EmptyState>Aún no tiene citas.</EmptyState>
      ) : (
        <ul className="grid gap-2" data-testid="bitacora-citas">
          {citas.map((c) => (
            <li className="grid gap-1 border border-white/10 bg-white/4 p-2.5" key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-slate-200">{formatoFechaHora(c.inicio)}</span>
                <CitaBadge estado={c.estado} />
              </div>
              {c.motivo ? <span className="text-xs text-slate-400">{c.motivo}</span> : null}
              {c.motivoEstado ? (
                <span className="text-xs text-amber-100">
                  📝 {c.estado === "cancelada" ? "Nota de la cancelación" : "Nota"}: {c.motivoEstado}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
