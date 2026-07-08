"use client";

import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { upsertPaciente } from "@/lib/clinica/pacientes";
import type { PacienteEstado, PacientePayload, PacienteRow } from "@/lib/clinica/types";
import { PACIENTE_ESTADOS } from "@/lib/clinica/types";
import { BTN_PRIMARY, Field } from "./ui";

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
  notasGenerales: string;
  estado: PacienteEstado;
};

function toFormState(paciente: PacienteRow | null): FormState {
  return {
    nombre: paciente?.nombre ?? "",
    telefono: paciente?.telefono ?? "",
    email: paciente?.email ?? "",
    fechaNacimiento: paciente?.fechaNacimiento ?? "",
    genero: paciente?.genero ?? "",
    ocupacion: paciente?.ocupacion ?? "",
    escolaridad: paciente?.escolaridad ?? "",
    estadoCivil: paciente?.estadoCivil ?? "",
    direccion: paciente?.direccion ?? "",
    emergenciaNombre: paciente?.emergenciaNombre ?? "",
    emergenciaTelefono: paciente?.emergenciaTelefono ?? "",
    emergenciaRelacion: paciente?.emergenciaRelacion ?? "",
    motivoConsulta: paciente?.motivoConsulta ?? "",
    antecedentesMedicos: paciente?.antecedentesMedicos ?? "",
    antecedentesPsicologicos: paciente?.antecedentesPsicologicos ?? "",
    antecedentesFamiliares: paciente?.antecedentesFamiliares ?? "",
    medicacionActual: paciente?.medicacionActual ?? "",
    referidoPor: paciente?.referidoPor ?? "",
    notasGenerales: paciente?.notasGenerales ?? "",
    estado: paciente?.estado ?? "activo",
  };
}

function toPayload(form: FormState): PacientePayload {
  const opt = (value: string) => (value.trim() === "" ? null : value.trim());
  return {
    nombre: form.nombre.trim(),
    telefono: form.telefono.trim(),
    email: opt(form.email),
    fecha_nacimiento: opt(form.fechaNacimiento),
    genero: opt(form.genero),
    ocupacion: opt(form.ocupacion),
    escolaridad: opt(form.escolaridad),
    estado_civil: opt(form.estadoCivil),
    direccion: opt(form.direccion),
    emergencia_nombre: opt(form.emergenciaNombre),
    emergencia_telefono: opt(form.emergenciaTelefono),
    emergencia_relacion: opt(form.emergenciaRelacion),
    motivo_consulta: opt(form.motivoConsulta),
    antecedentes_medicos: opt(form.antecedentesMedicos),
    antecedentes_psicologicos: opt(form.antecedentesPsicologicos),
    antecedentes_familiares: opt(form.antecedentesFamiliares),
    medicacion_actual: opt(form.medicacionActual),
    referido_por: opt(form.referidoPor),
    notas_generales: opt(form.notasGenerales),
    estado: form.estado,
  };
}

function Section({
  children,
  open,
  onToggle,
  title,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <div className="border border-white/10 bg-white/4">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/6"
        onClick={onToggle}
        type="button"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open ? <div className="grid gap-4 border-t border-white/10 p-4">{children}</div> : null}
    </div>
  );
}

export function PacienteForm({
  onSaved,
  paciente,
}: {
  onSaved: (id: string) => void;
  paciente: PacienteRow | null;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(paciente));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personales: true,
    contacto: !!paciente,
    emergencia: false,
    clinica: !!paciente,
    notas: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const original = useMemo(() => toFormState(paciente), [paciente]);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const canSave = form.nombre.trim().length > 0 && form.telefono.trim().length > 0;

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  };

  const toggle = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const { id, error: saveError } = await upsertPaciente(paciente?.id ?? null, toPayload(form));
    setSaving(false);
    if (saveError || !id) {
      setError(saveError ?? "No se pudo guardar el paciente.");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    onSaved(id);
  };

  const input = (key: keyof FormState, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="field" onChange={(event) => set(key)(event.target.value)} value={form[key]} {...props} />
  );

  const textarea = (key: keyof FormState, rows = 3, placeholder?: string) => (
    <textarea
      className="field resize-y"
      onChange={(event) => set(key)(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      value={form[key]}
    />
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Solo el nombre y el teléfono son obligatorios. Puedes completar el resto de la hoja cuando tengas los datos.
        </p>
        <div className="flex items-center gap-3">
          {dirty && !savedAt ? <span className="text-xs font-semibold text-amber-300">Cambios sin guardar</span> : null}
          {savedAt ? <span className="text-xs font-semibold text-emerald-300">Guardado {savedAt}</span> : null}
          <button className={BTN_PRIMARY} disabled={!canSave || saving} onClick={handleSave} type="button">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : paciente ? "Guardar cambios" : "Guardar paciente"}
          </button>
        </div>
      </div>

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <Section onToggle={() => toggle("personales")} open={openSections.personales} title="Datos personales">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo *">{input("nombre", { placeholder: "Nombre del paciente" })}</Field>
          <Field label="Teléfono *">{input("telefono", { placeholder: "0000-0000" })}</Field>
          <Field label="Fecha de nacimiento">{input("fechaNacimiento", { type: "date" })}</Field>
          <Field label="Género">
            <select className="field" onChange={(event) => set("genero")(event.target.value)} value={form.genero}>
              <option value="">Sin especificar</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
          </Field>
          <Field label="Ocupación">{input("ocupacion")}</Field>
          <Field label="Escolaridad">{input("escolaridad")}</Field>
          <Field label="Estado civil">
            <select className="field" onChange={(event) => set("estadoCivil")(event.target.value)} value={form.estadoCivil}>
              <option value="">Sin especificar</option>
              <option value="Soltero/a">Soltero/a</option>
              <option value="Casado/a">Casado/a</option>
              <option value="Unido/a">Unido/a</option>
              <option value="Divorciado/a">Divorciado/a</option>
              <option value="Viudo/a">Viudo/a</option>
            </select>
          </Field>
          <Field label="Estado del paciente">
            <select
              className="field"
              onChange={(event) => set("estado")(event.target.value as PacienteEstado)}
              value={form.estado}
            >
              {PACIENTE_ESTADOS.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section onToggle={() => toggle("contacto")} open={openSections.contacto} title="Contacto y dirección">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correo electrónico">{input("email", { type: "email", placeholder: "correo@ejemplo.com" })}</Field>
          <Field label="Referido por">{input("referidoPor")}</Field>
        </div>
        <Field label="Dirección">{textarea("direccion", 2)}</Field>
      </Section>

      <Section onToggle={() => toggle("emergencia")} open={openSections.emergencia} title="Contacto de emergencia">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nombre">{input("emergenciaNombre")}</Field>
          <Field label="Teléfono">{input("emergenciaTelefono")}</Field>
          <Field label="Relación / parentesco">{input("emergenciaRelacion")}</Field>
        </div>
      </Section>

      <Section onToggle={() => toggle("clinica")} open={openSections.clinica} title="Información clínica">
        <Field label="Motivo de consulta">{textarea("motivoConsulta", 3, "¿Qué trae al paciente a consulta?")}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Antecedentes psicológicos">{textarea("antecedentesPsicologicos")}</Field>
          <Field label="Antecedentes médicos">{textarea("antecedentesMedicos")}</Field>
          <Field label="Antecedentes familiares">{textarea("antecedentesFamiliares")}</Field>
          <Field label="Medicación actual">{textarea("medicacionActual")}</Field>
        </div>
      </Section>

      <Section onToggle={() => toggle("notas")} open={openSections.notas} title="Notas generales">
        <Field label="Notas">{textarea("notasGenerales", 4, "Observaciones generales del caso")}</Field>
      </Section>
    </div>
  );
}
