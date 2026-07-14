import { getSupabaseClient } from "@/lib/supabase";

export const BUCKET = "gestionesjj-cursos";

export async function subirArchivo(path: string, file: File) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  return { error: error?.message ?? null };
}

export async function borrarArchivos(paths: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  if (!paths.length) return { error: null };

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  return { error: error?.message ?? null };
}

export async function copiarArchivo(desde: string, hacia: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.storage.from(BUCKET).copy(desde, hacia);
  return { error: error?.message ?? null };
}

export async function urlFirmada(path: string, expiresSeconds = 3600) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresSeconds);
  if (error) return { url: null as string | null, error: error.message };
  return { url: data?.signedUrl ?? null, error: null };
}

const EXTENSIONES_PDF = ["pdf"];
const EXTENSIONES_OFFICE = ["ppt", "pptx", "doc", "docx", "xls", "xlsx"];
const EXTENSIONES_IMAGEN = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

export function extensionDe(nombre: string): string {
  const partes = nombre.split(".");
  if (partes.length < 2) return "";
  return partes[partes.length - 1].toLowerCase();
}

export function esPdf(mime: string | null | undefined, nombre: string | null | undefined): boolean {
  if (mime?.toLowerCase().includes("pdf")) return true;
  return EXTENSIONES_PDF.includes(extensionDe(nombre ?? ""));
}

export function esPresentacionOffice(mime: string | null | undefined, nombre: string | null | undefined): boolean {
  const mimeLower = (mime ?? "").toLowerCase();
  if (mimeLower.includes("officedocument") || mimeLower.includes("msword") || mimeLower.includes("ms-excel") || mimeLower.includes("ms-powerpoint")) {
    return true;
  }
  return EXTENSIONES_OFFICE.includes(extensionDe(nombre ?? ""));
}

export function esImagen(mime: string | null | undefined, nombre: string | null | undefined): boolean {
  if (mime?.toLowerCase().startsWith("image/")) return true;
  return EXTENSIONES_IMAGEN.includes(extensionDe(nombre ?? ""));
}

export function officeViewerUrl(urlFirmadaValor: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlFirmadaValor)}`;
}

function sanitizarNombre(nombre: string): string {
  const sinAcentos = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const conGuiones = sinAcentos.replace(/\s+/g, "-");
  return conGuiones.replace(/[^a-z0-9._-]/g, "");
}

export function rutaLogoUniversidad(universidadId: string, ext: string): string {
  return `universidades/${universidadId}/logo-${Date.now()}.${ext}`;
}

export function rutaArchivoCurso(cursoId: string, carpeta: string, nombre: string): string {
  const nombreSanitizado = sanitizarNombre(nombre);
  return `cursos/${cursoId}/${carpeta}/${Date.now()}-${nombreSanitizado}`;
}
