import type { Trimestre } from "@/data/evaluacion";
import type { RangoSupervision } from "@/lib/supervision";
import { getSupabaseClient } from "@/lib/supabase";

// Fechas del periodo de supervision (migracion 040). Viven en la base para
// que el recordatorio de Telegram calcule en el servidor el mismo plan que
// se ve en pantalla, y para verlas igual desde cualquier dispositivo.

type RawPeriodo = {
  inicio_clases: string;
  inicio_plan: string;
  fin: string;
  semana_parcial: number | null;
};

export async function fetchPeriodoSupervision(anio: number, trimestre: Trimestre) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as RangoSupervision | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_supervision_periodos")
    .select("inicio_clases,inicio_plan,fin,semana_parcial")
    .eq("anio", anio)
    .eq("trimestre", trimestre)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  const row = data as RawPeriodo;
  return {
    data: { inicioClases: row.inicio_clases, inicio: row.inicio_plan, fin: row.fin, parcial: row.semana_parcial },
    error: null,
  };
}

export async function guardarPeriodoSupervision(anio: number, trimestre: Trimestre, rango: RangoSupervision) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("gestionesjj_supervision_periodos").upsert(
    {
      created_by: sesion.user.id,
      anio,
      trimestre,
      inicio_clases: rango.inicioClases,
      inicio_plan: rango.inicio,
      fin: rango.fin,
      semana_parcial: rango.parcial,
    },
    { onConflict: "created_by,anio,trimestre" },
  );
  return { error: error?.message ?? null };
}
