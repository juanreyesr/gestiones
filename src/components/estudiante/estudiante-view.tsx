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
import { LoginEstudianteForm } from "./login-estudiante-form";
import { PanelEstudiante } from "./panel-estudiante";

export function EstudianteView() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [cursos, setCursos] = useState<MiCurso[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");

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
    setErrorPerfil(perfilData ? "" : perfilError || "Esta cuenta no está habilitada como estudiante.");
    setCargandoDatos(false);
  }, []);

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
    return <MensajeCentral texto="El servicio no está disponible en este momento." />;
  }

  if (cargandoSesion) {
    return <MensajeCentral texto="Cargando..." />;
  }

  if (!session) {
    return <LoginEstudianteForm />;
  }

  if (cargandoDatos && !perfil) {
    return <MensajeCentral texto="Cargando tu cuenta..." />;
  }

  if (!perfil) {
    return <MensajeCentral conSalir texto={errorPerfil || "Esta cuenta no está habilitada como estudiante."} />;
  }

  return <PanelEstudiante cursos={cursos} onCambioContrasena={cargarDatos} perfil={perfil} />;
}

function MensajeCentral({ conSalir, texto }: { conSalir?: boolean; texto: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-slate-500">
      <p className="text-sm">{texto}</p>
      {conSalir ? (
        <button className="text-sm font-semibold text-slate-700 underline" onClick={() => logoutEstudiante()} type="button">
          Salir e intentar con otra cuenta
        </button>
      ) : (
        <Link className="text-sm text-slate-400 hover:text-slate-600" href="/">
          ← Volver
        </Link>
      )}
    </div>
  );
}
