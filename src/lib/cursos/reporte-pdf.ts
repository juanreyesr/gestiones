import type { jsPDF } from "jspdf";
import type { CalificacionDeCursoRow } from "./actividades";
import type { ActividadConSemanaRow, AsistenciaConSemanaRow } from "./types";
import type { EstudianteEventoRow, EstudianteRow, SemanaRow } from "./types";
import { TIPO_ACTIVIDAD_LABELS, TIPO_EVENTO_LABELS, formatearFechaHora } from "./types";

const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const ACCENT: [number, number, number] = [16, 130, 100];
const GRID: [number, number, number] = [226, 232, 240];

const ASISTENCIA_CODIGO: Record<string, string> = {
  sin_marcar: "—",
  presente: "P",
  ausente: "A",
  excusa: "E",
  tarde: "T",
};

export type ReporteCursoData = {
  universidadNombre: string;
  cursoNombre: string;
  periodo: string | null;
  semanas: SemanaRow[];
  estudiantes: EstudianteRow[];
  eventos: EstudianteEventoRow[];
  asistencias: AsistenciaConSemanaRow[];
  actividades: ActividadConSemanaRow[];
  calificaciones: CalificacionDeCursoRow[];
};

class PdfWriter {
  doc: jsPDF;
  y: number;
  contentWidth: number;

  constructor(doc: jsPDF) {
    this.doc = doc;
    this.y = MARGIN;
    this.contentWidth = this.doc.internal.pageSize.getWidth() - MARGIN * 2;
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  heading(label: string, size = 13) {
    this.ensureSpace(size + 12);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...ACCENT);
    this.doc.text(label, MARGIN, this.y);
    this.y += 5;
    this.doc.setDrawColor(...GRID);
    this.doc.line(MARGIN, this.y, MARGIN + this.contentWidth, this.y);
    this.y += 12;
  }

  text(label: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; x?: number } = {}) {
    const size = opts.size ?? 9;
    this.ensureSpace(size + 5);
    this.doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(opts.color ?? INK));
    this.doc.text(label, opts.x ?? MARGIN, this.y);
    this.y += size + 5;
  }

  paragraph(label: string, size = 9) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    const lines: string[] = this.doc.splitTextToSize(label, this.contentWidth);
    this.doc.setTextColor(...INK);
    for (const line of lines) {
      this.ensureSpace(size + 3);
      this.doc.text(line, MARGIN, this.y);
      this.y += size + 3;
    }
  }

  row(cols: Array<{ text: string; x: number; bold?: boolean; color?: [number, number, number] }>, size = 8.5) {
    this.ensureSpace(size + 4);
    this.doc.setFontSize(size);
    for (const col of cols) {
      this.doc.setFont("helvetica", col.bold ? "bold" : "normal");
      this.doc.setTextColor(...(col.color ?? INK));
      this.doc.text(col.text, MARGIN + col.x, this.y);
    }
    this.y += size + 4;
  }

  spacer(amount = 6) {
    this.y += amount;
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}

function calcularPorcentajeAsistencia(estado: string | undefined): number | null {
  if (!estado || estado === "sin_marcar") return null;
  if (estado === "presente" || estado === "tarde") return 1;
  return 0;
}

export async function exportReporteCursoPdf(data: ReporteCursoData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = new PdfWriter(doc);

  const activos = data.estudiantes.filter((e) => e.estado === "activo");
  const retirados = data.estudiantes.filter((e) => e.estado === "retirado");

  // ---------- Portada / encabezado ----------
  w.text(data.universidadNombre, { size: 12, color: MUTED });
  w.text(data.cursoNombre, { size: 20, bold: true });
  w.text(`Periodo: ${data.periodo || "—"}`, { size: 10 });
  w.text(`Reporte generado el ${formatearFechaHora(new Date().toISOString())}`, { size: 9, color: MUTED });
  w.spacer(10);

  w.heading("Resumen general");
  w.text(`Semanas registradas: ${data.semanas.length}`, { size: 10 });
  w.text(`Estudiantes activos: ${activos.length}`, { size: 10 });
  w.text(`Estudiantes retirados: ${retirados.length}`, { size: 10 });
  const porcentajesValidos = data.asistencias
    .map((a) => calcularPorcentajeAsistencia(a.estado))
    .filter((v): v is number => v !== null);
  const asistenciaGlobal = porcentajesValidos.length
    ? Math.round((porcentajesValidos.reduce((a, b) => a + b, 0) / porcentajesValidos.length) * 100)
    : 0;
  w.text(`Asistencia global: ${asistenciaGlobal}%`, { size: 10 });
  w.spacer(8);

  // ---------- Historial de estudiantes ----------
  w.heading("Historial de estudiantes");
  if (!data.estudiantes.length) {
    w.text("Sin estudiantes registrados.", { size: 9, color: MUTED });
  } else {
    w.row(
      [
        { text: "Nombre", x: 0, bold: true },
        { text: "Asignado", x: 200, bold: true },
        { text: "Retirado", x: 300, bold: true },
      ],
      9,
    );
    for (const estudiante of data.estudiantes) {
      w.row([
        { text: estudiante.nombre, x: 0 },
        { text: formatearFechaHora(estudiante.asignado_en), x: 200 },
        { text: estudiante.retirado_en ? formatearFechaHora(estudiante.retirado_en) : "—", x: 300 },
      ]);
    }
  }
  w.spacer(6);

  if (data.eventos.length) {
    w.text("Eventos:", { size: 9, bold: true });
    const estudiantesPorId = new Map(data.estudiantes.map((e) => [e.id, e.nombre]));
    for (const evento of data.eventos) {
      const nombre = estudiantesPorId.get(evento.estudiante_id) ?? "Estudiante";
      const nota = evento.nota ? ` — ${evento.nota}` : "";
      w.text(`•  ${formatearFechaHora(evento.ocurrido_en)} · ${nombre} · ${TIPO_EVENTO_LABELS[evento.tipo]}${nota}`, {
        size: 8.5,
        color: MUTED,
      });
    }
  }
  w.spacer(10);

  // ---------- Asistencia ----------
  w.heading("Asistencia");
  if (!data.semanas.length || !data.estudiantes.length) {
    w.text("Sin datos de asistencia para mostrar.", { size: 9, color: MUTED });
  } else {
    const nombreColWidth = 140;
    const semanaColWidth = 16;
    const semanasPorBloque = Math.max(1, Math.floor((w.contentWidth - nombreColWidth) / semanaColWidth));
    const asistenciaPorClave = new Map<string, string>();
    for (const asistencia of data.asistencias) {
      asistenciaPorClave.set(`${asistencia.semana_id}:${asistencia.estudiante_id}`, asistencia.estado);
    }

    for (let inicio = 0; inicio < data.semanas.length; inicio += semanasPorBloque) {
      const bloque = data.semanas.slice(inicio, inicio + semanasPorBloque);
      w.row(
        [
          { text: "Estudiante", x: 0, bold: true },
          ...bloque.map((semana, index) => ({
            text: `S${semana.numero}`,
            x: nombreColWidth + index * semanaColWidth,
            bold: true,
          })),
        ],
        7.5,
      );
      for (const estudiante of activos) {
        w.row(
          [
            { text: estudiante.nombre, x: 0 },
            ...bloque.map((semana, index) => ({
              text: ASISTENCIA_CODIGO[asistenciaPorClave.get(`${semana.id}:${estudiante.id}`) ?? "sin_marcar"],
              x: nombreColWidth + index * semanaColWidth,
            })),
          ],
          7.5,
        );
      }
      w.spacer(4);
    }

    w.text("P = Presente · A = Ausente · E = Ausente con excusa · T = Llegó tarde · — = Sin marcar", {
      size: 8,
      color: MUTED,
    });
    w.spacer(6);

    w.text("Porcentaje de asistencia por estudiante:", { size: 9, bold: true });
    for (const estudiante of activos) {
      const registros = data.asistencias.filter((a) => a.estudiante_id === estudiante.id);
      const validos = registros.map((r) => calcularPorcentajeAsistencia(r.estado)).filter((v): v is number => v !== null);
      const porcentaje = validos.length ? Math.round((validos.reduce((a, b) => a + b, 0) / validos.length) * 100) : 0;
      w.text(`•  ${estudiante.nombre}: ${porcentaje}%`, { size: 8.5 });
    }
    w.spacer(4);

    const notas = data.asistencias.filter((a) => a.nota && a.nota.trim());
    if (notas.length) {
      w.text("Notas de asistencia relevantes:", { size: 9, bold: true });
      const semanasPorId = new Map(data.semanas.map((s) => [s.id, s.numero]));
      const estudiantesPorId = new Map(data.estudiantes.map((e) => [e.id, e.nombre]));
      for (const nota of notas) {
        const semanaNumero = semanasPorId.get(nota.semana_id) ?? "?";
        const nombre = estudiantesPorId.get(nota.estudiante_id) ?? "Estudiante";
        w.text(`•  Semana ${semanaNumero} · ${nombre}: ${nota.nota}`, { size: 8.5, color: MUTED });
      }
    }
  }
  w.spacer(10);

  // ---------- Actividades y calificaciones ----------
  w.heading("Actividades y calificaciones");
  if (!data.actividades.length) {
    w.text("Sin actividades registradas.", { size: 9, color: MUTED });
  } else {
    const semanasPorId = new Map(data.semanas.map((s) => [s.id, s.numero]));
    const estudiantesActivosPorId = new Map(activos.map((e) => [e.id, e.nombre]));
    const calificacionesPorActividad = new Map<string, CalificacionDeCursoRow[]>();
    for (const calificacion of data.calificaciones) {
      const lista = calificacionesPorActividad.get(calificacion.actividad_id) ?? [];
      lista.push(calificacion);
      calificacionesPorActividad.set(calificacion.actividad_id, lista);
    }

    const actividadesOrdenadas = [...data.actividades].sort((a, b) => {
      const numeroA = a.gestionesjj_curso_semanas?.numero ?? 0;
      const numeroB = b.gestionesjj_curso_semanas?.numero ?? 0;
      return numeroA - numeroB;
    });

    for (const actividad of actividadesOrdenadas) {
      const numeroSemana = actividad.gestionesjj_curso_semanas?.numero ?? semanasPorId.get(actividad.semana_id) ?? "?";
      const punteoLabel = actividad.punteo !== null && actividad.punteo !== undefined ? ` (${actividad.punteo} pts)` : "";
      w.text(`Semana ${numeroSemana} · ${TIPO_ACTIVIDAD_LABELS[actividad.tipo]}: ${actividad.titulo}${punteoLabel}`, {
        size: 9.5,
        bold: true,
      });

      const calificaciones = calificacionesPorActividad.get(actividad.id) ?? [];
      if (!calificaciones.length) {
        w.text("Sin calificaciones registradas.", { size: 8.5, color: MUTED, x: 10 });
      } else {
        for (const calificacion of calificaciones) {
          const nombre = estudiantesActivosPorId.get(calificacion.estudiante_id);
          if (!nombre) continue;
          const notaLabel = calificacion.nota !== null && calificacion.nota !== undefined ? `${calificacion.nota}` : "—";
          const entregadoLabel = calificacion.entregado ? "Entregado" : "No entregado";
          const comentario = calificacion.comentario ? ` — ${calificacion.comentario}` : "";
          w.row([
            { text: nombre, x: 10 },
            { text: entregadoLabel, x: 180 },
            { text: `Nota: ${notaLabel}`, x: 250 },
            { text: comentario, x: 320 },
          ]);
        }
      }
      w.spacer(6);
    }
  }

  const nombreArchivo = `reporte-curso-${data.cursoNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  w.save(nombreArchivo);
}
