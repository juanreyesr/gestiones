"use client";

import { CheckCircle2, UserCircle2, X, ZoomIn } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { FotoAmpliada } from "@/components/cursos/perfil-estudiante-modal";
import { descripcionEnIdioma } from "@/lib/estudiante/i18n";
import {
  fetchMiFicha,
  fetchPreguntasMiPerfil,
  guardarMiFicha,
  obtenerUrlMiFoto,
  subirMiFoto,
  type MiFicha,
  type MiPreguntaPerfil,
} from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";
import { CampoFecha } from "@/components/campo-fecha";

const MAX_BYTES_FOTO = 5 * 1024 * 1024; // 5 MB, igual que valida el servidor

export function PerfilModal({ onClose, onGuardado }: { onClose: () => void; onGuardado?: () => void }) {
  const [ficha, setFicha] = useState<MiFicha | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [pais, setPais] = useState("");
  const [preguntas, setPreguntas] = useState<MiPreguntaPerfil[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const { idioma, t } = useIdioma();

  useEffect(() => {
    (async () => {
      setCargando(true);
      const [{ data }, { data: preguntasData }] = await Promise.all([fetchMiFicha(), fetchPreguntasMiPerfil()]);
      setPreguntas(preguntasData);
      if (data) {
        setFicha(data);
        setFechaNacimiento(data.fechaNacimiento ?? "");
        setPais(data.pais ?? "");
        setRespuestas(data.respuestas);
        if (data.tieneFoto) {
          const { url } = await obtenerUrlMiFoto();
          setFotoUrl(url);
        }
      }
      setCargando(false);
    })();
  }, []);

  const handleSeleccionarFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    if (archivo.size > MAX_BYTES_FOTO) {
      setError(t("perfil_foto_max_error"));
      return;
    }
    setSubiendoFoto(true);
    setError("");
    const { error: subirError } = await subirMiFoto(archivo);
    if (subirError) {
      setSubiendoFoto(false);
      setError(subirError);
      return;
    }
    const { url } = await obtenerUrlMiFoto();
    setFotoUrl(url);
    setFicha((prev) => (prev ? { ...prev, tieneFoto: true } : prev));
    setSubiendoFoto(false);
    onGuardado?.();
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setError("");
    setMensaje("");
    const { error: guardarError } = await guardarMiFicha({
      fechaNacimiento: fechaNacimiento || null,
      pais: pais.trim() || null,
      respuestas: Object.fromEntries(preguntas.map((p) => [p.id, (respuestas[p.id] ?? "").trim()])),
    });
    setGuardando(false);
    if (guardarError) {
      setError(guardarError);
      return;
    }
    setMensaje(t("perfil_guardado_exito"));
    onGuardado?.();
  };

  const completo =
    Boolean(ficha?.tieneFoto) &&
    Boolean(fechaNacimiento) &&
    Boolean(pais.trim()) &&
    preguntas.every((p) => Boolean(respuestas[p.id]?.trim()));

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("perfil_titulo")}</h3>
              <p className="text-xs text-slate-400">{t("perfil_sub")}</p>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {cargando ? (
            <p className="py-10 text-center text-sm text-slate-400">{t("central_cargando")}</p>
          ) : (
            <div className="grid gap-4 overflow-y-auto pr-1">
              <div className="flex items-center gap-4">
                {fotoUrl ? (
                  <button
                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100"
                    onClick={() => setFotoAmpliada(true)}
                    title={t("perfil_ver_foto")}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no apta para el optimizador de imagenes de Next */}
                    <img alt="" className="h-full w-full object-cover" src={fotoUrl} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </span>
                  </button>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                    <UserCircle2 className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t("perfil_foto")}</p>
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-60"
                    disabled={subiendoFoto}
                    onClick={() => inputArchivoRef.current?.click()}
                    type="button"
                  >
                    {subiendoFoto ? t("perfil_subiendo") : ficha?.tieneFoto ? t("perfil_cambiar_foto") : t("perfil_subir_foto")}
                  </button>
                  <p className="mt-1 text-[11px] text-slate-400">{t("perfil_foto_max")}</p>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={subiendoFoto}
                    onChange={handleSeleccionarFoto}
                    ref={inputArchivoRef}
                    type="file"
                  />
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("perfil_fecha_nacimiento")}</span>
                <CampoFecha
                  anioDesde={1920}
                  anioHasta={new Date().getFullYear()}
                  className="field-light"
                  onChange={setFechaNacimiento}
                  opcional
                  value={fechaNacimiento}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("perfil_pais")}</span>
                <input className="field-light" onChange={(event) => setPais(event.target.value)} value={pais} />
              </label>

              {preguntas.map((pregunta) => (
                <label className="grid gap-1.5" key={pregunta.id}>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {descripcionEnIdioma(idioma, pregunta.texto, pregunta.textoEn, pregunta.textoPt)}
                  </span>
                  <textarea
                    className="field-light resize-none"
                    maxLength={2000}
                    onChange={(event) => setRespuestas((prev) => ({ ...prev, [pregunta.id]: event.target.value }))}
                    rows={2}
                    value={respuestas[pregunta.id] ?? ""}
                  />
                </label>
              ))}

              {completo ? (
                <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("perfil_completo")}
                </p>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("perfil_requisitos")}</p>
              )}

              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
              {mensaje ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mensaje}</p> : null}

              <button
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                disabled={guardando}
                onClick={() => void handleGuardar()}
                type="button"
              >
                {guardando ? t("perfil_guardando") : t("perfil_guardar")}
              </button>
            </div>
          )}
        </div>
      </div>
      {fotoAmpliada && fotoUrl ? <FotoAmpliada alt={t("perfil_foto")} onClose={() => setFotoAmpliada(false)} url={fotoUrl} /> : null}
    </ModalPortal>
  );
}
