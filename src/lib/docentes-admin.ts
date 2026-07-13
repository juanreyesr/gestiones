import { getSupabaseClient } from "@/lib/supabase";

export type DocenteAdminRow = {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  codigo: string | null;
  femenino: boolean;
  activo: boolean;
};

export async function fetchDocentesAdmin() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as DocenteAdminRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_docentes")
    .select("id,nombre,correo,telefono,codigo,femenino,activo")
    .order("nombre");

  if (error) return { data: [] as DocenteAdminRow[], error: error.message };
  return { data: (data ?? []) as DocenteAdminRow[], error: null };
}

export type DocenteAdminPayload = {
  nombre: string;
  correo: string | null;
  telefono: string | null;
  codigo: string | null;
  femenino: boolean;
  activo: boolean;
};

export async function upsertDocenteAdmin(id: string | null, payload: DocenteAdminPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  if (id) {
    const { error } = await supabase.from("gestionesjj_docentes").update(payload).eq("id", id);
    return { id, error: error?.message ?? null };
  }

  const { data, error } = await supabase.from("gestionesjj_docentes").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}
