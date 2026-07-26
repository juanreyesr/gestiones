import { getSupabaseClient } from "@/lib/supabase";

const DEFAULT_CODIGO = "1234";

type ConfigRow = {
  id: string;
  kiosco_codigo: string;
  clinica_codigo: string | null;
};

/**
 * Lee la fila unica de configuracion: el codigo que desbloquea el modo
 * kiosco de entrevistas y el que protege el area de Clinica.
 *
 * clinicaCodigo llega en null cuando todavia no se ha configurado ninguno;
 * en ese caso el area no pide codigo para no dejar al dueno fuera.
 */
export async function fetchConfigCodigos() {
  const supabase = getSupabaseClient();
  const vacio = {
    id: null as string | null,
    kioscoCodigo: DEFAULT_CODIGO,
    clinicaCodigo: null as string | null,
    error: null as string | null,
  };
  if (!supabase) return vacio;

  const { data, error } = await supabase
    .from("gestionesjj_config")
    .select("id,kiosco_codigo,clinica_codigo")
    .limit(1)
    .maybeSingle();

  if (error) return { ...vacio, error: error.message };
  if (!data) return vacio;

  const row = data as ConfigRow;
  return {
    id: row.id,
    kioscoCodigo: row.kiosco_codigo,
    clinicaCodigo: row.clinica_codigo?.trim() ? row.clinica_codigo : null,
    error: null as string | null,
  };
}

export async function guardarKioscoCodigo(id: string | null, codigo: string) {
  return guardarCodigo(id, { kiosco_codigo: codigo });
}

export async function guardarClinicaCodigo(id: string | null, codigo: string) {
  return guardarCodigo(id, { clinica_codigo: codigo });
}

async function guardarCodigo(id: string | null, campos: { kiosco_codigo?: string; clinica_codigo?: string }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  if (id) {
    const { error } = await supabase
      .from("gestionesjj_config")
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { id, error: error?.message ?? null };
  }

  const { data, error } = await supabase.from("gestionesjj_config").insert(campos).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}
