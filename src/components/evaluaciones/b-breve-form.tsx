"use client";

import { CheckCircle2, CloudOff, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BBreveBorrador } from "@/lib/evaluaciones/b-breve/codigo";
import {
  B_BREVE_ABIERTA,
  B_BREVE_AVISO_FORMULARIO,
  B_BREVE_ENCABEZADO_ITEMS,
  B_BREVE_ESCALA,
  B_BREVE_EXTRA,
  B_BREVE_GRACIAS,
  B_BREVE_INSTRUCCIONES,
  B_BREVE_ITEMS,
  B_BREVE_RELACIONES,
  B_BREVE_SEGURIDAD,
  B_BREVE_TITULO,
} from "@/lib/evaluaciones/b-breve/contenido";

// Importante: este formulario NO importa la calificación. Los padres nunca ven
// puntuaciones, bandas, señales ni interpretaciones (regla 3 de la especificación).

type EstadoGuardado = "sin-cambios" | "pendiente" | "guardando" | "guardado" | "sin-conexion";
type Fase = "llenando" | "enviando" | "enviado" | "fallo-envio" | "cerrado";

const ESPERA_GUARDADO_MS = 1200;

export function BBreveForm({
  borradorInicial,
  codigoCaso,
  token,
}: {
  borradorInicial: BBreveBorrador | null;
  codigoCaso: string;
  token: string;
}) {
  const [nombre, setNombre] = useState(borradorInicial?.nombre ?? "");
  const [relacion, setRelacion] = useState(borradorInicial?.relacion ?? "");
  const [items, setItems] = useState<(number | null)[]>(() => borradorInicial?.items ?? Array(16).fill(null));
  const [seg, setSeg] = useState<Record<"S1" | "S2", 0 | 1 | null>>({
    S1: borradorInicial?.S1 ?? null,
    S2: borradorInicial?.S2 ?? null,
  });
  const [abierta, setAbierta] = useState(borradorInicial?.abierta ?? "");
  const [extra, setExtra] = useState(borradorInicial?.extra ?? "");
  const [faltan, setFaltan] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [fase, setFase] = useState<Fase>("llenando");
  const [guardado, setGuardado] = useState<EstadoGuardado>("sin-cambios");
  const [continua] = useState(() =>
    Boolean(borradorInicial && (borradorInicial.nombre || borradorInicial.items.some((v) => v !== null)))
  );
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);

  const borrador = useCallback(
    // La fecha la pone el servidor (día del envío).
    (): BBreveBorrador => ({ nombre, relacion, fecha: "", items, S1: seg.S1, S2: seg.S2, abierta, extra }),
    [nombre, relacion, items, seg, abierta, extra]
  );

  // Guardado automático: un momento después del último cambio se envía el avance al servidor.
  const guardarAvance = useCallback(
    async (datos: BBreveBorrador, v: number) => {
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

  // Último contenido ya guardado: solo se guarda de nuevo si algo cambió.
  const ultimoGuardado = useRef<string | null>(null);
  useEffect(() => {
    if (fase !== "llenando" && fase !== "fallo-envio") return;
    const datos = borrador();
    const json = JSON.stringify(datos);
    if (ultimoGuardado.current === null) {
      ultimoGuardado.current = json; // estado inicial (lo que ya estaba guardado)
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

  const quitarFalta = (clave: string) =>
    setFaltan((prev) => {
      if (!prev.has(clave)) return prev;
      const n = new Set(prev);
      n.delete(clave);
      return n;
    });

  const enviar = async () => {
    if (fase === "enviando") return;
    const faltantes: string[] = [];
    if (!nombre.trim()) faltantes.push("nombre");
    if (!relacion) faltantes.push("relacion");
    items.forEach((v, i) => v === null && faltantes.push(`i${i + 1}`));
    if (seg.S1 === null) faltantes.push("S1");
    if (seg.S2 === null) faltantes.push("S2");
    if (faltantes.length > 0) {
      setFaltan(new Set(faltantes));
      setError("Faltan preguntas por responder. Las hemos marcado en rojo.");
      document.getElementById(`bb-${faltantes[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    setFaltan(new Set());
    setError("");
    setFase("enviando");
    const respuesta = {
      v: 1,
      instrumento: "B-Breve",
      ref: codigoCaso,
      nombre: nombre.trim(),
      relacion,
      fecha: "",
      items: items as number[],
      S1: seg.S1 as 0 | 1,
      S2: seg.S2 as 0 | 1,
      abierta: abierta.trim(),
      extra: extra.trim(),
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
      <div className="grid gap-3 py-8 text-center" data-testid="bb-gracias">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="text-lg font-semibold text-slate-900">Formulario enviado correctamente</p>
        <p className="mx-auto max-w-md text-base leading-7 text-slate-700">{B_BREVE_GRACIAS}</p>
        <p className="text-xs text-slate-400">Ya puede cerrar esta página.</p>
      </div>
    );
  }

  if (fase === "cerrado") {
    return (
      <div className="grid gap-3 py-8 text-center" data-testid="bb-cerrado">
        <p className="text-base font-semibold text-slate-900">Este formulario ya fue enviado</p>
        <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
          Si necesita responderlo de nuevo, pida a su psicólogo que lo vuelva a habilitar.
        </p>
      </div>
    );
  }

  const marco = (clave: string) => (faltan.has(clave) ? "border-red-300 bg-red-50/60" : "border-transparent");

  const opcion = ({
    activo,
    etiqueta,
    falta,
    key,
    name,
    numero,
    onSelect,
  }: {
    activo: boolean;
    etiqueta?: string;
    falta: boolean;
    key: number;
    name: string;
    numero: string;
    onSelect: () => void;
  }) => (
    <label
      key={key}
      className={`relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1.5 py-2 text-center text-xs leading-tight transition ${
        activo
          ? "border-teal-600 bg-teal-50 text-teal-800"
          : falta
            ? "border-red-300 bg-white text-slate-500"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
      }`}
    >
      <input checked={activo} className="sr-only" name={name} onChange={onSelect} type="radio" />
      <span className="text-base font-bold text-slate-900">{numero}</span>
      {etiqueta ? <span>{etiqueta}</span> : null}
    </label>
  );

  const indicador =
    guardado === "guardando" || guardado === "pendiente"
      ? "Guardando…"
      : guardado === "guardado"
        ? "Avance guardado"
        : guardado === "sin-conexion"
          ? "Sin conexión: su avance se guardará al reconectar"
          : continua
            ? "Continúa donde se quedó"
            : "Su avance se guarda automáticamente";

  return (
    <div className="grid gap-6">
      {/* Indicador fijo del guardado automático */}
      <div
        aria-live="polite"
        className={`sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-center gap-1.5 rounded-t-2xl border-b px-3 py-2 text-xs font-semibold sm:-mx-7 sm:-mt-7 ${
          guardado === "sin-conexion" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-100 bg-white/95 text-slate-500"
        }`}
        data-testid="bb-guardado"
      >
        {guardado === "sin-conexion" ? <CloudOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />}
        {indicador}
      </div>

      {fase === "fallo-envio" ? (
        <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <p>
            <strong>No se pudo enviar todavía</strong> (posible problema de conexión). Sus respuestas están guardadas en este enlace;
            no las pierde.
          </p>
          <button
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 font-bold text-white"
            onClick={() => void enviar()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar envío
          </button>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{B_BREVE_TITULO}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tiempo aproximado: 5 a 8 minutos. Sus respuestas las revisará únicamente el psicólogo tratante. Puede cerrar la página y
          continuar después con el mismo enlace.
        </p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
        {B_BREVE_INSTRUCCIONES}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`grid gap-1.5 rounded-lg border p-1 ${marco("nombre")}`} id="bb-nombre">
          <span className="text-xs font-semibold uppercase text-slate-500">Nombre de quien responde *</span>
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
        <label className={`grid gap-1.5 rounded-lg border p-1 ${marco("relacion")}`} id="bb-relacion">
          <span className="text-xs font-semibold uppercase text-slate-500">Relación con el niño o niña *</span>
          <select
            className="field-light"
            onChange={(e) => {
              setRelacion(e.target.value);
              quitarFalta("relacion");
            }}
            value={relacion}
          >
            <option value="">Seleccione…</option>
            {B_BREVE_RELACIONES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">{B_BREVE_ENCABEZADO_ITEMS}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{B_BREVE_ESCALA.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      </div>

      <div className="grid gap-2">
        {B_BREVE_ITEMS.map((item, i) => {
          const clave = `i${item.n}`;
          const etiquetas = item.etiquetas ?? B_BREVE_ESCALA;
          return (
            <fieldset
              className={`rounded-xl border p-3 ${marco(clave)}`}
              data-falta={faltan.has(clave) ? "si" : undefined}
              id={`bb-${clave}`}
              key={item.n}
            >
              <legend className="sr-only">Pregunta {item.n}</legend>
              <div className="mb-3 flex gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    faltan.has(clave) ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.n}
                </span>
                <p className="pt-1 text-[15px] leading-6 text-slate-800">
                  {item.texto}
                  {item.ayuda ? <span className="mt-1 block text-sm text-slate-500">Ayuda: {item.ayuda}</span> : null}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((v) =>
                  opcion({
                    activo: items[i] === v,
                    etiqueta: etiquetas[v],
                    falta: faltan.has(clave),
                    key: v,
                    name: clave,
                    numero: String(v),
                    onSelect: () => {
                      setItems((prev) => prev.map((x, j) => (j === i ? v : x)));
                      quitarFalta(clave);
                    },
                  })
                )}
              </div>
            </fieldset>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold text-slate-900">Dos preguntas más</h2>
      <div className="grid gap-2">
        {B_BREVE_SEGURIDAD.map((s) => (
          <fieldset
            className={`rounded-xl border p-3 ${marco(s.clave)}`}
            data-falta={faltan.has(s.clave) ? "si" : undefined}
            id={`bb-${s.clave}`}
            key={s.clave}
          >
            <legend className="sr-only">Pregunta {s.clave}</legend>
            <div className="mb-3 flex gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  faltan.has(s.clave) ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {s.clave}
              </span>
              <p className="pt-1 text-[15px] leading-6 text-slate-800">{s.texto}</p>
            </div>
            <div className="grid max-w-xs grid-cols-2 gap-2">
              {([1, 0] as const).map((v) =>
                opcion({
                  activo: seg[s.clave] === v,
                  falta: faltan.has(s.clave),
                  key: v,
                  name: s.clave,
                  numero: v === 1 ? "Sí" : "No",
                  onSelect: () => {
                    setSeg((prev) => ({ ...prev, [s.clave]: v }));
                    quitarFalta(s.clave);
                  },
                })
              )}
            </div>
          </fieldset>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-slate-900">Para terminar</h2>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">{B_BREVE_ABIERTA}</span>
        <textarea className="field-light min-h-28 resize-y" onChange={(e) => setAbierta(e.target.value)} value={abierta} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">{B_BREVE_EXTRA} (opcional)</span>
        <textarea className="field-light min-h-20 resize-y" onChange={(e) => setExtra(e.target.value)} value={extra} />
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
      <p className="-mt-3 text-center text-xs text-slate-400">Al enviar, el formulario se cierra y ya no se puede modificar.</p>

      <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">{B_BREVE_AVISO_FORMULARIO}</p>
    </div>
  );
}
