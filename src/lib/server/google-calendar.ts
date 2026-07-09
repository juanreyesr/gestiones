import { getSupabaseAdmin } from "./supabase-admin";

const OWNER_EMAIL = "lic.juanreyesr@gmail.com";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export type GoogleTokens = {
  id: string;
  owner_email: string;
  google_email: string | null;
  calendar_id: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  estado: "conectado" | "revocado" | "error";
};

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/google/oauth/callback`;
}

export async function getStoredTokens(): Promise<GoogleTokens | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("gestionesjj_google_tokens")
    .select("id,owner_email,google_email,calendar_id,refresh_token,access_token,access_token_expires_at,estado")
    .eq("owner_email", OWNER_EMAIL)
    .maybeSingle();

  return (data as GoogleTokens | null) ?? null;
}

export async function saveTokens(input: {
  refreshToken: string;
  accessToken: string;
  expiresInSeconds: number;
  googleEmail: string | null;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: "Falta SUPABASE_SECRET_KEY en el servidor." };

  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000).toISOString();
  const { error } = await admin.from("gestionesjj_google_tokens").upsert(
    {
      owner_email: OWNER_EMAIL,
      google_email: input.googleEmail,
      refresh_token: input.refreshToken,
      access_token: input.accessToken,
      access_token_expires_at: expiresAt,
      estado: "conectado",
    },
    { onConflict: "owner_email" }
  );
  return { error: error?.message ?? null };
}

export async function deleteTokens() {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("gestionesjj_google_tokens").delete().eq("owner_email", OWNER_EMAIL);
}

async function markTokensEstado(estado: "revocado" | "error") {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("gestionesjj_google_tokens").update({ estado }).eq("owner_email", OWNER_EMAIL);
}

/** Devuelve un access token vigente, refrescándolo si hace falta. */
export async function getValidAccessToken(): Promise<{ token: string | null; error: string | null }> {
  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado === "revocado") {
    return { token: null, error: "Google Calendar no está conectado." };
  }

  const slackMs = 60_000;
  if (
    tokens.access_token &&
    tokens.access_token_expires_at &&
    new Date(tokens.access_token_expires_at).getTime() - slackMs > Date.now()
  ) {
    return { token: tokens.access_token, error: null };
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (body?.error === "invalid_grant") {
      await markTokensEstado("revocado");
      return { token: null, error: "El acceso a Google fue revocado. Vuelve a conectar tu cuenta." };
    }
    await markTokensEstado("error");
    return { token: null, error: "No se pudo refrescar el acceso a Google." };
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const admin = getSupabaseAdmin();
  if (admin) {
    await admin
      .from("gestionesjj_google_tokens")
      .update({
        access_token: data.access_token,
        access_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        estado: "conectado",
      })
      .eq("owner_email", OWNER_EMAIL);
  }
  return { token: data.access_token, error: null };
}

type CitaParaEvento = {
  id: string;
  inicio: string;
  fin: string;
  motivo: string | null;
  nombre: string;
};

function buildEventBody(cita: CitaParaEvento) {
  const primerNombre = cita.nombre.trim().split(/\s+/)[0] || "Paciente";
  return {
    summary: `Sesión — ${primerNombre}`,
    description: cita.motivo ?? "Sesión clínica",
    start: { dateTime: new Date(cita.inicio).toISOString() },
    end: { dateTime: new Date(cita.fin).toISOString() },
    extendedProperties: { private: { gestionesId: cita.id } },
  };
}

async function calendarRequest(token: string, calendarId: string, path: string, init?: RequestInit) {
  return fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function insertEvent(cita: CitaParaEvento) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { eventId: null as string | null, error };
  const tokens = await getStoredTokens();
  const calendarId = tokens?.calendar_id ?? "primary";

  const response = await calendarRequest(token, calendarId, "/events", {
    method: "POST",
    body: JSON.stringify(buildEventBody(cita)),
  });
  if (!response.ok) {
    return { eventId: null as string | null, error: `Google respondió ${response.status}.` };
  }
  const data = (await response.json()) as { id: string };
  return { eventId: data.id, error: null };
}

export async function patchEvent(eventId: string, cita: CitaParaEvento) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { error };
  const tokens = await getStoredTokens();
  const calendarId = tokens?.calendar_id ?? "primary";

  const response = await calendarRequest(token, calendarId, `/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(buildEventBody(cita)),
  });
  if (response.status === 404) {
    // El evento fue borrado en Google: recrearlo.
    const { eventId: nuevoId, error: insertError } = await insertEvent(cita);
    return { error: insertError, nuevoEventId: nuevoId };
  }
  if (!response.ok) return { error: `Google respondió ${response.status}.` };
  return { error: null };
}

export async function deleteEvent(eventId: string) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { error };
  const tokens = await getStoredTokens();
  const calendarId = tokens?.calendar_id ?? "primary";

  const response = await calendarRequest(token, calendarId, `/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    return { error: `Google respondió ${response.status}.` };
  }
  return { error: null };
}

export async function queryFreeBusy(desdeIso: string, hastaIso: string) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { busy: [] as { inicio: string; fin: string }[], error };
  const tokens = await getStoredTokens();
  const calendarId = tokens?.calendar_id ?? "primary";

  const response = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: desdeIso, timeMax: hastaIso, items: [{ id: calendarId }] }),
  });
  if (!response.ok) {
    return { busy: [] as { inicio: string; fin: string }[], error: `Google respondió ${response.status}.` };
  }
  const data = (await response.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const bloques = data.calendars?.[calendarId]?.busy ?? [];
  return { busy: bloques.map((b) => ({ inicio: b.start, fin: b.end })), error: null };
}
