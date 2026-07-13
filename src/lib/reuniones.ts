import { getSupabaseClient } from "@/lib/supabase";

export type SeguimientoEstado = "pendiente" | "proceso" | "completado";

export type Seguimiento = {
  id: string;
  tarea: string;
  responsable: string;
  fechaEntrega: string;
  estado: SeguimientoEstado;
};

export type ReunionRow = {
  id: string;
  fecha: string;
  notas: string;
  borrador: boolean;
  seguimientos: Seguimiento[];
  created_at: string;
  updated_at: string;
};

export async function fetchReuniones() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as ReunionRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { data: [] as ReunionRow[], error: error.message };
  const rows: ReunionRow[] = ((data ?? []) as ReunionRow[]).map((row) => ({
    ...row,
    seguimientos: row.seguimientos ?? [],
  }));
  return { data: rows, error: null };
}

export async function insertReunion(payload: {
  fecha: string;
  notas: string;
  borrador: boolean;
  seguimientos: Seguimiento[];
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .insert(payload)
    .select("id")
    .single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateReunion(
  id: string,
  payload: { fecha: string; notas: string; borrador: boolean; seguimientos: Seguimiento[] },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function updateSeguimientos(id: string, seguimientos: Seguimiento[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_reuniones_docentes")
    .update({ seguimientos, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteReunion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_reuniones_docentes").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function semaforoReunion(seguimientos: Seguimiento[], hoy: string): "verde" | "amarillo" | "rojo" | "gris" {
  if (!seguimientos.length) return "gris";

  const hayVencida = seguimientos.some(
    (item) => item.fechaEntrega !== "" && item.fechaEntrega < hoy && item.estado !== "completado",
  );
  if (hayVencida) return "rojo";

  if (seguimientos.every((item) => item.estado === "completado")) return "verde";

  const hayAvance = seguimientos.some((item) => item.estado === "proceso" || item.estado === "completado");
  if (hayAvance) return "amarillo";

  return "rojo";
}
