"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Download, History, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  actualizarMeta,
  avisarCambioMetas,
  crearMeta,
  EVENTO_METAS_CAMBIO,
  eliminarAvance,
  eliminarMeta,
  fetchMetas,
  META_ESTADOS,
  registrarAvance,
  tendencia,
  type MetaEstado,
  type MetaRow,
} from "@/lib/clinica/metas";
import { metasDeFicha } from "@/lib/clinica/plan-ia";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import { fetchEvaluacionesDePaciente } from "@/lib/evaluaciones/evaluaciones";
import { BTN_ACCENT, BTN_GHOST, SectionCard } from "./ui";

/* ------------------------------- datos -------------------------------- */

export function useMetas(pacienteId: string) {
  const [metas, setMetas] = useState<MetaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);

  const cargar = useCallback(async () => {
    const r = await fetchMetas(pacienteId);
    setMetas(r.data);
    setError(r.error);
    setFaltaMigracion(r.faltaMigracion);
    setCargando(false);
  }, [pacienteId]);

  useEffect(() => {
    // Carga inicial y al cambiar las metas desde otro panel (plan con IA, sesión).
    const t = setTimeout(() => void cargar(), 0);
    const alCambiar = () => void cargar();
    window.addEventListener(EVENTO_METAS_CAMBIO, alCambiar);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENTO_METAS_CAMBIO, alCambiar);
    };
  }, [cargar]);

  return { metas, cargando, error, faltaMigracion, recargar: cargar };
}

/* ------------------------------ gráfica ------------------------------- */

const COLOR_ESTADO: Record<MetaEstado, string> = {
  activa: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  lograda: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  pausada: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  descartada: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};

/** Evolución de 0 a 10 (una marca por registro). */
export function GraficaMeta({ meta, ancho = 220, alto = 56 }: { meta: MetaRow; ancho?: number; alto?: number }) {
  const puntos = meta.avances;
  if (puntos.length === 0) return <p className="text-xs text-slate-500">Sin registros de avance todavía.</p>;
  const pad = 6;
  const x = (i: number) => (puntos.length === 1 ? ancho / 2 : pad + (i * (ancho - 2 * pad)) / (puntos.length - 1));
  const y = (v: number) => alto - pad - (v / 10) * (alto - 2 * pad);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.puntuacion).toFixed(1)}`).join(" ");
  return (
    <svg
      aria-label={`Avance: ${puntos.map((p) => p.puntuacion).join(", ")} de 10`}
      className="max-w-full"
      height={alto}
      role="img"
      viewBox={`0 0 ${ancho} ${alto}`}
      width={ancho}
    >
      <line stroke="currentColor" strokeOpacity={0.15} x1={pad} x2={ancho - pad} y1={y(5)} y2={y(5)} />
      <line stroke="currentColor" strokeOpacity={0.15} x1={pad} x2={ancho - pad} y1={y(10)} y2={y(10)} />
      <line stroke="currentColor" strokeOpacity={0.15} x1={pad} x2={ancho - pad} y1={y(0)} y2={y(0)} />
      <path className="text-amber-300" d={linea} fill="none" stroke="currentColor" strokeWidth={2} />
      {puntos.map((p, i) => (
        <circle className="text-amber-300" cx={x(i)} cy={y(p.puntuacion)} fill="currentColor" key={p.id} r={3}>
          <title>{`${formatoFechaCorta(`${p.fecha}T12:00:00`)}: ${p.puntuacion}/10${p.nota ? ` · ${p.nota}` : ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Tendencia({ meta }: { meta: MetaRow }) {
  const { ultima, cambio } = tendencia(meta);
  if (ultima === null) return null;
  const Icono = cambio === null || cambio === 0 ? ArrowRight : cambio > 0 ? ArrowUpRight : ArrowDownRight;
  const color = cambio === null || cambio === 0 ? "text-slate-300" : cambio > 0 ? "text-emerald-300" : "text-rose-300";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${color}`} title="Última puntuación y cambio desde el primer registro">
      {ultima}/10
      <Icono className="h-4 w-4" />
      {cambio ? `${cambio > 0 ? "+" : ""}${cambio}` : ""}
    </span>
  );
}

/** Botones 0–10 para puntuar el avance. */
export function Escala({ valor, onElegir, deshabilitado }: { valor: number | null; onElegir: (v: number) => void; deshabilitado?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 11 }, (_, v) => (
        <button
          className={`h-7 w-7 rounded border text-xs font-semibold transition ${
            valor === v ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/15 bg-white/5 text-slate-200 hover:border-amber-300/60"
          }`}
          disabled={deshabilitado}
          key={v}
          onClick={() => onElegir(v)}
          type="button"
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/* --------------------------- tarjeta de meta -------------------------- */

const inputClase = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";

function MetaTarjeta({ meta, pacienteId, onError }: { meta: MetaRow; pacienteId: string; onError: (e: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState({ meta: meta.meta, indicador: meta.indicador ?? "", plazo: meta.plazo ?? "" });
  const [puntuacion, setPuntuacion] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [verHistorial, setVerHistorial] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const hecho = (error: string | null) => {
    setTrabajando(false);
    if (error) return onError(error);
    avisarCambioMetas();
  };

  const guardarTexto = async () => {
    setTrabajando(true);
    const { error } = await actualizarMeta(meta.id, texto);
    if (!error) setEditando(false);
    hecho(error);
  };

  const guardarAvance = async () => {
    if (puntuacion === null) return;
    setTrabajando(true);
    const { error } = await registrarAvance({ metaId: meta.id, pacienteId, puntuacion, nota });
    if (!error) {
      setPuntuacion(null);
      setNota("");
    }
    hecho(error);
  };

  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      {editando ? (
        <div className="grid gap-2">
          <input className={inputClase} maxLength={300} onChange={(e) => setTexto({ ...texto, meta: e.target.value })} placeholder="Meta" value={texto.meta} />
          <input
            className={inputClase}
            maxLength={300}
            onChange={(e) => setTexto({ ...texto, indicador: e.target.value })}
            placeholder="¿Cómo se mide? (p. ej. «3 días por semana sin bajarme antes»)"
            value={texto.indicador}
          />
          <input className={inputClase} maxLength={100} onChange={(e) => setTexto({ ...texto, plazo: e.target.value })} placeholder="Plazo (p. ej. «2 meses»)" value={texto.plazo} />
          <div className="flex flex-wrap gap-2">
            <button className={BTN_ACCENT} disabled={trabajando} onClick={() => void guardarTexto()} type="button">
              Guardar
            </button>
            <button className={BTN_GHOST} onClick={() => setEditando(false)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-start gap-2 text-sm font-semibold text-white">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              {meta.meta}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {meta.indicador ? (
                <>
                  <span className="text-slate-300">Cómo se mide:</span> {meta.indicador}
                </>
              ) : (
                "Sin indicador"
              )}
              {meta.plazo ? (
                <>
                  {" · "}
                  <span className="text-slate-300">Plazo:</span> {meta.plazo}
                </>
              ) : null}
              {meta.origen !== "manual" ? ` · ${meta.origen === "ia" ? "Propuesta por la IA" : "De la ficha 1.1"}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tendencia meta={meta} />
            <select
              className={`rounded border px-2 py-1 text-xs font-semibold ${COLOR_ESTADO[meta.estado]}`}
              disabled={trabajando}
              onChange={async (e) => {
                setTrabajando(true);
                hecho((await actualizarMeta(meta.id, { estado: e.target.value as MetaEstado })).error);
              }}
              value={meta.estado}
            >
              {META_ESTADOS.map((s) => (
                <option className="bg-slate-900 text-white" key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button aria-label="Editar meta" className="text-slate-400 hover:text-white" onClick={() => setEditando(true)} type="button">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              aria-label="Eliminar meta"
              className="text-slate-400 hover:text-rose-300"
              onClick={async () => {
                if (!window.confirm(`¿Eliminar la meta «${meta.meta}» y todo su historial de avance?`)) return;
                setTrabajando(true);
                hecho((await eliminarMeta(meta.id)).error);
              }}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <GraficaMeta meta={meta} />
        {meta.avances.length ? (
          <button className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white" onClick={() => setVerHistorial((v) => !v)} type="button">
            <History className="h-3.5 w-3.5" />
            {verHistorial ? "Ocultar historial" : `Historial (${meta.avances.length})`}
          </button>
        ) : null}
      </div>

      {verHistorial ? (
        <ul className="grid gap-1 text-xs text-slate-300">
          {[...meta.avances].reverse().map((a) => (
            <li className="flex items-start justify-between gap-2 border-t border-white/5 pt-1" key={a.id}>
              <span>
                <span className="font-semibold text-white">{a.puntuacion}/10</span> · {formatoFechaCorta(`${a.fecha}T12:00:00`)}
                {a.sesionId ? " · en sesión" : ""}
                {a.nota ? ` · ${a.nota}` : ""}
              </span>
              <button
                aria-label="Borrar registro"
                className="text-slate-500 hover:text-rose-300"
                onClick={async () => {
                  if (!window.confirm("¿Borrar este registro de avance?")) return;
                  setTrabajando(true);
                  hecho((await eliminarAvance(a.id)).error);
                }}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {meta.estado === "activa" ? (
        <div className="grid gap-2 border-t border-white/5 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Registrar avance de hoy (0 = nada, 10 = lograda)</p>
          <Escala deshabilitado={trabajando} onElegir={setPuntuacion} valor={puntuacion} />
          {puntuacion !== null ? (
            <div className="flex flex-wrap gap-2">
              <input className={`${inputClase} min-w-0 flex-1`} maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder="Nota breve (opcional)" value={nota} />
              <button className={BTN_ACCENT} disabled={trabajando} onClick={() => void guardarAvance()} type="button">
                Guardar {puntuacion}/10
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- expediente ----------------------------- */

/** «Metas terapéuticas»: metas con indicador, plazo, estado y evolución de 0 a 10. */
export function MetasPaciente({ pacienteId }: { pacienteId: string }) {
  const { metas, cargando, error, faltaMigracion } = useMetas(pacienteId);
  const [nueva, setNueva] = useState<{ meta: string; indicador: string; plazo: string } | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const activas = metas.filter((m) => m.estado === "activa");
  const logradas = metas.filter((m) => m.estado === "lograda").length;
  const resumen = cargando ? "…" : metas.length ? `${activas.length} activa${activas.length === 1 ? "" : "s"}${logradas ? ` · ${logradas} lograda${logradas === 1 ? "" : "s"}` : ""}` : "sin metas";

  const guardarNueva = async () => {
    if (!nueva) return;
    setTrabajando(true);
    const { error: err } = await crearMeta(pacienteId, { ...nueva, orden: metas.length });
    setTrabajando(false);
    if (err) return setMensaje(err);
    setNueva(null);
    setMensaje("");
    avisarCambioMetas();
  };

  const importarFicha = async () => {
    setTrabajando(true);
    setMensaje("");
    const { respuestas, error: errEval } = await fetchEvaluacionesDePaciente(pacienteId);
    if (errEval) {
      setTrabajando(false);
      return setMensaje(`No se pudieron leer las fichas: ${errEval}`);
    }
    const existentes = new Set(metas.map((m) => m.meta.trim().toLowerCase()));
    const nuevas = metasDeFicha(respuestas).filter((m) => !existentes.has(m.meta.trim().toLowerCase()));
    let orden = metas.length;
    for (const m of nuevas) {
      const { error: err } = await crearMeta(pacienteId, { meta: m.meta, indicador: m.avance, plazo: m.plazo, origen: "ficha", orden: orden++ });
      if (err) {
        setTrabajando(false);
        return setMensaje(err);
      }
    }
    setTrabajando(false);
    setMensaje(nuevas.length ? `${nuevas.length} meta${nuevas.length === 1 ? "" : "s"} importada${nuevas.length === 1 ? "" : "s"} de la ficha 1.1.` : "No hay metas nuevas en la ficha 1.1 (o el paciente aún no la responde).");
    if (nuevas.length) avisarCambioMetas();
  };

  return (
    <SectionCard plegable={{ id: "metas", resumen, abierta: true }} title="Metas terapéuticas">
      {faltaMigracion ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : (
        <div className="grid gap-3">
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {mensaje ? <p className="text-sm text-slate-300">{mensaje}</p> : null}
          {!cargando && metas.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aún no hay metas. Agrégalas a mano, impórtalas de la ficha 1.1 o guárdalas desde el «Plan terapéutico con IA». Puntúa su avance de 0 a 10 en
              cada sesión para ver su evolución.
            </p>
          ) : null}
          {metas
            .filter((m) => m.estado === "activa")
            .concat(metas.filter((m) => m.estado !== "activa"))
            .map((m) => (
              <MetaTarjeta key={`${m.id}-${m.meta}-${m.indicador}-${m.plazo}`} meta={m} onError={setMensaje} pacienteId={pacienteId} />
            ))}

          {nueva ? (
            <div className="grid gap-2 rounded-lg border border-amber-300/30 bg-amber-300/5 p-3">
              <input
                autoFocus
                className={inputClase}
                maxLength={300}
                onChange={(e) => setNueva({ ...nueva, meta: e.target.value })}
                placeholder="Meta concreta (p. ej. «Manejar hasta el trabajo»)"
                value={nueva.meta}
              />
              <input
                className={inputClase}
                maxLength={300}
                onChange={(e) => setNueva({ ...nueva, indicador: e.target.value })}
                placeholder="¿Cómo se mide? (algo que se pueda contar o ver)"
                value={nueva.indicador}
              />
              <input className={inputClase} maxLength={100} onChange={(e) => setNueva({ ...nueva, plazo: e.target.value })} placeholder="Plazo (p. ej. «6 semanas»)" value={nueva.plazo} />
              <div className="flex flex-wrap gap-2">
                <button className={BTN_ACCENT} disabled={trabajando || !nueva.meta.trim()} onClick={() => void guardarNueva()} type="button">
                  Guardar meta
                </button>
                <button className={BTN_GHOST} onClick={() => setNueva(null)} type="button">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className={BTN_GHOST} onClick={() => setNueva({ meta: "", indicador: "", plazo: "" })} type="button">
                <Plus className="h-4 w-4" /> Agregar meta
              </button>
              <button className={BTN_GHOST} disabled={trabajando} onClick={() => void importarFicha()} type="button">
                <Download className="h-4 w-4" /> Importar de la ficha 1.1
              </button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/* ------------------------------- sesión ------------------------------- */

/** En la sesión en curso: puntuar el avance de cada meta activa (queda ligado a esta sesión). */
export function AvanceMetasSesion({ pacienteId, sesionId }: { pacienteId: string; sesionId: string }) {
  const { metas, faltaMigracion } = useMetas(pacienteId);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const activas = metas.filter((m) => m.estado === "activa");
  if (faltaMigracion || activas.length === 0) return null;

  return (
    <SectionCard title="Avance de metas (hoy)">
      <div className="grid gap-3">
        {activas.map((m) => {
          const deHoy = m.avances.find((a) => a.sesionId === sesionId) ?? null;
          const anterior = [...m.avances].reverse().find((a) => a.sesionId !== sesionId) ?? null;
          return (
            <div className="grid gap-1.5" key={m.id}>
              <p className="text-sm leading-5 text-slate-200">{m.meta}</p>
              <p className="text-[11px] text-slate-500">
                {anterior ? `Anterior: ${anterior.puntuacion}/10 (${formatoFechaCorta(`${anterior.fecha}T12:00:00`)})` : "Primer registro"}
                {deHoy ? ` · Hoy: ${deHoy.puntuacion}/10` : ""}
              </p>
              <Escala
                deshabilitado={guardando === m.id}
                onElegir={async (v) => {
                  setGuardando(m.id);
                  const { error: err } = await registrarAvance({ metaId: m.id, pacienteId, puntuacion: v, sesionId });
                  setGuardando(null);
                  if (err) return setError(err);
                  setError("");
                  avisarCambioMetas();
                }}
                valor={deHoy?.puntuacion ?? null}
              />
            </div>
          );
        })}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        <p className="text-xs leading-5 text-slate-500">Pregúntale al paciente cuánto ha avanzado en cada meta (0 a 10). Se guarda al tocar el número.</p>
      </div>
    </SectionCard>
  );
}
