import { getSupabaseClient } from "@/lib/supabase";
import type { CitaRow } from "./types";

export type GoogleStatus = {
  configurado: boolean;
  conectado: boolean;
  googleEmail: string | null;
  estado: "conectado" | "revocado" | "error" | null;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) return null;
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const fallback: GoogleStatus = { configurado: false, conectado: false, googleEmail: null, estado: null };
  try {
    const response = await authFetch("/api/google/status");
    if (!response || !response.ok) return fallback;
    return (await response.json()) as GoogleStatus;
  } catch {
    return fallback;
  }
}

export async function startGoogleConnect() {
  try {
    const response = await authFetch("/api/google/oauth/start", { method: "POST" });
    if (!response || !response.ok) {
      const body = response ? ((await response.json().catch(() => null)) as { error?: string } | null) : null;
      return { url: null as string | null, error: body?.error ?? "No se pudo iniciar la conexión con Google." };
    }
    const data = (await response.json()) as { url: string };
    return { url: data.url, error: null };
  } catch {
    return { url: null as string | null, error: "Error de conexión." };
  }
}

export async function disconnectGoogle() {
  try {
    const response = await authFetch("/api/google/disconnect", { method: "POST" });
    if (!response || !response.ok) return { error: "No se pudo desconectar Google Calendar." };
    return { error: null };
  } catch {
    return { error: "Error de conexión." };
  }
}

/**
 * Sincroniza una cita con Google Calendar. Best-effort: nunca lanza, el estado
 * queda registrado en gcal_sync_status por el servidor.
 */
export async function syncCitaConGoogle(citaId: string, action: "create" | "update" | "delete") {
  try {
    await authFetch("/api/google/sync", {
      method: "POST",
      body: JSON.stringify({ citaId, action }),
    });
  } catch {
    // Silencioso: el calendario interno es la fuente de verdad.
  }
}

export type BusyBlock = { inicio: string; fin: string };

export async function fetchGoogleBusy(desdeIso: string, hastaIso: string) {
  try {
    const response = await authFetch(
      `/api/google/freebusy?desde=${encodeURIComponent(desdeIso)}&hasta=${encodeURIComponent(hastaIso)}`
    );
    if (!response || !response.ok) return { busy: [] as BusyBlock[], conectado: false };
    const data = (await response.json()) as { busy?: BusyBlock[]; conectado?: boolean };
    return { busy: data.busy ?? [], conectado: data.conectado ?? false };
  } catch {
    return { busy: [] as BusyBlock[], conectado: false };
  }
}

/** Enlace manual "Añadir a Google Calendar" (fallback sin OAuth). */
export function buildGoogleTemplateLink(cita: CitaRow) {
  const compact = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const nombre = cita.pacienteNombre ?? cita.contactoNombre ?? "Paciente";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Sesión — ${nombre.split(" ")[0]}`,
    dates: `${compact(cita.inicio)}/${compact(cita.fin)}`,
    details: cita.motivo ?? "Sesión clínica",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
