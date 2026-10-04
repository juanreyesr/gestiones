import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enlaceWhatsApp, formatear } from "@/lib/clinica/recordatorio";
import { horaGuatemala, saludoPorHora } from "@/lib/control-revision-mensajes";
import { mismaHoraQueConsultorio, nombreZona, paisDe, ZONA_CONSULTORIO, zonaDe } from "@/lib/paises";
import { appUrl } from "./telegram";
import { leerUbicacionConsultorio } from "./telegram-enlaces";

// Confirmacion de cita al paciente (boton de Telegram al aprobar una solicitud).
// - /api/wa/cita?t=...  arma el mensaje de WhatsApp al tocar el boton (saludo
//   segun la hora) y redirige a wa.me.
// - /cita/<t>           pagina publica de la cita con "Agregar a mi calendario"
//   (.ics con recordatorio un dia antes) y "Google Calendar".
// El token es el id de la cita firmado (HMAC con llave derivada de CRON_SECRET):
// nadie puede ver otras citas cambiando el enlace.

const DOMINIO_OFICIAL = "https://www.juanjreyes.org";

function llave() {
  const secreto = process.env.CRON_SECRET;
  return secreto ? crypto.createHmac("sha256", secreto).update("gestionesjj:cita-publica").digest() : null;
}

const firma = (citaId: string, clave: Buffer) =>
  crypto.createHmac("sha256", clave).update(citaId).digest("base64url").slice(0, 24);

export function tokenCita(citaId: string) {
  const clave = llave();
  return clave ? `${citaId}.${firma(citaId, clave)}` : null;
}

/** Id de la cita si el token es valido; null si no. */
export function citaDeToken(token: string | null | undefined) {
  const clave = llave();
  if (!clave || !token) return null;
  const [citaId, s] = token.split(".");
  if (!citaId || !s || !/^[0-9a-f-]{36}$/i.test(citaId)) return null;
  const esperada = Buffer.from(firma(citaId, clave));
  const recibida = Buffer.from(s);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida) ? citaId : null;
}

const base = () => appUrl() ?? DOMINIO_OFICIAL;
export const urlPaginaCita = (token: string) => `${base()}/cita/${token}`;
export const urlConfirmarPorWhatsApp = (token: string) => `${base()}/api/wa/cita?t=${encodeURIComponent(token)}`;

type RawCita = {
  id: string;
  inicio: string;
  fin: string | null;
  estado: string;
  modalidad: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  gestionesjj_pacientes: { nombre: string; telefono: string | null; pais: string | null; zona_horaria: string | null } | null;
};

export type CitaPublica = {
  id: string;
  nombre: string;
  primerNombre: string;
  telefono: string | null;
  pais: string;
  zona: string;
  inicio: string;
  fin: string;
  estado: string;
  modalidad: "presencial" | "virtual" | null;
  direccion: string | null;
  mapsUrl: string | null;
  /** "martes, 7 de octubre de 2026" en la zona del paciente. */
  fecha: string;
  /** "3:00 p. m." en la zona del paciente. */
  hora: string;
  /** Aclaracion si el paciente no esta en la hora de Guatemala; "" si coincide. */
  aclaracion: string;
  /** La cita ya termino. */
  pasada: boolean;
};

export async function leerCitaPublica(admin: SupabaseClient, citaId: string): Promise<CitaPublica | null> {
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,fin,estado,modalidad,contacto_nombre,contacto_telefono,gestionesjj_pacientes(nombre,telefono,pais,zona_horaria)")
    .eq("id", citaId)
    .maybeSingle();
  const cita = data as unknown as RawCita | null;
  if (!cita) return null;

  const telefono = cita.gestionesjj_pacientes?.telefono ?? cita.contacto_telefono;
  const datos = { pais: cita.gestionesjj_pacientes?.pais, zonaHoraria: cita.gestionesjj_pacientes?.zona_horaria, telefono };
  const zona = zonaDe(datos);
  const nombre = cita.gestionesjj_pacientes?.nombre ?? cita.contacto_nombre ?? "";
  const { fecha, hora } = formatear(cita.inicio, zona);
  const aclaracion = mismaHoraQueConsultorio(zona, cita.inicio)
    ? ""
    : ` (hora de ${nombreZona(zona).replace(/\s*\(.*?\)/g, "")}; en Guatemala serán las ${formatear(cita.inicio, ZONA_CONSULTORIO).hora})`;
  const modalidad = cita.modalidad === "presencial" || cita.modalidad === "virtual" ? cita.modalidad : null;
  const ubicacion = modalidad === "virtual" ? null : await leerUbicacionConsultorio(admin);

  return {
    id: cita.id,
    nombre,
    primerNombre: nombre.trim().split(/\s+/)[0] ?? "",
    telefono,
    pais: paisDe(datos),
    zona,
    inicio: cita.inicio,
    fin: cita.fin ?? new Date(Date.parse(cita.inicio) + 60 * 60_000).toISOString(),
    estado: cita.estado,
    modalidad,
    direccion: ubicacion?.direccion ?? null,
    mapsUrl: ubicacion?.mapsUrl ?? null,
    fecha,
    hora,
    aclaracion,
    pasada: Date.parse(cita.fin ?? cita.inicio) < Date.now(),
  };
}

/** Mensaje de WhatsApp con el saludo de la hora en que se toca el boton. */
export function mensajeConfirmacion(cita: CitaPublica, urlPagina: string, hora = horaGuatemala()) {
  const saludo = saludoPorHora(hora);
  const quien = cita.primerNombre ? `${saludo}, ${cita.primerNombre}` : saludo;
  const cuando = `${cita.hora}${cita.aclaracion}`;
  const frase = `${quien}, te confirmo la cita solicitada para el día ${cita.fecha} a las ${cuando}`;
  return [
    `${frase}${frase.endsWith(".") ? "" : "."}`,
    "",
    "Puedes agregarla a tu calendario, con un recordatorio un día antes, aquí:",
    urlPagina,
  ].join("\n");
}

export const enlaceConfirmacion = (cita: CitaPublica, urlPagina: string) =>
  enlaceWhatsApp(cita.telefono, mensajeConfirmacion(cita, urlPagina), cita.pais);

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

const TITULO = "Cita con Ps. Juan J. Reyes";

const utcCompacto = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function lugar(cita: CitaPublica) {
  if (cita.modalidad === "virtual") return "Sesión virtual";
  return cita.direccion ?? "";
}

function descripcion(cita: CitaPublica) {
  return [
    cita.modalidad === "virtual" ? "Modalidad: virtual (el enlace de la sesión llega por WhatsApp)." : "Modalidad: presencial.",
    cita.mapsUrl ? `Ubicación: ${cita.mapsUrl}` : null,
    "Si no puedes asistir, avisa con anticipación.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Enlace "Agregar a Google Calendar" (el recordatorio usa la configuracion de cada quien). */
export function urlGoogleCalendar(cita: CitaPublica) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: TITULO,
    dates: `${utcCompacto(cita.inicio)}/${utcCompacto(cita.fin)}`,
    details: descripcion(cita),
    location: lugar(cita),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const escIcs = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Archivo .ics con alarma un dia antes (iPhone, Samsung, Outlook). */
export function archivoIcs(cita: CitaPublica) {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Juan J. Reyes//Citas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:cita-${cita.id}@juanjreyes.org`,
    `DTSTAMP:${utcCompacto(new Date().toISOString())}`,
    `DTSTART:${utcCompacto(cita.inicio)}`,
    `DTEND:${utcCompacto(cita.fin)}`,
    `SUMMARY:${escIcs(TITULO)}`,
    `DESCRIPTION:${escIcs(descripcion(cita))}`,
    lugar(cita) ? `LOCATION:${escIcs(lugar(cita))}` : null,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escIcs(`Mañana: ${TITULO}`)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return `${lineas.join("\r\n")}\r\n`;
}

// ---------------------------------------------------------------------------
// Rechazo
// ---------------------------------------------------------------------------

/** Mensaje de WhatsApp al rechazar una solicitud (editable antes de enviarlo). */
export function mensajeRechazo(nombre: string) {
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? "";
  return [
    `${primerNombre ? `${primerNombre}, l` : "L"}amentablemente para la cita que has solicitado no me es posible atenderla en ese horario por duplicidad de citas que el sistema no registró bien.`,
    "",
    `Por favor selecciona un nuevo horario aquí: ${base()}/agendar`,
    "",
    "Muchas gracias y perdón por los inconvenientes.",
  ].join("\n");
}

export const enlaceRechazo = (nombre: string, telefono: string | null) => enlaceWhatsApp(telefono, mensajeRechazo(nombre));
