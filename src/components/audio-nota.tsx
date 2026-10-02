"use client";

import type React from "react";

/**
 * Reproductor de notas de voz. Chrome graba webm sin la duración en la
 * cabecera (el navegador la reporta como Infinity y la barra no deja
 * adelantar). Truco estándar: saltar a un tiempo enorme obliga al navegador a
 * recorrer el archivo y calcular la duración real; luego se vuelve al inicio.
 */
export function AudioNota(props: Omit<React.AudioHTMLAttributes<HTMLAudioElement>, "onLoadedMetadata">) {
  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    if (Number.isFinite(audio.duration)) return;
    const volverAlInicio = () => {
      audio.removeEventListener("durationchange", volverAlInicio);
      if (!Number.isFinite(audio.duration)) return;
      audio.currentTime = 0;
      if (props.autoPlay) void audio.play().catch(() => undefined);
    };
    audio.addEventListener("durationchange", volverAlInicio);
    audio.currentTime = 1e101;
  };

  return <audio controls preload="metadata" {...props} onLoadedMetadata={handleLoadedMetadata} />;
}
