"use client";

import { CalendarDays, Eye, EyeOff, Pencil, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteReunion,
  fetchReuniones,
  insertReunion,
  updateReunion,
  type ReunionRow,
} from "@/lib/reuniones";

const AUTOSAVE_MS = 2 * 60 * 1000;

type EditorState = {
  id: string | null;
  fecha: string;
  notas: string;
  /** Copia previa para poder restaurar al descartar una edicion. Null = reunion nueva. */
  original: { fecha: string; notas: string; borrador: boolean } | null;
};

const hoyLocal = () => {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

function formatFecha(fecha: string) {
  const parsed = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function horaActual() {
  return new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

export function ReunionesView() {
  const [reuniones, setReuniones] = useState<ReunionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [autosaveInfo, setAutosaveInfo] = useState("");
  const [editorError, setEditorError] = useState("");
  const [confirmDescartar, setConfirmDescartar] = useState(false);

  const editorRef = useRef<EditorState | null>(null);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  /** Ultimo contenido persistido (para no autoguardar sin cambios). */
  const lastSavedRef = useRef<string | null>(null);
  /** Hubo al menos un autoguardado desde que se abrio el editor. */
  const autosavedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");
    const { data, error } = await fetchReuniones();
    if (error) setListError(error);
    setReuniones(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load();
  }, [load]);

  const snapshot = (state: EditorState) => `${state.fecha}|${state.notas}`;

  const abrirNueva = () => {
    setMessage("");
    setEditorError("");
    setAutosaveInfo("");
    setConfirmDescartar(false);
    autosavedRef.current = false;
    lastSavedRef.current = null;
    setEditor({ id: null, fecha: hoyLocal(), notas: "", original: null });
  };

  const abrirEdicion = (row: ReunionRow) => {
    setMessage("");
    setEditorError("");
    setAutosaveInfo("");
    setConfirmDescartar(false);
    autosavedRef.current = false;
    const state: EditorState = {
      id: row.id,
      fecha: row.fecha,
      notas: row.notas,
      original: { fecha: row.fecha, notas: row.notas, borrador: row.borrador },
    };
    lastSavedRef.current = snapshot(state);
    setEditor(state);
  };

  const cerrarEditor = () => {
    setEditor(null);
    setConfirmDescartar(false);
    setAutosaveInfo("");
    setEditorError("");
    autosavedRef.current = false;
    lastSavedRef.current = null;
  };

  const persistir = useCallback(async (state: EditorState, borrador: boolean) => {
    if (state.id) {
      const { error } = await updateReunion(state.id, { fecha: state.fecha, notas: state.notas, borrador });
      return { id: state.id, error };
    }
    const { id, error } = await insertReunion({ fecha: state.fecha, notas: state.notas, borrador });
    return { id, error };
  }, []);

  // Autoguardado cada 2 minutos mientras el editor este abierto y haya cambios.
  useEffect(() => {
    if (!editor) return undefined;

    const timer = setInterval(async () => {
      const current = editorRef.current;
      if (!current) return;
      if (lastSavedRef.current === snapshot(current)) return;
      if (!current.notas.trim() && !current.id) return;

      const borrador = current.original ? current.original.borrador : true;
      const { id, error } = await persistir(current, borrador);
      if (error) {
        setAutosaveInfo(`No se pudo autoguardar: ${error}`);
        return;
      }
      autosavedRef.current = true;
      lastSavedRef.current = snapshot(current);
      if (id && !current.id) {
        setEditor((prev) => (prev ? { ...prev, id } : prev));
      }
      setAutosaveInfo(`Guardado automatico a las ${horaActual()}`);
    }, AUTOSAVE_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el intervalo lee el estado via ref
  }, [editor !== null, persistir]);

  const handleGuardar = async () => {
    if (!editor) return;
    if (!editor.notas.trim()) {
      setEditorError("Anota al menos un comentario de la reunion antes de guardar.");
      return;
    }
    setSaving(true);
    setEditorError("");
    const { error } = await persistir(editor, false);
    setSaving(false);
    if (error) {
      setEditorError(`No se pudo guardar: ${error}`);
      return;
    }
    cerrarEditor();
    setMessage("Reunion guardada.");
    await load();
  };

  const handleDescartar = async () => {
    if (!editor) return;
    setSaving(true);
    setEditorError("");

    if (editor.original) {
      // Edicion de una reunion existente: restaurar el contenido previo si
      // algun autoguardado ya escribio los cambios.
      if (autosavedRef.current && editor.id) {
        const { error } = await updateReunion(editor.id, editor.original);
        if (error) {
          setSaving(false);
          setEditorError(`No se pudo descartar: ${error}`);
          return;
        }
      }
    } else if (editor.id) {
      // Reunion nueva que ya se autoguardo como borrador: eliminarla.
      const { error } = await deleteReunion(editor.id);
      if (error) {
        setSaving(false);
        setEditorError(`No se pudo descartar: ${error}`);
        return;
      }
    }

    setSaving(false);
    cerrarEditor();
    setMessage("Cambios descartados.");
    await load();
  };

  const listado = useMemo(() => reuniones, [reuniones]);

  if (editor) {
    return (
      <div className="grid gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Reuniones con docentes</p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {editor.original ? "Editar reunion" : "Nueva reunion"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            La bitacora se guarda de forma automatica cada 2 minutos mientras escribes.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="grid max-w-xs gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Fecha de reunion</span>
            <input
              aria-label="Fecha de reunion"
              className="field"
              type="date"
              value={editor.fecha}
              onChange={(event) => setEditor((prev) => (prev ? { ...prev, fecha: event.target.value } : prev))}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Comentarios de la reunion (bitacora)
            </span>
            <textarea
              aria-label="Comentarios de la reunion"
              className="field min-h-[320px] resize-y leading-7"
              placeholder="Aspectos tratados, acuerdos, casos y seguimientos de la reunion..."
              value={editor.notas}
              onChange={(event) => setEditor((prev) => (prev ? { ...prev, notas: event.target.value } : prev))}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!confirmDescartar ? (
            <>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
                disabled={saving}
                onClick={handleGuardar}
                type="button"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar reunion"}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 border border-red-300/40 bg-red-400/10 px-5 text-sm font-semibold text-red-200 transition hover:border-red-300/70 disabled:opacity-60"
                disabled={saving}
                onClick={() => setConfirmDescartar(true)}
                type="button"
              >
                <X className="h-4 w-4" />
                Descartar
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3 border border-red-300/40 bg-red-400/10 px-4 py-3">
              <span className="text-sm font-semibold text-red-100">
                {editor.original
                  ? "Se descartaran los cambios y la reunion volvera a su version anterior. Esta accion no se puede deshacer."
                  : "Se descartara esta reunion y sus notas. Esta accion no se puede deshacer."}
              </span>
              <button
                className="inline-flex h-9 items-center justify-center bg-red-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-red-200 disabled:opacity-60"
                disabled={saving}
                onClick={handleDescartar}
                type="button"
              >
                Si, descartar
              </button>
              <button
                className="inline-flex h-9 items-center justify-center border border-white/20 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/40"
                disabled={saving}
                onClick={() => setConfirmDescartar(false)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          )}

          {autosaveInfo ? <span className="text-xs text-slate-400">{autosaveInfo}</span> : null}
        </div>

        {editorError ? <p className="text-sm text-red-300">{editorError}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Reuniones con docentes</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Registro de reuniones</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Bitacora de reuniones con docentes para dar seguimiento a los aspectos tratados y la actualizacion de
            casos.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
          onClick={abrirNueva}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Registrar nueva reunion
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {listError ? <p className="text-sm text-red-300">{listError}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando reuniones...</p>
      ) : listado.length === 0 ? (
        <p className="text-sm text-slate-400">Aun no hay reuniones registradas.</p>
      ) : (
        <div className="grid gap-4">
          {listado.map((row) => {
            const abierta = expandedId === row.id;
            return (
              <article key={row.id} className="border border-white/10 bg-white/8 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-200" />
                    <span className="text-sm font-semibold capitalize text-slate-100">{formatFecha(row.fecha)}</span>
                    {row.borrador ? (
                      <span className="border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                        Borrador autoguardado
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30"
                      onClick={() => setExpandedId(abierta ? null : row.id)}
                      type="button"
                    >
                      {abierta ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {abierta ? "Ocultar notas" : "Ver notas"}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30"
                      onClick={() => abrirEdicion(row)}
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  </div>
                </div>

                {abierta ? (
                  <p className="mt-4 whitespace-pre-wrap border-t border-white/10 pt-4 text-sm leading-7 text-slate-200">
                    {row.notas || "(Sin notas)"}
                  </p>
                ) : (
                  <p className="mt-3 truncate text-sm text-slate-400">{row.notas || "(Sin notas)"}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
