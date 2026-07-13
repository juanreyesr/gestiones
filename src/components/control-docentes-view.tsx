"use client";

import { Pencil, Plus, UserRoundCog } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchDocentesAdmin,
  upsertDocenteAdmin,
  type DocenteAdminPayload,
  type DocenteAdminRow,
} from "@/lib/docentes-admin";

type FormState = {
  nombre: string;
  codigo: string;
  correo: string;
  telefono: string;
  femenino: boolean;
  activo: boolean;
};

const FORM_VACIO: FormState = { nombre: "", codigo: "", correo: "", telefono: "", femenino: false, activo: true };

export function ControlDocentesView({ onDocentesChanged }: { onDocentesChanged?: () => void }) {
  const [docentes, setDocentes] = useState<DocenteAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [message, setMessage] = useState("");

  const [editTarget, setEditTarget] = useState<DocenteAdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");
    const { data, error } = await fetchDocentesAdmin();
    if (error) setListError(error);
    setDocentes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load();
  }, [load]);

  const activos = docentes
    .filter((item) => item.activo)
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const inactivos = docentes
    .filter((item) => !item.activo)
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const listado = [...activos, ...inactivos];

  const abrirNuevo = () => {
    setEditTarget(null);
    setCreating(true);
    setForm(FORM_VACIO);
    setSaveError("");
  };

  const abrirEditar = (docente: DocenteAdminRow) => {
    setCreating(false);
    setEditTarget(docente);
    setForm({
      nombre: docente.nombre,
      codigo: docente.codigo ?? "",
      correo: docente.correo ?? "",
      telefono: docente.telefono ?? "",
      femenino: docente.femenino,
      activo: docente.activo,
    });
    setSaveError("");
  };

  const cerrarForm = () => {
    setEditTarget(null);
    setCreating(false);
    setForm(FORM_VACIO);
    setSaveError("");
  };

  const formAbierto = creating || Boolean(editTarget);

  const handleGuardar = async () => {
    if (!form.nombre.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    const payload: DocenteAdminPayload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim() || null,
      correo: form.correo.trim() || null,
      telefono: form.telefono.trim() || null,
      femenino: form.femenino,
      activo: form.activo,
    };
    const { error } = await upsertDocenteAdmin(editTarget?.id ?? null, payload);
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    cerrarForm();
    setMessage(editTarget ? "Docente actualizado." : "Docente agregado.");
    await load();
    onDocentesChanged?.();
  };

  const handleToggleActivo = async (docente: DocenteAdminRow) => {
    if (togglingId) return;
    setTogglingId(docente.id);
    const previo = docentes;
    const nuevoActivo = !docente.activo;
    setDocentes((current) => current.map((item) => (item.id === docente.id ? { ...item, activo: nuevoActivo } : item)));
    const { error } = await upsertDocenteAdmin(docente.id, {
      nombre: docente.nombre,
      codigo: docente.codigo,
      correo: docente.correo,
      telefono: docente.telefono,
      femenino: docente.femenino,
      activo: nuevoActivo,
    });
    setTogglingId(null);
    if (error) {
      setDocentes(previo);
      setListError(`No se pudo actualizar el estado: ${error}`);
      return;
    }
    onDocentesChanged?.();
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <UserRoundCog className="h-4 w-4" />
            Coordinacion
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Control de docentes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Administra la lista de docentes: datos de contacto y si estan activos para asignarles cursos.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
          onClick={abrirNuevo}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Agregar docente
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {listError ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{listError}</p> : null}

      {formAbierto ? (
        <div className="border border-white/10 bg-white/6 p-4">
          <h3 className="mb-4 text-lg font-semibold text-white">{editTarget ? "Editar docente" : "Nuevo docente"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                value={form.nombre}
              />
            </Field>
            <Field label="ID / codigo">
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value }))}
                value={form.codigo}
              />
            </Field>
            <Field label="Correo">
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))}
                type="email"
                value={form.correo}
              />
            </Field>
            <Field label="Telefono">
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
                value={form.telefono}
              />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                checked={form.femenino}
                onChange={(event) => setForm((current) => ({ ...current, femenino: event.target.checked }))}
                type="checkbox"
              />
              Docente femenino (Licda.)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                checked={form.activo}
                onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
                type="checkbox"
              />
              Activo
            </label>
          </div>

          {saveError ? <p className="mt-3 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{saveError}</p> : null}

          <div className="mt-5 flex justify-end gap-3">
            <button
              className="border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              onClick={cerrarForm}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
              disabled={!form.nombre.trim() || saving}
              onClick={handleGuardar}
              type="button"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-300">Cargando docentes...</p>
      ) : listado.length === 0 ? (
        <p className="text-sm text-slate-400">Aun no hay docentes registrados.</p>
      ) : (
        <div className="grid gap-3">
          {listado.map((docente) => (
            <div
              key={docente.id}
              className={`flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-white/8 p-4 ${
                docente.activo ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {docente.femenino ? "Licda." : "Lic."} {docente.nombre}
                  </span>
                  {!docente.activo ? (
                    <span className="border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">
                      Inactivo
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  ID: {docente.codigo || "-"} · Correo: {docente.correo || "-"} · Telefono: {docente.telefono || "-"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  aria-checked={docente.activo}
                  aria-label={docente.activo ? "Desactivar docente" : "Activar docente"}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                    docente.activo ? "border-emerald-300/70 bg-emerald-300/70" : "border-white/20 bg-white/10"
                  } disabled:opacity-60`}
                  disabled={togglingId === docente.id}
                  onClick={() => handleToggleActivo(docente)}
                  role="switch"
                  type="button"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      docente.activo ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30"
                  onClick={() => abrirEditar(docente)}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}
