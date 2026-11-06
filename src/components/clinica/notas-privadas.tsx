"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchInforme, guardarNotasInforme } from "@/lib/evaluaciones/evaluaciones";
import { BTN_GHOST, Field } from "./ui";

/** Notas privadas del psicólogo sobre una respuesta (no las ve el paciente). */
export function NotasPrivadas({ respuestaId, pacienteId, onCambio }: { respuestaId: string; pacienteId: string; onCambio?: (notas: string) => void }) {
  const [notas, setNotas] = useState("");
  const [guardadas, setGuardadas] = useState("");
  const [estado, setEstado] = useState("");

  useEffect(() => {
    let vivo = true;
    void fetchInforme(respuestaId).then(({ data }) => {
      if (!vivo) return;
      setNotas(data?.notasPrivadas ?? "");
      setGuardadas(data?.notasPrivadas ?? "");
      onCambio?.(data?.notasPrivadas ?? "");
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir la respuesta
  }, [respuestaId]);

  const guardar = async () => {
    setEstado("Guardando…");
    const { error } = await guardarNotasInforme(respuestaId, pacienteId, { notasPrivadas: notas });
    if (error) {
      setEstado(error);
      return;
    }
    setGuardadas(notas);
    onCambio?.(notas);
    setEstado("Guardadas");
    setTimeout(() => setEstado(""), 2000);
  };

  return (
    <div className="grid gap-2 border border-white/10 bg-white/4 p-3">
      <Field label="Notas del profesional (privadas; salen en el informe profesional impreso)">
        <textarea
          className="field min-h-24 resize-y"
          maxLength={10000}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Impresión clínica, hipótesis, plan…"
          value={notas}
        />
      </Field>
      <div className="flex items-center gap-2">
        <button className={BTN_GHOST} disabled={notas === guardadas} onClick={() => void guardar()} type="button">
          <Save className="h-4 w-4" />
          Guardar notas
        </button>
        {estado ? <span className="text-xs text-slate-400">{estado}</span> : notas !== guardadas ? <span className="text-xs text-amber-300">Sin guardar</span> : null}
      </div>
    </div>
  );
}
