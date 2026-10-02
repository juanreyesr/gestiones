"use client";

import { Mic, Pause, Play, RotateCcw, Send, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioNota } from "@/components/audio-nota";
import type { Idioma } from "@/lib/cursos/types";
import { traducir } from "@/lib/estudiante/i18n";

export const MAX_SEGUNDOS_NOTA_VOZ = 7 * 60;

// Voz a 48 kbps: 7 minutos ≈ 2.5 MB, muy por debajo del límite de 20 MB.
const BITS_POR_SEGUNDO = 48_000;

// Chrome/Android/Firefox graban webm u ogg (Opus); Safari/iPhone graba mp4 (AAC).
const FORMATOS = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

type Estado = "inactivo" | "grabando" | "pausado" | "listo";

function elegirFormato(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return FORMATOS.find((formato) => MediaRecorder.isTypeSupported(formato));
}

function extensionPara(mime: string) {
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function mmss(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type WakeLock = { release: () => Promise<void> };

/**
 * Graba una nota de voz en el navegador (hasta 7 minutos, con pausa) y la
 * entrega como archivo de audio. El estudiante la escucha antes de enviarla;
 * si el envío falla, la grabación no se pierde.
 */
export function GrabadorNotaVoz({
  disabled,
  idioma,
  onEnviar,
}: {
  disabled: boolean;
  idioma: Idioma;
  /** Devuelve false si el envío falló (la grabación se conserva para reintentar). */
  onEnviar: (archivo: File) => Promise<boolean>;
}) {
  const t = (clave: string) => traducir(idioma, clave);
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [segundos, setSegundos] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const acumuladoRef = useRef(0); // ms grabados antes del tramo actual
  const inicioTramoRef = useRef<number | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLock | null>(null);

  const transcurridoMs = () => acumuladoRef.current + (inicioTramoRef.current ? Date.now() - inicioTramoRef.current : 0);

  const liberarRecursos = useCallback(() => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    intervaloRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }, []);

  const detener = useCallback(() => {
    const recorder = recorderRef.current;
    if (inicioTramoRef.current) {
      acumuladoRef.current += Date.now() - inicioTramoRef.current;
      inicioTramoRef.current = null;
    }
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  // Al salir de la página: corta el micrófono y libera el audio en memoria.
  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      liberarRecursos();
    },
    [liberarRecursos],
  );
  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const iniciar = async () => {
    setError("");
    setAviso("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("voz_no_soportado"));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError(t("voz_sin_permiso"));
      return;
    }

    const formato = elegirFormato();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { ...(formato ? { mimeType: formato } : {}), audioBitsPerSecond: BITS_POR_SEGUNDO });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError(t("voz_no_soportado"));
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    acumuladoRef.current = 0;
    inicioTramoRef.current = Date.now();
    setSegundos(0);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const tipo = recorder.mimeType || formato || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: tipo });
      blobRef.current = blob;
      setAudioUrl(URL.createObjectURL(blob));
      setSegundos(acumuladoRef.current / 1000);
      setEstado("listo");
      liberarRecursos();
    };

    // Trozos de 1 s: si algo falla a mitad, no se pierde todo lo grabado.
    recorder.start(1000);
    setEstado("grabando");

    // Evita que la pantalla del teléfono se apague (y corte la grabación) en notas largas.
    try {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<WakeLock> } }).wakeLock;
      wakeLockRef.current = (await wakeLock?.request("screen")) ?? null;
    } catch {
      // No disponible: se graba igual.
    }

    intervaloRef.current = setInterval(() => {
      const ms = transcurridoMs();
      setSegundos(ms / 1000);
      if (ms >= MAX_SEGUNDOS_NOTA_VOZ * 1000) {
        setAviso(t("voz_limite"));
        detener();
      }
    }, 250);
  };

  const pausar = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording" || typeof recorder.pause !== "function") return;
    recorder.pause();
    if (inicioTramoRef.current) acumuladoRef.current += Date.now() - inicioTramoRef.current;
    inicioTramoRef.current = null;
    setEstado("pausado");
  };

  const continuar = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    inicioTramoRef.current = Date.now();
    setEstado("grabando");
  };

  const descartar = () => {
    blobRef.current = null;
    setAudioUrl(null);
    setSegundos(0);
    setAviso("");
    setError("");
    setEstado("inactivo");
  };

  const enviar = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const tipoBase = blob.type.split(";")[0] || "audio/webm";
    const ahora = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const nombre = `nota-de-voz-${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}.${extensionPara(tipoBase)}`;
    setEnviando(true);
    const ok = await onEnviar(new File([blob], nombre, { type: tipoBase }));
    setEnviando(false);
    if (ok) descartar();
  };

  const boton =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-60";

  return (
    <div className="flex flex-col items-start gap-1">
      {estado === "inactivo" ? (
        <button className={boton} disabled={disabled} onClick={() => void iniciar()} type="button">
          <Mic className="h-3.5 w-3.5 text-rose-500" />
          {t("voz_grabar")}
        </button>
      ) : null}

      {estado === "grabando" || estado === "pausado" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${estado === "grabando" ? "animate-pulse bg-rose-500" : "bg-slate-400"}`} />
          <span className="text-xs font-semibold tabular-nums text-rose-700">
            {estado === "grabando" ? t("voz_grabando") : t("voz_pausada")} {mmss(segundos)} / {mmss(MAX_SEGUNDOS_NOTA_VOZ)}
          </span>
          {estado === "grabando" ? (
            <button className={boton} onClick={pausar} type="button">
              <Pause className="h-3.5 w-3.5" />
              {t("voz_pausar")}
            </button>
          ) : (
            <button className={boton} onClick={continuar} type="button">
              <Play className="h-3.5 w-3.5" />
              {t("voz_continuar")}
            </button>
          )}
          <button className={boton} onClick={detener} type="button">
            <Square className="h-3.5 w-3.5 text-rose-500" />
            {t("voz_terminar")}
          </button>
        </div>
      ) : null}

      {estado === "listo" && audioUrl ? (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <span className="text-[11px] text-slate-500">
            {t("voz_escucha_antes")} ({mmss(segundos)})
          </span>
          <AudioNota className="h-9 w-full max-w-xs" src={audioUrl} />
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={enviando || disabled}
              onClick={() => void enviar()}
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
              {enviando ? t("tarea_subiendo") : t("voz_enviar")}
            </button>
            <button className={boton} disabled={enviando} onClick={() => { descartar(); void iniciar(); }} type="button">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("voz_regrabar")}
            </button>
            <button className={boton} disabled={enviando} onClick={descartar} type="button">
              <Trash2 className="h-3.5 w-3.5" />
              {t("voz_descartar")}
            </button>
          </div>
        </div>
      ) : null}

      {estado === "inactivo" ? <span className="text-[11px] text-slate-400">{t("voz_max")}</span> : null}
      {aviso ? <span className="text-[11px] font-semibold text-amber-600">{aviso}</span> : null}
      {error ? <span className="text-[11px] font-semibold text-red-600">{error}</span> : null}
    </div>
  );
}
