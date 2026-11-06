/** Valores laborales: validación estricta y borrador del guardado automático. Sin imports en tiempo de ejecución. */
import type { ValorId } from "./escalas";

const IDS: readonly ValorId[] = ["logro", "independencia", "reconocimiento", "relaciones", "servicio", "apoyo", "condiciones", "creatividad"];
export const VALORES_N_ITEMS = 24;

export type ValoresRespuesta = {
  v: 1;
  instrumento: "VALORES";
  /** items[0] = ítem 1 … items[23] = ítem 24; enteros 0–4. */
  items: number[];
  /** Los 3 valores elegidos como más importantes, en el orden en que los marcó. */
  elegidos: ValorId[];
  nombre: string;
  edad: number | null;
  situacion: string;
  abierta: string;
  fecha: string;
  ref: string;
  enviado: string;
};

const enRango = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 4;
const esValor = (v: unknown): v is ValorId => typeof v === "string" && (IDS as readonly string[]).includes(v);

export function validarValores(datos: unknown): { ok: true; datos: ValoresRespuesta } | { ok: false; error: string } {
  if (!datos || typeof datos !== "object") return { ok: false, error: "Las respuestas no son válidas." };
  const d = datos as Record<string, unknown>;
  if (!Array.isArray(d.items) || d.items.length !== VALORES_N_ITEMS || !d.items.every(enRango)) {
    return { ok: false, error: "Faltan respuestas o hay valores fuera de la escala." };
  }
  const elegidos = Array.isArray(d.elegidos) ? [...new Set((d.elegidos as unknown[]).filter(esValor))] : [];
  if (elegidos.length !== 3) return { ok: false, error: "Elige los 3 valores más importantes para ti." };
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max).trim() : "");
  const edad = typeof d.edad === "number" && Number.isInteger(d.edad) && d.edad >= 10 && d.edad <= 99 ? d.edad : null;
  return {
    ok: true,
    datos: {
      v: 1,
      instrumento: "VALORES",
      items: [...(d.items as number[])],
      elegidos,
      nombre: texto("nombre", 120),
      edad,
      situacion: texto("situacion", 60),
      abierta: texto("abierta", 2000),
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
      ref: texto("ref", 40).replace(/[^A-Za-z0-9]/g, "").slice(0, 12),
      enviado: texto("enviado", 40),
    },
  };
}

export type ValoresBorrador = {
  nombre: string;
  edad: string;
  situacion: string;
  abierta: string;
  fecha: string;
  items: (number | null)[];
  elegidos: ValorId[];
};

export function limpiarBorradorValores(datos: unknown): ValoresBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max) : "");
  return {
    nombre: texto("nombre", 120),
    edad: texto("edad", 2).replace(/\D/g, ""),
    situacion: texto("situacion", 60),
    abierta: texto("abierta", 2000),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
    items: Array.from({ length: VALORES_N_ITEMS }, (_, i) => {
      const v = Array.isArray(d.items) ? (d.items as unknown[])[i] : null;
      return enRango(v) ? v : null;
    }),
    elegidos: Array.isArray(d.elegidos) ? [...new Set((d.elegidos as unknown[]).filter(esValor))].slice(0, 3) : [],
  };
}

/** 24 afirmaciones + la elección de los 3 valores principales (cuenta como 1 pregunta). */
export function avanceValores(b: ValoresBorrador) {
  return { respondidas: b.items.filter((v) => v !== null).length + (b.elegidos.length === 3 ? 1 : 0), total: VALORES_N_ITEMS + 1 };
}
