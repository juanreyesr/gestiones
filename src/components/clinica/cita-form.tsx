"use client";

import { CalendarPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { actualizarCita, crearCita, type CitaPayload } from "@/lib/clinica/citas";
import { syncCitaConGoogle } from "@/lib/clinica/google-client";
import { claveDiaLocal, formatoHora, seTraslapan } from "@/lib/clinica/slots";
import type { CitaModalidad, CitaRow, PacienteRow } from "@/lib/clinica/types";
import { ModalPortal } from "../modal-portal";
import { BTN_GHOST, BTN_PRIMARY, Field } from "./ui";

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  return `${claveDiaLocal(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function CitaForm({
  cita,
  citasExistentes,
  inicioSugerido,
  onClose,
  onSaved,
  pacientes,
}: {
  cita: CitaRow | null;
  citasExistentes: CitaRow[];
  inicioSugerido: Date | null;
  onClose: () => void;
  onSaved: () => void;
  pacientes: PacienteRow[];
}) {
  const inicioInicial = cita
    ? toLocalInputValue(cita.inicio)
    : inicioSugerido
      ? toLocalInputValue(inicioSugerido.toISOString())
      : "";

  const duracionInicial = cita
    ? Math.round((new Date(cita.fin).getTime() - new Date(cita.inicio).getTime()) / 60000)
    : 50;

  const [pacienteId, setPacienteId] = useState(cita?.pacienteId ?? "");
  const [sinPaciente, setSinPaciente] = useState(Boolean(cita && !cita.pacienteId));
  const [contactoNombre, setContactoNombre] = useState(cita?.contactoNombre ?? "");
  const [contactoTelefono, setContactoTelefono] = useState(cita?.contactoTelefono ?? "");
  const [inicio, setInicio] = useState(inicioInicial);
  const [duracion, setDuracion] = useState(duracionInicial);
  const [modalidad, setModalidad] = useState<CitaModalidad>(cita?.modalidad ?? "presencial");
  const [motivo, setMotivo] = useState(cita?.motivo ?? "");
  const [notas, setNotas] = useState(cita?.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finIso = useMemo(() => {
    if (!inicio) return null;
    const inicioDate = new Date(inicio);
    if (Number.isNaN(inicioDate.getTime())) return null;
    return new Date(inicioDate.getTime() + duracion * 60000).toISOString();
  }, [inicio, duracion]);

  const traslape = useMemo(() => {
    if (!inicio || !finIso) return null;
    const inicioIso = new Date(inicio).toISOString();
    return (
      citasExistentes.find(
        (existente) =>
          existente.id !== cita?.id &&
          (existente.estado === "pendiente" || existente.estado === "confirmada") &&
          seTraslapan(inicioIso, finIso, existente.inicio, existente.fin)
      ) ?? null
    );
  }, [cita?.id, citasExistentes, finIso, inicio]);

  const puedeGuardar =
    Boolean(inicio && finIso) && (sinPaciente ? contactoNombre.trim().length > 0 : pacienteId.length > 0);

  const handleGuardar = async () => {
    if (!puedeGuardar || saving || !finIso) return;
    setSaving(true);
    setError("");

    const payload: CitaPayload = {
      paciente_id: sinPaciente ? null : pacienteId,
      contacto_nombre: sinPaciente ? contactoNombre.trim() : null,
      contacto_telefono: sinPaciente ? contactoTelefono.trim() || null : null,
      contacto_email: null,
      inicio: new Date(inicio).toISOString(),
      fin: finIso,
      estado: cita?.estado ?? "confirmada",
      modalidad,
      motivo: motivo.trim() || null,
      notas: notas.trim() || null,
    };

    if (cita) {
      const { error: updateError } = await actualizarCita(cita.id, payload);
      setSaving(false);
      if (updateError) {
        setError(updateError);
        return;
      }
      void syncCitaConGoogle(cita.id, "update");
      onSaved();
      return;
    }

    const { id, error: createError } = await crearCita(payload);
    setSaving(false);
    if (createError || !id) {
      setError(createError ?? "No se pudo crear la cita.");
      return;
    }
    void syncCitaConGoogle(id, "create");
    onSaved();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CalendarPlus className="h-5 w-5 text-emerald-300" />
              {cita ? "Editar cita" : "Nueva cita"}
            </h3>
            <button
              aria-label="Cerrar"
              className="border border-white/10 bg-white/8 p-1.5 text-slate-400 transition hover:border-white/30"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                checked={sinPaciente}
                className="h-4 w-4 accent-emerald-300"
                onChange={(event) => setSinPaciente(event.target.checked)}
                type="checkbox"
              />
              Persona sin expediente (primera vez)
            </label>

            {sinPaciente ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre *">
                  <input className="field" onChange={(event) => setContactoNombre(event.target.value)} value={contactoNombre} />
                </Field>
                <Field label="Teléfono">
                  <input className="field" onChange={(event) => setContactoTelefono(event.target.value)} value={contactoTelefono} />
                </Field>
              </div>
            ) : (
              <Field label="Paciente *">
                <select className="field" onChange={(event) => setPacienteId(event.target.value)} value={pacienteId}>
                  <option value="">Selecciona un paciente</option>
                  {pacientes.map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha y hora *">
                <input
                  className="field"
                  onChange={(event) => setInicio(event.target.value)}
                  type="datetime-local"
                  value={inicio}
                />
              </Field>
              <Field label="Duración (minutos)">
                <input
                  className="field"
                  min={15}
                  max={240}
                  onChange={(event) => setDuracion(Number(event.target.value) || 50)}
                  type="number"
                  value={duracion}
                />
              </Field>
            </div>

            <Field label="Modalidad">
              <select
                className="field"
                onChange={(event) => setModalidad(event.target.value as CitaModalidad)}
                value={modalidad}
              >
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </Field>

            <Field label="Motivo">
              <input
                className="field"
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Motivo de la cita"
                value={motivo}
              />
            </Field>

            <Field label="Notas">
              <textarea className="field resize-y" onChange={(event) => setNotas(event.target.value)} rows={2} value={notas} />
            </Field>

            {traslape ? (
              <div className="border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-200">
                Atención: se traslapa con la cita de{" "}
                {traslape.pacienteNombre ?? traslape.contactoNombre ?? "otra persona"} a las {formatoHora(traslape.inicio)}.
              </div>
            ) : null}

            {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

            <div className="flex justify-end gap-3">
              <button className={BTN_GHOST} onClick={onClose} type="button">
                Cancelar
              </button>
              <button className={BTN_PRIMARY} disabled={!puedeGuardar || saving} onClick={handleGuardar} type="button">
                {saving ? "Guardando..." : cita ? "Guardar cambios" : "Crear cita"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
