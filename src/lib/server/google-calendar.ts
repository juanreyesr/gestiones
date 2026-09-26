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

/**
 * Origen desde el que se hace la conexion con Google. La cookie de estado de
 * OAuth y la sesion de Supabase viven por dominio, asi que el callback debe
 * volver al mismo dominio donde se inicio (www.juanjreyes.org o
 * gestionesjj.vercel.app). Solo se aceptan dominios conocidos; cualquier
 * otro cae a NEXT_PUBLIC_APP_URL. Cada origen debe estar registrado como URI
 * de redireccion en Google Cloud Console.
 */
export function getAppOrigin(request?: Request) {
  const configurado = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  if (!request) return configurado;
  const origen = new URL(request.url).origin;
  const permitidos = new Set([configurado, "https://www.juanjreyes.org", "https://gestionesjj.vercel.app", "http://localhost:3000"]);
  return permitidos.has(origen) ? origen : configurado;
}

export function getGoogleRedirectUri(request?: Request) {
  return `${getAppOrigin(request)}/api/google/oauth/callback`;
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

type CalendarioGoogle = { id: string; nombre: string; principal: boolean };

/**
 * Calendarios que cuentan como "ocupado": el configurado (principal) mas
 * todos los que el owner tiene visibles en Google Calendar (compartidos,
 * suscritos, de otros sistemas sincronizados con su cuenta...). Asi un
 * compromiso agendado fuera de GestionesJJ tambien bloquea ese horario.
 */
async function calendariosVisibles(token: string, calendarioPrincipal: string): Promise<CalendarioGoogle[]> {
  const principal: CalendarioGoogle = { id: calendarioPrincipal, nombre: "Principal", principal: true };
  const response = await fetch(`${CALENDAR_API}/users/me/calendarList?minAccessRole=freeBusyReader&maxResults=250`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [principal];

  const data = (await response.json()) as {
    items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean; selected?: boolean; hidden?: boolean; deleted?: boolean }[];
  };
  const visibles = (data.items ?? [])
    .filter((c) => !c.deleted && !c.hidden && (c.selected || c.primary || c.id === calendarioPrincipal))
    .map((c) => ({
      id: c.id,
      nombre: c.summaryOverride || c.summary || c.id,
      principal: Boolean(c.primary) || c.id === calendarioPrincipal,
    }));
  if (!visibles.some((c) => c.principal)) visibles.unshift(principal);
  return visibles;
}

export async function queryFreeBusy(desdeIso: string, hastaIso: string) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { busy: [] as { inicio: string; fin: string }[], error };
  const tokens = await getStoredTokens();
  const calendarios = await calendariosVisibles(token, tokens?.calendar_id ?? "primary");

  const response = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: desdeIso,
      timeMax: hastaIso,
      // freeBusy acepta hasta 50 calendarios por consulta.
      items: calendarios.slice(0, 50).map((c) => ({ id: c.id })),
    }),
  });
  if (!response.ok) {
    return { busy: [] as { inicio: string; fin: string }[], error: `Google respondió ${response.status}.` };
  }
  const data = (await response.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
  };
  // Se unen los bloques ocupados de todos los calendarios; los que respondan
  // con error (sin permiso, borrados) simplemente no aportan bloques.
  const bloques = Object.values(data.calendars ?? {}).flatMap((c) => c.busy ?? []);
  return { busy: bloques.map((b) => ({ inicio: b.start, fin: b.end })), error: null };
}

export type EventoGoogle = {
  id: string;
  titulo: string;
  calendarioId: string;
  calendario: string;
  calendarioPrincipal: boolean;
  inicio: string;
  fin: string;
  todoElDia: boolean;
  ubicacion: string | null;
  /** Enlace de Google Meet, si el evento tiene videollamada. */
  videollamada: string | null;
  descripcion: string | null;
  invitados: { email: string | null; nombre: string | null; yo: boolean; organizador: boolean }[];
  /** Id de la cita de GestionesJJ si el evento lo creo la propia app. */
  gestionesId: string | null;
};

type RawEvento = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  hangoutLink?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; organizer?: boolean; email?: string; displayName?: string; responseStatus?: string }[];
  extendedProperties?: { private?: { gestionesId?: string } };
};

/**
 * Eventos de todos los calendarios visibles entre dos instantes, ordenados.
 * Omite los cancelados, los marcados como "Disponible" (transparentes, p. ej.
 * cumpleanos y feriados) y los que el owner rechazo.
 */
export async function listarEventos(desdeIso: string, hastaIso: string) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { eventos: [] as EventoGoogle[], error };
  const tokens = await getStoredTokens();
  const calendarios = await calendariosVisibles(token, tokens?.calendar_id ?? "primary");

  const params = new URLSearchParams({
    timeMin: desdeIso,
    timeMax: hastaIso,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const porCalendario = await Promise.all(
    calendarios.slice(0, 20).map(async (calendario) => {
      const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendario.id)}/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [] as EventoGoogle[];
      const data = (await response.json()) as { items?: RawEvento[] };
      return (data.items ?? [])
        .filter(
          (e) =>
            e.status !== "cancelled" &&
            e.transparency !== "transparent" &&
            !e.attendees?.some((a) => a.self && a.responseStatus === "declined"),
        )
        .map((e): EventoGoogle => {
          const todoElDia = !e.start?.dateTime;
          return {
            id: e.id,
            titulo: e.summary?.trim() || "(Sin título)",
            calendarioId: calendario.id,
            calendario: calendario.nombre,
            calendarioPrincipal: calendario.principal,
            // Los eventos de todo el dia traen solo la fecha; se fijan a medianoche de Guatemala.
            inicio: e.start?.dateTime ?? `${e.start?.date}T00:00:00-06:00`,
            fin: e.end?.dateTime ?? `${e.end?.date}T00:00:00-06:00`,
            todoElDia,
            ubicacion: e.location?.trim() || null,
            videollamada: e.hangoutLink ?? null,
            descripcion: e.description ?? null,
            invitados: (e.attendees ?? []).map((a) => ({
              email: a.email ?? null,
              nombre: a.displayName ?? null,
              yo: Boolean(a.self),
              organizador: Boolean(a.organizer),
            })),
            gestionesId: e.extendedProperties?.private?.gestionesId ?? null,
          };
        });
    }),
  );

  const eventos = porCalendario.flat().sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  return { eventos, error: null };
}

/**
 * Estado actual de un evento puntual: si sigue existiendo (y en que horario)
 * o si fue borrado/cancelado. "error" cuando no se pudo saber (sin acceso,
 * Google caido): quien llama no debe tomar decisiones con eso.
 */
export async function obtenerEvento(calendarId: string, eventId: string) {
  const { token } = await getValidAccessToken();
  if (!token) return { estado: "error" as const };
  const response = await calendarRequest(token, calendarId, `/events/${encodeURIComponent(eventId)}`);
  if (response.status === 404 || response.status === 410) return { estado: "no_existe" as const };
  if (!response.ok) return { estado: "error" as const };
  const e = (await response.json()) as RawEvento;
  if (e.status === "cancelled") return { estado: "no_existe" as const };
  return {
    estado: "existe" as const,
    inicio: e.start?.dateTime ?? `${e.start?.date}T00:00:00-06:00`,
    fin: e.end?.dateTime ?? `${e.end?.date}T00:00:00-06:00`,
  };
}

/**
 * Marca un evento que creo otro sistema (Calendly...) como enlazado a una
 * cita de GestionesJJ, para que la agenda y los avisos no lo cuenten dos
 * veces. Solo agrega la propiedad privada; no toca titulo ni descripcion.
 */
export async function marcarEventoGestiones(calendarId: string, eventId: string, citaId: string) {
  const { token, error } = await getValidAccessToken();
  if (!token) return { error };
  const response = await calendarRequest(token, calendarId, `/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify({ extendedProperties: { private: { gestionesId: citaId } } }),
  });
  return { error: response.ok ? null : `Google respondió ${response.status}.` };
}
