"use client";

import { Check, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { aprobarSolicitud } from "@/lib/cursos/acceso-estudiantes";
import { fetchSolicitudes, rechazarSolicitud } from "@/lib/cursos/solicitudes";
import { formatearFechaHora, type SolicitudRow } from "@/lib/cursos/types";
import { ErrorBanner } from "./ui";

/** Solicitudes de autoasignacion (QR/enlace) pendientes de revisar para este curso. */
export function SolicitudesPendientesSection({ cursoId, onResuelto }: { cursoId: string; onResuelto: () => void | Promise<void> }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [carnes, setCarnes] = useState<Record<string, string>>({});
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: fetchError } = await fetchSolicitudes(cursoId);
    setSolicitudes(data.filter((s) => s.estado === "pendiente"));
    setError(fetchError ?? "");
    setCargando(false);
  }, [cursoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de solicitudes al abrir el curso
    void cargar();
  }, [cargar]);

  const handleAprobar = async (solicitud: SolicitudRow) => {
    const carne = (carnes[solicitud.id] ?? "").trim();
    if (!carne) {
      setError("Asigna un número de carné antes de aprobar.");
      return;
    }
    setProcesandoId(solicitud.id);
    setError("");
    const { error: aprobarError } = await aprobarSolicitud(solicitud.id, carne);
    setProcesandoId(null);
    if (aprobarError) {
      setError(aprobarError);
      return;
    }
    await cargar();
    await onResuelto();
  };

  const handleRechazar = async (solicitud: SolicitudRow) => {
    setProcesandoId(solicitud.id);
    const { error: rechazarError } = await rechazarSolicitud(solicitud.id);
    setProcesandoId(null);
    if (rechazarError) {
      setError(rechazarError);
      return;
    }
    await cargar();
  };

  if (cargando || solicitudes.length === 0) return null;

  return (
    <div className="grid gap-3 border border-amber-300/30 bg-amber-300/10 p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 shrink-0 text-amber-200" />
        <div>
          <p className="text-sm font-semibold text-amber-100">
            {solicitudes.length} solicitud{solicitudes.length === 1 ? "" : "es"} de asignación pendiente{solicitudes.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-amber-200/80">Alguien pidió unirse a este curso desde el enlace/QR. Asígnale un carné para aprobarla.</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-2">
        {solicitudes.map((solicitud) => (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-3" key={solicitud.id}>
            <div>
              <div className="text-sm font-semibold text-white">{solicitud.nombre}</div>
              <div className="text-xs text-slate-400">{solicitud.correo}</div>
              <div className="text-xs text-slate-500">Solicitado: {formatearFechaHora(solicitud.created_at)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="field w-32"
                disabled={procesandoId === solicitud.id}
                onChange={(event) => setCarnes((prev) => ({ ...prev, [solicitud.id]: event.target.value }))}
                placeholder="Carné"
                value={carnes[solicitud.id] ?? ""}
              />
              <button
                className="flex h-9 items-center gap-1.5 border border-emerald-300/40 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-200 hover:border-emerald-300"
                disabled={procesandoId === solicitud.id}
                onClick={() => void handleAprobar(solicitud)}
                type="button"
              >
                <Check className="h-3.5 w-3.5" />
                Aprobar
              </button>
              <button
                className="flex h-9 items-center gap-1.5 border border-red-400/30 bg-red-400/10 px-3 text-xs font-semibold text-red-200 hover:border-red-300"
                disabled={procesandoId === solicitud.id}
                onClick={() => void handleRechazar(solicitud)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
