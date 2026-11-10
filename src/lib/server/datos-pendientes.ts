import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mensajeDatosAntesDeCita } from "@/lib/clinica/mensaje-paciente";
import { appUrl, esc, fechaLocal, hora, inicioDiaIso, isTelegramConfigured, notificar, type BotonInline } from "./telegram";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Hoja de datos generales y consentimiento informado:
 * - aviso por Telegram cuando un paciente la completa;
 * - un día antes de la cita (resumen de las 7:00 a. m.), aviso de cada
 *   paciente que aún no la ha llenado (o no ha firmado el consentimiento),
 *   con un botón que abre WhatsApp con el recordatorio ya escrito: el saludo
 *   se calcula con la hora en que se toca el botón.
 */

const ZONA = "America/Guatemala";

// ---------- enlace firmado del botón (paciente + cita) ----------

function llave() {
  const secreto = process.env.CRON_SECRET;
  return secreto ? crypto.createHmac("sha256", secreto).update("gestionesjj:wa-datos-cita").digest() : null;
}
const firma = (texto: string, clave: Buffer) => crypto.createHmac("sha256", clave).update(texto).digest("base64url").slice(0, 24);

/** URL firmada del botón «Enviar recordatorio por WhatsApp»; null si falta configuración. */
export function urlRecordatorioDatos(citaId: string) {
  const clave = llave();
  const base = appUrl("/api/wa/datos");
  if (!clave || !base) return null;
  return `${base}?t=${encodeURIComponent(`${citaId}.${firma(citaId, clave)}`)}`;
}

/** Id de la cita si el token es válido; null si no. */
export function citaDeTokenDatos(token: string | null) {
  const clave = llave();
  if (!clave || !token) return null;
  const [id, s] = token.split(".");
  if (!id || !s || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const esperada = Buffer.from(firma(id, clave));
  const recibida = Buffer.from(s);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida) ? id : null;
}

/** «hoy», «mañana» o «el martes 12 de noviembre» según la fecha de la cita frente a hoy (Guatemala). */
export function cuandoEsLaCita(inicioIso: string, ahora = new Date()) {
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
  const cita = dia(new Date(inicioIso));
  if (cita === dia(ahora)) return "hoy";
  if (cita === dia(new Date(ahora.getTime() + 86_400_000))) return "mañana";
  return `el ${new Intl.DateTimeFormat("es-GT", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(new Date(inicioIso))}`;
}

type PacienteDatos = {
  id: string;
  nombre: string;
  telefono: string | null;
  pais: string | null;
  datos_token: string | null;
  datos_completados_at: string | null;
};

/** URL de la hoja de datos del paciente, creando el token o reabriéndola si hace falta firmar el consentimiento. */
async function urlHojaDatos(admin: SupabaseClient, p: PacienteDatos, reabrir: boolean) {
  const cambios: Record<string, unknown> = {};
  let token = p.datos_token;
  if (!token) {
    token = crypto.randomUUID();
    cambios.datos_token = token;
  }
  if (reabrir && p.datos_completados_at) cambios.datos_completados_at = null;
  if (Object.keys(cambios).length) {
    const { error } = await admin.from("gestionesjj_pacientes").update(cambios).eq("id", p.id);
    if (error) return null;
  }
  return appUrl(`/datos/${token}`);
}

/** Mensaje de WhatsApp listo para la cita (lo usa el botón al tocarlo). */
export async function mensajeRecordatorioDatos(admin: SupabaseClient, citaId: string) {
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,estado,gestionesjj_pacientes(id,nombre,telefono,pais,datos_token,datos_completados_at)")
    .eq("id", citaId)
    .maybeSingle();
  const cita = data as { id: string; inicio: string; estado: string; gestionesjj_pacientes: PacienteDatos | null } | null;
  const p = cita?.gestionesjj_pacientes;
  if (!cita || !p) return null;
  const url = await urlHojaDatos(admin, p, false);
  if (!url) return null;
  return { paciente: p, texto: mensajeDatosAntesDeCita(p.nombre, url, cuandoEsLaCita(cita.inicio)) };
}

/** Aviso inmediato: el paciente terminó su hoja de datos (y firmó el consentimiento). */
export async function avisarDatosCompletados(token: string) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const { data } = await admin.from("gestionesjj_pacientes").select("id,nombre,es_menor").eq("datos_token", token).maybeSingle();
  const p = data as { id: string; nombre: string; es_menor: boolean | null } | null;
  if (!p) return;
  const { data: proxima } = await admin
    .from("gestionesjj_citas")
    .select("inicio")
    .eq("paciente_id", p.id)
    .in("estado", ["pendiente", "confirmada"])
    .gte("inicio", new Date().toISOString())
    .order("inicio")
    .limit(1)
    .maybeSingle();
  const lineas = [
    `📋✅ <b>${esc(p.nombre)}</b> completó su hoja de datos generales y firmó el consentimiento informado${p.es_menor ? " (con sus padres o tutores)" : ""}.`,
    proxima ? `Próxima cita: ${esc(new Intl.DateTimeFormat("es-GT", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(new Date((proxima as { inicio: string }).inicio)))}, ${esc(hora((proxima as { inicio: string }).inicio))}.` : null,
  ].filter(Boolean);
  const panel = appUrl("/admin");
  await notificar("datos_completados", lineas.join("\n"), panel ? { botones: [[{ text: "Abrir expediente", url: panel }]] } : undefined);
}

type CitaConPaciente = { id: string; inicio: string; gestionesjj_pacientes: PacienteDatos | null };
type Aviso = { texto: string; botones: BotonInline[][] };

/**
 * Aviso de una cita cuyo paciente aún no llenó la hoja de datos o no firmó el
 * consentimiento (null si no hace falta). Crea el enlace si no lo tenía y
 * reabre la hoja si solo falta firmar.
 */
async function avisoDeCita(admin: SupabaseClient, c: CitaConPaciente, conConsentimiento: Set<string>, cuando: string): Promise<Aviso | null> {
  const p = c.gestionesjj_pacientes;
  if (!p) return null;
  const faltanDatos = !p.datos_completados_at;
  const faltaConsentimiento = !conConsentimiento.has(p.id);
  if (!faltanDatos && !faltaConsentimiento) return null;
  const url = await urlHojaDatos(admin, p, !faltanDatos && faltaConsentimiento);
  if (!url) return null;
  const boton = urlRecordatorioDatos(c.id);
  const falta = faltanDatos
    ? "aún no ha llenado su hoja de datos generales ni firmado el consentimiento"
    : "llenó sus datos, pero no tiene consentimiento firmado (se reabrió su hoja para firmarlo)";
  return {
    texto: [
      `📋⏰ <b>${esc(p.nombre)}</b> tiene cita ${cuando} a las ${esc(hora(c.inicio))} y ${falta}.`,
      "",
      "<i>Mensaje listo (el saludo se ajusta a la hora en que lo envíes):</i>",
      esc(mensajeDatosAntesDeCita(p.nombre, url, cuando)),
    ].join("\n"),
    botones: boton ? [[{ text: "📲 Enviar recordatorio por WhatsApp", url: boton }]] : [],
  };
}

async function pacientesConConsentimiento(admin: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const { data } = await admin.from("gestionesjj_consentimientos").select("paciente_id").in("paciente_id", ids);
  return new Set(((data ?? []) as { paciente_id: string }[]).map((f) => f.paciente_id));
}

const horaLocal = (d = new Date()) =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: ZONA, hour: "numeric", hourCycle: "h23" }).format(d));

/**
 * Aviso inmediato al crear o aprobar una cita que el aviso de las 7:00 a. m.
 * ya no alcanza: citas de hoy, o de mañana creadas después de las 7:00 a. m.
 * (las de mañana creadas antes de esa hora las cubre el aviso diario).
 */
export async function avisarDatosPendientesDeCitaNueva(citaId: string, ahora = new Date()) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,estado,gestionesjj_pacientes(id,nombre,telefono,pais,datos_token,datos_completados_at)")
    .eq("id", citaId)
    .maybeSingle();
  const cita = data as (CitaConPaciente & { estado: string }) | null;
  if (!cita?.gestionesjj_pacientes || !["pendiente", "confirmada"].includes(cita.estado)) return;
  const aviso = await avisoInmediato(admin, cita, ahora);
  if (aviso) await notificar("datos_pendientes", aviso.texto, { botones: aviso.botones });
}

/** Decide si toca el aviso inmediato y lo arma (exportado para pruebas). */
export async function avisoInmediato(admin: SupabaseClient, cita: CitaConPaciente, ahora = new Date()) {
  if (new Date(cita.inicio).getTime() <= ahora.getTime()) return null;
  const cuando = cuandoEsLaCita(cita.inicio, ahora);
  if (cuando !== "hoy" && !(cuando === "mañana" && horaLocal(ahora) >= 7)) return null;
  const p = cita.gestionesjj_pacientes!;
  return avisoDeCita(admin, cita, await pacientesConConsentimiento(admin, [p.id]), cuando);
}

/**
 * Para el resumen de las 7:00 a. m.: citas de mañana cuyos pacientes aún no
 * llenaron la hoja de datos o no firmaron el consentimiento. Un mensaje por
 * paciente, con el recordatorio de WhatsApp listo.
 */
export async function avisosDatosPendientesManana(admin: SupabaseClient): Promise<Aviso[]> {
  const manana = fechaLocal(1);
  const pasado = fechaLocal(2);
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,gestionesjj_pacientes(id,nombre,telefono,pais,datos_token,datos_completados_at)")
    .in("estado", ["pendiente", "confirmada"])
    .not("paciente_id", "is", null)
    .gte("inicio", inicioDiaIso(manana))
    .lt("inicio", inicioDiaIso(pasado))
    .order("inicio");
  const citas = (data ?? []) as unknown as CitaConPaciente[];
  if (!citas.length) return [];
  const conConsentimiento = await pacientesConConsentimiento(
    admin,
    [...new Set(citas.map((c) => c.gestionesjj_pacientes?.id).filter((x): x is string => Boolean(x)))]
  );
  const avisos: Aviso[] = [];
  const vistos = new Set<string>();
  for (const c of citas) {
    const p = c.gestionesjj_pacientes;
    if (!p || vistos.has(p.id)) continue;
    vistos.add(p.id);
    const aviso = await avisoDeCita(admin, c, conConsentimiento, "mañana");
    if (aviso) avisos.push(aviso);
  }
  return avisos;
}
