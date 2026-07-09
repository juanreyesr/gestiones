"use client";

import { ArrowRight, History, MessageCircleQuestion, NotebookPen, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CompromisoRow, PacienteRow, SesionModalidad, SesionRow } from "@/lib/clinica/types";
import {
  descartarSesion,
  finalizarSesion,
  guardarNotasSesion,
  setModalidadSesion,
} from "@/lib/clinica/sesiones";
import { formatoFechaLarga, formatoHora } from "@/lib/clinica/slots";
import { ConfirmDialog } from "../confirm-dialog";
import { CierreForm, type CierreValues } from "./cierre-form";
import { BTN_PRIMARY, SectionCard } from "./ui";

export function SesionActiva({
  compromisosPendientes,
  onFinalizada,
  onDescartada,
  paciente,
  sesion,
  sesionAnterior,
}: {
  compromisosPendientes: CompromisoRow[];
  onFinalizada: () => void;
  onDescartada: () => void;
  paciente: PacienteRow;
  sesion: SesionRow;
  sesionAnterior: SesionRow | null;
}) {
  const [modalidad, setModalidad] = useState<SesionModalidad | null>(sesion.modalidad);
  const [tema, setTema] = useState(sesion.tema ?? "");
  const [temaDraft, setTemaDraft] = useState(sesion.tema ?? "");
  const [notas, setNotas] = useState(sesion.notas ?? "");
  const [guardadoNotas, setGuardadoNotas] = useState<"guardado" | "pendiente" | "error" | null>(null);
  const [cumplidosIds, setCumplidosIds] = useState<Set<string>>(new Set());
  const [enCierre, setEnCierre] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDescartar, setConfirmDescartar] = useState(false);
  const [descartando, setDescartando] = useState(false);

  const notasRef = useRef(notas);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guardarNotas = useCallback(async () => {
    const { error: saveError } = await guardarNotasSesion(sesion.id, notasRef.current);
    setGuardadoNotas(saveError ? "error" : "guardado");
  }, [sesion.id]);

  const handleNotasChange = (value: string) => {
    setNotas(value);
    notasRef.current = value;
    setGuardadoNotas("pendiente");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void guardarNotas();
    }, 1500);
  };

  useEffect(() => {
    return () => {
      // Flush: si quedaban notas sin guardar al desmontar, guardarlas de inmediato.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        void guardarNotas();
      }
    };
  }, [guardarNotas]);

  const handleElegirModalidad = async (elegida: SesionModalidad) => {
    const temaFinal = elegida === "tema_nuevo" ? temaDraft.trim() : null;
    if (elegida === "tema_nuevo" && !temaFinal) {
      setError("Escribe el tema que se abordará hoy.");
      return;
    }
    setError("");
    const { error: modError } = await setModalidadSesion(sesion.id, elegida, temaFinal);
    if (modError) {
      setError(modError);
      return;
    }
    setModalidad(elegida);
    setTema(temaFinal ?? "");
  };

  const toggleCumplido = (id: string) => {
    setCumplidosIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGuardarCierre = async (values: CierreValues) => {
    setSaving(true);
    setError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const { error: finError } = await finalizarSesion({
      sesionId: sesion.id,
      pacienteId: paciente.id,
      citaId: sesion.citaId,
      resumen: values.resumen,
      seguimiento: values.seguimiento || null,
      resumenOrigen: values.resumenOrigen,
      notas: notasRef.current,
      compromisos: values.compromisos,
      tareas: values.tareas,
      compromisosCumplidosIds: Array.from(cumplidosIds),
    });
    setSaving(false);
    if (finError) {
      setError(finError);
      return;
    }
    onFinalizada();
  };

  const handleDescartar = async () => {
    setDescartando(true);
    const { error: delError } = await descartarSesion(sesion.id);
    setDescartando(false);
    setConfirmDescartar(false);
    if (delError) {
      setError(delError);
      return;
    }
    onDescartada();
  };

  const pendientes = useMemo(
    () => compromisosPendientes.filter((item) => item.sesionId !== sesion.id),
    [compromisosPendientes, sesion.id]
  );

  // ---------- APERTURA: elegir modalidad ----------
  if (!modalidad) {
    return (
      <div className="grid gap-5">
        <header>
          <div className="text-xs font-semibold uppercase text-slate-400">Sesión con {paciente.nombre}</div>
          <h2 className="mt-2 flex items-center gap-3 text-2xl font-semibold text-white">
            <MessageCircleQuestion className="h-7 w-7 text-emerald-300" />
            ¿De qué quiere hablar hoy?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            ¿Algo específico o le damos seguimiento a la sesión anterior?
          </p>
        </header>

        {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <button
            className="group grid content-start gap-3 border border-white/10 bg-white/6 p-5 text-left transition hover:border-emerald-300/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!sesionAnterior}
            onClick={() => handleElegirModalidad("seguimiento")}
            type="button"
          >
            <span className="flex h-11 w-11 items-center justify-center bg-emerald-300/15">
              <History className="h-5 w-5 text-emerald-300" />
            </span>
            <span className="text-lg font-semibold text-white">Seguimiento de la sesión anterior</span>
            <span className="text-sm leading-6 text-slate-400">
              {sesionAnterior
                ? "Retoma el trabajo donde quedó: verás el resumen de la última sesión y sus compromisos."
                : "Primera sesión: aún no hay una sesión anterior a la cual dar seguimiento."}
            </span>
            {sesionAnterior ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 transition group-hover:gap-2">
                Continuar <ArrowRight className="h-4 w-4" />
              </span>
            ) : null}
          </button>

          <div className="grid content-start gap-3 border border-white/10 bg-white/6 p-5">
            <span className="flex h-11 w-11 items-center justify-center bg-sky-300/15">
              <Sparkles className="h-5 w-5 text-sky-300" />
            </span>
            <span className="text-lg font-semibold text-white">Algo específico</span>
            <span className="text-sm leading-6 text-slate-400">
              Escribe el tema que el paciente quiere abordar hoy. Verás solo los compromisos y tareas pendientes.
            </span>
            <input
              className="field"
              onChange={(event) => setTemaDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleElegirModalidad("tema_nuevo");
              }}
              placeholder="Tema de hoy..."
              value={temaDraft}
            />
            <button
              className={`${BTN_PRIMARY} w-fit`}
              disabled={temaDraft.trim().length === 0}
              onClick={() => handleElegirModalidad("tema_nuevo")}
              type="button"
            >
              Comenzar con este tema
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-red-300"
          onClick={() => setConfirmDescartar(true)}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
          Descartar esta sesión
        </button>

        <ConfirmDialog
          busy={descartando}
          message="Se eliminará la sesión iniciada sin guardar nada. Esta acción no se puede deshacer."
          onCancel={() => setConfirmDescartar(false)}
          onConfirm={handleDescartar}
          open={confirmDescartar}
          title="Descartar sesión"
        />
      </div>
    );
  }

  // ---------- CIERRE ----------
  if (enCierre) {
    return (
      <div className="grid gap-4">
        {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
        <CierreForm
          modalidad={modalidad}
          notas={notas}
          onGuardar={handleGuardarCierre}
          onVolver={() => setEnCierre(false)}
          resumenAnterior={sesionAnterior?.resumen ?? null}
          saving={saving}
          tema={tema || null}
        />
      </div>
    );
  }

  // ---------- EN CURSO ----------
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">
            Sesión en curso · {formatoFechaLarga(sesion.iniciadaAt)} · {formatoHora(sesion.iniciadaAt)}
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{paciente.nombre}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {modalidad === "seguimiento" ? "Seguimiento de la sesión anterior" : `Tema de hoy: ${tema}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-300"
            onClick={() => setConfirmDescartar(true)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Descartar
          </button>
          <button className={BTN_PRIMARY} onClick={() => setEnCierre(true)} type="button">
            Finalizar sesión
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4">
          {modalidad === "seguimiento" && sesionAnterior?.resumen ? (
            <SectionCard title="Resumen de la sesión anterior">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{sesionAnterior.resumen}</p>
              {sesionAnterior.seguimiento ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="text-xs font-semibold uppercase text-slate-400">Seguimiento pendiente</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{sesionAnterior.seguimiento}</p>
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          <SectionCard
            action={
              guardadoNotas === "guardado" ? (
                <span className="text-xs font-semibold text-emerald-300">Guardado</span>
              ) : guardadoNotas === "pendiente" ? (
                <span className="text-xs font-semibold text-slate-400">Guardando...</span>
              ) : guardadoNotas === "error" ? (
                <span className="text-xs font-semibold text-red-300">Error al guardar</span>
              ) : null
            }
            title="Notas de la sesión"
          >
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <NotebookPen className="h-3.5 w-3.5" />
                Se guardan automáticamente mientras escribes.
              </div>
              <textarea
                className="field min-h-[320px] resize-y leading-7"
                onChange={(event) => handleNotasChange(event.target.value)}
                placeholder="Escribe aquí lo que se va trabajando en la sesión..."
                value={notas}
              />
            </div>
          </SectionCard>
        </div>

        <aside className="grid content-start gap-4">
          <SectionCard title="Compromisos y tareas previos">
            {pendientes.length === 0 ? (
              <p className="text-sm text-slate-400">No hay compromisos ni tareas pendientes.</p>
            ) : (
              <ul className="grid gap-2">
                {pendientes.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 border border-white/10 bg-white/4 p-2.5 transition hover:border-emerald-300/40">
                      <input
                        checked={cumplidosIds.has(item.id)}
                        className="mt-1 h-4 w-4 accent-emerald-300"
                        onChange={() => toggleCumplido(item.id)}
                        type="checkbox"
                      />
                      <span>
                        <span
                          className={`block text-sm leading-5 ${
                            cumplidosIds.has(item.id) ? "text-slate-500 line-through" : "text-slate-200"
                          }`}
                        >
                          {item.descripcion}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {item.tipo === "compromiso" ? "Compromiso" : "Tarea"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {pendientes.length > 0 ? (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Marca lo cumplido: se registrará al finalizar la sesión.
              </p>
            ) : null}
          </SectionCard>
        </aside>
      </div>

      <ConfirmDialog
        busy={descartando}
        message="Se eliminará la sesión en curso y sus notas. Esta acción no se puede deshacer."
        onCancel={() => setConfirmDescartar(false)}
        onConfirm={handleDescartar}
        open={confirmDescartar}
        title="Descartar sesión"
      />
    </div>
  );
}
