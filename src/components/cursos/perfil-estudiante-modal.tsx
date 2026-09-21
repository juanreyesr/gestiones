"use client";

import { UserCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fetchPerfilEstudianteGlobal, urlFirmadaFotoPerfil, type PerfilEstudianteGlobal } from "@/lib/cursos/perfil-estudiante";
import { formatearFecha } from "@/lib/cursos/types";

export function PerfilEstudianteModal({
  estudianteId,
  estudianteNombre,
  onClose,
}: {
  estudianteId: string;
  estudianteNombre: string;
  onClose: () => void;
}) {
  const [perfil, setPerfil] = useState<PerfilEstudianteGlobal | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setCargando(true);
      const { data, error: fetchError } = await fetchPerfilEstudianteGlobal(estudianteId);
      setPerfil(data);
      setError(fetchError ?? "");
      if (data?.foto_path) {
        const { url } = await urlFirmadaFotoPerfil(data.foto_path);
        setFotoUrl(url);
      }
      setCargando(false);
    })();
  }, [estudianteId]);

  const sinDatos =
    perfil && !perfil.foto_path && !perfil.fecha_nacimiento && !perfil.pais && !perfil.reflexion_quien_soy && !perfil.reflexion_proposito && !perfil.reflexion_recuerdo;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Perfil de {estudianteNombre}</h3>
            <button className="text-slate-400 hover:text-white" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          {cargando ? (
            <p className="py-8 text-center text-sm text-slate-400">Cargando...</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-300">{error}</p>
          ) : sinDatos ? (
            <p className="py-8 text-center text-sm text-slate-400">Este estudiante aún no ha llenado su ficha de perfil.</p>
          ) : (
            <div className="grid gap-4 overflow-y-auto pr-1">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/6">
                  {fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no apta para el optimizador de imagenes de Next
                    <img alt="" className="h-full w-full object-cover" src={fotoUrl} />
                  ) : (
                    <UserCircle2 className="h-10 w-10 text-slate-500" />
                  )}
                </div>
                <div>
                  {perfil?.fecha_nacimiento ? (
                    <p className="text-sm text-slate-200">Nace: {formatearFecha(perfil.fecha_nacimiento)}</p>
                  ) : null}
                  {perfil?.pais ? <p className="text-sm text-slate-200">País: {perfil.pais}</p> : null}
                </div>
              </div>

              {perfil?.reflexion_quien_soy ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">¿Quién soy?</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-200">{perfil.reflexion_quien_soy}</p>
                </div>
              ) : null}
              {perfil?.reflexion_proposito ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">¿Cuál es mi propósito?</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-200">{perfil.reflexion_proposito}</p>
                </div>
              ) : null}
              {perfil?.reflexion_recuerdo ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">¿Cómo quiero ser recordado?</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-200">{perfil.reflexion_recuerdo}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
