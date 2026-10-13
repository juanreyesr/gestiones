"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { updateCurso } from "@/lib/cursos/cursos";
import {
  deletePreguntaPerfil,
  fetchPreguntasPerfil,
  insertPreguntaPerfil,
  updatePreguntaPerfil,
  type PerfilPreguntaRow,
} from "@/lib/cursos/perfil-preguntas";
import { BTN_GHOST, BTN_PRIMARY, DescripcionesIdiomas, ErrorBanner, Field } from "./ui";

const SEMANA_BLOQUEO_POR_DEFECTO = 5;

/**
 * Editor de las preguntas del perfil del estudiante (globales: valen para
 * todos los cursos, porque el perfil es de la persona) y, para ESTE curso,
 * la casilla que bloquea las tareas desde cierta semana a quien no haya
 * completado su perfil.
 */
export function PreguntasPerfilModal({
  bloqueoSemana,
  cursoId,
  onBloqueoGuardado,
  onClose,
}: {
  bloqueoSemana: number | null;
  cursoId: string;
  onBloqueoGuardado: (semana: number | null) => void;
  onClose: () => void;
}) {
  const [preguntas, setPreguntas] = useState<PerfilPreguntaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [bloquear, setBloquear] = useState(bloqueoSemana !== null);
  const [semana, setSemana] = useState(String(bloqueoSemana ?? SEMANA_BLOQUEO_POR_DEFECTO));
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);
  const [mensajeBloqueo, setMensajeBloqueo] = useState("");
  const [nueva, setNueva] = useState("");
  const [nuevaEn, setNuevaEn] = useState("");
  const [nuevaPt, setNuevaPt] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [editando, setEditando] = useState<PerfilPreguntaRow | null>(null);
  const [eliminar, setEliminar] = useState<PerfilPreguntaRow | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: fetchError } = await fetchPreguntasPerfil();
    setPreguntas(data);
    setError(fetchError ?? "");
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de las preguntas al abrir el modal
    void cargar();
  }, [cargar]);

  const guardarBloqueo = async (activar: boolean, semanaTexto: string) => {
    const numero = Number.parseInt(semanaTexto, 10);
    if (activar && (!Number.isFinite(numero) || numero < 1 || numero > 60)) {
      setError("Escribe una semana válida (de 1 a 60).");
      return;
    }
    const valor = activar ? numero : null;
    setGuardandoBloqueo(true);
    setMensajeBloqueo("");
    const { error: updateError } = await updateCurso(cursoId, { perfil_bloqueo_semana: valor });
    setGuardandoBloqueo(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setError("");
    setMensajeBloqueo(activar ? `Guardado: las tareas se bloquean desde la semana ${numero}.` : "Guardado: sin bloqueo de tareas.");
    onBloqueoGuardado(valor);
  };

  const handleAgregar = async () => {
    if (!nueva.trim()) {
      setError("Escribe la pregunta.");
      return;
    }
    setAgregando(true);
    const orden = preguntas.reduce((max, p) => Math.max(max, p.orden), 0) + 1;
    const { error: insertError } = await insertPreguntaPerfil({
      texto: nueva.trim(),
      texto_en: nuevaEn.trim() || null,
      texto_pt: nuevaPt.trim() || null,
      orden,
    });
    setAgregando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    setNueva("");
    setNuevaEn("");
    setNuevaPt("");
    await cargar();
  };

  const mover = async (indice: number, direccion: -1 | 1) => {
    const otra = preguntas[indice + direccion];
    const actual = preguntas[indice];
    if (!otra || !actual) return;
    // Se renumera toda la lista para que el orden quede estable aunque haya empates.
    const reordenadas = [...preguntas];
    reordenadas[indice] = otra;
    reordenadas[indice + direccion] = actual;
    setPreguntas(reordenadas);
    const resultados = await Promise.all(reordenadas.map((p, i) => updatePreguntaPerfil(p.id, { orden: i + 1 })));
    const fallo = resultados.find((r) => r.error);
    if (fallo?.error) setError(fallo.error);
    await cargar();
  };

  const alternarActiva = async (pregunta: PerfilPreguntaRow) => {
    const { error: updateError } = await updatePreguntaPerfil(pregunta.id, { activa: !pregunta.activa });
    if (updateError) {
      setError(updateError);
      return;
    }
    await cargar();
  };

  const handleEliminar = async () => {
    if (!eliminar) return;
    setEliminando(true);
    const { error: deleteError } = await deletePreguntaPerfil(eliminar.id);
    setEliminando(false);
    setEliminar(null);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    await cargar();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Preguntas del perfil del estudiante</h3>
              <p className="text-xs text-slate-400">
                El perfil es de la persona, así que estas preguntas valen para todos los cursos. Además de responderlas, el perfil
                completo pide foto, fecha de nacimiento y país.
              </p>
            </div>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 overflow-y-auto pr-1">
            <div className="grid gap-2 border border-amber-300/30 bg-amber-300/10 p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <input
                  checked={bloquear}
                  className="h-4 w-4 accent-emerald-300"
                  disabled={guardandoBloqueo}
                  onChange={(event) => {
                    setBloquear(event.target.checked);
                    void guardarBloqueo(event.target.checked, semana);
                  }}
                  type="checkbox"
                />
                <Lock className="h-4 w-4" />
                En este curso, bloquear las tareas a quien no haya completado su perfil
              </label>
              <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-amber-100/90">
                A partir de la semana
                <input
                  className="field w-20 py-1"
                  disabled={!bloquear || guardandoBloqueo}
                  inputMode="numeric"
                  onBlur={() => {
                    if (bloquear && semana !== String(bloqueoSemana)) void guardarBloqueo(true, semana);
                  }}
                  onChange={(event) => setSemana(event.target.value.replace(/\D/g, ""))}
                  value={semana}
                />
                <span>
                  El estudiante verá el botón «Tienes que completar los datos de tu perfil para continuar con el curso».
                </span>
              </div>
              {mensajeBloqueo ? <p className="pl-6 text-xs text-emerald-200">{mensajeBloqueo}</p> : null}
            </div>

            <ErrorBanner message={error} />

            {cargando ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : preguntas.length === 0 ? (
              <p className="text-sm text-slate-400">No hay preguntas. Agrega la primera abajo.</p>
            ) : (
              <div className="grid gap-2">
                {preguntas.map((pregunta, indice) => (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border border-white/10 p-3 ${
                      pregunta.activa ? "bg-white/6" : "bg-white/2 opacity-60"
                    }`}
                    key={pregunta.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{pregunta.texto}</p>
                      <p className="text-xs text-slate-500">
                        {[pregunta.texto_en, pregunta.texto_pt].filter(Boolean).join(" · ") || "Sin traducción"}
                        {!pregunta.activa ? " · Desactivada (no se pide ni cuenta para el perfil completo)" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className={BTN_GHOST} disabled={indice === 0} onClick={() => void mover(indice, -1)} title="Subir" type="button">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        className={BTN_GHOST}
                        disabled={indice === preguntas.length - 1}
                        onClick={() => void mover(indice, 1)}
                        title="Bajar"
                        type="button"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button className={BTN_GHOST} onClick={() => setEditando(pregunta)} title="Editar" type="button">
                        Editar
                      </button>
                      <button
                        className={BTN_GHOST}
                        onClick={() => void alternarActiva(pregunta)}
                        title={pregunta.activa ? "Desactivar (deja de pedirse; se conservan las respuestas)" : "Volver a activar"}
                        type="button"
                      >
                        {pregunta.activa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        className="flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-300"
                        onClick={() => setEliminar(pregunta)}
                        title="Eliminar"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 border border-white/10 bg-white/4 p-3">
              <Field label="Nueva pregunta">
                <input className="field" maxLength={300} onChange={(event) => setNueva(event.target.value)} value={nueva} />
              </Field>
              <DescripcionesIdiomas en={nuevaEn} onChangeEn={setNuevaEn} onChangePt={setNuevaPt} pt={nuevaPt} />
              <button className={`${BTN_PRIMARY} w-fit`} disabled={agregando} onClick={() => void handleAgregar()} type="button">
                <Plus className="h-4 w-4" />
                {agregando ? "Agregando..." : "Agregar pregunta"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {editando ? (
        <EditarPreguntaModal
          onClose={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null);
            await cargar();
          }}
          pregunta={editando}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará la pregunta. Si solo quieres dejar de pedirla, mejor desactívala: así se conservan las respuestas que ya existen."
        onCancel={() => setEliminar(null)}
        onConfirm={handleEliminar}
        open={eliminar !== null}
        title="Eliminar pregunta"
      />
    </ModalPortal>
  );
}

function EditarPreguntaModal({
  onClose,
  onGuardado,
  pregunta,
}: {
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
  pregunta: PerfilPreguntaRow;
}) {
  const [texto, setTexto] = useState(pregunta.texto);
  const [textoEn, setTextoEn] = useState(pregunta.texto_en ?? "");
  const [textoPt, setTextoPt] = useState(pregunta.texto_pt ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!texto.trim()) {
      setError("La pregunta no puede quedar vacía.");
      return;
    }
    setGuardando(true);
    const { error: updateError } = await updatePreguntaPerfil(pregunta.id, {
      texto: texto.trim(),
      texto_en: textoEn.trim() || null,
      texto_pt: textoPt.trim() || null,
    });
    setGuardando(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    await onGuardado();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col border border-white/10 bg-slate-950 p-5" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-white">Editar pregunta</h3>
        <div className="grid gap-3">
          <Field label="Pregunta">
            <input className="field" maxLength={300} onChange={(event) => setTexto(event.target.value)} value={texto} />
          </Field>
          <DescripcionesIdiomas en={textoEn} onChangeEn={setTextoEn} onChangePt={setTextoPt} pt={textoPt} />
        </div>
        <ErrorBanner message={error} />
        <div className="mt-5 flex justify-end gap-3">
          <button className={BTN_GHOST} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={BTN_PRIMARY} disabled={guardando} onClick={() => void handleGuardar()} type="button">
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
