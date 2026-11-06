/**
 * Valores laborales: calificación. SOLO panel del psicólogo (no importar desde
 * el formulario).
 *
 * - Puntuación por valor: suma de sus 3 ítems (0–12).
 * - Prioridades medidas: los 3 valores con mayor puntuación; los empates
 *   (diferencia ≤ 1 punto) se informan.
 * - Concordancia: cuántos de los 3 valores ELEGIDOS por la persona están entre
 *   sus prioridades medidas (medida normativa frente a elección forzada).
 * - Estilo de respuesta: todas iguales, «todo es imprescindible», perfil bajo
 *   o plano, e ítems del mismo valor muy dispares.
 *
 * Instrumento orientativo sin baremos: los niveles describen el rango de la
 * escala, no percentiles poblacionales.
 */
import { VALORES_IDS, VALORES_NOMBRES, type ValorId } from "./escalas";

export type ValoresDatos = { items: number[]; elegidos: ValorId[]; edad?: number | null; situacion?: string; abierta?: string };
type TipoRiasec = "R" | "I" | "A" | "S" | "E" | "C";

export const VALORES_INFO: Record<
  ValorId,
  { nombre: string; descripcion: string; buscar: string; preguntas: string[]; riasec: TipoRiasec[]; fuente: string }
> = {
  logro: {
    nombre: "Logro",
    descripcion: "Te motiva usar tus capacidades al máximo y ver resultados concretos de tu esfuerzo.",
    buscar: "Trabajos con metas claras, retos a tu medida y resultados visibles.",
    preguntas: ["¿Cómo se mide el buen desempeño en este puesto?", "¿Qué retos tendría en los primeros meses?"],
    riasec: ["R", "I"],
    fuente: "O*NET (Achievement)",
  },
  independencia: {
    nombre: "Independencia",
    descripcion: "Valoras decidir cómo hacer tu trabajo, organizar tu tiempo y trabajar con autonomía.",
    buscar: "Puestos con autonomía, horarios flexibles, trabajo por proyectos o independiente.",
    preguntas: ["¿Cuánta libertad tendría para organizar mi trabajo?", "¿Cómo es la supervisión en el día a día?"],
    riasec: ["A", "I", "E"],
    fuente: "O*NET (Independence)",
  },
  reconocimiento: {
    nombre: "Reconocimiento",
    descripcion: "Es importante para ti que tu trabajo sea valorado y tener oportunidades de crecer, ascender y liderar.",
    buscar: "Organizaciones con planes de carrera, evaluación del desempeño y posibilidades de liderazgo.",
    preguntas: ["¿Qué posibilidades de ascenso hay?", "¿Cómo se reconoce el buen trabajo?"],
    riasec: ["E"],
    fuente: "O*NET (Recognition)",
  },
  relaciones: {
    nombre: "Relaciones",
    descripcion: "Te importa sentirte parte de un equipo, el buen ambiente y compartir valores con tus compañeros.",
    buscar: "Equipos colaborativos y culturas de trabajo cercanas.",
    preguntas: ["¿Cómo es el trabajo en equipo aquí?", "¿Cómo describirían el ambiente laboral?"],
    riasec: ["S"],
    fuente: "O*NET (Relationships)",
  },
  servicio: {
    nombre: "Servicio a los demás",
    descripcion: "Te motiva ayudar a otras personas y sentir que tu trabajo tiene un propósito para la comunidad.",
    buscar: "Profesiones de ayuda, educación, salud, organizaciones sociales o empresas con impacto social.",
    preguntas: ["¿A quién beneficia directamente este trabajo?", "¿Cómo contribuye la organización a la comunidad?"],
    riasec: ["S"],
    fuente: "Super, WVI (Altruism)",
  },
  apoyo: {
    nombre: "Apoyo",
    descripcion: "Valoras tener jefes justos, recibir capacitación y que la organización respalde a su personal.",
    buscar: "Organizaciones con buena dirección, inducción, formación continua y políticas claras.",
    preguntas: ["¿Qué capacitación ofrecen?", "¿Cómo es la relación con los jefes inmediatos?"],
    riasec: ["C", "S"],
    fuente: "O*NET (Support)",
  },
  condiciones: {
    nombre: "Estabilidad y condiciones",
    descripcion: "Te importan la seguridad del empleo, un buen salario y prestaciones, y el equilibrio con tu vida personal.",
    buscar: "Empleos estables, con contrato, prestaciones y horarios compatibles con tu vida personal.",
    preguntas: ["¿Qué tipo de contrato y prestaciones ofrecen?", "¿Cómo son los horarios y la carga de trabajo?"],
    riasec: ["C", "R"],
    fuente: "O*NET (Working Conditions)",
  },
  creatividad: {
    nombre: "Creatividad y variedad",
    descripcion: "Disfrutas crear, proponer ideas nuevas, hacer actividades distintas y aprender constantemente.",
    buscar: "Trabajos con innovación, proyectos variados y oportunidades de aprendizaje.",
    preguntas: ["¿Qué tan variado es el trabajo de un día a otro?", "¿Hay espacio para proponer ideas nuevas?"],
    riasec: ["A", "I"],
    fuente: "Super, WVI (Creativity / Variety)",
  },
};

export type NivelValor = { k: "bajo" | "medio" | "alto" | "esencial"; label: string };
export function nivelValor(suma: number): NivelValor {
  if (suma <= 5) return { k: "bajo", label: "Poco importante" };
  if (suma <= 8) return { k: "medio", label: "Importante" };
  if (suma <= 10) return { k: "alto", label: "Muy importante" };
  return { k: "esencial", label: "Esencial" };
}

/** Combinaciones de valores que suelen entrar en tensión al elegir un trabajo. */
const TENSIONES: { par: [ValorId, ValorId]; t: string }[] = [
  {
    par: ["independencia", "condiciones"],
    t: "Independencia y Estabilidad: la autonomía (trabajo independiente, emprendimiento) suele implicar menos seguridad; explorar cuál pesa más o cómo combinarlas.",
  },
  {
    par: ["creatividad", "condiciones"],
    t: "Creatividad y Estabilidad: los trabajos muy creativos suelen ser menos estables; explorar opciones que equilibren ambas.",
  },
  {
    par: ["independencia", "apoyo"],
    t: "Independencia y Apoyo: busca autonomía y a la vez guía y respaldo; explorar qué tipo de supervisión le resulta cómoda.",
  },
];

export type CalificacionValores = {
  valores: { id: ValorId; nombre: string; suma: number; pct: number; nivel: NivelValor; rango: number; elegido: boolean }[];
  /** De mayor a menor (desempate: elegido por la persona, luego orden de la lista). */
  orden: ValorId[];
  principales: ValorId[];
  empatados: ValorId[];
  concordancia: { n: number; lectura: string };
  diferenciacion: number;
  media: number;
  flags: { lvl: "alert" | "warn" | ""; t: string }[];
};

export function calificarValores(d: ValoresDatos): CalificacionValores {
  const valores = VALORES_IDS.map((id, k) => {
    const its = d.items.slice(k * 3, k * 3 + 3);
    const suma = its.reduce((s, v) => s + v, 0);
    return {
      id,
      nombre: VALORES_INFO[id].nombre,
      suma,
      pct: Math.round((suma / 12) * 100),
      nivel: nivelValor(suma),
      rango: Math.max(...its) - Math.min(...its),
      elegido: d.elegidos.includes(id),
    };
  });
  const por = Object.fromEntries(valores.map((v) => [v.id, v])) as Record<ValorId, (typeof valores)[number]>;
  const orden = [...VALORES_IDS].sort(
    (a, b) => por[b].suma - por[a].suma || Number(por[b].elegido) - Number(por[a].elegido) || VALORES_IDS.indexOf(a) - VALORES_IDS.indexOf(b)
  );
  const principales = orden.slice(0, 3);
  const corte = por[principales[2]].suma;
  // Valores fuera del top 3 que quedan a ≤ 1 punto del tercero.
  const empatados = orden.slice(3).filter((v) => por[v].suma >= corte - 1);
  const zonaAlta = new Set([...principales, ...empatados]);
  const n = d.elegidos.filter((v) => zonaAlta.has(v)).length;
  const concordancia = {
    n,
    lectura:
      n === 3
        ? "Alta: los 3 valores que eligió coinciden con sus puntuaciones más altas; prioridades claras y coherentes."
        : n === 2
          ? "Buena: 2 de los 3 valores elegidos están entre sus puntuaciones más altas."
          : n === 1
            ? "Baja: solo 1 de los valores elegidos está entre sus puntuaciones más altas; explorar qué entiende por cada valor y qué pesa más al decidir."
            : "Nula: ninguno de los valores elegidos está entre sus puntuaciones más altas. Explorar en entrevista (prioridades poco definidas, deseabilidad social o respuestas al azar).",
  };
  const sumas = valores.map((v) => v.suma);
  const diferenciacion = Math.max(...sumas) - Math.min(...sumas);
  const media = d.items.reduce((s, v) => s + v, 0) / d.items.length;

  const flags: CalificacionValores["flags"] = [];
  if (d.items.every((v) => v === d.items[0]))
    flags.push({ lvl: "alert", t: `Todas las respuestas son iguales (${d.items[0]}): posible respuesta automática; usar solo los 3 valores elegidos y confirmar en entrevista.` });
  else if (media >= 3.5)
    flags.push({
      lvl: "warn",
      t: "«Todo es imprescindible» (promedio ≥ 3,5): dificultad para jerarquizar o deseabilidad social. Los 3 valores elegidos son la referencia principal.",
    });
  else if (media <= 1.25)
    flags.push({
      lvl: "warn",
      t: "Perfil bajo (promedio ≤ 1,25): pocos valores expresados. Explorar indecisión, falta de experiencia laboral, desmotivación o síntomas depresivos (anhedonia).",
    });
  else if (diferenciacion <= 3) flags.push({ lvl: "warn", t: `Perfil plano (diferencia entre el valor más alto y el más bajo = ${diferenciacion}): prioridades poco diferenciadas.` });
  if (n <= 1) flags.push({ lvl: n === 0 ? "warn" : "", t: `Concordancia ${concordancia.lectura}` });
  for (const v of d.elegidos)
    if (orden.indexOf(v) >= 5)
      flags.push({ lvl: "", t: `Eligió «${VALORES_INFO[v].nombre}» entre sus 3 principales, pero lo puntuó entre los más bajos (${por[v].suma}/12).` });
  const dispares = valores.filter((v) => v.rango >= 3);
  if (dispares.length)
    flags.push({
      lvl: "",
      t: `Respuestas dispares dentro de un mismo valor (diferencia ≥ 3 entre sus ítems): ${dispares.map((v) => v.nombre).join(", ")}. Revisar qué aspecto le importa y cuál no.`,
    });
  for (const { par, t } of TENSIONES) if (par.every((v) => principales.includes(v))) flags.push({ lvl: "", t: `Tensión posible entre valores principales. ${t}` });
  if (empatados.length) flags.push({ lvl: "", t: `Empate (≤ 1 punto) con el tercer valor: ${empatados.map((v) => VALORES_INFO[v].nombre).join(", ")}.` });
  if (d.edad && d.edad < 15)
    flags.push({ lvl: "warn", t: `Edad ${d.edad}: los valores laborales aún se están formando y dependen de la experiencia; usar el perfil para conversar, no para decidir.` });
  const orden2 = { alert: 0, warn: 1, "": 2 } as const;
  flags.sort((a, b) => orden2[a.lvl] - orden2[b.lvl]);

  return { valores, orden, principales, empatados, concordancia, diferenciacion, media, flags };
}

/**
 * Integración con el test de intereses (RIASEC): para cada valor principal,
 * qué tipos de intereses suelen asociarse (orientativo) y si están en el código
 * de la persona.
 */
export function integrarRiasec(c: CalificacionValores, codigoRiasec: string) {
  const codigo = codigoRiasec.toUpperCase().slice(0, 3).split("") as TipoRiasec[];
  return c.principales.map((v) => {
    const afines = VALORES_INFO[v].riasec;
    const coinciden = afines.filter((t) => codigo.includes(t));
    return { valor: v, nombre: VALORES_INFO[v].nombre, afines, coinciden };
  });
}

/** Seguimiento entre dos aplicaciones. */
export function seguimientoValores(actual: ValoresDatos, anterior: ValoresDatos) {
  const a = calificarValores(actual);
  const p = calificarValores(anterior);
  return {
    filas: a.valores.map((v, i) => ({ id: v.id, nombre: v.nombre, antes: p.valores[i].suma, ahora: v.suma, cambio: v.suma - p.valores[i].suma })),
    principalesAntes: p.principales,
    principalesAhora: a.principales,
  };
}

export const VALORES_AVISO =
  "Cuestionario orientativo de valores laborales basado en los valores de la Teoría del Ajuste al Trabajo usados por O*NET (Red de Información Ocupacional) y en el Inventario de Valores Laborales de Super (WVI). Redacción propia, sin baremos para esta población: los niveles describen el rango de la escala, no percentiles. La relación entre valores e intereses RIASEC es orientativa. La orientación vocacional debe integrar intereses, aptitudes, valores, historia académica y laboral, contexto familiar y económico, y oferta disponible.";

export { VALORES_NOMBRES };
