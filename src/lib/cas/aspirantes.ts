import { getSupabaseClient } from "@/lib/supabase";

/**
 * CAS (Centro de Asistencia Social, UPANA): estudiantes aspirantes a hacer su
 * práctica en el centro. Fase 1: base de datos de aspirantes. Los horarios y
 * asignaciones se agregan después, en tablas propias que apunten a esta.
 */

const TABLA = "gestionesjj_cas_aspirantes";
const SIN_SUPABASE = "Faltan las variables de Supabase.";
export const MIGRACION_PENDIENTE =
  "La tabla del CAS aún no existe: falta aplicar la migración 068 (ver supabase/PENDIENTES.md). Los datos no se pueden guardar hasta entonces.";

export const PRACTICAS = [
  { id: "consejeria_cuarto", nombre: "Práctica en consejería", detalle: "Cuarto año · Consejería familiar", corto: "Consejería · 4.º" },
  { id: "profesional_quinto", nombre: "Práctica profesional", detalle: "Quinto año · Psicología clínica", corto: "Profesional · 5.º" },
] as const;

export type PracticaId = (typeof PRACTICAS)[number]["id"];

export const ESTADOS = [
  { id: "aspirante", nombre: "Aspirante", color: "#00247B" },
  { id: "contactado", nombre: "Contactado", color: "#1A4582" },
  { id: "en_proceso", nombre: "En proceso", color: "#FFA900" },
  { id: "aceptado", nombre: "Aceptado", color: "#5E8F1A" },
  { id: "en_espera", nombre: "En espera", color: "#54595F" },
  { id: "no_continua", nombre: "No continúa", color: "#B42318" },
] as const;

export type EstadoId = (typeof ESTADOS)[number]["id"];

export type Aspirante = {
  id: string;
  nombre_completo: string;
  carne: string;
  practica: PracticaId;
  telefono: string | null;
  correo_institucional: string | null;
  correo_personal: string | null;
  estado: EstadoId;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type AspiranteInput = Pick<
  Aspirante,
  "nombre_completo" | "carne" | "practica" | "telefono" | "correo_institucional" | "correo_personal" | "estado" | "notas"
>;

export const practicaDe = (id: string) => PRACTICAS.find((p) => p.id === id) ?? PRACTICAS[0];
export const estadoDe = (id: string) => ESTADOS.find((e) => e.id === id) ?? ESTADOS[0];

const esTablaFaltante = (error: { code?: string; message: string }) =>
  error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message);

/** Traduce los errores de Postgres que el usuario puede provocar al guardar. */
function mensajeError(error: { code?: string; message: string }) {
  if (esTablaFaltante(error)) return MIGRACION_PENDIENTE;
  if (error.code === "23505") return "Ya existe un aspirante con ese ID (carné).";
  if (error.code === "23514") return "Algún dato no tiene el formato esperado (revisa los correos y el nombre).";
  return error.message;
}

export async function fetchAspirantes() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as Aspirante[], error: SIN_SUPABASE, faltaTabla: false };

  const { data, error } = await supabase.from(TABLA).select("*").order("nombre_completo");
  if (error) return { data: [] as Aspirante[], error: mensajeError(error), faltaTabla: esTablaFaltante(error) };
  return { data: (data ?? []) as Aspirante[], error: null, faltaTabla: false };
}

export async function guardarAspirante(id: string | null, payload: AspiranteInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = id
    ? await supabase.from(TABLA).update(payload).eq("id", id)
    : await supabase.from(TABLA).insert(payload);
  return { error: error ? mensajeError(error) : null };
}

export async function borrarAspirante(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase.from(TABLA).delete().eq("id", id);
  return { error: error ? mensajeError(error) : null };
}

/** Limpia espacios y deja los vacíos en null, para que la base no guarde "". */
export function normalizarAspirante(entrada: AspiranteInput): AspiranteInput {
  const texto = (v: string | null) => {
    const limpio = (v ?? "").replace(/\s+/g, " ").trim();
    return limpio === "" ? null : limpio;
  };
  const correo = (v: string | null) => texto(v)?.toLowerCase() ?? null;
  return {
    nombre_completo: texto(entrada.nombre_completo) ?? "",
    carne: (texto(entrada.carne) ?? "").toUpperCase(),
    practica: entrada.practica,
    telefono: texto(entrada.telefono),
    correo_institucional: correo(entrada.correo_institucional),
    correo_personal: correo(entrada.correo_personal),
    estado: entrada.estado,
    notas: (entrada.notas ?? "").trim() || null,
  };
}

const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Valida lo mínimo para que el registro sirva; devuelve el primer problema o null. */
export function validarAspirante(a: AspiranteInput): string | null {
  if (a.nombre_completo.length < 3) return "Escribe el nombre completo.";
  if (!a.carne) return "Escribe el ID (carné) del estudiante.";
  if (!a.telefono && !a.correo_institucional && !a.correo_personal)
    return "Agrega al menos un medio de contacto (teléfono o correo).";
  if (a.correo_institucional && !CORREO_RE.test(a.correo_institucional)) return "El correo institucional no es válido.";
  if (a.correo_personal && !CORREO_RE.test(a.correo_personal)) return "El correo personal no es válido.";
  if (a.telefono && a.telefono.replace(/\D/g, "").length < 8) return "El teléfono debe tener al menos 8 dígitos.";
  return null;
}

/** Enlace de WhatsApp: si el número tiene 8 dígitos se asume Guatemala (+502). */
export function enlaceWhatsApp(telefono: string | null) {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 8) return null;
  return `https://wa.me/${digitos.length === 8 ? `502${digitos}` : digitos}`;
}

export async function exportarAspirantesExcel(filas: Aspirante[]) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Aspirantes CAS");

  hoja.columns = [
    { header: "No.", key: "n", width: 6 },
    { header: "Nombre completo", key: "nombre", width: 36 },
    { header: "ID (carné)", key: "carne", width: 14 },
    { header: "Práctica", key: "practica", width: 34 },
    { header: "Teléfono", key: "telefono", width: 14 },
    { header: "Correo institucional", key: "ci", width: 32 },
    { header: "Correo personal", key: "cp", width: 30 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Notas", key: "notas", width: 40 },
    { header: "Registrado", key: "fecha", width: 12 },
  ];

  filas.forEach((a, i) => {
    const p = practicaDe(a.practica);
    hoja.addRow({
      n: i + 1,
      nombre: a.nombre_completo,
      carne: a.carne,
      practica: `${p.nombre} (${p.detalle})`,
      telefono: a.telefono ?? "",
      ci: a.correo_institucional ?? "",
      cp: a.correo_personal ?? "",
      estado: estadoDe(a.estado).nombre,
      notas: a.notas ?? "",
      fecha: a.created_at.slice(0, 10),
    });
  });

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00247B" } };
  encabezado.alignment = { vertical: "middle" };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = { from: "A1", to: "J1" };

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `cas-aspirantes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
