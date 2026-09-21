"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { loginEstudiante } from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";
import { SelectorIdioma } from "./selector-idioma";

export function LoginEstudianteForm() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const { t } = useIdioma();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!correo.trim() || !contrasena) {
      setError(t("login_error_vacio"));
      return;
    }
    setEnviando(true);
    const { error: loginError } = await loginEstudiante(correo.trim(), contrasena);
    setEnviando(false);
    if (loginError) {
      setError(t("login_error_credenciales"));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <SelectorIdioma />
        </div>
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">{t("login_titulo")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("login_subtitulo")}</p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-left">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("login_correo")}</span>
            <input
              autoComplete="username"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-slate-400"
              onChange={(event) => setCorreo(event.target.value)}
              type="email"
              value={correo}
            />
          </label>
          <label className="grid gap-1.5 text-left">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("login_contrasena")}</span>
            <input
              autoComplete="current-password"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-slate-400"
              onChange={(event) => setContrasena(event.target.value)}
              type="password"
              value={contrasena}
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p> : null}

          <button
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            disabled={enviando}
            type="submit"
          >
            {enviando ? t("login_entrando") : t("login_entrar")}
          </button>
        </form>

        <Link className="mt-8 block text-center text-sm text-slate-400 hover:text-slate-600" href="/">
          ← {t("login_volver")}
        </Link>
      </div>
    </div>
  );
}
