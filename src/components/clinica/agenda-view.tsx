"use client";

import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ListTodo,
  Pencil,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cambiarEstadoCita, eliminarCita, fetchCitas } from "@/lib/clinica/citas";
import { buildGoogleTemplateLink, fetchGoogleBusy, syncCitaConGoogle, type BusyBlock } from "@/lib/clinica/google-client";
import { agregarDias, claveDiaLocal, formatoFechaHora, formatoHora, inicioDeSemana } from "@/lib/clinica/slots";
import type { CitaEstado, CitaRow, PacienteRow } from "@/lib/clinica/types";
import { ConfirmDialog } from "../confirm-dialog";
import { ModalPortal } from "../modal-portal";
import { CitaForm } from "./cita-form";
import { BTN_GHOST, BTN_PRIMARY, CITA_BADGES, CitaBadge, EmptyState } from "./ui";

const HORA_INICIO = 7;
const HORA_FIN = 21;
const ALTO_HORA = 52; // px por hora

const DIA_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function CitaDetalleModal({
  cita,
  googleConectado,
  onCambiarEstado,
  onCerrar,
  onEditar,
  onEliminar,
}: {
  cita: CitaRow;
  googleConectado: boolean;
  onCambiarEstado: (estado: CitaEstado) => void;
  onCerrar: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const nombre = cita.pacienteNombre ?? cita.contactoNombre ?? "Sin nombre";
  const activa = cita.estado === "pendiente" || cita.estado === "confirmada";

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCerrar}>
        <div
          className="w-full max-w-md border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{nombre}</h3>
              <p className="mt-1 text-sm text-slate-300">{formatoFechaHora(cita.inicio)} – {formatoHora(cita.fin)}</p>
            </div>
            <CitaBadge estado={cita.estado} />
          </div>

          <div className="grid gap-2 text-sm text-slate-300">
            {cita.modalidad ? <div>Modalidad: {cita.modalidad === "virtual" ? "Virtual" : "Presencial"}</div> : null}
            {cita.contactoTelefono ? <div>Teléfono: {cita.contactoTelefono}</div> : null}
            {cita.motivo ? <div>Motivo: {cita.motivo}</div> : null}
            {cita.notas ? <div className="text-slate-400">{cita.notas}</div> : null}
            {cita.origen === "publica" ? (
              <div className="text-xs text-sky-300">Agendada desde el enlace público</div>
            ) : null}
            {cita.gcalSyncStatus === "sincronizada" ? (
              <div className="text-xs text-emerald-300">Sincronizada con Google Calendar</div>
            ) : cita.gcalSyncStatus === "error" ? (
              <div className="text-xs text-amber-300">No se pudo sincronizar con Google Calendar</div>
            ) : null}
          </div>

          {activa ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {cita.estado === "pendiente" ? (
                <button
                  className="inline-flex items-center gap-1.5 border border-emerald-300/50 bg-emerald-300/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/20"
                  onClick={() => onCambiarEstado("confirmada")}
                  type="button"
                >
                  <Check className="h-4 w-4" />
                  Confirmar
                </button>
              ) : null}
              <button
                className="inline-flex items-center gap-1.5 border border-sky-300/50 bg-sky-300/10 px-3 py-1.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-300/20"
                onClick={() => onCambiarEstado("completada")}
                type="button"
              >
                <Check className="h-4 w-4" />
                Completada
              </button>
              <button
                className="inline-flex items-center gap-1.5 border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/20"
                onClick={() => onCambiarEstado("no_asistio")}
                type="button"
              >
                No asistió
              </button>
              <button
                className="inline-flex items-center gap-1.5 border border-white/15 bg-white/8 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:border-white/30"
                onClick={() => onCambiarEstado("cancelada")}
                type="button"
              >
                Cancelar cita
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
            <div className="flex gap-2">
              <button className={BTN_GHOST} onClick={onEditar} type="button">
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                className="inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300"
                onClick={onEliminar}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
            {!googleConectado ? (
              <a
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 transition hover:text-sky-200"
                href={buildGoogleTemplateLink(cita)}
                rel="noreferrer"
                target="_blank"
              >
                Añadir a Google Calendar
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function AgendaView({ pacientes }: { pacientes: PacienteRow[] }) {
  const [semanaInicio, setSemanaInicio] = useState(() => inicioDeSemana(new Date()));
  const [citas, setCitas] = useState<CitaRow[]>([]);
  const [busy, setBusy] = useState<BusyBlock[]>([]);
  const [googleConectado, setGoogleConectado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vista, setVista] = useState<"semana" | "lista">("semana");
  const [detalle, setDetalle] = useState<CitaRow | null>(null);
  const [editando, setEditando] = useState<CitaRow | null>(null);
  const [creandoInicio, setCreandoInicio] = useState<Date | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<CitaRow | null>(null);
  const [borrando, setBorrando] = useState(false);

  const semanaFin = useMemo(() => agregarDias(semanaInicio, 7), [semanaInicio]);

  const cargar = useCallback(async () => {
    setLoading(true);
    const desde = semanaInicio.toISOString();
    const hasta = semanaFin.toISOString();
    const [citasRes, busyRes] = await Promise.all([fetchCitas(desde, hasta), fetchGoogleBusy(desde, hasta)]);
    setLoading(false);
    if (citasRes.error) {
      setError(citasRes.error);
      return;
    }
    setError("");
    setCitas(citasRes.data);
    setBusy(busyRes.busy);
    setGoogleConectado(busyRes.conectado);
  }, [semanaInicio, semanaFin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, index) => agregarDias(semanaInicio, index)),
    [semanaInicio]
  );

  const citasPorDia = useMemo(() => {
    const map = new Map<string, CitaRow[]>();
    for (const cita of citas) {
      const clave = claveDiaLocal(new Date(cita.inicio));
      const lista = map.get(clave) ?? [];
      lista.push(cita);
      map.set(clave, lista);
    }
    return map;
  }, [citas]);

  const busyPorDia = useMemo(() => {
    const map = new Map<string, BusyBlock[]>();
    for (const block of busy) {
      const clave = claveDiaLocal(new Date(block.inicio));
      const lista = map.get(clave) ?? [];
      lista.push(block);
      map.set(clave, lista);
    }
    return map;
  }, [busy]);

  const posicion = (inicioIso: string, finIso: string) => {
    const inicio = new Date(inicioIso);
    const fin = new Date(finIso);
    const horaInicio = inicio.getHours() + inicio.getMinutes() / 60;
    const horaFin = fin.getHours() + fin.getMinutes() / 60;
    const top = Math.max(0, (horaInicio - HORA_INICIO) * ALTO_HORA);
    const height = Math.max(18, (Math.min(horaFin, HORA_FIN) - Math.max(horaInicio, HORA_INICIO)) * ALTO_HORA);
    return { top, height };
  };

  const handleCambiarEstado = async (cita: CitaRow, estado: CitaEstado) => {
    const { error: err } = await cambiarEstadoCita(cita.id, estado);
    if (err) {
      setError(err);
      return;
    }
    if (estado === "cancelada") {
      void syncCitaConGoogle(cita.id, "delete");
    } else {
      void syncCitaConGoogle(cita.id, "update");
    }
    setDetalle(null);
    void cargar();
  };

  const handleEliminar = async () => {
    if (!eliminando) return;
    setBorrando(true);
    const gcalId = eliminando.gcalEventId;
    const citaId = eliminando.id;
    // Primero quitamos el evento de Google (necesita que la cita aún exista en BD).
    if (gcalId) {
      await syncCitaConGoogle(citaId, "delete");
    }
    const { error: err } = await eliminarCita(citaId);
    setBorrando(false);
    setEliminando(null);
    setDetalle(null);
    if (err) {
      setError(err);
      return;
    }
    void cargar();
  };

  const hoyClave = claveDiaLocal(new Date());
  const proximas = useMemo(
    () =>
      [...citas]
        .filter((cita) => cita.estado === "pendiente" || cita.estado === "confirmada")
        .sort((a, b) => (a.inicio < b.inicio ? -1 : 1)),
    [citas]
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button aria-label="Semana anterior" className={BTN_GHOST} onClick={() => setSemanaInicio(agregarDias(semanaInicio, -7))} type="button">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className={BTN_GHOST} onClick={() => setSemanaInicio(inicioDeSemana(new Date()))} type="button">
            Hoy
          </button>
          <button aria-label="Semana siguiente" className={BTN_GHOST} onClick={() => setSemanaInicio(agregarDias(semanaInicio, 7))} type="button">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-slate-200">
            {new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "long", year: "numeric" }).format(semanaInicio)} —{" "}
            {new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "long" }).format(agregarDias(semanaInicio, 6))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-white/10">
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${vista === "semana" ? "bg-emerald-300/14 text-white" : "text-slate-400 hover:text-slate-200"}`}
              onClick={() => setVista("semana")}
              type="button"
            >
              <CalendarDays className="h-4 w-4" />
              Semana
            </button>
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${vista === "lista" ? "bg-emerald-300/14 text-white" : "text-slate-400 hover:text-slate-200"}`}
              onClick={() => setVista("lista")}
              type="button"
            >
              <ListTodo className="h-4 w-4" />
              Lista
            </button>
          </div>
          <button
            className={BTN_PRIMARY}
            onClick={() => {
              setEditando(null);
              setCreandoInicio(null);
              setFormAbierto(true);
            }}
            type="button"
          >
            <CalendarPlus className="h-4 w-4" />
            Nueva cita
          </button>
        </div>
      </div>

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      {googleConectado ? (
        <p className="text-xs text-slate-500">
          Las franjas rayadas son eventos ocupados de tu Google Calendar.
        </p>
      ) : null}

      {vista === "lista" ? (
        proximas.length === 0 && !loading ? (
          <EmptyState>No hay citas activas esta semana.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {proximas.map((cita) => (
              <button
                key={cita.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-4 text-left transition hover:border-emerald-300/50"
                onClick={() => setDetalle(cita)}
                type="button"
              >
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {cita.pacienteNombre ?? cita.contactoNombre ?? "Sin nombre"}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-400">
                    {formatoFechaHora(cita.inicio)} – {formatoHora(cita.fin)}
                  </span>
                </span>
                <CitaBadge estado={cita.estado} />
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto border border-white/10 bg-white/4">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/10">
              <div />
              {dias.map((dia, index) => {
                const esHoy = claveDiaLocal(dia) === hoyClave;
                return (
                  <div key={index} className={`border-l border-white/10 p-2 text-center ${esHoy ? "bg-emerald-300/8" : ""}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{DIA_LABELS[index]}</div>
                    <div className={`text-lg font-semibold ${esHoy ? "text-emerald-300" : "text-white"}`}>{dia.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              <div className="relative" style={{ height: (HORA_FIN - HORA_INICIO) * ALTO_HORA }}>
                {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, index) => (
                  <div
                    key={index}
                    className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-500"
                    style={{ top: index * ALTO_HORA }}
                  >
                    {index + HORA_INICIO}:00
                  </div>
                ))}
              </div>
              {dias.map((dia, index) => {
                const clave = claveDiaLocal(dia);
                const citasDia = citasPorDia.get(clave) ?? [];
                const busyDia = busyPorDia.get(clave) ?? [];
                const esHoy = clave === hoyClave;
                return (
                  <div
                    key={index}
                    className={`relative border-l border-white/10 ${esHoy ? "bg-emerald-300/4" : ""}`}
                    style={{ height: (HORA_FIN - HORA_INICIO) * ALTO_HORA }}
                  >
                    {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, hora) => (
                      <button
                        key={hora}
                        aria-label={`Crear cita ${DIA_LABELS[index]} ${hora + HORA_INICIO}:00`}
                        className="absolute inset-x-0 border-t border-white/5 transition hover:bg-white/6"
                        onClick={() => {
                          const inicio = new Date(dia);
                          inicio.setHours(hora + HORA_INICIO, 0, 0, 0);
                          setEditando(null);
                          setCreandoInicio(inicio);
                          setFormAbierto(true);
                        }}
                        style={{ top: hora * ALTO_HORA, height: ALTO_HORA }}
                        type="button"
                      />
                    ))}
                    {busyDia.map((block, blockIndex) => {
                      const { top, height } = posicion(block.inicio, block.fin);
                      return (
                        <div
                          key={`busy-${blockIndex}`}
                          className="pointer-events-none absolute inset-x-0.5 border border-slate-500/30 bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgb(148_163_184/0.16)_4px,rgb(148_163_184/0.16)_8px)]"
                          style={{ top, height }}
                        />
                      );
                    })}
                    {citasDia.map((cita) => {
                      const { top, height } = posicion(cita.inicio, cita.fin);
                      const badge = CITA_BADGES[cita.estado];
                      const cancelada = cita.estado === "cancelada" || cita.estado === "no_asistio";
                      return (
                        <button
                          key={cita.id}
                          className={`absolute inset-x-0.5 overflow-hidden border p-1 text-left transition hover:z-10 hover:brightness-125 ${badge.className} ${cancelada ? "opacity-50" : ""}`}
                          onClick={() => setDetalle(cita)}
                          style={{ top, height }}
                          type="button"
                        >
                          <span className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${badge.dot}`} />
                            <span className="truncate text-[11px] font-semibold">
                              {cita.pacienteNombre ?? cita.contactoNombre ?? "Cita"}
                            </span>
                          </span>
                          <span className="block truncate text-[10px] opacity-80">{formatoHora(cita.inicio)}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {detalle ? (
        <CitaDetalleModal
          cita={detalle}
          googleConectado={googleConectado}
          onCambiarEstado={(estado) => void handleCambiarEstado(detalle, estado)}
          onCerrar={() => setDetalle(null)}
          onEditar={() => {
            setEditando(detalle);
            setDetalle(null);
            setFormAbierto(true);
          }}
          onEliminar={() => setEliminando(detalle)}
        />
      ) : null}

      {formAbierto ? (
        <CitaForm
          cita={editando}
          citasExistentes={citas}
          inicioSugerido={creandoInicio}
          onClose={() => setFormAbierto(false)}
          onSaved={() => {
            setFormAbierto(false);
            void cargar();
          }}
          pacientes={pacientes}
        />
      ) : null}

      <ConfirmDialog
        busy={borrando}
        message="Se eliminará la cita definitivamente (también de Google Calendar si está sincronizada)."
        onCancel={() => setEliminando(null)}
        onConfirm={handleEliminar}
        open={Boolean(eliminando)}
        title="Eliminar cita"
      />
    </div>
  );
}
