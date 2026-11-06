"use client";

import {
  CheckCircle2,
  CloudOff,
  LifeBuoy,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  minutosEapi,
  preguntasEapi,
  type EapiBorrador,
  type ModuloEapi,
} from "@/lib/evaluaciones/eapi/codigo";
import {
  DASS21,
  DASS_LABELS,
  DOCS,
  EAPI_ABIERTA,
  EAPI_BLOQUES,
  EAPI_CRISIS,
  EAPI_GRACIAS,
  EAPI_INTRO,
  EAPI_LINEAS_AYUDA,
  EAPI_TITULO_PACIENTE,
  GAD7,
  GAD_FUNC,
  GAD_LABELS,
  PTQ,
  PTQ_LABELS,
  SAFETY,
} from "@/lib/evaluaciones/eapi/escalas";

// Importante: este formulario NO importa la calificación. El paciente no ve
// puntuaciones, bandas, etiquetas diagnósticas ni comentarios.

type EstadoGuardado =
  | "sin-cambios"
  | "pendiente"
  | "guardando"
  | "guardado"
  | "sin-conexion";
type Fase = "llenando" | "enviando" | "enviado" | "fallo-envio" | "cerrado";
type Lista = "gad" | "dass" | "ptq" | "docs";

const ESPERA_GUARDADO_MS = 1200;
const vacio = (n: number) => Array<number | null>(n).fill(null);

/** Una pregunta con opciones grandes (una sola elección). */
export function Pregunta({
  etiquetas,
  falta,
  id,
  numero,
  onElegir,
  texto,
  valor,
}: {
  etiquetas: readonly string[];
  falta: boolean;
  id: string;
  numero: string;
  onElegir: (v: number) => void;
  texto: string;
  valor: number | null;
}) {
  const largas = etiquetas.some((e) => e.length > 28);
  const columnas = largas
    ? "grid-cols-1 sm:grid-cols-2"
    : etiquetas.length === 5
      ? "grid-cols-2 sm:grid-cols-5"
      : "grid-cols-2 sm:grid-cols-4";
  return (
    <fieldset
      className={`rounded-xl border p-3 ${falta ? "border-red-300 bg-red-50/60" : "border-transparent"}`}
      data-falta={falta ? "si" : undefined}
      id={`ea-${id}`}
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
              <input
                checked={activo}
                className="sr-only"
                name={id}
                onChange={() => onElegir(v)}
                type="radio"
              />
              <span className="text-base font-bold text-slate-900">{v}</span>
              <span>{etiqueta}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Escala({ etiquetas }: { etiquetas: readonly string[] }) {
  return (
    <p className="mt-1 text-xs leading-5 text-slate-500">
      {etiquetas.map((e, i) => `${i} = ${e}`).join(" · ")}
    </p>
  );
}

export function EapiForm({
  borradorInicial,
  codigoCaso,
  modulos,
  token,
}: {
  borradorInicial: EapiBorrador | null;
  codigoCaso: string;
  /** Escalas asignadas por el psicólogo (la pregunta de seguridad va siempre). */
  modulos: readonly ModuloEapi[];
  token: string;
}) {
  const tiene = (m: ModuloEapi) => modulos.includes(m);
  // Numeración de bloques según las escalas asignadas.
  const numeroBloque = (m: ModuloEapi) => modulos.indexOf(m) + 1;
  const tituloBloque = (m: ModuloEapi) =>
    EAPI_BLOQUES[m].titulo.replace(/^Bloque \d+/, `Bloque ${numeroBloque(m)}`);
  const b = borradorInicial;
  const [listas, setListas] = useState<Record<Lista, (number | null)[]>>(
    () => ({
      gad: b?.gad ?? vacio(7),
      dass: b?.dass ?? vacio(21),
      ptq: b?.ptq ?? vacio(15),
      docs: b?.docs ?? vacio(20),
    }),
  );
  const [func, setFunc] = useState<number | null>(b?.func ?? null);
  const [safety, setSafety] = useState<number | null>(b?.safety ?? null);
  const [abierta, setAbierta] = useState(b?.abierta ?? "");
  const [faltan, setFaltan] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [fase, setFase] = useState<Fase>("llenando");
  const [seguridadEnviada, setSeguridadEnviada] = useState(0);
  const [guardado, setGuardado] = useState<EstadoGuardado>("sin-cambios");
  const [continua] = useState(() =>
    Boolean(
      b &&
      [...b.gad, ...b.dass, ...b.ptq, ...b.docs].some((v) => v !== null),
    ),
  );
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);

  const borrador = useCallback(
    (): EapiBorrador => ({
      // Nombre, edad y fecha se toman del expediente al enviar.
      nombre: "",
      edad: "",
      fecha: "",
      gad: listas.gad,
      func,
      dass: listas.dass,
      ptq: listas.ptq,
      docs: listas.docs,
      safety,
      abierta,
    }),
    [listas, func, safety, abierta],
  );

  const guardarAvance = useCallback(
    async (datos: EapiBorrador, v: number) => {
      setGuardado("guardando");
      try {
        const res = await fetch(`/api/evaluacion/${token}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        });
        const data = (await res.json().catch(() => ({}))) as {
          estado?: string;
        };
        if (data.estado === "completa" || data.estado === "cerrada") {
          setFase("cerrado");
          return;
        }
        if (v === version.current)
          setGuardado(res.ok ? "guardado" : "sin-conexion");
      } catch {
        if (v === version.current) setGuardado("sin-conexion");
      }
    },
    [token],
  );

  // Guardado automático: solo si algo cambió respecto de lo último guardado.
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
    temporizador.current = setTimeout(
      () => void guardarAvance(datos, v),
      ESPERA_GUARDADO_MS,
    );
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [borrador, guardarAvance, fase]);

  useEffect(() => {
    const alVolver = () => {
      if (guardado === "sin-conexion")
        void guardarAvance(borrador(), version.current);
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

  const elegir = (lista: Lista, i: number, v: number) => {
    setListas((prev) => ({
      ...prev,
      [lista]: prev[lista].map((x, j) => (j === i ? v : x)),
    }));
    quitarFalta(`${lista}${i + 1}`);
  };

  const requeridas = preguntasEapi(modulos);
  const respondidas =
    modulos.reduce(
      (n, m) => n + listas[m].filter((v) => v !== null).length,
      0,
    ) + (safety !== null ? 1 : 0);

  const enviar = async () => {
    if (fase === "enviando") return;
    const faltantes: string[] = [];
    for (const m of modulos)
      listas[m].forEach((v, i) => v === null && faltantes.push(`${m}${i + 1}`));
    if (safety === null) faltantes.push("safety");
    if (faltantes.length > 0) {
      setFaltan(new Set(faltantes));
      setError("Faltan preguntas por responder. Las hemos marcado en rojo.");
      document
        .getElementById(`ea-${faltantes[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    setFaltan(new Set());
    setError("");
    setFase("enviando");
    const respuesta = {
      v: 1,
      instrumento: "AEI",
      gad: tiene("gad") ? listas.gad : null,
      dass: tiene("dass") ? listas.dass : null,
      ptq: tiene("ptq") ? listas.ptq : null,
      docs: tiene("docs") ? listas.docs : null,
      safety,
      func: tiene("gad") ? func : null,
      ref: codigoCaso,
      nombre: "",
      edad: null,
      fecha: "",
      abierta: abierta.trim(),
      enviado: new Date().toISOString(),
    };
    try {
      const res = await fetch(`/api/evaluacion/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuesta),
      });
      const data = (await res.json().catch(() => ({}))) as {
        estado?: string;
        error?: string;
      };
      if (res.status === 422 && data.error) {
        setFase("llenando");
        setError(data.error);
        return;
      }
      if (res.ok && data.estado === "guardado") {
        setSeguridadEnviada(safety ?? 0);
        setFase("enviado");
      } else if (
        res.ok &&
        (data.estado === "completa" || data.estado === "cerrada")
      )
        setFase("cerrado");
      else setFase("fallo-envio");
    } catch {
      setFase("fallo-envio");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fase === "enviado") {
    return (
      <div className="grid gap-4 py-6 text-center" data-testid="ea-gracias">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="text-lg font-semibold text-slate-900">
          Formulario enviado correctamente
        </p>
        <p className="mx-auto max-w-md text-base leading-7 text-slate-700">
          Gracias por responder. {EAPI_GRACIAS}
        </p>
        {seguridadEnviada >= 1 ? (
          <div
            className="mx-auto grid max-w-lg gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950"
            data-testid="ea-crisis"
          >
            <p className="flex items-center gap-2 font-semibold">
              <LifeBuoy className="h-4 w-4" />
              Un mensaje importante para usted.
            </p>
            <p>{EAPI_CRISIS}</p>
            <ul className="list-disc pl-5">
              {EAPI_LINEAS_AYUDA.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-xs text-slate-400">Ya puede cerrar esta página.</p>
      </div>
    );
  }

  if (fase === "cerrado") {
    return (
      <div className="grid gap-3 py-8 text-center" data-testid="ea-cerrado">
        <p className="text-base font-semibold text-slate-900">
          Este formulario ya fue enviado
        </p>
        <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
          Si necesita responderlo de nuevo, pida a su psicólogo que lo vuelva a
          habilitar.
        </p>
      </div>
    );
  }

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

  const bloque = (
    titulo: string,
    intro: string,
    etiquetas?: readonly string[],
  ) => (
    <div className="pt-2">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{intro}</p>
      {etiquetas ? <Escala etiquetas={etiquetas} /> : null}
    </div>
  );

  return (
    <div className="grid gap-5">
      <div
        aria-live="polite"
        className={`sticky top-0 z-10 -mx-4 -mt-4 grid gap-1 rounded-t-2xl border-b px-3 py-2 text-xs font-semibold sm:-mx-7 sm:-mt-7 ${
          guardado === "sin-conexion"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-slate-100 bg-white shadow-sm text-slate-500"
        }`}
        data-testid="ea-guardado"
      >
        <span className="flex items-center justify-center gap-1.5">
          {guardado === "sin-conexion" ? (
            <CloudOff className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
          )}
          {indicador} · {respondidas} de {requeridas} respondidas
        </span>
        <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full bg-teal-600 transition-all"
            style={{
              width: `${Math.round((respondidas / requeridas) * 100)}%`,
            }}
          />
        </span>
      </div>

      {fase === "fallo-envio" ? (
        <div
          className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          <p>
            <strong>No se pudo enviar todavía</strong> (posible problema de
            conexión). Sus respuestas están guardadas en este enlace; no las
            pierde.
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
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
          {EAPI_TITULO_PACIENTE}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tiempo aproximado: {minutosEapi(modulos)} minutos. Sus respuestas las
          revisará únicamente su psicólogo. Puede cerrar la página y continuar
          después con el mismo enlace.
        </p>
      </div>
      <div className="rounded-r-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
        {EAPI_INTRO}
      </div>

      {tiene("gad") ? (
        <>
          {bloque(tituloBloque("gad"), EAPI_BLOQUES.gad.intro, GAD_LABELS)}
          <div className="grid gap-2">
            {GAD7.map((t, i) => (
              <Pregunta
                etiquetas={GAD_LABELS}
                falta={faltan.has(`gad${i + 1}`)}
                id={`gad${i + 1}`}
                key={i}
                numero={String(i + 1)}
                onElegir={(v) => elegir("gad", i, v)}
                texto={t}
                valor={listas.gad[i]}
              />
            ))}
            <Pregunta
              etiquetas={GAD_FUNC.labels}
              falta={false}
              id="func"
              numero="+"
              onElegir={setFunc}
              texto={`${GAD_FUNC.t} (opcional)`}
              valor={func}
            />
          </div>
        </>
      ) : null}

      {tiene("dass") ? (
        <>
          {bloque(tituloBloque("dass"), EAPI_BLOQUES.dass.intro, DASS_LABELS)}
          <div className="grid gap-2">
            {DASS21.map((t, i) => (
              <Pregunta
                etiquetas={DASS_LABELS}
                falta={faltan.has(`dass${i + 1}`)}
                id={`dass${i + 1}`}
                key={i}
                numero={String(i + 1)}
                onElegir={(v) => elegir("dass", i, v)}
                texto={t}
                valor={listas.dass[i]}
              />
            ))}
          </div>
        </>
      ) : null}

      {tiene("ptq") ? (
        <>
          {bloque(tituloBloque("ptq"), EAPI_BLOQUES.ptq.intro, PTQ_LABELS)}
          <div className="grid gap-2">
            {PTQ.map((t, i) => (
              <Pregunta
                etiquetas={PTQ_LABELS}
                falta={faltan.has(`ptq${i + 1}`)}
                id={`ptq${i + 1}`}
                key={i}
                numero={String(i + 1)}
                onElegir={(v) => elegir("ptq", i, v)}
                texto={t}
                valor={listas.ptq[i]}
              />
            ))}
          </div>
        </>
      ) : null}

      {tiene("docs") ? (
        <>
          {bloque(tituloBloque("docs"), EAPI_BLOQUES.docs.intro)}
          {DOCS.map((cat, ci) => (
            <div
              className="grid gap-2 rounded-2xl border border-slate-200 p-3"
              key={cat.id}
            >
              <h3 className="text-base font-semibold text-slate-900">
                Categoría {ci + 1}: {cat.name}
              </h3>
              <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <strong>Ejemplos…</strong>
                <ul className="mt-1 list-disc pl-5">
                  {cat.ex.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm leading-6 text-slate-600">{cat.lead}</p>
              {cat.q.map((q, qi) => {
                const i = ci * 5 + qi;
                return (
                  <Pregunta
                    etiquetas={q.l}
                    falta={faltan.has(`docs${i + 1}`)}
                    id={`docs${i + 1}`}
                    key={qi}
                    numero={`${ci + 1}.${qi + 1}`}
                    onElegir={(v) => elegir("docs", i, v)}
                    texto={q.t}
                    valor={listas.docs[i]}
                  />
                );
              })}
            </div>
          ))}
        </>
      ) : null}

      {bloque(EAPI_BLOQUES.safety.titulo, EAPI_BLOQUES.safety.intro)}
      <Pregunta
        etiquetas={SAFETY.labels}
        falta={faltan.has("safety")}
        id="safety"
        numero="S"
        onElegir={(v) => {
          setSafety(v);
          quitarFalta("safety");
        }}
        texto={SAFETY.t}
        valor={safety}
      />

      <h2 className="pt-2 text-lg font-semibold text-slate-900">
        Para terminar
      </h2>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-slate-700">
          {EAPI_ABIERTA} (opcional)
        </span>
        <textarea
          className="field-light min-h-28 resize-y"
          onChange={(e) => setAbierta(e.target.value)}
          value={abierta}
        />
      </label>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
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
      <p className="-mt-2 text-center text-xs text-slate-400">
        Al enviar, el formulario se cierra y ya no se puede modificar.
      </p>
      <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
        Cuestionario de orientación para su atención psicológica. Sus respuestas
        son confidenciales; los resultados los interpreta y conversa con usted
        su psicólogo.
      </p>
    </div>
  );
}
