/**
 * Registro único de instrumentos (fase 2): todo lo que el sistema necesita de
 * cada test se declara UNA vez aquí, y lo consumen el panel del expediente,
 * el PDF, el panel de evolución, «Antes de la próxima sesión» y los avisos del
 * servidor. Sin React (también corre en el servidor). Solo panel/servidor:
 * usa la calificación; la página pública no lo importa.
 *
 * Piezas por instrumento (además de esta entrada):
 *  - metadatos: instrumentos.ts (INSTRUMENTOS)
 *  - servidor del enlace: registro-servidor.ts (validar y limpiar el avance)
 *  - formulario: components/evaluaciones/formularios.tsx
 *  - informe y opciones al asignar: components/clinica/registro-informes.tsx
 */
import { calificarBBreve } from "./b-breve/calificacion";
import { avanceBBreve, limpiarBorradorBBreve, validarBBreve } from "./b-breve/codigo";
import { calificarEapi } from "./eapi/calificacion";
import { avanceEapi, FORMA_MODULOS, limpiarBorradorEapi, MODULOS_EAPI, modulosDeOpciones, validarEapi } from "./eapi/codigo";
import type { EvaluacionRespuestaRow } from "./evaluaciones";
import { instrumentoPorId } from "./instrumentos";
import { NOMBRES_CAMPOS } from "./jjr/banco";
import { calificarJjr, camposPrincipales, mediaTexto, ordenPorInteres } from "./jjr/calificacion";
import { avanceJjr, datosJjrGuardados, formaDeOpciones, limpiarBorradorJjr, type InstrumentoJjr } from "./jjr/codigo";
import { avanceMcea, datosMceaGuardados, limpiarBorradorMcea, opcionesMcea } from "./mcea/codigo";
import { A as respuestaMcea, modulosAbiertos, nombreModulo, scoreAll as puntajesMcea } from "./mcea/motor";
import { calificarRiasec, RIASEC_INFO } from "./riasec/calificacion";
import { avanceRiasec, limpiarBorradorRiasec, validarRiasec } from "./riasec/codigo";
import { calificarValores, VALORES_INFO } from "./valores/calificacion";
import { avanceValores, limpiarBorradorValores, validarValores } from "./valores/codigo";

type Opciones = Record<string, unknown> | null | undefined;
export type Avance = { respondidas: number; total: number };
export type ResumenCalculado = {
  /** Líneas para el PDF y listados. */
  puntuaciones: string[];
  /** Alertas (textos) para el PDF. */
  alertas: string[];
  /** Texto breve junto a la respuesta en la lista del expediente. */
  insignia: string;
  /** Muestra la marca «Alarma» (pregunta de seguridad o señal de alerta). */
  alarma: boolean;
};
export type PuntoCalculado = { serie: string; valor: number };
export type HitoCalculado = { tipo: string; titulo: string; detalle: string };

export type DefinicionInstrumento = {
  /** Prefijo del archivo al exportar JSON. */
  sigla: string;
  /** Nombre corto con sus opciones (p. ej. «EAPI (GAD-7, PTQ)», «JJR-INV-176 · forma A»). */
  nombreCorto: (opciones?: Opciones) => string;
  /** Detalle de las opciones para mostrar junto al nombre (p. ej. « (GAD-7, PTQ)», « · forma A»). */
  detalleOpciones?: (opciones: Opciones) => string;
  /** Opciones que ve el enlace público (solo lo necesario para mostrar el formulario). */
  opcionesPublicas: (opciones: Opciones) => Record<string, unknown>;
  /** Avance de un borrador guardado. */
  avance: (borrador: unknown, opciones: Opciones) => Avance | null;
  /** Opciones para una nueva aplicación (o seguimiento) a partir de una respuesta. */
  opcionesNueva: (r: EvaluacionRespuestaRow, opcionesOriginal: Opciones) => Record<string, unknown>;
  /** Resumen calificado (null si el registro no es válido para calificar). */
  resumen: (r: EvaluacionRespuestaRow) => ResumenCalculado | null;
  /** Puntos de series en el tiempo (ids de evolucion-paciente.ts) e hitos. */
  evolucion?: (r: EvaluacionRespuestaRow) => { puntos: PuntoCalculado[]; hito?: HitoCalculado } | null;
};

const base = (id: string) => (instrumentoPorId(id)?.nombre ?? id).split(" · ")[0];
const sinOpciones = () => ({});
const copiarOpciones = (_: EvaluacionRespuestaRow, o: Opciones) => ({ ...(o ?? {}) });

const datosEapiDe = (r: EvaluacionRespuestaRow) => {
  const d = (r.datos ?? {}) as Record<string, unknown>;
  const modulos = MODULOS_EAPI.filter((m) => Array.isArray(d[m]));
  const v = modulos.length ? validarEapi(r.datos, modulos) : null;
  return v?.ok ? v.datos : null;
};
const siglasEapi = (o: Opciones) => modulosDeOpciones(o).map((m) => FORMA_MODULOS[m].sigla).join(", ");

const valido = <T,>(v: { ok: true; datos: T } | { ok: false }) => (v.ok ? v.datos : null);

function jjr(id: InstrumentoJjr): DefinicionInstrumento {
  return {
    sigla: id === "jjr84" ? "JJR84" : "JJR176",
    nombreCorto: (o) => (id === "jjr84" ? "Intereses JJR-84" : `Intereses JJR-INV-176${formaDeOpciones(o) ? ` · forma ${formaDeOpciones(o)}` : ""}`),
    detalleOpciones: (o) => (formaDeOpciones(o) ? ` · forma ${formaDeOpciones(o)}` : ""),
    opcionesPublicas: (o) => (id === "jjr176" ? { forma: formaDeOpciones(o) } : {}),
    avance: (b, o) => avanceJjr(limpiarBorradorJjr(b), id, formaDeOpciones(o)),
    // Mismo protocolo y misma forma: así las aplicaciones son comparables.
    opcionesNueva: (r, o) => {
      const f = datosJjrGuardados(r.datos)?.forma ?? formaDeOpciones(o);
      return id === "jjr176" && f ? { forma: f, asignacion: "seguimiento" } : {};
    },
    resumen: (r) => {
      const d = datosJjrGuardados(r.datos);
      if (!d) return null;
      const c = calificarJjr(d);
      const orden = ordenPorInteres(c.campos).filter((k) => k.media !== null);
      const top = camposPrincipales(c.campos);
      return {
        puntuaciones: [
          `Mayor inclinación: ${top.map((k) => `${k.nombre} (${mediaTexto(k.media)})`).join(", ") || "sin resultado"} · ${c.conteo.numericas}/${c.conteo.total} respondidas, ${c.conteo.nc} NC, ${c.conteo.omitidas} sin respuesta`,
          `Medias 0–4 de mayor a menor: ${orden.map((k) => `${k.campo} ${mediaTexto(k.media)}${k.estado === "parcial" ? "*" : ""}`).join(", ")}`,
        ],
        alertas: [],
        insignia: top.length ? `Mayor inclinación: ${top.map((k) => k.nombre).join(", ")}` : "Sin resultado",
        alarma: false,
      };
    },
    evolucion: (r) => {
      const d = datosJjrGuardados(r.datos);
      if (!d) return null;
      const c = calificarJjr(d);
      const orden = ordenPorInteres(c.campos).filter((k) => k.media !== null);
      return {
        puntos: [],
        hito: {
          tipo: id,
          titulo: `Intereses JJR: ${camposPrincipales(c.campos).map((k) => k.nombre).join(", ") || "sin resultado"}`,
          detalle: orden.slice(0, 3).map((k) => `${NOMBRES_CAMPOS[k.campo].nombre} ${mediaTexto(k.media)}`).join(" · "),
        },
      };
    },
  };
}

export const REGISTRO: Record<string, DefinicionInstrumento> = {
  "b-breve": {
    sigla: "B16",
    nombreCorto: () => base("b-breve"),
    opcionesPublicas: sinOpciones,
    avance: (b) => avanceBBreve(limpiarBorradorBBreve(b)),
    opcionesNueva: copiarOpciones,
    resumen: (r) => {
      const d = valido(validarBBreve(r.datos));
      if (!d) return null;
      const c = calificarBBreve(d);
      return {
        puntuaciones: [`Total: ${c.total}/48 (${c.banda.etiqueta})`, ...c.areas.filter((a) => a.prioritaria).map((a) => `Área prioritaria: ${a.nombre} (${a.pct} %)`)],
        alertas: c.senales.filter((s) => s.nivel === "alarma").map((s) => s.texto),
        insignia: `${c.total}/48 · ${c.banda.etiqueta}`,
        alarma: d.S1 === 1 || d.S2 === 1,
      };
    },
    evolucion: (r) => {
      const d = valido(validarBBreve(r.datos));
      return d ? { puntos: [{ serie: "b-breve", valor: calificarBBreve(d).total }] } : null;
    },
  },
  eapi: {
    sigla: "EAPI",
    nombreCorto: (o) => (o ? `EAPI (${siglasEapi(o)})` : "EAPI"),
    detalleOpciones: (o) => ` (${siglasEapi(o)})`,
    opcionesPublicas: (o) => ({ modulos: modulosDeOpciones(o) }),
    avance: (b, o) => avanceEapi(limpiarBorradorEapi(b), modulosDeOpciones(o)),
    opcionesNueva: (r) => ({ modulos: MODULOS_EAPI.filter((m) => Array.isArray((r.datos as Record<string, unknown>)[m])) }),
    resumen: (r) => {
      const d = datosEapiDe(r);
      if (!d) return null;
      const c = calificarEapi(d);
      const p: string[] = [];
      if (c.gad) p.push(`GAD-7: ${c.gad.total}/21 (${c.gad.band.label})`);
      if (c.dass) {
        p.push(`DASS-21 Depresión: ${c.dass.dep.x2}/42 (${c.dass.dep.band.label})`);
        p.push(`DASS-21 Ansiedad: ${c.dass.anx.x2}/42 (${c.dass.anx.band.label})`);
        p.push(`DASS-21 Estrés: ${c.dass.str.x2}/42 (${c.dass.str.band.label})`);
      }
      if (c.ptq) p.push(`PTQ: ${c.ptq.total}/60 (${c.ptq.band.label})`);
      if (c.docs) p.push(`DOCS: ${c.docs.total}/80 (${c.docs.band.label})`);
      p.push(`Pregunta de seguridad: ${d.safety}`);
      const alertas = c.flags.filter((f) => f.lvl === "alert").map((f) => f.t);
      return {
        puntuaciones: p,
        alertas,
        insignia: [c.gad ? `GAD-7 ${c.gad.total}` : "", c.dass ? `Estrés ${c.dass.str.band.label}` : "", c.ptq ? `PTQ ${c.ptq.total}` : "", c.docs ? `DOCS ${c.docs.total}` : ""]
          .filter(Boolean)
          .join(" · "),
        alarma: alertas.length > 0,
      };
    },
    evolucion: (r) => {
      const d = datosEapiDe(r);
      if (!d) return null;
      const c = calificarEapi(d);
      const puntos: PuntoCalculado[] = [];
      if (c.gad) puntos.push({ serie: "gad", valor: c.gad.total });
      if (c.dass) {
        puntos.push({ serie: "dass-dep", valor: c.dass.dep.x2 }, { serie: "dass-anx", valor: c.dass.anx.x2 }, { serie: "dass-str", valor: c.dass.str.x2 });
      }
      if (c.ptq) puntos.push({ serie: "ptq", valor: c.ptq.total });
      if (c.docs) puntos.push({ serie: "docs", valor: c.docs.total });
      return { puntos };
    },
  },
  riasec: {
    sigla: "RIASEC",
    nombreCorto: () => base("riasec"),
    opcionesPublicas: sinOpciones,
    avance: (b) => avanceRiasec(limpiarBorradorRiasec(b)),
    opcionesNueva: copiarOpciones,
    resumen: (r) => {
      const d = valido(validarRiasec(r.datos));
      if (!d) return null;
      const c = calificarRiasec(d);
      return {
        puntuaciones: [`Código Holland: ${c.codigo} (${c.orden.slice(0, 3).map((t) => RIASEC_INFO[t].nombre).join(", ")})`, `Diferenciación: ${c.diferenciacion.k}; consistencia: ${c.consistencia.k}`],
        alertas: [],
        insignia: `Código ${c.codigo} · diferenciación ${c.diferenciacion.k}`,
        alarma: false,
      };
    },
    evolucion: (r) => {
      const d = valido(validarRiasec(r.datos));
      if (!d) return null;
      const c = calificarRiasec(d);
      return { puntos: [], hito: { tipo: "riasec", titulo: `Intereses vocacionales: código ${c.codigo}`, detalle: c.orden.slice(0, 3).map((t) => RIASEC_INFO[t].nombre).join(" · ") } };
    },
  },
  valores: {
    sigla: "VALORES",
    nombreCorto: () => base("valores"),
    opcionesPublicas: sinOpciones,
    avance: (b) => avanceValores(limpiarBorradorValores(b)),
    opcionesNueva: copiarOpciones,
    resumen: (r) => {
      const d = valido(validarValores(r.datos));
      if (!d) return null;
      const c = calificarValores(d);
      const principales = c.principales.map((x) => VALORES_INFO[x].nombre).join(", ");
      return {
        puntuaciones: [`Valores principales: ${principales}`, `Elegidos por la persona: ${d.elegidos.map((x) => VALORES_INFO[x].nombre).join(", ")} (concordancia ${c.concordancia.n}/3)`],
        alertas: [],
        insignia: `Valores: ${principales}`,
        alarma: false,
      };
    },
    evolucion: (r) => {
      const d = valido(validarValores(r.datos));
      if (!d) return null;
      const c = calificarValores(d);
      return { puntos: [], hito: { tipo: "valores", titulo: "Valores laborales principales", detalle: c.principales.map((x) => VALORES_INFO[x].nombre).join(" · ") } };
    },
  },
  jjr84: jjr("jjr84"),
  jjr176: jjr("jjr176"),
  mcea: {
    sigla: "MCEA",
    nombreCorto: (o) => `MCEA${opcionesMcea(o).modo === "full" ? " (completo)" : ""}`,
    detalleOpciones: (o) => (opcionesMcea(o).modo === "full" ? " · modo completo" : ""),
    opcionesPublicas: (o) => ({ ...opcionesMcea(o) }),
    avance: (b, o) => avanceMcea(limpiarBorradorMcea(b, o)),
    // Reevaluación: repite los módulos abiertos en esta aplicación (línea base) para poder comparar.
    opcionesNueva: (r, o) => {
      const d = datosMceaGuardados(r.datos);
      return { modo: opcionesMcea(o).modo, anchor: d ? modulosAbiertos(d) : opcionesMcea(o).anchor };
    },
    resumen: (r) => {
      const d = datosMceaGuardados(r.datos);
      if (!d) return null;
      const sc = puntajesMcea(d);
      const i9 = respuestaMcea(d, "PHQ9_9") ?? 0;
      const p = Object.values(sc).map((s) => `${nombreModulo(s.id).split(" · ")[0]}: ${s.raw}/${s.max} (${s.label})`);
      if (d.estado === "detenida") p.push("La persona detuvo la evaluación en la pantalla de riesgo.");
      return {
        puntuaciones: p,
        alertas: i9 >= 1 ? [`Ítem 9 del PHQ-9 = ${i9}: pensamientos de muerte o de hacerse daño (¿podría hacerse daño hoy?: ${d.risk.self ?? "sin respuesta"}).`] : [],
        insignia: [sc.PHQ9 ? `PHQ-9 ${sc.PHQ9.raw}` : "", sc.GAD7 ? `GAD-7 ${sc.GAD7.raw}` : "", sc.PTQ ? `PTQ ${sc.PTQ.raw}` : ""].filter(Boolean).join(" · "),
        alarma: i9 >= 1,
      };
    },
    evolucion: (r) => {
      const d = datosMceaGuardados(r.datos);
      if (!d) return null;
      const sc = puntajesMcea(d);
      const puntos: PuntoCalculado[] = [];
      if (sc.PHQ9) puntos.push({ serie: "phq9", valor: sc.PHQ9.raw });
      // GAD-7 y PTQ son las mismas escalas que en el EAPI: se suman a esas series.
      if (sc.GAD7) puntos.push({ serie: "gad", valor: sc.GAD7.raw });
      if (sc.PTQ) puntos.push({ serie: "ptq", valor: sc.PTQ.raw });
      return { puntos };
    },
  },
};

export const definicion = (instrumento: string | null | undefined) => (instrumento ? (REGISTRO[instrumento] ?? null) : null);

/** Nombre corto del instrumento con sus opciones (o el id si no está registrado). */
export const nombreCortoInstrumento = (instrumento: string, opciones?: Opciones) => definicion(instrumento)?.nombreCorto(opciones) ?? instrumento;

/** Nombre de la lista del expediente: primera parte del nombre + detalle de opciones. */
export const nombreConOpciones = (instrumento: string, opciones?: Opciones) =>
  (instrumentoPorId(instrumento)?.nombre.split(" · ")[0] ?? instrumento) + (opciones ? (definicion(instrumento)?.detalleOpciones?.(opciones) ?? "") : "");
