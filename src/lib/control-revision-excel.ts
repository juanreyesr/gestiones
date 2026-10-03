import type { Trimestre } from "@/data/evaluacion";
import { tituloContenidos, type EstadoRevision, type TipoEvaluacion } from "@/lib/control-revision";

// Reproduce el formato institucional "Control revisión evaluaciones de
// docentes": franja ADMINISTRATIVO (amarilla) y PEDAGÓGICO (naranja), encabezado
// azul oscuro y filas alternas. Las fechas van como fechas reales de Excel
// (dd/mm/yyyy) para que el sistema externo las lea sin conversion.

export type FilaControlExcel = {
  campus: string;
  carrera: string;
  curso: string;
  docente: string;
  correo: string;
  estado: EstadoRevision;
};

type Columna = { titulo: string; ancho: number; valor: (f: FilaControlExcel, limite: string) => string | null; fecha?: boolean };

const COLUMNAS_ADMINISTRATIVO: Columna[] = [
  { titulo: "Campus / modalidad", ancho: 16, valor: (f) => f.campus },
  { titulo: "Carrera", ancho: 30, valor: (f) => f.carrera },
  { titulo: "Curso", ancho: 30, valor: (f) => f.curso },
  { titulo: "Docente", ancho: 30, valor: (f) => f.docente },
  { titulo: "Correo docente", ancho: 30, valor: (f) => f.correo },
  { titulo: "Fecha límite de entrega", ancho: 13, valor: (_f, limite) => limite, fecha: true },
  { titulo: "Fecha de recepción", ancho: 13, valor: (f) => f.estado.fecha_recepcion, fecha: true },
  { titulo: "Estado de entrega", ancho: 13, valor: (f) => f.estado.estado_entrega },
  { titulo: "Revisor / coordinador", ancho: 18, valor: (f) => f.estado.revisor },
  { titulo: "Fecha de revisión", ancho: 13, valor: (f) => f.estado.fecha_revision, fecha: true },
  { titulo: "Estatus de revisión", ancho: 13, valor: (f) => f.estado.estatus_revision },
  { titulo: "Retroalimentación enviada", ancho: 15, valor: (f) => f.estado.retro_enviada },
  { titulo: "Fecha retroalimentación", ancho: 15, valor: (f) => f.estado.fecha_retro, fecha: true },
  { titulo: "Versión corregida recibida", ancho: 15, valor: (f) => f.estado.version_corregida },
  { titulo: "Fecha versión corregida", ancho: 13, valor: (f) => f.estado.fecha_version_corregida, fecha: true },
  { titulo: "Versión final aprobada", ancho: 13, valor: (f) => f.estado.version_final_aprobada },
  { titulo: "Fecha aprobación", ancho: 13, valor: (f) => f.estado.fecha_aprobacion, fecha: true },
];

const columnasPedagogico = (tipo: TipoEvaluacion): Columna[] => [
  { titulo: tituloContenidos(tipo), ancho: 13, valor: (f) => f.estado.contenidos_semana6 },
  { titulo: "Formato oficial", ancho: 11, valor: (f) => f.estado.formato_oficial },
  { titulo: "Punteo total = 100", ancho: 11, valor: (f) => f.estado.punteo_100 },
  { titulo: "Instrucciones y ponderación claras", ancho: 14, valor: (f) => f.estado.instrucciones_claras },
  { titulo: "Aplicación / análisis / caso", ancho: 13, valor: (f) => f.estado.aplicacion_caso },
  { titulo: "Rúbrica / criterios (si aplica)", ancho: 13, valor: (f) => f.estado.rubrica },
  { titulo: "Observaciones / seguimiento", ancho: 40, valor: (f) => f.estado.observaciones },
];

const AMARILLO = "FFFFFF00";
const NARANJA = "FFFFC000";
const AZUL_OSCURO = "FF0F2B5B";
const FILA_A = "FFDDEBF7";
const FILA_B = "FFC5E8F7";

const BORDE = {
  top: { style: "thin" as const, color: { argb: "FF9BC2E6" } },
  left: { style: "thin" as const, color: { argb: "FF9BC2E6" } },
  bottom: { style: "thin" as const, color: { argb: "FF9BC2E6" } },
  right: { style: "thin" as const, color: { argb: "FF9BC2E6" } },
};

const relleno = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

/** "2026-10-03" -> fecha de Excel sin corrimiento por zona horaria. */
function fechaExcel(iso: string | null) {
  if (!iso) return null;
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export type ControlRevisionExcelInput = {
  anio: number;
  trimestre: Trimestre;
  tipo: TipoEvaluacion;
  fechaLimite: string;
  filas: FilaControlExcel[];
};

export const nombreArchivoControlRevision = (input: ControlRevisionExcelInput) =>
  `control-revision-evaluaciones-${input.anio}-T${input.trimestre}-${input.tipo === "parcial" ? "parciales" : "finales"}.xlsx`;

/** Arma el libro sin descargarlo (sirve tambien fuera del navegador). */
export async function construirLibroControlRevision(input: ControlRevisionExcelInput) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const nombreHoja = input.tipo === "parcial" ? "Parciales" : "Finales";
  const hoja = workbook.addWorksheet(nombreHoja, {
    views: [{ state: "frozen", xSplit: 0, ySplit: 2 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const pedagogico = columnasPedagogico(input.tipo);
  const columnas = [...COLUMNAS_ADMINISTRATIVO, ...pedagogico];
  const totalAdmin = 1 + COLUMNAS_ADMINISTRATIVO.length;
  const total = totalAdmin + pedagogico.length;
  hoja.columns = [{ width: 5 }, ...columnas.map((c) => ({ width: c.ancho }))];

  // Fila 1: franjas de seccion.
  hoja.mergeCells(1, 1, 1, totalAdmin);
  hoja.mergeCells(1, totalAdmin + 1, 1, total);
  const franjaAdmin = hoja.getCell(1, 1);
  franjaAdmin.value = "ADMINISTRATIVO";
  const franjaPed = hoja.getCell(1, totalAdmin + 1);
  franjaPed.value = "PEDAGÓGICO";
  for (let c = 1; c <= total; c += 1) {
    const celda = hoja.getCell(1, c);
    celda.fill = relleno(c <= totalAdmin ? AMARILLO : NARANJA);
    celda.font = { bold: true, size: 12 };
    celda.alignment = { horizontal: "center", vertical: "middle" };
  }
  hoja.getRow(1).height = 20;

  // Fila 2: encabezados.
  const encabezado = hoja.getRow(2);
  ["No.", ...columnas.map((c) => c.titulo)].forEach((titulo, i) => {
    const celda = encabezado.getCell(i + 1);
    celda.value = titulo;
    celda.fill = relleno(AZUL_OSCURO);
    celda.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    celda.border = BORDE;
  });
  encabezado.height = 32;

  input.filas.forEach((fila, i) => {
    const row = hoja.getRow(3 + i);
    row.getCell(1).value = i + 1;
    columnas.forEach((col, j) => {
      const valor = col.valor(fila, input.fechaLimite);
      row.getCell(j + 2).value = col.fecha ? fechaExcel(valor) : valor || null;
      if (col.fecha) row.getCell(j + 2).numFmt = "dd/mm/yyyy";
    });
    for (let c = 1; c <= total; c += 1) {
      const celda = row.getCell(c);
      celda.fill = relleno(i % 2 === 0 ? FILA_A : FILA_B);
      celda.border = BORDE;
      celda.font = { size: 9 };
      celda.alignment = { vertical: "middle", horizontal: c === 1 || (c > 6 && c < total) ? "center" : "left", wrapText: c === total };
    }
  });

  return workbook;
}

export async function exportControlRevisionToExcel(input: ControlRevisionExcelInput) {
  const workbook = await construirLibroControlRevision(input);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivoControlRevision(input);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
