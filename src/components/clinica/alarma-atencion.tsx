"use client";

import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { formatoFechaCorta, formatoHora } from "@/lib/clinica/slots";
import { atencionDe, marcarAlarmaAtendida, type EvaluacionRespuestaRow, type InformeRow } from "@/lib/evaluaciones/evaluaciones";
import { resumenRespuesta } from "@/lib/evaluaciones/resumen-respuesta";
import { BTN_GHOST } from "./ui";

/**
 * Alarma de una respuesta (pregunta de seguridad, desesperanza, señales del
 * B-Breve) con la opción de marcarla como atendida, con nota opcional, o
 * reabrirla. Una alarma atendida deja de aparecer en «Antes de la próxima sesión».
 */
export function AlarmaAtencion({
  compacta = false,
  informe,
  onCambio,
  pacienteId,
  respuesta,
}: {
  compacta?: boolean;
  informe: InformeRow | null | undefined;
  onCambio: (informe: InformeRow | null) => void;
  pacienteId: string;
  respuesta: EvaluacionRespuestaRow;
}) {
  const alertas = resumenRespuesta(respuesta).alertas;
  const atencion = atencionDe(informe);
  const [nota, setNota] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  if (!alertas.length) return null;

  const guardar = async (valor: string | null) => {
    setOcupado(true);
    setError("");
    const { data, error: e } = await marcarAlarmaAtendida(respuesta.id, pacienteId, valor);
    setOcupado(false);
    if (e) return setError(e);
    setAbierto(false);
    setNota("");
    onCambio(data);
  };

  if (atencion) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100" data-testid="alarma-atendida">
        <span className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Alarma atendida el {formatoFechaCorta(atencion.at)} a las {formatoHora(atencion.at)}
            {atencion.nota ? <span className="block text-xs text-emerald-200/80">{atencion.nota}</span> : null}
          </span>
        </span>
        <button className={`${BTN_GHOST} !px-3 !py-1.5 text-xs`} disabled={ocupado} onClick={() => void guardar(null)} type="button">
          <RotateCcw className="h-3.5 w-3.5" />
          Reabrir alarma
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2 border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-100" data-testid="alarma-pendiente">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="grid gap-1">
          <strong>Alarma sin atender</strong>
          {compacta ? <span className="text-xs">{alertas[0]}</span> : alertas.map((a) => <span className="text-xs" key={a}>{a}</span>)}
        </div>
      </div>
      {abierto ? (
        <div className="grid gap-2">
          <textarea
            className="field min-h-16 text-sm"
            maxLength={500}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Qué se hizo (opcional). Ej.: llamada el 6/11, sin ideación activa, plan de seguridad acordado."
            value={nota}
          />
          <div className="flex flex-wrap gap-2">
            <button className={`${BTN_GHOST} !px-3 !py-1.5 text-xs`} disabled={ocupado} onClick={() => void guardar(nota)} type="button">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {ocupado ? "Guardando…" : "Confirmar: atendida"}
            </button>
            <button className="text-xs text-red-200/80 underline-offset-2 hover:underline" onClick={() => setAbierto(false)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className={`${BTN_GHOST} w-fit !px-3 !py-1.5 text-xs`} onClick={() => setAbierto(true)} type="button">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Marcar como atendida
        </button>
      )}
      {error ? <span className="text-xs text-red-200">{error}</span> : null}
    </div>
  );
}
