"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  FileJson,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mensajeEvaluacion } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { formatoFechaCorta } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { calificarBBreve } from "@/lib/evaluaciones/b-breve/calificacion";
import { leerBBreve, validarBBreve, type BBreveDatos } from "@/lib/evaluaciones/b-breve/codigo";
import { B_BREVE_RELACIONES } from "@/lib/evaluaciones/b-breve/contenido";
import { informeBBreveHtml, type AplicacionBBreve } from "@/lib/evaluaciones/b-breve/informe-html";
import {
  asignarEvaluacion,
  cambiarEstadoEvaluacion,
  eliminarEvaluacion,
  eliminarRespuesta,
  fetchEvaluacionesDePaciente,
  guardarRespuestaPorCodigo,
  type EvaluacionRespuestaRow,
  type EvaluacionRow,
} from "@/lib/evaluaciones/evaluaciones";
import { INSTRUMENTOS, instrumentoPorId } from "@/lib/evaluaciones/instrumentos";
import { urlPublica } from "@/lib/url-publica";
import { IconoWhatsApp } from "./boton-whatsapp-paciente";
import { BTN_ACCENT, BTN_DANGER, BTN_GHOST, Field, SectionCard } from "./ui";

type Vista = { tipo: "lista" } | { tipo: "informe"; respuestaId: string } | { tipo: "codigo" };

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  const [permitidas, setPermitidas] = useState(INSTRUMENTOS[0].respuestasPorDefecto);
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

  const whatsapp = (ev: EvaluacionRow) =>
    window.open(
      enlaceWhatsApp(
        paciente.telefono,
        mensajeEvaluacion(paciente.nombre, urlDe(ev), { esMenor: paciente.esMenor, respuestas: ev.respuestasPermitidas }),
        paciente.pais
      ),
      "_blank",
      "noopener,noreferrer"
    );

  const handleAsignar = async () => {
    setError("");
    const { data, error: err } = await asignarEvaluacion(paciente.id, instrumento, permitidas, nota);
    if (err || !data) {
      setError(err ?? "No se pudo asignar la evaluación.");
      return;
    }
    setAsignando(false);
    setNota("");
    await cargar();
    void copiar(urlDe(data), "Evaluación asignada. Enlace copiado: envíalo por WhatsApp o pégalo donde quieras.");
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

  if (vista.tipo === "codigo") {
    return (
      <CalificarCodigo
        onGuardado={() => {
          setVista({ tipo: "lista" });
          void cargar();
        }}
        onVolver={() => setVista({ tipo: "lista" })}
        paciente={paciente}
      />
    );
  }

  return (
    <SectionCard
      action={
        <div className="flex flex-wrap gap-2">
          <button className={BTN_GHOST} onClick={() => setVista({ tipo: "codigo" })} type="button">
            <ClipboardCheck className="h-4 w-4" />
            Calificar código recibido
          </button>
          <button className={BTN_ACCENT} onClick={() => setAsignando((v) => !v)} type="button">
            <Plus className="h-4 w-4" />
            Asignar evaluación
          </button>
        </div>
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
                setPermitidas(instrumentoPorId(e.target.value)?.respuestasPorDefecto ?? 1);
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
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <Field label="Respuestas por enlace">
              <select className="field" onChange={(e) => setPermitidas(Number(e.target.value))} value={permitidas}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "respuesta" : "respuestas (cada cuidador por separado)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nota privada (opcional)">
              <input className="field" maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder="Ej. aplicación inicial, seguimiento semana 4" value={nota} />
            </Field>
          </div>
          {instrumentoPorId(instrumento)?.responde === "cuidador" && !paciente.esMenor ? (
            <p className="text-xs text-amber-300">
              Este instrumento lo responden los padres o cuidadores. El paciente no está marcado como menor de edad.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button className={BTN_ACCENT} onClick={() => void handleAsignar()} type="button">
              Crear enlace
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
          respuesta queda aquí con su calificación. Ellos no ven puntuaciones.
        </p>
      ) : null}

      {evaluaciones.length > 0 ? (
        <div className="mb-4 grid gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Enlaces enviados</div>
          {evaluaciones.map((ev) => {
            const usadas = usadasDe(ev);
            const abierta = ev.estado === "abierta";
            return (
              <div className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/4 p-3" key={ev.id}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{instrumentoPorId(ev.instrumento)?.nombre ?? ev.instrumento}</div>
                  <div className="text-xs text-slate-400">
                    {formatoFechaCorta(ev.createdAt)} · {usadas}/{ev.respuestasPermitidas} respuestas ·{" "}
                    <span className={abierta ? "text-emerald-300" : "text-slate-400"}>
                      {abierta ? "Abierto" : ev.estado === "completa" ? "Completo" : "Cerrado"}
                    </span>
                    {ev.nota ? ` · ${ev.nota}` : ""}
                  </div>
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
                      title="Reabrir para una respuesta más"
                      type="button"
                    >
                      <Unlock className="h-4 w-4" />
                    </button>
                  )}
                  {usadas === 0 ? (
                    <button
                      className={BTN_DANGER}
                      onClick={async () => {
                        if (!window.confirm("¿Eliminar este enlace? Dejará de funcionar.")) return;
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
                    {r.origen === "codigo" ? " · ingresado por código" : ""}
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

/** Calificar un código corto (B16-…) que el padre envió por WhatsApp y guardarlo en el expediente. */
function CalificarCodigo({
  onGuardado,
  onVolver,
  paciente,
}: {
  onGuardado: () => void;
  onVolver: () => void;
  paciente: PacienteRow;
}) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const datos = codigo.trim() ? leerBBreve(codigo) : null;
  // El JSON descargado ya trae quién respondió y la fecha.
  const nombreEf = nombre || datos?.nombre || "";
  const relacionEf = relacion || datos?.relacion || "";
  const fechaEf = datos?.fecha && !fecha ? datos.fecha : fecha;

  const guardar = async () => {
    if (!datos || guardando) return;
    if (!nombreEf.trim()) {
      setError("Escribe el nombre de quien respondió.");
      return;
    }
    setGuardando(true);
    const { error: err } = await guardarRespuestaPorCodigo(paciente.id, "b-breve", nombreEf, relacionEf, fechaEf, {
      v: 1,
      instrumento: "B-Breve",
      abierta: "",
      extra: "",
      ...datos,
      nombre: nombreEf.trim(),
      relacion: relacionEf,
      fecha: fechaEf,
      enviado: new Date().toISOString(),
    });
    setGuardando(false);
    if (err) {
      setError(err);
      return;
    }
    onGuardado();
  };

  return (
    <SectionCard title="Calificar código recibido (B-Breve)">
      <div className="grid gap-4">
        <button className={`${BTN_GHOST} w-fit`} onClick={onVolver} type="button">
          <ChevronLeft className="h-4 w-4" />
          Volver a evaluaciones
        </button>
        <p className="text-sm leading-6 text-slate-300">
          Si el padre o la madre te envió por WhatsApp un código como <code className="text-emerald-200">B16-2103320231021301-01</code> (o el
          JSON descargado), pégalo aquí para ver el informe y guardarlo en el expediente de {paciente.nombre}.
        </p>
        <Field label="Código o JSON">
          <input className="field font-mono" onChange={(e) => setCodigo(e.target.value)} placeholder="B16-…" value={codigo} />
        </Field>
        {codigo.trim() && !datos ? (
          <p className="text-sm text-red-200">
            No se reconoce el código. Formato esperado: B16-, 16 dígitos del 0 al 3, guion, 2 dígitos (0 o 1) y, opcionalmente, guion y
            código de caso. No se calculó nada.
          </p>
        ) : null}
        {datos ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Quién respondió *">
                <input className="field" onChange={(e) => setNombre(e.target.value)} placeholder={datos.nombre || "Nombre"} value={nombre} />
              </Field>
              <Field label="Relación">
                <select className="field" onChange={(e) => setRelacion(e.target.value)} value={relacionEf}>
                  <option value="">Sin especificar</option>
                  {B_BREVE_RELACIONES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de aplicación">
                <input className="field" onChange={(e) => setFecha(e.target.value)} type="date" value={fechaEf} />
              </Field>
            </div>
            {error ? <p className="text-sm text-red-200">{error}</p> : null}
            <button className={`${BTN_ACCENT} w-fit`} disabled={guardando} onClick={() => void guardar()} type="button">
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar en el expediente"}
            </button>
            <InformeFrame
              html={informeBBreveHtml({ datos, nombre: nombreEf, relacion: relacionEf, fecha: fechaEf })}
              titulo="Vista previa del informe"
            />
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
