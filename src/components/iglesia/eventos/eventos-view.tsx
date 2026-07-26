"use client";

import { CalendarHeart, Plus, Search, Settings2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteEvento, fetchEventos, fetchParticipantesDeEventos } from "@/lib/iglesia/eventos";
import { formatoLargo, hoyISO } from "@/lib/fechas";
import {
  ESTADOS_EVENTO,
  TIPOS_EVENTO,
  estadoEventoInfo,
  rolLabel,
  tipoEventoInfo,
  type EstadoEvento,
  type EventoRow,
  type ParticipanteRow,
  type TipoEvento,
} from "@/lib/iglesia/types";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT, Modal, Pastilla } from "@/components/ui-comun";
import { EventoDetalle } from "./evento-detalle";
import { EventoForm } from "./evento-form";

const CLAVE_ENCABEZADO = "gestionesjj.iglesia.encabezado";

export function EventosView() {
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [participantes, setParticipantes] = useState<Record<string, ParticipanteRow[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoEvento | "">("");
  const [filtroAnio, setFiltroAnio] = useState("");

  const [formulario, setFormulario] = useState<EventoRow | "nuevo" | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<EventoRow | null>(null);
  const [encabezado, setEncabezado] = useState("");
  const [encabezadoAbierto, setEncabezadoAbierto] = useState(false);

  useEffect(() => {
    // El encabezado de los documentos es una preferencia local del equipo, no
    // un dato del ministerio: vive en localStorage y no en la base.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee la preferencia guardada al montar
    setEncabezado(window.localStorage.getItem(CLAVE_ENCABEZADO) ?? "");
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: fetchError } = await fetchEventos();
    setEventos(data);
    setError(fetchError ?? "");
    const { data: porEvento } = await fetchParticipantesDeEventos(data.map((evento) => evento.id));
    setParticipantes(porEvento);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de eventos
    void cargar();
  }, [cargar]);

  const anios = useMemo(
    () => [...new Set(eventos.map((evento) => evento.fecha.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [eventos],
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return eventos.filter((evento) => {
      if (filtroTipo && evento.tipo !== filtroTipo) return false;
      if (filtroEstado && evento.estado !== filtroEstado) return false;
      if (filtroAnio && !evento.fecha.startsWith(filtroAnio)) return false;
      if (!texto) return true;
      const nombres = (participantes[evento.id] ?? []).map((persona) => persona.nombre).join(" ");
      return [evento.titulo, evento.lugar ?? "", evento.oficiante ?? "", evento.notas ?? "", nombres]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [busqueda, eventos, filtroAnio, filtroEstado, filtroTipo, participantes]);

  const hoy = hoyISO();
  const proximos = filtrados.filter((evento) => evento.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasados = filtrados.filter((evento) => evento.fecha < hoy);

  const eventoDetalle = detalle ? eventos.find((evento) => evento.id === detalle) : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarHeart className="h-5 w-5 text-emerald-200" />
          Bodas, cumpleaños y eventos
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <button className={BTN_GHOST} onClick={() => setEncabezadoAbierto(true)} type="button">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Encabezado</span>
          </button>
          <button className={BTN_PRIMARY} onClick={() => setFormulario("nuevo")} type="button">
            <Plus className="h-4 w-4" />
            Nuevo evento
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Registra cada celebración con sus participantes y su programa. Desde el detalle puedes descargar la constancia
        o el programa en Word y convertir los preparativos en pendientes de un tablero.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 border border-white/10 bg-white/8 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:w-56"
            onChange={(evt) => setBusqueda(evt.target.value)}
            placeholder="Buscar por nombre, lugar o nota"
            value={busqueda}
          />
          {busqueda ? (
            <button className="text-slate-500 hover:text-white" onClick={() => setBusqueda("")} type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <select
          className="border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/60"
          onChange={(evt) => setFiltroTipo(evt.target.value as TipoEvento | "")}
          value={filtroTipo}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_EVENTO.map((tipo) => (
            <option key={tipo.valor} value={tipo.valor}>
              {tipo.emoji} {tipo.label}
            </option>
          ))}
        </select>

        <select
          className="border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/60"
          onChange={(evt) => setFiltroEstado(evt.target.value as EstadoEvento | "")}
          value={filtroEstado}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_EVENTO.map((estado) => (
            <option key={estado.valor} value={estado.valor}>
              {estado.label}
            </option>
          ))}
        </select>

        {anios.length > 1 ? (
          <select
            className="border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/60"
            onChange={(evt) => setFiltroAnio(evt.target.value)}
            value={filtroAnio}
          >
            <option value="">Todos los años</option>
            {anios.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {cargando ? (
        <p className="text-sm text-slate-300">Cargando eventos...</p>
      ) : filtrados.length ? (
        <div className="grid gap-5">
          <Seccion
            eventos={proximos}
            onAbrir={setDetalle}
            participantes={participantes}
            titulo={`Próximos (${proximos.length})`}
          />
          <Seccion
            eventos={pasados}
            onAbrir={setDetalle}
            participantes={participantes}
            titulo={`Realizados y anteriores (${pasados.length})`}
          />
        </div>
      ) : (
        <EmptyState>
          No hay eventos que coincidan. Crea el primero: una boda, un cumpleaños, un bautizo o cualquier celebración
          del ministerio.
        </EmptyState>
      )}

      {formulario ? (
        <EventoForm
          evento={formulario === "nuevo" ? null : formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={async () => {
            setFormulario(null);
            await cargar();
          }}
        />
      ) : null}

      {eventoDetalle ? (
        <EventoDetalle
          encabezado={encabezado}
          evento={eventoDetalle}
          onCerrar={() => setDetalle(null)}
          onEditar={() => {
            setDetalle(null);
            setFormulario(eventoDetalle);
          }}
          onEliminar={() => {
            setDetalle(null);
            setAEliminar(eventoDetalle);
          }}
        />
      ) : null}

      {encabezadoAbierto ? (
        <Modal ancho="max-w-md" onClose={() => setEncabezadoAbierto(false)} titulo="Encabezado de los documentos">
          <div className="grid gap-4">
            <Field label="Nombre de la iglesia o ministerio">
              <input
                autoFocus
                className={INPUT}
                onChange={(evt) => setEncabezado(evt.target.value)}
                placeholder="Ej. Iglesia Evangélica El Buen Pastor"
                value={encabezado}
              />
            </Field>
            <p className="text-xs text-slate-500">
              Aparece centrado arriba de cada constancia o programa que descargues en Word. Se guarda en este
              dispositivo.
            </p>
            <div className="flex justify-end gap-2">
              <button className={BTN_GHOST} onClick={() => setEncabezadoAbierto(false)} type="button">
                Cancelar
              </button>
              <button
                className={BTN_PRIMARY}
                onClick={() => {
                  window.localStorage.setItem(CLAVE_ENCABEZADO, encabezado.trim());
                  setEncabezadoAbierto(false);
                }}
                type="button"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        message={`Se eliminará "${aEliminar?.titulo ?? ""}" con sus participantes. Los pendientes que se hayan generado no se borran.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={async () => {
          if (!aEliminar) return;
          const { error: deleteError } = await deleteEvento(aEliminar.id);
          setAEliminar(null);
          if (deleteError) setError(deleteError);
          await cargar();
        }}
        open={Boolean(aEliminar)}
        title="Eliminar evento"
      />
    </div>
  );
}

function Seccion({
  eventos,
  onAbrir,
  participantes,
  titulo,
}: {
  eventos: EventoRow[];
  onAbrir: (id: string) => void;
  participantes: Record<string, ParticipanteRow[]>;
  titulo: string;
}) {
  if (!eventos.length) return null;

  return (
    <section>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</h4>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {eventos.map((evento) => {
          const info = tipoEventoInfo(evento.tipo);
          const estado = estadoEventoInfo(evento.estado);
          const gente = participantes[evento.id] ?? [];

          return (
            <article
              className="cursor-pointer border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12"
              key={evento.id}
              onClick={() => onAbrir(evento.id)}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{info.emoji}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: info.color }}>
                    {info.label}
                  </span>
                </span>
                <Pastilla color={estado.color} texto={estado.texto} titulo={estado.label} />
              </div>

              <h5 className="text-base font-semibold text-white">{evento.titulo}</h5>
              <p className="mt-1 text-sm text-slate-400">{formatoLargo(evento.fecha)}</p>
              {evento.lugar ? <p className="text-xs text-slate-500">{evento.lugar}</p> : null}

              {gente.length ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5 text-slate-600" />
                  {gente
                    .slice(0, 2)
                    .map((persona) => `${persona.nombre} (${rolLabel(persona.rol)})`)
                    .join(", ")}
                  {gente.length > 2 ? ` +${gente.length - 2}` : ""}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
