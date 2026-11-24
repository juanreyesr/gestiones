/**
 * Plan terapéutico con IA: catálogo de recursos de la plataforma, contexto del
 * caso (sin nombre ni contacto del paciente) y llamada a /api/ai/plan.
 * La IA solo puede recomendar recursos que existen aquí (fichas JJR e instrumentos).
 */
import type { EvaluacionRespuestaRow, EvaluacionRow } from "@/lib/evaluaciones/evaluaciones";
import { datosFichaGuardados } from "@/lib/evaluaciones/fichas/codigo";
import { estadosFichas } from "@/lib/evaluaciones/fichas/intervencion";
import { resumenRespuesta } from "@/lib/evaluaciones/resumen-respuesta";
import { getAccessToken } from "./ai-client";
import type { ContextoPlan, PlanIA } from "./plan-ia-catalogo";
import type { CompromisoRow, PacienteRow, SesionRow } from "./types";

export * from "./plan-ia-catalogo";

/* ------------------------------ contexto ------------------------------ */

const corta = (t: string | null | undefined, max: number) => (t ? t.trim().slice(0, max) : null);

function edadDe(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const n = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) e -= 1;
  return e;
}

/** Metas de la ficha 1.1 más reciente (tabla meta / avance / plazo). */
function metasDeFicha(respuestas: EvaluacionRespuestaRow[]) {
  const r = respuestas
    .filter((x) => x.instrumento === "ficha" && (x.datos as { ficha?: unknown } | null)?.ficha === "1.1")
    .sort((a, b) => (b.fecha ?? b.createdAt).localeCompare(a.fecha ?? a.createdAt))[0];
  const d = r ? datosFichaGuardados(r.datos) : null;
  const tabla = d?.respuestas?.metas;
  if (!Array.isArray(tabla)) return [];
  return (tabla as unknown[])
    .filter((f): f is string[] => Array.isArray(f))
    .map(([meta = "", avance = "", plazo = ""]) => ({ meta, avance, plazo }))
    .filter((m) => m.meta.trim());
}

/** Reúne lo que la IA necesita saber del caso. No incluye nombre, teléfono ni correo. */
export function contextoPlan(input: {
  paciente: PacienteRow;
  sesiones: SesionRow[];
  compromisos: CompromisoRow[];
  respuestas: EvaluacionRespuestaRow[];
  evaluaciones: EvaluacionRow[];
  enfoque: string;
}): ContextoPlan {
  const { paciente: p, sesiones, compromisos, respuestas, evaluaciones } = input;
  const finalizadas = sesiones.filter((s) => s.estado === "finalizada");
  const todos = finalizadas.flatMap((s) => s.compromisos);

  // Dos aplicaciones más recientes de cada instrumento (para ver evolución), sin fichas.
  const porInstrumento = new Map<string, EvaluacionRespuestaRow[]>();
  for (const r of [...respuestas].sort((a, b) => (b.fecha ?? b.createdAt).localeCompare(a.fecha ?? a.createdAt))) {
    if (r.instrumento === "ficha") continue;
    const lista = porInstrumento.get(r.instrumento) ?? [];
    if (lista.length < 2) porInstrumento.set(r.instrumento, [...lista, r]);
  }
  const evals = [...porInstrumento.values()].flat().map((r) => {
    const res = resumenRespuesta(r);
    return { instrumento: `${r.instrumento} (${res.instrumento})`, fecha: (r.fecha ?? r.createdAt).slice(0, 10), puntuaciones: res.puntuaciones.slice(0, 12), alertas: res.alertas.slice(0, 6) };
  });

  const enlaces = evaluaciones
    .filter((e) => e.estado === "abierta")
    .map((e) => (e.instrumento === "ficha" ? String((e.opciones as { ficha?: unknown } | null)?.ficha ?? "") : e.instrumento))
    .filter(Boolean);

  return {
    paciente: {
      edad: edadDe(p.fechaNacimiento),
      esMenor: p.esMenor,
      genero: p.genero,
      ocupacion: p.ocupacion,
      motivoConsulta: corta(p.motivoConsulta, 1500),
      motivoPaciente: corta(p.motivoPaciente, 1500),
      antecedentesPsicologicos: corta(p.antecedentesPsicologicos, 800),
    },
    metasFicha: metasDeFicha(respuestas),
    sesiones: finalizadas.slice(0, 6).map((s) => ({
      fecha: s.iniciadaAt.slice(0, 10),
      tema: corta(s.tema, 200),
      resumen: corta(s.resumen, 1500),
      seguimiento: corta(s.seguimiento, 600),
    })),
    compromisos: {
      pendientes: compromisos.filter((c) => !c.cumplido).slice(0, 15).map((c) => `${c.tipo}: ${c.descripcion.slice(0, 200)}`),
      cumplidos: todos.filter((c) => c.cumplido).length,
      total: todos.length,
    },
    propuestas: finalizadas
      .flatMap((s) => s.propuestasIa)
      .slice(0, 20)
      .map((x) => ({ nombre: x.nombre, tipo: x.tipo, estado: x.estado ?? "pendiente" })),
    evaluaciones: evals,
    fichas: estadosFichas(respuestas, [])
      .filter((e) => e.hecha)
      .map((e) => ({ id: e.ficha, estado: e.etiqueta, fecha: e.fecha })),
    enlacesAbiertos: [...new Set(enlaces)],
    enfoque: input.enfoque.trim().slice(0, 600),
  };
}

/* ------------------------------- llamada ------------------------------ */

export async function generarPlanIA(contexto: ContextoPlan) {
  const token = await getAccessToken();
  if (!token) return { data: null as PlanIA | null, noConfigurado: false, error: "Sesión no válida. Vuelve a iniciar." };
  try {
    const response = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(contexto),
    });
    if (response.status === 503) return { data: null as PlanIA | null, noConfigurado: true, error: null };
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { data: null as PlanIA | null, noConfigurado: false, error: body?.error ?? "No se pudo generar el plan." };
    }
    return { data: (await response.json()) as PlanIA, noConfigurado: false, error: null };
  } catch {
    return { data: null as PlanIA | null, noConfigurado: false, error: "Error de conexión al generar el plan." };
  }
}
