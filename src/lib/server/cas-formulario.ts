import { getSupabaseClient } from "@/lib/supabase";

export type EstadoFormularioCas = { abierto: boolean; mensaje: string | null };

/**
 * Estado del formulario público del CAS (abierto o cerrado desde /admin).
 * Ante cualquier falla (incluida la migración 070 sin aplicar) se considera
 * abierto: cerrar por error dejaría fuera a los estudiantes sin aviso.
 */
export async function estadoFormularioCas(): Promise<EstadoFormularioCas> {
  const supabase = getSupabaseClient();
  if (!supabase) return { abierto: true, mensaje: null };
  const { data, error } = await supabase.rpc("gestionesjj_public_cas_formulario_estado");
  if (error) return { abierto: true, mensaje: null };
  const fila = (Array.isArray(data) ? data[0] : data) as { abierto?: boolean; mensaje?: string | null } | null;
  return { abierto: fila?.abierto !== false, mensaje: fila?.mensaje?.trim() || null };
}
