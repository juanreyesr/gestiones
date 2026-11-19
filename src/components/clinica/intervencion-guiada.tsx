"use client";

import { AlertTriangle, ChevronDown, ChevronLeft, Copy, Eye, PenLine, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { mensajeEvaluacion } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { agregarTareaASesionReciente } from "@/lib/clinica/sesiones";
import type { PacienteRow } from "@/lib/clinica/types";
import {
  asignarEvaluacion,
  eliminarRespuesta,
  fetchEvaluacionesDePaciente,
  guardarFichaTerapeuta,
  type EvaluacionRespuestaRow,
  type EvaluacionRow,
} from "@/lib/evaluaciones/evaluaciones";
import { ETAPAS_FICHAS, FICHAS, fichaPorId, type FichaId } from "@/lib/evaluaciones/fichas/catalogo";
import { avanceFicha, esFichaDelTerapeuta, type RespuestasFicha, type ValorCampo } from "@/lib/evaluaciones/fichas/codigo";
import {
  borradorInicialFicha,
  datosFichaTerapeuta,
  estadosFichas,
  fechaLegible,
  prellenado,
  sugerenciasIntervencion,
  tareaDeFicha,
  type EstadoClave,
  type EstadoFicha,
} from "@/lib/evaluaciones/fichas/intervencion";
import { riesgoFicha } from "@/lib/evaluaciones/fichas/riesgo";
import { urlPublica } from "@/lib/url-publica";
import { CampoFicha } from "../evaluaciones/ficha-campos";
import { IconoWhatsApp } from "./boton-whatsapp-paciente";
import { GuiaTerapeutaFicha } from "./informe-ficha";
import { abrirSeccion, EVENTO_ABRIR_RESPUESTA, EVENTO_EVALUACIONES_CAMBIO } from "./seccion-plegable";
import { BTN_ACCENT, BTN_GHOST, SectionCard } from "./ui";

const COLOR_ESTADO: Record<EstadoClave, string> = {
  "sin-usar": "text-slate-400",
  enviada: "text-amber-300",
  respondida: "text-emerald-300",
  terapeuta: "text-sky-300",
};

function abrirRespuesta(id: string) {
  abrirSeccion("evaluaciones");
  setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_RESPUESTA, { detail: id })), 80);
}

/**
 * «Intervención guiada»: sugerencias, biblioteca de fichas por etapas con su estado, y el editor
 * para que el terapeuta las llene (con datos del expediente ya puestos) o las envíe al paciente,
 * con o sin lo ya escrito. Lógica en src/lib/evaluaciones/fichas/intervencion.ts.
 */
export function IntervencionGuiada({ motivoCita, paciente }: { motivoCita?: string | null; paciente: PacienteRow }) {
  const [respuestas, setRespuestas] = useState<EvaluacionRespuestaRow[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enlaceNuevo, setEnlaceNuevo] = useState<{ ficha: FichaId; url: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  // Editor («Llenarla yo»).
  const [editando, setEditando] = useState<FichaId | null>(null);
  const [campos, setCampos] = useState<RespuestasFicha>({});
  const [origenes, setOrigenes] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const r = await fetchEvaluacionesDePaciente(paciente.id);
    setRespuestas(r.respuestas);
    setEvaluaciones(r.evaluaciones);
    setError(r.error ?? "");
    setCargando(false);
  }, [paciente.id]);

  useEffect(() => {
    void cargar();
    const alCambiar = (e: Event) => {
      // Lo que cambia esta misma sección ya recargó; lo demás (respuestas nuevas, alarmas…) sí.
      if ((e as CustomEvent<string | undefined>).detail !== "intervencion") void cargar();
    };
    window.addEventListener(EVENTO_EVALUACIONES_CAMBIO, alCambiar);
    return () => window.removeEventListener(EVENTO_EVALUACIONES_CAMBIO, alCambiar);
  }, [cargar]);

  const estados = useMemo(() => estadosFichas(respuestas, evaluaciones), [respuestas, evaluaciones]);
  const sugerencias = useMemo(() => sugerenciasIntervencion(respuestas, evaluaciones), [respuestas, evaluaciones]);
  const estadoDe = (id: FichaId) => estados.find((e) => e.ficha === id)!;

  const avisar = (mensaje: string, ms = 8000) => {
    setAviso(mensaje);
    setTimeout(() => setAviso(""), ms);
  };
  /** Avisa al resto del expediente (lista de evaluaciones, «Antes de la próxima sesión»). */
  const notificar = () => window.dispatchEvent(new CustomEvent(EVENTO_EVALUACIONES_CAMBIO, { detail: "intervencion" }));

  const abrirEditor = (id: FichaId) => {
    const pre = prellenado(id, { paciente, motivoCita, respuestas });
    setCampos(pre.respuestas);
    setOrigenes(pre.origen);
    setError("");
    setEnlaceNuevo(null);
    setEditando(id);
  };
  const poner = (id: string, valor: ValorCampo) => {
    setCampos((prev) => ({ ...prev, [id]: valor }));
    setOrigenes((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _quitado, ...resto } = prev;
      void _quitado;
      return resto;
    });
  };

  const guardar = async () => {
    if (!editando || trabajando) return;
    setError("");
    const v = datosFichaTerapeuta(editando, campos);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setTrabajando(true);
    const { error: err, id } = await guardarFichaTerapeuta(paciente.id, v.datos as unknown as Record<string, unknown>);
    if (err || !id) {
      setTrabajando(false);
      setError(err ?? "No se pudo guardar la ficha.");
      return;
    }
    // Editar = versión nueva: la anterior del terapeuta se borra solo si se confirma.
    const anteriores = respuestas.filter((r) => r.id !== id && esFichaDelTerapeuta(r.datos) && r.datos.ficha === editando);
    if (anteriores.length) {
      const cuando = fechaLegible(anteriores[0].fecha ?? anteriores[0].createdAt.slice(0, 10));
      if (window.confirm(`Se guardó la nueva versión. Su versión anterior de esta ficha (${cuando}) sigue guardada. ¿Desea borrarla para dejar solo esta?`)) {
        for (const a of anteriores) {
          const r = await eliminarRespuesta(a.id);
          if (r.error) setError(`La nueva versión se guardó, pero no se pudo borrar la anterior: ${r.error}`);
        }
      }
    }
    const riesgo = riesgoFicha(fichaPorId(editando)!, v.datos.respuestas).riesgo;
    await cargar();
    notificar();
    setTrabajando(false);
    setEditando(null);
    avisar(`Ficha ${editando} guardada como llenada por el terapeuta: ya aparece en Evaluaciones y en el PDF del expediente.${riesgo ? " Atención: hay frases de riesgo en lo escrito; se marcó la alarma en el expediente." : ""}`);
  };

  /** Crea el enlace de la ficha; con `conRespuestas`, el paciente la encuentra con lo ya escrito. */
  const enviar = async (id: FichaId, conRespuestas: RespuestasFicha | null) => {
    if (trabajando) return;
    setError("");
    let borrador: Record<string, unknown> | null = null;
    if (conRespuestas) {
      const b = borradorInicialFicha(id, conRespuestas);
      if (!b.ok) {
        setError(b.error);
        return;
      }
      borrador = b.borrador;
    }
    if (estadoDe(id).enlaceId && !window.confirm("Ya hay un enlace de esta ficha sin responder. ¿Crear otro de todos modos?")) return;
    setTrabajando(true);
    const { error: err, creadas } = await asignarEvaluacion(paciente.id, "ficha", [paciente.nombre], borrador ? "Enviada con lo ya escrito por el terapeuta" : "", { ficha: id }, borrador);
    if (err || !creadas[0]) {
      setTrabajando(false);
      setError(err ?? "No se pudo crear el enlace.");
      return;
    }
    // Compromiso en la sesión en curso o la última (si no hay o falla, no pasa nada).
    let tarea = false;
    try {
      tarea = (await agregarTareaASesionReciente(paciente.id, tareaDeFicha(id))).agregada;
    } catch {
      tarea = false;
    }
    await cargar();
    notificar();
    setTrabajando(false);
    setEditando(null);
    setEnlaceNuevo({ ficha: id, url: urlPublica(`/evaluacion/${creadas[0].token}`) });
    avisar(`Enlace de la ficha ${id} creado${borrador ? " con lo ya escrito: el paciente lo verá y lo completará o corregirá" : ""}.${tarea ? " Se agregó la tarea a la sesión del paciente." : ""}`);
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar("¡Enlace copiado!", 3000);
    } catch {
      avisar(texto, 6000);
    }
  };
  const whatsapp = (url: string) =>
    window.open(enlaceWhatsApp(paciente.telefono, mensajeEvaluacion(paciente.nombre, url, { esMenor: paciente.esMenor, respuestas: 1 }), paciente.pais), "_blank", "noopener,noreferrer");

  const conRespuesta = estados.filter((e) => e.hecha).length;
  const resumen = [`${conRespuesta} de ${FICHAS.length} fichas con respuesta`, sugerencias.length ? `${sugerencias.length} sugerida${sugerencias.length === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");

  /* ------------------------------ editor ------------------------------ */
  if (editando) {
    const ficha = fichaPorId(editando)!;
    const { respondidas, total } = avanceFicha({ ficha: editando, respuestas: campos });
    const riesgo = riesgoFicha(ficha, campos).riesgo;
    const previa = estadoDe(editando);
    return (
      <SectionCard plegable={{ id: "intervencion", abierta: true, resumen: `Llenando la ficha ${ficha.id}` }} title="Intervención guiada">
        <div className="grid gap-4" data-testid="intervencion-editor">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button className={BTN_GHOST} disabled={trabajando} onClick={() => setEditando(null)} type="button">
              <ChevronLeft className="h-4 w-4" />
              Volver a la biblioteca
            </button>
            <span className="text-xs font-semibold text-slate-400">
              {respondidas} de {total} preguntas respondidas
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Etapa {ficha.etapa} · {ETAPAS_FICHAS[ficha.etapa]}
            </p>
            <h4 className="mt-0.5 text-lg font-semibold text-white">
              Ficha {ficha.id} · {ficha.titulo}
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              Se guarda como «Llenada por el terapeuta» (sin aviso a nadie). {previa.terapeutaId ? "Ya hay una versión suya: esta será una versión nueva." : ""}
            </p>
          </div>
          {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

          <GuiaTerapeutaFicha ficha={ficha} />
          <details className="group border border-white/10 bg-white/4 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-100">
              Lo que le explica la ficha al paciente
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
              {ficha.explicacion.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </details>

          {riesgo ? (
            <div className="flex items-start gap-2 border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-100" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Lo escrito contiene frases de riesgo. Al guardar se marcará la alarma en el expediente (solo para usted).
            </div>
          ) : null}

          {ficha.secciones.map((s) => (
            <section className="grid gap-3" key={s.id}>
              <h5 className="border-t border-white/10 pt-3 text-base font-semibold text-white">{s.titulo}</h5>
              <p className="-mt-1 text-sm leading-6 text-slate-300">{s.intro}</p>
              {s.campos.map((c) => (
                <CampoFicha c={c} key={c.id} origen={origenes[c.id]} poner={poner} respuestas={campos} tema="panel" />
              ))}
            </section>
          ))}
          <section className="grid gap-3">
            <h5 className="border-t border-white/10 pt-3 text-base font-semibold text-white">{ficha.cierre.titulo}</h5>
            <p className="-mt-1 text-sm leading-6 text-slate-300">{ficha.cierre.texto}</p>
            {ficha.cierre.campos.map((c) => (
              <CampoFicha c={c} key={c.id} origen={origenes[c.id]} poner={poner} respuestas={campos} tema="panel" />
            ))}
          </section>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <button className={BTN_ACCENT} disabled={trabajando} onClick={() => void guardar()} type="button">
              <PenLine className="h-4 w-4" />
              {trabajando ? "Guardando…" : "Guardar (llenada por el terapeuta)"}
            </button>
            <button className={BTN_GHOST} disabled={trabajando} onClick={() => void enviar(editando, campos)} title="Crea el enlace con lo escrito aquí como punto de partida" type="button">
              <Send className="h-4 w-4" />
              Enviar al paciente con esto
            </button>
            <button className={BTN_GHOST} disabled={trabajando} onClick={() => setEditando(null)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      </SectionCard>
    );
  }

  /* ------------------------------ lista ------------------------------ */
  const fila = (f: (typeof FICHAS)[number], e: EstadoFicha, sugerida?: string[]) => (
    <div className="grid gap-2 border border-white/10 bg-white/4 p-3" data-testid={`ficha-fila-${f.id}`} key={f.id}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">
          Ficha {f.id} · {f.titulo}
        </div>
        <div className="text-xs leading-5 text-slate-400">{f.paraQue}</div>
        <div className="mt-0.5 text-xs">
          <span className={`font-semibold ${COLOR_ESTADO[e.estado]}`}>{e.etiqueta}</span>
          {e.fecha ? <span className="text-slate-400"> · {fechaLegible(e.fecha)}</span> : null}
        </div>
        {sugerida?.length ? <div className="mt-0.5 text-xs text-amber-200">Sugerida: {sugerida.join(" · ")}</div> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className={BTN_ACCENT} disabled={trabajando} onClick={() => abrirEditor(f.id)} type="button">
          <PenLine className="h-4 w-4" />
          Llenarla yo
        </button>
        <button className={BTN_GHOST} disabled={trabajando} onClick={() => void enviar(f.id, null)} type="button">
          <Send className="h-4 w-4" />
          Enviar al paciente
        </button>
        {e.terapeutaId ? (
          <button
            className={BTN_GHOST}
            disabled={trabajando}
            onClick={() => {
              const t = respuestas.find((r) => r.id === e.terapeutaId);
              const datos = t?.datos as { respuestas?: RespuestasFicha } | undefined;
              if (datos?.respuestas) void enviar(f.id, datos.respuestas);
            }}
            title="Crea el enlace con su versión de la ficha como punto de partida"
            type="button"
          >
            <Send className="h-4 w-4" />
            Enviar con lo escrito
          </button>
        ) : null}
        {e.respuestaId ? (
          <button className={BTN_GHOST} onClick={() => abrirRespuesta(e.respuestaId!)} type="button">
            <Eye className="h-4 w-4" />
            Ver
          </button>
        ) : null}
      </div>
    </div>
  );

  const etapas = [...new Set(FICHAS.map((f) => f.etapa))];
  return (
    <SectionCard plegable={{ id: "intervencion", resumen }} title="Intervención guiada">
      {error ? <div className="mb-3 border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      {aviso ? <div className="mb-3 break-all border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-200">{aviso}</div> : null}
      {enlaceNuevo ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-white/10 bg-white/4 p-3 text-xs text-slate-300">
          <span className="min-w-0 flex-1 break-all">Enlace de la ficha {enlaceNuevo.ficha}: {enlaceNuevo.url}</span>
          <button className={BTN_GHOST} onClick={() => void copiar(enlaceNuevo.url)} title="Copiar enlace" type="button">
            <Copy className="h-4 w-4" />
          </button>
          <button className={BTN_GHOST} onClick={() => whatsapp(enlaceNuevo.url)} title="Enviar por WhatsApp" type="button">
            <IconoWhatsApp />
          </button>
        </div>
      ) : null}

      <p className="mb-3 text-xs leading-5 text-slate-400">
        Use las fichas usted mismo, en sesión o después: se abren con datos del expediente ya puestos, o se envían al paciente (vacías o con lo ya escrito). Las que usted llena
        quedan en el expediente como «Llenada por el terapeuta» y no generan aviso ni pendiente.
      </p>
      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && sugerencias.length ? (
        <div className="mb-4 grid gap-2" data-testid="intervencion-sugerencias">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sugerencias</div>
          {sugerencias.map((s) => fila(fichaPorId(s.ficha)!, estadoDe(s.ficha), s.motivos))}
        </div>
      ) : null}

      {!cargando
        ? etapas.map((etapa) => (
            <div className="mb-4 grid gap-2" key={etapa}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Etapa {etapa} · {ETAPAS_FICHAS[etapa]}
              </div>
              {FICHAS.filter((f) => f.etapa === etapa).map((f) => fila(f, estadoDe(f.id)))}
            </div>
          ))
        : null}
    </SectionCard>
  );
}
