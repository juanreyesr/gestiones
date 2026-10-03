"use client";

import { Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { agruparPorDocente, type DocenteAviso } from "@/lib/control-revision-mensajes";
import { ModalPortal } from "./modal-portal";
import { BTN_GHOST, BTN_PRIMARY } from "./ui-comun";

export type FilaAviso = {
  docenteId: string;
  docente: string;
  curso: string;
  estado: "Pendiente" | "Entregado";
  fechaRecepcion: string | null;
};

type Clase = "recordatorio" | "felicitacion" | "sin-mensaje";

/** Que mensaje le tocaria al docente si se le avisa ahora (misma regla que el servidor). */
function claseDe(d: DocenteAviso): Clase {
  if (d.pendientes.length) return "recordatorio";
  return d.puntual ? "felicitacion" : "sin-mensaje";
}

const ETIQUETAS: Record<Clase, { texto: (d: DocenteAviso) => string; clase: string }> = {
  recordatorio: {
    texto: (d) => `Recordatorio · pendiente: ${d.pendientes.join(", ")}`,
    clase: "text-amber-200",
  },
  felicitacion: { texto: () => "Felicitación · entregó todo a tiempo", clase: "text-emerald-200" },
  "sin-mensaje": { texto: () => "Sin mensaje · entregó después de la fecha límite", clase: "text-slate-500" },
};

/**
 * Pregunta a quien mandar los avisos de Telegram (uno, varios o todos) para dar
 * seguimiento individual. A cada docente elegido le llega su recordatorio o su
 * felicitacion con el boton de WhatsApp.
 */
export function AvisosTelegramModal({
  filas,
  fechaLimite,
  preseleccion,
  onCerrar,
  onEnviar,
}: {
  filas: FilaAviso[];
  fechaLimite: string;
  preseleccion: string[];
  onCerrar: () => void;
  onEnviar: (docentes: string[]) => Promise<boolean>;
}) {
  const docentes = useMemo(
    () =>
      agruparPorDocente(
        filas.map((f) => ({
          docenteId: f.docenteId,
          nombre: f.docente,
          telefono: null,
          curso: f.curso,
          estado: f.estado,
          fechaRecepcion: f.fechaRecepcion,
        })),
        fechaLimite,
      ),
    [filas, fechaLimite],
  );
  const conMensaje = docentes.filter((d) => claseDe(d) !== "sin-mensaje");
  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set(preseleccion.filter((id) => conMensaje.some((d) => d.docenteId === id))),
  );
  const [enviando, setEnviando] = useState(false);

  const alternar = (id: string) =>
    setElegidos((previo) => {
      const nuevo = new Set(previo);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  const elegir = (lista: DocenteAviso[]) => setElegidos(new Set(lista.map((d) => d.docenteId)));

  const enviar = async () => {
    if (!elegidos.size || enviando) return;
    setEnviando(true);
    const ok = await onEnviar([...elegidos]);
    setEnviando(false);
    if (ok) onCerrar();
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCerrar}>
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col border border-white/10 bg-slate-950"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <h3 className="text-lg font-semibold text-white">¿A quién envío el aviso?</h3>
              <p className="mt-1 text-sm text-slate-400">
                A cada docente elegido le llega a tu Telegram su mensaje con el botón de WhatsApp listo.
              </p>
            </div>
            <button aria-label="Cerrar" className="text-slate-400 hover:text-white" onClick={onCerrar} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-2 text-xs font-semibold">
            <button className="text-slate-300 hover:text-white" onClick={() => elegir(conMensaje)} type="button">
              Todos
            </button>
            <span className="text-slate-600">·</span>
            <button
              className="text-amber-200 hover:text-amber-100"
              onClick={() => elegir(docentes.filter((d) => claseDe(d) === "recordatorio"))}
              type="button"
            >
              Solo pendientes
            </button>
            <span className="text-slate-600">·</span>
            <button
              className="text-emerald-200 hover:text-emerald-100"
              onClick={() => elegir(docentes.filter((d) => claseDe(d) === "felicitacion"))}
              type="button"
            >
              Solo a tiempo
            </button>
            <span className="text-slate-600">·</span>
            <button className="text-slate-400 hover:text-white" onClick={() => setElegidos(new Set())} type="button">
              Ninguno
            </button>
          </div>

          <div className="grid gap-1 overflow-y-auto p-2">
            {docentes.map((d) => {
              const clase = claseDe(d);
              const deshabilitado = clase === "sin-mensaje";
              const etiqueta = ETIQUETAS[clase];
              return (
                <label
                  key={d.docenteId}
                  className={`flex items-start gap-3 px-2 py-2 ${
                    deshabilitado ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-white/5"
                  }`}
                >
                  <input
                    checked={elegidos.has(d.docenteId)}
                    className="mt-1"
                    disabled={deshabilitado}
                    onChange={() => alternar(d.docenteId)}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{d.nombre}</span>
                    <span className={`block text-xs ${etiqueta.clase}`}>{etiqueta.texto(d)}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 p-4">
            <button className={BTN_GHOST} onClick={onCerrar} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={!elegidos.size || enviando} onClick={enviar} type="button">
              <Send className="h-4 w-4" />
              {enviando ? "Enviando..." : `Enviar a Telegram (${elegidos.size})`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
