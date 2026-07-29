// Exportacion a PDF de los temas de predicas por anio: una tabla por anio,
// con el mes y su tema. jsPDF se carga de forma dinamica para no engordar el
// paquete inicial.

import { MESES_LABEL } from "./types";

const MARGEN = 56;
const MORADO: [number, number, number] = [59, 46, 126];
const TINTA: [number, number, number] = [17, 24, 39];
const SUAVE: [number, number, number] = [120, 120, 135];
const LAVANDA: [number, number, number] = [237, 235, 247];
const LINEA: [number, number, number] = [214, 211, 230];

export type TemasDeAnio = { anio: number; temas: Array<{ mes: number; tema: string }> };

export async function exportTemasToPdf(anios: TemasDeAnio[]) {
  const { jsPDF: JsPdf } = await import("jspdf");
  const doc = new JsPdf({ unit: "pt", format: "a4" });

  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const ancho = anchoPagina - MARGEN * 2;
  const anchoMes = 110;

  anios.forEach((grupo, indice) => {
    if (indice > 0) doc.addPage();
    let y = MARGEN;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...MORADO);
    doc.text("Temas de Prédicas", anchoPagina / 2, y, { align: "center" });
    y += 26;

    doc.setFontSize(13);
    doc.setTextColor(...SUAVE);
    doc.text(String(grupo.anio), anchoPagina / 2, y, { align: "center" });
    y += 24;

    // Cabecera de la tabla
    const altoFila = 28;
    doc.setFillColor(...MORADO);
    doc.rect(MARGEN, y, ancho, altoFila, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("MES", MARGEN + 12, y + 18);
    doc.text("TEMA", MARGEN + anchoMes + 12, y + 18);
    y += altoFila;

    for (let mes = 1; mes <= 12; mes += 1) {
      const tema = grupo.temas.find((fila) => fila.mes === mes)?.tema?.trim() ?? "";

      if (y + altoFila > altoPagina - MARGEN) {
        doc.addPage();
        y = MARGEN;
      }

      if (mes % 2 === 0) {
        doc.setFillColor(...LAVANDA);
        doc.rect(MARGEN, y, ancho, altoFila, "F");
      }

      doc.setDrawColor(...LINEA);
      doc.setLineWidth(0.5);
      doc.line(MARGEN, y + altoFila, MARGEN + ancho, y + altoFila);
      doc.line(MARGEN + anchoMes, y, MARGEN + anchoMes, y + altoFila);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...MORADO);
      doc.text(MESES_LABEL[mes - 1], MARGEN + 12, y + 18);

      doc.setFont("helvetica", tema ? "normal" : "italic");
      doc.setTextColor(...(tema ? TINTA : SUAVE));
      const texto = tema || "Sin definir";
      const lineas: string[] = doc.splitTextToSize(texto, ancho - anchoMes - 24);
      doc.text(lineas[0] ?? "", MARGEN + anchoMes + 12, y + 18);

      y += altoFila;
    }

    // Marco exterior
    doc.setDrawColor(...LINEA);
    doc.rect(MARGEN, y - altoFila * 12 - altoFila, ancho, altoFila * 13);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...SUAVE);
    doc.text(
      `Generado el ${new Intl.DateTimeFormat("es-GT", { dateStyle: "long" }).format(new Date())}`,
      anchoPagina - MARGEN,
      altoPagina - 32,
      { align: "right" },
    );
  });

  const nombre = anios.length === 1 ? `temas-predicas-${anios[0].anio}.pdf` : "temas-predicas.pdf";
  doc.save(nombre);
}
