/** MCEA: informe para el paciente (lenguaje sencillo, port del original). Solo panel. */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente, TonoResultado } from "../informe-paciente";
import { INS, MCEA_CRISIS, PV } from "./contenido";
import type { MceaDatos } from "./codigo";
import { A, cambioParaPaciente, rng, scoreAll } from "./motor";

export const AREAS_MCEA = [
  { id: "estado", nombre: "Cómo ha estado (ánimo y nervios)" },
  { id: "mente", nombre: "Lo que su mente suele hacer" },
  { id: "formas", nombre: "Formas de pensar que aparecieron" },
  { id: "frenando", nombre: "Lo que puede estar frenándole" },
  { id: "pareja", nombre: "En su relación de pareja" },
  { id: "mapa", nombre: "Su mapa de un momento difícil" },
  { id: "recursos", nombre: "Sus recursos" },
  { id: "avance", nombre: "Lo que ha cambiado (si hay aplicación anterior)" },
];

export function opcionesPorDefectoMcea(): OpcionesInforme {
  return { incluir: Object.fromEntries(AREAS_MCEA.map((a) => [a.id, true])), mostrarPuntuaciones: false, incluirAyuda: true };
}

const TONO: TonoResultado[] = ["bien", "leve", "atencion", "alto"];
const NIVEL_TEXTO = ["Estable", "Leve", "Presente", "Intenso"];
const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const vinetas = (l: string[]) => l.map((x) => `• ${x}`).join("\n");

export function informePacienteMcea(
  datos: MceaDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string; anterior?: { datos: MceaDatos; fecha: string } | null }
): InformePaciente {
  const sc = scoreAll(datos);
  const tr = datos.tr && !("skip" in datos.tr) ? datos.tr : null;
  const incl = (id: string) => opciones.incluir[id] !== false;
  const R: ResultadoPaciente[] = [];

  const animo = [sc.PHQ9 ? PV.PHQ9[sc.PHQ9.lvl] : "", sc.GAD7 ? PV.GAD7[sc.GAD7.lvl] : ""].filter(Boolean);
  const nivelAnimo = Math.max(sc.PHQ9?.lvl ?? 0, sc.GAD7?.lvl ?? 0);
  if (incl("estado"))
    R.push({
      area: "Cómo ha estado",
      periodo: "Últimas 2 semanas",
      nivel: animo.length ? NIVEL_TEXTO[nivelAnimo] : "Sin señales elevadas",
      tono: animo.length ? TONO[nivelAnimo] : "bien",
      texto: animo.length ? animo.join("\n\n") : "En las áreas que revisamos no aparecen señales de malestar elevado.",
      puntuacion: opciones.mostrarPuntuaciones && sc.PHQ9 ? `PHQ-9 ${sc.PHQ9.raw}/27${sc.GAD7 ? ` · GAD-7 ${sc.GAD7.raw}/21` : ""}` : undefined,
    });

  const mente = [sc.PAN ? PV.PAN[sc.PAN.lvl] : "", sc.PTQ ? PV.PTQ[sc.PTQ.lvl] : ""].filter(Boolean);
  if (incl("mente") && mente.length) {
    const lvl = Math.max(sc.PAN?.lvl ?? 0, sc.PTQ?.lvl ?? 0);
    R.push({ area: "Lo que su mente suele hacer", periodo: "Pensamientos y rumiación", nivel: NIVEL_TEXTO[lvl], tono: TONO[lvl], texto: mente.join("\n\n") });
  }

  const dis = new Set(tr?.dis ?? []);
  if (sc.DC) rng(10).forEach((i) => (A(datos, `DC_${i}`) ?? 0) >= 3 && dis.add(INS.DC.names![i - 1]));
  if (incl("formas") && dis.size)
    R.push({
      area: "Formas de pensar que aparecieron",
      periodo: "Todas las personas las usamos a veces",
      nivel: `${dis.size} ${dis.size === 1 ? "forma" : "formas"}`,
      tono: "leve",
      texto: `Reconocerlas es el primer paso para que pierdan fuerza.\n${vinetas([...dis].map((n) => `${n}. ${INS.DC.defs![INS.DC.names!.indexOf(n)]}`))}`,
    });

  for (const [id, area, clave] of [
    ["AS", "Lo que puede estar frenándole", "frenando"],
    ["RP", "En su relación de pareja", "pareja"],
  ] as const) {
    if (!sc[id] || !incl(clave)) continue;
    const pat = INS[id].pat as Record<string, string>;
    const hi = Object.entries(sc[id].subs!).filter((e) => e[1].lvl >= 2);
    if (hi.length)
      R.push({
        area,
        periodo: "Patrones que aparecieron con más fuerza",
        nivel: hi.length === 1 ? "1 patrón" : `${hi.length} patrones`,
        tono: "atencion",
        texto: `${vinetas(hi.map(([n]) => `${n}. ${pat[n]}`))}\n\nEstos patrones se aprenden, casi siempre como una forma de protegerse, y se pueden cambiar.`,
      });
  }

  if (incl("mapa") && tr && (tr.sit || tr.pen))
    R.push({
      area: "Su mapa de un momento difícil",
      periodo: "Lo que pasó, lo que pensó, lo que sintió y lo que hizo",
      nivel: "Para trabajar juntos",
      tono: "leve",
      texto: [
        `Lo que pasó: ${tr.sit || "—"}`,
        `Lo que pensó: ${tr.pen || "—"}${tr.f2 ? ` En el fondo: ${tr.f2}` : ""}`,
        `Lo que sintió: ${tr.emo.join(", ") || "—"}`,
        `Lo que hizo: ${tr.beh.join(", ") || "—"}`,
        "",
        "Entre lo que pasa y lo que sentimos casi siempre hay un pensamiento. Ahí es donde hay margen para trabajar.",
      ].join("\n"),
    });

  if (incl("recursos")) {
    const fz = ["Se tomó el tiempo de responder con sinceridad, y eso ya es un paso."];
    if (sc.FR) rng(4).forEach((i) => (A(datos, `FR_${i}`) ?? 0) >= 3 && fz.push((INS.FR.pat as string[])[i - 1]));
    if (tr?.dis.length) fz.push("Reconoció por su cuenta formas de pensar que le afectan.");
    R.push({ area: "Sus recursos", periodo: "Lo que ya tiene a su favor", nivel: "A su favor", tono: "bien", texto: vinetas(fz) });
  }

  if (incl("avance") && extra.anterior) {
    const G = cambioParaPaciente(extra.anterior.datos, datos);
    const partes = [
      G.m.length ? `Donde hay un cambio claro a su favor:\n${vinetas(G.m)}\nEl cambio en estas áreas es mayor de lo que se explicaría por variaciones normales de un día a otro.` : "",
      G.s.length ? `Lo que se mantiene parecido:\n${vinetas(G.s)}\nQue algo se mantenga no significa que no esté avanzando. Algunos cambios tardan más en reflejarse.` : "",
      G.d.length ? `Lo que seguiremos trabajando:\n${vinetas(G.d)}\nEn estas áreas el malestar aumentó. Lo veremos juntos para entender qué ha pasado y ajustar el plan.` : "",
    ].filter(Boolean);
    if (partes.length)
      R.push({
        area: "Lo que ha cambiado",
        periodo: `Desde el ${fechaLarga(extra.anterior.fecha)}`,
        nivel: G.m.length && !G.d.length ? "Avance" : G.d.length && !G.m.length ? "Para trabajar" : "Mixto",
        tono: G.m.length && !G.d.length ? "bien" : G.d.length && !G.m.length ? "atencion" : "leve",
        texto: partes.join("\n\n"),
      });
  }

  return {
    v: 1,
    titulo: "Su informe personal · Lo que mostraron sus respuestas",
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro: `Este informe refleja cómo estaba usted el ${fechaLarga(extra.fechaAplicacion)}. Describe patrones de un momento, y los patrones cambian.`,
    resultados: R,
    notas: extra.notas.trim(),
    ayuda: opciones.incluirAyuda ? [...MCEA_CRISIS] : null,
    aviso:
      "Qué sigue: este informe es un punto de partida. Lo revisaremos juntos en sesión para decidir en qué trabajar primero. No es un diagnóstico: describe patrones de un momento, y los patrones cambian.",
  };
}
