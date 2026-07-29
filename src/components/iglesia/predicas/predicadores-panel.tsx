"use client";

import { Check, Pencil, Plus, Power, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, INPUT, Modal } from "@/components/ui-comun";
import { deletePredicador, insertPredicador, updatePredicador } from "@/lib/iglesia/predicas";
import type { PredicadorRow } from "@/lib/iglesia/types";

/**
 * Catalogo de predicadores. "Inactivar" es la via recomendada: deja de
 * aparecer al asignar pero conserva los meses ya armados. Borrar tambien se
 * permite, avisando que las celebraciones donde estaba quedaran sin asignar.
 */
export function PredicadoresPanel({
  onCerrar,
  onCambio,
  predicadores,
  uso,
}: {
  onCerrar: () => void;
  onCambio: () => void | Promise<void>;
  predicadores: PredicadorRow[];
  uso: Record<string, number>;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [borradorNombre, setBorradorNombre] = useState("");
  const [borradorTelefono, setBorradorTelefono] = useState("");
  const [aEliminar, setAEliminar] = useState<PredicadorRow | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    setGuardando(true);
    const { error: insertError } = await insertPredicador({ nombre: limpio, telefono: telefono.trim() || null });
    setGuardando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    setNombre("");
    setTelefono("");
    setError("");
    await onCambio();
  };

  const guardarEdicion = async (predicador: PredicadorRow) => {
    const limpio = borradorNombre.trim();
    if (!limpio) return;
    const { error: updateError } = await updatePredicador(predicador.id, {
      nombre: limpio,
      telefono: borradorTelefono.trim() || null,
    });
    if (updateError) {
      setError(updateError);
      return;
    }
    setEditando(null);
    setError("");
    await onCambio();
  };

  const alternarActivo = async (predicador: PredicadorRow) => {
    const { error: updateError } = await updatePredicador(predicador.id, { activo: !predicador.activo });
    if (updateError) {
      setError(updateError);
      return;
    }
    await onCambio();
  };

  const activos = predicadores.filter((predicador) => predicador.activo);
  const inactivos = predicadores.filter((predicador) => !predicador.activo);

  const fila = (predicador: PredicadorRow) => (
    <div
      className={`flex flex-wrap items-center gap-2 border border-white/10 p-2 ${
        predicador.activo ? "bg-white/6" : "bg-white/3 opacity-70"
      }`}
      key={predicador.id}
    >
      {editando === predicador.id ? (
        <>
          <input
            autoFocus
            className={`${INPUT} flex-1 min-w-[160px]`}
            onChange={(evento) => setBorradorNombre(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") void guardarEdicion(predicador);
              if (evento.key === "Escape") setEditando(null);
            }}
            value={borradorNombre}
          />
          <input
            className={`${INPUT} w-32`}
            onChange={(evento) => setBorradorTelefono(evento.target.value)}
            placeholder="Teléfono"
            value={borradorTelefono}
          />
          <button
            className="flex h-8 w-8 items-center justify-center border border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
            onClick={() => void guardarEdicion(predicador)}
            title="Guardar"
            type="button"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-slate-300"
            onClick={() => setEditando(null)}
            title="Cancelar"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <Avatar nombre={predicador.nombre} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">{predicador.nombre}</p>
            <p className="text-xs text-slate-500">
              {predicador.telefono ? `${predicador.telefono} · ` : ""}
              {uso[predicador.id] ? `${uso[predicador.id]} asignaciones en total` : "sin asignaciones"}
              {predicador.activo ? "" : " · inactivo"}
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-slate-300 transition hover:border-emerald-300/50 hover:text-white"
            onClick={() => {
              setEditando(predicador.id);
              setBorradorNombre(predicador.nombre);
              setBorradorTelefono(predicador.telefono ?? "");
            }}
            title="Editar"
            type="button"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className={`flex h-8 w-8 items-center justify-center border transition ${
              predicador.activo
                ? "border-white/10 text-slate-300 hover:border-amber-300/60 hover:text-amber-200"
                : "border-emerald-300/40 text-emerald-200"
            }`}
            onClick={() => void alternarActivo(predicador)}
            title={predicador.activo ? "Inactivar" : "Reactivar"}
            type="button"
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center border border-red-400/30 text-red-200 transition hover:border-red-300"
            onClick={() => setAEliminar(predicador)}
            title="Eliminar"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <Modal ancho="max-w-2xl" onClose={onCerrar} titulo="Predicadores disponibles">
      <div className="grid gap-4">
        <ErrorBanner message={error} />

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            void agregar();
          }}
        >
          <input
            className={`${INPUT} flex-1 min-w-[180px]`}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="Nombre del predicador"
            value={nombre}
          />
          <input
            className={`${INPUT} w-36`}
            onChange={(evento) => setTelefono(evento.target.value)}
            placeholder="Teléfono"
            value={telefono}
          />
          <button className={BTN_PRIMARY} disabled={guardando || !nombre.trim()} type="submit">
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </form>

        {predicadores.length ? (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Activos ({activos.length})</p>
              {activos.length ? activos.map(fila) : <p className="text-sm text-slate-500">Ninguno.</p>}
            </div>

            {inactivos.length ? (
              <div className="grid gap-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Inactivos ({inactivos.length})
                </p>
                {inactivos.map(fila)}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState>
            <UserRound className="mx-auto mb-2 h-6 w-6 text-slate-500" />
            Agrega a los predicadores con los que sueles contar. Después los asignas en el calendario del mes.
          </EmptyState>
        )}

        <div className="flex justify-end">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cerrar
          </button>
        </div>
      </div>

      <ConfirmDialog
        message={
          uso[aEliminar?.id ?? ""]
            ? `"${aEliminar?.nombre ?? ""}" está asignado en ${uso[aEliminar?.id ?? ""]} celebraciones; esas quedarán sin asignar. Si solo quieres que deje de aparecer al asignar, usa "Inactivar" en vez de eliminar.`
            : `Se eliminará a "${aEliminar?.nombre ?? ""}" del catálogo.`
        }
        onCancel={() => setAEliminar(null)}
        onConfirm={async () => {
          if (!aEliminar) return;
          const { error: deleteError } = await deletePredicador(aEliminar.id);
          setAEliminar(null);
          if (deleteError) setError(deleteError);
          await onCambio();
        }}
        open={Boolean(aEliminar)}
        title="Eliminar predicador"
      />
    </Modal>
  );
}
