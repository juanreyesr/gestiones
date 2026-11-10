/**
 * Evolución explicada (reglas fijas, sin IA): para cada escala con dos o más
 * aplicaciones compara la última con la anterior PREGUNTA POR PREGUNTA y
 * dice, en lenguaje sencillo, qué mejoró o empeoró y qué respuestas
 * explican el cambio (las que más bajaron o subieron).
 *
 * - Panel del psicólogo: todas las preguntas (las sensibles van marcadas).
 * - Informe del paciente: nunca cita preguntas sensibles (ítem 9 del PHQ-9,
 *   ítems 10 y 21 del DASS-21: desesperanza) ni hipótesis o puntajes, salvo
 *   que el psicólogo elija mostrar puntuaciones.
 */
import { B_BREVE_ITEMS } from "./b-breve/contenido";
import { validarBBreve } from "./b-breve/codigo";
import { DASS_SUB, type Tendencia } from "./eapi/calificacion";
import { MODULOS_EAPI, validarEapi } from "./eapi/codigo";
import { DASS21, DOCS, GAD7, PTQ } from "./eapi/escalas";
import type { EvaluacionRespuestaRow } from "./evaluaciones";
import { CAMBIO_FIABLE, evolucionDelPaciente, type BandaSerie, type SerieEvolucion } from "./evolucion-paciente";
import type { InformePaciente, OpcionesInforme, ResultadoPaciente } from "./informe-paciente";
import { MCEA_CRISIS, INS } from "./mcea/contenido";
import { datosMceaGuardados } from "./mcea/codigo";
import { A } from "./mcea/motor";

export type NivelSimple = "bajo" | "intermedio" | "alto";
export type Pregunta = { n: number; texto: string; antes: number; ahora: number; sensible: boolean };
export type CambioArea = {
  id: string;
  sigla: string;
  /** Nombre sencillo del área (p. ej. «Preocupación y ansiedad»). */
  area: string;
  max: number;
  tendencia: Tendencia;
  /** El cambio supera la variación normal de una vez a otra (cambio fiable) o pasa a otro nivel. */
  claro: boolean;
  /** Supera el cambio mínimo fiable de la escala (solo escalas que lo tienen). */
  fiable: boolean;
  antes: { valor: number; banda: string; nivel: NivelSimple; fecha: string };
  ahora: { valor: number; banda: string; nivel: NivelSimple; fecha: string };
  /** Preguntas que bajaron (menos molestias), de mayor a menor cambio. */
  bajaron: Pregunta[];
  /** Preguntas que subieron (más molestias), de mayor a menor cambio. */
  subieron: Pregunta[];
};

/** Nombres sencillos de cada escala. */
export const AREA_SENCILLA: Record<string, string> = {
  phq9: "Ánimo",
  "dass-dep": "Tristeza y desgano",
  gad: "Preocupación y ansiedad",
  "dass-anx": "Tensión y palpitaciones",
  "dass-str": "Estrés y ansiedad",
  ptq: "Pensamientos que vuelven",
  docs: "Pensamientos o rituales repetitivos",
  "b-breve": "Entorno en casa",
};

const NIVEL_K: Record<BandaSerie["k"], NivelSimple> = { low: "bajo", mid: "intermedio", high: "alto" };
const nivelDe = (bandas: BandaSerie[], v: number) => {
  const b = bandas.find((x) => v <= x.hasta) ?? bandas[bandas.length - 1];
  return { banda: b.etiqueta, nivel: NIVEL_K[b.k] };
};

const datosEapi = (r: EvaluacionRespuestaRow) => {
  const d = (r.datos ?? {}) as Record<string, unknown>;
  const modulos = MODULOS_EAPI.filter((m) => Array.isArray(d[m]));
  const v = modulos.length ? validarEapi(r.datos, modulos) : null;
  return v?.ok ? v.datos : null;
};

type Respuesta = { n: number; texto: string; valor: number; sensible: boolean };

/** Respuestas a las preguntas de una escala en una aplicación (null si no se pueden leer). */
export function preguntasDe(serie: string, r: EvaluacionRespuestaRow): Respuesta[] | null {
  if (r.instrumento === "eapi") {
    const d = datosEapi(r);
    if (!d) return null;
    if (serie === "gad" && d.gad) return d.gad.slice(0, 7).map((v, i) => ({ n: i + 1, texto: GAD7[i], valor: v, sensible: false }));
    if (serie.startsWith("dass-") && d.dass) {
      const sub = DASS_SUB[serie.slice(5) as keyof typeof DASS_SUB];
      return sub.items.map((n) => ({ n, texto: DASS21[n - 1], valor: d.dass![n - 1], sensible: n === 10 || n === 21 }));
    }
    if (serie === "ptq" && d.ptq) return d.ptq.map((v, i) => ({ n: i + 1, texto: PTQ[i], valor: v, sensible: false }));
    if (serie === "docs" && d.docs)
      return d.docs.map((v, i) => {
        const c = DOCS[Math.floor(i / 5)];
        return { n: i + 1, texto: `${c.short}: ${c.q[i % 5].t}`, valor: v, sensible: false };
      });
    return null;
  }
  if (r.instrumento === "mcea") {
    const d = datosMceaGuardados(r.datos);
    if (!d) return null;
    const mod = serie === "phq9" ? "PHQ9" : serie === "gad" ? "GAD7" : serie === "ptq" ? "PTQ" : null;
    if (!mod) return null;
    const out: Respuesta[] = [];
    INS[mod].items.forEach((texto, i) => {
      const v = A(d, `${mod}_${i + 1}`);
      if (typeof v === "number") out.push({ n: i + 1, texto, valor: v, sensible: mod === "PHQ9" && i === 8 });
    });
    return out.length ? out : null;
  }
  if (r.instrumento === "b-breve" && serie === "b-breve") {
    const v = validarBBreve(r.datos);
    if (!v.ok) return null;
    return v.datos.items.map((x, i) => ({ n: i + 1, texto: B_BREVE_ITEMS[i]?.texto ?? `Pregunta ${i + 1}`, valor: x, sensible: false }));
  }
  return null;
}

/** Cambio de cada escala entre sus dos últimas aplicaciones, con las preguntas que lo explican. */
export function cambiosRecientes(respuestas: EvaluacionRespuestaRow[], series?: SerieEvolucion[]): CambioArea[] {
  const porId = new Map(respuestas.map((r) => [r.id, r]));
  const out: CambioArea[] = [];
  for (const s of series ?? evolucionDelPaciente(respuestas).series) {
    if (s.puntos.length < 2 || !s.tendencia) continue;
    const [pa, pb] = s.puntos.slice(-2);
    const ra = porId.get(pa.respuestaId);
    const rb = porId.get(pb.respuestaId);
    const qa = ra ? preguntasDe(s.id, ra) : null;
    const qb = rb ? preguntasDe(s.id, rb) : null;
    const preguntas: Pregunta[] = [];
    if (qa && qb) {
      const previas = new Map(qa.map((q) => [q.n, q.valor]));
      for (const q of qb) {
        const antes = previas.get(q.n);
        if (antes !== undefined && antes !== q.valor) preguntas.push({ n: q.n, texto: q.texto, antes, ahora: q.valor, sensible: q.sensible });
      }
    }
    const delta = (p: Pregunta) => p.ahora - p.antes;
    const minimo = CAMBIO_FIABLE[s.id];
    const fiable = minimo ? Math.abs(pb.valor - pa.valor) >= minimo : false;
    const na = nivelDe(s.bandas, pa.valor);
    const nb = nivelDe(s.bandas, pb.valor);
    out.push({
      id: s.id,
      sigla: s.sigla,
      area: AREA_SENCILLA[s.id] ?? s.nombre,
      max: s.max,
      tendencia: s.tendencia,
      fiable,
      claro: fiable || na.banda !== nb.banda,
      antes: { valor: pa.valor, ...na, fecha: pa.fecha },
      ahora: { valor: pb.valor, ...nb, fecha: pb.fecha },
      bajaron: preguntas.filter((p) => delta(p) < 0).sort((a, b) => delta(a) - delta(b)),
      subieron: preguntas.filter((p) => delta(p) > 0).sort((a, b) => delta(b) - delta(a)),
    });
  }
  // Primero los cambios claros y los más grandes en proporción a la escala.
  return out.sort((a, b) => Number(b.claro) - Number(a.claro) || Math.abs(b.ahora.valor - b.antes.valor) / b.max - Math.abs(a.ahora.valor - a.antes.valor) / a.max);
}

export const agruparCambios = (cambios: CambioArea[]) => ({
  mejoras: cambios.filter((c) => c.tendencia === "mejora"),
  empeoran: cambios.filter((c) => c.tendencia === "empeora"),
  iguales: cambios.filter((c) => c.tendencia === "igual"),
});

/** Texto de una pregunta sin el punto final. */
const corto = (t: string) => t.replace(/[.\s]+$/, "");

/** Frase del cambio de puntaje para el psicólogo («bajó de 14 a 8: de moderada a leve»). */
export function fraseCambio(c: CambioArea) {
  const verbo = c.ahora.valor < c.antes.valor ? "Bajó" : c.ahora.valor > c.antes.valor ? "Subió" : "Se mantuvo";
  const nivel = c.antes.banda !== c.ahora.banda ? `: de ${c.antes.banda.toLowerCase()} a ${c.ahora.banda.toLowerCase()}` : ` (sigue en ${c.ahora.banda.toLowerCase()})`;
  const extra =
    c.tendencia === "igual"
      ? ""
      : c.fiable
        ? ". Es un cambio claro: mayor que la variación normal de una vez a otra"
        : c.claro
          ? ". Pasó a otro nivel"
          : ". Cambio pequeño: puede ser variación normal";
  return `${verbo} de ${c.antes.valor} a ${c.ahora.valor} (de ${c.max})${nivel}${extra}.`;
}

/** Preguntas que explican el cambio, para el psicólogo: «texto» (antes → ahora). */
export function motivos(c: CambioArea, cuantas = 3, paraPaciente = false) {
  const sel = (l: Pregunta[]) => (paraPaciente ? l.filter((p) => !p.sensible) : l).slice(0, cuantas);
  return { bajaron: sel(c.bajaron), subieron: sel(c.subieron) };
}

export const respuestaTexto = (p: Pregunta) => `«${corto(p.texto)}» (${p.antes} → ${p.ahora})`;

// ============================================================
// Informe de avance para el paciente
// ============================================================

export const AREAS_INFORME_AVANCE = [
  { id: "mejoras", nombre: "Lo que mejoró" },
  { id: "empeoran", nombre: "Áreas para prestar especial atención en la próxima sesión" },
  { id: "iguales", nombre: "Lo que se mantiene parecido" },
];

export function opcionesPorDefectoAvance(cambios: CambioArea[]): OpcionesInforme {
  const hayAumentoClaro = cambios.some((c) => c.tendencia === "empeora" && c.claro);
  return { incluir: { mejoras: true, empeoran: true, iguales: true }, mostrarPuntuaciones: false, incluirAyuda: hayAumentoClaro };
}

const NIVEL_PACIENTE: Record<NivelSimple, string> = { bajo: "bajo", intermedio: "intermedio", alto: "alto" };
const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const fechaMedia = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" });
};
const vinetas = (l: string[]) => l.map((x) => `• ${x}`).join("\n");
/** Pregunta para el paciente; con puntuaciones, también su respuesta antes y ahora. */
const preguntaPaciente = (p: Pregunta, conValores: boolean) =>
  conValores ? `${corto(p.texto)} (antes ${p.antes}, ahora ${p.ahora})` : corto(p.texto);

function tarjeta(c: CambioArea, opciones: OpcionesInforme): ResultadoPaciente {
  const m = motivos(c, 3, true);
  const pts = opciones.mostrarPuntuaciones;
  const periodo = `Del ${fechaMedia(c.antes.fecha)} al ${fechaMedia(c.ahora.fecha)}`;
  const nivel = c.antes.nivel !== c.ahora.nivel ? `de nivel ${NIVEL_PACIENTE[c.antes.nivel]} a ${NIVEL_PACIENTE[c.ahora.nivel]}` : `sigue en nivel ${NIVEL_PACIENTE[c.ahora.nivel]}`;
  const puntuacion = pts ? `${c.antes.valor} → ${c.ahora.valor} de ${c.max}` : undefined;
  if (c.tendencia === "mejora") {
    const partes = [
      `Sus molestias en esta área bajaron (${nivel}).${c.claro ? " Es un cambio claro, mayor que la variación normal de un día a otro." : ""}`,
      m.bajaron.length ? `Lo que más mejoró:\n${vinetas(m.bajaron.map((p) => preguntaPaciente(p, pts)))}` : "",
      m.subieron.length ? `Algo que todavía subió un poco:\n${vinetas(m.subieron.slice(0, 2).map((p) => preguntaPaciente(p, pts)))}` : "",
      "Vale la pena reconocer lo que ha hecho para lograrlo y seguir haciéndolo.",
    ];
    return { area: c.area, periodo, nivel: "Mejoró", tono: "bien", texto: partes.filter(Boolean).join("\n\n"), puntuacion };
  }
  if (c.tendencia === "empeora") {
    const partes = [
      `En esta área notamos más molestias que la vez anterior (${nivel}), así que le prestaremos especial atención en nuestra próxima sesión.`,
      m.subieron.length ? `En qué lo notamos:\n${vinetas(m.subieron.map((p) => preguntaPaciente(p, pts)))}` : "",
      m.bajaron.length ? `Y algo que sí mejoró:\n${vinetas(m.bajaron.slice(0, 2).map((p) => preguntaPaciente(p, pts)))}` : "",
      "Esto no significa que el proceso no funcione: a veces pasan cosas que nos afectan. Conversarlo nos ayuda a entender qué pasó y a ajustar el plan.",
    ];
    return { area: c.area, periodo, nivel: "Para prestar atención", tono: "atencion", texto: partes.filter(Boolean).join("\n\n"), puntuacion };
  }
  return {
    area: c.area,
    periodo,
    nivel: "Se mantiene",
    tono: "leve",
    texto: `Se mantiene parecido (${nivel}). Que algo se mantenga no significa que no esté avanzando: algunos cambios tardan más en notarse.`,
    puntuacion,
  };
}

/** Informe de avance para el paciente: primero lo que mejoró, luego lo que aumentó y al final lo que se mantiene. */
export function informeAvancePaciente(
  cambios: CambioArea[],
  opciones: OpcionesInforme,
  extra: { paciente: string; notas: string; profesional: string }
): InformePaciente {
  const g = agruparCambios(cambios);
  const incl = (id: string) => opciones.incluir[id] !== false;
  const resultados = [...(incl("mejoras") ? g.mejoras : []), ...(incl("empeoran") ? g.empeoran : []), ...(incl("iguales") ? g.iguales : [])].map((c) => tarjeta(c, opciones));
  const ultima = cambios.map((c) => c.ahora.fecha).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const resumen =
    g.mejoras.length && !g.empeoran.length
      ? `Buenas noticias: mejoró en ${g.mejoras.length === 1 ? "1 área" : `${g.mejoras.length} áreas`} y ninguna aumentó.`
      : g.mejoras.length && g.empeoran.length
        ? `Mejoró en ${g.mejoras.length === 1 ? "1 área" : `${g.mejoras.length} áreas`}, y ${g.empeoran.length === 1 ? "hay 1 área" : `hay ${g.empeoran.length} áreas`} a la que prestaremos especial atención en nuestra próxima sesión.`
        : g.empeoran.length
          ? `Estas son las áreas en las que debemos prestar especial atención en nuestra próxima sesión. Es información valiosa para ajustar lo que hacemos juntos.`
          : "Sus resultados se mantienen parecidos a la vez anterior.";
  return {
    v: 1,
    titulo: "Su avance · Cómo ha cambiado desde su evaluación anterior",
    paciente: extra.paciente,
    fechaAplicacion: ultima,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro: `Comparamos sus respuestas más recientes (${fechaLarga(ultima)}) con las de la vez anterior. ${resumen}${g.mejoras.length && g.empeoran.length ? " Primero le mostramos lo que mejoró y por qué, y después lo que veremos con más atención." : ""}`,
    destacado: g.mejoras.length
      ? { titulo: "Lo que mejoró", texto: g.mejoras.map((c) => c.area).join(" · ") }
      : g.empeoran.length
        ? { titulo: "Para prestar especial atención en nuestra próxima sesión", texto: g.empeoran.map((c) => c.area).join(" · ") }
        : undefined,
    resultados,
    notas: extra.notas.trim(),
    ayuda: opciones.incluirAyuda ? [...MCEA_CRISIS] : null,
    aviso:
      "Este informe compara sus respuestas de un momento con las de otro. No es un diagnóstico: los cambios pequeños de una vez a otra son normales y lo importante es la tendencia. Lo conversaremos juntos en sesión.",
  };
}
