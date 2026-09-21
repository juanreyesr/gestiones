"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchMiPerfil,
  fetchMisCursos,
  logoutEstudiante,
  type MiCurso,
  type MiPerfil,
} from "@/lib/estudiante/estudiante-client";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { IdiomaProvider, useIdioma } from "./idioma-context";
import { LoginEstudianteForm } from "./login-estudiante-form";
import { PanelEstudiante } from "./panel-estudiante";

export function EstudianteView() {
  return (
    <IdiomaProvider>
      <EstudianteViewInterna />
    </IdiomaProvider>
  );
}

function EstudianteViewInterna() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [cursos, setCursos] = useState<MiCurso[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");
  const { setIdioma, t } = useIdioma();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Supabase no está configurado, no hay nada que suscribir
      setCargandoSesion(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargandoSesion(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    const [{ data: perfilData, error: perfilError }, { data: cursosData }] = await Promise.all([
      fetchMiPerfil(),
      fetchMisCursos(),
    ]);
    setPerfil(perfilData);
    setCursos(cursosData);
    setErrorPerfil(perfilData ? "" : perfilError || "");
    // El idioma guardado en la cuenta manda sobre lo que haya en este navegador,
    // asi el estudiante ve el mismo idioma sin importar desde donde entre.
    if (perfilData) setIdioma(perfilData.idioma);
    setCargandoDatos(false);
  }, [setIdioma]);

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carga el perfil y cursos al iniciar sesión
      void cargarDatos();
    } else {
      setPerfil(null);
      setCursos([]);
    }
  }, [session, cargarDatos]);

  if (!isSupabaseConfigured) {
    return <MensajeCentral texto={t("central_no_disponible")} />;
  }

  if (cargandoSesion) {
    return <MensajeCentral texto={t("central_cargando")} />;
  }

  if (!session) {
    return <LoginEstudianteForm />;
  }

  if (cargandoDatos && !perfil) {
    return <MensajeCentral texto={t("central_cargando_cuenta")} />;
  }

  if (!perfil) {
    return <MensajeCentral conSalir texto={errorPerfil || t("central_cuenta_no_habilitada")} />;
  }

  return <PanelEstudiante cursos={cursos} onCambioContrasena={cargarDatos} perfil={perfil} />;
}

function MensajeCentral({ conSalir, texto }: { conSalir?: boolean; texto: string }) {
  const { t } = useIdioma();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-slate-500">
      <p className="text-sm">{texto}</p>
      {conSalir ? (
        <button className="text-sm font-semibold text-slate-700 underline" onClick={() => logoutEstudiante()} type="button">
          {t("central_salir_otra_cuenta")}
        </button>
      ) : (
        <Link className="text-sm text-slate-400 hover:text-slate-600" href="/">
          ← {t("central_volver")}
        </Link>
      )}
    </div>
  );
}
