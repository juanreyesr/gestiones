"use client";

import { AlertTriangle, BookmarkPlus, Check, ClipboardCheck, Copy, ListChecks, Send, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { horaGuatemala, saludoPorHora } from "@/lib/control-revision-mensajes";
import { contextoPlan, esFichaRecurso, generarPlanIA, nombreRecurso, type PlanIA } from "@/lib/clinica/plan-ia";
import { avisarCambioMetas, crearMeta, fetchMetas } from "@/lib/clinica/metas";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { agregarTareaASesionReciente } from "@/lib/clinica/sesiones";
import type { CompromisoRow, PacienteRow, SesionRow } from "@/lib/clinica/types";
import { fetchEvaluacionesDePaciente } from "@/lib/evaluaciones/evaluaciones";
import { ETAPAS_FICHAS } from "@/lib/evaluaciones/fichas/catalogo";
import { IconoWhatsApp } from "./boton-whatsapp-paciente";
import { useMetas } from "./metas-paciente";
import { abrirSeccion, EVENTO_ACCION_FICHA, type AccionFicha } from "./seccion-plegable";
import { BTN_ACCENT, BTN_GHOST, SectionCard } from "./ui";

const ESTADO_META: Record<PlanIA["metas"][number]["estado"], { label: string; clase: string }> = {
  nueva: { label: "Nueva", clase: "border-sky-400/40 bg-sky-400/10 text-sky-200" },
  en_curso: { label: "En curso", clase: "border-amber-300/40 bg-amber-300/10 text-amber-100" },
  lograda: { label: "Lograda", clase: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
  estancada: { label: "Estancada", clase: "border-rose-400/40 bg-rose-400/10 text-rose-200" },
};
const CUANDO: Record<PlanIA["recursos"][number]["cuando"], string> = {
  ahora: "Enviar ahora",
  proxima_sesion: "En la próxima sesión",
  reevaluacion: "Reevaluación",
};

function Rotulo({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</h4>;
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? "";

/**
 * «Plan terapéutico con IA»: a partir del expediente (motivo, metas de la ficha 1.1,
 * sesiones, compromisos, evaluaciones y fichas) propone metas medibles, los recursos
 * de la plataforma a usar, tareas de la semana y un mensaje de seguimiento para el
 * paciente. Todo es una propuesta: cada acción la confirma el psicólogo.
 */
export function PlanIAPaciente({
  compromisos,
  onCambio,
  paciente,
  sesiones,
}: {
  compromisos: CompromisoRow[];
  onCambio: () => void;
  paciente: PacienteRow;
  sesiones: SesionRow[];
}) {
  const [enfoque, setEnfoque] = useState("");
  const [cargando, setCargando] = useState(false);
  const [plan, setPlan] = useState<PlanIA | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [tareas, setTareas] = useState<Set<number>>(new Set());
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const { metas: metasGuardadas, faltaMigracion } = useMetas(paciente.id);
  const yaGuardada = (texto: string) => metasGuardadas.some((m) => m.meta.trim().toLowerCase() === texto.trim().toLowerCase());

  const avisar = (t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(""), 5000);
  };

  const generar = async () => {
    setCargando(true);
    setError("");
    // Metas guardadas: se piden aquí (no se usa la lista del panel, que podría no haber cargado aún).
    const [{ respuestas, evaluaciones, error: errEval }, metasActuales] = await Promise.all([fetchEvaluacionesDePaciente(paciente.id), fetchMetas(paciente.id)]);
    if (metasActuales.error && !metasActuales.faltaMigracion) {
      setCargando(false);
      return setError(`No se pudieron leer las metas del paciente (${metasActuales.error}). Intenta de nuevo.`);
    }
    // Sin evaluaciones completas el plan podría repetir fichas o pasar por alto alertas: mejor reintentar.
    if (errEval) {
      setCargando(false);
      return setError(`No se pudieron leer las evaluaciones del paciente (${errEval}). Intenta de nuevo.`);
    }
    const contexto = contextoPlan({ paciente, sesiones, compromisos, respuestas, evaluaciones, metas: metasActuales.data, enfoque });
    const r = await generarPlanIA(contexto);
    setCargando(false);
    if (r.noConfigurado) return setError("La IA no está configurada (falta ANTHROPIC_API_KEY en Vercel).");
    if (r.error || !r.data) return setError(r.error ?? "No se pudo generar el plan.");
    const nombre = primerNombre(paciente.nombre);
    setPlan(r.data);
    setTareas(new Set(r.data.tareas_semana.map((_, i) => i)));
    setMensaje(`${saludoPorHora(horaGuatemala())}${nombre ? `, ${nombre}` : ""}. ${r.data.mensaje_paciente}`);
  };

  const copiar = async (t: string, que: string) => {
    try {
      await navigator.clipboard.writeText(t);
      avisar(`${que} copiado.`);
    } catch {
      avisar("No se pudo copiar: selecciona el texto y cópialo a mano.");
    }
  };

  const accionFicha = (ficha: string, accion: AccionFicha["accion"]) => {
    abrirSeccion("intervencion");
    setTimeout(() => window.dispatchEvent(new CustomEvent<AccionFicha>(EVENTO_ACCION_FICHA, { detail: { ficha, accion } })), 80);
  };

  const irAEvaluaciones = () => abrirSeccion("evaluaciones");

  const agregarTareas = async () => {
    if (!plan) return;
    const elegidas = plan.tareas_semana.filter((_, i) => tareas.has(i));
    if (elegidas.length === 0) return;
    let ok = 0;
    for (const t of elegidas) {
      const r = await agregarTareaASesionReciente(paciente.id, t);
      if (r.agregada) ok += 1;
      else if (r.error) return setError(r.error);
    }
    if (ok === 0) return setError("No hay una sesión del paciente a la cual agregar las tareas.");
    onCambio();
    avisar(`${ok} tarea${ok === 1 ? "" : "s"} agregada${ok === 1 ? "" : "s"} a la última sesión: aparecerán en el seguimiento de compromisos.`);
  };

  return (
    <SectionCard
      plegable={{ id: "plan-ia", resumen: plan ? `etapa ${plan.etapa} · ${plan.metas.length} meta${plan.metas.length === 1 ? "" : "s"}` : "a pedido" }}
      title="Plan terapéutico con IA"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <p className="text-sm text-slate-400">
            Propone metas medibles, las fichas e instrumentos de la plataforma que conviene usar, tareas para la semana y un mensaje de
            seguimiento para el paciente. Usa el expediente sin nombre ni datos de contacto; tú decides qué aplicar.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              maxLength={600}
              onChange={(e) => setEnfoque(e.target.value)}
              placeholder="Opcional: qué quieres priorizar (p. ej. «el insomnio» o «preparar el alta»)"
              value={enfoque}
            />
            <button className={BTN_ACCENT} disabled={cargando} onClick={() => void generar()} type="button">
              <Sparkles className="h-4 w-4" />
              {cargando ? "Analizando el expediente…" : plan ? "Generar de nuevo" : "Generar plan con IA"}
            </button>
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {aviso ? <p className="text-sm text-emerald-300">{aviso}</p> : null}
        </div>

        {plan ? (
          <>
            {plan.alertas.length ? (
              <div className="grid gap-1 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                  <AlertTriangle className="h-4 w-4" /> Señales a vigilar
                </div>
                <ul className="list-disc pl-5 text-sm text-rose-100">
                  {plan.alertas.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-1">
              <Rotulo>
                Síntesis · etapa {plan.etapa}: {ETAPAS_FICHAS[plan.etapa] ?? ""}
              </Rotulo>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{plan.sintesis}</p>
            </div>

            <div className="grid gap-2">
              <Rotulo>Metas terapéuticas</Rotulo>
              {plan.metas.map((m, i) => (
                <div className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-3" key={i}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="flex items-start gap-2 text-sm font-semibold text-white">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      {m.meta}
                    </p>
                    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${ESTADO_META[m.estado].clase}`}>{ESTADO_META[m.estado].label}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-300">Cómo se mide:</span> {m.indicador} · <span className="text-slate-300">Plazo:</span> {m.plazo}
                  </p>
                  {faltaMigracion ? null : yaGuardada(m.meta) ? (
                    <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
                      <Check className="h-3.5 w-3.5" /> En tus metas terapéuticas
                    </p>
                  ) : (
                    <div>
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 hover:text-amber-100"
                        onClick={async () => {
                          const { error: err } = await crearMeta(paciente.id, { meta: m.meta, indicador: m.indicador, plazo: m.plazo, origen: "ia", orden: metasGuardadas.length });
                          if (err) return setError(err);
                          avisarCambioMetas();
                          avisar("Meta guardada: puntúa su avance en cada sesión.");
                        }}
                        type="button"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" /> Guardar en metas terapéuticas
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Rotulo>Recursos sugeridos de la plataforma</Rotulo>
              {plan.recursos.map((r) => {
                const ficha = esFichaRecurso(r.id);
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3" key={r.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{nombreRecurso(r.id)}</p>
                      <p className="text-xs text-slate-400">
                        {CUANDO[r.cuando]} · {r.para_que}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ficha ? (
                        <>
                          <button className={BTN_GHOST} onClick={() => accionFicha(r.id, "enviar")} type="button">
                            <Send className="h-4 w-4" /> Enviar al paciente
                          </button>
                          <button className={BTN_GHOST} onClick={() => accionFicha(r.id, "llenar")} type="button">
                            <ClipboardCheck className="h-4 w-4" /> Llenarla en sesión
                          </button>
                        </>
                      ) : (
                        <button className={BTN_GHOST} onClick={irAEvaluaciones} type="button">
                          <ClipboardCheck className="h-4 w-4" /> Ir a asignar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {plan.tareas_semana.length ? (
              <div className="grid gap-2">
                <Rotulo>Tareas para esta semana</Rotulo>
                {plan.tareas_semana.map((t, i) => (
                  <label className="flex items-start gap-2 text-sm text-slate-200" key={i}>
                    <input
                      checked={tareas.has(i)}
                      className="mt-1"
                      onChange={(e) =>
                        setTareas((prev) => {
                          const n = new Set(prev);
                          if (e.target.checked) n.add(i);
                          else n.delete(i);
                          return n;
                        })
                      }
                      type="checkbox"
                    />
                    {t}
                  </label>
                ))}
                <div>
                  <button className={BTN_GHOST} disabled={tareas.size === 0} onClick={() => void agregarTareas()} type="button">
                    <ListChecks className="h-4 w-4" /> Agregar las marcadas a las tareas del paciente
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Rotulo>Mensaje de seguimiento para el paciente (editable)</Rotulo>
              <textarea
                className="min-h-40 rounded-lg border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white"
                onChange={(e) => setMensaje(e.target.value)}
                value={mensaje}
              />
              <div className="flex flex-wrap gap-2">
                <a
                  className={BTN_ACCENT}
                  href={enlaceWhatsApp(paciente.telefono, mensaje, paciente.pais)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <IconoWhatsApp className="h-4 w-4" /> Enviar por WhatsApp
                </a>
                <button className={BTN_GHOST} onClick={() => void copiar(mensaje, "Mensaje")} type="button">
                  <Copy className="h-4 w-4" /> Copiar
                </button>
              </div>
            </div>

            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-2">
                <Rotulo>Foco de la próxima sesión</Rotulo>
                <button className="text-xs text-slate-400 hover:text-white" onClick={() => void copiar(plan.foco_proxima_sesion, "Foco")} type="button">
                  Copiar
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{plan.foco_proxima_sesion}</p>
            </div>

            <p className="text-xs text-slate-500">Propuesta generada con IA para tu criterio clínico; no sustituye tu evaluación.</p>
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
