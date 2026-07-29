"use client";

import { Check, ClipboardCopy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { BTN_GHOST, BTN_PRIMARY, Modal } from "@/components/ui-comun";
import { calendarioComoTexto } from "@/lib/iglesia/predicas-texto";
import {
  mesLabel,
  type AsignacionPredicaRow,
  type MesPredicasRow,
  type PersonaRow,
} from "@/lib/iglesia/types";

/**
 * El calendario del mes en el formato plano que se manda por mensaje, listo
 * para copiar. Tambien se puede bajar como .txt.
 */
export function TextoPlano({
  asignaciones,
  cierres,
  mes,
  onCerrar,
  predicadores,
}: {
  asignaciones: AsignacionPredicaRow[];
  cierres: PersonaRow[];
  mes: MesPredicasRow;
  onCerrar: () => void;
  predicadores: PersonaRow[];
}) {
  const [copiado, setCopiado] = useState(false);
  const [texto, setTexto] = useState<string | null>(null);

  const generado = useMemo(
    () => calendarioComoTexto({ asignaciones, cierres, mes, predicadores }),
    [asignaciones, cierres, mes, predicadores],
  );

  // El texto es editable por si se quiere retocar algo antes de enviarlo.
  const contenido = texto ?? generado;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contenido);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles (o navegador antiguo): al menos se puede
      // seleccionar el texto a mano.
      setCopiado(false);
    }
  };

  const descargar = () => {
    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `predicas-${mesLabel(mes.mes).toLowerCase()}-${mes.anio}.txt`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal ancho="max-w-2xl" onClose={onCerrar} titulo={`Texto para enviar — ${mesLabel(mes.mes)} ${mes.anio}`}>
      <div className="grid gap-4">
        <p className="text-sm text-slate-400">
          El calendario en el mismo formato que compartes por mensaje. Puedes editarlo aquí antes de copiarlo.
        </p>

        <textarea
          className="min-h-[320px] w-full border border-white/10 bg-slate-950/70 p-3 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-emerald-300/60"
          onChange={(evento) => setTexto(evento.target.value)}
          spellCheck={false}
          value={contenido}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {texto !== null ? (
            <button className="mr-auto text-xs font-semibold text-slate-400 hover:text-white" onClick={() => setTexto(null)} type="button">
              Restaurar el texto generado
            </button>
          ) : null}
          <button className={BTN_GHOST} onClick={descargar} type="button">
            <Download className="h-4 w-4" />
            Descargar .txt
          </button>
          <button className={BTN_PRIMARY} onClick={() => void copiar()} type="button">
            {copiado ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
