/**
 * Documentos del expediente (migración 064): fotografías, cartas, materiales,
 * tareas, informes externos y otros archivos (imágenes, PDF y Word) del
 * paciente. Archivos en el bucket privado «gestionesjj-pacientes»; se ven con
 * una URL firmada de pocos minutos. Solo el propietario tiene acceso.
 */
import { getSupabaseClient } from "@/lib/supabase";

export const BUCKET_PACIENTES = "gestionesjj-pacientes";
export const MAX_BYTES_DOCUMENTO = 20 * 1024 * 1024;
const SIN_SUPABASE = "Faltan las variables de Supabase.";
export const MENSAJE_FALTA_MIGRACION =
  "Para activar los documentos del expediente falta aplicar la migración 064 en Supabase (está en supabase/PENDIENTES.md).";

export type CategoriaDocumento = "foto" | "carta" | "material" | "tarea" | "informe_externo" | "documento_legal" | "otro";
export const CATEGORIAS_DOCUMENTO: { id: CategoriaDocumento; nombre: string }[] = [
  { id: "foto", nombre: "Fotografía" },
  { id: "carta", nombre: "Carta" },
  { id: "material", nombre: "Material de sesión" },
  { id: "tarea", nombre: "Tarea del paciente" },
  { id: "informe_externo", nombre: "Informe externo (médico, escolar…)" },
  { id: "documento_legal", nombre: "Documento legal o administrativo" },
  { id: "otro", nombre: "Otro" },
];
export const nombreCategoria = (id: string) => CATEGORIAS_DOCUMENTO.find((c) => c.id === id)?.nombre ?? "Otro";

export type DocumentoRow = {
  id: string;
  pacienteId: string;
  sesionId: string | null;
  categoria: CategoriaDocumento;
  titulo: string;
  nota: string | null;
  fecha: string;
  archivoPath: string;
  archivoNombre: string;
  mime: string | null;
  tamano: number | null;
  createdAt: string;
};

type Raw = {
  id: string;
  paciente_id: string;
  sesion_id: string | null;
  categoria: CategoriaDocumento;
  titulo: string;
  nota: string | null;
  fecha: string;
  archivo_path: string;
  archivo_nombre: string;
  mime: string | null;
  tamano: number | null;
  created_at: string;
};
const COLUMNAS = "id,paciente_id,sesion_id,categoria,titulo,nota,fecha,archivo_path,archivo_nombre,mime,tamano,created_at";
const mapear = (r: Raw): DocumentoRow => ({
  id: r.id,
  pacienteId: r.paciente_id,
  sesionId: r.sesion_id,
  categoria: r.categoria,
  titulo: r.titulo,
  nota: r.nota,
  fecha: r.fecha,
  archivoPath: r.archivo_path,
  archivoNombre: r.archivo_nombre,
  mime: r.mime,
  tamano: r.tamano,
  createdAt: r.created_at,
});

/** ¿El error indica que la tabla o el bucket aún no existen? */
export const faltaMigracion = (mensaje: string | undefined | null) =>
  /does not exist|schema cache|bucket not found|PGRST205|42P01/i.test(mensaje ?? "");

// ============================================================
// Tipos de archivo permitidos
// ============================================================
const EXT_IMAGEN = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];
const EXT_PDF = ["pdf"];
const EXT_WORD = ["doc", "docx"];
export const ACEPTA_ARCHIVOS = "image/*,.heic,.heif,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const extension = (nombre: string) => (nombre.includes(".") ? nombre.split(".").pop()!.toLowerCase() : "");

export type TipoDocumento = "imagen" | "pdf" | "word" | "otro";
export function tipoDocumento(mime: string | null | undefined, nombre: string): TipoDocumento {
  const m = (mime ?? "").toLowerCase();
  const ext = extension(nombre);
  if (m.startsWith("image/") || EXT_IMAGEN.includes(ext)) return "imagen";
  if (m.includes("pdf") || EXT_PDF.includes(ext)) return "pdf";
  if (m.includes("msword") || m.includes("wordprocessingml") || EXT_WORD.includes(ext)) return "word";
  return "otro";
}

/** Tipo MIME que acepta el bucket (algunos teléfonos no lo informan). */
function mimeDe(file: File): string {
  if (file.type) return file.type;
  const ext = extension(file.name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "heic" || ext === "heif") return `image/${ext}`;
  if (ext === "jpg") return "image/jpeg";
  return EXT_IMAGEN.includes(ext) ? `image/${ext}` : "application/octet-stream";
}

export function validarArchivo(file: File): string | null {
  if (tipoDocumento(file.type, file.name) === "otro") return `«${file.name}»: solo se aceptan imágenes, PDF y Word.`;
  if (file.size > MAX_BYTES_DOCUMENTO) return `«${file.name}» pesa más de 20 MB.`;
  return null;
}

export const tamanoLegible = (bytes: number | null) =>
  bytes == null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/**
 * Fotos grandes del teléfono: se reducen a 2400 px y JPEG de buena calidad
 * (suelen bajar de 4–8 MB a menos de 1 MB). Si el navegador no puede
 * procesarla (p. ej. HEIC), se sube tal cual.
 */
async function optimizarImagen(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function nombreSeguro(nombre: string) {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
  return limpio.slice(-80) || "archivo";
}

// ============================================================
// Consultas
// ============================================================
export async function fetchDocumentos(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as DocumentoRow[], error: SIN_SUPABASE, faltaMigracion: false };
  const { data, error } = await supabase
    .from("gestionesjj_paciente_documentos")
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { data: [] as DocumentoRow[], error: error.message, faltaMigracion: faltaMigracion(`${error.code} ${error.message}`) };
  return { data: ((data ?? []) as Raw[]).map(mapear), error: null, faltaMigracion: false };
}

export async function subirDocumento(input: {
  pacienteId: string;
  file: File;
  categoria: CategoriaDocumento;
  titulo: string;
  nota: string;
  fecha: string;
  sesionId: string | null;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as DocumentoRow | null, error: SIN_SUPABASE };
  const invalido = validarArchivo(input.file);
  if (invalido) return { data: null, error: invalido };
  const file = tipoDocumento(input.file.type, input.file.name) === "imagen" ? await optimizarImagen(input.file) : input.file;
  const path = `pacientes/${input.pacienteId}/${crypto.randomUUID()}-${nombreSeguro(file.name)}`;
  const mime = mimeDe(file);
  const { error: errSubida } = await supabase.storage.from(BUCKET_PACIENTES).upload(path, file, { contentType: mime, upsert: false });
  if (errSubida) {
    return { data: null, error: faltaMigracion(errSubida.message) ? MENSAJE_FALTA_MIGRACION : `No se pudo subir «${input.file.name}»: ${errSubida.message}` };
  }
  const { data, error } = await supabase
    .from("gestionesjj_paciente_documentos")
    .insert({
      paciente_id: input.pacienteId,
      sesion_id: input.sesionId,
      categoria: input.categoria,
      titulo: (input.titulo.trim() || input.file.name).slice(0, 160),
      nota: input.nota.trim().slice(0, 2000) || null,
      fecha: input.fecha,
      archivo_path: path,
      archivo_nombre: input.file.name.slice(0, 255),
      mime,
      tamano: file.size,
    })
    .select(COLUMNAS)
    .single();
  if (error) {
    // Sin registro no se deja el archivo suelto.
    await supabase.storage.from(BUCKET_PACIENTES).remove([path]);
    return { data: null, error: faltaMigracion(`${error.code} ${error.message}`) ? MENSAJE_FALTA_MIGRACION : error.message };
  }
  return { data: mapear(data as Raw), error: null };
}

export async function actualizarDocumento(
  id: string,
  cambios: { titulo?: string; nota?: string; categoria?: CategoriaDocumento; fecha?: string; sesionId?: string | null }
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const fila: Record<string, unknown> = {};
  if (cambios.titulo !== undefined) fila.titulo = cambios.titulo.trim().slice(0, 160);
  if (cambios.nota !== undefined) fila.nota = cambios.nota.trim().slice(0, 2000) || null;
  if (cambios.categoria !== undefined) fila.categoria = cambios.categoria;
  if (cambios.fecha !== undefined) fila.fecha = cambios.fecha;
  if (cambios.sesionId !== undefined) fila.sesion_id = cambios.sesionId;
  const { error } = await supabase.from("gestionesjj_paciente_documentos").update(fila).eq("id", id);
  return { error: error?.message ?? null };
}

export async function eliminarDocumento(doc: Pick<DocumentoRow, "id" | "archivoPath">) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_paciente_documentos").delete().eq("id", doc.id);
  if (error) return { error: error.message };
  await supabase.storage.from(BUCKET_PACIENTES).remove([doc.archivoPath]);
  return { error: null };
}

/** URL firmada de pocos minutos; con «descargar» el navegador lo baja con su nombre original. */
export async function urlDocumento(doc: Pick<DocumentoRow, "archivoPath" | "archivoNombre">, descargar = false, segundos = 600) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null as string | null, error: SIN_SUPABASE };
  const { data, error } = await supabase.storage
    .from(BUCKET_PACIENTES)
    .createSignedUrl(doc.archivoPath, segundos, descargar ? { download: doc.archivoNombre } : undefined);
  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

/** Miniaturas: URLs firmadas de varias imágenes a la vez. */
export async function urlsMiniaturas(paths: string[], segundos = 600) {
  const supabase = getSupabaseClient();
  if (!supabase || !paths.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(BUCKET_PACIENTES).createSignedUrls(paths, segundos);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) as Record<string, string>;
}

/** Borra los archivos de un paciente (antes de eliminar su expediente). Si la tabla no existe, no hace nada. */
export async function eliminarArchivosDePaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { data, error } = await supabase.from("gestionesjj_paciente_documentos").select("archivo_path").eq("paciente_id", pacienteId);
  if (error || !data?.length) return;
  await supabase.storage.from(BUCKET_PACIENTES).remove((data as { archivo_path: string }[]).map((d) => d.archivo_path));
}
