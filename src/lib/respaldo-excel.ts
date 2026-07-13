import { getSupabaseClient } from "@/lib/supabase";

/**
 * Tablas incluidas en el respaldo descargable. Se excluye
 * gestionesjj_google_tokens porque contiene credenciales que no deben
 * salir de la base de datos.
 */
const TABLAS: Array<{ tabla: string; hoja: string }> = [
  { tabla: "evaluaciones_docentes", hoja: "Evaluaciones" },
  { tabla: "gestionesjj_reuniones_docentes", hoja: "Reuniones" },
  { tabla: "gestionesjj_docentes", hoja: "Docentes" },
  { tabla: "gestionesjj_cursos", hoja: "Cursos" },
  { tabla: "gestionesjj_carreras", hoja: "Carreras" },
  { tabla: "gestionesjj_ofertas", hoja: "Ofertas" },
  { tabla: "gestionesjj_pacientes", hoja: "Pacientes" },
  { tabla: "gestionesjj_sesiones", hoja: "Sesiones clinica" },
  { tabla: "gestionesjj_citas", hoja: "Citas" },
  { tabla: "gestionesjj_solicitudes_cita", hoja: "Solicitudes de cita" },
  { tabla: "gestionesjj_compromisos", hoja: "Compromisos" },
  { tabla: "gestionesjj_disponibilidad", hoja: "Disponibilidad" },
];

function celda(valor: unknown): string | number | boolean {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") return JSON.stringify(valor);
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") return valor;
  return String(valor);
}

/**
 * Descarga un respaldo completo de los datos en un solo archivo Excel,
 * con una hoja por tabla. Devuelve las tablas que no se pudieron leer.
 */
export async function exportRespaldoToExcel(): Promise<{ error: string | null; omitidas: string[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase.", omitidas: [] };

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const omitidas: string[] = [];
  let hojasConDatos = 0;

  for (const { tabla, hoja } of TABLAS) {
    const { data, error } = await supabase.from(tabla).select("*");
    if (error) {
      omitidas.push(tabla);
      continue;
    }

    const filas = (Array.isArray(data) ? data : data ? [data] : []) as Array<Record<string, unknown>>;
    const sheet = workbook.addWorksheet(hoja);

    const columnas = Array.from(new Set(filas.flatMap((fila) => Object.keys(fila))));
    if (!columnas.length) {
      sheet.addRow(["(sin registros)"]);
      continue;
    }

    const encabezado = sheet.addRow(columnas);
    encabezado.font = { bold: true };
    for (const fila of filas) {
      sheet.addRow(columnas.map((col) => celda(fila[col])));
    }
    sheet.columns.forEach((col, index) => {
      col.width = Math.min(40, Math.max(12, columnas[index]?.length ?? 12));
    });
    hojasConDatos += 1;
  }

  if (!hojasConDatos) {
    return { error: "No se pudo leer ninguna tabla para el respaldo.", omitidas };
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `respaldo-gestionesjj-${fecha}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { error: null, omitidas };
}
