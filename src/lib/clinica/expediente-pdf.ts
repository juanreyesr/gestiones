import { formatoFechaCorta, formatoFechaLarga, formatoHora } from "./slots";
import type { PacienteRow, SesionRow } from "./types";

const MARGIN = 48;
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [90, 100, 118];
const ACCENT: [number, number, number] = [16, 130, 100];

// jsPDF pesa varios cientos de KB: se carga solo cuando realmente se exporta
// el expediente, en vez de ir en el paquete inicial de la app.
export async function exportarExpedientePdf(paciente: PacienteRow, sesiones: SesionRow[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const contentWidth = width - MARGIN * 2;
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > height - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 6;
    doc.setDrawColor(220, 226, 232);
    doc.line(MARGIN, y, width - MARGIN, y);
    y += 14;
  };

  const field = (label: string, value: string | null) => {
    if (!value) return;
    const lines = doc.splitTextToSize(value, contentWidth - 130);
    ensure(lines.length * 13 + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(lines, MARGIN + 130, y);
    y += lines.length * 13 + 4;
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text, contentWidth);
    ensure(lines.length * 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(lines, MARGIN, y);
    y += lines.length * 13 + 2;
  };

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(paciente.nombre, MARGIN, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Expediente clínico · generado el ${formatoFechaCorta(new Date().toISOString())}`, MARGIN, y);
  y += 22;

  heading("Datos generales");
  field("Teléfono", paciente.telefono);
  field("Correo", paciente.email);
  field("Fecha de nacimiento", paciente.fechaNacimiento);
  field("Género", paciente.genero);
  field("Ocupación", paciente.ocupacion);
  field("Escolaridad", paciente.escolaridad);
  field("Estado civil", paciente.estadoCivil);
  field("Dirección", paciente.direccion);
  field(
    "Contacto emergencia",
    paciente.emergenciaNombre
      ? `${paciente.emergenciaNombre}${paciente.emergenciaTelefono ? ` · ${paciente.emergenciaTelefono}` : ""}${paciente.emergenciaRelacion ? ` (${paciente.emergenciaRelacion})` : ""}`
      : null
  );

  if (
    paciente.motivoConsulta ||
    paciente.antecedentesPsicologicos ||
    paciente.antecedentesMedicos ||
    paciente.antecedentesFamiliares ||
    paciente.medicacionActual
  ) {
    y += 6;
    heading("Información clínica");
    field("Motivo de consulta", paciente.motivoConsulta);
    field("Antec. psicológicos", paciente.antecedentesPsicologicos);
    field("Antec. médicos", paciente.antecedentesMedicos);
    field("Antec. familiares", paciente.antecedentesFamiliares);
    field("Medicación actual", paciente.medicacionActual);
  }

  y += 6;
  heading(`Historial de sesiones (${sesiones.length})`);
  if (sesiones.length === 0) {
    paragraph("Sin sesiones registradas.");
  }
  sesiones.forEach((sesion, index) => {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const titulo =
      `Sesión ${sesiones.length - index} · ${formatoFechaLarga(sesion.iniciadaAt)} · ${formatoHora(sesion.iniciadaAt)}` +
      (sesion.modalidad === "seguimiento" ? " · Seguimiento" : sesion.tema ? ` · ${sesion.tema}` : "");
    doc.text(doc.splitTextToSize(titulo, contentWidth), MARGIN, y);
    y += 15;
    if (sesion.resumen) paragraph(sesion.resumen);
    if (sesion.seguimiento) {
      doc.setFont("helvetica", "italic");
      paragraph(`Seguimiento: ${sesion.seguimiento}`);
    }
    const compromisos = sesion.compromisos.filter((c) => c.tipo === "compromiso");
    const tareas = sesion.compromisos.filter((c) => c.tipo === "tarea");
    if (compromisos.length) paragraph(`Compromisos: ${compromisos.map((c) => c.descripcion).join("; ")}`);
    if (tareas.length) paragraph(`Tareas: ${tareas.map((c) => c.descripcion).join("; ")}`);
    y += 8;
  });

  const nombreArchivo = `expediente-${paciente.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
