import { getSupabaseClient } from "@/lib/supabase";
import type { SesionModalidad } from "./types";

export type ResumenGenerado = {
  resumen: string;
  seguimiento: string;
  compromisos: string[];
  tareas: string[];
};

export type GenerarResumenInput = {
  notas: string;
  tema: string | null;
  modalidad: SesionModalidad | null;
  resumenAnterior: string | null;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function generarResumenIA(input: GenerarResumenInput) {
  const token = await getAccessToken();
  if (!token) {
    return { data: null as ResumenGenerado | null, noConfigurado: false, error: "Sesión no válida. Vuelve a iniciar." };
  }

  try {
    const response = await fetch("/api/ai/resumen", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });

    if (response.status === 503) {
      return { data: null as ResumenGenerado | null, noConfigurado: true, error: null };
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return {
        data: null as ResumenGenerado | null,
        noConfigurado: false,
        error: body?.error ?? "No se pudo generar el resumen. Escríbelo manualmente.",
      };
    }

    const data = (await response.json()) as ResumenGenerado;
    return { data, noConfigurado: false, error: null };
  } catch {
    return {
      data: null as ResumenGenerado | null,
      noConfigurado: false,
      error: "Error de conexión al generar el resumen. Escríbelo manualmente.",
    };
  }
}
