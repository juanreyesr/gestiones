/**
 * B-Breve: clave de corrección (Anexo B). SOLO para el panel del psicólogo:
 * nunca importar desde el formulario de los padres.
 *
 * Sin imports en tiempo de ejecución (se prueba con Node en scripts/probar-b-breve.mjs).
 */
import type { BBreveDatos } from "./codigo";

export type AreaId = "estres" | "consuelo" | "adultos" | "rutinas";

export const B_BREVE_AREAS: readonly {
  id: AreaId;
  nombre: string;
  items: readonly number[];
  max: number;
  profundizar: string;
}[] = [
  { id: "estres", nombre: "Estrés y clima familiar", items: [1, 2, 13, 14], max: 12, profundizar: "B1 (ítems 1–8) y B4 (28, 32)" },
  { id: "consuelo", nombre: "Agua como consuelo y hábito", items: [3, 4, 5, 6, 7, 8], max: 18, profundizar: "B2 (ítems 11, 14–19)" },
  { id: "adultos", nombre: "Respuesta de los adultos", items: [9, 10, 11, 12], max: 12, profundizar: "B3 (ítems 22–26)" },
  { id: "rutinas", nombre: "Rutinas y escuela", items: [15, 16], max: 6, profundizar: "B5 (36–38) y B6 (42–43)" },
];

export const B_BREVE_TOTAL_MAX = 48;

export type Banda = { clave: "baja" | "moderada" | "alta"; etiqueta: string; texto: string };

export function bandaBBreve(total: number): Banda {
  if (total <= 11) {
    return {
      clave: "baja",
      etiqueta: "Carga ambiental baja",
      texto: "La entrevista completa se centra en la conducta en sí y en la coordinación médica.",
    };
  }
  if (total <= 23) {
    return {
      clave: "moderada",
      etiqueta: "Carga moderada",
      texto: "Profundizar en las áreas con puntuación igual o superior al 50 % de su máximo.",
    };
  }
  return {
    clave: "alta",
    etiqueta: "Carga alta",
    texto: "Aplicar el Cuestionario B completo íntegramente y a cada cuidador por separado.",
  };
}

export type Senal = { nivel: "alarma" | "regla"; texto: string };

export type AreaPuntuada = {
  id: AreaId;
  nombre: string;
  items: readonly number[];
  max: number;
  profundizar: string;
  suma: number;
  pct: number;
  prioritaria: boolean;
};

export type CalificacionBBreve = {
  areas: AreaPuntuada[];
  total: number;
  pctTotal: number;
  banda: Banda;
  senales: Senal[];
};

const it = (d: BBreveDatos, n: number) => d.items[n - 1];

export function calificarBBreve(d: BBreveDatos): CalificacionBBreve {
  const areas = B_BREVE_AREAS.map((a) => {
    const suma = a.items.reduce((s, n) => s + it(d, n), 0);
    const pct = Math.round((suma / a.max) * 100);
    return { ...a, suma, pct, prioritaria: pct >= 50 };
  });
  const total = d.items.reduce((s, v) => s + v, 0);

  // B.3 señales de alarma (primero) y B.4 reglas por ítem.
  const senales: Senal[] = [];
  if (d.S1 === 1) {
    senales.push({
      nivel: "alarma",
      texto:
        "S1 = Sí (ingesta forzada). Señal de alarma: aplicar el ítem 21 y el bloque B7 del Cuestionario B en la misma sesión; valorar medición de sodio y ruta de protección.",
    });
  }
  if (d.S2 === 1) {
    senales.push({
      nivel: "alarma",
      texto:
        "S2 = Sí (bebe mucho menos fuera de casa). Marcador de que el contexto del hogar mantiene la conducta: aplicar el bloque B7 completo y considerar hipótesis de riesgo relacional.",
    });
  }
  const consuelo = [6, 7, 9].filter((n) => it(d, n) >= 2);
  if (consuelo.length > 0) {
    senales.push({
      nivel: "regla",
      texto: `${consuelo.length > 1 ? "Ítems" : "Ítem"} ${consuelo.join(", ")} con 2 o 3: indicio directo de función de consuelo o reforzamiento inmediato. Candidatos a ser las primeras conductas de los adultos que se modifican en la Fase 4.`,
    });
  }
  if (it(d, 10) >= 2) {
    senales.push({
      nivel: "regla",
      texto: "Ítem 10 con 2 o 3: inconsistencia parental. Trabajar el acuerdo entre cuidadores antes de cualquier técnica con el niño.",
    });
  }
  if (it(d, 2) === 3) {
    senales.push({
      nivel: "regla",
      texto: "Ítem 2 = 3: cuidador en riesgo de agotamiento. Explorar apoyo y derivación propia.",
    });
  }
  if (it(d, 12) >= 2) {
    senales.push({
      nivel: "regla",
      texto:
        "Ítem 12 con 2 o 3: antecedente de restricción brusca fallida. Psicoeducar sobre reducción gradual y verificar el descarte médico antes de volver a limitar el agua.",
    });
  }

  return { areas, total, pctTotal: Math.round((total / B_BREVE_TOTAL_MAX) * 100), banda: bandaBBreve(total), senales };
}

export const B_BREVE_SIN_REGLAS = "Ningún ítem activa reglas específicas.";

export type Discrepancia = { items: number[]; significativa: boolean; lectura: string };

/** B.5: ítems con diferencia ≥ 2 entre dos cuidadores. */
export function discrepanciaBBreve(a: BBreveDatos, b: BBreveDatos): Discrepancia {
  const items: number[] = [];
  for (let i = 0; i < 16; i++) if (Math.abs(a.items[i] - b.items[i]) >= 2) items.push(i + 1);
  const significativa = items.length >= 4;
  return {
    items,
    significativa,
    lectura: significativa
      ? "Inconsistencia parental; se trabaja el acuerdo entre cuidadores antes de cualquier técnica con el niño."
      : "Visión razonablemente compartida del problema.",
  };
}

export type Seguimiento = {
  filas: { id: AreaId; nombre: string; antes: number; ahora: number; cambio: number; max: number }[];
  totalAntes: number;
  totalAhora: number;
  progreso: boolean;
  lectura: string;
};

/** B.6: aplicación actual frente a la anterior del mismo cuidador. */
export function seguimientoBBreve(actual: BBreveDatos, anterior: BBreveDatos): Seguimiento {
  const c = calificarBBreve(actual);
  const p = calificarBBreve(anterior);
  const filas = c.areas.map((a, i) => ({
    id: a.id,
    nombre: a.nombre,
    antes: p.areas[i].suma,
    ahora: a.suma,
    cambio: a.suma - p.areas[i].suma,
    max: a.max,
  }));
  const cambio = (id: AreaId) => filas.find((f) => f.id === id)!.cambio;
  const progreso = cambio("consuelo") <= -6 || cambio("adultos") <= -4;
  return {
    filas,
    totalAntes: p.total,
    totalAhora: c.total,
    progreso,
    lectura: progreso
      ? "Progreso. Confirmar con la disminución de la ingesta en el registro de 72 horas."
      : "Todavía no se alcanza el criterio de progreso. Los ítems 1, 13 y 16 pueden no cambiar aunque el niño mejore.",
  };
}

/** B.7: aviso obligatorio en el informe. */
export const B_BREVE_AVISO_INFORME =
  "Instrumento orientativo sin validación psicométrica ni puntos de corte empíricos. Las puntuaciones organizan la información para la entrevista y la formulación clínica; la interpretación corresponde al psicólogo tratante. Las señales de alarma obligan a actuar con independencia del total.";
