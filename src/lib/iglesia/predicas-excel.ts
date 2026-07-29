// Exportacion a Excel del calendario de predicas de un mes.
//
// El diseno imita el calendario que se comparte con el equipo: encabezado
// morado con el mes y el tema, una fila por celebracion agrupada por fecha, y
// al pie las instrucciones extra. exceljs se importa de forma dinamica para no
// engordar el paquete inicial.

import { formatoCompleto } from "@/lib/fechas";
import {
  CIERRE_SIN_ASIGNAR,
  HORARIO_LABEL,
  mesLabel,
  type AsignacionPredicaRow,
  type MesPredicasRow,
  type PersonaRow,
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
  cierres,
  mes,
  predicadores,
}: {
  asignaciones: AsignacionPredicaRow[];
  cierres: PersonaRow[];
  mes: MesPredicasRow;
  predicadores: PersonaRow[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${mesLabel(mes.mes)} ${mes.anio}`);

  sheet.columns = [{ width: 30 }, { width: 12 }, { width: 30 }, { width: 30 }];

  const nombrePredicador = new Map(predicadores.map((persona) => [persona.id, persona.nombre]));
  const nombreCierre = new Map(cierres.map((persona) => [persona.id, persona.nombre]));

  // Un invitado no esta en ningun catalogo: su nombre viaja en la asignacion.
  const predicaDe = (asignacion: AsignacionPredicaRow) =>
    asignacion.predicador_texto?.trim() ||
    (asignacion.predicador_id ? (nombrePredicador.get(asignacion.predicador_id) ?? "") : "");

  // Sin persona designada cierra el pastor de la celebracion, y el documento
  // lo dice asi en vez de dejar la casilla vacia.
  const cierreDe = (asignacion: AsignacionPredicaRow) =>
    asignacion.cierre_texto?.trim() ||
    (asignacion.cierre_persona_id ? (nombreCierre.get(asignacion.cierre_persona_id) ?? "") : "") ||
    CIERRE_SIN_ASIGNAR;

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
        predicaDe(asignacion),
        cierreDe(asignacion),
      ]);

      fila.eachCell((cell) => {
        cell.border = BORDE;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LAVANDA } };
        cell.alignment = { vertical: "middle", wrapText: true };
      });
      fila.getCell(1).font = { bold: true };
      fila.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      // "No asignado" va en gris para que resalte quien si es una persona.
      if (cierreDe(asignacion) === CIERRE_SIN_ASIGNAR) {
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

  // Una misma persona puede estar en los dos catalogos; se muestra una sola
  // vez, sumando lo que predica y lo que cierra.
  const personas = [...predicadores];
  for (const persona of cierres) {
    if (!personas.some((existente) => existente.nombre === persona.nombre)) personas.push(persona);
  }

  for (const persona of personas) {
    const predicas = asignaciones.filter((asignacion) => predicaDe(asignacion) === persona.nombre);
    const cerradas = asignaciones.filter(
      (asignacion) => cierreDe(asignacion) === persona.nombre,
    );
    if (!predicas.length && !cerradas.length) continue;

    const horarios = predicas.map((asignacion) => HORARIO_LABEL[asignacion.horario]);
    const fila = resumen.addRow([persona.nombre, predicas.length, cerradas.length, horarios.join(", ")]);
    fila.eachCell((cell) => {
      cell.border = BORDE;
    });
  }

  // Los invitados no estan en ningun catalogo pero si en el calendario.
  const invitados = [
    ...new Set(
      asignaciones
        .map((asignacion) => asignacion.predicador_texto?.trim())
        .filter((nombre): nombre is string => Boolean(nombre)),
    ),
  ];
  for (const invitado of invitados) {
    const predicas = asignaciones.filter((asignacion) => asignacion.predicador_texto?.trim() === invitado);
    const fila = resumen.addRow([
      `${invitado} (invitado)`,
      predicas.length,
      0,
      predicas.map((asignacion) => HORARIO_LABEL[asignacion.horario]).join(", "),
    ]);
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
