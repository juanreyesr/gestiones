"use client";

import { CalendarDays, Clock, FileDown, ListChecks, MapPin, Pencil, Trash2, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { formatoCompleto, formatoHora } from "@/lib/iglesia/fechas";
import { fetchParticipantes } from "@/lib/iglesia/eventos";
import { insertItems } from "@/lib/iglesia/items";
import { fetchGrupos, fetchTableros } from "@/lib/iglesia/tableros";
import {
  estadoEventoInfo,
  rolLabel,
  tipoEventoInfo,
  type EventoRow,
  type ParticipanteRow,
  type TableroRow,
} from "@/lib/iglesia/types";
import { descargarEventoWord } from "@/lib/iglesia/word";
import { Avatar, BTN_GHOST, BTN_PRIMARY, ErrorBanner, Modal, Pastilla } from "../ui";

export function EventoDetalle({
  encabezado,
  evento,
  onCerrar,
  onEditar,
  onEliminar,
}: {
  encabezado: string;
  evento: EventoRow;
  onCerrar: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const [participantes, setParticipantes] = useState<ParticipanteRow[]>([]);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(false);
  const [pendientesAbierto, setPendientesAbierto] = useState(false);

  const info = tipoEventoInfo(evento.tipo);
  const estado = estadoEventoInfo(evento.estado);

  const cargar = useCallback(async () => {
    const { data, error: fetchError } = await fetchParticipantes(evento.id);
    setParticipantes(data);
    setError(fetchError ?? "");
  }, [evento.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga los participantes del evento abierto
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const alTeclear = (tecla: KeyboardEvent) => {
      if (tecla.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarEventoWord({ encabezado, evento, participantes });
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo generar el documento.");
    }
    setDescargando(false);
  };

  return (
    <>
      <ModalPortal>
        <div className="print-hidden fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onCerrar}>
          <aside
            className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-slate-950"
            onClick={(evt) => evt.stopPropagation()}
          >
            <header className="border-b border-white/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{info.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: info.color }}>
                    {info.label}
                  </p>
                  <h3 className="truncate text-lg font-semibold text-white">{evento.titulo}</h3>
                </div>
                <Pastilla color={estado.color} texto={estado.texto} titulo={estado.label} />
                <button className="text-slate-400 transition hover:text-white" onClick={onCerrar} type="button">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button className={BTN_PRIMARY} disabled={descargando} onClick={() => void descargar()} type="button">
                  <FileDown className="h-4 w-4" />
                  {descargando ? "Generando..." : "Descargar Word"}
                </button>
                <button className={BTN_GHOST} onClick={onEditar} type="button">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button className={BTN_GHOST} onClick={() => setPendientesAbierto(true)} type="button">
                  <ListChecks className="h-4 w-4" />
                  Generar pendientes
                </button>
                <button
                  className="inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300"
                  onClick={onEliminar}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              <ErrorBanner message={error} />

              <div className="grid gap-2 text-sm text-slate-200">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  {formatoCompleto(evento.fecha)}
                </p>
                {evento.hora ? (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    {formatoHora(evento.hora)}
                  </p>
                ) : null}
                {evento.lugar || evento.direccion ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    {[evento.lugar, evento.direccion].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {evento.oficiante ? (
                  <p className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-500" />
                    Oficia: {evento.oficiante}
                  </p>
                ) : null}
                {evento.asistentes_estimados ? (
                  <p className="text-slate-400">Asistentes estimados: {evento.asistentes_estimados}</p>
                ) : null}
              </div>

              {participantes.length ? (
                <section className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Participantes</h4>
                  <div className="grid gap-1.5">
                    {participantes.map((participante) => (
                      <div className="flex items-center gap-2 border border-white/8 bg-white/4 p-2" key={participante.id}>
                        <Avatar nombre={participante.nombre} size={26} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-100">{participante.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {rolLabel(participante.rol)}
                            {participante.documento ? ` · ${participante.documento}` : ""}
                            {participante.telefono ? ` · ${participante.telefono}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {evento.programa ? (
                <section className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Programa</h4>
                  <ol className="grid gap-1 text-sm text-slate-200">
                    {evento.programa
                      .split("\n")
                      .filter((linea) => linea.trim())
                      .map((linea, indice) => (
                        <li className="flex gap-2" key={`${indice}-${linea}`}>
                          <span className="text-slate-600">{indice + 1}.</span>
                          {linea.trim()}
                        </li>
                      ))}
                  </ol>
                </section>
              ) : null}

              {evento.contacto_nombre || evento.contacto_telefono || evento.contacto_correo ? (
                <section className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Contacto</h4>
                  <p className="text-sm text-slate-200">
                    {[evento.contacto_nombre, evento.contacto_telefono, evento.contacto_correo]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </section>
              ) : null}

              {evento.notas ? (
                <section className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Notas</h4>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{evento.notas}</p>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      </ModalPortal>

      {pendientesAbierto ? (
        <GenerarPendientes evento={evento} onCerrar={() => setPendientesAbierto(false)} />
      ) : null}
    </>
  );
}

/**
 * Vuelca la lista de preparativos del tipo de evento como pendientes reales en
 * un tablero, con la fecha del evento como limite. Es el puente entre los dos
 * recursos del area: el evento deja de ser una ficha y pasa a ser trabajo
 * planificado.
 */
function GenerarPendientes({ evento, onCerrar }: { evento: EventoRow; onCerrar: () => void }) {
  const [tableros, setTableros] = useState<TableroRow[]>([]);
  const [tableroId, setTableroId] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>(tipoEventoInfo(evento.tipo).pendientes);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error: fetchError } = await fetchTableros();
    const activos = data.filter((tablero) => !tablero.archivado);
    setTableros(activos);
    setTableroId(activos[0]?.id ?? "");
    setError(fetchError ?? "");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga los tableros disponibles al abrir el diálogo
    void cargar();
  }, [cargar]);

  const generar = async () => {
    if (!tableroId || !seleccion.length) return;
    setGuardando(true);

    const { data: grupos, error: gruposError } = await fetchGrupos(tableroId);
    if (gruposError || !grupos.length) {
      setGuardando(false);
      setError(gruposError ?? "El tablero no tiene grupos. Crea uno antes de generar pendientes.");
      return;
    }

    const grupo = grupos[0];
    const { error: insertError } = await insertItems(
      seleccion.map((titulo, indice) => ({
        tablero_id: tableroId,
        grupo_id: grupo.id,
        titulo: `${titulo} — ${evento.titulo}`,
        orden: indice,
        evento_id: evento.id,
      })),
    );

    setGuardando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    setListo(true);
  };

  return (
    <Modal ancho="max-w-lg" onClose={onCerrar} titulo="Generar pendientes del evento">
      <div className="grid gap-4">
        <ErrorBanner message={error} />

        {listo ? (
          <>
            <p className="text-sm text-emerald-200">
              Se crearon {seleccion.length} pendientes en el tablero seleccionado, con enlace a este evento.
            </p>
            <button className={BTN_PRIMARY} onClick={onCerrar} type="button">
              Cerrar
            </button>
          </>
        ) : (
          <>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Tablero destino</span>
              <select
                className="w-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/60"
                onChange={(evt) => setTableroId(evt.target.value)}
                value={tableroId}
              >
                {tableros.length ? null : <option value="">No hay tableros disponibles</option>}
                {tableros.map((tablero) => (
                  <option key={tablero.id} value={tablero.id}>
                    {tablero.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Pendientes por crear</p>
              <div className="grid gap-1">
                {tipoEventoInfo(evento.tipo).pendientes.map((pendiente) => (
                  <label className="flex items-center gap-2 text-sm text-slate-200" key={pendiente}>
                    <input
                      checked={seleccion.includes(pendiente)}
                      className="h-3.5 w-3.5 accent-emerald-400"
                      onChange={(evt) =>
                        setSeleccion((previos) =>
                          evt.target.checked
                            ? [...previos, pendiente]
                            : previos.filter((valor) => valor !== pendiente),
                        )
                      }
                      type="checkbox"
                    />
                    {pendiente}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className={BTN_GHOST} onClick={onCerrar} type="button">
                Cancelar
              </button>
              <button
                className={BTN_PRIMARY}
                disabled={guardando || !tableroId || !seleccion.length}
                onClick={() => void generar()}
                type="button"
              >
                {guardando ? "Creando..." : `Crear ${seleccion.length} pendientes`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
