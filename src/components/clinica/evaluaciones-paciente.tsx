"use client";

import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  FileJson,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mensajeEvaluacion } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { calificarBBreve } from "@/lib/evaluaciones/b-breve/calificacion";
import { avanceBBreve, limpiarBorradorBBreve, validarBBreve, type BBreveDatos } from "@/lib/evaluaciones/b-breve/codigo";
import { informeBBreveHtml, type AplicacionBBreve } from "@/lib/evaluaciones/b-breve/informe-html";
import {
  asignarEvaluacion,
  cambiarEstadoEvaluacion,
  eliminarEvaluacion,
  eliminarRespuesta,
  fetchEvaluacionesDePaciente,
  type EvaluacionRespuestaRow,
  type EvaluacionRow,
} from "@/lib/evaluaciones/evaluaciones";
import { INSTRUMENTOS, instrumentoPorId } from "@/lib/evaluaciones/instrumentos";
import { urlPublica } from "@/lib/url-publica";
import { IconoWhatsApp } from "./boton-whatsapp-paciente";
import { BTN_ACCENT, BTN_DANGER, BTN_GHOST, Field, SectionCard } from "./ui";

type Vista = { tipo: "lista" } | { tipo: "informe"; respuestaId: string };

/** "hace 5 min", "hace 2 h", o la fecha. */
function haceCuanto(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`;
  return formatoFechaCorta(iso);
}

/** Etiquetas sugeridas para N personas: los padres o tutores del expediente y luego "Cuidador n". */
function etiquetasSugeridas(paciente: PacienteRow, n: number) {
  const nombres = paciente.responsables
    .map((r) => [r.nombre.trim().split(/\s+/)[0], r.parentesco ? `(${r.parentesco})` : ""].filter(Boolean).join(" "))
    .filter(Boolean);
  return Array.from({ length: n }, (_, i) => nombres[i] ?? (n === 1 && !paciente.esMenor ? paciente.nombre : `Cuidador ${i + 1}`));
}

const normalizar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Datos B-Breve de una respuesta guardada (null si el registro no es válido). */
function datosBBreve(r: EvaluacionRespuestaRow): BBreveDatos | null {
  const v = validarBBreve(r.datos);
  return v.ok ? v.datos : null;
}

function aplicacion(r: EvaluacionRespuestaRow, datos: BBreveDatos): AplicacionBBreve {
  return {
    datos,
    nombre: r.respondienteNombre,
    relacion: r.respondienteRelacion ?? "",
    fecha: r.fecha ?? r.createdAt.slice(0, 10),
  };
}

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Documento del informe dentro de un iframe (fondo claro, listo para imprimir). */
function InformeFrame({ html, titulo }: { html: string; titulo: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [alto, setAlto] = useState(900);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button className={BTN_ACCENT} onClick={() => ref.current?.contentWindow?.print()} type="button">
          <Printer className="h-4 w-4" />
          Imprimir o guardar PDF
        </button>
      </div>
      <iframe
        className="w-full rounded border border-white/10 bg-white"
        onLoad={() => {
          const doc = ref.current?.contentDocument;
          if (doc) setAlto(doc.documentElement.scrollHeight + 8);
        }}
        ref={ref}
        srcDoc={html}
        style={{ height: alto }}
        title={titulo}
      />
    </div>
  );
}

export function EvaluacionesPaciente({ paciente }: { paciente: PacienteRow }) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [respuestas, setRespuestas] = useState<EvaluacionRespuestaRow[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [asignando, setAsignando] = useState(false);
  const [instrumento, setInstrumento] = useState<string>(INSTRUMENTOS[0].id);
  const [etiquetas, setEtiquetas] = useState<string[]>(() =>
    etiquetasSugeridas(paciente, paciente.esMenor ? INSTRUMENTOS[0].respuestasPorDefecto : 1)
  );
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await fetchEvaluacionesDePaciente(paciente.id);
    setCargando(false);
    setEvaluaciones(r.evaluaciones);
    setRespuestas(r.respuestas);
    setError(r.error ?? "");
  }, [paciente.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const urlDe = (ev: EvaluacionRow) => urlPublica(`/evaluacion/${ev.token}`);
  const usadasDe = (ev: EvaluacionRow) => respuestas.filter((r) => r.evaluacionId === ev.id).length;

  const copiar = async (texto: string, mensaje: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(mensaje);
    } catch {
      setAviso(texto);
    }
    setTimeout(() => setAviso(""), 3000);
  };

  // WhatsApp al teléfono del padre o tutor del enlace (si está en el expediente); si no, al del paciente.
  const whatsapp = (ev: EvaluacionRow) => {
    const primer = (ev.etiqueta ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    const responsable = primer
      ? paciente.responsables.find((r) => r.telefono.trim() && r.nombre.trim().toLowerCase().startsWith(primer))
      : undefined;
    window.open(
      enlaceWhatsApp(
        responsable?.telefono ?? paciente.telefono,
        mensajeEvaluacion(paciente.nombre, urlDe(ev), { esMenor: paciente.esMenor, respuestas: 1 }),
        paciente.pais
      ),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleAsignar = async () => {
    setError("");
    const { error: err } = await asignarEvaluacion(paciente.id, instrumento, etiquetas, nota);
    if (err) {
      setError(err);
      return;
    }
    setAsignando(false);
    setNota("");
    await cargar();
    setAviso(
      etiquetas.length > 1
        ? `Se crearon ${etiquetas.length} enlaces, uno por persona. Envía a cada quien el suyo con su botón de WhatsApp.`
        : "Enlace creado. Envíalo con el botón de WhatsApp o cópialo."
    );
    setTimeout(() => setAviso(""), 6000);
  };

  if (vista.tipo === "informe") {
    return (
      <InformeRespuesta
        onEliminada={() => {
          setVista({ tipo: "lista" });
          void cargar();
        }}
        onVolver={() => setVista({ tipo: "lista" })}
        respuestaId={vista.respuestaId}
        respuestas={respuestas}
      />
    );
  }

  return (
    <SectionCard
      action={
        <button className={BTN_ACCENT} onClick={() => setAsignando((v) => !v)} type="button">
          <Plus className="h-4 w-4" />
          Asignar evaluación
        </button>
      }
      title={`Evaluaciones y formularios (${respuestas.length})`}
    >
      {error ? <div className="mb-3 border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      {aviso ? <div className="mb-3 break-all border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-200">{aviso}</div> : null}

      {asignando ? (
        <div className="mb-4 grid gap-3 border border-white/10 bg-white/4 p-3">
          <Field label="Instrumento">
            <select
              className="field"
              onChange={(e) => {
                setInstrumento(e.target.value);
                const i = instrumentoPorId(e.target.value);
                setEtiquetas(etiquetasSugeridas(paciente, i?.responde === "cuidador" && paciente.esMenor ? i.respuestasPorDefecto : 1));
              }}
              value={instrumento}
            >
              {INSTRUMENTOS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs leading-5 text-slate-400">{instrumentoPorId(instrumento)?.descripcion}</p>
          <Field label="¿Cuántas personas lo responderán? (un enlace para cada una)">
            <select
              className="field"
              onChange={(e) => {
                const n = Number(e.target.value);
                setEtiquetas((prev) => {
                  const sugeridas = etiquetasSugeridas(paciente, n);
                  return sugeridas.map((s, i) => prev[i] ?? s);
                });
              }}
              value={etiquetas.length}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "persona" : "personas (cada una con su enlace)"}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            {etiquetas.map((et, i) => (
              <Field key={i} label={`Enlace ${i + 1}: para quién`}>
                <input
                  className="field"
                  maxLength={60}
                  onChange={(e) => setEtiquetas((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  value={et}
                />
              </Field>
            ))}
          </div>
          <Field label="Nota privada (opcional)">
            <input className="field" maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder="Ej. aplicación inicial, seguimiento semana 4" value={nota} />
          </Field>
          {instrumentoPorId(instrumento)?.responde === "cuidador" && !paciente.esMenor ? (
            <p className="text-xs text-amber-300">
              Este instrumento lo responden los padres o cuidadores. El paciente no está marcado como menor de edad.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button className={BTN_ACCENT} onClick={() => void handleAsignar()} type="button">
              {etiquetas.length > 1 ? `Crear ${etiquetas.length} enlaces` : "Crear enlace"}
            </button>
            <button className={BTN_GHOST} onClick={() => setAsignando(false)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {cargando && evaluaciones.length === 0 ? <p className="text-sm text-slate-400">Cargando...</p> : null}

      {!cargando && evaluaciones.length === 0 && respuestas.length === 0 ? (
        <p className="text-sm leading-6 text-slate-400">
          Aún no hay evaluaciones. Con «Asignar evaluación» se crea un enlace para el paciente (o sus padres); al responderlo, la
          respuesta queda aquí con su calificación. Mientras responden ves su avance; ellos no ven puntuaciones.
        </p>
      ) : null}

      {evaluaciones.length > 0 ? (
        <div className="mb-4 grid gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Enlaces enviados</div>
          {evaluaciones.map((ev) => {
            const usadas = usadasDe(ev);
            const abierta = ev.estado === "abierta";
            const avance = ev.borrador && ev.instrumento === "b-breve" ? avanceBBreve(limpiarBorradorBBreve(ev.borrador)) : null;
            const estadoTexto = !abierta
              ? ev.estado === "completa"
                ? "✓ Enviado"
                : "Cerrado"
              : avance
                ? `En progreso: ${avance.respondidas} de ${avance.total} respondidas${ev.borradorAt ? ` · ${haceCuanto(ev.borradorAt)}` : ""}`
                : "Sin abrir todavía";
            return (
              <div className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/4 p-3" key={ev.id}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    {ev.etiqueta ? `${ev.etiqueta} · ` : ""}
                    {instrumentoPorId(ev.instrumento)?.nombre.split(" · ")[0] ?? ev.instrumento}
                  </div>
                  <div className="text-xs text-slate-400">
                    Creado {formatoFechaCorta(ev.createdAt)} ·{" "}
                    <span className={ev.estado === "completa" ? "text-emerald-300" : avance ? "text-amber-300" : "text-slate-400"}>
                      {estadoTexto}
                    </span>
                    {ev.nota ? ` · ${ev.nota}` : ""}
                  </div>
                  {avance ? (
                    <div className="mt-1.5 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-amber-300" style={{ width: `${Math.round((avance.respondidas / avance.total) * 100)}%` }} />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {abierta ? (
                    <>
                      <button className={BTN_GHOST} onClick={() => void copiar(urlDe(ev), "¡Enlace copiado!")} title="Copiar enlace" type="button">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className={BTN_GHOST} onClick={() => whatsapp(ev)} title="Enviar por WhatsApp" type="button">
                        <IconoWhatsApp />
                      </button>
                      <button
                        className={BTN_GHOST}
                        onClick={async () => {
                          await cambiarEstadoEvaluacion(ev, "cerrar", usadas);
                          void cargar();
                        }}
                        title="Cerrar enlace (no acepta más respuestas)"
                        type="button"
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      className={BTN_GHOST}
                      onClick={async () => {
                        await cambiarEstadoEvaluacion(ev, "reabrir", usadas);
                        void cargar();
                      }}
                      title="Habilitar de nuevo (para que lo vuelva a responder)"
                      type="button"
                    >
                      <Unlock className="h-4 w-4" />
                    </button>
                  )}
                  {usadas === 0 ? (
                    <button
                      className={BTN_DANGER}
                      onClick={async () => {
                        if (!window.confirm(avance ? "Esta persona ya empezó a responder. ¿Eliminar el enlace y su avance?" : "¿Eliminar este enlace? Dejará de funcionar.")) return;
                        await eliminarEvaluacion(ev.id);
                        void cargar();
                      }}
                      title="Eliminar enlace"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {respuestas.length > 0 ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Respuestas recibidas</span>
            <button className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200" onClick={() => void cargar()} type="button">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </button>
          </div>
          {respuestas.map((r) => {
            const datos = r.instrumento === "b-breve" ? datosBBreve(r) : null;
            const c = datos ? calificarBBreve(datos) : null;
            const alarma = datos && (datos.S1 === 1 || datos.S2 === 1);
            return (
              <button
                className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/4 p-3 text-left transition hover:border-emerald-300/50"
                key={r.id}
                onClick={() => setVista({ tipo: "informe", respuestaId: r.id })}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    {instrumentoPorId(r.instrumento)?.nombre.split(" · ")[0] ?? r.instrumento} · {formatoFechaCorta(fechaDe(r))}
                  </span>
                  <span className="block text-xs text-slate-400">
                    Respondió: {r.respondienteNombre}
                    {r.respondienteRelacion ? ` (${r.respondienteRelacion})` : ""}
                    {r.origen === "codigo" ? " · ingresado manualmente" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {alarma ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-300">
                      <AlertTriangle className="h-4 w-4" /> Alarma
                    </span>
                  ) : null}
                  {c ? (
                    <span className="text-sm text-slate-200">
                      <strong>{c.total}</strong>/48 · {c.banda.etiqueta}
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold text-emerald-300">Ver informe →</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </SectionCard>
  );
}

/** Informe de una respuesta con comparación opcional (segundo cuidador y aplicación anterior). */
function InformeRespuesta({
  onEliminada,
  onVolver,
  respuestaId,
  respuestas,
}: {
  onEliminada: () => void;
  onVolver: () => void;
  respuestaId: string;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const actual = respuestas.find((r) => r.id === respuestaId) ?? null;
  const mismas = useMemo(
    () => respuestas.filter((r) => actual && r.id !== actual.id && r.instrumento === actual.instrumento && datosBBreve(r)),
    [respuestas, actual]
  );

  // Por defecto: cuidador 2 = otra respuesta del mismo enlace (o de ±14 días) de otra persona;
  // anterior = la más reciente previa de la misma persona (relación y nombre), si no, misma relación.
  const sugerencias = useMemo(() => {
    if (!actual) return { c2: "", ant: "" };
    const mismaPersona = (r: EvaluacionRespuestaRow) =>
      normalizar(r.respondienteRelacion) === normalizar(actual.respondienteRelacion) &&
      normalizar(r.respondienteNombre) === normalizar(actual.respondienteNombre);
    const dias = (r: EvaluacionRespuestaRow) =>
      Math.abs(new Date(fechaDe(r)).getTime() - new Date(fechaDe(actual)).getTime()) / 86_400_000;
    const c2 =
      mismas.find((r) => r.evaluacionId && r.evaluacionId === actual.evaluacionId && !mismaPersona(r)) ??
      mismas.find((r) => !mismaPersona(r) && dias(r) <= 14);
    const previas = mismas.filter((r) => fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt));
    const ant =
      previas.find(mismaPersona) ??
      previas.find((r) => normalizar(r.respondienteRelacion) === normalizar(actual.respondienteRelacion) && r.id !== c2?.id);
    return { c2: c2?.id ?? "", ant: ant?.id ?? "" };
  }, [actual, mismas]);

  const [c2Id, setC2Id] = useState(sugerencias.c2);
  const [antId, setAntId] = useState(sugerencias.ant);

  if (!actual) return null;
  const datos = datosBBreve(actual);
  const etiqueta = (r: EvaluacionRespuestaRow) =>
    `${formatoFechaCorta(fechaDe(r))} · ${r.respondienteNombre}${r.respondienteRelacion ? ` (${r.respondienteRelacion})` : ""}`;
  const buscar = (id: string) => {
    const r = mismas.find((x) => x.id === id);
    const d = r ? datosBBreve(r) : null;
    return r && d ? aplicacion(r, d) : null;
  };

  return (
    <SectionCard title="Informe de evaluación">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button className={BTN_GHOST} onClick={onVolver} type="button">
            <ChevronLeft className="h-4 w-4" />
            Volver a evaluaciones
          </button>
          <button
            className={BTN_GHOST}
            onClick={() => {
              const blob = new Blob([JSON.stringify(actual.datos, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `B16_${(actual.respondienteNombre || "respuesta").replace(/\s+/g, "_")}_${fechaDe(actual)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            type="button"
          >
            <FileJson className="h-4 w-4" />
            Exportar JSON
          </button>
          <button
            className={BTN_DANGER}
            onClick={async () => {
              if (!window.confirm("¿Eliminar esta respuesta del expediente? No se puede deshacer.")) return;
              const { error } = await eliminarRespuesta(actual.id);
              if (!error) onEliminada();
            }}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar respuesta
          </button>
        </div>

        {actual.instrumento !== "b-breve" || !datos ? (
          <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Comparar con segundo cuidador">
                <select className="field" onChange={(e) => setC2Id(e.target.value)} value={c2Id}>
                  <option value="">Sin comparación</option>
                  {mismas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {etiqueta(r)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Seguimiento: aplicación anterior">
                <select className="field" onChange={(e) => setAntId(e.target.value)} value={antId}>
                  <option value="">Sin comparación</option>
                  {mismas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {etiqueta(r)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <InformeFrame
              html={informeBBreveHtml(aplicacion(actual, datos), buscar(c2Id), buscar(antId))}
              titulo="Informe B-Breve"
            />
          </>
        )}
      </div>
    </SectionCard>
  );
}
