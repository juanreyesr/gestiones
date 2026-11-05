/**
 * B-Breve: formato de datos (Anexo C) y validación. El código corto B16-…
 * ya no se usa en la aplicación (el avance se guarda solo); se conserva por
 * compatibilidad con el Anexo C y sus casos de prueba. Sin imports en tiempo de
 * ejecución para poder probarlo con Node directamente (scripts/probar-b-breve.mjs).
 */

export type BBreveRespuesta = {
  v: 1;
  instrumento: "B-Breve";
  ref: string;
  nombre: string;
  relacion: string;
  fecha: string;
  /** items[0] = ítem 1 ... items[15] = ítem 16; enteros 0–3. */
  items: number[];
  S1: 0 | 1;
  S2: 0 | 1;
  abierta: string;
  extra: string;
  enviado: string;
};

/** Datos mínimos para calificar (lo que lleva el código corto). */
export type BBreveDatos = Pick<BBreveRespuesta, "items" | "S1" | "S2"> &
  Partial<Omit<BBreveRespuesta, "items" | "S1" | "S2">>;

/** Expresión del Anexo C.2 (insensible a mayúsculas). */
export const B_BREVE_CODIGO_RE = /^B16-([0-3]{16})-([01])([01])(?:-([A-Z0-9]{1,12}))?$/i;

const esItem = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 3;
const esBit = (v: unknown): v is 0 | 1 => v === 0 || v === 1;

/** Limpia el código de caso: solo letras y números, máximo 12 (Anexo C.2). */
export function limpiarRef(ref: string | null | undefined) {
  return (ref ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
}

export function codificarBBreve(r: Pick<BBreveDatos, "items" | "S1" | "S2" | "ref">) {
  const ref = limpiarRef(r.ref);
  return `B16-${r.items.join("")}-${r.S1}${r.S2}${ref ? `-${ref}` : ""}`;
}

/**
 * Decodifica un código corto. Devuelve null si no cumple exactamente el
 * formato (no se calcula nada con entradas inválidas, Anexo D.6).
 */
export function decodificarBBreve(texto: string): BBreveDatos | null {
  const m = (texto ?? "").trim().match(B_BREVE_CODIGO_RE);
  if (!m) return null;
  return {
    items: m[1].split("").map(Number),
    S1: Number(m[2]) as 0 | 1,
    S2: Number(m[3]) as 0 | 1,
    ref: (m[4] ?? "").toUpperCase(),
  };
}

/**
 * Valida una respuesta completa (JSON del Anexo C.1) sin corregir valores:
 * un 4 o un ítem faltante es error, no se "ajusta" a 3 o 0.
 */
export function validarBBreve(datos: unknown): { ok: true; datos: BBreveDatos } | { ok: false; error: string } {
  if (!datos || typeof datos !== "object") return { ok: false, error: "Las respuestas no son válidas." };
  const d = datos as Record<string, unknown>;
  if (!Array.isArray(d.items) || d.items.length !== 16 || !d.items.every(esItem)) {
    return { ok: false, error: "Faltan respuestas o hay valores fuera de la escala 0–3." };
  }
  if (!esBit(d.S1) || !esBit(d.S2)) return { ok: false, error: "Faltan las preguntas S1 o S2." };
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max) : "");
  return {
    ok: true,
    datos: {
      v: 1,
      instrumento: "B-Breve",
      items: [...(d.items as number[])],
      S1: d.S1,
      S2: d.S2,
      ref: limpiarRef(texto("ref", 40)),
      nombre: texto("nombre", 120).trim(),
      relacion: texto("relacion", 60).trim(),
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
      abierta: texto("abierta", 4000).trim(),
      extra: texto("extra", 4000).trim(),
      enviado: texto("enviado", 40),
    },
  };
}

/** Acepta un código corto o el JSON descargado. */
export function leerBBreve(texto: string): BBreveDatos | null {
  const t = (texto ?? "").trim();
  if (t.startsWith("{")) {
    try {
      const r = validarBBreve(JSON.parse(t));
      return r.ok ? r.datos : null;
    } catch {
      return null;
    }
  }
  return decodificarBBreve(t);
}

/** Avance parcial del formulario (guardado automático). Todo puede estar vacío. */
export type BBreveBorrador = {
  nombre: string;
  relacion: string;
  fecha: string;
  items: (number | null)[];
  S1: 0 | 1 | null;
  S2: 0 | 1 | null;
  abierta: string;
  extra: string;
};

/** Limpia un borrador recibido: valores fuera de escala quedan vacíos (no se inventan respuestas). */
export function limpiarBorradorBBreve(datos: unknown): BBreveBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max) : "");
  const items = Array.from({ length: 16 }, (_, i) => {
    const v = Array.isArray(d.items) ? (d.items as unknown[])[i] : null;
    return esItem(v) ? v : null;
  });
  return {
    nombre: texto("nombre", 120),
    relacion: texto("relacion", 60),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
    items,
    S1: esBit(d.S1) ? d.S1 : null,
    S2: esBit(d.S2) ? d.S2 : null,
    abierta: texto("abierta", 4000),
    extra: texto("extra", 4000),
  };
}

/** Preguntas obligatorias respondidas en un borrador (16 ítems + S1 + S2 = 18). */
export function avanceBBreve(b: Pick<BBreveBorrador, "items" | "S1" | "S2">) {
  const respondidas = b.items.filter((v) => v !== null).length + (b.S1 !== null ? 1 : 0) + (b.S2 !== null ? 1 : 0);
  return { respondidas, total: 18 };
}
