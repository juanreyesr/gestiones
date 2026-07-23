"use client";

import { ArrowDown, ArrowUp, Check, ChevronLeft, MessagesSquare, Pencil, Plus, Radio, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "../confirm-dialog";
import { deletePregunta, fetchPreguntas, reordenarPreguntas, updateRecurso } from "@/lib/recursos/recursos";
import { crearSesion } from "@/lib/recursos/sesiones";
import { TIPO_PREGUNTA_LABELS, type PreguntaRow, type RecursoConConteo } from "@/lib/recursos/types";
import { PreguntaForm } from "./pregunta-form";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, PanelBox } from "./ui";

export function RecursoDetalle({
  onLanzar,
  onVolver,
  recurso,
}: {
  onLanzar: (sesionId: string, pin: string) => void;
  onVolver: () => void;
  recurso: RecursoConConteo;
}) {
  const [preguntas, setPreguntas] = useState<PreguntaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [titulo, setTitulo] = useState(recurso.titulo);
  const [descripcion, setDescripcion] = useState(recurso.descripcion ?? "");
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [formAbierto, setFormAbierto] = useState<{ pregunta: PreguntaRow | null } | null>(null);
  const [borrando, setBorrando] = useState<PreguntaRow | null>(null);
  const [lanzando, setLanzando] = useState(false);
  const esQuiz = recurso.tipo === "quiz";
  const esQa = recurso.tipo === "qa";

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchPreguntas(recurso.id);
    setPreguntas(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, [recurso.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de preguntas al abrir el recurso
    void cargar();
  }, [cargar]);

  const handleGuardarDatos = async () => {
    if (!titulo.trim()) return;
    setGuardandoDatos(true);
    const { error: saveError } = await updateRecurso(recurso.id, {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
    });
    setGuardandoDatos(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setEditandoDatos(false);
  };

  const mover = async (index: number, direccion: -1 | 1) => {
    const destino = index + direccion;
    if (destino < 0 || destino >= preguntas.length) return;
    const copia = [...preguntas];
    [copia[index], copia[destino]] = [copia[destino], copia[index]];
    setPreguntas(copia);
    await reordenarPreguntas(copia.map((pregunta, i) => ({ id: pregunta.id, orden: i })));
    await cargar();
  };

  const handleBorrar = async () => {
    if (!borrando) return;
    const { error: deleteError } = await deletePregunta(borrando.id);
    if (deleteError) {
      setError(deleteError);
      setBorrando(null);
      return;
    }
    setBorrando(null);
    await cargar();
  };

  const handleLanzar = async () => {
    if ((!esQa && preguntas.length === 0) || lanzando) return;
    setLanzando(true);
    const { sesionId, pin, error: launchError } = await crearSesion(recurso.id);
    setLanzando(false);
    if (launchError || !sesionId || !pin) {
      setError(launchError ?? "No se pudo lanzar la sesión.");
      return;
    }
    onLanzar(sesionId, pin);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className={BTN_GHOST} onClick={onVolver} type="button">
          <ChevronLeft className="h-4 w-4" />
          Mis recursos
        </button>
        <button
          className={BTN_PRIMARY}
          disabled={(!esQa && preguntas.length === 0) || lanzando}
          onClick={() => void handleLanzar()}
          type="button"
        >
          <Radio className="h-4 w-4" />
          {lanzando ? "Lanzando..." : "Lanzar sesión en vivo"}
        </button>
      </div>

      <ErrorBanner message={error} />

      <PanelBox>
        {editandoDatos ? (
          <div className="grid gap-3">
            <Field label="Título">
              <input className="field" onChange={(event) => setTitulo(event.target.value)} value={titulo} />
            </Field>
            <Field label="Descripción">
              <textarea className="field resize-y" onChange={(event) => setDescripcion(event.target.value)} rows={2} value={descripcion} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className={BTN_GHOST} onClick={() => setEditandoDatos(false)} type="button">
                Cancelar
              </button>
              <button className={BTN_PRIMARY} disabled={!titulo.trim() || guardandoDatos} onClick={() => void handleGuardarDatos()} type="button">
                {guardandoDatos ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">{recurso.titulo}</h2>
              {recurso.descripcion ? <p className="mt-1 text-sm text-slate-400">{recurso.descripcion}</p> : null}
            </div>
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-white/8 text-slate-300 transition hover:border-emerald-300/50"
              onClick={() => setEditandoDatos(true)}
              title="Editar título y descripción"
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
      </PanelBox>

      {esQa ? (
        <div className="flex items-start gap-3 border border-white/10 bg-white/6 p-4">
          <MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <p className="text-sm leading-6 text-slate-300">
            En este recurso no defines preguntas: el público las escribe en vivo desde su celular y las vota entre
            ellos. Lanza la sesión cuando estés listo para empezar a recibirlas.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Preguntas ({preguntas.length})</h3>
            <button className={BTN_GHOST} onClick={() => setFormAbierto({ pregunta: null })} type="button">
              <Plus className="h-4 w-4" />
              Agregar pregunta
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Cargando preguntas...</p>
          ) : preguntas.length === 0 ? (
            <EmptyState>Aún no hay preguntas. Agrega la primera para poder lanzar la sesión.</EmptyState>
          ) : (
            <div className="grid gap-2">
              {preguntas.map((pregunta, index) => (
                <div className="border border-white/10 bg-white/6 p-3" key={pregunta.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                        {index + 1}. {TIPO_PREGUNTA_LABELS[pregunta.tipo_pregunta]}
                      </span>
                      <p className="mt-1 text-sm leading-6 text-white">{pregunta.texto}</p>
                      {pregunta.tipo_pregunta === "opcion_multiple" && pregunta.opciones ? (
                        <ul className="mt-1 grid gap-0.5 text-xs text-slate-400">
                          {pregunta.opciones.map((opcion) => (
                            <li className={opcion.correcta ? "font-semibold text-emerald-300" : undefined} key={opcion.id}>
                              {opcion.correcta ? <Check className="mr-1 inline h-3 w-3" /> : "• "}
                              {opcion.texto}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {pregunta.tipo_pregunta === "escala" ? (
                        <p className="mt-1 text-xs text-slate-400">
                          Escala de {pregunta.escala_min} a {pregunta.escala_max}
                        </p>
                      ) : null}
                      {esQuiz ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {pregunta.tiempo_limite ?? 20}s · {pregunta.puntos} puntos máx.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-slate-300 transition hover:border-emerald-300/50 disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => void mover(index, -1)}
                        title="Subir"
                        type="button"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-slate-300 transition hover:border-emerald-300/50 disabled:opacity-30"
                        disabled={index === preguntas.length - 1}
                        onClick={() => void mover(index, 1)}
                        title="Bajar"
                        type="button"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-slate-300 transition hover:border-emerald-300/50"
                        onClick={() => setFormAbierto({ pregunta })}
                        title="Editar"
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-red-300 transition hover:border-red-400/60"
                        onClick={() => setBorrando(pregunta)}
                        title="Borrar"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {formAbierto ? (
        <PreguntaForm
          esQuiz={esQuiz}
          onClose={() => setFormAbierto(null)}
          onSaved={() => {
            setFormAbierto(null);
            void cargar();
          }}
          orden={preguntas.length}
          pregunta={formAbierto.pregunta}
          recursoId={recurso.id}
        />
      ) : null}

      <ConfirmDialog
        message={`¿Borrar la pregunta "${borrando?.texto ?? ""}"? Esta acción no se puede deshacer.`}
        onCancel={() => setBorrando(null)}
        onConfirm={() => void handleBorrar()}
        open={Boolean(borrando)}
        title="Borrar pregunta"
      />
    </div>
  );
}
