"use client";

import { Home } from "lucide-react";
import { ConfirmarPortada, pedirSalidaPortada } from "@/components/confirmar-portada";
import { useIdioma } from "./idioma-context";

/** Confirmacion de salida a la portada en el idioma del aula (se monta una vez). */
export function ConfirmarPortadaEstudiante() {
  const { idioma, t } = useIdioma();
  return (
    <ConfirmarPortada
      destino={idioma === "en" ? "/en" : "/es"}
      textos={{ titulo: t("portada_titulo"), texto: t("portada_texto"), si: t("portada_si"), no: t("portada_no") }}
    />
  );
}

/**
 * Salida al sitio publico, con confirmacion (el "atras" del navegador esta
 * bloqueado en el aula). El destino es un <a>: el sitio publico son paginas
 * estaticas, no rutas de la app.
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
      onClick={(event) => {
        event.preventDefault();
        pedirSalidaPortada();
      }}
      title={t("pagina_principal")}
    >
      <Home className="h-4 w-4" />
      {t("pagina_principal")}
    </a>
  );
}
