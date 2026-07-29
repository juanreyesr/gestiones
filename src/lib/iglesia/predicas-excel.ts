// Exportacion a Excel del calendario de predicas de un mes.
//
// El diseno imita el calendario que se comparte con el equipo: encabezado
// morado con el mes y el tema, una fila por celebracion agrupada por fecha, y
// al pie las instrucciones extra. exceljs se importa de forma dinamica para no
// engordar el paquete inicial.

import { formatoCompleto } from "@/lib/fechas";
import {
  CIERRE_PASTORES,
  HORARIO_LABEL,
  mesLabel,
  type AsignacionPredicaRow,
  type MesPredicasRow,
  type PredicadorRow,
} from "./types";

const MORADO = "FF3B2E7E";
const LAVANDA = "FFEDEBF7";
const GRIS_BORDE = "FFBFBFBF";

const BORDE = {
  top: { style: "thin" as const, color: { argb: GRIS_BORDE } },
  left: { style: "thin" as const, color: { argb: GRIS_BORDE } },
  bottom: { style: "thin" as const, color: { argb: GRIS_BORDE } },
  right: { style: "thin" as const, color: { argb: GRIS_BORDE } },
};

export async function exportPredicasToExcel({
  asignaciones,
  mes,
  predicadores,
}: {
  asignaciones: AsignacionPredicaRow[];
  mes: MesPredicasRow;
  predicadores: PredicadorRow[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${mesLabel(mes.mes)} ${mes.anio}`);

  sheet.columns = [{ width: 30 }, { width: 12 }, { width: 30 }, { width: 30 }];

  const nombrePorId = new Map(predicadores.map((predicador) => [predicador.id, predicador.nombre]));
  const nombre = (id: string | null) => (id ? (nombrePorId.get(id) ?? "") : "");
  const cierreDe = (asignacion: AsignacionPredicaRow) =>
    nombre(asignacion.cierre_predicador_id) || asignacion.cierre_texto || "";

  // --- Encabezado -------------------------------------------------
  const titulo = sheet.addRow([`${mesLabel(mes.mes).toUpperCase()} ${mes.anio}`]);
  sheet.mergeCells(titulo.number, 1, titulo.number, 4);
  titulo.height = 26;
  titulo.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MORADO } };
  titulo.getCell(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titulo.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const tema = sheet.addRow([`TEMA: ${(mes.tema ?? "").toUpperCase()}`]);
  sheet.mergeCells(tema.number, 1, tema.number, 4);
  tema.height = 22;
  tema.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MORADO } };
  tema.getCell(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  tema.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  sheet.addRow([]);

  const cabecera = sheet.addRow(["Fecha", "Horario", "Predica", "Cierre"]);
  cabecera.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MORADO } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center" };
    cell.border = BORDE;
  });

  // --- Celebraciones, agrupadas por fecha -------------------------
  const porFecha = new Map<string, AsignacionPredicaRow[]>();
  for (const asignacion of [...asignaciones].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario),
  )) {
    const lista = porFecha.get(asignacion.fecha) ?? [];
    lista.push(asignacion);
    porFecha.set(asignacion.fecha, lista);
  }

  for (const [fecha, celebraciones] of porFecha) {
    const primera = sheet.rowCount + 1;

    celebraciones.forEach((asignacion, indice) => {
      const fila = sheet.addRow([
        indice === 0 ? formatoCompleto(fecha) : "",
        HORARIO_LABEL[asignacion.horario],
        nombre(asignacion.predicador_id),
        cierreDe(asignacion),
      ]);

      fila.eachCell((cell) => {
        cell.border = BORDE;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LAVANDA } };
        cell.alignment = { vertical: "middle", wrapText: true };
      });
      fila.getCell(1).font = { bold: true };
      fila.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      // El cierre fijo se distingue en gris para que resalte quien si es persona.
      if (cierreDe(asignacion) === CIERRE_PASTORES) {
        fila.getCell(4).font = { italic: true, color: { argb: "FF666666" } };
      }
    });

    const ultima = sheet.rowCount;
    if (ultima > primera) sheet.mergeCells(primera, 1, ultima, 1);
  }

  // --- Instrucciones extra ----------------------------------------
  const lineas = (mes.instrucciones ?? "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length) {
    sheet.addRow([]);
    const rotulo = sheet.addRow(["INSTRUCCIONES EXTRA"]);
    sheet.mergeCells(rotulo.number, 1, rotulo.number, 4);
    rotulo.getCell(1).font = { bold: true, color: { argb: MORADO } };

    for (const linea of lineas) {
      const fila = sheet.addRow([`• ${linea}`]);
      sheet.mergeCells(fila.number, 1, fila.number, 4);
      fila.getCell(1).alignment = { wrapText: true, vertical: "top" };
    }
  }

  if (mes.notas?.trim()) {
    sheet.addRow([]);
    const rotulo = sheet.addRow(["NOTAS"]);
    sheet.mergeCells(rotulo.number, 1, rotulo.number, 4);
    rotulo.getCell(1).font = { bold: true, color: { argb: MORADO } };

    const fila = sheet.addRow([mes.notas.trim()]);
    sheet.mergeCells(fila.number, 1, fila.number, 4);
    fila.getCell(1).alignment = { wrapText: true, vertical: "top" };
  }

  // --- Hoja de resumen por predicador -----------------------------
  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [{ width: 30 }, { width: 14 }, { width: 14 }, { width: 30 }];

  const cabeceraResumen = resumen.addRow(["Predicador", "Predicas", "Cierres", "Horarios en los que predica"]);
  cabeceraResumen.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MORADO } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.border = BORDE;
  });

  for (const predicador of predicadores) {
    const predicas = asignaciones.filter((asignacion) => asignacion.predicador_id === predicador.id);
    const cierres = asignaciones.filter((asignacion) => asignacion.cierre_predicador_id === predicador.id);
    if (!predicas.length && !cierres.length) continue;

    const horarios = predicas.map((asignacion) => HORARIO_LABEL[asignacion.horario]);
    const fila = resumen.addRow([predicador.nombre, predicas.length, cierres.length, horarios.join(", ")]);
    fila.eachCell((cell) => {
      cell.border = BORDE;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `predicas-${mesLabel(mes.mes).toLowerCase()}-${mes.anio}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
