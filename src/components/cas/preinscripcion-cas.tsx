"use client";

import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Roboto } from "next/font/google";
import { useState } from "react";
import { PRACTICAS, type PracticaId } from "@/lib/cas/aspirantes";

// Identidad visual de UPANA (www.upana.edu.gt): azul #00247B, verde #9FD140, Roboto.
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

const AZUL = "#00247B";
const VERDE = "#9FD140";
const CAMPO =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[#00247B] focus:ring-2 focus:ring-[#00247B]/15 sm:text-sm";
const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Estado = "editando" | "enviando" | "ok" | "duplicado";

/** Formulario público de preinscripción del CAS (/cas/registro). */
export function PreinscripcionCas() {
  const [nombre, setNombre] = useState("");
  const [carne, setCarne] = useState("");
  const [practica, setPractica] = useState<PracticaId | "">("");
  const [telefono, setTelefono] = useState("");
  const [correoInstitucional, setCorreoInstitucional] = useState("");
  const [correoPersonal, setCorreoPersonal] = useState("");
  const [disponibilidad, setDisponibilidad] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [sitio, setSitio] = useState(""); // campo trampa para bots
  const [estado, setEstado] = useState<Estado>("editando");
  const [error, setError] = useState("");

  const validar = () => {
    if (nombre.trim().replace(/\s+/g, " ").length < 3) return "Escribe tu nombre completo.";
    if (!carne.trim()) return "Escribe tu ID (carné) de estudiante.";
    if (!practica) return "Elige la práctica a la que optas.";
    if (telefono.replace(/\D/g, "").length < 8) return "Escribe un número de teléfono válido (8 dígitos o más).";
    if (!CORREO_RE.test(correoInstitucional.trim())) return "Escribe tu correo institucional.";
    if (correoPersonal.trim() && !CORREO_RE.test(correoPersonal.trim())) return "El correo personal no es válido.";
    if (!consentimiento) return "Para enviar tu preinscripción debes aceptar el uso de tus datos.";
    return null;
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError("");
    setEstado("enviando");
    try {
      const res = await fetch("/api/cas/preinscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          carne,
          practica,
          telefono,
          correoInstitucional,
          correoPersonal,
          disponibilidad,
          consentimiento,
          sitio,
        }),
      });
      if (res.status === 429) {
        setEstado("editando");
        setError("Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.");
        return;
      }
      const { estado: resultado } = (await res.json().catch(() => ({ estado: "error" }))) as { estado: string };
      if (resultado === "ok" || resultado === "duplicado") {
        setEstado(resultado);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setEstado("editando");
      setError(
        resultado === "invalido"
          ? "Algún dato no es válido. Revisa el formulario e inténtalo de nuevo."
          : "No se pudo enviar en este momento. Inténtalo de nuevo en unos minutos.",
      );
    } catch {
      setEstado("editando");
      setError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
    }
  };

  const avisoDominio =
    correoInstitucional.includes("@") && !correoInstitucional.trim().toLowerCase().endsWith("upana.edu.gt");

  return (
    <main className={`${roboto.className} min-h-screen bg-slate-100 text-slate-800`}>
      <header style={{ backgroundColor: AZUL }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático en /public */}
          <img alt="Universidad Panamericana" className="h-12 w-auto sm:h-14" src="/cas/upana-logo-blanco.webp" />
          <div className="hidden h-12 w-px bg-white/30 sm:block" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: VERDE }}>
              Centro de Asistencia Social · CAS
            </p>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Preinscripción de práctica</h1>
          </div>
        </div>
        <div className="h-1" style={{ backgroundColor: VERDE }} />
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {estado === "ok" || estado === "duplicado" ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <CheckCircle2 className="mx-auto h-14 w-14" style={{ color: estado === "ok" ? "#5E8F1A" : AZUL }} />
            <h2 className="mt-4 text-2xl font-bold" style={{ color: AZUL }}>
              {estado === "ok" ? "¡Preinscripción recibida!" : "Ya estás preinscrito"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              {estado === "ok"
                ? "Gracias por tu interés en realizar tu práctica en el CAS. La coordinación te contactará por correo o teléfono cuando se definan los horarios y los siguientes pasos."
                : "Ya existe una preinscripción con ese ID (carné). Si necesitas corregir algún dato, comunícate con la coordinación de la práctica."}
            </p>
          </section>
        ) : (
          <form className="grid gap-6" noValidate onSubmit={enviar}>
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm leading-6 text-slate-600">
                El <strong className="text-slate-800">Centro de Asistencia Social (CAS)</strong> de la Universidad
                Panamericana recibirá a estudiantes de la Escuela de Ciencias Psicológicas para su práctica en
                consejería familiar (4.º año) y su práctica profesional en psicología clínica (5.º año). Completa
                este formulario para quedar en la lista de aspirantes; los horarios se comunicarán más adelante.
              </p>
            </section>

            <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold" style={{ color: AZUL }}>
                Tus datos
              </h2>
              <Campo etiqueta="Nombre completo" requerido>
                <input
                  autoComplete="name"
                  className={CAMPO}
                  maxLength={160}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombres y apellidos"
                  value={nombre}
                />
              </Campo>
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo etiqueta="ID (carné)" requerido>
                  <input
                    autoCapitalize="characters"
                    className={CAMPO}
                    maxLength={40}
                    onChange={(e) => setCarne(e.target.value)}
                    value={carne}
                  />
                </Campo>
                <Campo etiqueta="Número de teléfono" requerido>
                  <input
                    autoComplete="tel"
                    className={CAMPO}
                    inputMode="tel"
                    maxLength={40}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="5555 5555"
                    type="tel"
                    value={telefono}
                  />
                </Campo>
              </div>
              <Campo etiqueta="Correo electrónico institucional" requerido>
                <input
                  autoCapitalize="off"
                  className={CAMPO}
                  inputMode="email"
                  maxLength={200}
                  onChange={(e) => setCorreoInstitucional(e.target.value)}
                  type="email"
                  value={correoInstitucional}
                />
                {avisoDominio ? (
                  <span className="text-xs text-amber-700">
                    No termina en «upana.edu.gt»: verifica que sea tu correo institucional.
                  </span>
                ) : null}
              </Campo>
              <Campo etiqueta="Correo electrónico personal">
                <input
                  autoCapitalize="off"
                  autoComplete="email"
                  className={CAMPO}
                  inputMode="email"
                  maxLength={200}
                  onChange={(e) => setCorreoPersonal(e.target.value)}
                  type="email"
                  value={correoPersonal}
                />
              </Campo>
            </section>

            <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold" style={{ color: AZUL }}>
                Práctica a la que optas <span className="text-red-600">*</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {PRACTICAS.map((p) => {
                  const activa = practica === p.id;
                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-md border-2 p-4 transition ${
                        activa ? "border-[#00247B] bg-[#00247B]/5" : "border-slate-200 hover:border-slate-400"
                      }`}
                      key={p.id}
                    >
                      <input
                        checked={activa}
                        className="mt-1 h-4 w-4 accent-[#00247B]"
                        name="practica"
                        onChange={() => setPractica(p.id)}
                        type="radio"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">{p.nombre}</span>
                        <span className="block text-sm text-slate-500">{p.detalle}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <Campo etiqueta="Disponibilidad tentativa (opcional)">
                <textarea
                  className={`${CAMPO} min-h-24`}
                  maxLength={1000}
                  onChange={(e) => setDisponibilidad(e.target.value)}
                  placeholder="Días y horarios en que podrías asistir, por ejemplo: lunes y miércoles por la tarde, sábados por la mañana."
                  value={disponibilidad}
                />
              </Campo>
            </section>

            {/* Campo trampa: oculto para personas, los bots suelen llenarlo. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Sitio web
                <input autoComplete="off" onChange={(e) => setSitio(e.target.value)} tabIndex={-1} value={sitio} />
              </label>
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  checked={consentimiento}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#00247B]"
                  onChange={(e) => setConsentimiento(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm leading-6 text-slate-600">
                  Autorizo que la coordinación del CAS de la Universidad Panamericana guarde y use estos datos
                  únicamente para gestionar mi práctica (contacto, horarios y asignación). No se compartirán con
                  terceros ajenos a la universidad. <span className="text-red-600">*</span>
                </span>
              </label>
            </section>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4" /> Tus datos se envían de forma segura.
              </p>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                disabled={estado === "enviando"}
                style={{ backgroundColor: AZUL }}
                type="submit"
              >
                {estado === "enviando" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {estado === "enviando" ? "Enviando…" : "Enviar preinscripción"}
              </button>
            </div>
          </form>
        )}

        <footer className="mt-10 text-center text-xs text-slate-400">
          Universidad Panamericana · Facultad de Humanidades · Escuela de Ciencias Psicológicas
        </footer>
      </div>
    </main>
  );
}

function Campo({ children, etiqueta, requerido }: { children: React.ReactNode; etiqueta: string; requerido?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {etiqueta} {requerido ? <span className="text-red-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}
