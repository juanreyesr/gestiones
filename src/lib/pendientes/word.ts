// Exportacion de un tablero de pendientes a Word (.docx real). La libreria
// "docx" se importa de forma dinamica: solo se descarga al pulsar el boton.

import type { Paragraph as ParagraphNode, Table as TableNode } from "docx";
import { fechaISO, formatoLargo } from "@/lib/fechas";
import { AZUL_DOCUMENTO as AZUL, GRIS_DOCUMENTO as GRIS, descargarBlob, nombreArchivo } from "@/lib/word-comun";
import { estadoInfo, prioridadInfo, type GrupoRow, type ItemRow, type TableroRow } from "./types";

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
  await descargarBlob(blob, nombreArchivo(`pendientes-${tablero.nombre}`));
}

