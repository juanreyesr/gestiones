"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Idioma } from "@/lib/cursos/types";
import { traducir } from "@/lib/estudiante/i18n";

const STORAGE_KEY = "gestionesjj_estudiante_idioma";

type IdiomaContextValue = {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  t: (clave: string) => string;
};

const IdiomaContext = createContext<IdiomaContextValue | null>(null);

function idiomaValido(valor: string | null): valor is Idioma {
  return valor === "es" || valor === "en" || valor === "pt";
}

/**
 * Idioma de la plataforma para el estudiante. Antes de iniciar sesión (o si
 * Supabase no está disponible) se usa lo que haya en localStorage de este
 * navegador; en cuanto se carga el perfil, `EstudianteView` sincroniza este
 * estado con el idioma guardado en la cuenta (persiste entre dispositivos).
 */
export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>("es");

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (idiomaValido(guardado)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lee la preferencia guardada en este navegador al montar
        setIdiomaState(guardado);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.): se queda en español.
    }
  }, []);

  const setIdioma = useCallback((nuevo: Idioma) => {
    setIdiomaState(nuevo);
    try {
      localStorage.setItem(STORAGE_KEY, nuevo);
    } catch {
      // Preferencia de un solo dispositivo perdida, no es crítico.
    }
  }, []);

  const t = useCallback((clave: string) => traducir(idioma, clave), [idioma]);

  return <IdiomaContext.Provider value={{ idioma, setIdioma, t }}>{children}</IdiomaContext.Provider>;
}

export function useIdioma() {
  const contexto = useContext(IdiomaContext);
  if (!contexto) throw new Error("useIdioma debe usarse dentro de IdiomaProvider");
  return contexto;
}
