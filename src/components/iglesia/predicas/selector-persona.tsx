"use client";

import { AlertTriangle } from "lucide-react";
import type { PredicadorRow } from "@/lib/iglesia/types";

/**
 * El valor viaja codificado para poder distinguir en un mismo <select> a una
 * persona del catalogo de un texto fijo como "Pastores de celebracion":
 *   ""            -> sin asignar
 *   "p:<uuid>"    -> predicador del catalogo
 *   "t:<texto>"   -> texto fijo
 */
export type ValorPersona = { predicadorId: string | null; texto: string | null };

export const codificar = ({ predicadorId, texto }: ValorPersona) =>
  predicadorId ? `p:${predicadorId}` : texto ? `t:${texto}` : "";

export const decodificar = (valor: string): ValorPersona => {
  if (valor.startsWith("p:")) return { predicadorId: valor.slice(2), texto: null };
  if (valor.startsWith("t:")) return { predicadorId: null, texto: valor.slice(2) };
  return { predicadorId: null, texto: null };
};

/**
 * Selector de una celda del calendario. Muestra entre parentesis cuantas veces
 * lleva asignado cada predicador en el mes, y se pinta en ambar cuando la
 * asignacion repite a alguien en ese mismo horario dentro del mes: es un aviso,
 * nunca un bloqueo.
 */
export function SelectorPersona({
  conteos,
  onChange,
  opcionesFijas = [],
  predicadores,
  repetido,
  valor,
}: {
  conteos: Record<string, number>;
  onChange: (valor: ValorPersona) => void;
  opcionesFijas?: string[];
  predicadores: PredicadorRow[];
  repetido?: boolean;
  valor: ValorPersona;
}) {
  const codificado = codificar(valor);

  // Si el asignado quedo inactivo o borrado del catalogo, igual debe verse en
  // su celda: se agrega como opcion suelta para no perder la asignacion.
  const seleccionadoFueraDeLista =
    valor.predicadorId && !predicadores.some((predicador) => predicador.id === valor.predicadorId);

  return (
    <div className="relative">
      <select
        className={`w-full appearance-none border bg-slate-950/70 py-2 pl-2.5 pr-7 text-sm outline-none transition ${
          repetido
            ? "border-amber-400/70 bg-amber-400/10 text-amber-100"
            : valor.predicadorId || valor.texto
              ? "border-white/12 text-slate-100 focus:border-emerald-300/60"
              : "border-dashed border-white/20 text-slate-500 focus:border-emerald-300/60"
        }`}
        onChange={(evento) => onChange(decodificar(evento.target.value))}
        value={codificado}
      >
        <option value="">— Sin asignar —</option>

        {opcionesFijas.map((texto) => (
          <option key={texto} value={`t:${texto}`}>
            {texto}
          </option>
        ))}

        {opcionesFijas.length ? <option disabled>──────────</option> : null}

        {predicadores.map((predicador) => (
          <option key={predicador.id} value={`p:${predicador.id}`}>
            {predicador.nombre}
            {conteos[predicador.id] ? ` (${conteos[predicador.id]})` : ""}
          </option>
        ))}

        {seleccionadoFueraDeLista ? (
          <option value={codificado}>(predicador inactivo o eliminado)</option>
        ) : null}
      </select>

      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        {repetido ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
        ) : (
          <span className="block h-1.5 w-1.5 rotate-45 border-b border-r border-slate-500" />
        )}
      </span>
    </div>
  );
}
