import { getSupabaseClient } from "@/lib/supabase";

const DEFAULT_CODIGO = "1234";

export async function fetchKioscoCodigo() {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, codigo: DEFAULT_CODIGO, error: null as string | null };

  const { data, error } = await supabase.from("gestionesjj_config").select("id,kiosco_codigo").limit(1).maybeSingle();
  if (error) return { id: null as string | null, codigo: DEFAULT_CODIGO, error: error.message };
  if (!data) return { id: null as string | null, codigo: DEFAULT_CODIGO, error: null };

  return { id: data.id as string, codigo: data.kiosco_codigo as string, error: null };
}

export async function guardarKioscoCodigo(id: string | null, codigo: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  if (id) {
    const { error } = await supabase
      .from("gestionesjj_config")
      .update({ kiosco_codigo: codigo, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { id, error: error?.message ?? null };
  }

  const { data, error } = await supabase.from("gestionesjj_config").insert({ kiosco_codigo: codigo }).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}
