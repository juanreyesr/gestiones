"use client";

import { Check, Inbox, Mail, Phone, UserRoundPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { syncCitaConGoogle } from "@/lib/clinica/google-client";
import { formatoFechaHora, formatoHora } from "@/lib/clinica/slots";
import { aprobarSolicitud, fetchSolicitudes, rechazarSolicitud } from "@/lib/clinica/solicitudes";
import type { PacienteRow, SolicitudRow } from "@/lib/clinica/types";
import { ModalPortal } from "../modal-portal";
import { BTN_ACCENT, BTN_GHOST, EmptyState, SectionCard, SolicitudBadge } from "./ui";

function AprobarModal({
  onAprobada,
  onClose,
  pacientes,
  solicitud,
}: {
  onAprobada: () => void;
  onClose: () => void;
  pacientes: PacienteRow[];
  solicitud: SolicitudRow;
}) {
  const [modo, setModo] = useState<"nuevo" | "existente">("nuevo");
  const [pacienteId, setPacienteId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sugeridos = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const filtrados = pacientes
      .filter((paciente) => !term || paciente.nombre.toLowerCase().includes(term))
      .slice(0, 6);
    // El paciente ya seleccionado siempre debe seguir visible en el select,
    // aunque la busqueda actual lo filtre.
    if (pacienteId && !filtrados.some((paciente) => paciente.id === pacienteId)) {
      const seleccionado = pacientes.find((paciente) => paciente.id === pacienteId);
      if (seleccionado) filtrados.unshift(seleccionado);
    }
    return filtrados;
  }, [busqueda, pacientes, pacienteId]);

  const handleAprobar = async () => {
    if (saving) return;
    if (modo === "existente" && !pacienteId) {
      setError("Selecciona el paciente a vincular.");
      return;
    }
    setSaving(true);
    setError("");
    const { citaId, error: err } = await aprobarSolicitud(solicitud.id, modo === "existente" ? pacienteId : null);
    setSaving(false);
    if (err || !citaId) {
      setError(err ?? "No se pudo aprobar la solicitud.");
      return;
    }
    void syncCitaConGoogle(citaId, "create");
    onAprobada();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="w-full max-w-md border border-white/10 bg-slate-950 p-5" onClick={(event) => event.stopPropagation()}>
          <h3 className="text-lg font-semibold text-white">Aprobar solicitud</h3>
          <p className="mt-1 text-sm text-slate-300">
            {solicitud.nombre} · {formatoFechaHora(solicitud.inicio)} – {formatoHora(solicitud.fin)}
          </p>

          <div className="mt-4 grid gap-2">
            <label className="flex cursor-pointer items-start gap-2.5 border border-white/10 bg-white/4 p-3 transition hover:border-emerald-300/40">
              <input
                checked={modo === "nuevo"}
                className="mt-0.5 h-4 w-4 accent-emerald-300"
                name="modo-aprobar"
                onChange={() => setModo("nuevo")}
                type="radio"
              />
              <span>
                <span className="block text-sm font-semibold text-white">Crear nuevo paciente</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Se abrirá su expediente con el nombre, teléfono y motivo de la solicitud.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 border border-white/10 bg-white/4 p-3 transition hover:border-emerald-300/40">
              <input
                checked={modo === "existente"}
                className="mt-0.5 h-4 w-4 accent-emerald-300"
                name="modo-aprobar"
                onChange={() => setModo("existente")}
                type="radio"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">Vincular a paciente existente</span>
                {modo === "existente" ? (
                  <span className="mt-2 grid gap-2">
                    <input
                      className="field"
                      onChange={(event) => setBusqueda(event.target.value)}
                      placeholder="Buscar paciente..."
                      value={busqueda}
                    />
                    <select className="field" onChange={(event) => setPacienteId(event.target.value)} value={pacienteId}>
                      <option value="">Selecciona...</option>
                      {sugeridos.map((paciente) => (
                        <option key={paciente.id} value={paciente.id}>
                          {paciente.nombre}
                        </option>
                      ))}
                    </select>
                  </span>
                ) : null}
              </span>
            </label>
          </div>

          {error ? <div className="mt-3 border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_ACCENT} disabled={saving} onClick={handleAprobar} type="button">
              <Check className="h-4 w-4" />
              {saving ? "Aprobando..." : "Aprobar cita"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function SolicitudesView({
  onCambio,
  pacientes,
}: {
  onCambio: () => void;
  pacientes: PacienteRow[];
}) {
  const [pendientes, setPendientes] = useState<SolicitudRow[]>([]);
  const [historial, setHistorial] = useState<SolicitudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aprobando, setAprobando] = useState<SolicitudRow | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { pendientes: pend, historial: hist, error: err } = await fetchSolicitudes();
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setPendientes(pend);
    setHistorial(hist);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const handleRechazar = async (solicitud: SolicitudRow) => {
    setRechazandoId(solicitud.id);
    const { error: err } = await rechazarSolicitud(solicitud.id);
    setRechazandoId(null);
    if (err) {
      setError(err);
      return;
    }
    void cargar();
    onCambio();
  };

  return (
    <div className="grid gap-5">
      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <SectionCard title={`Solicitudes pendientes (${pendientes.length})`}>
        {loading ? (
          <EmptyState>Cargando solicitudes...</EmptyState>
        ) : pendientes.length === 0 ? (
          <EmptyState>
            <span className="inline-flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              No hay solicitudes pendientes. Comparte tu enlace público para que tus pacientes agenden.
            </span>
          </EmptyState>
        ) : (
          <div className="grid gap-3">
            {pendientes.map((solicitud) => (
              <div key={solicitud.id} className="grid gap-3 border border-amber-300/30 bg-amber-300/6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">{solicitud.nombre}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                      <a className="inline-flex items-center gap-1.5 hover:text-emerald-300" href={`tel:${solicitud.telefono}`}>
                        <Phone className="h-3.5 w-3.5" />
                        {solicitud.telefono}
                      </a>
                      {solicitud.email ? (
                        <a
                          className="inline-flex items-center gap-1.5 hover:text-emerald-300"
                          href={`mailto:${solicitud.email}`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {solicitud.email}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-200">{formatoFechaHora(solicitud.inicio)}</div>
                    <div className="text-xs text-slate-400">hasta {formatoHora(solicitud.fin)}</div>
                  </div>
                </div>
                {solicitud.motivo ? <p className="text-sm leading-6 text-slate-300">“{solicitud.motivo}”</p> : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:border-red-300 disabled:opacity-60"
                    disabled={rechazandoId === solicitud.id}
                    onClick={() => handleRechazar(solicitud)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                    {rechazandoId === solicitud.id ? "Rechazando..." : "Rechazar"}
                  </button>
                  <button className={BTN_ACCENT} onClick={() => setAprobando(solicitud)} type="button">
                    <UserRoundPlus className="h-4 w-4" />
                    Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {historial.length > 0 ? (
        <SectionCard title="Historial reciente">
          <div className="grid gap-2">
            {historial.map((solicitud) => (
              <div
                key={solicitud.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/4 p-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-200">{solicitud.nombre}</div>
                  <div className="text-xs text-slate-400">{formatoFechaHora(solicitud.inicio)}</div>
                </div>
                <SolicitudBadge estado={solicitud.estado} />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {aprobando ? (
        <AprobarModal
          onAprobada={() => {
            setAprobando(null);
            void cargar();
            onCambio();
          }}
          onClose={() => setAprobando(null)}
          pacientes={pacientes}
          solicitud={aprobando}
        />
      ) : null}
    </div>
  );
}
