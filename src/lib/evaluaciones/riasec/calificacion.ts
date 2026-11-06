/**
 * Test vocacional RIASEC: calificación. SOLO panel del psicólogo (no importar
 * desde el formulario).
 *
 * - Puntuación por tipo: suma de sus 6 ítems (0–24).
 * - Código Holland: los 3 tipos más altos; los empates (diferencia ≤ 1 punto)
 *   se informan con códigos alternativos.
 * - Diferenciación: tipo más alto − tipo más bajo (perfil claro o plano).
 * - Consistencia: distancia en el hexágono entre las dos primeras letras
 *   (R-I-A-S-E-C en círculo): vecinas = alta, alternas = media, opuestas = baja.
 * - Estilo de respuesta: todas iguales, perfil plano bajo o alto.
 *
 * Instrumento orientativo sin baremos: los niveles son descriptivos del rango
 * de la escala, no percentiles poblacionales.
 */
import { RIASEC_ITEMS, TIPOS_RIASEC, type TipoRiasec } from "./escalas";

export type RiasecDatos = { items: number[]; edad?: number | null; carreras?: string; estudios?: string };

export const RIASEC_INFO: Record<
  TipoRiasec,
  { nombre: string; corto: string; descripcion: string; ambientes: string; carreras: string[] }
> = {
  R: {
    nombre: "Realista",
    corto: "Hacer",
    descripcion:
      "Disfruta las actividades prácticas y concretas: trabajar con las manos, herramientas, máquinas, plantas o animales, y ver resultados tangibles.",
    ambientes: "Talleres, campo, construcción, laboratorios técnicos, industria y trabajo al aire libre.",
    carreras: [
      "Ingeniería civil, mecánica, eléctrica o industrial",
      "Agronomía y ciencias agrícolas o forestales",
      "Arquitectura (énfasis técnico) y dibujo técnico",
      "Técnico en electrónica, mecatrónica o mantenimiento",
      "Medicina veterinaria y zootecnia",
      "Gastronomía y artes culinarias",
      "Educación física y deporte",
    ],
  },
  I: {
    nombre: "Investigador",
    corto: "Pensar",
    descripcion:
      "Disfruta observar, analizar y resolver problemas complejos; le motiva entender cómo y por qué funcionan las cosas.",
    ambientes: "Laboratorios, centros de investigación, hospitales, universidades y áreas de tecnología.",
    carreras: [
      "Medicina y ciencias de la salud",
      "Biología, química, química farmacéutica y bioquímica",
      "Ingeniería en sistemas, ciencia de datos y computación",
      "Física y matemáticas",
      "Psicología (investigación y evaluación)",
      "Economía y estadística",
      "Ciencias ambientales",
    ],
  },
  A: {
    nombre: "Artístico",
    corto: "Crear",
    descripcion:
      "Disfruta expresarse, imaginar y crear; prefiere actividades libres y originales a las muy estructuradas.",
    ambientes: "Estudios de diseño, medios de comunicación, escenarios, agencias creativas y trabajo independiente.",
    carreras: [
      "Diseño gráfico, industrial, de interiores o de modas",
      "Arquitectura (énfasis en diseño)",
      "Música, artes escénicas y danza",
      "Artes plásticas y visuales",
      "Comunicación, periodismo y producción audiovisual",
      "Letras, escritura creativa y traducción",
      "Fotografía, animación y diseño digital",
    ],
  },
  S: {
    nombre: "Social",
    corto: "Ayudar",
    descripcion:
      "Disfruta ayudar, enseñar, orientar y cuidar a otras personas; se le facilita comunicarse y trabajar en equipo.",
    ambientes: "Centros educativos, servicios de salud, organizaciones comunitarias y de desarrollo social.",
    carreras: [
      "Psicología clínica, educativa o social",
      "Educación y pedagogía",
      "Trabajo social",
      "Enfermería y terapia (física, ocupacional, del lenguaje)",
      "Medicina (atención directa) y nutrición",
      "Orientación y consejería",
      "Ministerio, voluntariado y desarrollo comunitario",
    ],
  },
  E: {
    nombre: "Emprendedor",
    corto: "Liderar",
    descripcion:
      "Disfruta liderar, convencer, tomar decisiones y asumir retos para lograr metas; le atraen los ambientes dinámicos.",
    ambientes: "Empresas, negocios propios, ventas, política, derecho y organizaciones con metas y competencia.",
    carreras: [
      "Administración de empresas y emprendimiento",
      "Mercadeo, publicidad y ventas",
      "Derecho (ciencias jurídicas y sociales)",
      "Ciencias políticas y relaciones internacionales",
      "Turismo y hotelería",
      "Gerencia de proyectos y negocios internacionales",
      "Comunicación corporativa y relaciones públicas",
    ],
  },
  C: {
    nombre: "Convencional",
    corto: "Organizar",
    descripcion:
      "Disfruta organizar, ordenar información y seguir procedimientos claros; se le facilitan los datos, los números y el detalle.",
    ambientes: "Oficinas, bancos, contabilidad, administración pública, logística y gestión de información.",
    carreras: [
      "Contaduría pública y auditoría",
      "Administración y finanzas",
      "Banca y seguros",
      "Logística y cadena de suministro",
      "Administración pública",
      "Gestión de la información, archivística y bibliotecología",
      "Asistencia administrativa y gerencial",
    ],
  },
};

export type NivelRiasec = { k: "bajo" | "medio" | "alto" | "muyalto"; label: string };
export function nivelRiasec(suma: number): NivelRiasec {
  if (suma <= 8) return { k: "bajo", label: "Bajo" };
  if (suma <= 15) return { k: "medio", label: "Medio" };
  if (suma <= 20) return { k: "alto", label: "Alto" };
  return { k: "muyalto", label: "Muy alto" };
}

const DIST_HEX = (a: TipoRiasec, b: TipoRiasec) => {
  const d = Math.abs(TIPOS_RIASEC.indexOf(a) - TIPOS_RIASEC.indexOf(b));
  return Math.min(d, 6 - d);
};

export type CalificacionRiasec = {
  tipos: { tipo: TipoRiasec; nombre: string; suma: number; pct: number; nivel: NivelRiasec }[];
  /** Ordenados de mayor a menor (desempate: orden del hexágono). */
  orden: TipoRiasec[];
  codigo: string;
  alternativos: string[];
  diferenciacion: { valor: number; lectura: string; k: "alta" | "moderada" | "baja" };
  consistencia: { k: "alta" | "media" | "baja"; lectura: string };
  total: number;
  flags: { lvl: "alert" | "warn" | ""; t: string }[];
};

/** Todas las combinaciones de 3 letras compatibles con empates de ≤ 1 punto. */
function codigosAlternativos(sumas: Record<TipoRiasec, number>, orden: TipoRiasec[]) {
  const top3min = sumas[orden[2]];
  const candidatos = orden.filter((t) => sumas[t] >= top3min - 1);
  if (candidatos.length <= 3 && orden.slice(0, 3).every((t, i, arr) => i === 0 || sumas[arr[i - 1]] - sumas[t] > 1)) return [];
  const res = new Set<string>();
  const permutar = (resto: TipoRiasec[], actual: TipoRiasec[]) => {
    if (actual.length === 3) {
      // Válido si respeta el orden salvo entre tipos empatados (≤ 1 punto)
      const ok = actual.every((t, i) => i === 0 || sumas[actual[i - 1]] >= sumas[t] - 1);
      const minAct = Math.min(...actual.map((t) => sumas[t]));
      const excluidosMayores = candidatos.filter((t) => !actual.includes(t) && sumas[t] > minAct + 1);
      if (ok && excluidosMayores.length === 0) res.add(actual.join(""));
      return;
    }
    for (const t of resto) permutar(resto.filter((x) => x !== t), [...actual, t]);
  };
  permutar(candidatos, []);
  const principal = orden.slice(0, 3).join("");
  res.delete(principal);
  return [...res].slice(0, 6);
}

export function calificarRiasec(d: RiasecDatos): CalificacionRiasec {
  const sumas = {} as Record<TipoRiasec, number>;
  TIPOS_RIASEC.forEach((t, k) => {
    sumas[t] = d.items.slice(k * 6, k * 6 + 6).reduce((s, v) => s + v, 0);
  });
  const tipos = TIPOS_RIASEC.map((t) => ({
    tipo: t,
    nombre: RIASEC_INFO[t].nombre,
    suma: sumas[t],
    pct: Math.round((sumas[t] / 24) * 100),
    nivel: nivelRiasec(sumas[t]),
  }));
  const orden = [...TIPOS_RIASEC].sort((a, b) => sumas[b] - sumas[a] || TIPOS_RIASEC.indexOf(a) - TIPOS_RIASEC.indexOf(b));
  const codigo = orden.slice(0, 3).join("");
  const total = d.items.reduce((s, v) => s + v, 0);

  const dif = sumas[orden[0]] - sumas[orden[5]];
  const diferenciacion =
    dif >= 12
      ? { valor: dif, k: "alta" as const, lectura: "Perfil bien diferenciado: los intereses principales destacan con claridad." }
      : dif >= 6
        ? { valor: dif, k: "moderada" as const, lectura: "Diferenciación moderada: hay preferencias, pero varios tipos compiten." }
        : { valor: dif, k: "baja" as const, lectura: "Perfil plano: los intereses están poco definidos; conviene explorar en entrevista antes de orientar." };

  const dist = DIST_HEX(orden[0], orden[1]);
  const consistencia =
    dist === 1
      ? { k: "alta" as const, lectura: `${orden[0]} y ${orden[1]} son vecinos en el hexágono: intereses coherentes entre sí.` }
      : dist === 2
        ? { k: "media" as const, lectura: `${orden[0]} y ${orden[1]} están separados por un tipo: combinación posible y frecuente.` }
        : {
            k: "baja" as const,
            lectura: `${orden[0]} y ${orden[1]} son opuestos en el hexágono: intereses poco relacionados; explorar cómo se integran (o si uno es más genuino que el otro).`,
          };

  const flags: CalificacionRiasec["flags"] = [];
  if (d.items.every((v) => v === d.items[0]))
    flags.push({ lvl: "alert", t: `Todas las respuestas son iguales (${d.items[0]}): posible respuesta automática; el perfil no es interpretable sin entrevista.` });
  if (total <= 36)
    flags.push({
      lvl: "warn",
      t: "Perfil plano bajo (promedio ≤ 1): pocos intereses expresados. Explorar indecisión, falta de exposición a opciones, desmotivación o síntomas depresivos (anhedonia).",
    });
  if (total >= 119)
    flags.push({ lvl: "warn", t: "Perfil plano alto (promedio ≥ 3,3): tendencia a responder «sí» a todo o entusiasmo general; el orden de los tipos es menos fiable." });
  if (diferenciacion.k === "baja" && total > 36 && total < 119) flags.push({ lvl: "warn", t: diferenciacion.lectura });
  if (consistencia.k === "baja") flags.push({ lvl: "", t: `Consistencia baja: ${consistencia.lectura}` });
  const alternativos = codigosAlternativos(sumas, orden);
  if (alternativos.length) flags.push({ lvl: "", t: `Hay empates (≤ 1 punto) en los tipos principales; códigos alternativos: ${alternativos.join(", ")}.` });
  if (d.edad && d.edad < 14)
    flags.push({ lvl: "warn", t: `Edad ${d.edad}: los intereses aún se están formando; usar el perfil para explorar, no para decidir.` });
  if (d.carreras && d.carreras.trim())
    flags.push({ lvl: "", t: `Intereses expresados por la persona: «${d.carreras.trim().slice(0, 300)}». Compararlos con el código medido (${codigo}).` });

  return { tipos, orden, codigo, alternativos, diferenciacion, consistencia, total, flags };
}

/** Seguimiento entre dos aplicaciones. */
export function seguimientoRiasec(actual: RiasecDatos, anterior: RiasecDatos) {
  const a = calificarRiasec(actual);
  const p = calificarRiasec(anterior);
  return {
    filas: a.tipos.map((t, i) => ({ tipo: t.tipo, nombre: t.nombre, antes: p.tipos[i].suma, ahora: t.suma, cambio: t.suma - p.tipos[i].suma })),
    codigoAntes: p.codigo,
    codigoAhora: a.codigo,
  };
}

export const RIASEC_AVISO =
  "Inventario orientativo de intereses basado en el modelo RIASEC de J. L. Holland. Los ítems no son de un instrumento estandarizado ni tienen baremos para esta población: los niveles describen el rango de la escala, no percentiles. Mide intereses, no aptitudes ni rendimiento; la orientación vocacional debe integrar entrevista, historia académica, aptitudes, valores, contexto familiar y económico, y oferta educativa disponible.";

export { RIASEC_ITEMS };
