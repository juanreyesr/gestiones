// Constancia o programa en Word (.docx real, no HTML renombrado) de un evento
// del area Iglesia. La libreria "docx" se importa de forma dinamica: solo se
// descarga al pulsar el boton.

// Los tipos de docx se importan con "import type": se borran al compilar, asi
// que sirven para anotar sin arrastrar la libreria al paquete inicial.
import type { Paragraph as ParagraphNode, Table as TableNode } from "docx";
import { fechaISO, formatoCompleto, formatoHora, formatoLargo } from "@/lib/fechas";
import { AZUL_DOCUMENTO as AZUL, GRIS_DOCUMENTO as GRIS, descargarBlob, nombreArchivo } from "@/lib/word-comun";
import { rolLabel, tipoEventoInfo, type EventoRow, type ParticipanteRow } from "./types";

// ============================================================
// EVENTO -> constancia / programa
// ============================================================

export async function descargarEventoWord({
  encabezado,
  evento,
  participantes,
}: {
  encabezado: string;
  evento: EventoRow;
  participantes: ParticipanteRow[];
}) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");

  const info = tipoEventoInfo(evento.tipo);

  const bordeSuave = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "D9D9D9",
  } as const;
  const bordes = { top: bordeSuave, bottom: bordeSuave, left: bordeSuave, right: bordeSuave };

  const celda = (texto: string, opciones?: { negrita?: boolean; fondo?: string; ancho?: number }) =>
    new TableCell({
      borders: bordes,
      shading: opciones?.fondo ? { fill: opciones.fondo } : undefined,
      width: opciones?.ancho ? { size: opciones.ancho, type: WidthType.PERCENTAGE } : undefined,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: texto, bold: opciones?.negrita, size: 22 })],
        }),
      ],
    });

  const filaDato = (etiqueta: string, valor: string) =>
    new TableRow({
      children: [
        celda(etiqueta, { negrita: true, fondo: "F2F4F8", ancho: 30 }),
        celda(valor || "—", { ancho: 70 }),
      ],
    });

  const datos: Array<[string, string]> = [
    ["Tipo de evento", info.label],
    ["Fecha", formatoCompleto(evento.fecha)],
    ["Hora", formatoHora(evento.hora)],
    ["Lugar", evento.lugar ?? ""],
    ["Dirección", evento.direccion ?? ""],
    ["Oficiante", evento.oficiante ?? ""],
    ["Asistentes estimados", evento.asistentes_estimados ? String(evento.asistentes_estimados) : ""],
  ];

  const contacto: Array<[string, string]> = [
    ["Persona de contacto", evento.contacto_nombre ?? ""],
    ["Teléfono", evento.contacto_telefono ?? ""],
    ["Correo", evento.contacto_correo ?? ""],
  ].filter((fila) => fila[1]) as Array<[string, string]>;

  const titulo = (texto: string) =>
    new Paragraph({
      spacing: { before: 320, after: 140 },
      children: [new TextRun({ text: texto.toUpperCase(), bold: true, size: 22, color: AZUL })],
    });

  const parrafos: Array<ParagraphNode | TableNode> = [];

  if (encabezado.trim()) {
    parrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: encabezado.trim().toUpperCase(), bold: true, size: 24, color: GRIS })],
      }),
    );
  }

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: info.documento, bold: true, size: 32, color: AZUL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
      children: [new TextRun({ text: evento.titulo, size: 24, italics: true, color: GRIS })],
    }),
    titulo("Datos generales"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: datos.map(([etiqueta, valor]) => filaDato(etiqueta, valor)),
    }),
  );

  if (participantes.length) {
    parrafos.push(
      titulo("Participantes"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              celda("Rol", { negrita: true, fondo: "F2F4F8", ancho: 22 }),
              celda("Nombre", { negrita: true, fondo: "F2F4F8", ancho: 38 }),
              celda("Documento", { negrita: true, fondo: "F2F4F8", ancho: 20 }),
              celda("Teléfono", { negrita: true, fondo: "F2F4F8", ancho: 20 }),
            ],
          }),
          ...participantes.map(
            (participante) =>
              new TableRow({
                children: [
                  celda(rolLabel(participante.rol)),
                  celda(participante.nombre),
                  celda(participante.documento ?? "—"),
                  celda(participante.telefono ?? "—"),
                ],
              }),
          ),
        ],
      }),
    );
  }

  if (evento.programa?.trim()) {
    parrafos.push(titulo("Programa"));
    for (const linea of evento.programa.split("\n")) {
      parrafos.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: linea.trim() || " ", size: 22 })],
        }),
      );
    }
  }

  if (contacto.length) {
    parrafos.push(
      titulo("Contacto"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: contacto.map(([etiqueta, valor]) => filaDato(etiqueta, valor)),
      }),
    );
  }

  if (evento.notas?.trim()) {
    parrafos.push(
      titulo("Notas"),
      new Paragraph({ children: [new TextRun({ text: evento.notas.trim(), size: 22 })] }),
    );
  }

  // Lineas de firma: los protagonistas del evento (novios, contrayentes,
  // padres, testigos) firman; el resto solo aparece en la tabla.
  const firmantes = participantes
    .filter((participante) =>
      ["novio", "novia", "contrayente", "testigo", "padre", "madre", "oficiante"].includes(participante.rol),
    )
    .slice(0, 6);

  const lineasFirma = firmantes.length
    ? firmantes
    : evento.oficiante
      ? [{ nombre: evento.oficiante, rol: "oficiante" as const }]
      : [];

  if (lineasFirma.length) {
    parrafos.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
    for (const firmante of lineasFirma) {
      parrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 360 },
          children: [new TextRun({ text: "____________________________________", size: 22 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: firmante.nombre, bold: true, size: 22 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: rolLabel(firmante.rol), size: 20, color: GRIS })],
        }),
      );
    }
  }

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: `Documento generado el ${formatoLargo(fechaISO(new Date()))}`,
          size: 18,
          color: GRIS,
          italics: true,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: encabezado || "GestionesJJ",
    title: `${info.documento} — ${evento.titulo}`,
    sections: [{ children: parrafos }],
  });

  const blob = await Packer.toBlob(doc);
  await descargarBlob(blob, nombreArchivo(`${info.documento}-${evento.titulo}`));
}
