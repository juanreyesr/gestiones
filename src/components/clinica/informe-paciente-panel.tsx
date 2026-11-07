"use client";

import { Copy, EyeOff, Save, Send } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { InformePacienteVista } from "@/components/evaluaciones/informe-paciente-vista";
import { mensajeInforme } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { formatoFechaCorta, formatoFechaHora } from "@/lib/clinica/slots";
import type { PacienteRow } from "@/lib/clinica/types";
import { fetchInforme, guardarNotasInforme, publicarInforme, retirarInforme, type InformeRow } from "@/lib/evaluaciones/evaluaciones";
import { informeVencido, type InformePaciente, type OpcionesInforme } from "@/lib/evaluaciones/informe-paciente";
import { urlPublica } from "@/lib/url-publica";
import { IconoWhatsApp } from "./boton-whatsapp-paciente";
import { BTN_ACCENT, BTN_DANGER, BTN_GHOST, Field } from "./ui";

export const PROFESIONAL_INFORME = "M. A. Juan J. Reyes, psicólogo";

function leerOpciones(valor: Record<string, unknown>, porDefecto: OpcionesInforme): OpcionesInforme {
  const o = valor as Partial<OpcionesInforme>;
  return {
    incluir: { ...porDefecto.incluir, ...(o.incluir && typeof o.incluir === "object" ? o.incluir : {}) },
    mostrarPuntuaciones: typeof o.mostrarPuntuaciones === "boolean" ? o.mostrarPuntuaciones : porDefecto.mostrarPuntuaciones,
    incluirAyuda: typeof o.incluirAyuda === "boolean" ? o.incluirAyuda : porDefecto.incluirAyuda,
  };
}

/**
 * Informe para el paciente de cualquier instrumento: elegir áreas y opciones,
 * escribir comentarios, vista previa, publicar (copia fija en
 * /informe/<token>) y enviar por WhatsApp, actualizar o retirar.
 */
export function InformePacientePanel({
  areas,
  avisoAyuda,
  conAyuda = true,
  construir,
  descripcion,
  opcionesPorDefecto,
  paciente,
  placeholderNotas,
  respuestaId,
}: {
  areas: readonly { id: string; nombre: string }[];
  avisoAyuda?: ReactNode;
  conAyuda?: boolean;
  construir: (opciones: OpcionesInforme, notas: string) => InformePaciente;
  descripcion: string;
  opcionesPorDefecto: OpcionesInforme;
  paciente: PacienteRow;
  placeholderNotas: string;
  respuestaId: string;
}) {
  const [informe, setInforme] = useState<InformeRow | null>(null);
  const [notas, setNotas] = useState("");
  const [opciones, setOpciones] = useState<OpcionesInforme | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    void fetchInforme(respuestaId).then(({ data }) => {
      if (!vivo) return;
      setInforme(data);
      setNotas(data?.notasPaciente ?? "");
      setOpciones(leerOpciones(data?.opciones ?? {}, opcionesPorDefecto));
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir la respuesta
  }, [respuestaId]);

  if (!opciones) return null;
  const vistaPrevia = construir(opciones, notas);
  const urlInforme = informe?.token ? urlPublica(`/informe/${informe.token}`) : "";
  const publicadoIgual =
    informe?.publicadoAt && informe.contenido
      ? JSON.stringify({ ...informe.contenido, emitido: "" }) === JSON.stringify({ ...vistaPrevia, emitido: "" })
      : false;

  const avisar = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 4000);
  };

  const guardarBorrador = async () => {
    setOcupado(true);
    const { data, error } = await guardarNotasInforme(respuestaId, paciente.id, { notasPaciente: notas, opciones });
    setOcupado(false);
    if (error) return avisar(error);
    setInforme(data);
    avisar("Guardado (aún no publicado).");
  };

  const publicar = async (enviar: boolean) => {
    // En WhatsApp la pestaña se abre ya, dentro del toque, para que el navegador no la bloquee.
    const ventana = enviar ? window.open("", "_blank") : null;
    setOcupado(true);
    await guardarNotasInforme(respuestaId, paciente.id, { notasPaciente: notas, opciones });
    const { data, error } = await publicarInforme(respuestaId, paciente.id, vistaPrevia as unknown as Record<string, unknown>, informe?.token ?? null);
    setOcupado(false);
    if (error || !data?.token) {
      ventana?.close();
      return avisar(error ?? "No se pudo publicar el informe.");
    }
    setInforme(data);
    const url = urlPublica(`/informe/${data.token}`);
    if (ventana) ventana.location.href = enlaceWhatsApp(paciente.telefono, mensajeInforme(paciente.nombre, url), paciente.pais);
    else avisar("Informe publicado. El enlace muestra la versión actualizada.");
  };

  const retirar = async () => {
    if (!window.confirm("¿Retirar el informe? El enlace que tiene el paciente dejará de funcionar.")) return;
    const { error } = await retirarInforme(respuestaId);
    if (error) return avisar(error);
    setInforme((prev) => (prev ? { ...prev, publicadoAt: null, contenido: null, token: null } : prev));
    avisar("Informe retirado.");
  };

  return (
    <section className="grid gap-3 border border-emerald-300/30 bg-emerald-300/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Informe para el paciente</h3>
        <span className="text-xs text-slate-400">
          {informe?.publicadoAt
            ? `Publicado el ${formatoFechaHora(informe.publicadoAt)}${publicadoIgual ? "" : " · hay cambios sin publicar"}${(() => {
                const v = (informe.contenido as Partial<InformePaciente> | null)?.vigenteHasta;
                if (!v) return "";
                return informeVencido({ vigenteHasta: v }) ? " · enlace vencido" : ` · vigente hasta el ${formatoFechaCorta(v)}`;
              })()}`
            : "Aún no se ha enviado"}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-400">{descripcion}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5 text-sm text-slate-200">
          <span className="text-xs font-semibold uppercase text-slate-400">Áreas incluidas</span>
          {areas.map((a) => (
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
            Mostrar puntuaciones (por ejemplo, «15 de 24»)
          </label>
          {conAyuda ? (
            <label className="flex items-center gap-2">
              <input checked={opciones.incluirAyuda} onChange={(e) => setOpciones({ ...opciones, incluirAyuda: e.target.checked })} type="checkbox" />
              Incluir líneas de ayuda en crisis
            </label>
          ) : null}
          {avisoAyuda}
        </div>
      </div>

      <Field label="Tus comentarios para el paciente (aparecen en el informe)">
        <textarea
          className="field min-h-28 resize-y"
          maxLength={6000}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={placeholderNotas}
          value={notas}
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
  );
}
