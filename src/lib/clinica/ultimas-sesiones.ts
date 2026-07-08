import { getSupabaseClient } from "@/lib/supabase";

/** Mapa paciente_id -> fecha ISO de su última sesión finalizada. */
export async function fetchUltimasSesiones() {
  const supabase = getSupabaseClient();
  if (!supabase) return {} as Record<string, string>;

  const { data, error } = await supabase
    .from("gestionesjj_sesiones")
    .select("paciente_id,iniciada_at")
    .eq("estado", "finalizada")
    .order("iniciada_at", { ascending: false })
    .limit(1000);

  if (error || !data) return {} as Record<string, string>;

  const resultado: Record<string, string> = {};
  for (const row of data as { paciente_id: string; iniciada_at: string }[]) {
    if (!resultado[row.paciente_id]) {
      resultado[row.paciente_id] = row.iniciada_at;
    }
  }
  return resultado;
}
