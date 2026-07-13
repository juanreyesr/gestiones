import type { Trimestre } from "@/data/evaluacion";
import type { DocenteAdminRow } from "@/lib/docentes-admin";
import type { OfertaCurso } from "@/lib/ofertas";

// Estos rotulos son el documento oficial que se exporta (no strings de UI),
// por eso llevan acentos a diferencia del resto del codigo fuente.
const GRUPO_LABELS: Record<number, string> = {
  1: "Sábado Primer Año",
  2: "Sábado Segundo Año",
  3: "Sábado Tercer Año",
  4: "Sábado Cuarto Año",
  5: "Sábado Quinto Año",
};

const COLUMNAS = [
  "Identificador",
  "Carrera",
  "No. estudiantes",
  "Edificio",
  "NRC",
  "Curso",
  "Docente",
  "Horario",
  "ID",
  "Correo",
  "Telefono",
];

const ANCHOS = [14, 10, 12, 10, 8, 38, 24, 26, 12, 26, 12];

const BORDE_FINO = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

export async function exportOfertaToExcel(input: {
  carreraNombre: string;
  anio: number;
  trimestre: Trimestre;
  cursos: OfertaCurso[];
  docentes: DocenteAdminRow[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Oferta");

  sheet.columns = ANCHOS.map((width) => ({ width }));

  const headerRow = sheet.addRow(COLUMNAS);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4C7D8" } };
    cell.font = { bold: true };
    cell.border = BORDE_FINO;
  });

  const docentesPorId = new Map(input.docentes.map((docente) => [docente.id, docente]));

  for (let anioCarrera = 1; anioCarrera <= 5; anioCarrera += 1) {
    const cursosGrupo = input.cursos.filter((curso) => curso.anioCarrera === anioCarrera);
    if (!cursosGrupo.length) continue;

    const filaInicio = sheet.rowCount + 1;

    cursosGrupo.forEach((curso) => {
      const docente = curso.docenteId && !curso.esCas ? (docentesPorId.get(curso.docenteId) ?? null) : null;
      const fila = sheet.addRow([
        GRUPO_LABELS[anioCarrera],
        input.carreraNombre,
        curso.noEstudiantes,
        curso.virtual ? "Virtual" : curso.edificio,
        curso.nrc,
        curso.nombre,
        curso.esCas ? "CAS" : (docente?.nombre ?? ""),
        curso.horario ?? "",
        docente?.codigo ?? "",
        docente?.correo ?? "",
        docente?.telefono ?? "",
      ]);
      fila.eachCell((cell) => {
        cell.border = BORDE_FINO;
      });
      fila.getCell(10).font = { bold: true };
    });

    const filaFin = sheet.rowCount;
    if (filaFin > filaInicio) {
      sheet.mergeCells(filaInicio, 1, filaFin, 1);
      sheet.mergeCells(filaInicio, 2, filaFin, 2);
    }

    sheet.addRow([]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `oferta-academica-${input.anio}-T${input.trimestre}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
