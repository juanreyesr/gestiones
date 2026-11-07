/**
 * Informe para el paciente: estructura que se guarda como COPIA FIJA al
 * publicarlo (gestionesjj_evaluacion_informes.contenido) y que muestra la
 * página pública /informe/<token>. Sin imports de calificación: lo usa
 * también la página pública.
 */

export type TonoResultado = "bien" | "leve" | "atencion" | "alto";

export type ResultadoPaciente = {
  area: string;
  periodo: string;
  nivel: string;
  tono: TonoResultado;
  texto: string;
  /** Solo si el psicólogo decide mostrar puntuaciones. */
  puntuacion?: string;
};

/** Nivel de un área en una aplicación (null si esa vez no se aplicó). */
export type PuntoEvolucion = { nivel: string; tono: TonoResultado; valor?: string };

/** Evolución a lo largo de las aplicaciones (de la más antigua a hoy). */
export type EvolucionPaciente = {
  titulo: string;
  resumen: string;
  /** Fechas cortas de cada aplicación; la última es la actual. */
  fechas: string[];
  areas: { area: string; puntos: (PuntoEvolucion | null)[]; tendencia: "mejora" | "igual" | "empeora"; frase: string }[];
  /** Preguntas que más bajaron (menos molestias). */
  mejoras: string[];
  /** Preguntas que más subieron. */
  atencion: string[];
};

/** Barras horizontales en lenguaje sencillo; valor null = sin resultado. */
export type GraficaPaciente = {
  titulo: string;
  nota?: string;
  /** Valor máximo de la escala (p. ej. 4). */
  max: number;
  /** Etiquetas de la escala, de 0 a max (opcional). */
  escala?: string[];
  barras: { etiqueta: string; valor: number | null; texto: string; destacada?: boolean }[];
};

export type InformePaciente = {
  v: 1;
  titulo: string;
  paciente: string;
  /** Fecha en que respondió (AAAA-MM-DD). */
  fechaAplicacion: string;
  /** Fecha y hora de publicación (ISO). */
  emitido: string;
  profesional: string;
  intro: string;
  /** Recuadro destacado al inicio (p. ej. el código de intereses). */
  destacado?: { titulo: string; texto: string };
  /** Último día en que el enlace del informe es válido (AAAA-MM-DD); después se desactiva. */
  vigenteHasta?: string;
  /** Gráfica de barras (p. ej. interés por área, de mayor a menor). */
  grafica?: GraficaPaciente;
  /** Comparación con evaluaciones anteriores (si el psicólogo la incluye). */
  evolucion?: EvolucionPaciente;
  resultados: ResultadoPaciente[];
  notas: string;
  ayuda: string[] | null;
  aviso: string;
};

/** Opciones que elige el psicólogo antes de enviar el informe. */
export type OpcionesInforme = {
  /** Áreas incluidas (por id del instrumento). */
  incluir: Record<string, boolean>;
  mostrarPuntuaciones: boolean;
  incluirAyuda: boolean;
};

/** Valida lo que llega de la base de datos antes de mostrarlo. */
export function leerInformePaciente(valor: unknown): InformePaciente | null {
  if (!valor || typeof valor !== "object") return null;
  const o = valor as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.resultados)) return null;
  const s = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
  const tonos: TonoResultado[] = ["bien", "leve", "atencion", "alto"];
  return {
    v: 1,
    titulo: s(o.titulo, 200),
    paciente: s(o.paciente, 120),
    fechaAplicacion: s(o.fechaAplicacion, 10),
    emitido: s(o.emitido, 40),
    profesional: s(o.profesional, 120),
    intro: s(o.intro),
    destacado:
      o.destacado && typeof o.destacado === "object"
        ? { titulo: s((o.destacado as Record<string, unknown>).titulo, 200), texto: s((o.destacado as Record<string, unknown>).texto, 1000) }
        : undefined,
    vigenteHasta: typeof o.vigenteHasta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.vigenteHasta) ? o.vigenteHasta : undefined,
    grafica: leerGrafica(o.grafica),
    evolucion: leerEvolucion(o.evolucion),
    resultados: (o.resultados as unknown[])
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .slice(0, 30)
      .map((r) => ({
        area: s(r.area, 120),
        periodo: s(r.periodo, 80),
        nivel: s(r.nivel, 60),
        tono: tonos.includes(r.tono as TonoResultado) ? (r.tono as TonoResultado) : "leve",
        texto: s(r.texto, 4000),
        puntuacion: typeof r.puntuacion === "string" ? s(r.puntuacion, 60) : undefined,
      })),
    notas: s(o.notas, 6000),
    ayuda: Array.isArray(o.ayuda) ? (o.ayuda as unknown[]).map((l) => s(l, 300)).filter(Boolean).slice(0, 8) : null,
    aviso: s(o.aviso, 1000),
  };
}

function leerGrafica(valor: unknown): GraficaPaciente | undefined {
  if (!valor || typeof valor !== "object") return undefined;
  const o = valor as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const max = typeof o.max === "number" && o.max > 0 && o.max <= 1000 ? o.max : 0;
  if (!max || !Array.isArray(o.barras)) return undefined;
  const barras = (o.barras as unknown[])
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .slice(0, 30)
    .map((b) => ({
      etiqueta: s(b.etiqueta, 120),
      valor: typeof b.valor === "number" && Number.isFinite(b.valor) ? Math.min(max, Math.max(0, b.valor)) : null,
      texto: s(b.texto, 40),
      destacada: b.destacada === true,
    }))
    .filter((b) => b.etiqueta);
  if (!barras.length) return undefined;
  return {
    titulo: s(o.titulo, 200),
    nota: typeof o.nota === "string" ? s(o.nota, 400) : undefined,
    max,
    escala: Array.isArray(o.escala) ? (o.escala as unknown[]).map((e) => s(e, 60)).slice(0, 11) : undefined,
    barras,
  };
}

/** true si el informe tiene fecha de vigencia y ya pasó (comparación por fecha local AAAA-MM-DD). */
export function informeVencido(informe: Pick<InformePaciente, "vigenteHasta">, hoy = new Date()) {
  if (!informe.vigenteHasta) return false;
  const h = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  return h > informe.vigenteHasta;
}

/** Fecha AAAA-MM-DD sumando meses (si el día no existe, el último del mes). */
export function sumarMeses(fecha: string, meses: number) {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  const ultimo = new Date(a, m - 1 + meses + 1, 0).getDate();
  const r = new Date(a, m - 1 + meses, Math.min(d, ultimo));
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, "0")}-${String(r.getDate()).padStart(2, "0")}`;
}

function leerEvolucion(valor: unknown): EvolucionPaciente | undefined {
  if (!valor || typeof valor !== "object") return undefined;
  const o = valor as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const tonos: TonoResultado[] = ["bien", "leve", "atencion", "alto"];
  const tendencias = ["mejora", "igual", "empeora"] as const;
  const lista = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => s(x, max)).filter(Boolean).slice(0, n) : []);
  const fechas = lista(o.fechas, 6, 20);
  if (!fechas.length || !Array.isArray(o.areas)) return undefined;
  return {
    titulo: s(o.titulo, 200),
    resumen: s(o.resumen, 1200),
    fechas,
    areas: (o.areas as unknown[])
      .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
      .slice(0, 8)
      .map((a) => ({
        area: s(a.area, 120),
        frase: s(a.frase, 400),
        tendencia: tendencias.includes(a.tendencia as (typeof tendencias)[number]) ? (a.tendencia as (typeof tendencias)[number]) : "igual",
        puntos: (Array.isArray(a.puntos) ? (a.puntos as unknown[]) : []).slice(0, fechas.length).map((p) => {
          if (!p || typeof p !== "object") return null;
          const q = p as Record<string, unknown>;
          return {
            nivel: s(q.nivel, 40),
            tono: tonos.includes(q.tono as TonoResultado) ? (q.tono as TonoResultado) : "leve",
            valor: typeof q.valor === "string" ? s(q.valor, 12) : undefined,
          };
        }),
      })),
    mejoras: lista(o.mejoras, 4, 300),
    atencion: lista(o.atencion, 4, 300),
  };
}
