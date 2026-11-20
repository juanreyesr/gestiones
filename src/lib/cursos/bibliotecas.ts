import { bibliotecaPorId } from "@/lib/bibliotecas";
import { getSupabaseClient } from "@/lib/supabase";

/** Mensaje claro si la migración 067 aún no está aplicada. */
export const SIN_MIGRACION_BIBLIOTECAS =
  "Falta aplicar la migración 067 (bibliotecas por curso). Está en supabase/PENDIENTES.md; mientras tanto el Aula sigue sin bibliotecas.";

const faltaTabla = (m: string) => /gestionesjj_curso_bibliotecas|does not exist|schema cache|42P01|PGRST205/i.test(m);

/** Bibliotecas activas en un curso (docente). Solo ids que existen en el código. */
export async function fetchBibliotecasCurso(cursoId: string): Promise<{ ids: string[]; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ids: [], error: "Faltan las variables de Supabase." };
  const { data, error } = await supabase.from("gestionesjj_curso_bibliotecas").select("biblioteca_id").eq("curso_id", cursoId);
  if (error) return { ids: [], error: faltaTabla(error.message) ? SIN_MIGRACION_BIBLIOTECAS : error.message };
  return { ids: ((data ?? []) as { biblioteca_id: string }[]).map((r) => r.biblioteca_id).filter((id) => bibliotecaPorId(id)), error: null };
}

/** Activa o desactiva una biblioteca en un curso (docente). */
export async function setBibliotecaCurso(cursoId: string, bibliotecaId: string, activa: boolean) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  if (!bibliotecaPorId(bibliotecaId)) return { error: "Esa biblioteca no existe." };
  const { error } = activa
    ? await supabase.from("gestionesjj_curso_bibliotecas").upsert({ curso_id: cursoId, biblioteca_id: bibliotecaId }, { onConflict: "curso_id,biblioteca_id", ignoreDuplicates: true })
    : await supabase.from("gestionesjj_curso_bibliotecas").delete().eq("curso_id", cursoId).eq("biblioteca_id", bibliotecaId);
  if (error) return { error: faltaTabla(error.message) ? SIN_MIGRACION_BIBLIOTECAS : error.message };
  return { error: null };
}
