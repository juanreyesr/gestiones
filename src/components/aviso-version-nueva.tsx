"use client";

import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

// Commit con el que se compiló esta pestaña (lo fija next.config.ts en el build).
const VERSION_CARGADA = process.env.NEXT_PUBLIC_VERSION_APP ?? "dev";
const CADA_MS = 5 * 60 * 1000;

const TEXTOS = {
  es: { mensaje: "Hay una versión nueva de la plataforma.", boton: "Actualizar", cerrar: "Más tarde" },
  en: { mensaje: "A new version of the platform is available.", boton: "Update", cerrar: "Later" },
  pt: { mensaje: "Há uma nova versão da plataforma.", boton: "Atualizar", cerrar: "Mais tarde" },
} as const;

function idiomaNavegador(): keyof typeof TEXTOS {
  const idioma = typeof navigator === "undefined" ? "es" : navigator.language.slice(0, 2);
  return idioma === "en" || idioma === "pt" ? idioma : "es";
}

/**
 * Las pestañas que quedan abiertas días (sobre todo en iPad/iPhone) siguen
 * usando el código viejo después de publicar cambios: p. ej. el botón de
 * grabar nota de voz no aparecía hasta recargar. Este aviso compara la versión
 * cargada con la publicada al volver a la pestaña y cada 5 minutos, y ofrece
 * recargar. No recarga solo para no cortar una grabación o una subida.
 */
export function AvisoVersionNueva() {
  const [hayNueva, setHayNueva] = useState(false);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (VERSION_CARGADA === "dev") return;
    let cancelado = false;

    const revisar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const respuesta = await fetch("/api/version", { cache: "no-store" });
        if (!respuesta.ok) return;
        const { version } = (await respuesta.json()) as { version?: string };
        if (!cancelado && version && version !== "dev" && version !== VERSION_CARGADA) setHayNueva(true);
      } catch {
        // Sin conexión: se vuelve a intentar en la próxima revisión.
      }
    };

    void revisar();
    const intervalo = setInterval(() => void revisar(), CADA_MS);
    const alVolver = () => void revisar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, []);

  if (!hayNueva || oculto) return null;
  const t = TEXTOS[idiomaNavegador()];

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4" role="status">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg">
        <span className="font-medium">{t.mensaje}</span>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          onClick={() => window.location.reload()}
          type="button"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.boton}
        </button>
        <button
          aria-label={t.cerrar}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          onClick={() => setOculto(true)}
          title={t.cerrar}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
