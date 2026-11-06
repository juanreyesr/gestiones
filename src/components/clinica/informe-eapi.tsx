"use client";

import { Copy, EyeOff, Save, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InformePacienteVista } from "@/components/evaluaciones/informe-paciente-vista";
import { mensajeInforme } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { formatoFechaCorta, formatoFechaHora } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { validarEapi } from "@/lib/evaluaciones/eapi/codigo";
import { informeEapiHtml, type AplicacionEapi } from "@/lib/evaluaciones/eapi/informe-html";
import { AREAS_EAPI, informePacienteEapi, opcionesPorDefectoEapi } from "@/lib/evaluaciones/eapi/informe-paciente";
import {
  fetchInforme,
  guardarNotasInforme,
  publicarInforme,
  retirarInforme,
  type EvaluacionRespuestaRow,
  type InformeRow,
} from "@/lib/evaluaciones/evaluaciones";
import type { OpcionesInforme } from "@/lib/evaluaciones/informe-paciente";
import { urlPublica } from "@/lib/url-publica";
import { IconoWhatsApp } from "./boton-whatsapp-paciente";
import { InformeFrame } from "./informe-frame";
import { NotasPrivadas } from "./notas-privadas";
import { BTN_ACCENT, BTN_DANGER, BTN_GHOST, Field } from "./ui";

const PROFESIONAL = "Lic. Juan J. Reyes, psicólogo";
const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

/** Datos EAPI de una respuesta guardada (null si el registro no es válido). */
export function datosEapi(r: EvaluacionRespuestaRow) {
  const v = validarEapi(r.datos, Array.isArray((r.datos as { docs?: unknown }).docs));
  return v.ok ? v.datos : null;
}

function leerOpciones(valor: Record<string, unknown>, porDefecto: OpcionesInforme): OpcionesInforme {
  const o = valor as Partial<OpcionesInforme>;
  return {
    incluir: { ...porDefecto.incluir, ...(o.incluir && typeof o.incluir === "object" ? o.incluir : {}) },
    mostrarPuntuaciones: typeof o.mostrarPuntuaciones === "boolean" ? o.mostrarPuntuaciones : porDefecto.mostrarPuntuaciones,
    incluirAyuda: typeof o.incluirAyuda === "boolean" ? o.incluirAyuda : porDefecto.incluirAyuda,
  };
}

export function InformeEapi({
  actual,
  paciente,
  respuestas,
}: {
  actual: EvaluacionRespuestaRow;
  paciente: PacienteRow;
  respuestas: EvaluacionRespuestaRow[];
}) {
  const datos = useMemo(() => datosEapi(actual), [actual]);
  const anteriores = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          r.id !== actual.id &&
          r.instrumento === "eapi" &&
          (fechaDe(r) < fechaDe(actual) || (fechaDe(r) === fechaDe(actual) && r.createdAt < actual.createdAt)) &&
          datosEapi(r)
      ),
    [respuestas, actual]
  );
  const [antId, setAntId] = useState(anteriores[0]?.id ?? "");
  const [notasPrivadas, setNotasPrivadas] = useState("");

  // Informe para el paciente
  const [informe, setInforme] = useState<InformeRow | null>(null);
  const [notasPaciente, setNotasPaciente] = useState("");
  const [opciones, setOpciones] = useState<OpcionesInforme | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!datos) return;
    let vivo = true;
    void fetchInforme(actual.id).then(({ data }) => {
      if (!vivo) return;
      setInforme(data);
      setNotasPaciente(data?.notasPaciente ?? "");
      setOpciones(leerOpciones(data?.opciones ?? {}, opcionesPorDefectoEapi(datos)));
    });
    return () => {
      vivo = false;
    };
  }, [actual.id, datos]);

  if (!datos) return <p className="text-sm text-red-200">Esta respuesta no tiene un formato válido para calificar.</p>;

  const aplic = (r: EvaluacionRespuestaRow): AplicacionEapi | null => {
    const d = datosEapi(r);
    return d ? { datos: d, nombre: r.respondienteNombre, fecha: fechaDe(r) } : null;
  };
  const anterior = anteriores.find((r) => r.id === antId);
  const html = informeEapiHtml({ datos, nombre: actual.respondienteNombre, fecha: fechaDe(actual) }, anterior ? aplic(anterior) : null, notasPrivadas);

  const vistaPrevia = opciones
    ? informePacienteEapi(datos, opciones, {
        paciente: paciente.nombre,
        fechaAplicacion: fechaDe(actual),
        notas: notasPaciente,
        profesional: PROFESIONAL,
      })
    : null;
  const urlInforme = informe?.token ? urlPublica(`/informe/${informe.token}`) : "";
  const publicadoIgual =
    informe?.publicadoAt && informe.contenido && vistaPrevia
      ? JSON.stringify({ ...informe.contenido, emitido: "" }) === JSON.stringify({ ...vistaPrevia, emitido: "" })
      : false;

  const avisar = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 4000);
  };

  const guardarBorrador = async () => {
    if (!opciones) return;
    setOcupado(true);
    const { data, error } = await guardarNotasInforme(actual.id, paciente.id, { notasPaciente, opciones });
    setOcupado(false);
    if (error) return avisar(error);
    setInforme(data);
    avisar("Notas guardadas (aún no publicado).");
  };

  const publicar = async (enviar: boolean) => {
    if (!opciones || !vistaPrevia) return;
    // En WhatsApp la pestaña se abre ya, dentro del toque, para que el navegador no la bloquee.
    const ventana = enviar ? window.open("", "_blank") : null;
    setOcupado(true);
    await guardarNotasInforme(actual.id, paciente.id, { notasPaciente, opciones });
    const { data, error } = await publicarInforme(actual.id, paciente.id, vistaPrevia as unknown as Record<string, unknown>, informe?.token ?? null);
    setOcupado(false);
    if (error || !data?.token) {
      ventana?.close();
      return avisar(error ?? "No se pudo publicar el informe.");
    }
    setInforme(data);
    const url = urlPublica(`/informe/${data.token}`);
    if (ventana) {
      ventana.location.href = enlaceWhatsApp(paciente.telefono, mensajeInforme(paciente.nombre, url), paciente.pais);
    } else {
      avisar("Informe publicado. El enlace muestra la versión actualizada.");
    }
  };

  const retirar = async () => {
    if (!window.confirm("¿Retirar el informe? El enlace que tiene el paciente dejará de funcionar.")) return;
    const { error } = await retirarInforme(actual.id);
    if (error) return avisar(error);
    setInforme((prev) => (prev ? { ...prev, publicadoAt: null, contenido: null, token: null } : prev));
    avisar("Informe retirado.");
  };

  return (
    <div className="grid gap-4">
      <Field label="Seguimiento: aplicación anterior">
        <select className="field" onChange={(e) => setAntId(e.target.value)} value={antId}>
          <option value="">Sin comparación</option>
          {anteriores.map((r) => (
            <option key={r.id} value={r.id}>
              {formatoFechaCorta(fechaDe(r))} · {r.respondienteNombre}
            </option>
          ))}
        </select>
      </Field>

      <NotasPrivadas onCambio={setNotasPrivadas} pacienteId={paciente.id} respuestaId={actual.id} />

      <InformeFrame html={html} textoBoton="Imprimir o guardar PDF (informe profesional)" titulo="Informe EAPI" />

      {opciones && vistaPrevia ? (
        <section className="grid gap-3 border border-emerald-300/30 bg-emerald-300/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Informe para el paciente</h3>
            <span className="text-xs text-slate-400">
              {informe?.publicadoAt
                ? `Publicado el ${formatoFechaHora(informe.publicadoAt)}${publicadoIgual ? "" : " · hay cambios sin publicar"}`
                : "Aún no se ha enviado"}
            </span>
          </div>
          <p className="text-xs leading-5 text-slate-400">
            En lenguaje sencillo, sin códigos diagnósticos, señales clínicas ni la pregunta de seguridad. Elige qué incluir, agrega tus
            comentarios y envíaselo. Lo que publiques queda fijo hasta que lo actualices.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5 text-sm text-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-400">Áreas incluidas</span>
              {AREAS_EAPI.filter((a) => a.id !== "docs" || datos.docs).map((a) => (
                <label className="flex items-center gap-2" key={a.id}>
                  <input
                    checked={opciones.incluir[a.id] !== false}
                    onChange={(e) => setOpciones({ ...opciones, incluir: { ...opciones.incluir, [a.id]: e.target.checked } })}
                    type="checkbox"
                  />
                  {a.nombre}
                </label>
              ))}
            </div>
            <div className="grid content-start gap-1.5 text-sm text-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-400">Opciones</span>
              <label className="flex items-center gap-2">
                <input
                  checked={opciones.mostrarPuntuaciones}
                  onChange={(e) => setOpciones({ ...opciones, mostrarPuntuaciones: e.target.checked })}
                  type="checkbox"
                />
                Mostrar puntuaciones (por ejemplo, «12 de 21»)
              </label>
              <label className="flex items-center gap-2">
                <input checked={opciones.incluirAyuda} onChange={(e) => setOpciones({ ...opciones, incluirAyuda: e.target.checked })} type="checkbox" />
                Incluir líneas de ayuda en crisis
              </label>
              {datos.safety >= 1 ? (
                <span className="text-xs text-red-300">Marcó la pregunta de seguridad: se recomienda dejar las líneas de ayuda.</span>
              ) : null}
            </div>
          </div>

          <Field label="Tus comentarios para el paciente (aparecen en el informe)">
            <textarea
              className="field min-h-28 resize-y"
              maxLength={6000}
              onChange={(e) => setNotasPaciente(e.target.value)}
              placeholder="Ej. Lo que más destaca es… En la próxima sesión trabajaremos… Mientras tanto te recomiendo…"
              value={notasPaciente}
            />
          </Field>

          <div className="max-h-[70vh] overflow-y-auto rounded bg-white p-4">
            <p className="mb-3 text-xs text-slate-500">Vista previa: así lo verá el paciente.</p>
            <InformePacienteVista informe={vistaPrevia} />
          </div>

          {mensaje ? <p className="text-sm text-emerald-200">{mensaje}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button className={BTN_GHOST} disabled={ocupado} onClick={() => void guardarBorrador()} type="button">
              <Save className="h-4 w-4" />
              Guardar sin enviar
            </button>
            <button className={BTN_ACCENT} disabled={ocupado} onClick={() => void publicar(true)} type="button">
              <IconoWhatsApp />
              {informe?.publicadoAt ? "Actualizar y reenviar por WhatsApp" : "Publicar y enviar por WhatsApp"}
            </button>
            {informe?.publicadoAt ? (
              <>
                {!publicadoIgual ? (
                  <button className={BTN_GHOST} disabled={ocupado} onClick={() => void publicar(false)} type="button">
                    <Send className="h-4 w-4" />
                    Actualizar sin reenviar
                  </button>
                ) : null}
                <button
                  className={BTN_GHOST}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(urlInforme);
                      avisar("¡Enlace copiado!");
                    } catch {
                      avisar(urlInforme);
                    }
                  }}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  Copiar enlace
                </button>
                <a className={BTN_GHOST} href={urlInforme} rel="noopener noreferrer" target="_blank">
                  Ver / imprimir
                </a>
                <button className={BTN_DANGER} onClick={() => void retirar()} type="button">
                  <EyeOff className="h-4 w-4" />
                  Retirar
                </button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
