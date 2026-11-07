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
    evolucion: leerEvolucion(o.evolucion),
    resultados: (o.resultados as unknown[])
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .slice(0, 12)
      .map((r) => ({
        area: s(r.area, 120),
        periodo: s(r.periodo, 80),
        nivel: s(r.nivel, 60),
        tono: tonos.includes(r.tono as TonoResultado) ? (r.tono as TonoResultado) : "leve",
        texto: s(r.texto, 1000),
        puntuacion: typeof r.puntuacion === "string" ? s(r.puntuacion, 60) : undefined,
      })),
    notas: s(o.notas, 6000),
    ayuda: Array.isArray(o.ayuda) ? (o.ayuda as unknown[]).map((l) => s(l, 300)).filter(Boolean).slice(0, 8) : null,
    aviso: s(o.aviso, 1000),
  };
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
