/** Test vocacional RIASEC: validación estricta y borrador del guardado automático. Sin imports. */

export type RiasecRespuesta = {
  v: 1;
  instrumento: "RIASEC";
  /** items[0] = ítem 1 … items[35] = ítem 36; enteros 0–4. */
  items: number[];
  nombre: string;
  edad: number | null;
  estudios: string;
  carreras: string;
  fecha: string;
  ref: string;
  enviado: string;
};

const enRango = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 4;

export function validarRiasec(datos: unknown): { ok: true; datos: RiasecRespuesta } | { ok: false; error: string } {
  if (!datos || typeof datos !== "object") return { ok: false, error: "Las respuestas no son válidas." };
  const d = datos as Record<string, unknown>;
  if (!Array.isArray(d.items) || d.items.length !== 36 || !d.items.every(enRango)) {
    return { ok: false, error: "Faltan respuestas o hay valores fuera de la escala." };
  }
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max).trim() : "");
  const edad = typeof d.edad === "number" && Number.isInteger(d.edad) && d.edad >= 8 && d.edad <= 99 ? d.edad : null;
  return {
    ok: true,
    datos: {
      v: 1,
      instrumento: "RIASEC",
      items: [...(d.items as number[])],
      nombre: texto("nombre", 120),
      edad,
      estudios: texto("estudios", 60),
      carreras: texto("carreras", 2000),
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
      ref: texto("ref", 40).replace(/[^A-Za-z0-9]/g, "").slice(0, 12),
      enviado: texto("enviado", 40),
    },
  };
}

export type RiasecBorrador = { nombre: string; edad: string; estudios: string; carreras: string; fecha: string; items: (number | null)[] };

export function limpiarBorradorRiasec(datos: unknown): RiasecBorrador {
  const d = (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown>;
  const texto = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).slice(0, max) : "");
  return {
    nombre: texto("nombre", 120),
    edad: texto("edad", 2).replace(/\D/g, ""),
    estudios: texto("estudios", 60),
    carreras: texto("carreras", 2000),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha", 10)) ? texto("fecha", 10) : "",
    items: Array.from({ length: 36 }, (_, i) => {
      const v = Array.isArray(d.items) ? (d.items as unknown[])[i] : null;
      return enRango(v) ? v : null;
    }),
  };
}

export function avanceRiasec(b: RiasecBorrador) {
  return { respondidas: b.items.filter((v) => v !== null).length, total: 36 };
}
