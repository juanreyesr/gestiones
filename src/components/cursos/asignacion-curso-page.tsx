"use client";

import { CheckCircle2, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

type Estado = "cargando" | "activo" | "inactivo" | "invalido" | "error" | "enviado";

type InfoCurso = { cursoNombre: string; universidadNombre: string; docenteNombre: string | null };

export function AsignacionCursoPage({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [info, setInfo] = useState<InfoCurso | null>(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await fetch(`/api/cursos/asignacion/info?token=${token}`);
        const data = (await res.json().catch(() => null)) as
          | { estado?: string; cursoNombre?: string; universidadNombre?: string; docenteNombre?: string | null }
          | null;
        if (!activo) return;
        if (!data || data.estado === "invalido" || data.estado === "error") {
          setEstado(data?.estado === "error" ? "error" : "invalido");
          return;
        }
        setInfo({
          cursoNombre: data.cursoNombre ?? "",
          universidadNombre: data.universidadNombre ?? "",
          docenteNombre: data.docenteNombre ?? null,
        });
        setEstado(data.estado === "activo" ? "activo" : "inactivo");
      } catch {
        if (activo) setEstado("error");
      }
    })();
    return () => {
      activo = false;
    };
  }, [token]);

  const handleEnviar = async () => {
    if (!nombre.trim() || !correo.trim() || !contrasena) {
      setError("Completa tu nombre, correo y contraseña.");
      return;
    }
    if (contrasena.length < 8) {
      setError("Usa al menos 8 caracteres en la contraseña.");
      return;
    }
    if (contrasena !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/cursos/asignacion/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nombre: nombre.trim(), correo: correo.trim(), contrasena, empresa }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setEnviando(false);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar tu solicitud.");
        return;
      }
      setEstado("enviado");
    } catch {
      setEnviando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {estado === "cargando" ? <p className="py-10 text-center text-sm text-slate-400">Cargando...</p> : null}

          {estado === "invalido" || estado === "error" ? (
            <div className="grid gap-3 py-8 text-center">
              <p className="text-lg font-semibold text-slate-900">Enlace no válido</p>
              <p className="text-sm leading-6 text-slate-400">
                {estado === "error"
                  ? "Error de conexión. Intenta de nuevo en un momento."
                  : "Este enlace no existe o ya no está disponible."}
              </p>
            </div>
          ) : null}

          {estado === "inactivo" ? (
            <div className="grid gap-3 py-8 text-center">
              <p className="text-lg font-semibold text-slate-900">{info?.cursoNombre}</p>
              <p className="text-sm leading-6 text-slate-500">
                Este curso no está aceptando solicitudes de asignación en este momento. Consulta con tu docente.
              </p>
            </div>
          ) : null}

          {estado === "enviado" ? (
            <div className="grid gap-3 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">¡Solicitud enviada!</p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
                Tu docente revisará tu solicitud y te asignará al curso. Te avisará cuando puedas ingresar con el correo y la
                contraseña que elegiste.
              </p>
            </div>
          ) : null}

          {estado === "activo" ? (
            <div className="grid gap-4">
              <header className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <GraduationCap className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{info?.universidadNombre}</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">{info?.cursoNombre}</h1>
                {info?.docenteNombre ? <p className="mt-1 text-sm text-slate-500">Docente: {info.docenteNombre}</p> : null}
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Completa tus datos para pedir tu asignación a este curso. Tu docente debe aprobarla antes de que puedas
                  ingresar.
                </p>
              </header>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre completo</span>
                <input className="field-light" onChange={(event) => setNombre(event.target.value)} value={nombre} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Correo</span>
                <input
                  autoComplete="username"
                  className="field-light"
                  onChange={(event) => setCorreo(event.target.value)}
                  type="email"
                  value={correo}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Contraseña</span>
                <input
                  autoComplete="new-password"
                  className="field-light"
                  onChange={(event) => setContrasena(event.target.value)}
                  type="password"
                  value={contrasena}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirma tu contraseña</span>
                <input
                  autoComplete="new-password"
                  className="field-light"
                  onChange={(event) => setConfirmar(event.target.value)}
                  type="password"
                  value={confirmar}
                />
              </label>
              <input
                aria-hidden
                className="hidden"
                onChange={(event) => setEmpresa(event.target.value)}
                tabIndex={-1}
                value={empresa}
              />

              {error ? <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p> : null}

              <button
                className="mt-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                disabled={enviando}
                onClick={() => void handleEnviar()}
                type="button"
              >
                {enviando ? "Enviando..." : "Solicitar asignación"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
