/**
 * EAPI: formato de datos (Anexo C), validación estricta y borrador del
 * guardado automático. Sin imports en tiempo de ejecución.
 *
 * El código corto AEI1-… ya no se usa en la aplicación (el avance se guarda
 * solo); se conserva por compatibilidad con el Anexo C y sus casos de prueba.
 */

/** Módulos de la batería. La pregunta de seguridad se aplica siempre. */
export type ModuloEapi = "gad" | "dass" | "ptq" | "docs";
export const MODULOS_EAPI: readonly ModuloEapi[] = ["gad", "dass", "ptq", "docs"];

/** Tamaño y escala de cada módulo, y minutos aproximados para responderlo. */
export const FORMA_MODULOS: Record<ModuloEapi, { items: number; max: number; minutos: number; sigla: string }> = {
  gad: { items: 7, max: 3, minutos: 2, sigla: "GAD-7" },
  dass: { items: 21, max: 3, minutos: 4, sigla: "DASS-21" },
  ptq: { items: 15, max: 4, minutos: 3, sigla: "PTQ" },
  docs: { items: 20, max: 4, minutos: 6, sigla: "DOCS" },
};

/**
 * Módulos asignados a un enlace. Formato actual: { modulos: [...] }.
 * Compatibilidad: { docs: true } (enlaces anteriores) = batería completa con DOCS.
 */
export function modulosDeOpciones(opciones: unknown): ModuloEapi[] {
  const o = (opciones && typeof opciones === "object" ? opciones : {}) as { modulos?: unknown; docs?: unknown };
  if (Array.isArray(o.modulos)) {
    const lista = MODULOS_EAPI.filter((m) => (o.modulos as unknown[]).includes(m));
    if (lista.length) return lista;
  }
  return o.docs === true ? ["gad", "dass", "ptq", "docs"] : ["gad", "dass", "ptq"];
}

/** Preguntas obligatorias: las de cada módulo + la pregunta de seguridad. */
export const preguntasEapi = (modulos: readonly ModuloEapi[]) => modulos.reduce((n, m) => n + FORMA_MODULOS[m].items, 0) + 1;
export const minutosEapi = (modulos: readonly ModuloEapi[]) => modulos.reduce((n, m) => n + FORMA_MODULOS[m].minutos, 0) + 1;

export type EapiRespuesta = {
  v: 1;
  instrumento: "AEI";
  modulos: string[];
  gad: number[] | null;
  dass: number[] | null;
  ptq: number[] | null;
  docs: number[] | null;
  safety: number;
  func: number | null;
  ref: string;
  nombre: string;
  edad: number | null;
  fecha: string;
  abierta: string;
  enviado: string;
};

const enRango = (max: number) => (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const lista = (v: unknown, largo: number, max: number): v is number[] => Array.isArray(v) && v.length === largo && v.every(enRango(max));

/** Valida una respuesta completa sin corregir valores (un 5 o un faltante es error). */
export function validarEapi(
  datos: unknown,
  modulos: readonly ModuloEapi[]
): { ok: true; datos: EapiRespuesta } | { ok: false; error: string } {
  if (!datos || typeof datos !== "object") return { ok: false, error: "Las respuestas no son válidas." };
  const d = datos as Record<string, unknown>;
  const listas: Record<ModuloEapi, number[] | null> = { gad: null, dass: null, ptq: null, docs: null };
  for (const m of modulos) {
    const v = d[m];
    if (!lista(v, FORMA_MODULOS[m].items, FORMA_MODULOS[m].max)) return { ok: false, error: "Faltan respuestas o hay valores fuera de la escala." };
    listas[m] = [...v];
  }
  if (!enRango(3)(d.safety)) return { ok: false, error: "Falta la última pregunta." };
  if (d.func !== null && d.func !== undefined && !enRango(3)(d.func)) return { ok: false, error: "Respuesta no válida." };
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max).trim() : "");
  const edad = typeof d.edad === "number" && Number.isInteger(d.edad) && d.edad >= 5 && d.edad <= 110 ? d.edad : null;
  return {
    ok: true,
    datos: {
      v: 1,
      instrumento: "AEI",
      modulos: modulos.map((m) => FORMA_MODULOS[m].sigla),
      ...listas,
      safety: d.safety,
      func: listas.gad && d.func !== null && d.func !== undefined ? (d.func as number) : null,
      ref: texto("ref", 40).replace(/[^A-Za-z0-9]/g, "").slice(0, 12),
      nombre: texto("nombre", 120),
      edad,
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
      abierta: texto("abierta", 4000),
      enviado: texto("enviado", 40),
    },
  };
}

/** Código corto (Anexo C.2). */
export function codificarEapi(
  r: { gad: number[]; dass: number[]; ptq: number[] } & Pick<EapiRespuesta, "safety" | "func" | "docs" | "ref">
) {
  let s = `AEI1-G${r.gad.join("")}-D${r.dass.join("")}-P${r.ptq.join("")}-S${r.safety}`;
  if (r.func != null) s += `-F${r.func}`;
  if (r.docs) s += `-O${r.docs.join("")}`;
  const ref = (r.ref || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  if (ref) s += `-R${ref}`;
  return s;
}

/**
 * Decodifica el código corto. G, D, P y S obligatorios; F, O y R opcionales
 * (un segmento opcional mal formado se ignora). Devuelve null si falta o es
 * inválido un segmento obligatorio.
 */
export function decodificarEapi(texto: string) {
  const partes = (texto ?? "").trim().toUpperCase().split("-");
  if (partes[0] !== "AEI1") return null;
  const out: { gad?: number[]; dass?: number[]; ptq?: number[]; safety?: number; func?: number | null; docs?: number[] | null; ref?: string } = {};
  for (const p of partes.slice(1)) {
    const k = p[0];
    const v = p.slice(1);
    if (k === "G" && /^[0-3]{7}$/.test(v)) out.gad = v.split("").map(Number);
    else if (k === "D" && /^[0-3]{21}$/.test(v)) out.dass = v.split("").map(Number);
    else if (k === "P" && /^[0-4]{15}$/.test(v)) out.ptq = v.split("").map(Number);
    else if (k === "S" && /^[0-3]$/.test(v)) out.safety = Number(v);
    else if (k === "F" && /^[0-3]$/.test(v)) out.func = Number(v);
    else if (k === "O" && /^[0-4]{20}$/.test(v)) out.docs = v.split("").map(Number);
    else if (k === "R" && /^[A-Z0-9]{1,12}$/.test(v)) out.ref = v;
  }
  if (!out.gad || !out.dass || !out.ptq || out.safety === undefined) return null;
  return { gad: out.gad, dass: out.dass, ptq: out.ptq, safety: out.safety, func: out.func ?? null, docs: out.docs ?? null, ref: out.ref ?? "" };
}

/** Avance parcial (guardado automático). Cada respuesta puede estar vacía (null). */
export type EapiBorrador = {
  nombre: string;
  edad: string;
  fecha: string;
  gad: (number | null)[];
  func: number | null;
  dass: (number | null)[];
  ptq: (number | null)[];
  docs: (number | null)[];
  safety: number | null;
  abierta: string;
};

export function limpiarBorradorEapi(datos: unknown): EapiBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max) : "");
  const arr = (k: string, largo: number, max: number) =>
    Array.from({ length: largo }, (_, i) => {
      const v = Array.isArray(d[k]) ? (d[k] as unknown[])[i] : null;
      return enRango(max)(v) ? v : null;
    });
  return {
    nombre: texto("nombre", 120),
    edad: texto("edad", 3).replace(/\D/g, ""),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
    gad: arr("gad", 7, 3),
    func: enRango(3)(d.func) ? d.func : null,
    dass: arr("dass", 21, 3),
    ptq: arr("ptq", 15, 4),
    docs: arr("docs", 20, 4),
    safety: enRango(3)(d.safety) ? d.safety : null,
    abierta: texto("abierta", 4000),
  };
}

/** Preguntas obligatorias respondidas según los módulos asignados (batería completa: 44, o 64 con DOCS). */
export function avanceEapi(b: EapiBorrador, modulos: readonly ModuloEapi[]) {
  const n = (a: (number | null)[]) => a.filter((v) => v !== null).length;
  const respondidas = modulos.reduce((t, m) => t + n(b[m]), 0) + (b.safety !== null ? 1 : 0);
  return { respondidas, total: preguntasEapi(modulos) };
}
