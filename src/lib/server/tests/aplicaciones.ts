/** Lectura de una aplicación de test, siempre filtrada por la persona dueña. */
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export type AplicacionFila = {
  id: string;
  usuario_id: string;
  instrumento: string;
  opciones: Record<string, unknown>;
  borrador: unknown;
  datos: Record<string, unknown> | null;
  consentimiento_at: string | null;
  alerta: boolean;
  created_at: string;
  completada_at: string | null;
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function aplicacionDe(usuarioId: string, id: string) {
  const admin = getSupabaseAdmin();
  if (!admin || !UUID_RE.test(id)) return { admin, fila: null };
  const { data } = await admin
    .from("tests_aplicaciones")
    .select("id,usuario_id,instrumento,opciones,borrador,datos,consentimiento_at,alerta,created_at,completada_at")
    .eq("id", id)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return { admin, fila: (data as AplicacionFila | null) ?? null };
}
