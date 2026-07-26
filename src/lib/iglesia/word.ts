// Generacion de documentos Word (.docx real, no HTML renombrado) para el area
// Iglesia: la constancia/programa de un evento y la exportacion de un tablero
// de pendientes.
//
// La libreria "docx" pesa varios cientos de KB, por eso se importa de forma
// dinamica dentro de cada funcion: solo se descarga cuando el usuario pulsa
// "Descargar Word", no en el paquete inicial del area.

// Los tipos de docx se importan con "import type": se borran al compilar, asi
// que sirven para anotar sin arrastrar la libreria al paquete inicial.
import type { Paragraph as ParagraphNode, Table as TableNode } from "docx";
import { fechaISO, formatoCompleto, formatoHora, formatoLargo } from "./fechas";
import {
  estadoInfo,
  prioridadInfo,
  rolLabel,
  tipoEventoInfo,
  type EventoRow,
  type GrupoRow,
  type ItemRow,
  type ParticipanteRow,
  type TableroRow,
} from "./types";

const AZUL = "1F3864";
const GRIS = "444444";

function nombreArchivo(base: string) {
  const limpio = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${limpio || "documento"}.docx`;
}

async function descargar(blob: Blob, archivo: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // El objeto URL se libera en el siguiente tick: revocarlo de inmediato
  // cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  await descargar(blob, nombreArchivo(`${info.documento}-${evento.titulo}`));
}

// ============================================================
// TABLERO -> reporte de pendientes
// ============================================================

export async function descargarTableroWord({
  grupos,
  items,
  tablero,
}: {
  grupos: GrupoRow[];
  items: ItemRow[];
  tablero: TableroRow;
}) {
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } =
    await import("docx");

  const bordeSuave = { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" } as const;
  const bordes = { top: bordeSuave, bottom: bordeSuave, left: bordeSuave, right: bordeSuave };

  const celda = (texto: string, opciones?: { negrita?: boolean; fondo?: string; ancho?: number; color?: string }) =>
    new TableCell({
      borders: bordes,
      shading: opciones?.fondo ? { fill: opciones.fondo } : undefined,
      width: opciones?.ancho ? { size: opciones.ancho, type: WidthType.PERCENTAGE } : undefined,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: texto, bold: opciones?.negrita, size: 20, color: opciones?.color })],
        }),
      ],
    });

  const principales = items.filter((item) => !item.item_padre_id);
  const bloques: Array<ParagraphNode | TableNode> = [
    new Paragraph({
      children: [new TextRun({ text: tablero.nombre, bold: true, size: 32, color: AZUL })],
    }),
  ];

  if (tablero.descripcion) {
    bloques.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: tablero.descripcion, size: 22, italics: true, color: GRIS })],
      }),
    );
  }

  const listos = principales.filter((item) => item.estado === "listo").length;
  bloques.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${principales.length} pendientes · ${listos} listos · ${principales.length - listos} en curso`,
          size: 20,
          color: GRIS,
        }),
      ],
    }),
  );

  for (const grupo of grupos) {
    const delGrupo = principales.filter((item) => item.grupo_id === grupo.id);
    bloques.push(
      new Paragraph({
        spacing: { before: 320, after: 120 },
        children: [
          new TextRun({ text: grupo.nombre, bold: true, size: 24, color: grupo.color.replace("#", "") }),
          new TextRun({ text: `   (${delGrupo.length})`, size: 20, color: GRIS }),
        ],
      }),
    );

    if (!delGrupo.length) {
      bloques.push(new Paragraph({ children: [new TextRun({ text: "Sin pendientes.", size: 20, color: GRIS })] }));
      continue;
    }

    bloques.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              celda("Pendiente", { negrita: true, fondo: "F2F4F8", ancho: 40 }),
              celda("Estado", { negrita: true, fondo: "F2F4F8", ancho: 18 }),
              celda("Responsable", { negrita: true, fondo: "F2F4F8", ancho: 17 }),
              celda("Prioridad", { negrita: true, fondo: "F2F4F8", ancho: 12 }),
              celda("Fecha límite", { negrita: true, fondo: "F2F4F8", ancho: 13 }),
            ],
          }),
          ...delGrupo.flatMap((item) => {
            const filas = [
              new TableRow({
                children: [
                  celda(item.titulo),
                  celda(estadoInfo(item.estado).label, { color: estadoInfo(item.estado).color.replace("#", "") }),
                  celda(item.responsable ?? "—"),
                  celda(prioridadInfo(item.prioridad).label),
                  celda(formatoLargo(item.fecha_limite) || "—"),
                ],
              }),
            ];

            for (const sub of items.filter((candidato) => candidato.item_padre_id === item.id)) {
              filas.push(
                new TableRow({
                  children: [
                    celda(`     • ${sub.titulo}`, { color: GRIS }),
                    celda(estadoInfo(sub.estado).label, { color: estadoInfo(sub.estado).color.replace("#", "") }),
                    celda(sub.responsable ?? "—"),
                    celda(prioridadInfo(sub.prioridad).label),
                    celda(formatoLargo(sub.fecha_limite) || "—"),
                  ],
                }),
              );
            }

            return filas;
          }),
        ],
      }),
    );
  }

  bloques.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: `Generado el ${formatoLargo(fechaISO(new Date()))}`,
          size: 18,
          color: GRIS,
          italics: true,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "GestionesJJ",
    title: tablero.nombre,
    sections: [{ children: bloques }],
  });

  const blob = await Packer.toBlob(doc);
  await descargar(blob, nombreArchivo(`pendientes-${tablero.nombre}`));
}
