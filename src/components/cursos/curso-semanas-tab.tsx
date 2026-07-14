"use client";

import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { deleteSemana, fetchSemanas, insertSemana, siguienteNumero, updateSemana } from "@/lib/cursos/semanas";
import { TIPO_SESION_LABELS, formatearFecha, type SemanaRow, type TipoSesion } from "@/lib/cursos/types";
import { BTN_GHOST, BTN_PRIMARY, CardBox, Chip, EmptyState, ErrorBanner, Field } from "./ui";

const TIPO_SESION_CHIP: Record<TipoSesion, string> = {
  normal: "",
  examen_parcial: "border-amber-300/40 bg-amber-300/15 text-amber-200",
  examen_final: "border-rose-300/40 bg-rose-300/15 text-rose-200",
};

export function CursoSemanasTab({ cursoId, onOpenSemana }: { cursoId: string; onOpenSemana: (semana: SemanaRow) => void }) {
  const [semanas, setSemanas] = useState<SemanaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ open: false } | { open: true; semana: SemanaRow | null }>({ open: false });
  const [eliminar, setEliminar] = useState<SemanaRow | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchSemanas(cursoId);
    setSemanas(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga semanas al cambiar de curso
    void cargar();
  }, [cargar]);

  const handleEliminar = async () => {
    if (!eliminar) return;
    setEliminando(true);
    const { error: deleteError } = await deleteSemana(eliminar.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminar(null);
    await cargar();
  };

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />

      <div className="flex justify-end">
        <button className={BTN_PRIMARY} onClick={() => setModal({ open: true, semana: null })} type="button">
          <Plus className="h-4 w-4" />
          Nueva semana
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : semanas.length === 0 ? (
        <EmptyState>
          <div className="grid gap-3">
            <CalendarDays className="mx-auto h-6 w-6 text-slate-500" />
            <p>Aún no hay semanas programadas.</p>
            <button className={`${BTN_PRIMARY} mx-auto`} onClick={() => setModal({ open: true, semana: null })} type="button">
              <Plus className="h-4 w-4" />
              Agregar la primera semana
            </button>
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {semanas.map((semana) => (
            <CardBox key={semana.id} onClick={() => onOpenSemana(semana)}>
              <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                <button
                  className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-slate-200 hover:border-emerald-300/50"
                  onClick={(event) => {
                    event.stopPropagation();
                    setModal({ open: true, semana });
                  }}
                  title="Editar semana"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center border border-red-400/30 bg-slate-950/80 text-red-200 hover:border-red-300"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEliminar(semana);
                  }}
                  title="Eliminar semana"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-base font-semibold text-white">Semana {semana.numero}</div>
              {semana.titulo ? <div className="text-sm text-slate-300">{semana.titulo}</div> : null}
              <div className="mt-1 text-xs text-slate-400">{formatearFecha(semana.fecha)}</div>
              {semana.tipo_sesion !== "normal" ? (
                <Chip className={`mt-2 ${TIPO_SESION_CHIP[semana.tipo_sesion]}`}>
                  {TIPO_SESION_LABELS[semana.tipo_sesion]}
                </Chip>
              ) : null}
            </CardBox>
          ))}
        </div>
      )}

      {modal.open ? (
        <SemanaModal
          cursoId={cursoId}
          onClose={() => setModal({ open: false })}
          onGuardado={async () => {
            setModal({ open: false });
            await cargar();
          }}
          semana={modal.semana}
          siguienteNumeroSugerido={siguienteNumero(semanas)}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará esta semana junto con sus contenidos, materiales, tareas y asistencia registrada."
        onCancel={() => setEliminar(null)}
        onConfirm={handleEliminar}
        open={eliminar !== null}
        title="Eliminar semana"
      />
    </div>
  );
}

function SemanaModal({
  cursoId,
  onClose,
  onGuardado,
  semana,
  siguienteNumeroSugerido,
}: {
  cursoId: string;
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
  semana: SemanaRow | null;
  siguienteNumeroSugerido: number;
}) {
  const [numero, setNumero] = useState(semana?.numero ?? siguienteNumeroSugerido);
  const [titulo, setTitulo] = useState(semana?.titulo ?? "");
  const [fecha, setFecha] = useState(semana?.fecha ?? "");
  const [tipoSesion, setTipoSesion] = useState<TipoSesion>(semana?.tipo_sesion ?? "normal");
  const [notas, setNotas] = useState(semana?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!numero || numero < 1) {
      setError("El número de semana debe ser mayor a cero.");
      return;
    }
    setGuardando(true);
    const payload = {
      numero,
      titulo: titulo.trim() || null,
      fecha: fecha || null,
      tipo_sesion: tipoSesion,
      notas: notas.trim() || null,
    };
    const { error: saveError } = semana
      ? await updateSemana(semana.id, payload)
      : await insertSemana({ curso_id: cursoId, ...payload });
    setGuardando(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    await onGuardado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-md border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">{semana ? "Editar semana" : "Nueva semana"}</h3>
          <div className="grid gap-3">
            <Field label="Número">
              <input
                className="field"
                min={1}
                onChange={(event) => setNumero(Number(event.target.value))}
                type="number"
                value={numero}
              />
            </Field>
            <Field label="Título">
              <input className="field" onChange={(event) => setTitulo(event.target.value)} value={titulo} />
            </Field>
            <Field label="Fecha">
              <input className="field" onChange={(event) => setFecha(event.target.value)} type="date" value={fecha ?? ""} />
            </Field>
            <Field label="Tipo de sesión">
              <div className="grid gap-1.5">
                {(Object.keys(TIPO_SESION_LABELS) as TipoSesion[]).map((opcion) => (
                  <label className="flex items-center gap-2 text-sm text-slate-200" key={opcion}>
                    <input
                      checked={tipoSesion === opcion}
                      onChange={() => setTipoSesion(opcion)}
                      type="radio"
                    />
                    {TIPO_SESION_LABELS[opcion]}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Notas">
              <textarea className="field" onChange={(event) => setNotas(event.target.value)} rows={2} value={notas ?? ""} />
            </Field>
          </div>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleGuardar} type="button">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
