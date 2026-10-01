import { getSupabaseClient } from "@/lib/supabase";
import type { PropuestaClinica, SesionModalidad } from "./types";

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

export async function getAccessToken() {
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

export type SugerenciasGeneradas = { seguimiento: string; propuestas: PropuestaClinica[] };

/** Sugerencias de seguimiento y de técnicas/terapias/evaluaciones para la sesión (a pedido). */
export async function generarSugerenciasIA(input: GenerarResumenInput & { resumen: string }) {
  const token = await getAccessToken();
  if (!token) {
    return { data: null as SugerenciasGeneradas | null, noConfigurado: false, error: "Sesión no válida. Vuelve a iniciar." };
  }
  try {
    const response = await fetch("/api/ai/resumen", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, modo: "sugerencias" }),
    });
    if (response.status === 503) {
      return { data: null as SugerenciasGeneradas | null, noConfigurado: true, error: null };
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return {
        data: null as SugerenciasGeneradas | null,
        noConfigurado: false,
        error: body?.error ?? "No se pudieron generar sugerencias.",
      };
    }
    return { data: (await response.json()) as SugerenciasGeneradas, noConfigurado: false, error: null };
  } catch {
    return { data: null as SugerenciasGeneradas | null, noConfigurado: false, error: "Error de conexión al pedir sugerencias." };
  }
}

/** Manda a Telegram los compromisos y tareas con un botón para reenviarlos al paciente por WhatsApp. */
export async function enviarTareasAlPaciente(pacienteId: string, compromisos: string[], tareas: string[]) {
  const token = await getAccessToken();
  if (!token) return { error: "Sesión no válida. Vuelve a iniciar." };
  try {
    const response = await fetch("/api/clinica/enviar-tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pacienteId, compromisos, tareas }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: body?.error ?? "No se pudo enviar a Telegram." };
    }
    return { error: null };
  } catch {
    return { error: "Error de conexión al enviar a Telegram." };
  }
}
