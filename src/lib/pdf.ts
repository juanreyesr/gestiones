import { jsPDF } from "jspdf";
import type { ReporteData } from "@/components/reporte-printable";
import { CATEGORIA_DESCRIPCIONES } from "@/data/evaluacion";
import type { EvaluacionRow, TendenciaCategoria } from "@/lib/evaluacion-helpers";

const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const TRACK: [number, number, number] = [226, 232, 240];
const FILL: [number, number, number] = [51, 65, 85];

class PdfWriter {
  doc: jsPDF;
  y: number;
  contentWidth: number;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.y = MARGIN;
    this.contentWidth = this.doc.internal.pageSize.getWidth() - MARGIN * 2;
  }

  private ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  heading(label: string, size = 14) {
    this.ensureSpace(size + 14);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...INK);
    this.doc.text(label, MARGIN, this.y);
    this.y += size + 10;
  }

  text(label: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) {
    const size = opts.size ?? 10;
    this.ensureSpace(size + 6);
    this.doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(opts.color ?? INK));
    this.doc.text(label, MARGIN, this.y);
    this.y += size + 6;
  }

  paragraph(label: string, size = 10) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    const lines: string[] = this.doc.splitTextToSize(label, this.contentWidth);
    this.doc.setTextColor(...INK);
    for (const line of lines) {
      this.ensureSpace(size + 4);
      this.doc.text(line, MARGIN, this.y);
      this.y += size + 4;
    }
  }

  bar(percent: number, height = 8) {
    this.ensureSpace(height + 10);
    const width = this.contentWidth;
    this.doc.setFillColor(...TRACK);
    this.doc.rect(MARGIN, this.y, width, height, "F");
    const filled = (Math.max(0, Math.min(100, percent)) / 100) * width;
    if (filled > 0) {
      this.doc.setFillColor(...FILL);
      this.doc.rect(MARGIN, this.y, filled, height, "F");
    }
    this.y += height + 10;
  }

  spacer(amount = 8) {
    this.y += amount;
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}

function writeReporte(w: PdfWriter, data: ReporteData) {
  w.text(`Docente: ${data.docenteNombre}`, { size: 11 });
  w.text(`Curso: ${data.cursoNombre}`, { size: 11 });
  w.text(`Periodo: Trimestre ${data.trimestre}, ${data.anio}`, { size: 11 });
  w.text(`Fecha de observación: ${data.fecha}`, { size: 11 });
  w.spacer(6);

  w.heading("Resultado general");
  w.text(`${data.pct}%`, { size: 26, bold: true });
  w.text(`${data.total}/${data.max} puntos`, { size: 10, color: MUTED });
  w.bar(data.pct);

  w.heading("Análisis por categoría");
  for (const item of data.categoryAnalytics) {
    w.text(`${item.categoria}   ${item.percent}%`, { size: 10 });
    w.bar(item.percent, 7);
  }

  w.heading("Entrevistas estudiantiles");
  for (const item of data.entrevistaStats.porEstudiante) {
    w.text(`Estudiante ${item.estudiante}   ${item.promedio}%`, { size: 10 });
    w.bar(item.promedio, 7);
  }

  if (data.fortalezas.length) {
    w.heading("Fortalezas destacadas");
    for (const item of data.fortalezas) w.text(`•  ${item}`, { size: 10 });
    w.spacer(4);
  }

  w.heading("Áreas de mejora");
  if (data.improvementAreas.length) {
    for (const item of data.improvementAreas) w.text(`•  ${item.categoria}: ${item.texto}`, { size: 10 });
  } else {
    w.text("No se identificaron áreas críticas de mejora.", { size: 10 });
  }

  if (data.observaciones.trim()) {
    w.spacer(4);
    w.heading("Observaciones de clase");
    w.paragraph(data.observaciones);
  }
}

export function exportReporteToPdf(data: ReporteData, filename: string) {
  const w = new PdfWriter();
  w.text("Reporte de evaluación docente", { size: 20, bold: true });
  w.text("M. A. Juan J. Reyes - Coordinación académica", { size: 11, color: MUTED });
  w.spacer(12);
  writeReporte(w, data);
  w.save(filename);
}

function writeTendenciaTabla(w: PdfWriter, tendencia: TendenciaCategoria[]) {
  if (!tendencia.length) {
    w.text("Aun no hay suficiente historial para mostrar una tendencia.", { size: 10 });
    return;
  }
  const periodos = tendencia[0].puntos.map((punto) => punto.periodo);
  w.text(`Periodos: ${periodos.join("  →  ")}`, { size: 9, color: MUTED });
  for (const serie of tendencia) {
    const valores = serie.puntos.map((punto) => `${punto.percent}%`).join("  →  ");
    const primero = serie.puntos[0].percent;
    const ultimo = serie.puntos[serie.puntos.length - 1].percent;
    const delta = ultimo - primero;
    const tendenciaTexto = delta > 0 ? `mejorando +${delta}` : delta < 0 ? `empeorando ${delta}` : "sin cambio";
    w.text(`${serie.categoria}: ${valores}  (${tendenciaTexto})`, { size: 9 });
  }
}

export function exportInformeDocenteToPdf(
  input: {
    docenteNombre: string;
    rows: EvaluacionRow[];
    porAnio: Array<{ anio: number; count: number; promedio: number }>;
    promedioHistorico: number;
    promedioEntrevistas: number;
    sobresalientes: Array<{ label: string; percent: number }>;
    categoriasOportunidad: Array<{ categoria: string; percent: number }>;
    preguntasDestacadas: Array<{ id: number; texto: string; promedio: number | null }>;
    preguntasOportunidad: Array<{ id: number; texto: string; promedio: number | null }>;
    itemAnalytics: Array<{ categoria: string; texto: string; percent: number | null }>;
    tendenciaCategorias: TendenciaCategoria[];
  },
  filename: string,
) {
  const {
    docenteNombre,
    rows,
    porAnio,
    promedioHistorico,
    promedioEntrevistas,
    sobresalientes,
    categoriasOportunidad,
    preguntasDestacadas,
    preguntasOportunidad,
    itemAnalytics,
    tendenciaCategorias,
  } = input;
  const w = new PdfWriter();

  w.text("Informe de docente", { size: 20, bold: true });
  w.text("M. A. Juan J. Reyes - Coordinación académica", { size: 11, color: MUTED });
  w.spacer(12);
  w.text(`Docente: ${docenteNombre}`, { size: 12, bold: true });
  w.spacer(6);
  w.paragraph(
    "Este informe resume tu desempeño segun la observacion de clase realizada por la coordinacion y la percepcion de tus propios estudiantes. A continuacion se detalla que evalua cada area y en cuales existe mayor oportunidad de mejora.",
    9,
  );
  w.spacer(6);

  w.heading("Resumen del período");
  w.text(`Evaluaciones registradas: ${rows.length}`, { size: 10 });
  w.text(`Promedio del período (observación de clase): ${promedioHistorico}%`, { size: 10 });
  w.text(`Promedio de entrevistas (percepción estudiantil): ${promedioEntrevistas}%`, { size: 10 });
  w.spacer(6);

  w.heading("Áreas más sobresalientes");
  if (sobresalientes.length) {
    for (const item of sobresalientes) w.text(`•  ${item.label}   ${item.percent}%`, { size: 10 });
  } else {
    w.text("Sin datos para este periodo.", { size: 10 });
  }
  w.spacer(4);

  w.heading("Áreas de oportunidad");
  w.text("Porcentaje que aún falta por mejorar en cada área (100% ya no requiere mejora y no se incluye).", {
    size: 9,
    color: MUTED,
  });
  w.spacer(2);
  if (categoriasOportunidad.length) {
    for (const item of categoriasOportunidad) {
      w.text(`•  ${item.categoria}  —  ${100 - item.percent}% por mejorar`, { size: 10, bold: true });
      const descripcion = CATEGORIA_DESCRIPCIONES[item.categoria];
      if (descripcion) w.paragraph(descripcion, 9);
      const itemsBajos = itemAnalytics
        .filter((detalle) => detalle.categoria === item.categoria && detalle.percent !== null && detalle.percent < 100)
        .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
        .slice(0, 2);
      for (const detalle of itemsBajos) {
        w.text(`   -  ${detalle.texto} (${detalle.percent}%)`, { size: 9, color: MUTED });
      }
      w.spacer(3);
    }
  } else {
    w.text("Todas las áreas evaluadas están al 100% en este periodo. ¡Felicidades!", { size: 10 });
  }
  w.spacer(4);

  w.heading("Más valorado según estudiantes");
  if (preguntasDestacadas.length) {
    for (const item of preguntasDestacadas) w.text(`•  ${item.texto}   ${item.promedio}%`, { size: 10 });
  } else {
    w.text("Sin entrevistas registradas en este periodo.", { size: 10 });
  }
  w.spacer(4);

  w.heading("A reforzar según estudiantes");
  w.text("Porcentaje que aún falta por mejorar según la percepción de los estudiantes.", { size: 9, color: MUTED });
  w.spacer(2);
  if (preguntasOportunidad.length) {
    for (const item of preguntasOportunidad) w.text(`•  ${item.texto}   ${100 - (item.promedio ?? 0)}% por mejorar`, { size: 10 });
  } else {
    w.text("Los estudiantes calificaron todo con el máximo puntaje en este periodo.", { size: 10 });
  }
  w.spacer(4);

  w.heading("Rendimiento por año");
  for (const item of porAnio) {
    w.text(`${item.anio}  (${item.count} evaluaciones)   ${item.promedio}%`, { size: 10 });
    w.bar(item.promedio, 7);
  }

  w.heading("Tendencia por área");
  writeTendenciaTabla(w, tendenciaCategorias);

  w.heading("Detalle de evaluaciones");
  for (const row of rows) {
    w.text(`${row.curso_nombre}   T${row.trimestre} ${row.anio}   ${row.fecha_observacion}   ${row.porcentaje}%`, {
      size: 10,
    });
  }

  w.save(filename);
}

export function exportResumenGeneralToPdf(
  input: {
    rows: EvaluacionRow[];
    porCurso: Array<{ cursoId: string | null; nombre: string; count: number; promedio: number }>;
    porDocente: Array<{ docenteId: string | null; nombre: string; count: number; promedio: number }>;
    sobresalientes: Array<{ label: string; percent: number }>;
    categoriasOportunidad: Array<{ categoria: string; percent: number }>;
    preguntasDestacadas: Array<{ id: number; texto: string; promedio: number | null }>;
    preguntasOportunidad: Array<{ id: number; texto: string; promedio: number | null }>;
    tendenciaCategorias: TendenciaCategoria[];
    promedioGeneralValor: number;
    promedioEntrevistasValor: number;
    docentesUnicos: number;
  },
  filename: string,
) {
  const {
    rows,
    porCurso,
    porDocente,
    sobresalientes,
    categoriasOportunidad,
    preguntasDestacadas,
    preguntasOportunidad,
    tendenciaCategorias,
    promedioGeneralValor,
    promedioEntrevistasValor,
    docentesUnicos,
  } = input;
  const w = new PdfWriter();

  w.text("Resumen general de evaluaciones docentes", { size: 20, bold: true });
  w.text("M. A. Juan J. Reyes - Coordinación académica", { size: 11, color: MUTED });
  w.text("Incluye todo el historial registrado, sin importar el periodo filtrado en pantalla.", { size: 9, color: MUTED });
  w.spacer(12);

  w.heading("Resumen histórico");
  w.text(`Evaluaciones registradas: ${rows.length}`, { size: 10 });
  w.text(`Docentes evaluados: ${docentesUnicos}`, { size: 10 });
  w.text(`Promedio general (observación de clase): ${promedioGeneralValor}%`, { size: 10 });
  w.text(`Promedio de entrevistas (percepción estudiantil): ${promedioEntrevistasValor}%`, { size: 10 });
  w.spacer(6);

  w.heading("Áreas más sobresalientes (general)");
  if (sobresalientes.length) {
    for (const item of sobresalientes) w.text(`•  ${item.label}   ${item.percent}%`, { size: 10 });
  } else {
    w.text("Sin datos.", { size: 10 });
  }
  w.spacer(4);

  w.heading("Áreas de oportunidad (general)");
  if (categoriasOportunidad.length) {
    for (const item of categoriasOportunidad) w.text(`•  ${item.categoria}   ${100 - item.percent}% por mejorar`, { size: 10 });
  } else {
    w.text("Todas las áreas evaluadas están al 100%.", { size: 10 });
  }
  w.spacer(4);

  w.heading("Más valorado según estudiantes");
  if (preguntasDestacadas.length) {
    for (const item of preguntasDestacadas) w.text(`•  ${item.texto}   ${item.promedio}%`, { size: 10 });
  } else {
    w.text("Sin entrevistas registradas.", { size: 10 });
  }
  w.spacer(4);

  w.heading("A reforzar según estudiantes");
  if (preguntasOportunidad.length) {
    for (const item of preguntasOportunidad) w.text(`•  ${item.texto}   ${100 - (item.promedio ?? 0)}% por mejorar`, { size: 10 });
  } else {
    w.text("Los estudiantes calificaron todo con el máximo puntaje.", { size: 10 });
  }
  w.spacer(6);

  w.heading("Comparativo por curso");
  for (const item of porCurso) {
    w.text(`${item.nombre}  (${item.count} evaluaciones)   ${item.promedio}%`, { size: 10 });
    w.bar(item.promedio, 7);
  }
  w.spacer(4);

  w.heading("Comparativo por docente");
  for (const item of porDocente) {
    w.text(`${item.nombre}  (${item.count} evaluaciones)   ${item.promedio}%`, { size: 10 });
    w.bar(item.promedio, 7);
  }
  w.spacer(4);

  w.heading("Tendencia por área");
  writeTendenciaTabla(w, tendenciaCategorias);

  w.save(filename);
}
