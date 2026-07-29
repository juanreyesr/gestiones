"use client";

import { Check, FileDown, History, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, INPUT, Modal } from "@/components/ui-comun";
import { deleteTemasDelAnio, guardarTemasDelAnio } from "@/lib/iglesia/predicas";
import { exportTemasToPdf } from "@/lib/iglesia/temas-pdf";
import { MESES_LABEL, type TemaAnioRow } from "@/lib/iglesia/types";

/**
 * Temas de predicas por anio. El tema de cada mes se define una vez y queda
 * precargado al crear ese mes en el calendario.
 *
 * Arranca mostrando el anio en curso; desde el selector se saltan los demas
 * anios cargados, y "Años anteriores" los pone todos uno debajo del otro.
 */
export function TemasPanel({
  onCerrar,
  onCambio,
  temas,
}: {
  onCerrar: () => void;
  onCambio: () => void | Promise<void>;
  temas: TemaAnioRow[];
}) {
  const anioActual = new Date().getFullYear();

  const aniosCargados = useMemo(
    () => [...new Set(temas.map((tema) => tema.anio))].sort((a, b) => b - a),
    [temas],
  );

  // El anio en curso siempre esta disponible aunque todavia no tenga temas, y
  // tambien el siguiente: es cuando se suele planificar.
  const aniosDisponibles = useMemo(
    () => [...new Set([anioActual + 1, anioActual, ...aniosCargados])].sort((a, b) => b - a),
    [anioActual, aniosCargados],
  );

  const [anio, setAnio] = useState(aniosCargados.includes(anioActual) ? anioActual : (aniosCargados[0] ?? anioActual));
  const [editando, setEditando] = useState(false);
  const [historial, setHistorial] = useState(false);
  const [borrador, setBorrador] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [borrarAnio, setBorrarAnio] = useState<number | null>(null);
  const [error, setError] = useState("");

  const temasDe = (delAnio: number) =>
    Array.from({ length: 12 }, (_, indice) => {
      const mes = indice + 1;
      return { mes, tema: temas.find((fila) => fila.anio === delAnio && fila.mes === mes)?.tema ?? "" };
    });

  const abrirEdicion = () => {
    setBorrador(temasDe(anio).map((fila) => fila.tema ?? ""));
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    const { error: guardarError } = await guardarTemasDelAnio(
      anio,
      borrador.map((tema, indice) => ({ mes: indice + 1, tema })),
    );
    setGuardando(false);
    if (guardarError) {
      setError(guardarError);
      return;
    }
    setEditando(false);
    setError("");
    await onCambio();
  };

  const exportar = async (todos: boolean) => {
    setExportando(true);
    try {
      const grupos = todos
        ? aniosCargados.map((delAnio) => ({ anio: delAnio, temas: temasDe(delAnio) }))
        : [{ anio, temas: temasDe(anio) }];
      await exportTemasToPdf(grupos);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo generar el PDF.");
    }
    setExportando(false);
  };

  const filas = temasDe(anio);
  const definidos = filas.filter((fila) => fila.tema.trim()).length;

  return (
    <Modal ancho="max-w-3xl" onClose={onCerrar} titulo="Temas de prédicas por año">
      <div className="grid gap-4">
        <ErrorBanner message={error} />

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-emerald-300/60"
            disabled={editando}
            onChange={(evento) => setAnio(Number(evento.target.value))}
            value={anio}
          >
            {aniosDisponibles.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
                {aniosCargados.includes(opcion) ? "" : " (vacío)"}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-500">{definidos}/12 meses con tema</span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {editando ? (
              <>
                <button className={BTN_GHOST} onClick={() => setEditando(false)} type="button">
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button className={BTN_PRIMARY} disabled={guardando} onClick={() => void guardar()} type="button">
                  <Check className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </>
            ) : (
              <>
                <button
                  className={`${BTN_GHOST} ${historial ? "border-emerald-300/50 text-emerald-100" : ""}`}
                  onClick={() => setHistorial((previo) => !previo)}
                  type="button"
                >
                  <History className="h-4 w-4" />
                  Años anteriores
                </button>
                <button className={BTN_PRIMARY} onClick={abrirEdicion} type="button">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              </>
            )}
          </div>
        </div>

        {editando ? (
          <div className="grid gap-2">
            {MESES_LABEL.map((etiqueta, indice) => (
              <label className="grid grid-cols-[110px_1fr] items-center gap-2" key={etiqueta}>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{etiqueta}</span>
                <input
                  className={INPUT}
                  onChange={(evento) =>
                    setBorrador((previo) => previo.map((valor, posicion) => (posicion === indice ? evento.target.value : valor)))
                  }
                  placeholder="Sin definir"
                  value={borrador[indice] ?? ""}
                />
              </label>
            ))}

            {aniosCargados.includes(anio) ? (
              <button
                className="mt-1 w-fit text-xs font-semibold text-red-300 transition hover:text-red-200"
                onClick={() => setBorrarAnio(anio)}
                type="button"
              >
                <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                Eliminar todos los temas de {anio}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/6 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-32 px-3 py-2 text-left">Mes</th>
                  <th className="px-3 py-2 text-left">Tema</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr className="border-t border-white/8" key={fila.mes}>
                    <td className="px-3 py-2 font-semibold text-slate-300">{MESES_LABEL[fila.mes - 1]}</td>
                    <td className={`px-3 py-2 ${fila.tema.trim() ? "text-slate-100" : "text-slate-600 italic"}`}>
                      {fila.tema.trim() || "Sin definir"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historial && !editando ? (
          <div className="grid gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Todos los años cargados</p>
            {aniosCargados.length ? (
              <div className="max-h-72 overflow-y-auto border border-white/10">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Mes</th>
                      {aniosCargados.map((delAnio) => (
                        <th className="px-2 py-1.5 text-left" key={delAnio}>
                          {delAnio}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MESES_LABEL.map((etiqueta, indice) => (
                      <tr className="border-t border-white/8" key={etiqueta}>
                        <td className="px-2 py-1.5 font-semibold text-slate-400">{etiqueta}</td>
                        {aniosCargados.map((delAnio) => {
                          const tema = temas.find((fila) => fila.anio === delAnio && fila.mes === indice + 1)?.tema ?? "";
                          return (
                            <td className={`px-2 py-1.5 ${tema ? "text-slate-200" : "text-slate-600"}`} key={delAnio}>
                              {tema || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>Todavía no hay temas cargados de ningún año.</EmptyState>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <p className="text-xs text-slate-500">
            El tema del mes se copia solo al crear ese mes en el calendario de prédicas.
          </p>
          <div className="flex flex-wrap gap-2">
            {historial && aniosCargados.length > 1 ? (
              <button className={BTN_GHOST} disabled={exportando} onClick={() => void exportar(true)} type="button">
                <FileDown className="h-4 w-4" />
                PDF de todos los años
              </button>
            ) : null}
            <button className={BTN_PRIMARY} disabled={exportando} onClick={() => void exportar(false)} type="button">
              <FileDown className="h-4 w-4" />
              {exportando ? "Generando..." : `Exportar ${anio} en PDF`}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        message={`Se eliminarán los temas de ${borrarAnio ?? ""}. Los meses que ya estén creados en el calendario conservan el tema que tengan escrito.`}
        onCancel={() => setBorrarAnio(null)}
        onConfirm={async () => {
          if (!borrarAnio) return;
          const { error: deleteError } = await deleteTemasDelAnio(borrarAnio);
          setBorrarAnio(null);
          if (deleteError) {
            setError(deleteError);
            return;
          }
          setEditando(false);
          await onCambio();
        }}
        open={Boolean(borrarAnio)}
        title="Eliminar temas del año"
      />
    </Modal>
  );
}

/** Boton de la barra superior; vive aqui para no ensuciar la vista principal. */
export function BotonTemas({ onClick }: { onClick: () => void }) {
  return (
    <button className={BTN_GHOST} onClick={onClick} type="button">
      <Plus className="h-4 w-4" />
      Temas del año
    </button>
  );
}
