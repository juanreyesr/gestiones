"use client";

import { Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { deleteCampana, fetchCampanas, updateCampana } from "@/lib/encuestas/campanas";
import type { CampanaConConteo } from "@/lib/encuestas/types";
import { ConfirmDialog } from "../confirm-dialog";
import { CampanaCompartir } from "./campana-compartir";
import { CampanaForm } from "./campana-form";
import { BTN_PRIMARY, CardBox, Chip, EmptyState, ErrorBanner } from "./ui";

export function CampanasList({ onSeleccionarCampana }: { onSeleccionarCampana: (campana: CampanaConConteo) => void }) {
  const [campanas, setCampanas] = useState<CampanaConConteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formAbierto, setFormAbierto] = useState<{ campana: CampanaConConteo | null } | null>(null);
  const [compartiendo, setCompartiendo] = useState<CampanaConConteo | null>(null);
  const [borrando, setBorrando] = useState<CampanaConConteo | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchCampanas();
    setCampanas(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de campanas al montar la pestana
    void cargar();
  }, [cargar]);

  const handleToggleActiva = async (campana: CampanaConConteo) => {
    await updateCampana(campana.id, { activa: !campana.activa });
    await cargar();
  };

  const handleBorrar = async () => {
    if (!borrando) return;
    const { error: deleteError } = await deleteCampana(borrando.id);
    if (deleteError) {
      setError(deleteError);
      setBorrando(null);
      return;
    }
    setBorrando(null);
    await cargar();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Campañas</h3>
        <button className={BTN_PRIMARY} onClick={() => setFormAbierto({ campana: null })} type="button">
          <Plus className="h-4 w-4" />
          Nueva campaña
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-slate-400">Cargando campañas...</p>
      ) : campanas.length === 0 ? (
        <EmptyState>Aún no has creado ninguna campaña. Crea una para el año que quieras medir.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {campanas.map((campana) => (
            <CardBox key={campana.id} onClick={() => onSeleccionarCampana(campana)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip className="border-emerald-300/40 bg-emerald-300/10 text-emerald-200">Año {campana.anio}</Chip>
                    <Chip
                      className={
                        campana.activa
                          ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                          : "border-slate-400/30 bg-slate-400/10 text-slate-300"
                      }
                    >
                      {campana.activa ? "Activa" : "Cerrada"}
                    </Chip>
                  </div>
                  <p className="mt-2 truncate text-base font-semibold text-white">{campana.titulo}</p>
                  {campana.gestionesjj_carreras ? <p className="mt-1 text-xs text-slate-400">{campana.gestionesjj_carreras.nombre}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {campana.respuestasCount} {campana.respuestasCount === 1 ? "respuesta" : "respuestas"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                <button
                  className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-slate-300 transition hover:border-emerald-300/50"
                  onClick={() => setCompartiendo(campana)}
                  title="Compartir QR/enlace"
                  type="button"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-slate-300 transition hover:border-emerald-300/50"
                  onClick={() => setFormAbierto({ campana })}
                  title="Editar"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="h-8 shrink-0 border border-white/10 bg-white/8 px-2.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-300/50"
                  onClick={() => void handleToggleActiva(campana)}
                  type="button"
                >
                  {campana.activa ? "Cerrar" : "Reactivar"}
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/8 text-red-300 transition hover:border-red-400/60"
                  onClick={() => setBorrando(campana)}
                  title="Borrar"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardBox>
          ))}
        </div>
      )}

      {formAbierto ? (
        <CampanaForm
          campana={formAbierto.campana}
          onClose={() => setFormAbierto(null)}
          onSaved={() => {
            setFormAbierto(null);
            void cargar();
          }}
        />
      ) : null}

      {compartiendo ? <CampanaCompartir campana={compartiendo} onClose={() => setCompartiendo(null)} /> : null}

      <ConfirmDialog
        message={`¿Borrar la campaña "${borrando?.titulo ?? ""}" y todas sus respuestas? Esta acción no se puede deshacer.`}
        onCancel={() => setBorrando(null)}
        onConfirm={() => void handleBorrar()}
        open={Boolean(borrando)}
        title="Borrar campaña"
      />
    </div>
  );
}
