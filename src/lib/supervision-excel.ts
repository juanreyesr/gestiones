import type { Trimestre } from "@/data/evaluacion";
import { formatoCorto } from "@/lib/fechas";
import { mesDeFecha, type LogroSemana, type MarcaCelda } from "@/lib/supervision";

// Reproduce el formato institucional de la programacion de supervisiones:
// meses arriba, "Semana N" por columna (la de parciales rotulada PARCIAL),
// secciones por trimestre de la carrera y una X en cada semana supervisada.
// Los rotulos son del documento oficial, por eso llevan acentos.

export type FilaProgramacion = {
  docente: string;
  curso: string;
  nrc: string;
  horario: string;
  marcas: MarcaCelda[];
};

export type GrupoProgramacion = { rotulo: string; filas: FilaProgramacion[] };

export type SupervisionRealizada = {
  fecha: string;
  semana: number | null;
  docente: string;
  curso: string;
  porcentaje: number;
  origen: string;
};

const AZUL_OSCURO = "FF1F4E79";
const AZUL_CLARO = "FFDDEBF7";
const AZUL_SECCION = "FFBDD7EE";
const GRIS_PARCIAL = "FFE7E6E6";
const RELLENO_MARCA: Record<Exclude<MarcaCelda, "">, string> = {
  X: "FFC6EFCE",
  P: "FFFFF2CC",
  NR: "FFFFC7CE",
};

const BORDE = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

const relleno = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

export async function exportSupervisionToExcel(input: {
  anio: number;
  trimestre: Trimestre;
  semanas: string[];
  parcial: string | null;
  grupos: GrupoProgramacion[];
  logros: LogroSemana[];
  realizadas: SupervisionRealizada[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  // ---- Hoja 1: programacion en el formato institucional ----
  const hoja = workbook.addWorksheet("Programación", { views: [{ state: "frozen", xSplit: 5, ySplit: 2 }] });
  const fijas = 5;
  const totalColumnas = fijas + input.semanas.length;
  hoja.columns = [{ width: 5 }, { width: 30 }, { width: 34 }, { width: 8 }, { width: 13 }, ...input.semanas.map(() => ({ width: 10 }))];

  // Fila 1: meses agrupando sus semanas.
  const filaMeses = hoja.getRow(1);
  let desde = 0;
  while (desde < input.semanas.length) {
    const mes = mesDeFecha(input.semanas[desde]);
    let hasta = desde;
    while (hasta + 1 < input.semanas.length && mesDeFecha(input.semanas[hasta + 1]) === mes) hasta += 1;
    if (hasta > desde) hoja.mergeCells(1, fijas + 1 + desde, 1, fijas + 1 + hasta);
    const celda = filaMeses.getCell(fijas + 1 + desde);
    celda.value = mes;
    for (let c = desde; c <= hasta; c += 1) {
      const cel = filaMeses.getCell(fijas + 1 + c);
      cel.fill = relleno(AZUL_CLARO);
      cel.border = BORDE;
      cel.font = { bold: true };
      cel.alignment = { horizontal: "center", vertical: "middle" };
    }
    desde = hasta + 1;
  }

  // Fila 2: encabezados.
  const encabezados = [
    "No.",
    "Docente",
    "Curso",
    "NRC",
    "Horario\n-sábado-",
    ...input.semanas.map((semana, i) =>
      semana === input.parcial ? `Semana ${i + 1}\nPARCIAL` : `Semana ${i + 1}\n${formatoCorto(semana)}`,
    ),
  ];
  const filaEncabezado = hoja.getRow(2);
  filaEncabezado.values = encabezados;
  filaEncabezado.height = 32;
  filaEncabezado.eachCell((celda) => {
    celda.fill = relleno(AZUL_OSCURO);
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    celda.border = BORDE;
  });

  let numero = 0;
  for (const grupo of input.grupos) {
    const filaGrupo = hoja.addRow([grupo.rotulo]);
    hoja.mergeCells(filaGrupo.number, 1, filaGrupo.number, totalColumnas);
    filaGrupo.getCell(1).fill = relleno(AZUL_SECCION);
    filaGrupo.getCell(1).font = { bold: true };
    filaGrupo.getCell(1).border = BORDE;

    for (const fila of grupo.filas) {
      numero += 1;
      const excelFila = hoja.addRow([numero, fila.docente, fila.curso, fila.nrc, fila.horario, ...fila.marcas]);
      for (let c = 1; c <= totalColumnas; c += 1) {
        const celda = excelFila.getCell(c);
        celda.border = BORDE;
        if (c > fijas) {
          const semana = input.semanas[c - fijas - 1];
          const marca = fila.marcas[c - fijas - 1];
          celda.alignment = { horizontal: "center", vertical: "middle" };
          if (marca) {
            celda.fill = relleno(RELLENO_MARCA[marca]);
            celda.font = { bold: true };
          } else if (semana === input.parcial) {
            celda.fill = relleno(GRIS_PARCIAL);
          }
        }
      }
    }
  }

  hoja.addRow([]);
  const leyenda = [
    ["X", "Supervisión realizada (incluye las hechas fuera del plan)", "X"],
    ["P", "Supervisión programada", "P"],
    ["NR", "Programada y no realizada", "NR"],
  ] as const;
  for (const [marca, texto, clave] of leyenda) {
    const fila = hoja.addRow(["", marca, texto]);
    fila.getCell(2).fill = relleno(RELLENO_MARCA[clave]);
    fila.getCell(2).alignment = { horizontal: "center" };
    fila.getCell(2).font = { bold: true };
  }

  // ---- Hoja 2: logro semana a semana ----
  const logro = workbook.addWorksheet("Logro semanal");
  logro.columns = [
    { header: "Semana", width: 10 },
    { header: "Sábado", width: 12 },
    { header: "Realizadas", width: 12 },
    { header: "Programadas", width: 13 },
    { header: "Logro esperado (1/semana)", width: 24 },
    { header: "Logro óptimo (2/semana)", width: 22 },
    { header: "Nivel", width: 14 },
  ];
  const niveles: Record<LogroSemana["nivel"], string> = {
    optimo: "Óptimo",
    esperado: "Esperado",
    "sin-logro": "Sin logro",
    futura: "Por venir",
    parcial: "Parciales",
  };
  for (const l of input.logros) {
    logro.addRow([
      l.numero,
      formatoCorto(l.semana),
      l.realizadas,
      l.programadas,
      l.nivel === "futura" || l.nivel === "parcial" ? "" : l.pctEsperado / 100,
      l.nivel === "futura" || l.nivel === "parcial" ? "" : l.pctOptimo / 100,
      niveles[l.nivel],
    ]);
  }
  const cerradas = input.logros.filter((l) => l.nivel !== "futura" && l.nivel !== "parcial");
  if (cerradas.length) {
    const primera = 2;
    const ultima = input.logros.length + 1;
    const total = logro.addRow([
      "Promedio",
      "",
      { formula: `SUM(C${primera}:C${ultima})` },
      { formula: `SUM(D${primera}:D${ultima})` },
      { formula: `AVERAGE(E${primera}:E${ultima})` },
      { formula: `AVERAGE(F${primera}:F${ultima})` },
      "",
    ]);
    total.font = { bold: true };
  }
  logro.getColumn(5).numFmt = "0%";
  logro.getColumn(6).numFmt = "0%";
  logro.getRow(1).eachCell((celda) => {
    celda.fill = relleno(AZUL_OSCURO);
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // ---- Hoja 3: detalle de supervisiones realizadas ----
  const detalle = workbook.addWorksheet("Supervisiones realizadas");
  detalle.columns = [
    { header: "Fecha", width: 12 },
    { header: "Semana", width: 9 },
    { header: "Docente", width: 32 },
    { header: "Curso", width: 36 },
    { header: "Resultado", width: 11 },
    { header: "Origen", width: 22 },
  ];
  for (const r of input.realizadas) {
    detalle.addRow([formatoCorto(r.fecha), r.semana ?? "Fuera del trimestre", r.docente, r.curso, r.porcentaje / 100, r.origen]);
  }
  detalle.getColumn(5).numFmt = "0%";
  detalle.getRow(1).eachCell((celda) => {
    celda.fill = relleno(AZUL_OSCURO);
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `programacion-supervisiones-${input.anio}-T${input.trimestre}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
