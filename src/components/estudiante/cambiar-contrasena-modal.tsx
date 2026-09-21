"use client";

import { useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { cambiarMiContrasena, omitirCambioContrasena } from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";

export function CambiarContrasenaModal({ onCambiada, onClose }: { onCambiada: () => void; onClose: () => void }) {
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [noVolverPreguntar, setNoVolverPreguntar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { t } = useIdioma();

  const handleAhoraNo = async () => {
    if (noVolverPreguntar) await omitirCambioContrasena();
    onClose();
  };

  const handleGuardar = async () => {
    if (nueva.length < 8) {
      setError(t("contrasena_error_longitud"));
      return;
    }
    if (nueva !== confirmar) {
      setError(t("contrasena_error_coincide"));
      return;
    }
    setGuardando(true);
    const { error: cambiarError } = await cambiarMiContrasena(nueva);
    setGuardando(false);
    if (cambiarError) {
      setError(cambiarError);
      return;
    }
    onCambiada();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-1 text-lg font-semibold">{t("contrasena_titulo")}</h3>
          <p className="mb-5 text-sm text-slate-500">{t("contrasena_sub")}</p>

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("contrasena_nueva")}</span>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                onChange={(event) => setNueva(event.target.value)}
                type="password"
                value={nueva}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("contrasena_confirmar")}</span>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                onChange={(event) => setConfirmar(event.target.value)}
                type="password"
                value={confirmar}
              />
            </label>
          </div>

          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <input checked={noVolverPreguntar} onChange={(event) => setNoVolverPreguntar(event.target.checked)} type="checkbox" />
            {t("contrasena_no_volver_preguntar")}
          </label>

          <div className="mt-5 flex justify-end gap-3">
            <button
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
              onClick={() => void handleAhoraNo()}
              type="button"
            >
              {t("contrasena_ahora_no")}
            </button>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              disabled={guardando}
              onClick={handleGuardar}
              type="button"
            >
              {guardando ? t("contrasena_guardando") : t("contrasena_guardar")}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
