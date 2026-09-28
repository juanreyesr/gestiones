"use client";

import { Home } from "lucide-react";
import { useIdioma } from "./idioma-context";

/**
 * Salida al sitio publico (el "atras" del navegador esta bloqueado en el aula).
 * Es un <a> normal: el sitio publico son paginas estaticas, no rutas de la app.
 */
export function EnlacePaginaPrincipal({ className }: { className?: string }) {
  const { idioma, t } = useIdioma();
  return (
    <a
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-700"
      }
      href={idioma === "en" ? "/en" : "/es"}
      title={t("pagina_principal")}
    >
      <Home className="h-4 w-4" />
      {t("pagina_principal")}
    </a>
  );
}
