import { getSupabaseClient } from "@/lib/supabase";

const BUCKET = "gestionesjj-perfiles";

export type PerfilEstudianteGlobal = {
  foto_path: string | null;
  fecha_nacimiento: string | null;
  pais: string | null;
  reflexion_quien_soy: string | null;
  reflexion_proposito: string | null;
  reflexion_recuerdo: string | null;
};

/** Ficha de perfil que el propio estudiante llenó (identidad global, no por curso). El owner ya tiene acceso directo por RLS. */
export async function fetchPerfilEstudianteGlobal(estudianteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as PerfilEstudianteGlobal | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_estudiantes")
    .select("foto_path, fecha_nacimiento, pais, reflexion_quien_soy, reflexion_proposito, reflexion_recuerdo")
    .eq("id", estudianteId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as PerfilEstudianteGlobal | null, error: null };
}

/** Perfiles globales de varios estudiantes a la vez (para el reporte del curso). Clave: id global (gestionesjj_estudiantes.id). */
export async function fetchPerfilesGlobalesPorIds(estudianteIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: new Map<string, PerfilEstudianteGlobal>(), error: "Faltan las variables de Supabase." };
  if (!estudianteIds.length) return { data: new Map<string, PerfilEstudianteGlobal>(), error: null };

  const { data, error } = await supabase
    .from("gestionesjj_estudiantes")
    .select("id, foto_path, fecha_nacimiento, pais, reflexion_quien_soy, reflexion_proposito, reflexion_recuerdo")
    .in("id", estudianteIds);

  if (error) return { data: new Map<string, PerfilEstudianteGlobal>(), error: error.message };

  const mapa = new Map<string, PerfilEstudianteGlobal>();
  for (const fila of (data ?? []) as Array<PerfilEstudianteGlobal & { id: string }>) {
    mapa.set(fila.id, fila);
  }
  return { data: mapa, error: null };
}

export async function urlFirmadaFotoPerfil(fotoPath: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fotoPath, 300);
  if (error || !data) return { url: null, error: error?.message ?? "No se pudo abrir la foto." };
  return { url: data.signedUrl, error: null };
}

/** Descarga una foto de perfil y la convierte a data URL, lista para jsPDF `addImage`. */
export async function fotoPerfilComoDataUrl(fotoPath: string): Promise<string | null> {
  const { url } = await urlFirmadaFotoPerfil(fotoPath);
  if (!url) return null;
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    return await new Promise<string | null>((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve(typeof lector.result === "string" ? lector.result : null);
      lector.onerror = () => resolve(null);
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
