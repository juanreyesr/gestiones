"use client";

import { Check, Pencil, Plus, Power, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, INPUT, Modal } from "@/components/ui-comun";
import type { PersonaRow } from "@/lib/iglesia/types";

/**
 * Catalogo de personas, reutilizado por los dos listados del modulo:
 * predicadores y personas de cierre. Son independientes entre si — agregar o
 * quitar en uno no toca al otro — y por eso las operaciones llegan por
 * parametro en vez de estar fijas aqui.
 *
 * "Inactivar" es la via recomendada: deja de aparecer al asignar pero conserva
 * los meses ya armados. Borrar tambien se permite, avisando que las
 * celebraciones donde estaba quedaran sin asignar.
 */
export function PersonasPanel({
  acciones,
  descripcion,
  etiqueta,
  onCerrar,
  onCambio,
  personas,
  titulo,
  uso,
}: {
  acciones: {
    eliminar: (id: string) => Promise<{ error: string | null }>;
    insertar: (payload: { nombre: string; telefono?: string | null }) => Promise<{ error: string | null }>;
    actualizar: (
      id: string,
      payload: Partial<Pick<PersonaRow, "nombre" | "telefono" | "activo">>,
    ) => Promise<{ error: string | null }>;
  };
  descripcion: string;
  etiqueta: string;
  onCerrar: () => void;
  onCambio: () => void | Promise<void>;
  personas: PersonaRow[];
  titulo: string;
  uso: Record<string, number>;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [borradorNombre, setBorradorNombre] = useState("");
  const [borradorTelefono, setBorradorTelefono] = useState("");
  const [aEliminar, setAEliminar] = useState<PersonaRow | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    setGuardando(true);
    const { error: insertError } = await acciones.insertar({ nombre: limpio, telefono: telefono.trim() || null });
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

  const guardarEdicion = async (persona: PersonaRow) => {
    const limpio = borradorNombre.trim();
    if (!limpio) return;
    const { error: updateError } = await acciones.actualizar(persona.id, {
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

  const alternarActivo = async (persona: PersonaRow) => {
    const { error: updateError } = await acciones.actualizar(persona.id, { activo: !persona.activo });
    if (updateError) {
      setError(updateError);
      return;
    }
    await onCambio();
  };

  const activos = personas.filter((persona) => persona.activo);
  const inactivos = personas.filter((persona) => !persona.activo);

  const fila = (persona: PersonaRow) => (
    <div
      className={`flex flex-wrap items-center gap-2 border border-white/10 p-2 ${
        persona.activo ? "bg-white/6" : "bg-white/3 opacity-70"
      }`}
      key={persona.id}
    >
      {editando === persona.id ? (
        <>
          <input
            autoFocus
            className={`${INPUT} flex-1 min-w-[160px]`}
            onChange={(evento) => setBorradorNombre(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") void guardarEdicion(persona);
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
            onClick={() => void guardarEdicion(persona)}
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
          <Avatar nombre={persona.nombre} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">{persona.nombre}</p>
            <p className="text-xs text-slate-500">
              {persona.telefono ? `${persona.telefono} · ` : ""}
              {uso[persona.id] ? `${uso[persona.id]} asignaciones en total` : "sin asignaciones"}
              {persona.activo ? "" : " · inactivo"}
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-slate-300 transition hover:border-emerald-300/50 hover:text-white"
            onClick={() => {
              setEditando(persona.id);
              setBorradorNombre(persona.nombre);
              setBorradorTelefono(persona.telefono ?? "");
            }}
            title="Editar"
            type="button"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className={`flex h-8 w-8 items-center justify-center border transition ${
              persona.activo
                ? "border-white/10 text-slate-300 hover:border-amber-300/60 hover:text-amber-200"
                : "border-emerald-300/40 text-emerald-200"
            }`}
            onClick={() => void alternarActivo(persona)}
            title={persona.activo ? "Inactivar" : "Reactivar"}
            type="button"
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center border border-red-400/30 text-red-200 transition hover:border-red-300"
            onClick={() => setAEliminar(persona)}
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
    <Modal ancho="max-w-2xl" onClose={onCerrar} titulo={titulo}>
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
            placeholder={`Nombre ${etiqueta}`}
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

        {personas.length ? (
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
            {descripcion}
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
            : `Se eliminará a "${aEliminar?.nombre ?? ""}" de este catálogo.`
        }
        onCancel={() => setAEliminar(null)}
        onConfirm={async () => {
          if (!aEliminar) return;
          const { error: deleteError } = await acciones.eliminar(aEliminar.id);
          setAEliminar(null);
          if (deleteError) setError(deleteError);
          await onCambio();
        }}
        open={Boolean(aEliminar)}
        title={`Eliminar ${etiqueta}`}
      />
    </Modal>
  );
}
