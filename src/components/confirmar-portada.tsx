"use client";

import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { ModalPortal } from "./modal-portal";

const EVENTO = "gestionesjj:salir-portada";

/**
 * Pide confirmar la salida a la portada del sitio. La usan el "atras" del
 * navegador (bloqueado en /admin y /estudiante) y los botones "Pagina
 * principal", para no sacar a nadie del Aula o de GestionesJJ por accidente.
 */
export function pedirSalidaPortada() {
  window.dispatchEvent(new Event(EVENTO));
}

export type TextosPortada = { titulo: string; texto: string; si: string; no: string };

const TEXTOS_ES: TextosPortada = {
  titulo: "¿Quieres regresar a la página de portada?",
  texto: "Saldrás de esta sección. Lo que no hayas guardado se perderá.",
  si: "Sí, ir a la portada",
  no: "No, quedarme aquí",
};

/** Ventana de confirmacion; se monta una vez en la vista que bloquea el "atras". */
export function ConfirmarPortada({ destino = "/es", textos = TEXTOS_ES }: { destino?: string; textos?: TextosPortada }) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    const abrir = () => setAbierta(true);
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  if (!abierta) return null;

  return (
    <ModalPortal>
      <div
        className="print-hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
        onClick={() => setAbierta(false)}
      >
        <div
          aria-modal="true"
          className="w-full max-w-sm border border-white/10 bg-slate-950 p-5 text-slate-100"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="mb-2 flex items-center gap-2 text-emerald-200">
            <Home className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-white">{textos.titulo}</h3>
          </div>
          <p className="text-sm leading-6 text-slate-300">{textos.texto}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              autoFocus
              className="border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              onClick={() => setAbierta(false)}
              type="button"
            >
              {textos.no}
            </button>
            <a
              className="bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
              href={destino}
            >
              {textos.si}
            </a>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
