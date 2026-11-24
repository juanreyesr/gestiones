/**
 * Plan terapéutico con IA: catálogo de recursos de la plataforma y tipos.
 * Sin dependencias del navegador (lo usa también la ruta /api/ai/plan).
 */
import { ETAPAS_FICHAS, FICHAS, FICHA_IDS } from "@/lib/evaluaciones/fichas/catalogo";
import { INSTRUMENTOS } from "@/lib/evaluaciones/instrumentos";

/* ------------------------------ catálogo ------------------------------ */

export const INSTRUMENTOS_PLAN = INSTRUMENTOS.filter((i) => i.id !== "ficha");
export const RECURSO_IDS = [...FICHA_IDS, ...INSTRUMENTOS_PLAN.map((i) => i.id)] as const;
export type RecursoId = (typeof RECURSO_IDS)[number];

export const esFichaRecurso = (id: string) => (FICHA_IDS as readonly string[]).includes(id);

/** Nombre legible de un recurso («Ficha 1.1 · Mi motivo…» o el nombre del instrumento). */
export function nombreRecurso(id: string) {
  const f = FICHAS.find((x) => x.id === id);
  if (f) return `Ficha ${f.id} · ${f.titulo}`;
  return INSTRUMENTOS.find((i) => i.id === id)?.nombre.split(" · ")[0] ?? id;
}

/** Texto del catálogo para el prompt (lo arma el servidor). */
export function catalogoParaPrompt() {
  const fichas = FICHAS.map((f) => `- ${f.id} (etapa ${f.etapa}: ${ETAPAS_FICHAS[f.etapa]}) «${f.titulo}»: ${f.paraQue} [${f.tiempo}]`);
  const instrumentos = INSTRUMENTOS_PLAN.map(
    (i) =>
      `- ${i.id} «${i.nombre}» (responde: ${i.responde}${i.edadMinima ? `, desde ${i.edadMinima} años` : ""}): ${i.descripcion.slice(0, 420)}`
  );
  return `FICHAS TERAPÉUTICAS JJR (TCC, el paciente las responde por enlace):\n${fichas.join("\n")}\n\nINSTRUMENTOS DE EVALUACIÓN:\n${instrumentos.join("\n")}`;
}

/* ------------------------------- tipos -------------------------------- */

export type MetaPlan = {
  meta: string;
  indicador: string;
  plazo: string;
  estado: "nueva" | "en_curso" | "lograda" | "estancada";
};

export type RecursoPlan = {
  id: RecursoId;
  para_que: string;
  cuando: "ahora" | "proxima_sesion" | "reevaluacion";
};

export type PlanIA = {
  sintesis: string;
  etapa: number;
  metas: MetaPlan[];
  recursos: RecursoPlan[];
  tareas_semana: string[];
  mensaje_paciente: string;
  foco_proxima_sesion: string;
  alertas: string[];
};

export type ContextoPlan = {
  paciente: {
    edad: number | null;
    esMenor: boolean;
    genero: string | null;
    ocupacion: string | null;
    motivoConsulta: string | null;
    motivoPaciente: string | null;
    antecedentesPsicologicos: string | null;
  };
  metasFicha: { meta: string; avance: string; plazo: string }[];
  sesiones: { fecha: string; tema: string | null; resumen: string | null; seguimiento: string | null }[];
  compromisos: { pendientes: string[]; cumplidos: number; total: number };
  propuestas: { nombre: string; tipo: string; estado: string }[];
  /** Cada serie es de un mismo respondiente (relación o «respondiente N», nunca el nombre). */
  evaluaciones: { instrumento: string; respondiente: string; fecha: string; puntuaciones: string[]; alertas: string[] }[];
  /** Posibles señales de riesgo en el texto libre de fichas respondidas. */
  alertasFichas: { ficha: string; fecha: string; alertas: string[] }[];
  fichas: { id: string; estado: string; fecha: string | null }[];
  enlacesAbiertos: string[];
  enfoque: string;
};
