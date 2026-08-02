"use client";

import { Maximize2, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { BTN_GHOST } from "@/components/ui-comun";
import { limpiarHtml } from "@/lib/iglesia/html-seguro";
import type { ProtocoloRow } from "@/lib/iglesia/protocolos";

const CLAVE_ESCALA = "gestionesjj.iglesia.protocolos.escala";
const ESCALA_MIN = 13;
const ESCALA_MAX = 44;

/**
 * Lectura de un protocolo, con zoom y pantalla completa.
 *
 * La pantalla completa es una capa propia (position: fixed) y NO la API de
 * pantalla completa del navegador: esa se sale sola al cambiar de app o al
 * girar el telefono y deja al usuario buscando como volver. Aqui la unica
 * forma de entrar y salir es la X de la esquina, que siempre esta a la vista,
 * y la tecla Escape.
 *
 * Los tamanos del contenido estan en em (ver html-seguro.ts), asi que basta
 * cambiar el font-size del contenedor para agrandar o achicar todo el
 * documento conservando las proporciones.
 */
export function ProtocoloLectura({ protocolo }: { protocolo: ProtocoloRow }) {
  const [escala, setEscala] = useState(17);
  const [completa, setCompleta] = useState(false);

  useEffect(() => {
    const guardada = Number(window.localStorage.getItem(CLAVE_ESCALA));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recupera el tamaño de lectura elegido antes
    if (guardada >= ESCALA_MIN && guardada <= ESCALA_MAX) setEscala(guardada);
  }, []);

  const cambiarEscala = (delta: number) => {
    setEscala((previa) => {
      const siguiente = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, previa + delta));
      window.localStorage.setItem(CLAVE_ESCALA, String(siguiente));
      return siguiente;
    });
  };

  useEffect(() => {
    if (!completa) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setCompleta(false);
    };
    window.addEventListener("keydown", alTeclear);
    // Mientras se lee a pantalla completa, la pagina de atras no se desplaza.
    const desbordePrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = desbordePrevio;
    };
  }, [completa]);

  const html = limpiarHtml(protocolo.contenido ?? "");

  const controlesZoom = (
    <div className="flex items-center gap-1">
      <button
        className="flex h-9 w-9 items-center justify-center border border-white/15 bg-white/8 text-slate-200 transition hover:border-emerald-300/50 disabled:opacity-40"
        disabled={escala <= ESCALA_MIN}
        onClick={() => cambiarEscala(-2)}
        title="Reducir el texto"
        type="button"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-10 text-center text-xs font-semibold text-slate-400">{escala}px</span>
      <button
        className="flex h-9 w-9 items-center justify-center border border-white/15 bg-white/8 text-slate-200 transition hover:border-emerald-300/50 disabled:opacity-40"
        disabled={escala >= ESCALA_MAX}
        onClick={() => cambiarEscala(2)}
        title="Agrandar el texto"
        type="button"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );

  const cuerpo = html ? (
    <div
      className="contenido-protocolo leading-relaxed text-slate-100"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: escala }}
    />
  ) : (
    <p className="text-sm text-slate-500">Este protocolo todavía no tiene contenido. Pulsa “Editar” para escribirlo.</p>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {controlesZoom}
        <button className={`${BTN_GHOST} ml-auto`} onClick={() => setCompleta(true)} type="button">
          <Maximize2 className="h-4 w-4" />
          Pantalla completa
        </button>
      </div>

      <div className="border border-white/10 bg-slate-950/50 p-4 sm:p-6">{cuerpo}</div>

      {completa ? (
        <ModalPortal>
          <div className="print-hidden fixed inset-0 z-[70] flex flex-col bg-slate-950">
            {/* La barra queda fija arriba: la X nunca se pierde de vista, ni
                siquiera al desplazarse hasta el final del protocolo. */}
            <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/95 px-3 py-2 backdrop-blur">
              <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-white sm:text-lg">
                {protocolo.titulo}
              </h2>
              {controlesZoom}
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 bg-white/10 text-slate-100 transition hover:border-red-300/60 hover:text-red-200"
                onClick={() => setCompleta(false)}
                title="Salir de pantalla completa (Esc)"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              <div className="mx-auto w-full max-w-4xl">{cuerpo}</div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
