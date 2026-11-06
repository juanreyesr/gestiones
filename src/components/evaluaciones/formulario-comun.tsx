"use client";

import { CheckCircle2, CloudOff, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Molde común de los formularios de evaluación por enlace (/evaluacion/<token>):
 * guardado automático del avance (PUT), envío (POST), preguntas faltantes y
 * las pantallas de «enviado», «cerrado» y «falló el envío». Cada instrumento
 * solo define sus preguntas, su borrador y su respuesta.
 *
 * Para un instrumento nuevo: usar useFormularioEvaluacion + estos componentes
 * (ver valores-form.tsx como ejemplo corto).
 */

export type EstadoGuardado = "sin-cambios" | "pendiente" | "guardando" | "guardado" | "sin-conexion";
export type Fase = "llenando" | "enviando" | "enviado" | "fallo-envio" | "cerrado";
/** «usted» (adultos, padres) o «tú» (jóvenes). */
export type Trato = "usted" | "tu";

const ESPERA_GUARDADO_MS = 1200;

export function useFormularioEvaluacion<B>({
  borrador,
  prefijoId = "ea",
  token,
}: {
  /** Arma el borrador actual (memoizado con useCallback). */
  borrador: () => B;
  /** Prefijo del id de cada pregunta (para llevar a la primera que falta). */
  prefijoId?: string;
  token: string;
}) {
  const [fase, setFase] = useState<Fase>("llenando");
  const [guardado, setGuardado] = useState<EstadoGuardado>("sin-cambios");
  const [faltan, setFaltan] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);
  const ultimoGuardado = useRef<string | null>(null);

  const guardarAvance = useCallback(
    async (datos: B, v: number) => {
      setGuardado("guardando");
      try {
        const res = await fetch(`/api/evaluacion/${token}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        });
        const data = (await res.json().catch(() => ({}))) as { estado?: string };
        if (data.estado === "completa" || data.estado === "cerrada") {
          setFase("cerrado");
          return;
        }
        if (v === version.current) setGuardado(res.ok ? "guardado" : "sin-conexion");
      } catch {
        if (v === version.current) setGuardado("sin-conexion");
      }
    },
    [token]
  );

  // Guardado automático: solo si algo cambió respecto de lo último guardado
  // (al abrir no se guarda: evita escrituras al recargar).
  useEffect(() => {
    if (fase !== "llenando" && fase !== "fallo-envio") return;
    const datos = borrador();
    const json = JSON.stringify(datos);
    if (ultimoGuardado.current === null) {
      ultimoGuardado.current = json;
      return;
    }
    if (json === ultimoGuardado.current) return;
    ultimoGuardado.current = json;
    const v = ++version.current;
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void guardarAvance(datos, v), ESPERA_GUARDADO_MS);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [borrador, guardarAvance, fase]);

  // Si se recupera la conexión, se reintenta el guardado del avance.
  useEffect(() => {
    const alVolver = () => {
      if (guardado === "sin-conexion") void guardarAvance(borrador(), version.current);
    };
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, [guardado, guardarAvance, borrador]);

  const quitarFalta = useCallback(
    (clave: string) =>
      setFaltan((prev) => {
        if (!prev.has(clave)) return prev;
        const n = new Set(prev);
        n.delete(clave);
        return n;
      }),
    []
  );

  /** Marca las faltantes (en orden de aparición) y lleva a la primera. Devuelve true si hay. */
  const marcarFaltantes = (faltantes: string[], mensaje = "Faltan preguntas por responder. Las hemos marcado en rojo.") => {
    if (!faltantes.length) return false;
    setFaltan(new Set(faltantes));
    setError(mensaje);
    document.getElementById(`${prefijoId}-${faltantes[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  };

  /** Envía la respuesta completa. Devuelve true si quedó guardada. */
  const enviar = async (respuesta: unknown) => {
    if (fase === "enviando") return false;
    if (temporizador.current) clearTimeout(temporizador.current);
    setFaltan(new Set());
    setError("");
    setFase("enviando");
    let ok = false;
    try {
      const res = await fetch(`/api/evaluacion/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuesta),
      });
      const data = (await res.json().catch(() => ({}))) as { estado?: string; error?: string };
      if (res.status === 422 && data.error) {
        setFase("llenando");
        setError(data.error);
        return false;
      }
      if (res.ok && data.estado === "guardado") {
        ok = true;
        setFase("enviado");
      } else if (res.ok && (data.estado === "completa" || data.estado === "cerrada")) setFase("cerrado");
      else setFase("fallo-envio");
    } catch {
      setFase("fallo-envio");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    return ok;
  };

  return { error, enviar, faltan, fase, guardado, marcarFaltantes, quitarFalta, setError };
}

/** Barra fija con el estado del guardado y, si se indica, el avance. */
export function BarraGuardado({
  continua,
  guardado,
  respondidas,
  testId,
  total,
  trato,
}: {
  continua: boolean;
  guardado: EstadoGuardado;
  respondidas?: number;
  testId: string;
  total?: number;
  trato: Trato;
}) {
  const t = trato === "tu";
  const indicador =
    guardado === "guardando" || guardado === "pendiente"
      ? "Guardando…"
      : guardado === "guardado"
        ? "Avance guardado"
        : guardado === "sin-conexion"
          ? `Sin conexión: ${t ? "tu" : "su"} avance se guardará al reconectar`
          : continua
            ? t
              ? "Continúas donde te quedaste"
              : "Continúa donde se quedó"
            : `${t ? "Tu" : "Su"} avance se guarda automáticamente`;
  const conAvance = respondidas !== undefined && total;
  return (
    <div
      aria-live="polite"
      className={`sticky top-0 z-10 -mx-4 -mt-4 grid gap-1 rounded-t-2xl border-b px-3 py-2 text-xs font-semibold shadow-sm sm:-mx-7 sm:-mt-7 ${
        guardado === "sin-conexion" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-100 bg-white text-slate-500"
      }`}
      data-testid={testId}
    >
      <span className="flex items-center justify-center gap-1.5">
        {guardado === "sin-conexion" ? <CloudOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />}
        {indicador}
        {conAvance ? ` · ${respondidas} de ${total} respondidas` : null}
      </span>
      {conAvance ? (
        <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full bg-teal-600 transition-all" style={{ width: `${Math.round((respondidas / total) * 100)}%` }} />
        </span>
      ) : null}
    </div>
  );
}

/** Aviso con «Reintentar envío» cuando falla la conexión al enviar. */
export function AvisoFalloEnvio({ onReintentar, trato }: { onReintentar: () => void; trato: Trato }) {
  const t = trato === "tu";
  return (
    <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
      <p>
        <strong>No se pudo enviar todavía</strong> (posible problema de conexión). {t ? "Tus" : "Sus"} respuestas están guardadas en
        este enlace; no {t ? "las pierdes" : "las pierde"}.
      </p>
      <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 font-bold text-white" onClick={onReintentar} type="button">
        <RefreshCw className="h-4 w-4" />
        Reintentar envío
      </button>
    </div>
  );
}

/** Pantalla final tras enviar. */
export function PantallaEnviada({ children, mensaje, testId, trato }: { children?: ReactNode; mensaje: string; testId: string; trato: Trato }) {
  return (
    <div className="grid gap-4 py-6 text-center" data-testid={testId}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <p className="text-lg font-semibold text-slate-900">Formulario enviado correctamente</p>
      <p className="mx-auto max-w-md text-base leading-7 text-slate-700">{mensaje}</p>
      {children}
      <p className="text-xs text-slate-400">Ya {trato === "tu" ? "puedes" : "puede"} cerrar esta página.</p>
    </div>
  );
}

/** El enlace ya se usó o el psicólogo lo cerró. */
export function PantallaCerrada({ testId, trato }: { testId: string; trato: Trato }) {
  const t = trato === "tu";
  return (
    <div className="grid gap-3 py-8 text-center" data-testid={testId}>
      <p className="text-base font-semibold text-slate-900">Este formulario ya fue enviado</p>
      <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
        Si {t ? "necesitas" : "necesita"} responderlo de nuevo, {t ? "pide a tu" : "pida a su"} psicólogo que lo vuelva a habilitar.
      </p>
    </div>
  );
}

/** Error, botón «Enviar respuestas» y aviso de que el formulario se cierra al enviar. */
export function PieEnvio({ error, fase, onEnviar }: { error: string; fase: Fase; onEnviar: () => void }) {
  return (
    <>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-4 text-base font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
        disabled={fase === "enviando"}
        onClick={onEnviar}
        type="button"
      >
        <Send className="h-4 w-4" />
        {fase === "enviando" ? "Enviando..." : "Enviar respuestas"}
      </button>
      <p className="-mt-2 text-center text-xs text-slate-400">Al enviar, el formulario se cierra y ya no se puede modificar.</p>
    </>
  );
}

/** Una pregunta con opciones grandes (una sola elección). */
export function Pregunta({
  etiquetas,
  falta,
  id,
  numero,
  onElegir,
  prefijoId = "ea",
  texto,
  valor,
}: {
  etiquetas: readonly string[];
  falta: boolean;
  id: string;
  numero: string;
  onElegir: (v: number) => void;
  prefijoId?: string;
  texto: string;
  valor: number | null;
}) {
  const largas = etiquetas.some((e) => e.length > 28);
  const columnas = largas ? "grid-cols-1 sm:grid-cols-2" : etiquetas.length === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4";
  return (
    <fieldset
      className={`rounded-xl border p-3 ${falta ? "border-red-300 bg-red-50/60" : "border-transparent"}`}
      data-falta={falta ? "si" : undefined}
      id={`${prefijoId}-${id}`}
    >
      <legend className="sr-only">Pregunta {numero}</legend>
      <div className="mb-3 flex gap-3">
        <span
          className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold ${
            falta ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {numero}
        </span>
        <p className="pt-1 text-[15px] leading-6 text-slate-800">{texto}</p>
      </div>
      <div className={`grid gap-2 ${columnas}`}>
        {etiquetas.map((etiqueta, v) => {
          const activo = valor === v;
          return (
            <label
              className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-xs leading-tight transition ${
                activo
                  ? "border-teal-600 bg-teal-50 text-teal-900"
                  : falta
                    ? "border-red-300 bg-white text-slate-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
              key={v}
            >
              <input checked={activo} className="sr-only" name={id} onChange={() => onElegir(v)} type="radio" />
              <span className="text-base font-bold text-slate-900">{v}</span>
              <span>{etiqueta}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
