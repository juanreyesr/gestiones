import { jsPDF } from "jspdf";
import type { ReporteData } from "@/components/reporte-printable";
import type { EvaluacionRow } from "@/lib/evaluacion-helpers";

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

export function exportInformeDocenteToPdf(
  input: {
    docenteNombre: string;
    rows: EvaluacionRow[];
    porAnio: Array<{ anio: number; count: number; promedio: number }>;
    promedioHistorico: number;
    promedioEntrevistas: number;
  },
  filename: string,
) {
  const { docenteNombre, rows, porAnio, promedioHistorico, promedioEntrevistas } = input;
  const w = new PdfWriter();

  w.text("Informe de docente", { size: 20, bold: true });
  w.text("M. A. Juan J. Reyes - Coordinación académica", { size: 11, color: MUTED });
  w.spacer(12);
  w.text(`Docente: ${docenteNombre}`, { size: 12, bold: true });
  w.spacer(6);

  w.heading("Resumen histórico");
  w.text(`Evaluaciones registradas: ${rows.length}`, { size: 10 });
  w.text(`Promedio histórico: ${promedioHistorico}%`, { size: 10 });
  w.text(`Entrevistas promedio: ${promedioEntrevistas}%`, { size: 10 });
  w.spacer(6);

  w.heading("Rendimiento por año");
  for (const item of porAnio) {
    w.text(`${item.anio}  (${item.count} evaluaciones)   ${item.promedio}%`, { size: 10 });
    w.bar(item.promedio, 7);
  }

  w.heading("Detalle de evaluaciones");
  for (const row of rows) {
    w.text(`${row.curso_nombre}   T${row.trimestre} ${row.anio}   ${row.fecha_observacion}   ${row.porcentaje}%`, {
      size: 10,
    });
  }

  w.save(filename);
}
