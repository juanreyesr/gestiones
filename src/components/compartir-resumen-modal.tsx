"use client";

import { Check, Copy, Link2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  actualizarEnlaceResumen,
  crearEnlaceResumen,
  eliminarEnlaceResumen,
  type EnlaceResumen,
  enlaceResumenUrl,
  fetchEnlacesResumen,
} from "@/lib/resumen-enlaces";
import { ConfirmDialog } from "./confirm-dialog";
import { ModalPortal } from "./modal-portal";

/**
 * Administra los enlaces de solo lectura del "Resumen general" (los que se
 * mandan a jefatura). Quien abre el enlace ve todos los trimestres y anios y no
 * puede modificar nada; aqui se crean, se copian, se desactivan y se borran.
 */
export function CompartirResumenModal({ onClose }: { onClose: () => void }) {
  const [enlaces, setEnlaces] = useState<EnlaceResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [mostrarDocentes, setMostrarDocentes] = useState(false);
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [borrarTarget, setBorrarTarget] = useState<EnlaceResumen | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: fetchError } = await fetchEnlacesResumen();
    if (fetchError) setError(fetchError);
    else setEnlaces(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de los enlaces ya creados
    cargar();
  }, [cargar]);

  const handleCrear = async () => {
    const nombre = etiqueta.trim();
    if (!nombre || creando) return;
    setCreando(true);
    setError("");
    const { data, error: createError } = await crearEnlaceResumen(nombre, mostrarDocentes);
    setCreando(false);
    if (createError || !data) {
      setError(createError ?? "No se pudo crear el enlace.");
      return;
    }
    setEnlaces((current) => [data, ...current]);
    setEtiqueta("");
    setMostrarDocentes(false);
  };

  const handleCopiar = async (enlace: EnlaceResumen) => {
    const url = enlaceResumenUrl(enlace.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(enlace.id);
      setTimeout(() => setCopiado((current) => (current === enlace.id ? null : current)), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y copialo a mano.");
    }
  };

  const handleActivo = async (enlace: EnlaceResumen) => {
    const activo = !enlace.activo;
    setEnlaces((current) => current.map((item) => (item.id === enlace.id ? { ...item, activo } : item)));
    const { error: updateError } = await actualizarEnlaceResumen(enlace.id, { activo });
    if (updateError) {
      setError(updateError);
      setEnlaces((current) => current.map((item) => (item.id === enlace.id ? { ...item, activo: !activo } : item)));
    }
  };

  const handleBorrar = async () => {
    if (!borrarTarget) return;
    setBorrando(true);
    const { error: deleteError } = await eliminarEnlaceResumen(borrarTarget.id);
    setBorrando(false);
    if (deleteError) {
      setError(deleteError);
      setBorrarTarget(null);
      return;
    }
    setEnlaces((current) => current.filter((item) => item.id !== borrarTarget.id));
    setBorrarTarget(null);
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
        <div
          className="my-8 grid w-full max-w-2xl gap-4 border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Link2 className="h-5 w-5 text-emerald-300" />
                Compartir el resumen general
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Genera un enlace de solo lectura para jefatura. Quien lo abra ve todos los trimestres y todos los años,
                sin cuenta y sin poder editar ni borrar nada.
              </p>
            </div>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 border border-white/10 bg-white/6 p-4">
            <label className="grid gap-1.5 text-xs font-semibold uppercase text-slate-400">
              Para quien es el enlace
              <input
                className="field"
                onChange={(event) => setEtiqueta(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCrear();
                }}
                placeholder="Ej. Decanatura, Rectoria, Jefatura academica"
                value={etiqueta}
              />
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                checked={mostrarDocentes}
                className="mt-1"
                onChange={(event) => setMostrarDocentes(event.target.checked)}
                type="checkbox"
              />
              <span>
                Incluir nombres de docentes
                <span className="block text-xs text-slate-500">
                  Sin marcar (recomendado) el enlace muestra solo cursos y porcentajes, igual que el comparativo por
                  curso. Nunca se comparten el correo del docente ni las observaciones escritas.
                </span>
              </span>
            </label>

            <button
              className="inline-flex h-11 w-fit items-center justify-center gap-2 bg-emerald-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-40"
              disabled={!etiqueta.trim() || creando}
              onClick={() => void handleCrear()}
              type="button"
            >
              <Link2 className="h-4 w-4" />
              {creando ? "Creando..." : "Crear enlace"}
            </button>
          </div>

          {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}

          {cargando ? <p className="text-sm text-slate-400">Cargando enlaces...</p> : null}

          {!cargando && !enlaces.length ? (
            <p className="text-sm text-slate-400">Todavia no has creado ningun enlace.</p>
          ) : null}

          <div className="grid gap-3">
            {enlaces.map((enlace) => (
              <div key={enlace.id} className="grid gap-2 border border-white/10 bg-white/6 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{enlace.etiqueta}</div>
                    <div className="text-xs text-slate-500">
                      {enlace.activo ? "Activo" : "Desactivado"} · {enlace.vistas}{" "}
                      {enlace.vistas === 1 ? "apertura" : "aperturas"}
                      {enlace.mostrar_docentes ? " · con nombres de docentes" : " · sin nombres de docentes"}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 border border-white/10 bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-white/30"
                      onClick={() => void handleCopiar(enlace)}
                      type="button"
                    >
                      {copiado === enlace.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiado === enlace.id ? "Copiado" : "Copiar"}
                    </button>
                    <button
                      className="border border-white/10 bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-white/30"
                      onClick={() => void handleActivo(enlace)}
                      type="button"
                    >
                      {enlace.activo ? "Desactivar" : "Reactivar"}
                    </button>
                    <button
                      className="flex items-center justify-center border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-400/60"
                      onClick={() => setBorrarTarget(enlace)}
                      title="Borrar enlace"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="break-all text-xs text-slate-400">{enlaceResumenUrl(enlace.token)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        busy={borrando}
        message={`El enlace de "${borrarTarget?.etiqueta ?? ""}" dejara de funcionar para quien lo tenga guardado. Esta accion no se puede deshacer.`}
        onCancel={() => setBorrarTarget(null)}
        onConfirm={handleBorrar}
        open={Boolean(borrarTarget)}
        title="Borrar enlace"
      />
    </ModalPortal>
  );
}
