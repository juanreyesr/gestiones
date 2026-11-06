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
