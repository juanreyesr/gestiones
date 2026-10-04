"use client";

import { useEffect, useRef } from "react";

const MARCA = "bloqueoAtras";

/**
 * Evita que el boton/gesto "atras" del navegador (sobre todo en moviles) saque
 * al usuario de la app hacia la pagina publica. Se agrega una entrada extra al
 * historial en la misma URL; cuando "atras" la consume, se vuelve a poner y el
 * usuario se queda donde estaba. Salir al sitio publico (boton "Pagina
 * principal" o "atras" en la pantalla principal) pide confirmacion: ver
 * src/components/confirmar-portada.tsx.
 *
 * `alVolverAtras` (opcional) se llama cada vez que el usuario intenta ir atras,
 * por ejemplo para regresar a un menu interno de la app.
 */
export function useBloquearAtras(alVolverAtras?: () => void) {
  const callbackRef = useRef(alVolverAtras);
  useEffect(() => {
    callbackRef.current = alVolverAtras;
  });

  useEffect(() => {
    // Solo una entrada extra aunque el componente se monte de nuevo (recarga, HMR).
    if (!window.history.state?.[MARCA]) {
      window.history.pushState({ [MARCA]: true }, "");
    }
    const alVolver = () => {
      window.history.pushState({ [MARCA]: true }, "");
      callbackRef.current?.();
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);
}
