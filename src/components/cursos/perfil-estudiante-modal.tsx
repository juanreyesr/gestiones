"use client";

import { CheckCircle2, CircleAlert, UserCircle2, X, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { fetchPerfilEstudianteGlobal, urlFirmadaFotoPerfil, type PerfilEstudianteGlobal } from "@/lib/cursos/perfil-estudiante";
import { faltantesPerfil, fetchPreguntasPerfil, perfilCompleto, type PerfilPreguntaRow } from "@/lib/cursos/perfil-preguntas";
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
  const [preguntas, setPreguntas] = useState<PerfilPreguntaRow[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setCargando(true);
      const [{ data, error: fetchError }, { data: preguntasData }] = await Promise.all([
        fetchPerfilEstudianteGlobal(estudianteId),
        fetchPreguntasPerfil(),
      ]);
      setPerfil(data);
      setPreguntas(preguntasData);
      setError(fetchError ?? "");
      if (data?.foto_path) {
        const { url } = await urlFirmadaFotoPerfil(data.foto_path);
        setFotoUrl(url);
      }
      setCargando(false);
    })();
  }, [estudianteId]);

  const respuestas = perfil?.perfil_respuestas ?? {};
  const activas = preguntas.filter((p) => p.activa);
  // Se muestran las preguntas activas y, si las hubiera, respuestas a preguntas ya desactivadas.
  const preguntasVisibles = preguntas.filter((p) => p.activa || respuestas[p.id]?.trim());
  const completo = perfilCompleto(perfil, activas);
  const faltan = faltantesPerfil(perfil, activas);
  const sinDatos =
    perfil && !perfil.foto_path && !perfil.fecha_nacimiento && !perfil.pais && !Object.values(respuestas).some((r) => r?.trim());

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
              <p
                className={`flex items-center gap-2 border px-3 py-2 text-xs font-semibold ${
                  completo ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-amber-300/40 bg-amber-300/10 text-amber-100"
                }`}
              >
                {completo ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                {completo ? "Perfil completo" : `Perfil incompleto: falta ${faltan.join(", ")}`}
              </p>

              <div className="flex items-center gap-4">
                {fotoUrl ? (
                  <button
                    className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/6"
                    onClick={() => setFotoAmpliada(true)}
                    title="Ver foto en grande"
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no apta para el optimizador de imagenes de Next */}
                    <img alt={`Foto de ${estudianteNombre}`} className="h-full w-full object-cover" src={fotoUrl} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </span>
                  </button>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6">
                    <UserCircle2 className="h-10 w-10 text-slate-500" />
                  </div>
                )}
                <div>
                  {perfil?.fecha_nacimiento ? (
                    <p className="text-sm text-slate-200">Nace: {formatearFecha(perfil.fecha_nacimiento)}</p>
                  ) : null}
                  {perfil?.pais ? <p className="text-sm text-slate-200">País: {perfil.pais}</p> : null}
                  {fotoUrl ? <p className="mt-1 text-xs text-slate-500">Toca la foto para verla en grande.</p> : null}
                </div>
              </div>

              {preguntasVisibles.map((pregunta) => (
                <div key={pregunta.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {pregunta.texto}
                    {!pregunta.activa ? " (pregunta desactivada)" : ""}
                  </p>
                  {respuestas[pregunta.id]?.trim() ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-200">{respuestas[pregunta.id]}</p>
                  ) : (
                    <p className="text-sm italic text-slate-500">Sin responder</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {fotoAmpliada && fotoUrl ? <FotoAmpliada alt={`Foto de ${estudianteNombre}`} onClose={() => setFotoAmpliada(false)} url={fotoUrl} /> : null}
    </ModalPortal>
  );
}

/** Visor a pantalla completa de una foto (se cierra tocando fuera o con la X). */
export function FotoAmpliada({ alt, onClose, url }: { alt: string; onClose: () => void; url: string }) {
  useEffect(() => {
    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <button
        aria-label="Cerrar"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={onClose}
        type="button"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no apta para el optimizador de imagenes de Next */}
      <img alt={alt} className="max-h-[90vh] max-w-full object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} src={url} />
    </div>
  );
}
