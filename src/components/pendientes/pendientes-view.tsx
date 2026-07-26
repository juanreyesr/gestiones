"use client";

import { Archive, ArchiveRestore, LayoutDashboard, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { hoyISO } from "@/lib/fechas";
import { fetchResumenTableros, type ResumenTablero } from "@/lib/pendientes/items";
import {
  deleteTablero,
  fetchTableros,
  insertTableroConGrupos,
  updateTablero,
} from "@/lib/pendientes/tableros";
import { COLORES_TABLERO, type TableroRow } from "@/lib/pendientes/types";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT, Modal } from "@/components/ui-comun";
import { TableroDetalle } from "./tablero-detalle";

export function PendientesView() {
  const [tableros, setTableros] = useState<TableroRow[]>([]);
  const [resumen, setResumen] = useState<Record<string, ResumenTablero>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<TableroRow | "nuevo" | null>(null);
  const [aEliminar, setAEliminar] = useState<TableroRow | null>(null);
  const [verArchivados, setVerArchivados] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [tablerosRes, resumenRes] = await Promise.all([fetchTableros(), fetchResumenTableros(hoyISO())]);
    setTableros(tablerosRes.data);
    setResumen(resumenRes.data);
    setError(tablerosRes.error ?? "");
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de tableros
    void cargar();
  }, [cargar]);

  const tableroAbierto = abierto ? tableros.find((tablero) => tablero.id === abierto) : null;

  if (tableroAbierto) {
    return (
      <>
        <TableroDetalle
          onEditarTablero={() => setFormulario(tableroAbierto)}
          onVolver={() => {
            setAbierto(null);
            void cargar();
          }}
          tablero={tableroAbierto}
        />
        {/* El formulario tambien vive en esta rama: desde el tablero abierto se
            puede renombrar o recolorear sin volver al listado. */}
        {formulario && formulario !== "nuevo" ? (
          <FormularioTablero
            onCerrar={() => setFormulario(null)}
            onGuardado={async () => {
              setFormulario(null);
              await cargar();
            }}
            tablero={formulario}
          />
        ) : null}
      </>
    );
  }

  const visibles = tableros.filter((tablero) => tablero.archivado === verArchivados);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <ListChecks className="h-5 w-5 text-emerald-200" />
          Gestión de pendientes
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <button className={BTN_GHOST} onClick={() => setVerArchivados((previo) => !previo)} type="button">
            {verArchivados ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {verArchivados ? "Ver activos" : "Archivados"}
          </button>
          <button className={BTN_PRIMARY} onClick={() => setFormulario("nuevo")} type="button">
            <Plus className="h-4 w-4" />
            Nuevo tablero
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Cada tablero agrupa los pendientes de un frente de trabajo: un ministerio, un proyecto o el mes en curso.
        Dentro puedes verlos como tabla, kanban, calendario o cronograma.
      </p>

      <ErrorBanner message={error} />

      {cargando ? (
        <p className="text-sm text-slate-300">Cargando tableros...</p>
      ) : visibles.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((tablero) => {
            const datos = resumen[tablero.id] ?? { total: 0, listos: 0, vencidos: 0 };
            const progreso = datos.total ? Math.round((datos.listos / datos.total) * 100) : 0;

            return (
              <article
                className="group relative cursor-pointer border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12"
                key={tablero.id}
                onClick={() => setAbierto(tablero.id)}
              >
                <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-slate-200 hover:border-emerald-300/50"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      setFormulario(tablero);
                    }}
                    title="Editar tablero"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-slate-200 hover:border-emerald-300/50"
                    onClick={async (evento) => {
                      evento.stopPropagation();
                      await updateTablero(tablero.id, { archivado: !tablero.archivado });
                      await cargar();
                    }}
                    title={tablero.archivado ? "Restaurar tablero" : "Archivar tablero"}
                    type="button"
                  >
                    {tablero.archivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    className="flex h-7 w-7 items-center justify-center border border-red-400/30 bg-slate-950/80 text-red-200 hover:border-red-300"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      setAEliminar(tablero);
                    }}
                    title="Eliminar tablero"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-3 h-1.5 w-12" style={{ backgroundColor: tablero.color }} />
                <h4 className="pr-24 text-base font-semibold text-white">{tablero.nombre}</h4>
                {tablero.descripcion ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{tablero.descripcion}</p>
                ) : null}

                <div className="mt-4 flex items-center gap-3 text-xs font-semibold">
                  <span className="text-slate-300">{datos.total} pendientes</span>
                  <span className="text-emerald-300">{datos.listos} listos</span>
                  {datos.vencidos ? <span className="text-red-300">{datos.vencidos} vencidos</span> : null}
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden bg-white/10">
                  <div className="h-full bg-emerald-400" style={{ width: `${progreso}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState>
          {verArchivados ? (
            "No hay tableros archivados."
          ) : (
            <>
              <LayoutDashboard className="mx-auto mb-2 h-6 w-6 text-slate-500" />
              Todavía no hay tableros. Crea el primero (por ejemplo &quot;Ministerio de jóvenes&quot;) y empieza a
              cargar pendientes.
            </>
          )}
        </EmptyState>
      )}

      {formulario ? (
        <FormularioTablero
          onCerrar={() => setFormulario(null)}
          onGuardado={async () => {
            setFormulario(null);
            await cargar();
          }}
          tablero={formulario === "nuevo" ? null : formulario}
        />
      ) : null}

      <ConfirmDialog
        message={`Se eliminará el tablero "${aEliminar?.nombre ?? ""}" con todos sus grupos, pendientes y actualizaciones.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={async () => {
          if (!aEliminar) return;
          const { error: deleteError } = await deleteTablero(aEliminar.id);
          setAEliminar(null);
          if (deleteError) setError(deleteError);
          await cargar();
        }}
        open={Boolean(aEliminar)}
        title="Eliminar tablero"
      />
    </div>
  );
}

function FormularioTablero({
  onCerrar,
  onGuardado,
  tablero,
}: {
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
  tablero: TableroRow | null;
}) {
  const [nombre, setNombre] = useState(tablero?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(tablero?.descripcion ?? "");
  const [color, setColor] = useState(tablero?.color ?? COLORES_TABLERO[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const payload = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, color };
    const { error: guardarError } = tablero
      ? await updateTablero(tablero.id, payload)
      : await insertTableroConGrupos(payload);
    setGuardando(false);
    if (guardarError) {
      setError(guardarError);
      return;
    }
    await onGuardado();
  };

  return (
    <Modal ancho="max-w-md" onClose={onCerrar} titulo={tablero ? "Editar tablero" : "Nuevo tablero"}>
      <form
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          void guardar();
        }}
      >
        <ErrorBanner message={error} />

        <Field label="Nombre">
          <input
            autoFocus
            className={INPUT}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="Ej. Ministerio de jóvenes"
            value={nombre}
          />
        </Field>

        <Field label="Descripción (opcional)">
          <textarea
            className={`${INPUT} min-h-[80px]`}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder="¿De qué se hace cargo este tablero?"
            value={descripcion}
          />
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORES_TABLERO.map((opcion) => (
              <button
                className={`h-7 w-7 border-2 transition ${color === opcion ? "border-white" : "border-transparent"}`}
                key={opcion}
                onClick={() => setColor(opcion)}
                style={{ backgroundColor: opcion }}
                type="button"
              />
            ))}
          </div>
        </Field>

        {tablero ? null : (
          <p className="text-xs text-slate-500">
            El tablero se crea con tres grupos listos para usar: Esta semana, Próximamente y En espera.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cancelar
          </button>
          <button className={BTN_PRIMARY} disabled={guardando || !nombre.trim()} type="submit">
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
