"use client";

import { CalendarDays, Check, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Avatar, MenuAnclado } from "../ui";
import { etiquetaVencimiento, formatoCorto, parseFecha } from "@/lib/iglesia/fechas";

type Opcion<T extends string> = { valor: T; label: string; color: string; texto: string };

/**
 * Celda de estado/prioridad: pastilla de color a todo lo ancho que despliega
 * las opciones con su color, igual que las columnas de etiqueta de Monday.
 */
export function SelectorPastilla<T extends string>({
  compacto,
  onChange,
  opciones,
  valor,
}: {
  compacto?: boolean;
  onChange: (valor: T) => void;
  opciones: Array<Opcion<T>>;
  valor: T;
}) {
  // El disparador se guarda en estado (no en un ref) porque el menu flotante
  // lo necesita durante el render para calcular su posicion.
  const [disparador, setDisparador] = useState<HTMLButtonElement | null>(null);
  const actual = opciones.find((opcion) => opcion.valor === valor) ?? opciones[0];

  return (
    <>
      <button
        className={`flex w-full items-center justify-center font-bold uppercase tracking-wide transition hover:brightness-110 ${
          compacto ? "px-2 py-0.5 text-[10px]" : "px-2 py-1.5 text-[11px]"
        }`}
        onClick={(evento) => {
          evento.stopPropagation();
          setDisparador(evento.currentTarget);
        }}
        style={{ backgroundColor: actual.color, color: actual.texto }}
        title={actual.label}
        type="button"
      >
        <span className="truncate">{actual.label}</span>
      </button>

      {disparador ? (
        <MenuAnclado ancho={200} onClose={() => setDisparador(null)} trigger={disparador}>
          <div className="grid gap-1">
            {opciones.map((opcion) => (
              <button
                className="flex items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide transition hover:brightness-110"
                key={opcion.valor}
                onClick={() => {
                  onChange(opcion.valor);
                  setDisparador(null);
                }}
                style={{ backgroundColor: opcion.color, color: opcion.texto }}
                type="button"
              >
                <span className="truncate">{opcion.label}</span>
                {opcion.valor === valor ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>
        </MenuAnclado>
      ) : null}
    </>
  );
}

/** Texto editable en el sitio: se ve como texto y al pulsar se vuelve input. */
export function CeldaTexto({
  className = "",
  onChange,
  placeholder = "Escribe aquí",
  valor,
}: {
  className?: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  valor: string;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor);

  const confirmar = () => {
    setEditando(false);
    const limpio = borrador.trim();
    if (limpio !== valor.trim()) onChange(limpio);
  };

  if (editando) {
    return (
      <input
        autoFocus
        className={`w-full border border-emerald-300/60 bg-slate-950 px-2 py-1 text-sm text-white outline-none ${className}`}
        onBlur={confirmar}
        onChange={(evento) => setBorrador(evento.target.value)}
        onClick={(evento) => evento.stopPropagation()}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") confirmar();
          if (evento.key === "Escape") {
            setBorrador(valor);
            setEditando(false);
          }
        }}
        value={borrador}
      />
    );
  }

  return (
    <button
      className={`w-full truncate border border-transparent px-2 py-1 text-left text-sm transition hover:border-white/20 ${
        valor ? "text-slate-100" : "text-slate-500"
      } ${className}`}
      onClick={(evento) => {
        evento.stopPropagation();
        setBorrador(valor);
        setEditando(true);
      }}
      type="button"
    >
      {valor || placeholder}
    </button>
  );
}

/** Fecha con aviso de vencimiento: rojo si ya pasó, ámbar si vence hoy o mañana. */
export function CeldaFecha({
  onChange,
  valor,
  estaListo,
}: {
  onChange: (valor: string | null) => void;
  valor: string | null;
  estaListo?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const fecha = parseFecha(valor);
  const dias = fecha ? Math.round((fecha.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null;

  const tono =
    estaListo || dias === null
      ? "text-slate-300"
      : dias < 0
        ? "text-red-300"
        : dias <= 1
          ? "text-amber-300"
          : "text-slate-300";

  if (editando) {
    return (
      <input
        autoFocus
        className="w-full border border-emerald-300/60 bg-slate-950 px-1.5 py-1 text-xs text-white outline-none"
        onBlur={() => setEditando(false)}
        onChange={(evento) => {
          onChange(evento.target.value || null);
          setEditando(false);
        }}
        onClick={(evento) => evento.stopPropagation()}
        type="date"
        value={valor ?? ""}
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className={`flex flex-1 items-center gap-1.5 border border-transparent px-1.5 py-1 text-xs font-semibold transition hover:border-white/20 ${tono}`}
        onClick={(evento) => {
          evento.stopPropagation();
          setEditando(true);
        }}
        title={valor ? etiquetaVencimiento(valor) : "Sin fecha"}
        type="button"
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="truncate">{valor ? formatoCorto(valor) : "—"}</span>
      </button>
      {valor ? (
        <button
          className="text-slate-600 transition hover:text-red-300"
          onClick={(evento) => {
            evento.stopPropagation();
            onChange(null);
          }}
          title="Quitar fecha"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Responsable: avatar con iniciales y menu con los nombres ya usados en el
 * tablero, para no volver a teclearlos (equivalente simple a la columna de
 * personas de Monday, sin cuentas ni invitaciones).
 */
export function CeldaResponsable({
  onChange,
  sugerencias,
  valor,
}: {
  onChange: (valor: string | null) => void;
  sugerencias: string[];
  valor: string | null;
}) {
  const [disparador, setDisparador] = useState<HTMLButtonElement | null>(null);
  const [nuevo, setNuevo] = useState("");

  return (
    <>
      <button
        className="flex w-full items-center gap-1.5 border border-transparent px-1.5 py-1 text-left text-xs text-slate-200 transition hover:border-white/20"
        onClick={(evento) => {
          evento.stopPropagation();
          setNuevo("");
          setDisparador(evento.currentTarget);
        }}
        type="button"
      >
        {valor ? (
          <>
            <Avatar nombre={valor} size={22} />
            <span className="truncate">{valor}</span>
          </>
        ) : (
          <>
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-slate-500">
              <UserRound className="h-3 w-3" />
            </span>
            <span className="text-slate-500">Sin asignar</span>
          </>
        )}
      </button>

      {disparador ? (
        <MenuAnclado ancho={230} onClose={() => setDisparador(null)} trigger={disparador}>
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              const limpio = nuevo.trim();
              if (!limpio) return;
              onChange(limpio);
              setDisparador(null);
            }}
          >
            <input
              autoFocus
              className="mb-1 w-full border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-300/60"
              onChange={(evento) => setNuevo(evento.target.value)}
              placeholder="Nombre de la persona"
              value={nuevo}
            />
          </form>
          <div className="max-h-56 overflow-y-auto">
            {sugerencias
              .filter((nombre) => nombre.toLowerCase().includes(nuevo.trim().toLowerCase()))
              .map((nombre) => (
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-slate-200 transition hover:bg-white/10"
                  key={nombre}
                  onClick={() => {
                    onChange(nombre);
                    setDisparador(null);
                  }}
                  type="button"
                >
                  <Avatar nombre={nombre} size={22} />
                  <span className="truncate">{nombre}</span>
                  {nombre === valor ? <Check className="ml-auto h-3.5 w-3.5 text-emerald-300" /> : null}
                </button>
              ))}
          </div>
          {valor ? (
            <button
              className="mt-1 w-full border-t border-white/10 px-2 py-1.5 text-left text-xs font-semibold text-red-200 transition hover:bg-white/10"
              onClick={() => {
                onChange(null);
                setDisparador(null);
              }}
              type="button"
            >
              Quitar responsable
            </button>
          ) : null}
        </MenuAnclado>
      ) : null}
    </>
  );
}
