"use client";

import { useCallback, useEffect, useState } from "react";
import { EVENTO_METAS_CAMBIO, fetchMetas, type MetaRow } from "@/lib/clinica/metas";

/** Metas del paciente; se recargan al cambiar desde cualquier panel (expediente, sesión, plan con IA). */
export function useMetas(pacienteId: string) {
  const [metas, setMetas] = useState<MetaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);

  const cargar = useCallback(async () => {
    const r = await fetchMetas(pacienteId);
    setMetas(r.data);
    setError(r.error);
    setFaltaMigracion(r.faltaMigracion);
    setCargando(false);
  }, [pacienteId]);

  useEffect(() => {
    // Carga inicial y al cambiar las metas desde otro panel (plan con IA, sesión).
    const t = setTimeout(() => void cargar(), 0);
    const alCambiar = () => void cargar();
    window.addEventListener(EVENTO_METAS_CAMBIO, alCambiar);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENTO_METAS_CAMBIO, alCambiar);
    };
  }, [cargar]);

  return { metas, cargando, error, faltaMigracion, recargar: cargar };
}
