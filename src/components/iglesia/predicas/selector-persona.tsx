"use client";

import { AlertTriangle, UserPlus } from "lucide-react";
import type { PersonaRow } from "@/lib/iglesia/types";

/**
 * Una celda del calendario apunta a alguien del catalogo (personaId) o a un
 * invitado escrito a mano (texto). El invitado es solo de ese dia: no se
 * guarda en ningun catalogo.
 */
export type ValorPersona = { personaId: string | null; texto: string | null };

const VALOR_INVITADO = "invitado";

/**
 * Selector de una celda. Muestra entre parentesis cuantas veces lleva asignada
 * cada persona en el mes, y se pinta en ambar cuando la asignacion repite a
 * alguien en ese mismo horario dentro del mes: es un aviso, nunca un bloqueo.
 */
export function SelectorPersona({
  conteos,
  onChange,
  personas,
  placeholderInvitado = "Nombre del invitado",
  repetido,
  valor,
}: {
  conteos: Record<string, number>;
  onChange: (valor: ValorPersona) => void;
  personas: PersonaRow[];
  placeholderInvitado?: string;
  repetido?: boolean;
  valor: ValorPersona;
}) {
  const esInvitado = valor.texto !== null;
  const seleccion = esInvitado ? VALOR_INVITADO : valor.personaId ? `p:${valor.personaId}` : "";

  // Si la persona quedo inactiva o se borro del catalogo, igual debe verse en
  // su celda: se agrega como opcion suelta para no perder la asignacion.
  const fueraDeLista = valor.personaId && !personas.some((persona) => persona.id === valor.personaId);

  return (
    <div className="grid gap-1">
      <div className="relative">
        <select
          className={`w-full appearance-none border bg-slate-950/70 py-2 pl-2.5 pr-7 text-sm outline-none transition ${
            repetido
              ? "border-amber-400/70 bg-amber-400/10 text-amber-100"
              : valor.personaId || esInvitado
                ? "border-white/12 text-slate-100 focus:border-emerald-300/60"
                : "border-dashed border-white/20 text-slate-500 focus:border-emerald-300/60"
          }`}
          onChange={(evento) => {
            const elegido = evento.target.value;
            if (elegido === VALOR_INVITADO) onChange({ personaId: null, texto: "" });
            else if (elegido.startsWith("p:")) onChange({ personaId: elegido.slice(2), texto: null });
            else onChange({ personaId: null, texto: null });
          }}
          value={seleccion}
        >
          <option value="">— Sin asignar —</option>

          {personas.map((persona) => (
            <option key={persona.id} value={`p:${persona.id}`}>
              {persona.nombre}
              {conteos[persona.id] ? ` (${conteos[persona.id]})` : ""}
            </option>
          ))}

          {fueraDeLista ? <option value={seleccion}>(inactivo o eliminado)</option> : null}

          <option disabled>──────────</option>
          <option value={VALOR_INVITADO}>Invitado…</option>
        </select>

        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          {repetido ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
          ) : (
            <span className="block h-1.5 w-1.5 rotate-45 border-b border-r border-slate-500" />
          )}
        </span>
      </div>

      {esInvitado ? (
        <div className="flex items-center gap-1.5 border border-emerald-300/40 bg-emerald-300/5 px-2">
          <UserPlus className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <input
            autoFocus={!valor.texto}
            className="w-full bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
            onChange={(evento) => onChange({ personaId: null, texto: evento.target.value })}
            placeholder={placeholderInvitado}
            value={valor.texto ?? ""}
          />
        </div>
      ) : null}
    </div>
  );
}
