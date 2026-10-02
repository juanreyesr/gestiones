import { getSupabaseClient } from "@/lib/supabase";

const SIN_SUPABASE = "Faltan las variables de Supabase.";

/** Mensaje de WhatsApp programado: a su hora llega a Telegram con un boton para enviarlo (migracion 046). */
export type MensajeProgramadoRow = {
  id: string;
  telefono: string;
  mensaje: string;
  programado_para: string;
  avisado_at: string | null;
  intentos: number;
  error: string | null;
  created_at: string;
};

export type MensajeProgramadoPayload = Pick<MensajeProgramadoRow, "telefono" | "mensaje" | "programado_para">;

export async function fetchMensajesProgramados() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as MensajeProgramadoRow[], error: SIN_SUPABASE };

  const { data, error } = await supabase
    .from("gestionesjj_mensajes_programados")
    .select("id,telefono,mensaje,programado_para,avisado_at,intentos,error,created_at")
    .order("programado_para", { ascending: false })
    .limit(200);

  if (error) return { data: [] as MensajeProgramadoRow[], error: error.message };
  return { data: (data ?? []) as MensajeProgramadoRow[], error: null };
}

export async function insertMensajeProgramado(payload: MensajeProgramadoPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_mensajes_programados").insert(payload);
  return { error: error?.message ?? null };
}

/** Guardar cambios lo deja otra vez por avisar (con los intentos en cero). */
export async function updateMensajeProgramado(id: string, payload: MensajeProgramadoPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase
    .from("gestionesjj_mensajes_programados")
    .update({ ...payload, avisado_at: null, intentos: 0, error: null })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteMensajeProgramado(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_mensajes_programados").delete().eq("id", id);
  return { error: error?.message ?? null };
}
