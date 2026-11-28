import { getSupabaseClient } from "@/lib/supabase";

/**
 * CAS (Centro de Asistencia Social, UPANA): estudiantes aspirantes a hacer su
 * práctica en el centro. Fase 1: base de datos de aspirantes. Los horarios y
 * asignaciones se agregan después, en tablas propias que apunten a esta.
 */

const TABLA = "gestionesjj_cas_aspirantes";
const SIN_SUPABASE = "Faltan las variables de Supabase.";
/** Ruta pública del formulario de preinscripción. */
export const RUTA_PREINSCRIPCION = "/cas/registro";

export const MIGRACION_PENDIENTE =
  "La tabla del CAS aún no existe: falta aplicar las migraciones 068 y 069 (ver supabase/PENDIENTES.md). Los datos no se pueden guardar hasta entonces.";

export const PRACTICAS = [
  { id: "consejeria_cuarto", nombre: "Práctica en consejería", detalle: "Cuarto año · Consejería familiar", corto: "Consejería · 4.º" },
  { id: "profesional_quinto", nombre: "Práctica profesional", detalle: "Quinto año · Psicología clínica", corto: "Profesional · 5.º" },
] as const;

/** Campus principales de UPANA para la práctica; «Otro» se escribe a mano. */
export const CAMPUS = ["Campus Chimaltenango", "Campus Central", "Campus Naranjo"] as const;

export const MIGRACION_CAMPUS_PENDIENTE =
  "Falta aplicar la migración 073 (ver supabase/PENDIENTES.md): se guardó todo menos el campus.";

/** Clave de filtro: uno de los tres campus principales, «otro» o «sin» (sin dato). */
export function claveCampus(campus: string | null): string {
  if (!campus) return "sin";
  return (CAMPUS as readonly string[]).includes(campus) ? campus : "otro";
}

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
  /** «formulario» si llegó por /cas/registro; «admin» si se registró a mano. */
  origen: "admin" | "formulario";
  disponibilidad: string | null;
  /** Uno de CAMPUS o el texto escrito en «Otro». */
  campus: string | null;
  consentimiento_at: string | null;
  /**
   * Orden de inscripción (1 = el primero en inscribirse). Lo asigna la base al
   * guardar (migración 074) y no se edita. Sin la migración llega undefined y se
   * calcula con numerarOrden().
   */
  orden_inscripcion?: number | null;
  /** Última vez que el estudiante corrigió sus datos en /cas/mis-datos (migración 075). */
  actualizado_por_estudiante_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AspiranteInput = Pick<
  Aspirante,
  "nombre_completo" | "carne" | "practica" | "telefono" | "correo_institucional" | "correo_personal" | "estado" | "notas" | "disponibilidad" | "campus"
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
  if (!supabase) return { error: SIN_SUPABASE, aviso: null as string | null };

  const escribir = (datos: Partial<AspiranteInput>) =>
    id ? supabase.from(TABLA).update(datos).eq("id", id) : supabase.from(TABLA).insert(datos);

  const { error } = await escribir(payload);
  // Sin la migración 073 la columna campus no existe: se guarda lo demás y se avisa.
  if (error && /campus/i.test(error.message) && (error.code === "PGRST204" || /column/i.test(error.message))) {
    const { campus: _sinCampus, ...resto } = payload;
    void _sinCampus;
    const reintento = await escribir(resto);
    return {
      error: reintento.error ? mensajeError(reintento.error) : null,
      aviso: reintento.error ? null : MIGRACION_CAMPUS_PENDIENTE,
    };
  }
  return { error: error ? mensajeError(error) : null, aviso: null as string | null };
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
    disponibilidad: (entrada.disponibilidad ?? "").trim() || null,
    campus: texto(entrada.campus),
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

/**
 * Número de orden de inscripción de cada aspirante (id → número). Usa el número
 * fijo de la base; si aún no existe (migración 074 pendiente), lo calcula por la
 * fecha y hora de registro, que es el mismo criterio: primero en inscribirse,
 * número menor.
 */
export function numerarOrden(lista: Aspirante[]): Map<string, number> {
  const porRegistro = [...lista].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  const mapa = new Map<string, number>();
  porRegistro.forEach((a, i) => mapa.set(a.id, a.orden_inscripcion ?? i + 1));
  return mapa;
}

/**
 * Posibles duplicados: aspirantes que comparten correo (institucional o
 * personal), teléfono (últimos 8 dígitos) o nombre completo con otro registro.
 * Detecta, por ejemplo, a quien se inscribió dos veces con el carné mal escrito.
 * Devuelve id → ids de los otros registros con los que coincide.
 */
export function detectarDuplicados(lista: Aspirante[]): Map<string, string[]> {
  const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const grupos = new Map<string, string[]>();
  const agregar = (clave: string | null, id: string) => {
    if (!clave) return;
    grupos.set(clave, [...(grupos.get(clave) ?? []), id]);
  };
  for (const a of lista) {
    const digitos = (a.telefono ?? "").replace(/\D/g, "");
    agregar(a.correo_institucional ? `c:${a.correo_institucional.toLowerCase()}` : null, a.id);
    agregar(a.correo_personal ? `c:${a.correo_personal.toLowerCase()}` : null, a.id);
    agregar(digitos.length >= 8 ? `t:${digitos.slice(-8)}` : null, a.id);
    agregar(a.nombre_completo ? `n:${sinTildes(a.nombre_completo)}` : null, a.id);
  }
  const resultado = new Map<string, string[]>();
  for (const ids of grupos.values()) {
    const unicos = [...new Set(ids)];
    if (unicos.length < 2) continue;
    for (const id of unicos) {
      const otros = new Set([...(resultado.get(id) ?? []), ...unicos.filter((x) => x !== id)]);
      resultado.set(id, [...otros]);
    }
  }
  return resultado;
}

/** «28 nov 2026, 7:51 a. m.» en hora de Guatemala. */
export function fechaHoraInscripcion(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export async function exportarAspirantesExcel(filas: Aspirante[], orden: Map<string, number>) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Aspirantes CAS");

  hoja.columns = [
    { header: "Orden de inscripción", key: "n", width: 11 },
    { header: "Nombre completo", key: "nombre", width: 36 },
    { header: "ID (carné)", key: "carne", width: 14 },
    { header: "Práctica", key: "practica", width: 34 },
    { header: "Campus", key: "campus", width: 22 },
    { header: "Teléfono", key: "telefono", width: 14 },
    { header: "Correo institucional", key: "ci", width: 32 },
    { header: "Correo personal", key: "cp", width: 30 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Disponibilidad", key: "disp", width: 40 },
    { header: "Notas", key: "notas", width: 40 },
    { header: "Origen", key: "origen", width: 12 },
    { header: "Fecha y hora de inscripción", key: "fecha", width: 24 },
  ];

  // Siempre por orden de inscripción, para ver de un vistazo quién tiene prioridad.
  const ordenadas = [...filas].sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0));
  ordenadas.forEach((a) => {
    const p = practicaDe(a.practica);
    hoja.addRow({
      n: orden.get(a.id) ?? "",
      nombre: a.nombre_completo,
      carne: a.carne,
      practica: `${p.nombre} (${p.detalle})`,
      campus: a.campus ?? "",
      telefono: a.telefono ?? "",
      ci: a.correo_institucional ?? "",
      cp: a.correo_personal ?? "",
      estado: estadoDe(a.estado).nombre,
      disp: a.disponibilidad ?? "",
      notas: a.notas ?? "",
      origen: a.origen === "formulario" ? "Formulario" : "Manual",
      fecha: fechaHoraInscripcion(a.created_at),
    });
  });

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00247B" } };
  encabezado.alignment = { vertical: "middle" };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = { from: "A1", to: "M1" };

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

// ============================================================
// Interruptor del formulario público (migración 070)
// ============================================================

export const MIGRACION_INTERRUPTOR_PENDIENTE =
  "El interruptor necesita la migración 070 (ver supabase/PENDIENTES.md). Mientras tanto, el formulario sigue abierto.";

export type ConfigCas = { formulario_abierto: boolean; mensaje_cerrado: string | null };

export async function fetchConfigCas() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as ConfigCas | null, error: SIN_SUPABASE, faltaTabla: false };

  const { data, error } = await supabase
    .from("gestionesjj_cas_config")
    .select("formulario_abierto, mensaje_cerrado")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    const falta = esTablaFaltante(error);
    return { data: null, error: falta ? MIGRACION_INTERRUPTOR_PENDIENTE : error.message, faltaTabla: falta };
  }
  // Sin fila de configuración el formulario se considera abierto.
  return { data: (data as ConfigCas | null) ?? { formulario_abierto: true, mensaje_cerrado: null }, error: null, faltaTabla: false };
}

export async function guardarConfigCas(config: ConfigCas) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };

  const { error } = await supabase
    .from("gestionesjj_cas_config")
    .upsert({ id: true, ...config, updated_at: new Date().toISOString() });
  if (!error) return { error: null };
  return { error: esTablaFaltante(error) ? MIGRACION_INTERRUPTOR_PENDIENTE : error.message };
}
