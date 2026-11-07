import type { EvaluacionRespuestaRow, InformeRow } from "@/lib/evaluaciones/evaluaciones";
import { evolucionDelPaciente } from "@/lib/evaluaciones/evolucion-paciente";
import { resumenRespuesta } from "@/lib/evaluaciones/resumen-respuesta";
import { nombreCategoria, tamanoLegible, type DocumentoRow } from "./documentos";
import type { ConsentimientoRow } from "./pacientes";
import { formatoFechaCorta, formatoFechaLarga, formatoHora } from "./slots";
import type { PacienteRow, SesionRow } from "./types";

/** Lo que agrega el expediente completo (consentimientos y evaluaciones). */
export type ExtraExpediente = {
  consentimientos: ConsentimientoRow[];
  respuestas: EvaluacionRespuestaRow[];
  informes: Record<string, InformeRow>;
  /** Documentos del expediente (se listan; los archivos van aparte). */
  documentos?: DocumentoRow[];
};

/** jsPDF con fuentes estándar solo muestra Latin-1: se reemplazan los símbolos comunes y se quitan los demás. */
export function textoPdf(texto: string) {
  return texto
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[→⇒]/g, "->")
    .replace(/[–—]/g, "-")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\u0000-\u00ff]/g, "");
}

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);
const TENDENCIA = { mejora: "mejora", igual: "sigue igual", empeora: "empeora" } as const;

const MARGIN = 48;
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [90, 100, 118];
const ACCENT: [number, number, number] = [16, 130, 100];

// jsPDF pesa varios cientos de KB: se carga solo cuando realmente se exporta
// el expediente, en vez de ir en el paquete inicial de la app.
export async function exportarExpedientePdf(paciente: PacienteRow, sesiones: SesionRow[], extra?: ExtraExpediente) {
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
    doc.text(textoPdf(text).toUpperCase(), MARGIN, y);
    y += 6;
    doc.setDrawColor(220, 226, 232);
    doc.line(MARGIN, y, width - MARGIN, y);
    y += 14;
  };

  const field = (label: string, value: string | null) => {
    if (!value) return;
    const lines = doc.splitTextToSize(textoPdf(value), contentWidth - 130);
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
    const lines = doc.splitTextToSize(textoPdf(text), contentWidth);
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
  doc.text(textoPdf(paciente.nombre), MARGIN, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Expediente clínico${extra ? " completo" : ""} · generado el ${formatoFechaCorta(new Date().toISOString())}`, MARGIN, y);
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
  field("Identificación", paciente.identificacion);
  if (paciente.esMenor) field("Menor de edad", "Sí");
  if (paciente.esMenor && paciente.responsables.length)
    field(
      "Padres o tutores",
      paciente.responsables
        .map((r) => `${r.nombre}${r.parentesco ? ` (${r.parentesco})` : ""}${r.identificacion ? ` · ${r.tipoIdentificacion}: ${r.identificacion}` : ""}${r.telefono ? ` · ${r.telefono}` : ""}`)
        .join("; ")
    );
  field(
    "Contacto emergencia",
    paciente.emergenciaNombre
      ? `${paciente.emergenciaNombre}${paciente.emergenciaTelefono ? ` · ${paciente.emergenciaTelefono}` : ""}${paciente.emergenciaRelacion ? ` (${paciente.emergenciaRelacion})` : ""}`
      : null
  );
  field("Horario de trabajo", paciente.horarioTrabajo);
  field(
    "Hijos",
    paciente.tieneHijos === true
      ? paciente.hijos.length > 0
        ? paciente.hijos.map((h) => `${h.nombre || "—"}${h.edad ? ` (${h.edad})` : ""}`).join(", ")
        : "Sí"
      : paciente.tieneHijos === false
        ? "No"
        : null
  );
  field(
    "Convivencia",
    paciente.viveSolo === true
      ? "Vive solo/a"
      : paciente.viveSolo === false
        ? [
            ...paciente.conviveCon.filter((o) => o !== "Otros"),
            ...(paciente.conviveOtros
              ? [paciente.conviveOtros]
              : paciente.conviveCon.includes("Otros")
                ? ["Otros"]
                : []),
          ].join(", ") || null
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

  if (extra) {
    // Consentimientos: lista de firmas y el texto completo del más reciente.
    y += 6;
    heading(`Consentimiento informado (${extra.consentimientos.length})`);
    if (!extra.consentimientos.length) {
      paragraph(
        paciente.consentimientoAceptadoAt
          ? `Aceptado el ${formatoFechaLarga(paciente.consentimientoAceptadoAt)} (registro anterior al historial de firmas).`
          : "Sin consentimiento firmado registrado."
      );
    }
    extra.consentimientos.forEach((c) => {
      const firmantes = c.firmantes.map((f) => `${f.nombre}${f.parentesco ? ` (${f.parentesco})` : ""}${f.identificacion ? `, doc. ${f.identificacion}` : ""}`).join("; ");
      field(`${formatoFechaCorta(c.aceptadoAt)} ${formatoHora(c.aceptadoAt)}`, `Versión ${c.version}. Firmó: ${firmantes || "—"}.${c.esMenor ? ` Asentimiento del menor: ${c.asentimientoMenor ? "sí" : "no"}.` : ""}`);
    });
    if (extra.consentimientos[0]) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      ensure(16);
      doc.text("Texto firmado (versión más reciente):", MARGIN, y);
      y += 13;
      doc.setFontSize(8.5);
      for (const linea of extra.consentimientos[0].texto.split("\n")) {
        const lines = doc.splitTextToSize(textoPdf(linea), contentWidth);
        ensure(lines.length * 11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...INK);
        doc.text(lines, MARGIN, y);
        y += lines.length * 11 + 1;
      }
    }

    // Evaluaciones: evolución por escala y cada respuesta con sus resultados y notas privadas.
    const respuestas = [...extra.respuestas].sort((a, b) => (fechaDe(a) + a.createdAt).localeCompare(fechaDe(b) + b.createdAt));
    y += 6;
    heading(`Evaluaciones (${respuestas.length})`);
    if (!respuestas.length) paragraph("Sin evaluaciones respondidas.");
    const { series, hitos } = evolucionDelPaciente(respuestas);
    const conSeguimiento = series.filter((serie) => serie.puntos.length > 1);
    if (conSeguimiento.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      ensure(16);
      doc.text("Evolución por escala", MARGIN, y);
      y += 14;
      for (const serie of conSeguimiento) {
        const puntos = serie.puntos.map((p) => `${p.valor} (${formatoFechaCorta(p.fecha)})`).join(" -> ");
        const t = [
          serie.tendencia ? `Frente a la anterior: ${TENDENCIA[serie.tendencia]}` : "",
          serie.tendenciaInicio ? `frente a la primera: ${TENDENCIA[serie.tendenciaInicio]}` : "",
        ].filter(Boolean);
        field(serie.sigla, `${puntos}. Última banda: ${serie.puntos[serie.puntos.length - 1].banda}.${t.length ? ` ${t.join("; ")}.` : ""}`);
      }
      paragraph("Criterios: GAD-7, cambio de 4 puntos o más; demás escalas, cambio de banda. Puntuación más baja = menos síntomas.");
      y += 6;
    }
    for (const r of respuestas) {
      const res = resumenRespuesta(r);
      ensure(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      const tituloEval = doc.splitTextToSize(
        textoPdf(`${formatoFechaLarga(fechaDe(r))} · ${res.instrumento} · respondió ${r.respondienteNombre}${r.respondienteRelacion && r.respondienteRelacion !== "Paciente" ? ` (${r.respondienteRelacion})` : ""}`),
        contentWidth
      );
      ensure(tituloEval.length * 13 + 4);
      doc.text(tituloEval, MARGIN, y);
      y += tituloEval.length * 13 + 2;
      paragraph(res.puntuaciones.join(" · "));
      if (res.alertas.length) paragraph(`Alertas: ${res.alertas.join(" ")}`);
      const informe = extra.informes[r.id];
      if (informe?.notasPrivadas.trim()) paragraph(`Notas del profesional: ${informe.notasPrivadas.trim()}`);
      if (informe?.publicadoAt) paragraph(`Informe enviado al paciente el ${formatoFechaCorta(informe.publicadoAt)}.`);
      y += 6;
    }
    if (hitos.length) {
      for (const h of hitos) field(formatoFechaCorta(h.fecha), `${h.titulo}: ${h.detalle}`);
    }

    // Documentos: lista (los archivos se conservan en el expediente digital).
    const documentos = extra.documentos ?? [];
    y += 6;
    heading(`Documentos y archivos (${documentos.length})`);
    if (!documentos.length) paragraph("Sin documentos guardados.");
    for (const d of documentos) {
      const sesion = d.sesionId ? sesiones.findIndex((s) => s.id === d.sesionId) : -1;
      field(
        formatoFechaCorta(d.fecha),
        `${d.titulo} · ${nombreCategoria(d.categoria)}${sesion >= 0 ? ` · Sesión ${sesiones.length - sesion}` : ""} · ${d.archivoNombre} (${tamanoLegible(d.tamano)})${d.nota ? `. ${d.nota}` : ""}`
      );
    }
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
    const lineasTitulo = doc.splitTextToSize(textoPdf(titulo), contentWidth);
    doc.text(lineasTitulo, MARGIN, y);
    y += lineasTitulo.length * 13 + 2;
    if (sesion.resumen) paragraph(sesion.resumen);
    if (sesion.seguimiento) {
      doc.setFont("helvetica", "italic");
      paragraph(`Seguimiento: ${sesion.seguimiento}`);
    }
    const compromisos = sesion.compromisos.filter((c) => c.tipo === "compromiso");
    const tareas = sesion.compromisos.filter((c) => c.tipo === "tarea");
    if (compromisos.length) paragraph(`Compromisos: ${compromisos.map((c) => c.descripcion).join("; ")}`);
    if (tareas.length) paragraph(`Tareas: ${tareas.map((c) => c.descripcion).join("; ")}`);
    if (sesion.propuestasIa.length) {
      paragraph(`Propuestas (IA): ${sesion.propuestasIa.map((p) => `${p.nombre} (${p.justificacion})${p.estado === "aplicada" ? " [aplicada]" : p.estado === "descartada" ? " [descartada]" : ""}`).join("; ")}`);
    }
    y += 8;
  });

  const nombreArchivo = `expediente-${paciente.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
