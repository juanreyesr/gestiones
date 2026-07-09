"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardList,
  Copy,
  FileDown,
  Link2,
  Pencil,
  Phone,
  Play,
  RefreshCw,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProximaCitaDePaciente } from "@/lib/clinica/citas";
import { fetchCompromisosPendientes } from "@/lib/clinica/compromisos";
import { ensureDatosToken, fetchPaciente, reactivarDatos } from "@/lib/clinica/pacientes";
import { exportarExpedientePdf } from "@/lib/clinica/expediente-pdf";
import { fetchSesionEnCurso, fetchSesionesDePaciente, iniciarSesion } from "@/lib/clinica/sesiones";
import { formatoFechaCorta, formatoFechaHora } from "@/lib/clinica/slots";
import type { CitaRow, CompromisoRow, PacienteRow, SesionRow } from "@/lib/clinica/types";
import { PacienteForm } from "./paciente-form";
import { SesionActiva } from "./sesion-activa";
import { SesionDetalle } from "./sesion-detalle";
import { BTN_ACCENT, BTN_GHOST, EmptyState, PacienteBadge, SectionCard } from "./ui";

type Vista = "ficha" | "editar" | "sesion";

function edad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();
  let years = hoy.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAnio = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (hoy < cumpleEsteAnio) years -= 1;
  return years;
}

function DatoFicha({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm leading-6 text-slate-200">{value}</div>
    </div>
  );
}

export function PacienteExpediente({
  onDatosGuardados,
  onVolver,
  pacienteId,
}: {
  onDatosGuardados: () => void;
  onVolver: () => void;
  pacienteId: string;
}) {
  const [paciente, setPaciente] = useState<PacienteRow | null>(null);
  const [sesiones, setSesiones] = useState<SesionRow[]>([]);
  const [sesionEnCurso, setSesionEnCurso] = useState<SesionRow | null>(null);
  const [compromisos, setCompromisos] = useState<CompromisoRow[]>([]);
  const [proximaCita, setProximaCita] = useState<CitaRow | null>(null);
  const [vista, setVista] = useState<Vista>("ficha");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [sesionAbierta, setSesionAbierta] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [datosMsg, setDatosMsg] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const [pacienteRes, sesionesRes, enCursoRes, compromisosRes, citaRes] = await Promise.all([
      fetchPaciente(pacienteId),
      fetchSesionesDePaciente(pacienteId),
      fetchSesionEnCurso(pacienteId),
      fetchCompromisosPendientes(pacienteId),
      fetchProximaCitaDePaciente(pacienteId),
    ]);
    setLoading(false);

    if (pacienteRes.error || !pacienteRes.data) {
      setError(pacienteRes.error ?? "No se encontró el paciente.");
      return;
    }
    setError("");
    setPaciente(pacienteRes.data);
    setSesiones(sesionesRes.data.filter((sesion) => sesion.estado === "finalizada"));
    setSesionEnCurso(enCursoRes.data);
    setCompromisos(compromisosRes.data);
    setProximaCita(citaRes.data);
  }, [pacienteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const sesionAnterior = useMemo(() => sesiones[0] ?? null, [sesiones]);
  const anios = paciente ? edad(paciente.fechaNacimiento) : null;

  const handleIniciarSesion = async () => {
    if (iniciando) return;
    setIniciando(true);
    if (sesionEnCurso) {
      setVista("sesion");
      setIniciando(false);
      return;
    }
    const { id, error: startError } = await iniciarSesion(pacienteId, proximaCita?.id ?? null);
    setIniciando(false);
    if (startError || !id) {
      setError(startError ?? "No se pudo iniciar la sesión.");
      return;
    }
    await cargar();
    setVista("sesion");
  };

  const handleCopiarEnlaceDatos = async () => {
    if (!paciente) return;
    setDatosMsg("");
    const { token, error: tokenError } = await ensureDatosToken(paciente.id, paciente.datosToken);
    if (tokenError || !token) {
      setDatosMsg(tokenError ?? "No se pudo generar el enlace.");
      return;
    }
    const url = `${window.location.origin}/datos/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      if (!paciente.datosToken) void cargar();
    } catch {
      setDatosMsg(url);
    }
  };

  const handleReactivarDatos = async () => {
    if (!paciente) return;
    const { error: err } = await reactivarDatos(paciente.id);
    if (err) {
      setDatosMsg(err);
      return;
    }
    void cargar();
  };

  if (loading && !paciente) {
    return <EmptyState>Cargando expediente...</EmptyState>;
  }

  if (!paciente) {
    return (
      <div className="grid gap-4">
        <button className={BTN_GHOST} onClick={onVolver} type="button">
          <ChevronLeft className="h-4 w-4" />
          Volver a pacientes
        </button>
        <EmptyState>{error || "No se encontró el paciente."}</EmptyState>
      </div>
    );
  }

  if (vista === "sesion" && sesionEnCurso) {
    return (
      <SesionActiva
        compromisosPendientes={compromisos}
        onDescartada={() => {
          setVista("ficha");
          void cargar();
        }}
        onFinalizada={() => {
          setVista("ficha");
          void cargar();
        }}
        paciente={paciente}
        sesion={sesionEnCurso}
        sesionAnterior={sesionAnterior}
      />
    );
  }

  if (vista === "editar") {
    return (
      <div className="grid gap-4">
        <button className={BTN_GHOST} onClick={() => setVista("ficha")} type="button">
          <ChevronLeft className="h-4 w-4" />
          Volver al expediente
        </button>
        <h2 className="text-xl font-semibold text-white">Hoja de datos generales · {paciente.nombre}</h2>
        <PacienteForm
          onSaved={() => {
            void cargar();
            onDatosGuardados();
            setVista("ficha");
          }}
          paciente={paciente}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <button className={`${BTN_GHOST} w-fit`} onClick={onVolver} type="button">
        <ChevronLeft className="h-4 w-4" />
        Volver a pacientes
      </button>

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <header className="flex flex-wrap items-start justify-between gap-4 border border-white/10 bg-white/6 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">{paciente.nombre}</h2>
            <PacienteBadge estado={paciente.estado} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-500" />
              {paciente.telefono}
            </span>
            {paciente.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                {paciente.email}
              </span>
            ) : null}
            {anios !== null ? <span>{anios} años</span> : null}
            <span className="text-slate-500">Registro: {formatoFechaCorta(paciente.createdAt)}</span>
          </div>
          {proximaCita ? (
            <div className="mt-3 inline-flex items-center gap-2 border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-sm text-emerald-200">
              <CalendarDays className="h-4 w-4" />
              Próxima cita: {formatoFechaHora(proximaCita.inicio)}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={BTN_GHOST} onClick={() => exportarExpedientePdf(paciente, sesiones)} type="button">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </button>
          <button className={BTN_GHOST} onClick={() => setVista("editar")} type="button">
            <Pencil className="h-4 w-4" />
            Editar datos
          </button>
          <button className={BTN_ACCENT} disabled={iniciando} onClick={handleIniciarSesion} type="button">
            <Play className="h-4 w-4" />
            {sesionEnCurso ? "Continuar sesión en curso" : "Iniciar sesión"}
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4">
          <SectionCard title={`Historial de sesiones (${sesiones.length})`}>
            {sesiones.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aún no hay sesiones registradas. Al iniciar la primera sesión aparecerá aquí su registro.
              </p>
            ) : (
              <div className="grid gap-2">
                {sesiones.map((sesion, index) => {
                  const abierta = sesionAbierta === sesion.id;
                  return (
                    <div key={sesion.id} className="border border-white/10 bg-white/4">
                      <button
                        className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-white/6"
                        onClick={() => setSesionAbierta(abierta ? null : sesion.id)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white">
                            Sesión {sesiones.length - index} · {formatoFechaCorta(sesion.iniciadaAt)}
                            {sesion.modalidad === "tema_nuevo" && sesion.tema ? ` — ${sesion.tema}` : ""}
                            {sesion.modalidad === "seguimiento" ? " — Seguimiento" : ""}
                          </span>
                          {!abierta && sesion.resumen ? (
                            <span className="mt-0.5 block truncate text-xs text-slate-400">{sesion.resumen}</span>
                          ) : null}
                        </span>
                        {abierta ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                      </button>
                      {abierta ? (
                        <div className="border-t border-white/10 p-4">
                          <SesionDetalle sesion={sesion} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="grid content-start gap-4">
          <SectionCard title="Hoja de datos generales">
            {paciente.datosCompletadosAt ? (
              <div className="grid gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Completada por el paciente el {formatoFechaCorta(paciente.datosCompletadosAt)}
                </p>
                <button
                  className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
                  onClick={handleReactivarDatos}
                  type="button"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reabrir para que el paciente la vuelva a llenar
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <p className="text-sm leading-6 text-slate-300">
                  Envía este enlace al paciente para que complete su información. Al guardarla, el enlace se desactiva.
                </p>
                <button className={BTN_GHOST} onClick={handleCopiarEnlaceDatos} type="button">
                  <Link2 className="h-4 w-4" />
                  {copiado ? "¡Enlace copiado!" : "Copiar enlace para datos generales"}
                  {copiado ? null : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            {datosMsg ? <p className="mt-2 break-all text-xs text-slate-400">{datosMsg}</p> : null}
            {paciente.consentimientoAceptadoAt ? (
              <p className="mt-3 inline-flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                Consentimiento aceptado el {formatoFechaCorta(paciente.consentimientoAceptadoAt)}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Compromisos y tareas pendientes">
            {compromisos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin pendientes.</p>
            ) : (
              <ul className="grid gap-2">
                {compromisos.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm leading-5 text-slate-200">
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span>
                      {item.descripcion}
                      <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {item.tipo === "compromiso" ? "Compromiso" : "Tarea"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Ficha clínica">
            <div className="grid gap-3">
              <DatoFicha label="Motivo de consulta" value={paciente.motivoConsulta} />
              <DatoFicha label="Antecedentes psicológicos" value={paciente.antecedentesPsicologicos} />
              <DatoFicha label="Medicación actual" value={paciente.medicacionActual} />
              <DatoFicha label="Ocupación" value={paciente.ocupacion} />
              <DatoFicha label="Estado civil" value={paciente.estadoCivil} />
              <DatoFicha
                label="Contacto de emergencia"
                value={
                  paciente.emergenciaNombre
                    ? `${paciente.emergenciaNombre}${paciente.emergenciaTelefono ? ` · ${paciente.emergenciaTelefono}` : ""}${paciente.emergenciaRelacion ? ` (${paciente.emergenciaRelacion})` : ""}`
                    : null
                }
              />
              <DatoFicha label="Notas generales" value={paciente.notasGenerales} />
              {!paciente.motivoConsulta && !paciente.antecedentesPsicologicos && !paciente.notasGenerales ? (
                <p className="text-sm text-slate-400">
                  La ficha está incompleta. Usa «Editar datos» para completarla cuando tengas la información.
                </p>
              ) : null}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
