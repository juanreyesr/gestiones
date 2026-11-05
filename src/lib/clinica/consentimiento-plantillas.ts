import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { normalizarPlantilla, PLANTILLA_INICIAL, type PlantillaConsentimiento } from "./consentimiento";

/**
 * Plantilla vigente del consentimiento (la versión más reciente guardada o,
 * si no hay ninguna, la inicial del código). La usan el formulario público y
 * el servidor al registrar la aceptación.
 */
export async function plantillaVigente(supabase: SupabaseClient | null = getSupabaseClient()) {
  if (!supabase) return PLANTILLA_INICIAL;
  const { data, error } = await supabase.rpc("gestionesjj_public_consentimiento_plantilla");
  const fila = (Array.isArray(data) ? data[0] : data) as { version: string; profesional: string; secciones: unknown } | null;
  if (error || !fila) return PLANTILLA_INICIAL;
  return normalizarPlantilla(fila) ?? PLANTILLA_INICIAL;
}

export type VersionPlantilla = PlantillaConsentimiento & { nota: string | null; createdAt: string | null };

/** Historial de versiones (más reciente primero), con la inicial al final. Requiere la sesión del psicólogo. */
export async function fetchVersionesPlantilla() {
  const inicial: VersionPlantilla = { ...PLANTILLA_INICIAL, nota: "Plantilla inicial", createdAt: null };
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [inicial], error: "Faltan las variables de Supabase." };
  const { data, error } = await supabase
    .from("gestionesjj_consentimiento_plantillas")
    .select("numero,profesional,secciones,nota,created_at")
    .order("numero", { ascending: false });
  if (error) return { data: [inicial], error: error.message };
  type Raw = { numero: number; profesional: string; secciones: unknown; nota: string | null; created_at: string };
  const versiones = ((data ?? []) as Raw[]).flatMap((r) => {
    const p = normalizarPlantilla({ version: String(r.numero), profesional: r.profesional, secciones: r.secciones });
    return p ? [{ ...p, nota: r.nota, createdAt: r.created_at }] : [];
  });
  return { data: [...versiones, inicial], error: null };
}

/** Guarda la plantilla como una versión nueva (no se sobrescriben las anteriores). */
export async function guardarVersionPlantilla(plantilla: PlantillaConsentimiento, nota: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const limpia = normalizarPlantilla(plantilla);
  if (!limpia) return { error: "La plantilla necesita al menos una sección con texto." };
  const { error } = await supabase.from("gestionesjj_consentimiento_plantillas").insert({
    profesional: limpia.profesional,
    secciones: limpia.secciones,
    nota: nota.trim().slice(0, 300) || null,
  });
  return { error: error?.message ?? null };
}
