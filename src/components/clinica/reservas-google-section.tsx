"use client";

import { CalendarSearch, Check, Link2, Mail, Phone, RefreshCw, UserRoundPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buscarCoincidencia } from "@/lib/clinica/coincidencias";
import {
  buscarReservasAhora,
  fetchReservasPendientes,
  type ReservaGoogle,
  resolverReservaGoogle,
} from "@/lib/clinica/reservas-google-client";
import { formatoFechaHora, formatoHora } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { BTN_ACCENT, BTN_GHOST, EmptyState, SectionCard } from "./ui";

type Modo = { tipo: "otro"; busqueda: string; pacienteId: string } | { tipo: "crear"; nombre: string; telefono: string; email: string };

function ReservaCard({
  onResuelta,
  pacientes,
  reserva,
}: {
  onResuelta: (mensaje: string) => void;
  pacientes: PacienteRow[];
  reserva: ReservaGoogle;
}) {
  const coincidencia = useMemo(() => buscarCoincidencia(pacientes, reserva), [pacientes, reserva]);
  const [modo, setModo] = useState<Modo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const opciones = useMemo(() => {
    if (modo?.tipo !== "otro") return [];
    const term = modo.busqueda.trim().toLowerCase();
    return pacientes.filter((p) => !term || p.nombre.toLowerCase().includes(term)).slice(0, 8);
  }, [modo, pacientes]);

  const ejecutar = async (input: Parameters<typeof resolverReservaGoogle>[0]) => {
    if (saving) return;
    setSaving(true);
    setError("");
    const { data, error: err } = await resolverReservaGoogle(input);
    setSaving(false);
    if (err || !data) {
      setError(err ?? "No se pudo completar.");
      return;
    }
    onResuelta(data.mensaje);
  };

  return (
    <div className="grid gap-3 border border-sky-300/30 bg-sky-300/6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-white">{reserva.nombre ?? "Sin nombre"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            {reserva.telefono ? (
              <a className="inline-flex items-center gap-1.5 hover:text-emerald-300" href={`tel:${reserva.telefono}`}>
                <Phone className="h-3.5 w-3.5" />
                {reserva.telefono}
              </a>
            ) : null}
            {reserva.email ? (
              <a className="inline-flex items-center gap-1.5 break-all hover:text-emerald-300" href={`mailto:${reserva.email}`}>
                <Mail className="h-3.5 w-3.5" />
                {reserva.email}
              </a>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-sky-200">{formatoFechaHora(reserva.inicio)}</div>
          <div className="text-xs text-slate-400">hasta {formatoHora(reserva.fin)}</div>
          {reserva.tipoEvento ? <div className="mt-0.5 text-xs text-slate-400">{reserva.tipoEvento}</div> : null}
        </div>
      </div>

      {reserva.motivo ? <p className="text-sm leading-6 text-slate-300">“{reserva.motivo}”</p> : null}
      {reserva.notas ? (
        <p className="text-sm leading-6 text-slate-400">
          <span className="font-semibold text-slate-300">Antes de iniciar: </span>
          {reserva.notas}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {reserva.consentimiento ? (
          <span className="border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
            Aceptó el consentimiento
          </span>
        ) : null}
        {coincidencia ? (
          <span className="border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
            Parece ser {coincidencia.paciente.nombre} (mismo {coincidencia.por})
          </span>
        ) : (
          <span className="border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
            No coincide con ningún paciente
          </span>
        )}
      </div>

      {modo?.tipo === "otro" ? (
        <div className="grid gap-2 border border-white/10 bg-slate-950/60 p-3">
          <input
            className="field"
            onChange={(event) => setModo({ ...modo, busqueda: event.target.value })}
            placeholder="Buscar paciente..."
            value={modo.busqueda}
          />
          <select className="field" onChange={(event) => setModo({ ...modo, pacienteId: event.target.value })} value={modo.pacienteId}>
            <option value="">Selecciona...</option>
            {opciones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap justify-end gap-2">
            <button className={BTN_GHOST} onClick={() => setModo(null)} type="button">
              Cancelar
            </button>
            <button
              className={BTN_ACCENT}
              disabled={saving || !modo.pacienteId}
              onClick={() => void ejecutar({ id: reserva.id, accion: "vincular", pacienteId: modo.pacienteId })}
              type="button"
            >
              <Link2 className="h-4 w-4" />
              {saving ? "Guardando..." : "Vincular y agendar"}
            </button>
          </div>
        </div>
      ) : null}

      {modo?.tipo === "crear" ? (
        <div className="grid gap-2 border border-white/10 bg-slate-950/60 p-3 sm:grid-cols-3">
          <input className="field" onChange={(e) => setModo({ ...modo, nombre: e.target.value })} placeholder="Nombre" value={modo.nombre} />
          <input className="field" onChange={(e) => setModo({ ...modo, telefono: e.target.value })} placeholder="Teléfono" value={modo.telefono} />
          <input className="field" onChange={(e) => setModo({ ...modo, email: e.target.value })} placeholder="Correo (opcional)" value={modo.email} />
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-3">
            <button className={BTN_GHOST} onClick={() => setModo(null)} type="button">
              Cancelar
            </button>
            <button
              className={BTN_ACCENT}
              disabled={saving || !modo.nombre.trim() || !modo.telefono.trim()}
              onClick={() =>
                void ejecutar({
                  id: reserva.id,
                  accion: "crear",
                  datos: { nombre: modo.nombre, telefono: modo.telefono, email: modo.email },
                })
              }
              type="button"
            >
              <UserRoundPlus className="h-4 w-4" />
              {saving ? "Creando..." : "Crear paciente y agendar"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      {modo === null ? (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="inline-flex items-center gap-1.5 border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:border-white/30 disabled:opacity-60"
            disabled={saving}
            onClick={() => void ejecutar({ id: reserva.id, accion: "ignorar" })}
            type="button"
          >
            <X className="h-4 w-4" />
            Ignorar
          </button>
          <button className={BTN_GHOST} onClick={() => setModo({ tipo: "otro", busqueda: "", pacienteId: "" })} type="button">
            <Link2 className="h-4 w-4" />
            {coincidencia ? "Es otro paciente" : "Vincular a paciente"}
          </button>
          <button
            className={BTN_GHOST}
            onClick={() =>
              setModo({ tipo: "crear", nombre: reserva.nombre ?? "", telefono: reserva.telefono ?? "", email: reserva.email ?? "" })
            }
            type="button"
          >
            <UserRoundPlus className="h-4 w-4" />
            Crear paciente
          </button>
          {coincidencia ? (
            <button
              className={BTN_ACCENT}
              disabled={saving}
              onClick={() => void ejecutar({ id: reserva.id, accion: "vincular", pacienteId: coincidencia.paciente.id })}
              type="button"
            >
              <Check className="h-4 w-4" />
              {saving ? "Guardando..." : `Es ${coincidencia.paciente.nombre.split(" ")[0]}: agendar`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Reservas hechas en Calendly (u otro sistema) que llegaron a Google
 * Calendar. Se resuelven aqui o desde Telegram, lo que ocurra primero.
 */
export function ReservasGoogleSection({ onCambio, pacientes }: { onCambio: () => void; pacientes: PacienteRow[] }) {
  const [reservas, setReservas] = useState<ReservaGoogle[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data, error: err } = await fetchReservasPendientes();
    setLoading(false);
    setError(err ?? "");
    setReservas(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const buscarAhora = async () => {
    setBuscando(true);
    setAviso("");
    setError("");
    const { data, error: err } = await buscarReservasAhora();
    setBuscando(false);
    if (err) {
      setError(err);
      return;
    }
    setAviso(data?.nuevas ? `Se encontraron ${data.nuevas} reserva(s) nueva(s).` : "No hay reservas nuevas en Google Calendar.");
    await cargar();
    onCambio();
  };

  return (
    <SectionCard
      action={
        <button className={BTN_GHOST} disabled={buscando} onClick={() => void buscarAhora()} type="button">
          <RefreshCw className={`h-4 w-4 ${buscando ? "animate-spin" : ""}`} />
          {buscando ? "Buscando..." : "Buscar ahora"}
        </button>
      }
      title={`Reservas de Calendly por revisar (${reservas.length})`}
    >
      {error ? <div className="mb-3 border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      {aviso ? <div className="mb-3 border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{aviso}</div> : null}
      {loading ? (
        <EmptyState>Cargando reservas...</EmptyState>
      ) : reservas.length === 0 ? (
        <EmptyState>
          <span className="inline-flex items-center gap-2">
            <CalendarSearch className="h-4 w-4" />
            No hay reservas por revisar. Se buscan solas cada 10 minutos en tu Google Calendar.
          </span>
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {reservas.map((reserva) => (
            <ReservaCard
              key={reserva.id}
              onResuelta={(mensaje) => {
                setAviso(mensaje);
                setReservas((actuales) => actuales.filter((r) => r.id !== reserva.id));
                onCambio();
              }}
              pacientes={pacientes}
              reserva={reserva}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
