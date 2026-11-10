/**
 * Perfil integrado del paciente (reglas fijas, sin IA): reúne el último dato
 * de cada área a partir de TODAS las evaluaciones aplicadas. Si una escala se
 * aplicó en varios instrumentos (GAD-7 y PTQ en EAPI y MCEA) cuenta como una
 * sola serie. Cada dato indica su escala, su fecha y su tendencia, para que
 * se pueda verificar. Solo panel del psicólogo.
 */
import { INS } from "./mcea/contenido";
import { datosMceaGuardados } from "./mcea/codigo";
import { A as respuestaMcea, scoreAll } from "./mcea/motor";
import type { EvaluacionRespuestaRow } from "./evaluaciones";
import { deteriorosFiables, evolucionDelPaciente, type SerieEvolucion } from "./evolucion-paciente";
import { MODULOS_EAPI, validarEapi } from "./eapi/codigo";

export type Nivel = "bajo" | "medio" | "alto";
export type MedidaArea = {
  sigla: string;
  valor: number;
  max: number;
  banda: string;
  nivel: Nivel;
  fecha: string;
  /** Frente a la aplicación anterior de la misma escala. */
  tendencia: "mejora" | "igual" | "empeora" | null;
  deterioroFiable: boolean;
};
export type AreaPerfil = { id: string; nombre: string; principal: MedidaArea; otras: MedidaArea[] };
export type PatronMcea = { nombre: string; nivel: Nivel; etiqueta: string; detalle: string[] };
export type PerfilIntegrado = {
  areas: AreaPerfil[];
  /** Última aplicación del MCEA: patrones cognitivos y recursos. */
  patrones: { fecha: string; items: PatronMcea[] } | null;
  /** Intereses y valores (último resultado de cada instrumento). */
  orientacion: { titulo: string; detalle: string; fecha: string }[];
  /** Pregunta de seguridad marcada en la última aplicación que la incluye. */
  riesgo: { fecha: string; texto: string } | null;
  /** Frase de síntesis por reglas. */
  sintesis: string[];
  /** Fecha más reciente y más antigua de los datos usados. */
  desde: string | null;
  hasta: string | null;
};

/** Áreas clínicas y sus escalas, en orden de preferencia (si hay empate de fecha, la primera). */
const AREAS: { id: string; nombre: string; series: string[] }[] = [
  { id: "animo", nombre: "Ánimo", series: ["phq9", "dass-dep"] },
  { id: "ansiedad", nombre: "Ansiedad", series: ["gad", "dass-anx"] },
  { id: "estres", nombre: "Estrés", series: ["dass-str"] },
  { id: "rumiacion", nombre: "Pensamiento repetitivo (rumiación)", series: ["ptq"] },
  { id: "toc", nombre: "Obsesiones y compulsiones", series: ["docs"] },
  { id: "entorno", nombre: "Entorno familiar (cuidadores)", series: ["b-breve"] },
];

const NIVEL_K: Record<"low" | "mid" | "high", Nivel> = { low: "bajo", mid: "medio", high: "alto" };
const NIVEL_MCEA = (lvl: number): Nivel => (lvl >= 2 ? "alto" : lvl === 1 ? "medio" : "bajo");
const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);
const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
};

function medida(s: SerieEvolucion, fiables: Set<string>): MedidaArea {
  const p = s.puntos[s.puntos.length - 1];
  const i = s.bandas.findIndex((b) => p.valor <= b.hasta);
  const banda = s.bandas[i === -1 ? s.bandas.length - 1 : i];
  return {
    sigla: s.sigla,
    valor: p.valor,
    max: s.max,
    banda: banda.etiqueta,
    nivel: NIVEL_K[banda.k],
    fecha: p.fecha,
    tendencia: s.tendencia,
    deterioroFiable: fiables.has(s.id),
  };
}

export function perfilIntegrado(respuestas: EvaluacionRespuestaRow[]): PerfilIntegrado {
  const { series, hitos } = evolucionDelPaciente(respuestas);
  const fiables = new Set(deteriorosFiables(series).map((d) => d.id));
  const porId = new Map(series.map((s) => [s.id, s]));

  const areas: AreaPerfil[] = [];
  for (const a of AREAS) {
    const medidas = a.series
      .map((id) => porId.get(id))
      .filter((s): s is SerieEvolucion => Boolean(s?.puntos.length))
      .map((s) => medida(s, fiables));
    if (!medidas.length) continue;
    // Principal: la más reciente (empate: orden de preferencia del área).
    const principal = medidas.reduce((m, x) => (x.fecha > m.fecha ? x : m), medidas[0]);
    areas.push({ id: a.id, nombre: a.nombre, principal, otras: medidas.filter((m) => m !== principal) });
  }

  // Patrones del MCEA (última aplicación válida).
  const mceas = respuestas
    .filter((r) => r.instrumento === "mcea")
    .map((r) => ({ r, d: datosMceaGuardados(r.datos) }))
    .filter((x) => x.d)
    .sort((a, b) => (fechaDe(b.r) + b.r.createdAt).localeCompare(fechaDe(a.r) + a.r.createdAt));
  let patrones: PerfilIntegrado["patrones"] = null;
  if (mceas.length) {
    const sc = scoreAll(mceas[0].d!);
    const items: PatronMcea[] = [];
    for (const id of ["PAN", "DC", "AS", "RP", "FR"] as const) {
      const s = sc[id];
      if (!s) continue;
      const detalle = s.subs ? Object.entries(s.subs).filter(([, v]) => v.lvl >= 2).map(([n]) => n) : [];
      if (id === "DC") detalle.push(...Array.from({ length: 10 }, (_, i) => i + 1).filter((i) => (respuestaMcea(mceas[0].d!, `DC_${i}`) ?? 0) >= 3).map((i) => INS.DC.names![i - 1]));
      items.push({ nombre: INS[id].name, nivel: NIVEL_MCEA(s.lvl), etiqueta: s.label, detalle });
    }
    patrones = { fecha: fechaDe(mceas[0].r), items };
  }

  // Intereses y valores: último hito de cada tipo.
  const orientacion: PerfilIntegrado["orientacion"] = [];
  const vistos = new Set<string>();
  for (const h of [...hitos].reverse()) {
    if (vistos.has(h.tipo)) continue;
    vistos.add(h.tipo);
    orientacion.push({ titulo: h.titulo, detalle: h.detalle, fecha: h.fecha });
  }

  // Riesgo: la última respuesta que incluye una pregunta de seguridad.
  let riesgo: PerfilIntegrado["riesgo"] = null;
  const conSeguridad = [...respuestas]
    .filter((r) => r.instrumento === "eapi" || r.instrumento === "mcea")
    .sort((a, b) => (fechaDe(b) + b.createdAt).localeCompare(fechaDe(a) + a.createdAt));
  for (const r of conSeguridad) {
    if (r.instrumento === "mcea") {
      const d = datosMceaGuardados(r.datos);
      if (!d) continue;
      const i9 = respuestaMcea(d, "PHQ9_9") ?? 0;
      riesgo = i9 >= 1 ? { fecha: fechaDe(r), texto: `Ítem 9 del PHQ-9 = ${i9} (pensamientos de muerte o de hacerse daño)` } : null;
      break;
    }
    const dd = (r.datos ?? {}) as Record<string, unknown>;
    const v = validarEapi(r.datos, MODULOS_EAPI.filter((m) => Array.isArray(dd[m])));
    if (!v.ok) continue;
    riesgo = v.datos.safety >= 1 ? { fecha: fechaDe(r), texto: `Pregunta de seguridad del EAPI = ${v.datos.safety}` } : null;
    break;
  }

  // Síntesis por reglas (sin interpretación libre).
  const sintesis: string[] = [];
  const altas = areas.filter((a) => a.principal.nivel === "alto").map((a) => a.nombre.toLowerCase());
  const medias = areas.filter((a) => a.principal.nivel === "medio").map((a) => a.nombre.toLowerCase());
  const mejoran = areas.filter((a) => a.principal.tendencia === "mejora").map((a) => a.nombre.toLowerCase());
  if (mejoran.length) sintesis.push(`Mejoró desde la vez anterior: ${mejoran.join(", ")}.`);
  const det = areas.flatMap((a) => [a.principal, ...a.otras]).filter((m) => m.deterioroFiable).map((m) => m.sigla);
  if (det.length) sintesis.push(`Empeoró claramente (más que la variación normal): ${det.join(", ")}.`);
  if (altas.length) sintesis.push(`Nivel alto en: ${altas.join(", ")}.`);
  if (medias.length) sintesis.push(`Nivel intermedio en: ${medias.join(", ")}.`);
  if (areas.length && !altas.length && !medias.length) sintesis.push("Todas las áreas medidas están en nivel bajo.");
  const patronesAltos = patrones?.items.filter((p) => p.nivel === "alto" && !/Recursos/.test(p.nombre)).map((p) => p.nombre.split(" · ").pop()!.toLowerCase()) ?? [];
  if (patronesAltos.length) sintesis.push(`Formas de pensar más marcadas (MCEA): ${patronesAltos.join(", ")}.`);
  if (riesgo) sintesis.unshift(`⚠️ Marcó la pregunta de seguridad en su última aplicación (${fechaCorta(riesgo.fecha)}): revisar en sesión.`);

  const fechas = [...areas.flatMap((a) => [a.principal, ...a.otras].map((m) => m.fecha)), ...(patrones ? [patrones.fecha] : []), ...orientacion.map((o) => o.fecha)].sort();
  return { areas, patrones, orientacion, riesgo, sintesis, desde: fechas[0] ?? null, hasta: fechas[fechas.length - 1] ?? null };
}
