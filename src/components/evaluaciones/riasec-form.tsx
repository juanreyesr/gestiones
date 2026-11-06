"use client";

import { CheckCircle2, CloudOff, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RiasecBorrador } from "@/lib/evaluaciones/riasec/codigo";
import {
  RIASEC_ESCALA,
  RIASEC_ESTUDIOS,
  RIASEC_GRACIAS,
  RIASEC_INTRO,
  RIASEC_ITEMS,
  RIASEC_ORDEN,
  RIASEC_PREGUNTA_CARRERAS,
  RIASEC_PREGUNTA_ESCALA,
  RIASEC_TITULO_PACIENTE,
} from "@/lib/evaluaciones/riasec/escalas";
import { Pregunta } from "./eapi-form";

// Importante: este formulario NO importa la calificación ni el código de tipo
// de cada pregunta: quien responde no ve puntuaciones ni a qué tipo pertenece cada frase.

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type EstadoGuardado = "sin-cambios" | "pendiente" | "guardando" | "guardado" | "sin-conexion";
type Fase = "llenando" | "enviando" | "enviado" | "fallo-envio" | "cerrado";
const ESPERA_GUARDADO_MS = 1200;

export function RiasecForm({ borradorInicial, codigoCaso, token }: { borradorInicial: RiasecBorrador | null; codigoCaso: string; token: string }) {
  const b = borradorInicial;
  const [nombre, setNombre] = useState(b?.nombre ?? "");
  const [edad, setEdad] = useState(b?.edad ?? "");
  const [estudios, setEstudios] = useState(b?.estudios ?? "");
  const [carreras, setCarreras] = useState(b?.carreras ?? "");
  const [fecha, setFecha] = useState(b?.fecha || hoyLocal());
  const [items, setItems] = useState<(number | null)[]>(() => b?.items ?? Array(36).fill(null));
  const [faltan, setFaltan] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [fase, setFase] = useState<Fase>("llenando");
  const [guardado, setGuardado] = useState<EstadoGuardado>("sin-cambios");
  const [continua] = useState(() => Boolean(b && (b.nombre || b.items.some((v) => v !== null))));
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);

  const borrador = useCallback((): RiasecBorrador => ({ nombre, edad, estudios, carreras, fecha, items }), [nombre, edad, estudios, carreras, fecha, items]);

  const guardarAvance = useCallback(
    async (datos: RiasecBorrador, v: number) => {
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

  const ultimoGuardado = useRef<string | null>(null);
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

  useEffect(() => {
    const alVolver = () => {
      if (guardado === "sin-conexion") void guardarAvance(borrador(), version.current);
    };
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, [guardado, guardarAvance, borrador]);

  const quitarFalta = (clave: string) =>
    setFaltan((prev) => {
      if (!prev.has(clave)) return prev;
      const n = new Set(prev);
      n.delete(clave);
      return n;
    });

  const respondidas = items.filter((v) => v !== null).length;

  const enviar = async () => {
    if (fase === "enviando") return;
    const faltantes: string[] = [];
    if (!nombre.trim()) faltantes.push("nombre");
    // En el orden en que se muestran, para llevar a la primera que falta.
    RIASEC_ORDEN.forEach((n) => items[n - 1] === null && faltantes.push(`it${n}`));
    if (faltantes.length > 0) {
      setFaltan(new Set(faltantes));
      setError("Faltan preguntas por responder. Las hemos marcado en rojo.");
      document.getElementById(`ea-${faltantes[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    setFaltan(new Set());
    setError("");
    setFase("enviando");
    const edadNum = Number(edad);
    const respuesta = {
      v: 1,
      instrumento: "RIASEC",
      items,
      nombre: nombre.trim(),
      edad: edad && Number.isInteger(edadNum) ? edadNum : null,
      estudios,
      carreras: carreras.trim(),
      fecha,
      ref: codigoCaso,
      enviado: new Date().toISOString(),
    };
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
        return;
      }
      if (res.ok && data.estado === "guardado") setFase("enviado");
      else if (res.ok && (data.estado === "completa" || data.estado === "cerrada")) setFase("cerrado");
      else setFase("fallo-envio");
    } catch {
      setFase("fallo-envio");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fase === "enviado") {
    return (
      <div className="grid gap-3 py-8 text-center" data-testid="ri-gracias">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="text-lg font-semibold text-slate-900">Formulario enviado correctamente</p>
        <p className="mx-auto max-w-md text-base leading-7 text-slate-700">¡Gracias por responder! {RIASEC_GRACIAS}</p>
        <p className="text-xs text-slate-400">Ya puedes cerrar esta página.</p>
      </div>
    );
  }

  if (fase === "cerrado") {
    return (
      <div className="grid gap-3 py-8 text-center">
        <p className="text-base font-semibold text-slate-900">Este formulario ya fue enviado</p>
        <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">Si necesitas responderlo de nuevo, pide a tu psicólogo que lo vuelva a habilitar.</p>
      </div>
    );
  }

  const indicador =
    guardado === "guardando" || guardado === "pendiente"
      ? "Guardando…"
      : guardado === "guardado"
        ? "Avance guardado"
        : guardado === "sin-conexion"
          ? "Sin conexión: tu avance se guardará al reconectar"
          : continua
            ? "Continúas donde te quedaste"
            : "Tu avance se guarda automáticamente";

  return (
    <div className="grid gap-5">
      <div
        aria-live="polite"
        className={`sticky top-0 z-10 -mx-4 -mt-4 grid gap-1 rounded-t-2xl border-b px-3 py-2 text-xs font-semibold shadow-sm sm:-mx-7 sm:-mt-7 ${
          guardado === "sin-conexion" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-100 bg-white text-slate-500"
        }`}
        data-testid="ri-guardado"
      >
        <span className="flex items-center justify-center gap-1.5">
          {guardado === "sin-conexion" ? <CloudOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />}
          {indicador} · {respondidas} de 36 respondidas
        </span>
        <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full bg-teal-600 transition-all" style={{ width: `${Math.round((respondidas / 36) * 100)}%` }} />
        </span>
      </div>

      {fase === "fallo-envio" ? (
        <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <p>
            <strong>No se pudo enviar todavía</strong> (posible problema de conexión). Tus respuestas están guardadas en este enlace.
          </p>
          <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 font-bold text-white" onClick={() => void enviar()} type="button">
            <RefreshCw className="h-4 w-4" />
            Reintentar envío
          </button>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{RIASEC_TITULO_PACIENTE}</h1>
        <p className="mt-2 text-sm text-slate-500">Tiempo aproximado: 8 a 10 minutos. Puedes cerrar la página y continuar después con el mismo enlace.</p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">{RIASEC_INTRO}</div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`grid gap-1.5 rounded-lg border p-1 ${faltan.has("nombre") ? "border-red-300 bg-red-50/60" : "border-transparent"}`} id="ea-nombre">
          <span className="text-xs font-semibold uppercase text-slate-500">Tu nombre *</span>
          <input
            autoComplete="name"
            className="field-light"
            onChange={(e) => {
              setNombre(e.target.value);
              quitarFalta("nombre");
            }}
            value={nombre}
          />
        </label>
        <label className="grid gap-1.5 p-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Edad</span>
          <input className="field-light" inputMode="numeric" maxLength={2} onChange={(e) => setEdad(e.target.value.replace(/\D/g, ""))} value={edad} />
        </label>
        <label className="grid gap-1.5 p-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Nivel de estudios actual</span>
          <select className="field-light" onChange={(e) => setEstudios(e.target.value)} value={estudios}>
            <option value="">Seleccione…</option>
            {RIASEC_ESTUDIOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 p-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Fecha</span>
          <input className="field-light" onChange={(e) => setFecha(e.target.value)} type="date" value={fecha} />
        </label>
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900">{RIASEC_PREGUNTA_ESCALA}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{RIASEC_ESCALA.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      </div>
      <div className="grid gap-2">
        {RIASEC_ORDEN.map((n, pos) => (
          <Pregunta
            etiquetas={RIASEC_ESCALA}
            falta={faltan.has(`it${n}`)}
            id={`it${n}`}
            key={n}
            numero={String(pos + 1)}
            onElegir={(v) => {
              setItems((prev) => prev.map((x, j) => (j === n - 1 ? v : x)));
              quitarFalta(`it${n}`);
            }}
            texto={RIASEC_ITEMS[n - 1]}
            valor={items[n - 1]}
          />
        ))}
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">{RIASEC_PREGUNTA_CARRERAS}</span>
        <textarea className="field-light min-h-24 resize-y" maxLength={2000} onChange={(e) => setCarreras(e.target.value)} value={carreras} />
      </label>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-4 text-base font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
        disabled={fase === "enviando"}
        onClick={() => void enviar()}
        type="button"
      >
        <Send className="h-4 w-4" />
        {fase === "enviando" ? "Enviando..." : "Enviar respuestas"}
      </button>
      <p className="-mt-2 text-center text-xs text-slate-400">Al enviar, el formulario se cierra y ya no se puede modificar.</p>
    </div>
  );
}
