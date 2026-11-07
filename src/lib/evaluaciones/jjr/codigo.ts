/**
 * Intereses Vocacionales JJR Actualizada: versiones, orden de presentación,
 * avance guardado y validación estricta de la respuesta. Sin calificación
 * (este archivo lo usa también el formulario público).
 *
 * Dos protocolos separados (no se mezclan ni se comparan entre sí):
 * - «jjr84»: JJR-84 v0.2.0 (versión guardada «0.2.0-experimental»), 84 anclas, 14 campos × 6.
 * - «jjr176»: JJR-INV-176 v0.3.0-investigación, forma A o B de 130
 *   actividades (84 anclas + 28 candidatos + 18 exploratorias).
 */
import { BANCO_JJR, CAMPOS_JJR, type ItemJjr } from "./banco";

export type InstrumentoJjr = "jjr84" | "jjr176";
export type FormaJjr = "A" | "B";
/** 0–4 = interés declarado; "NC" = no comprende la actividad; null = sin respuesta. */
export type ValorJjr = 0 | 1 | 2 | 3 | 4 | "NC" | null;

export const VERSIONES_JJR = {
  jjr84: { codigo: "JJR-84", version: "0.2.0-experimental", ordenId: "intercalado_01", nombre: "Intereses Vocacionales JJR Actualizada (JJR-84)" },
  jjr176: {
    codigo: "JJR-INV-176",
    version: "0.3.0-investigacion",
    ordenId: "rondas_01",
    nombre: "Intereses Vocacionales JJR Actualizada · banco ampliado de investigación (JJR-INV-176)",
  },
} as const;

/** Versión para mostrar (la guardada se conserva tal cual por trazabilidad). */
export const versionVisible = (v: string) => v.replace(/-experimental$/, "").replace(/-investigacion$/, "");

export const JJR_TITULO_PACIENTE = "Cuestionario de intereses vocacionales JJR";

export const JJR_ESCALA = [
  "No me gustaría nada",
  "Me gustaría poco",
  "Me gustaría moderadamente",
  "Me gustaría bastante",
  "Me gustaría mucho",
] as const;
export const JJR_NC = "No comprendo la actividad lo suficiente para responder";

export const JJR_INSTRUCCIONES = [
  "Este cuestionario explora qué actividades te interesaría realizar. No mide lo que ya sabes hacer ni determina qué carrera debes elegir.",
  "Lee cada actividad e imagina que tienes una oportunidad razonable de aprender a realizarla. Indica cuánto te gustaría dedicarte a esa actividad, sin basarte principalmente en su salario, prestigio o en si actualmente tienes acceso al equipo necesario.",
  "Si comprendes la actividad pero nunca la has realizado, puedes responder imaginando la experiencia. Si no entiendes suficientemente de qué se trata, elige «No comprendo la actividad lo suficiente para responder». No uses esa opción para decir que no te gusta.",
  "No hay respuestas correctas o incorrectas. Puedes interesarte en muchas áreas o en pocas. Puedes dejar preguntas sin responder.",
] as const;

export const JJR_PREGUNTAS_ABIERTAS = {
  otras: "¿Qué otras actividades te interesa explorar?",
  noConocia: "¿Qué actividades de este cuestionario no conocías?",
} as const;

const numeroDe = (id: string) => Number(id.slice(3));

/** Forma asignada en el enlace (solo JJR-INV-176). */
export function formaDeOpciones(opciones: Record<string, unknown> | null | undefined): FormaJjr | null {
  const f = opciones?.forma;
  return f === "A" || f === "B" ? f : null;
}

/**
 * Orden por rondas: en cada ronda, el siguiente ítem (por número de ID) de
 * cada campo en el orden fijo de campos; los campos agotados se omiten. Para
 * JJR-84 reproduce exactamente el orden intercalado de su tabla (6 rondas de 14).
 */
export function itemsJjr(instrumento: InstrumentoJjr, forma: FormaJjr | null): ItemJjr[] {
  const permitidos = BANCO_JJR.filter((i) =>
    instrumento === "jjr84" ? i.grupo === "ancla" : i.forma === "AB" || i.forma === forma
  );
  const colas = CAMPOS_JJR.map((c) => permitidos.filter((i) => i.campo === c).sort((a, b) => numeroDe(a.id) - numeroDe(b.id)));
  const orden: ItemJjr[] = [];
  while (colas.some((q) => q.length)) for (const q of colas) if (q.length) orden.push(q.shift()!);
  return orden;
}

export const totalItemsJjr = (instrumento: InstrumentoJjr) => (instrumento === "jjr84" ? 84 : 130);

export type JjrBorrador = { respuestas: Record<string, ValorJjr>; otras: string; noConocia: string; inicio: string };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const valorValido = (v: unknown): v is Exclude<ValorJjr, null> => v === "NC" || (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 4);

/** Limpia el avance guardado (solo IDs del banco y valores permitidos). */
export function limpiarBorradorJjr(datos: unknown): JjrBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const r = (d.respuestas && typeof d.respuestas === "object" ? d.respuestas : {}) as Record<string, unknown>;
  const ids = new Set(BANCO_JJR.map((i) => i.id));
  const respuestas: Record<string, ValorJjr> = {};
  for (const [id, v] of Object.entries(r)) if (ids.has(id) && valorValido(v)) respuestas[id] = v;
  const inicio = texto(d.inicio, 40);
  return { respuestas, otras: texto(d.otras, 2000), noConocia: texto(d.noConocia, 2000), inicio: /^\d{4}-\d{2}-\d{2}T/.test(inicio) ? inicio : "" };
}

export function avanceJjr(b: JjrBorrador, instrumento: InstrumentoJjr, forma: FormaJjr | null) {
  const items = itemsJjr(instrumento, forma);
  return { respondidas: items.filter((i) => b.respuestas[i.id] !== undefined && b.respuestas[i.id] !== null).length, total: items.length };
}

export type JjrDatos = {
  instrumento: "JJR-84" | "JJR-INV-176";
  version: string;
  idioma: "es-borrador";
  modo: "web";
  forma: FormaJjr | null;
  orden_id: string;
  /** IDs en el orden en que se mostraron (una vez cada uno). */
  orden_ids: string[];
  /** Respuesta original de cada ID asignado (null = sin respuesta). */
  respuestas: Record<string, ValorJjr>;
  abiertas: { otras: string; noConocia: string };
  inicio: string | null;
};

/**
 * Validación estricta de la respuesta: solo IDs del protocolo asignado y
 * valores enteros 0–4, «NC» o null (rechaza 5, −1, 2.5, "3", true…). Las
 * omisiones se permiten (null). Sirve también para re-validar lo guardado.
 */
export function validarJjr(
  cuerpo: unknown,
  instrumento: InstrumentoJjr,
  forma: FormaJjr | null
): { ok: true; datos: JjrDatos } | { ok: false; error: string } {
  if (instrumento === "jjr176" && !forma) return { ok: false, error: "El enlace no tiene forma asignada (A o B)." };
  const d = (cuerpo && typeof cuerpo === "object" ? cuerpo : null) as Record<string, unknown> | null;
  const r = d?.respuestas;
  if (!r || typeof r !== "object" || Array.isArray(r)) return { ok: false, error: "Respuestas no válidas." };
  const items = itemsJjr(instrumento, forma);
  const asignados = new Set(items.map((i) => i.id));
  const respuestas: Record<string, ValorJjr> = {};
  for (const [id, v] of Object.entries(r as Record<string, unknown>)) {
    if (!asignados.has(id)) return { ok: false, error: `Actividad no incluida en este cuestionario: ${id}.` };
    if (v !== null && !valorValido(v)) return { ok: false, error: `Respuesta no válida en ${id}.` };
  }
  for (const i of items) {
    const v = (r as Record<string, unknown>)[i.id];
    respuestas[i.id] = v === undefined ? null : (v as ValorJjr);
  }
  if (!items.some((i) => respuestas[i.id] !== null)) return { ok: false, error: "Responde al menos una actividad antes de enviar." };
  const abiertas = (d?.abiertas && typeof d.abiertas === "object" ? d.abiertas : {}) as Record<string, unknown>;
  const inicio = texto(d?.inicio, 40);
  const ver = VERSIONES_JJR[instrumento];
  return {
    ok: true,
    datos: {
      instrumento: ver.codigo,
      version: ver.version,
      idioma: "es-borrador",
      modo: "web",
      forma: instrumento === "jjr176" ? forma : null,
      orden_id: ver.ordenId,
      orden_ids: items.map((i) => i.id),
      respuestas,
      abiertas: { otras: texto(abiertas.otras, 2000).trim(), noConocia: texto(abiertas.noConocia, 2000).trim() },
      inicio: /^\d{4}-\d{2}-\d{2}T/.test(inicio) ? inicio : null,
    },
  };
}

/** Instrumento y forma de una respuesta ya guardada (por su código interno). */
export function protocoloDeDatos(datos: unknown): { instrumento: InstrumentoJjr; forma: FormaJjr | null } | null {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  if (d.instrumento === "JJR-84") return { instrumento: "jjr84", forma: null };
  if (d.instrumento === "JJR-INV-176" && (d.forma === "A" || d.forma === "B")) return { instrumento: "jjr176", forma: d.forma };
  return null;
}

/** Re-valida lo guardado (null si no es una respuesta JJR válida). */
export function datosJjrGuardados(datos: unknown): JjrDatos | null {
  const p = protocoloDeDatos(datos);
  if (!p) return null;
  const v = validarJjr(datos, p.instrumento, p.forma);
  if (!v.ok) return null;
  const d = datos as Record<string, unknown>;
  return { ...v.datos, inicio: typeof d.inicio === "string" ? d.inicio : null };
}
