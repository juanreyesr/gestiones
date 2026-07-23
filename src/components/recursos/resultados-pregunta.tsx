"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import type { PreguntaRow, RespuestaRow } from "@/lib/recursos/types";

const NUBE_COLORES = ["text-emerald-200", "text-sky-200", "text-violet-200", "text-amber-200", "text-rose-200"];

export function ResultadosPregunta({ pregunta, respuestas }: { pregunta: PreguntaRow; respuestas: RespuestaRow[] }) {
  if (pregunta.tipo_pregunta === "opcion_multiple") {
    return <ResultadosOpcionMultiple pregunta={pregunta} respuestas={respuestas} />;
  }
  if (pregunta.tipo_pregunta === "escala") {
    return <ResultadosEscala pregunta={pregunta} respuestas={respuestas} />;
  }
  if (pregunta.tipo_pregunta === "nube_palabras") {
    return <ResultadosNube respuestas={respuestas} />;
  }
  return <ResultadosAbierta respuestas={respuestas} />;
}

function ResultadosOpcionMultiple({ pregunta, respuestas }: { pregunta: PreguntaRow; respuestas: RespuestaRow[] }) {
  const conteos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const respuesta of respuestas) {
      const opcionId = (respuesta.valor as { opcion_id?: string }).opcion_id;
      if (!opcionId) continue;
      mapa.set(opcionId, (mapa.get(opcionId) ?? 0) + 1);
    }
    return mapa;
  }, [respuestas]);

  const total = respuestas.length || 1;
  const hayCorrecta = (pregunta.opciones ?? []).some((opcion) => opcion.correcta);

  return (
    <div className="grid gap-3">
      {(pregunta.opciones ?? []).map((opcion) => {
        const cantidad = conteos.get(opcion.id) ?? 0;
        const pct = Math.round((cantidad / total) * 100);
        const esCorrecta = hayCorrecta && opcion.correcta;
        return (
          <div key={opcion.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className={`flex items-center gap-1 font-semibold ${esCorrecta ? "text-emerald-300" : "text-white"}`}>
                {esCorrecta ? <Check className="h-3.5 w-3.5" /> : null}
                {opcion.texto}
              </span>
              <span className="text-slate-400">
                {cantidad} · {pct}%
              </span>
            </div>
            <div className="h-3 w-full bg-white/8">
              <div
                className={`h-3 transition-all duration-500 ${
                  !hayCorrecta ? "bg-emerald-300" : esCorrecta ? "bg-emerald-300" : "bg-slate-400/50"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultadosEscala({ pregunta, respuestas }: { pregunta: PreguntaRow; respuestas: RespuestaRow[] }) {
  const valores = respuestas.map((r) => Number((r.valor as { valor?: number }).valor ?? 0));
  const promedio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
  const rango = Array.from({ length: pregunta.escala_max - pregunta.escala_min + 1 }, (_, i) => pregunta.escala_min + i);
  const total = valores.length || 1;

  return (
    <div className="grid gap-4">
      <div className="text-center">
        <span className="text-4xl font-bold text-emerald-200">{promedio.toFixed(1)}</span>
        <span className="ml-2 text-sm text-slate-400">promedio · {valores.length} respuestas</span>
      </div>
      <div className="grid gap-2">
        {rango.map((valor) => {
          const cantidad = valores.filter((v) => v === valor).length;
          const pct = Math.round((cantidad / total) * 100);
          return (
            <div className="flex items-center gap-2" key={valor}>
              <span className="w-6 shrink-0 text-sm font-semibold text-white">{valor}</span>
              <div className="h-2.5 w-full bg-white/8">
                <div className="h-2.5 bg-sky-300 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-slate-400">{cantidad}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultadosNube({ respuestas }: { respuestas: RespuestaRow[] }) {
  const frecuencias = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const respuesta of respuestas) {
      const texto = (respuesta.valor as { texto?: string }).texto?.trim().toLowerCase();
      if (!texto) continue;
      mapa.set(texto, (mapa.get(texto) ?? 0) + 1);
    }
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  }, [respuestas]);

  if (frecuencias.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Esperando respuestas...</p>;
  }

  const max = frecuencias[0][1];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4">
      {frecuencias.map(([palabra, cantidad], index) => {
        const escala = 0.9 + (cantidad / max) * 1.6;
        return (
          <span
            className={`font-bold ${NUBE_COLORES[index % NUBE_COLORES.length]}`}
            key={palabra}
            style={{ fontSize: `${escala}rem` }}
            title={`${cantidad} veces`}
          >
            {palabra}
          </span>
        );
      })}
    </div>
  );
}

function ResultadosAbierta({ respuestas }: { respuestas: RespuestaRow[] }) {
  if (respuestas.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Esperando respuestas...</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {respuestas
        .slice()
        .reverse()
        .map((respuesta) => (
          <div className="border border-white/10 bg-white/6 p-3 text-sm leading-6 text-slate-100" key={respuesta.id}>
            {(respuesta.valor as { texto?: string }).texto}
          </div>
        ))}
    </div>
  );
}
