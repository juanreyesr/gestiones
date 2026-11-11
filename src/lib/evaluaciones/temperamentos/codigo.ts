/** Temperamentos: validación estricta y borrador del guardado automático. Sin imports en tiempo de ejecución. */

export const TEMPERAMENTOS_N = 40;

export type TemperamentosRespuesta = {
  v: 1;
  instrumento: "TEMPERAMENTOS";
  /** items[0] = ítem 1 (en el orden de presentación) … items[39] = ítem 40; enteros 0–4. */
  items: number[];
  nombre: string;
  edad: number | null;
  situacion: string;
  abierta: string;
  fecha: string;
  ref: string;
  enviado: string;
};

const enRango = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 4;

export function validarTemperamentos(datos: unknown): { ok: true; datos: TemperamentosRespuesta } | { ok: false; error: string } {
  if (!datos || typeof datos !== "object") return { ok: false, error: "Las respuestas no son válidas." };
  const d = datos as Record<string, unknown>;
  if (!Array.isArray(d.items) || d.items.length !== TEMPERAMENTOS_N || !d.items.every(enRango)) {
    return { ok: false, error: "Faltan respuestas o hay valores fuera de la escala." };
  }
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max).trim() : "");
  const edad = typeof d.edad === "number" && Number.isInteger(d.edad) && d.edad >= 10 && d.edad <= 99 ? d.edad : null;
  return {
    ok: true,
    datos: {
      v: 1,
      instrumento: "TEMPERAMENTOS",
      items: [...(d.items as number[])],
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

export type TemperamentosBorrador = {
  nombre: string;
  edad: string;
  situacion: string;
  abierta: string;
  fecha: string;
  items: (number | null)[];
};

export function limpiarBorradorTemperamentos(datos: unknown): TemperamentosBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max) : "");
  return {
    nombre: texto("nombre", 120),
    edad: texto("edad", 2).replace(/\D/g, ""),
    situacion: texto("situacion", 60),
    abierta: texto("abierta", 2000),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
    items: Array.from({ length: TEMPERAMENTOS_N }, (_, i) => {
      const v = Array.isArray(d.items) ? (d.items as unknown[])[i] : null;
      return enRango(v) ? v : null;
    }),
  };
}

export function avanceTemperamentos(b: TemperamentosBorrador) {
  return { respondidas: b.items.filter((v) => v !== null).length, total: TEMPERAMENTOS_N };
}
