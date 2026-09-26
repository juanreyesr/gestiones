import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarNombre } from "@/lib/clinica/coincidencias";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { enlacesUbicacion, mensajeUbicacion, type UbicacionConsultorio } from "@/lib/clinica/ubicacion";
import { paisDe } from "@/lib/paises";
import { type BotonInline, appUrl, enviarMensaje, esc } from "./telegram";

/**
 * Enlaces para compartir, pedidos desde Telegram:
 *  - /agendar: la pagina publica de citas de la clinica.
 *  - /datos <nombre>: el formulario para que un paciente llene sus datos
 *    generales (mismo enlace que "Copiar enlace de datos" del expediente).
 * Cada respuesta trae un boton que abre WhatsApp con el mensaje listo.
 */

function base() {
  return appUrl() ?? "https://www.juanjreyes.org";
}

function compartir(texto: string, telefono?: string | null, pais?: string | null): BotonInline {
  return { text: telefono ? "📲 Enviárselo por WhatsApp" : "📲 Compartir por WhatsApp", url: enlaceWhatsApp(telefono, texto, pais) };
}

// ============================================================
// Agenda publica
// ============================================================

export async function enviarEnlaceAgenda(admin: SupabaseClient, chatId: number) {
  const url = `${base()}/agendar`;
  const { data } = await admin.from("gestionesjj_disponibilidad").select("agendamiento_publico").limit(1).maybeSingle();
  const activo = Boolean((data as { agendamiento_publico?: boolean } | null)?.agendamiento_publico);
  const mensaje = `¡Hola! Puedes agendar tu cita aquí, eligiendo el día y la hora que mejor te convengan: ${url}`;

  await enviarMensaje(
    chatId,
    [
      "🔗 <b>Enlace para agendar cita</b>",
      url,
      activo ? null : "\n⚠️ El agendamiento público está <b>desactivado</b>: quien lo abra verá que no hay horarios. Actívalo en Clínica → Configuración.",
      "\n<i>Mensaje listo para reenviar:</i>",
      esc(mensaje),
    ]
      .filter((linea) => linea !== null)
      .join("\n"),
    { botones: [[compartir(mensaje)]] },
  );
}

// ============================================================
// Datos generales del paciente
// ============================================================

type PacienteEnlace = {
  id: string;
  nombre: string;
  telefono: string | null;
  pais: string | null;
  estado: string;
  datos_token: string | null;
  datos_completados_at: string | null;
};

const COLUMNAS = "id,nombre,telefono,pais,estado,datos_token,datos_completados_at";

export async function buscarPacienteParaDatos(admin: SupabaseClient, chatId: number, busqueda: string) {
  const termino = normalizarNombre(busqueda);
  if (!termino) {
    await enviarMensaje(chatId, "¿De qué paciente? Escríbelo después del comando, por ejemplo:\n/datos Ana López");
    return;
  }

  const { data } = await admin.from("gestionesjj_pacientes").select(COLUMNAS).limit(5000);
  const palabras = termino.split(" ");
  const encontrados = ((data ?? []) as PacienteEnlace[])
    .filter((p) => {
      const nombre = normalizarNombre(p.nombre);
      return palabras.every((palabra) => nombre.includes(palabra));
    })
    // Primero los activos, luego por nombre.
    .sort((a, b) => Number(b.estado === "activo") - Number(a.estado === "activo") || a.nombre.localeCompare(b.nombre));

  if (encontrados.length === 0) {
    await enviarMensaje(chatId, `No encontré pacientes con «${esc(busqueda)}». Prueba con otra parte del nombre.`);
    return;
  }
  if (encontrados.length === 1) {
    await enviarEnlaceDatos(admin, chatId, encontrados[0].id);
    return;
  }

  await enviarMensaje(chatId, `Encontré ${encontrados.length} pacientes. ¿A cuál le mando el enlace?`, {
    botones: encontrados.slice(0, 8).map((p) => [
      { text: `${p.nombre}${p.estado === "activo" ? "" : ` (${p.estado})`}`, callback_data: `dat:ve:${p.id}` },
    ]),
  });
}

/** Envia el enlace de datos de un paciente (creando el token si no tenia). reabrir=true lo vuelve a habilitar. */
export async function enviarEnlaceDatos(admin: SupabaseClient, chatId: number, pacienteId: string, reabrir = false) {
  const { data } = await admin.from("gestionesjj_pacientes").select(COLUMNAS).eq("id", pacienteId).maybeSingle();
  const paciente = data as PacienteEnlace | null;
  if (!paciente) {
    await enviarMensaje(chatId, "Ese paciente ya no existe.");
    return;
  }

  let token = paciente.datos_token;
  if (!token || reabrir) {
    const cambios: Record<string, unknown> = {};
    if (!token) {
      token = crypto.randomUUID();
      cambios.datos_token = token;
    }
    if (reabrir) cambios.datos_completados_at = null;
    const { error } = await admin.from("gestionesjj_pacientes").update(cambios).eq("id", paciente.id);
    if (error) {
      await enviarMensaje(chatId, "No se pudo generar el enlace. Intenta desde el expediente en el panel.");
      return;
    }
    if (reabrir) paciente.datos_completados_at = null;
  }

  const url = `${base()}/datos/${token}`;
  const primerNombre = paciente.nombre.split(" ")[0];

  if (paciente.datos_completados_at) {
    const fecha = new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "long", year: "numeric" }).format(
      new Date(paciente.datos_completados_at),
    );
    await enviarMensaje(
      chatId,
      `📋 <b>${esc(paciente.nombre)}</b> ya llenó sus datos el ${esc(fecha)}, así que su enlace está cerrado.\n\n¿Quieres reabrirlo para que los actualice?`,
      { botones: [[{ text: "🔓 Reabrir y darme el enlace", callback_data: `dat:re:${paciente.id}` }]] },
    );
    return;
  }

  const mensaje = `Hola ${primerNombre}, por favor completa tus datos generales en este formulario antes de tu próxima sesión: ${url}`;
  await enviarMensaje(
    chatId,
    [
      `📋 <b>Enlace de datos de ${esc(paciente.nombre)}</b>${reabrir ? " (reabierto)" : ""}`,
      url,
      "\n<i>Mensaje listo para reenviar:</i>",
      esc(mensaje),
    ].join("\n"),
    { botones: [[compartir(mensaje, paciente.telefono, paisDe({ pais: paciente.pais, telefono: paciente.telefono }))]] },
  );
}

// ============================================================
// Pedidos escritos en lenguaje natural
// ============================================================

function sinTildes(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * "pasame el link para agendar" → agenda; "enlace de datos de Ana Lopez" →
 * datos de "Ana Lopez". null si el mensaje no pide un enlace.
 */
export function pedidoDeEnlace(texto: string): { tipo: "agenda" } | { tipo: "datos"; nombre: string } | null {
  const t = sinTildes(texto);
  if (!/\b(enlace|enlaces|link|links|liga|url|formulario)\b/.test(t)) return null;

  if (/\b(datos|perfil|ficha|expediente)\b/.test(t)) {
    // El nombre es lo que viene despues de la palabra clave, sin preposiciones ni articulos:
    // "enlace de datos de Ana Lopez", "ficha de Pedro", "sus datos Ana", "datos para la paciente Luisa".
    const original = texto.replace(/[¿?¡!.,]/g, " ").replace(/\s+/g, " ").trim();
    const partes = original.split(/\b(?:datos|perfil|ficha|expediente)\b/i);
    const nombre = (partes[partes.length - 1] ?? "")
      .replace(/^(?:\s*\b(?:de|del|para|a|la|el|mi|su|sus|paciente)\b)+/i, "")
      .trim();
    return { tipo: "datos", nombre };
  }
  if (/\b(agenda|agendar|cita|citas|reservar)\b/.test(t)) return { tipo: "agenda" };
  return null;
}

// ============================================================
// Ubicacion del consultorio
// ============================================================

export async function leerUbicacionConsultorio(admin: SupabaseClient): Promise<UbicacionConsultorio> {
  const { data } = await admin
    .from("gestionesjj_disponibilidad")
    .select("direccion_consultorio,ubicacion_maps_url")
    .limit(1)
    .maybeSingle();
  const row = data as { direccion_consultorio?: string | null; ubicacion_maps_url?: string | null } | null;
  return { direccion: row?.direccion_consultorio ?? null, mapsUrl: row?.ubicacion_maps_url ?? null };
}

/**
 * Boton "Enviarle la ubicacion": abre WhatsApp con el numero de la persona y
 * el mensaje con la direccion + Google Maps + Waze. null si no hay direccion
 * configurada.
 */
export function botonUbicacion(
  ubicacion: UbicacionConsultorio,
  destinatario: { nombre: string | null; telefono: string | null; pais?: string | null },
): BotonInline | null {
  const mensaje = mensajeUbicacion(destinatario.nombre, ubicacion);
  if (!mensaje) return null;
  return {
    text: "📍 Enviarle la ubicación por WhatsApp",
    url: enlaceWhatsApp(destinatario.telefono, mensaje, paisDe({ pais: destinatario.pais, telefono: destinatario.telefono })),
  };
}

/** /ubicacion: el mensaje con la direccion, listo para reenviar. */
export async function enviarUbicacion(admin: SupabaseClient, chatId: number) {
  const ubicacion = await leerUbicacionConsultorio(admin);
  const mensaje = mensajeUbicacion(null, ubicacion);
  const enlaces = enlacesUbicacion(ubicacion);
  if (!mensaje || !enlaces) {
    await enviarMensaje(
      chatId,
      "📍 Aún no configuraste la dirección del consultorio. Escríbela en Clínica → Configuración → <b>Ubicación del consultorio</b>.",
    );
    return;
  }
  await enviarMensaje(chatId, ["📍 <b>Ubicación del consultorio</b>", "", esc(mensaje)].join("\n"), {
    botones: [
      [
        { text: "🗺 Google Maps", url: enlaces.google },
        { text: "🚗 Waze", url: enlaces.waze },
      ],
      [compartir(mensaje)],
    ],
  });
}
