"use client";

import { MessageSquare, Plus, Send, Tag, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fechaHoraLegible } from "@/lib/iglesia/fechas";
import {
  deleteActualizacion,
  fetchActualizaciones,
  insertActualizacion,
} from "@/lib/iglesia/items";
import { ESTADOS, PRIORIDADES, type ActualizacionRow, type GrupoRow, type ItemRow } from "@/lib/iglesia/types";
import { BTN_GHOST, ErrorBanner, Field, INPUT } from "../ui";
import { CeldaResponsable, SelectorPastilla } from "./celdas";
import type { AccionesTablero } from "./tipos";

/**
 * Panel lateral de un pendiente, equivalente al panel de item de Monday:
 * arriba los datos de las columnas, abajo las subtareas y el hilo de
 * actualizaciones (la bitacora de lo que se ha ido haciendo).
 */
export function ItemPanel({
  acciones,
  grupos,
  item,
  onCerrar,
  onCambioActualizaciones,
}: {
  acciones: AccionesTablero;
  grupos: GrupoRow[];
  item: ItemRow;
  onCerrar: () => void;
  onCambioActualizaciones: () => void;
}) {
  const [pestana, setPestana] = useState<"detalle" | "actualizaciones">("detalle");
  const [actualizaciones, setActualizaciones] = useState<ActualizacionRow[]>([]);
  const [comentario, setComentario] = useState("");
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [nuevoSub, setNuevoSub] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const subitems = acciones.subitemsDe(item.id);

  const cargar = useCallback(async () => {
    const { data, error: fetchError } = await fetchActualizaciones(item.id);
    setActualizaciones(data);
    setError(fetchError ?? "");
  }, [item.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga el hilo del pendiente abierto
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const enviarComentario = async () => {
    const limpio = comentario.trim();
    if (!limpio) return;
    setEnviando(true);
    const { error: insertError } = await insertActualizacion(item.id, limpio);
    setEnviando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    setComentario("");
    await cargar();
    onCambioActualizaciones();
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onCerrar}>
        <aside
          className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-slate-950"
          onClick={(evento) => evento.stopPropagation()}
        >
          <header className="flex items-start gap-3 border-b border-white/10 p-4">
            <div className="min-w-0 flex-1">
              <input
                className="w-full border border-transparent bg-transparent text-lg font-semibold text-white outline-none focus:border-emerald-300/40"
                onBlur={(evento) => {
                  const valor = evento.target.value.trim();
                  if (valor && valor !== item.titulo) acciones.actualizarItem(item.id, { titulo: valor });
                }}
                defaultValue={item.titulo}
                key={item.id}
              />
              <p className="mt-0.5 text-xs text-slate-500">
                {grupos.find((grupo) => grupo.id === item.grupo_id)?.nombre ?? "Sin grupo"}
              </p>
            </div>
            <button className="text-slate-400 transition hover:text-white" onClick={onCerrar} title="Cerrar" type="button">
              <X className="h-5 w-5" />
            </button>
          </header>

          <nav className="flex gap-1 border-b border-white/10 px-4">
            {(
              [
                ["detalle", "Detalle"],
                ["actualizaciones", `Actualizaciones${actualizaciones.length ? ` (${actualizaciones.length})` : ""}`],
              ] as const
            ).map(([valor, label]) => (
              <button
                className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${
                  pestana === valor
                    ? "border-emerald-300 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                key={valor}
                onClick={() => setPestana(valor)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-4">
            <ErrorBanner message={error} />

            {pestana === "detalle" ? (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Estado">
                    <SelectorPastilla
                      onChange={(valor) => acciones.actualizarItem(item.id, { estado: valor })}
                      opciones={ESTADOS}
                      valor={item.estado}
                    />
                  </Field>
                  <Field label="Prioridad">
                    <SelectorPastilla
                      onChange={(valor) => acciones.actualizarItem(item.id, { prioridad: valor })}
                      opciones={PRIORIDADES}
                      valor={item.prioridad}
                    />
                  </Field>
                  <Field label="Responsable">
                    <div className="border border-white/10 bg-slate-950/70">
                      <CeldaResponsable
                        onChange={(valor) => acciones.actualizarItem(item.id, { responsable: valor })}
                        sugerencias={acciones.responsables}
                        valor={item.responsable}
                      />
                    </div>
                  </Field>
                  <Field label="Grupo">
                    <select
                      className={INPUT}
                      onChange={(evento) => acciones.actualizarItem(item.id, { grupo_id: evento.target.value })}
                      value={item.grupo_id}
                    >
                      {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fecha de inicio">
                    <input
                      className={INPUT}
                      onChange={(evento) =>
                        acciones.actualizarItem(item.id, { fecha_inicio: evento.target.value || null })
                      }
                      type="date"
                      value={item.fecha_inicio ?? ""}
                    />
                  </Field>
                  <Field label="Fecha límite">
                    <input
                      className={INPUT}
                      onChange={(evento) =>
                        acciones.actualizarItem(item.id, { fecha_limite: evento.target.value || null })
                      }
                      type="date"
                      value={item.fecha_limite ?? ""}
                    />
                  </Field>
                </div>

                <Field label="Etiquetas">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.etiquetas.map((etiqueta) => (
                      <span
                        className="inline-flex items-center gap-1 border border-white/15 bg-white/8 px-2 py-0.5 text-xs font-semibold text-slate-200"
                        key={etiqueta}
                      >
                        <Tag className="h-3 w-3 text-slate-500" />
                        {etiqueta}
                        <button
                          className="text-slate-500 transition hover:text-red-300"
                          onClick={() =>
                            acciones.actualizarItem(item.id, {
                              etiquetas: item.etiquetas.filter((valor) => valor !== etiqueta),
                            })
                          }
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <form
                      onSubmit={(evento) => {
                        evento.preventDefault();
                        const limpio = nuevaEtiqueta.trim();
                        if (!limpio || item.etiquetas.includes(limpio)) return;
                        acciones.actualizarItem(item.id, { etiquetas: [...item.etiquetas, limpio] });
                        setNuevaEtiqueta("");
                      }}
                    >
                      <input
                        className="w-32 border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none focus:border-emerald-300/60"
                        onChange={(evento) => setNuevaEtiqueta(evento.target.value)}
                        placeholder="+ etiqueta"
                        value={nuevaEtiqueta}
                      />
                    </form>
                  </div>
                </Field>

                <Field label="Notas">
                  <textarea
                    className={`${INPUT} min-h-[120px]`}
                    defaultValue={item.notas ?? ""}
                    key={item.id}
                    onBlur={(evento) => acciones.actualizarItem(item.id, { notas: evento.target.value || null })}
                    placeholder="Detalles, acuerdos, contactos..."
                  />
                </Field>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                    Subtareas ({subitems.filter((sub) => sub.estado === "listo").length}/{subitems.length})
                  </p>
                  <div className="grid gap-1.5">
                    {subitems.map((sub) => (
                      <div className="flex items-center gap-2 border border-white/8 bg-white/4 p-1.5" key={sub.id}>
                        <input
                          checked={sub.estado === "listo"}
                          className="h-4 w-4 accent-emerald-400"
                          onChange={(evento) =>
                            acciones.actualizarItem(sub.id, { estado: evento.target.checked ? "listo" : "sin_empezar" })
                          }
                          type="checkbox"
                        />
                        <span
                          className={`flex-1 truncate text-sm ${
                            sub.estado === "listo" ? "text-slate-500 line-through" : "text-slate-200"
                          }`}
                        >
                          {sub.titulo}
                        </span>
                        <button
                          className="text-slate-600 transition hover:text-red-300"
                          onClick={() => acciones.eliminarItem(sub.id)}
                          title="Eliminar subtarea"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(evento) => {
                      evento.preventDefault();
                      const limpio = nuevoSub.trim();
                      if (!limpio) return;
                      acciones.crearSubitem(item, limpio);
                      setNuevoSub("");
                    }}
                  >
                    <input
                      className={INPUT}
                      onChange={(evento) => setNuevoSub(evento.target.value)}
                      placeholder="Nueva subtarea"
                      value={nuevoSub}
                    />
                    <button className={BTN_GHOST} type="submit">
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex gap-2">
                  <textarea
                    className={`${INPUT} min-h-[80px]`}
                    onChange={(evento) => setComentario(evento.target.value)}
                    placeholder="¿Qué avanzó? Escribe una actualización..."
                    value={comentario}
                  />
                </div>
                <button
                  className="ml-auto inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
                  disabled={enviando || !comentario.trim()}
                  onClick={enviarComentario}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                  {enviando ? "Publicando..." : "Publicar"}
                </button>

                {actualizaciones.length ? (
                  actualizaciones.map((actualizacion) => (
                    <article className="border border-white/10 bg-white/4 p-3" key={actualizacion.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          {fechaHoraLegible(actualizacion.created_at)}
                        </span>
                        <button
                          className="text-slate-600 transition hover:text-red-300"
                          onClick={async () => {
                            await deleteActualizacion(actualizacion.id);
                            await cargar();
                            onCambioActualizaciones();
                          }}
                          title="Eliminar actualización"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{actualizacion.texto}</p>
                    </article>
                  ))
                ) : (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <MessageSquare className="h-4 w-4" />
                    Todavía no hay actualizaciones en este pendiente.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
