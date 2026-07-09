"use client";

import { CheckCircle2, ClipboardList, HeartPulse, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Estado = "cargando" | "ok" | "completado" | "invalido" | "enviado";

type FormState = {
  nombre: string;
  telefono: string;
  email: string;
  fechaNacimiento: string;
  genero: string;
  ocupacion: string;
  escolaridad: string;
  estadoCivil: string;
  direccion: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  emergenciaRelacion: string;
  motivoConsulta: string;
  antecedentesMedicos: string;
  antecedentesPsicologicos: string;
  antecedentesFamiliares: string;
  medicacionActual: string;
  referidoPor: string;
};

const VACIO: FormState = {
  nombre: "",
  telefono: "",
  email: "",
  fechaNacimiento: "",
  genero: "",
  ocupacion: "",
  escolaridad: "",
  estadoCivil: "",
  direccion: "",
  emergenciaNombre: "",
  emergenciaTelefono: "",
  emergenciaRelacion: "",
  motivoConsulta: "",
  antecedentesMedicos: "",
  antecedentesPsicologicos: "",
  antecedentesFamiliares: "",
  medicacionActual: "",
  referidoPor: "",
};

function Campo({
  label,
  onChange,
  type,
  value,
}: {
  label: string;
  onChange: (v: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <input className="field" onChange={(e) => onChange(e.target.value)} type={type} value={value} />
    </label>
  );
}

function Area({ label, onChange, value }: { label: string; onChange: (v: string) => void; value: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <textarea className="field resize-y" onChange={(e) => onChange(e.target.value)} rows={2} value={value} />
    </label>
  );
}

export function DatosPacientePage({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [form, setForm] = useState<FormState>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/datos/${token}`);
      const data = (await res.json()) as Partial<FormState> & { estado?: string };
      if (data.estado === "completado") {
        setEstado("completado");
        return;
      }
      if (data.estado !== "ok") {
        setEstado("invalido");
        return;
      }
      setForm({
        nombre: data.nombre ?? "",
        telefono: data.telefono ?? "",
        email: data.email ?? "",
        fechaNacimiento: data.fechaNacimiento ?? "",
        genero: data.genero ?? "",
        ocupacion: data.ocupacion ?? "",
        escolaridad: data.escolaridad ?? "",
        estadoCivil: data.estadoCivil ?? "",
        direccion: data.direccion ?? "",
        emergenciaNombre: data.emergenciaNombre ?? "",
        emergenciaTelefono: data.emergenciaTelefono ?? "",
        emergenciaRelacion: data.emergenciaRelacion ?? "",
        motivoConsulta: data.motivoConsulta ?? "",
        antecedentesMedicos: data.antecedentesMedicos ?? "",
        antecedentesPsicologicos: data.antecedentesPsicologicos ?? "",
        antecedentesFamiliares: data.antecedentesFamiliares ?? "",
        medicacionActual: data.medicacionActual ?? "",
        referidoPor: data.referidoPor ?? "",
      });
      setEstado("ok");
    } catch {
      setEstado("invalido");
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const set = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleGuardar = async () => {
    if (guardando) return;
    if (form.nombre.trim() === "" || form.telefono.trim() === "") {
      setError("El nombre y el teléfono son obligatorios.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/datos/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { estado?: string; error?: string };
      setGuardando(false);
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar. Intenta de nuevo.");
        return;
      }
      if (data.estado === "completado") {
        setEstado("completado");
        return;
      }
      setEstado("enviado");
    } catch {
      setGuardando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <main className="relative min-h-screen bg-[#08111f] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(16_185_129/0.12),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23/0.4),rgb(2_6_23/0.9))]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-emerald-300/30 bg-emerald-300/10">
            <HeartPulse className="h-7 w-7 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Hoja de datos generales</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Completa tu información. Es confidencial y se usa únicamente para tu atención.
          </p>
        </header>

        <div className="border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-7">
          {estado === "cargando" ? (
            <p className="py-10 text-center text-sm text-slate-400">Cargando...</p>
          ) : null}

          {estado === "invalido" ? (
            <div className="grid gap-3 py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-500" />
              <p className="text-base font-semibold text-white">Enlace no válido</p>
              <p className="text-sm leading-6 text-slate-400">
                Este enlace no es válido o ya no está disponible. Solicita uno nuevo a tu terapeuta.
              </p>
            </div>
          ) : null}

          {estado === "completado" || estado === "enviado" ? (
            <div className="grid gap-3 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-emerald-300/40 bg-emerald-300/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-300" />
              </div>
              <p className="text-lg font-semibold text-white">¡Gracias!</p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-300">
                {estado === "enviado"
                  ? "Tu información quedó registrada. Ya no necesitas hacer nada más."
                  : "Esta información ya fue completada. No es necesario volver a llenarla."}
              </p>
            </div>
          ) : null}

          {estado === "ok" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Nombre completo *" onChange={set("nombre")} value={form.nombre} />
                <Campo label="Teléfono *" onChange={set("telefono")} value={form.telefono} />
                <Campo label="Correo electrónico" onChange={set("email")} type="email" value={form.email} />
                <Campo label="Fecha de nacimiento" onChange={set("fechaNacimiento")} type="date" value={form.fechaNacimiento} />
                <Campo label="Género" onChange={set("genero")} value={form.genero} />
                <Campo label="Ocupación" onChange={set("ocupacion")} value={form.ocupacion} />
                <Campo label="Escolaridad" onChange={set("escolaridad")} value={form.escolaridad} />
                <Campo label="Estado civil" onChange={set("estadoCivil")} value={form.estadoCivil} />
              </div>
              <Area label="Dirección" onChange={set("direccion")} value={form.direccion} />

              <div className="border-t border-white/10 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contacto de emergencia
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo label="Nombre" onChange={set("emergenciaNombre")} value={form.emergenciaNombre} />
                <Campo label="Teléfono" onChange={set("emergenciaTelefono")} value={form.emergenciaTelefono} />
                <Campo label="Relación" onChange={set("emergenciaRelacion")} value={form.emergenciaRelacion} />
              </div>

              <div className="border-t border-white/10 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Información clínica
              </div>
              <Area label="Motivo de consulta" onChange={set("motivoConsulta")} value={form.motivoConsulta} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Area label="Antecedentes psicológicos" onChange={set("antecedentesPsicologicos")} value={form.antecedentesPsicologicos} />
                <Area label="Antecedentes médicos" onChange={set("antecedentesMedicos")} value={form.antecedentesMedicos} />
                <Area label="Antecedentes familiares" onChange={set("antecedentesFamiliares")} value={form.antecedentesFamiliares} />
                <Area label="Medicación actual" onChange={set("medicacionActual")} value={form.medicacionActual} />
              </div>
              <Campo label="¿Cómo llegaste a la consulta?" onChange={set("referidoPor")} value={form.referidoPor} />

              {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

              <button
                className="inline-flex items-center justify-center gap-2 bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
                disabled={guardando || form.nombre.trim() === "" || form.telefono.trim() === ""}
                onClick={handleGuardar}
                type="button"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : "Guardar mi información"}
              </button>
            </div>
          ) : null}
        </div>

        <footer className="mt-6 text-center text-xs text-slate-600">Atención psicológica profesional</footer>
      </div>
    </main>
  );
}
