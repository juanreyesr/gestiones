"use client";

import { CalendarCheck2, Copy, Link2, Plus, RefreshCw, Save, Unplug, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDisponibilidad, guardarDisponibilidad } from "@/lib/clinica/disponibilidad";
import {
  disconnectGoogle,
  getGoogleStatus,
  startGoogleConnect,
  type GoogleStatus,
} from "@/lib/clinica/google-client";
import { DIAS_SEMANA, previewSlotsSemana } from "@/lib/clinica/slots";
import type { DisponibilidadConfig, RangoHorario } from "@/lib/clinica/types";
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, Field, SectionCard } from "./ui";

const ZONAS = [
  "America/Guatemala",
  "America/Mexico_City",
  "America/El_Salvador",
  "America/Tegucigalpa",
  "America/Costa_Rica",
  "America/Panama",
  "America/Bogota",
  "America/Lima",
];

export function DisponibilidadConfigView() {
  const [config, setConfig] = useState<DisponibilidadConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data, error: err }, status] = await Promise.all([fetchDisponibilidad(), getGoogleStatus()]);
    setLoading(false);
    if (err) setError(err);
    setConfig(data);
    setGoogle(status);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("google");
    if (resultado === "conectado") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the OAuth redirect result
      setMensaje("Google Calendar conectado correctamente.");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (resultado === "error") {
       
      setGoogleError("No se pudo conectar Google Calendar. Intenta de nuevo.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "/agendar";
    return `${window.location.origin}/agendar`;
  }, []);

  const preview = useMemo(() => {
    if (!config) return [];
    return previewSlotsSemana(config.horarioSemanal, config.duracionMin, config.bufferMin);
  }, [config]);

  if (loading || !config) {
    return <div className="text-sm text-slate-400">Cargando configuración...</div>;
  }

  const set = <K extends keyof DisponibilidadConfig>(key: K, value: DisponibilidadConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMensaje("");
  };

  const setRangos = (dow: number, rangos: RangoHorario[]) => {
    set("horarioSemanal", { ...config.horarioSemanal, [String(dow)]: rangos });
  };

  const handleGuardar = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    const { id, error: err } = await guardarDisponibilidad(config);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setConfig((prev) => (prev ? { ...prev, id } : prev));
    setMensaje("Configuración guardada.");
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar el enlace.");
    }
  };

  const handleConectarGoogle = async () => {
    setGoogleBusy(true);
    setGoogleError("");
    const { url, error: err } = await startGoogleConnect();
    if (err || !url) {
      setGoogleBusy(false);
      setGoogleError(err ?? "No se pudo iniciar la conexión.");
      return;
    }
    window.location.href = url;
  };

  const handleDesconectarGoogle = async () => {
    setGoogleBusy(true);
    setGoogleError("");
    const { error: err } = await disconnectGoogle();
    setGoogleBusy(false);
    if (err) {
      setGoogleError(err);
      return;
    }
    setGoogle(await getGoogleStatus());
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          Define tu horario de atención, la duración de tus sesiones y comparte tu enlace para que los pacientes
          soliciten cita en los espacios libres. Toda solicitud requiere tu aprobación.
        </p>
        <button className={BTN_PRIMARY} disabled={saving} onClick={handleGuardar} type="button">
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      {mensaje ? <div className="border border-emerald-300/40 bg-emerald-300/10 p-3 text-sm text-emerald-200">{mensaje}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Agendamiento en línea">
          <div className="grid gap-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 border border-white/10 bg-white/4 p-3">
              <span>
                <span className="block text-sm font-semibold text-white">Página pública de agendamiento</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Al activarla, cualquier persona con el enlace podrá solicitar una cita.
                </span>
              </span>
              <input
                checked={config.agendamientoPublico}
                className="h-5 w-5 accent-emerald-300"
                onChange={(event) => set("agendamientoPublico", event.target.checked)}
                type="checkbox"
              />
            </label>

            <div className="flex items-center gap-2">
              <div className="field flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-300">
                <Link2 className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="truncate">{publicUrl}</span>
              </div>
              <button className={BTN_GHOST} onClick={handleCopiar} type="button">
                <Copy className="h-4 w-4" />
                {copiado ? "¡Copiado!" : "Copiar"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Duración de la sesión (min)">
                <input
                  className="field"
                  max={240}
                  min={15}
                  onChange={(event) => set("duracionMin", Number(event.target.value) || 50)}
                  type="number"
                  value={config.duracionMin}
                />
              </Field>
              <Field label="Espacio entre sesiones (min)">
                <input
                  className="field"
                  max={120}
                  min={0}
                  onChange={(event) => set("bufferMin", Number(event.target.value) || 0)}
                  type="number"
                  value={config.bufferMin}
                />
              </Field>
              <Field label="Antelación mínima (horas)">
                <input
                  className="field"
                  max={168}
                  min={0}
                  onChange={(event) => set("antelacionMinHoras", Number(event.target.value) || 0)}
                  type="number"
                  value={config.antelacionMinHoras}
                />
              </Field>
              <Field label="Agendar hasta (días adelante)">
                <input
                  className="field"
                  max={60}
                  min={1}
                  onChange={(event) => set("antelacionMaxDias", Number(event.target.value) || 30)}
                  type="number"
                  value={config.antelacionMaxDias}
                />
              </Field>
            </div>

            <Field label="Zona horaria">
              <select className="field" onChange={(event) => set("zonaHoraria", event.target.value)} value={config.zonaHoraria}>
                {ZONAS.map((zona) => (
                  <option key={zona} value={zona}>
                    {zona}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Texto del consentimiento informado">
              <textarea
                className="field resize-y leading-6"
                onChange={(event) => set("consentimientoTexto", event.target.value)}
                rows={7}
                value={config.consentimientoTexto}
              />
            </Field>
            <p className="text-xs leading-5 text-slate-500">
              El paciente debe aceptar este texto para poder solicitar una cita. Revísalo según tu criterio profesional y
              la ley de tu país; se guarda una copia de lo aceptado en el expediente de cada paciente.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Google Calendar">
          <div className="grid gap-3">
            {!google?.configurado ? (
              <div className="border border-white/10 bg-white/4 p-4 text-sm leading-6 text-slate-300">
                <p className="font-semibold text-white">Integración no configurada</p>
                <p className="mt-1 text-slate-400">
                  Para sincronizar tus citas con Google Calendar hay que configurar las credenciales
                  (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET) en el servidor. Mientras tanto, cada cita ofrece un
                  enlace «Añadir a Google Calendar» manual.
                </p>
              </div>
            ) : google.conectado && google.estado === "conectado" ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-3 border border-emerald-300/40 bg-emerald-300/10 p-4">
                  <CalendarCheck2 className="h-6 w-6 shrink-0 text-emerald-300" />
                  <div>
                    <div className="text-sm font-semibold text-emerald-200">Conectado</div>
                    <div className="text-xs text-slate-300">{google.googleEmail ?? "Cuenta de Google"}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Tus citas se crean también en tu calendario y tus eventos ocupados se muestran en la agenda.
                    </div>
                  </div>
                </div>
                <button className={BTN_GHOST} disabled={googleBusy} onClick={handleDesconectarGoogle} type="button">
                  <Unplug className="h-4 w-4" />
                  {googleBusy ? "Desconectando..." : "Desconectar Google Calendar"}
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {google.estado === "revocado" ? (
                  <div className="border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-200">
                    El acceso a Google fue revocado. Vuelve a conectar tu cuenta.
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-300">
                    Conecta tu cuenta de Google para que las citas de la plataforma aparezcan en tu calendario y tus
                    eventos ocupados se tomen en cuenta al agendar.
                  </p>
                )}
                <button className={BTN_ACCENT} disabled={googleBusy} onClick={handleConectarGoogle} type="button">
                  <RefreshCw className="h-4 w-4" />
                  {googleBusy ? "Abriendo Google..." : "Conectar Google Calendar"}
                </button>
              </div>
            )}
            {googleError ? (
              <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{googleError}</div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Horario semanal de atención">
        <div className="grid gap-3">
          {DIAS_SEMANA.map((dia) => {
            const rangos = config.horarioSemanal[String(dia.dow)] ?? [];
            const activo = rangos.length > 0;
            return (
              <div key={dia.dow} className="grid gap-2 border border-white/10 bg-white/4 p-3 sm:grid-cols-[120px_1fr] sm:items-start">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <input
                    checked={activo}
                    className="h-4 w-4 accent-emerald-300"
                    onChange={(event) =>
                      setRangos(dia.dow, event.target.checked ? [{ inicio: "09:00", fin: "17:00" }] : [])
                    }
                    type="checkbox"
                  />
                  {dia.nombre}
                </label>
                {activo ? (
                  <div className="grid gap-2">
                    {rangos.map((rango, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <input
                          className="field max-w-[130px]"
                          onChange={(event) =>
                            setRangos(
                              dia.dow,
                              rangos.map((r, i) => (i === index ? { ...r, inicio: event.target.value } : r))
                            )
                          }
                          type="time"
                          value={rango.inicio}
                        />
                        <span className="text-sm text-slate-400">a</span>
                        <input
                          className="field max-w-[130px]"
                          onChange={(event) =>
                            setRangos(
                              dia.dow,
                              rangos.map((r, i) => (i === index ? { ...r, fin: event.target.value } : r))
                            )
                          }
                          type="time"
                          value={rango.fin}
                        />
                        <button
                          aria-label="Quitar rango"
                          className="border border-white/10 bg-white/8 p-1.5 text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
                          onClick={() => setRangos(dia.dow, rangos.filter((_, i) => i !== index))}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === rangos.length - 1 && rangos.length < 3 ? (
                          <button
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 transition hover:text-emerald-200"
                            onClick={() => setRangos(dia.dow, [...rangos, { inicio: "15:00", fin: "18:00" }])}
                            type="button"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Otro rango
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Sin atención</span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Vista previa de horarios generados">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {preview.map((dia) => {
            const info = DIAS_SEMANA.find((d) => d.dow === dia.dow)!;
            return (
              <div key={dia.dow} className="border border-white/10 bg-white/4 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{info.corto}</div>
                {dia.horas.length === 0 ? (
                  <div className="mt-2 text-xs text-slate-600">—</div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dia.horas.map((hora) => (
                      <span key={hora} className="border border-emerald-300/30 bg-emerald-300/8 px-1.5 py-0.5 text-[11px] text-emerald-200">
                        {hora}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Así se verán los espacios disponibles en tu página pública (sin contar citas ya ocupadas).
        </p>
      </SectionCard>
    </div>
  );
}
