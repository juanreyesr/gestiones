import { getSupabaseClient } from "@/lib/supabase";
import { urlPublica } from "@/lib/url-publica";

const TABLA = "gestionesjj_coordinacion_resumen_enlaces";

/**
 * Enlaces de solo lectura del "Resumen general" de Coordinacion. Se comparten
 * con jefatura: quien los abre ve todos los trimestres y todos los anios, pero
 * no puede crear, editar ni borrar nada (la pagina publica no expone ninguna
 * escritura y la RPC solo lee).
 */
export type EnlaceResumen = {
  id: string;
  etiqueta: string;
  token: string;
  activo: boolean;
  mostrar_docentes: boolean;
  vistas: number;
  ultima_vista_at: string | null;
  created_at: string;
};

export function enlaceResumenUrl(token: string) {
  return urlPublica(`/resumen/${token}`);
}

export async function fetchEnlacesResumen() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as EnlaceResumen[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from(TABLA).select("*").order("created_at", { ascending: false });
  if (error) return { data: [] as EnlaceResumen[], error: error.message };
  return { data: (data ?? []) as EnlaceResumen[], error: null };
}

export async function crearEnlaceResumen(etiqueta: string, mostrarDocentes: boolean) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as EnlaceResumen | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from(TABLA)
    .insert({ etiqueta: etiqueta.trim(), mostrar_docentes: mostrarDocentes })
    .select("*")
    .single();

  if (error) return { data: null as EnlaceResumen | null, error: error.message };
  return { data: data as EnlaceResumen, error: null };
}

export async function actualizarEnlaceResumen(
  id: string,
  patch: Partial<Pick<EnlaceResumen, "activo" | "etiqueta" | "mostrar_docentes">>,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from(TABLA).update(patch).eq("id", id);
  return { error: error?.message ?? null };
}

export async function eliminarEnlaceResumen(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from(TABLA).delete().eq("id", id);
  return { error: error?.message ?? null };
}
