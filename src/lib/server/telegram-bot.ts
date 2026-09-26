import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarCoincidencia, type Coincidencia } from "@/lib/clinica/coincidencias";
import { enlaceWhatsApp, textoRecordatorioCita } from "@/lib/clinica/recordatorio";
import { mismaHoraQueConsultorio, nombreZona, PAIS_POR_DEFECTO, paisDe, paisPorCodigo, zonaDe } from "@/lib/paises";
import { type EventoGoogle, getStoredTokens, insertEvent, isGoogleConfigured, listarEventos } from "./google-calendar";
import { pacientesComparables, resolverReserva } from "./reservas-google";
import { getSupabaseAdmin } from "./supabase-admin";
import {
  type BotonInline,
  type TelegramConfig,
  comparaSeguro,
  editarMensaje,
  enviarMensaje,
  esc,
  fechaHora,
  fechaLocal,
  hashCodigo,
  hora,
  inicioDiaIso,
  leerConfig,
  recortar,
  telegramApi,
} from "./telegram";

/**
 * Logica del bot: interpreta cada update que Telegram manda al webhook.
 * Solo el chat privado vinculado puede darle ordenes; cualquier otro chat
 * recibe unicamente la respuesta a /start con un codigo valido.
 */

type Usuario = { id: number; first_name?: string; last_name?: string; username?: string };
type Chat = { id: number; type: string };
type Mensaje = {
  message_id: number;
  chat: Chat;
  from?: Usuario;
  text?: string;
  reply_to_message?: { message_id: number };
};
type CallbackQuery = { id: string; from: Usuario; data?: string; message?: { message_id: number; chat: Chat } };
export type TelegramUpdate = { update_id: number; message?: Mensaje; callback_query?: CallbackQuery };

export async function procesarUpdate(update: TelegramUpdate) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  if (update.callback_query) {
    await procesarCallback(admin, update.callback_query);
    return;
  }

  const mensaje = update.message;
  if (!mensaje || mensaje.chat.type !== "private") return;

  const texto = (mensaje.text ?? "").trim();
  const config = await leerConfig();

  // /start <codigo> es lo unico que acepta un chat que todavia no esta vinculado.
  const start = texto.match(/^\/start(?:@\w+)?(?:\s+(\S+))?$/);
  if (start) {
    await procesarStart(admin, config, mensaje, start[1] ?? null);
    return;
  }

  if (!config?.chatId || config.chatId !== mensaje.chat.id) {
    await enviarMensaje(
      mensaje.chat.id,
      "Este bot es privado. Si eres el administrador, vincúlalo desde el panel de GestionesJJ.",
    );
    return;
  }

  const chatId = config.chatId;

  // Responder a un aviso de mensaje de estudiante = contestarle.
  if (mensaje.reply_to_message && texto && !texto.startsWith("/")) {
    const respondido = await responderHilo(admin, config, mensaje.reply_to_message.message_id, texto);
    if (respondido !== null) {
      await enviarMensaje(chatId, respondido, { responderA: mensaje.message_id });
      return;
    }
  }

  const comando = texto.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  if (!comando && preguntaPorAgenda(texto)) {
    await enviarMensaje(chatId, await construirAgenda(admin, rangoAgenda(texto)));
    return;
  }
  if (!comando) {
    await enviarMensaje(
      chatId,
      "No entendí ese mensaje. Usa /ayuda para ver lo que puedo hacer, o /nuevo <i>texto</i> para anotarlo como pendiente.",
    );
    return;
  }

  const [, nombre, argumento = ""] = comando;
  switch (nombre.toLowerCase()) {
    case "hoy":
    case "resumen":
      {
        const resumen = await construirResumenDiario(admin);
        await enviarMensaje(chatId, resumen.texto, { botones: resumen.botones });
      }
      return;
    case "agenda":
      await enviarMensaje(chatId, await construirAgenda(admin, rangoAgenda(argumento)));
      return;
    case "citas":
      await enviarMensaje(chatId, await textoCitas(admin));
      return;
    case "solicitudes":
      await enviarSolicitudes(admin, chatId);
      return;
    case "pendientes":
      await enviarPendientes(admin, chatId);
      return;
    case "nuevo":
      await enviarMensaje(chatId, await crearPendiente(admin, config, argumento.trim()));
      return;
    case "mensajes":
      await enviarMensajesSinLeer(admin, chatId);
      return;
    case "ayuda":
    case "help":
      await enviarMensaje(chatId, textoAyuda());
      return;
    default:
      await enviarMensaje(chatId, "Comando desconocido. Usa /ayuda para ver la lista.");
  }
}

// ============================================================
// Vinculacion
// ============================================================

async function procesarStart(admin: SupabaseClient, config: TelegramConfig | null, mensaje: Mensaje, codigo: string | null) {
  const chatId = mensaje.chat.id;

  if (config?.chatId === chatId) {
    await enviarMensaje(chatId, `¡Hola de nuevo! Este chat ya está vinculado.\n\n${textoAyuda()}`);
    return;
  }

  const valido =
    codigo &&
    config?.codigoHash &&
    config.codigoExpira &&
    new Date(config.codigoExpira).getTime() > Date.now() &&
    comparaSeguro(hashCodigo(codigo), config.codigoHash);

  if (!valido) {
    await enviarMensaje(
      chatId,
      "Este bot es privado. Para vincularlo abre GestionesJJ → <b>Conectar Telegram</b> y usa el enlace que se genera (vence en 15 minutos).",
    );
    return;
  }

  const nombre =
    [mensaje.from?.first_name, mensaje.from?.last_name].filter(Boolean).join(" ") ||
    (mensaje.from?.username ? `@${mensaje.from.username}` : "Telegram");

  const { error } = await admin
    .from("gestionesjj_telegram_config")
    .update({
      chat_id: chatId,
      chat_nombre: nombre,
      vinculado_en: new Date().toISOString(),
      codigo_hash: null,
      codigo_expira: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    await enviarMensaje(chatId, "No se pudo vincular el chat. Intenta generar un enlace nuevo.");
    return;
  }

  await enviarMensaje(
    chatId,
    `✅ <b>Telegram vinculado a GestionesJJ</b>\nHola ${esc(nombre)}, desde ahora te llegarán aquí los avisos de tus apps.\n\n${textoAyuda()}`,
  );
}

function textoAyuda() {
  return [
    "<b>Lo que puedo hacer</b>",
    "/hoy — resumen del día: agenda, pendientes, solicitudes y mensajes",
    "/agenda — tus citas y compromisos de Google Calendar. Acepta: <i>hoy, mañana, viernes, 15/10, esta semana, próxima semana, 14 días</i>",
    "/citas — citas de los próximos 7 días",
    "/solicitudes — solicitudes de cita con botones para aprobar o rechazar",
    "/pendientes — pendientes vencidos y de los próximos 3 días, con botón ✅ Listo",
    "/nuevo <i>texto</i> — anota un pendiente nuevo",
    "/mensajes — mensajes de estudiantes sin leer",
    "",
    "💬 Para contestarle a un estudiante, <b>responde</b> (desliza el mensaje) al aviso de su mensaje.",
    "📅 Las reservas de Calendly que lleguen a tu Google Calendar te las mando con botones para vincularlas a un paciente o crearlo.",
    "🗓 También puedes preguntar escribiendo normal: <i>¿qué tengo mañana?</i>, <i>¿tengo compromisos el viernes?</i>",
  ].join("\n");
}

// ============================================================
// Resumen del dia
// ============================================================

type RawCita = {
  id: string;
  inicio: string;
  estado: string;
  modalidad: string | null;
  motivo: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  gestionesjj_pacientes: { nombre: string; telefono: string | null; pais: string | null; zona_horaria: string | null } | null;
};

async function citasEntre(admin: SupabaseClient, desdeIso: string, hastaIso: string) {
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,estado,modalidad,motivo,contacto_nombre,contacto_telefono,gestionesjj_pacientes(nombre,telefono,pais,zona_horaria)")
    .gte("inicio", desdeIso)
    .lt("inicio", hastaIso)
    .in("estado", ["pendiente", "confirmada"])
    .order("inicio")
    .limit(40);
  return (data ?? []) as unknown as RawCita[];
}

function nombreCita(cita: RawCita) {
  return cita.gestionesjj_pacientes?.nombre ?? cita.contacto_nombre ?? "Paciente";
}

/** Boton de Telegram que abre WhatsApp con el recordatorio listo para el paciente. */
function ubicacionPaciente(cita: RawCita) {
  const telefono = cita.gestionesjj_pacientes?.telefono ?? cita.contacto_telefono;
  const datos = { pais: cita.gestionesjj_pacientes?.pais, zonaHoraria: cita.gestionesjj_pacientes?.zona_horaria, telefono };
  return { telefono, pais: paisDe(datos), zona: zonaDe(datos) };
}

/** Boton de Telegram que abre WhatsApp con el recordatorio listo para el paciente (en su hora). */
function botonWhatsAppCita(cita: RawCita, etiqueta: string): BotonInline | null {
  const { telefono, pais, zona } = ubicacionPaciente(cita);
  if (!telefono) return null;
  const mensaje = textoRecordatorioCita(nombreCita(cita), cita.inicio, zona);
  return { text: etiqueta, url: enlaceWhatsApp(telefono, mensaje, pais) };
}

/** "🌎 🇪🇸 España · su hora: 11:00 p. m." para pacientes fuera de Guatemala (null si es de Guatemala). */
function lineaPaisCita(cita: RawCita) {
  const { pais, zona } = ubicacionPaciente(cita);
  if (pais === PAIS_POR_DEFECTO) return null;
  const info = paisPorCodigo(pais);
  const suHora = mismaHoraQueConsultorio(zona, cita.inicio)
    ? ""
    : ` · su hora: ${new Intl.DateTimeFormat("es-GT", { timeZone: zona, hour: "numeric", minute: "2-digit" }).format(new Date(cita.inicio))} (${nombreZona(zona)})`;
  return `🌎 ${info.bandera} ${esc(info.nombre)}${esc(suHora)}`;
}

type RawItem = {
  id: string;
  titulo: string;
  estado: string;
  prioridad: string;
  fecha_limite: string | null;
  gestionesjj_pendientes_tableros: { nombre: string; archivado: boolean } | null;
};

async function pendientesProximos(admin: SupabaseClient, hastaYmd: string) {
  const { data } = await admin
    .from("gestionesjj_pendientes_items")
    .select("id,titulo,estado,prioridad,fecha_limite,gestionesjj_pendientes_tableros(nombre,archivado)")
    .is("item_padre_id", null)
    .neq("estado", "listo")
    .not("fecha_limite", "is", null)
    .lte("fecha_limite", hastaYmd)
    .order("fecha_limite")
    .limit(60);
  return ((data ?? []) as unknown as RawItem[]).filter((item) => !item.gestionesjj_pendientes_tableros?.archivado);
}

async function contar(consulta: PromiseLike<{ count: number | null }>) {
  const { count } = await consulta;
  return count ?? 0;
}

export async function construirResumenDiario(admin: SupabaseClient): Promise<{ texto: string; botones: BotonInline[][] }> {
  const hoy = fechaLocal();
  const manana = fechaLocal(1);

  const [citas, pendientes, solicitudesCita, mensajes, solicitudesCurso] = await Promise.all([
    citasEntre(admin, inicioDiaIso(hoy), inicioDiaIso(manana)),
    pendientesProximos(admin, hoy),
    contar(
      admin
        .from("gestionesjj_solicitudes_cita")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente")
        .gte("inicio", new Date().toISOString()),
    ),
    contar(
      admin
        .from("gestionesjj_estudiante_mensajes")
        .select("id", { count: "exact", head: true })
        .eq("remitente", "estudiante")
        .eq("leido_docente", false),
    ),
    contar(
      admin.from("gestionesjj_curso_solicitudes").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    ),
  ]);

  const fechaTexto = new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const lineas = [`☀️ <b>Resumen de hoy</b> — ${esc(fechaTexto)}`, ""];

  const { eventos: compromisos } = await eventosGoogleSinCitas(inicioDiaIso(hoy), inicioDiaIso(manana));
  lineas.push(`🗓 <b>Agenda de hoy</b> — ${citas.length} cita(s), ${compromisos.length} compromiso(s)`);
  const agendaHoy = [
    ...citas.map((cita) => ({
      orden: Date.parse(cita.inicio),
      texto: `• ${hora(cita.inicio)} 🩺 ${esc(nombreCita(cita))}${cita.modalidad === "virtual" ? " (virtual)" : ""}`,
    })),
    ...compromisos.map((evento) => ({ orden: Date.parse(evento.inicio), texto: `• ${lineaEvento(evento)}` })),
  ].sort((a, b) => a.orden - b.orden);
  if (agendaHoy.length === 0) lineas.push("Día libre: sin citas ni compromisos.");
  for (const item of agendaHoy) lineas.push(item.texto);

  const vencidos = pendientes.filter((item) => item.fecha_limite! < hoy);
  const deHoy = pendientes.filter((item) => item.fecha_limite === hoy);
  lineas.push("", `✅ <b>Pendientes</b>: ${deHoy.length} vencen hoy, ${vencidos.length} vencidos`);
  for (const item of [...vencidos, ...deHoy].slice(0, 8)) {
    lineas.push(`• ${item.fecha_limite! < hoy ? "🔴" : "🟠"} ${esc(item.titulo)}`);
  }

  const avisos: string[] = [];
  if (solicitudesCita) avisos.push(`• ${solicitudesCita} solicitud(es) de cita por aprobar → /solicitudes`);
  if (mensajes) avisos.push(`• ${mensajes} mensaje(s) de estudiantes sin leer → /mensajes`);
  if (solicitudesCurso) avisos.push(`• ${solicitudesCurso} solicitud(es) de inscripción a cursos por revisar`);
  if (avisos.length) lineas.push("", "📬 <b>Por atender</b>", ...avisos);

  // Un boton por cita de hoy para mandarle el recordatorio al paciente por WhatsApp.
  const botones = citas
    .slice(0, 8)
    .map((cita) => botonWhatsAppCita(cita, `📲 Recordar a ${nombreCita(cita).split(" ")[0]} (${hora(cita.inicio)})`))
    .filter((boton): boton is BotonInline => boton !== null)
    .map((boton) => [boton]);
  if (botones.length) lineas.push("", "<i>Toca un botón para mandarle el recordatorio por WhatsApp.</i>");

  return { texto: lineas.join("\n"), botones };
}

// ============================================================
// Recordatorio antes de cada cita
// ============================================================

export const ANTICIPACION_RECORDATORIO_MIN = 60;

/**
 * Avisa al owner de las citas que empiezan dentro de la proxima hora. Lo
 * dispara pg_cron cada 10 minutos (migracion 034). Cada cita se avisa una
 * sola vez por horario: si se reprograma, se vuelve a avisar.
 */
export async function enviarRecordatoriosCitas(admin: SupabaseClient, config: TelegramConfig) {
  if (!config.chatId || !config.preferencias.citas_recordatorio) return 0;

  const ahora = Date.now();
  const citas = await citasEntre(
    admin,
    new Date(ahora).toISOString(),
    new Date(ahora + ANTICIPACION_RECORDATORIO_MIN * 60_000).toISOString(),
  );

  let enviados = 0;
  for (const cita of citas) {
    // Se registra antes de enviar: si dos ejecuciones se cruzan, solo una gana.
    const { data: registrado } = await admin
      .from("gestionesjj_telegram_recordatorios")
      .upsert({ cita_id: cita.id, inicio: cita.inicio }, { onConflict: "cita_id,inicio", ignoreDuplicates: true })
      .select("cita_id");
    if (!registrado?.length) continue;

    const minutos = Math.max(1, Math.round((new Date(cita.inicio).getTime() - ahora) / 60_000));
    const texto = [
      `⏰ <b>Cita en ${minutos} min</b> — ${esc(hora(cita.inicio))}`,
      `👤 ${esc(nombreCita(cita))}${cita.modalidad === "virtual" ? " · 💻 virtual" : ""}${cita.estado === "pendiente" ? " · <i>por confirmar</i>" : ""}`,
      lineaPaisCita(cita),
      cita.motivo ? `📝 ${esc(recortar(cita.motivo, 300))}` : null,
    ]
      .filter((linea) => linea !== null)
      .join("\n");

    const boton = botonWhatsAppCita(cita, "📲 Mandarle recordatorio por WhatsApp");
    const res = await enviarMensaje(config.chatId, texto, boton ? { botones: [[boton]] } : undefined);
    if (res.ok) enviados += 1;
  }
  return enviados;
}

/**
 * Avisa de los compromisos de Google Calendar (de cualquier calendario
 * visible) que empiezan dentro de la proxima hora. Se omiten los de todo el
 * dia y las citas que creo la propia app (esas ya tienen su recordatorio).
 * Cada evento se avisa una vez por horario: si se mueve, se vuelve a avisar.
 */
export async function enviarRecordatoriosGoogle(admin: SupabaseClient, config: TelegramConfig) {
  if (!config.chatId || !config.preferencias.google_recordatorio) return 0;

  const ahora = Date.now();
  const { eventos, conectado } = await eventosGoogleSinCitas(
    new Date(ahora).toISOString(),
    new Date(ahora + ANTICIPACION_RECORDATORIO_MIN * 60_000).toISOString(),
  );
  if (!conectado) return 0;

  let enviados = 0;
  const vistos = new Set<string>();
  for (const evento of eventos) {
    // Solo los que todavia no empiezan (listarEventos tambien trae los que ya estan en curso).
    if (evento.todoElDia || Date.parse(evento.inicio) <= ahora) continue;
    // Una invitacion puede aparecer en dos calendarios con el mismo id: un solo aviso.
    const unico = `${evento.id}|${Date.parse(evento.inicio)}`;
    if (vistos.has(unico)) continue;
    vistos.add(unico);

    const { data: registrado } = await admin
      .from("gestionesjj_telegram_recordatorios_google")
      .upsert(
        { evento_clave: `${evento.calendarioId}:${evento.id}`, inicio: new Date(evento.inicio).toISOString() },
        { onConflict: "evento_clave,inicio", ignoreDuplicates: true },
      )
      .select("evento_clave");
    if (!registrado?.length) continue;

    const minutos = Math.max(1, Math.round((Date.parse(evento.inicio) - ahora) / 60_000));
    const texto = [
      `⏰ <b>Compromiso en ${minutos} min</b> — ${esc(hora(evento.inicio))}–${esc(hora(evento.fin))}`,
      `📅 ${esc(evento.titulo)}${evento.calendarioPrincipal ? "" : ` <i>(${esc(evento.calendario)})</i>`}`,
      evento.ubicacion ? `📍 ${esc(recortar(evento.ubicacion, 200))}` : null,
    ]
      .filter((linea) => linea !== null)
      .join("\n");

    const botones = evento.videollamada ? [[{ text: "🎥 Unirse a la videollamada", url: evento.videollamada }]] : undefined;
    const res = await enviarMensaje(config.chatId, texto, botones ? { botones } : undefined);
    if (res.ok) enviados += 1;
  }
  return enviados;
}

// ============================================================
// Agenda: citas de la clinica + compromisos de Google Calendar
// ============================================================

const ZONA_GT = "America/Guatemala";
const NOMBRES_DIA = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

type RangoAgenda = { desde: string; dias: number; titulo: string };

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sumarDias(ymd: string, dias: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_GT }).format(
    new Date(Date.parse(`${ymd}T12:00:00-06:00`) + dias * 86_400_000),
  );
}

function diaSemana(ymd: string) {
  // Mediodia de Guatemala (18:00 UTC) cae el mismo dia en UTC.
  return new Date(`${ymd}T12:00:00-06:00`).getUTCDay();
}

/** true si un mensaje libre parece una pregunta por la agenda. */
export function preguntaPorAgenda(texto: string) {
  return /\b(agenda|compromisos?|citas?|calendario|eventos?|ocupad[oa]s?|libre|que tengo|tengo algo|reuniones?)\b/.test(
    normalizar(texto),
  );
}

/**
 * Interpreta el periodo pedido: "hoy", "manana", "pasado manana", un dia de
 * la semana, "15/10", "esta semana", "proxima semana", "este mes" o "N dias".
 * Sin nada reconocible: los proximos 7 dias.
 */
export function rangoAgenda(texto: string): RangoAgenda {
  const t = normalizar(texto).trim();
  const hoy = fechaLocal();

  if (/pasado manana/.test(t)) return { desde: sumarDias(hoy, 2), dias: 1, titulo: "pasado mañana" };
  if (/\bhoy\b/.test(t)) return { desde: hoy, dias: 1, titulo: "hoy" };
  if (/\bmanana\b/.test(t)) return { desde: sumarDias(hoy, 1), dias: 1, titulo: "mañana" };

  const dow = diaSemana(hoy);
  if (/(proxima|siguiente) semana|semana (que viene|entrante)/.test(t)) {
    const hastaLunes = ((8 - dow) % 7) || 7;
    return { desde: sumarDias(hoy, hastaLunes), dias: 7, titulo: "la próxima semana" };
  }
  if (/\bsemana\b/.test(t)) return { desde: hoy, dias: dow === 0 ? 1 : 8 - dow, titulo: "esta semana" };
  if (/\bmes\b/.test(t)) return { desde: hoy, dias: 30, titulo: "los próximos 30 días" };

  const fecha = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (fecha) {
    const [, d, m, a] = fecha;
    const anioActual = Number(hoy.slice(0, 4));
    let anio = a ? Number(a.length === 2 ? `20${a}` : a) : anioActual;
    let ymd = `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!a && ymd < hoy) {
      anio += 1;
      ymd = `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (!Number.isNaN(Date.parse(`${ymd}T12:00:00-06:00`))) return { desde: ymd, dias: 1, titulo: `el ${d}/${m}` };
  }

  const indiceDia = NOMBRES_DIA.findIndex((nombre) => new RegExp(`\\b${nombre}\\b`).test(t));
  if (indiceDia >= 0) {
    const faltan = (indiceDia - dow + 7) % 7;
    const nombre = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][indiceDia];
    return { desde: sumarDias(hoy, faltan), dias: 1, titulo: faltan === 0 ? "hoy" : `el ${nombre}` };
  }

  const numero = t.match(/\b(\d{1,2})\s*dias?\b/) ?? t.match(/^(\d{1,2})$/);
  if (numero) {
    const dias = Math.min(Math.max(Number(numero[1]), 1), 60);
    return { desde: hoy, dias, titulo: `los próximos ${dias} días` };
  }

  return { desde: hoy, dias: 7, titulo: "los próximos 7 días" };
}

/** Eventos de Google que NO son citas de la clinica (esas ya salen de la BD). */
async function eventosGoogleSinCitas(desdeIso: string, hastaIso: string) {
  if (!isGoogleConfigured()) return { eventos: [] as EventoGoogle[], conectado: false };
  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado !== "conectado") return { eventos: [] as EventoGoogle[], conectado: false };
  const { eventos, error } = await listarEventos(desdeIso, hastaIso);
  return { eventos: eventos.filter((e) => !e.gestionesId), conectado: !error };
}

function lineaEvento(evento: EventoGoogle) {
  const horario = evento.todoElDia ? "Todo el día" : `${hora(evento.inicio)}–${hora(evento.fin)}`;
  const calendario = evento.calendarioPrincipal ? "" : ` <i>(${esc(evento.calendario)})</i>`;
  const lugar = evento.ubicacion ? ` · 📍 ${esc(recortar(evento.ubicacion, 60))}` : "";
  return `${horario} 📅 ${esc(evento.titulo)}${calendario}${lugar}`;
}

export async function construirAgenda(admin: SupabaseClient, rango: RangoAgenda) {
  const desdeIso = inicioDiaIso(rango.desde);
  const hastaIso = inicioDiaIso(sumarDias(rango.desde, rango.dias));

  const [citas, google] = await Promise.all([citasEntre(admin, desdeIso, hastaIso), eventosGoogleSinCitas(desdeIso, hastaIso)]);

  const items = [
    ...citas.map((cita) => ({
      inicio: cita.inicio,
      texto: `${hora(cita.inicio)} 🩺 ${esc(nombreCita(cita))}${cita.modalidad === "virtual" ? " (virtual)" : ""}${cita.estado === "pendiente" ? " <i>por confirmar</i>" : ""}`,
    })),
    ...google.eventos.map((evento) => ({
      // Un evento de varios dias que empezo antes se muestra desde el primer dia pedido.
      inicio: Date.parse(evento.inicio) < Date.parse(desdeIso) ? desdeIso : evento.inicio,
      texto: lineaEvento(evento),
    })),
  ].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));

  const avisoGoogle = google.conectado
    ? ""
    : "\n\n<i>Google Calendar no está conectado: solo se muestran las citas de la clínica.</i>";

  if (items.length === 0) {
    return `🗓 No tienes citas ni compromisos ${esc(rango.titulo)}.${avisoGoogle}`;
  }

  const formatoDia = new Intl.DateTimeFormat("es-GT", { timeZone: ZONA_GT, weekday: "long", day: "numeric", month: "long" });
  const lineas = [`🗓 <b>Tu agenda ${esc(rango.titulo)}</b> (${items.length})`];
  let diaActual = "";
  for (const item of items) {
    const dia = formatoDia.format(new Date(item.inicio));
    if (dia !== diaActual) {
      diaActual = dia;
      lineas.push("", `<b>${esc(dia.charAt(0).toUpperCase() + dia.slice(1))}</b>`);
    }
    lineas.push(`• ${item.texto}`);
  }
  return recortar(lineas.join("\n") + avisoGoogle);
}

// ============================================================
// Citas
// ============================================================

async function textoCitas(admin: SupabaseClient) {
  const hoy = fechaLocal();
  const citas = await citasEntre(admin, inicioDiaIso(hoy), inicioDiaIso(fechaLocal(7)));
  if (citas.length === 0) return "🗓 No tienes citas en los próximos 7 días.";
  return [
    `🗓 <b>Citas de los próximos 7 días (${citas.length})</b>`,
    ...citas.map(
      (cita) =>
        `• ${esc(fechaHora(cita.inicio))} — ${esc(nombreCita(cita))}${cita.estado === "pendiente" ? " <i>(por confirmar)</i>" : ""}`,
    ),
  ].join("\n");
}

type RawSolicitud = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  motivo: string | null;
  inicio: string;
  estado: string;
  ya_es_paciente: boolean;
  primera_sesion: boolean;
  dar_seguimiento: boolean;
};

export function textoSolicitudCita(sol: Omit<RawSolicitud, "id" | "estado">, coincidencia?: Coincidencia | null) {
  const etiquetas = [
    sol.ya_es_paciente ? "ya es paciente" : null,
    sol.primera_sesion ? "primera sesión" : null,
    sol.dar_seguimiento ? "seguimiento" : null,
  ].filter(Boolean);
  return [
    "🩺 <b>Nueva solicitud de cita</b>",
    `<b>${esc(sol.nombre)}</b>${etiquetas.length ? ` (${etiquetas.join(", ")})` : ""}`,
    `📅 ${esc(fechaHora(sol.inicio))}`,
    `📞 ${esc(sol.telefono)}${sol.email ? ` · ${esc(sol.email)}` : ""}`,
    sol.motivo ? `📝 ${esc(recortar(sol.motivo, 600))}` : null,
    coincidencia === undefined
      ? null
      : coincidencia
        ? `\n🔎 <b>Parece ser ${esc(coincidencia.paciente.nombre)}</b> (mismo ${coincidencia.por})`
        : "\n🔎 No coincide con ningún paciente registrado.",
  ]
    .filter((linea) => linea !== null)
    .join("\n");
}

export function botonesSolicitudCita(solicitudId: string, coincidencia?: Coincidencia | null): BotonInline[][] {
  if (coincidencia) {
    return [
      [{ text: `✅ Aprobar: es ${coincidencia.paciente.nombre.split(" ")[0]}`, callback_data: `sol:vp:${solicitudId}` }],
      [{ text: "➕ Aprobar como paciente nuevo", callback_data: `sol:ap:${solicitudId}` }],
      [{ text: "❌ Rechazar", callback_data: `sol:re:${solicitudId}` }],
    ];
  }
  return [
    [
      { text: "✅ Aprobar (paciente nuevo)", callback_data: `sol:ap:${solicitudId}` },
      { text: "❌ Rechazar", callback_data: `sol:re:${solicitudId}` },
    ],
  ];
}

async function enviarSolicitudes(admin: SupabaseClient, chatId: number) {
  const { data } = await admin
    .from("gestionesjj_solicitudes_cita")
    .select("id,nombre,telefono,email,motivo,inicio,estado,ya_es_paciente,primera_sesion,dar_seguimiento")
    .eq("estado", "pendiente")
    .gte("inicio", new Date().toISOString())
    .order("inicio")
    .limit(10);
  const solicitudes = (data ?? []) as RawSolicitud[];

  if (solicitudes.length === 0) {
    await enviarMensaje(chatId, "🩺 No hay solicitudes de cita por aprobar.");
    return;
  }
  const pacientes = await pacientesComparables(admin);
  for (const sol of solicitudes) {
    const coincidencia = buscarCoincidencia(pacientes, sol);
    await enviarMensaje(chatId, textoSolicitudCita(sol, coincidencia), { botones: botonesSolicitudCita(sol.id, coincidencia) });
  }
}

/** Crea el evento de Google Calendar de una cita recien aprobada (si esta conectado). */
async function sincronizarCitaGoogle(admin: SupabaseClient, citaId: string) {
  if (!isGoogleConfigured()) return;
  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado !== "conectado") return;

  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,fin,motivo,contacto_nombre,gestionesjj_pacientes(nombre)")
    .eq("id", citaId)
    .maybeSingle();
  const cita = data as unknown as {
    id: string;
    inicio: string;
    fin: string;
    motivo: string | null;
    contacto_nombre: string | null;
    gestionesjj_pacientes: { nombre: string } | null;
  } | null;
  if (!cita) return;

  const { eventId, error } = await insertEvent({
    id: cita.id,
    inicio: cita.inicio,
    fin: cita.fin,
    motivo: cita.motivo,
    nombre: cita.gestionesjj_pacientes?.nombre ?? cita.contacto_nombre ?? "Paciente",
  });
  await admin
    .from("gestionesjj_citas")
    .update(error || !eventId ? { gcal_sync_status: "error" } : { gcal_sync_status: "sincronizada", gcal_event_id: eventId })
    .eq("id", cita.id);
}

// ============================================================
// Pendientes
// ============================================================

const PRIORIDAD_ICONO: Record<string, string> = { critica: "‼️", alta: "❗", media: "", baja: "", sin_definir: "" };

async function enviarPendientes(admin: SupabaseClient, chatId: number) {
  const hoy = fechaLocal();
  const items = (await pendientesProximos(admin, fechaLocal(3))).slice(0, 15);

  if (items.length === 0) {
    await enviarMensaje(chatId, "✅ No tienes pendientes vencidos ni para los próximos 3 días.");
    return;
  }

  const lineas = [`✅ <b>Pendientes vencidos y próximos (${items.length})</b>`, "Toca un botón para marcarlo como listo."];
  const botones: BotonInline[][] = [];
  items.forEach((item, indice) => {
    const marca = item.fecha_limite! < hoy ? "🔴" : item.fecha_limite === hoy ? "🟠" : "🟢";
    const tablero = item.gestionesjj_pendientes_tableros?.nombre;
    lineas.push(
      `${indice + 1}. ${marca} ${PRIORIDAD_ICONO[item.prioridad] ?? ""}${esc(item.titulo)} — ${esc(item.fecha_limite)}${tablero ? ` · <i>${esc(tablero)}</i>` : ""}`,
    );
    botones.push([{ text: `✅ ${indice + 1}. ${item.titulo.slice(0, 40)}`, callback_data: `pen:ok:${item.id}` }]);
  });

  await enviarMensaje(chatId, lineas.join("\n"), { botones });
}

async function crearPendiente(admin: SupabaseClient, config: TelegramConfig, texto: string) {
  if (!texto) return "Escribe el pendiente después del comando, por ejemplo:\n/nuevo Llamar al proveedor del sonido";
  if (texto.length > 500) return "El pendiente es demasiado largo (máximo 500 caracteres).";

  const { data: tablero } = await admin
    .from("gestionesjj_pendientes_tableros")
    .select("id,nombre")
    .eq("archivado", false)
    .order("orden")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!tablero) return "Primero crea un tablero en el módulo Pendientes de GestionesJJ.";

  const { data: grupo } = await admin
    .from("gestionesjj_pendientes_grupos")
    .select("id,nombre")
    .eq("tablero_id", tablero.id)
    .order("orden")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!grupo) return `El tablero «${esc(tablero.nombre)}» no tiene grupos; crea uno desde la app.`;

  const { error } = await admin.from("gestionesjj_pendientes_items").insert({
    created_by: config.ownerId,
    tablero_id: tablero.id,
    grupo_id: grupo.id,
    titulo: texto,
    orden: -1, // arriba del grupo
  });
  if (error) return "No se pudo crear el pendiente.";

  return `📝 Anotado en <b>${esc(tablero.nombre)}</b> › ${esc(grupo.nombre)}:\n${esc(texto)}`;
}

// ============================================================
// Mensajes de estudiantes
// ============================================================

type RawMensajeEstudiante = {
  id: string;
  estudiante_id: string;
  contenido: string | null;
  archivo_nombre: string | null;
  created_at: string;
  gestionesjj_estudiantes: { nombre: string } | null;
};

export function textoMensajeEstudiante(nombre: string, contenido: string | null, archivoNombre: string | null) {
  return [
    `💬 <b>${esc(nombre)}</b> te escribió:`,
    contenido ? esc(recortar(contenido, 3000)) : null,
    archivoNombre ? `📎 ${esc(archivoNombre)}` : null,
    "",
    "<i>Responde a este mensaje para contestarle.</i>",
  ]
    .filter((linea) => linea !== null)
    .join("\n");
}

async function enviarMensajesSinLeer(admin: SupabaseClient, chatId: number) {
  const { data } = await admin
    .from("gestionesjj_estudiante_mensajes")
    .select("id,estudiante_id,contenido,archivo_nombre,created_at,gestionesjj_estudiantes(nombre)")
    .eq("remitente", "estudiante")
    .eq("leido_docente", false)
    .order("created_at")
    .limit(30);
  const mensajes = (data ?? []) as unknown as RawMensajeEstudiante[];

  if (mensajes.length === 0) {
    await enviarMensaje(chatId, "💬 No hay mensajes de estudiantes sin leer.");
    return;
  }

  // Un aviso por estudiante (con sus mensajes juntos), para poder responderle a cada uno.
  const porEstudiante = new Map<string, RawMensajeEstudiante[]>();
  for (const mensaje of mensajes) {
    porEstudiante.set(mensaje.estudiante_id, [...(porEstudiante.get(mensaje.estudiante_id) ?? []), mensaje]);
  }

  for (const [estudianteId, grupo] of [...porEstudiante].slice(0, 10)) {
    const nombre = grupo[0].gestionesjj_estudiantes?.nombre ?? "Estudiante";
    const cuerpo = grupo
      .map((m) => `<i>${esc(fechaHora(m.created_at))}</i>\n${esc(m.contenido ?? "")}${m.archivo_nombre ? `\n📎 ${esc(m.archivo_nombre)}` : ""}`)
      .join("\n\n");
    const res = await enviarMensaje(
      chatId,
      `💬 <b>${esc(nombre)}</b> (${grupo.length} sin leer)\n\n${recortar(cuerpo, 3500)}\n\n<i>Responde a este mensaje para contestarle.</i>`,
    );
    if (res.ok) {
      await admin
        .from("gestionesjj_telegram_hilos")
        .insert({ chat_id: chatId, message_id: res.result.message_id, tipo: "mensaje_estudiante", ref_id: estudianteId });
    }
  }
}

/**
 * Si el mensaje respondido es un aviso con hilo, ejecuta la accion y devuelve
 * el texto de confirmacion. Devuelve null si no habia hilo (se trata como un
 * mensaje normal).
 */
async function responderHilo(admin: SupabaseClient, config: TelegramConfig, messageId: number, texto: string) {
  const { data: hilo } = await admin
    .from("gestionesjj_telegram_hilos")
    .select("tipo,ref_id")
    .eq("chat_id", config.chatId)
    .eq("message_id", messageId)
    .maybeSingle();
  if (!hilo) return null;

  if (hilo.tipo === "mensaje_estudiante") {
    if (texto.length > 4000) return "El mensaje es demasiado largo (máximo 4000 caracteres).";

    const { data: estudiante } = await admin
      .from("gestionesjj_estudiantes")
      .select("nombre,activo")
      .eq("id", hilo.ref_id)
      .maybeSingle();
    if (!estudiante?.activo) return "La cuenta de ese estudiante ya no está activa; no se envió la respuesta.";

    const { error } = await admin.from("gestionesjj_estudiante_mensajes").insert({
      estudiante_id: hilo.ref_id,
      remitente: "docente",
      contenido: texto,
      leido_docente: true,
      leido_estudiante: false,
    });
    if (error) return "No se pudo enviar la respuesta.";

    // Contestar implica haber leido lo que el estudiante mando.
    await admin
      .from("gestionesjj_estudiante_mensajes")
      .update({ leido_docente: true })
      .eq("estudiante_id", hilo.ref_id)
      .eq("remitente", "estudiante")
      .eq("leido_docente", false);

    return `📤 Respuesta enviada a <b>${esc(estudiante.nombre)}</b>. La verá en su panel de estudiante.`;
  }

  return null;
}

// ============================================================
// Botones (callback_query)
// ============================================================

async function procesarCallback(admin: SupabaseClient, query: CallbackQuery) {
  const config = await leerConfig();
  const chatId = query.message?.chat.id;
  const responder = (text: string) => telegramApi("answerCallbackQuery", { callback_query_id: query.id, text });

  if (!config?.chatId || chatId !== config.chatId || query.from.id !== config.chatId) {
    await responder("No autorizado.");
    return;
  }

  const [ambito, accion, id] = (query.data ?? "").split(":");
  const messageId = query.message!.message_id;

  if (ambito === "sol" && id) {
    const { data: sol } = await admin
      .from("gestionesjj_solicitudes_cita")
      .select("nombre,telefono,email,motivo,inicio,ya_es_paciente,primera_sesion,dar_seguimiento")
      .eq("id", id)
      .maybeSingle();
    if (!sol) {
      await responder("La solicitud ya no existe.");
      await editarMensaje(chatId, messageId, "🩺 Esta solicitud ya no existe.");
      return;
    }
    const base = textoSolicitudCita(sol as RawSolicitud);

    if (accion === "ap" || accion === "vp") {
      // "vp": vincular al paciente que coincide (se recalcula al tocar el boton).
      let paciente: { id: string; nombre: string } | null = null;
      if (accion === "vp") {
        paciente = buscarCoincidencia(await pacientesComparables(admin), sol as RawSolicitud)?.paciente ?? null;
        if (!paciente) {
          await responder("Ya no encuentro al paciente que coincidía. Apruébala desde el panel.");
          return;
        }
      }
      const { data: citaId, error } = await admin.rpc("gestionesjj_telegram_aprobar_solicitud", {
        p_solicitud_id: id,
        p_owner_id: config.ownerId,
        p_paciente_id: paciente?.id ?? null,
      });
      if (error) {
        await responder(error.message.slice(0, 190));
        return;
      }
      await responder("Cita aprobada.");
      await editarMensaje(
        chatId,
        messageId,
        `${base}\n\n✅ <b>Aprobada</b>${paciente ? ` en el expediente de ${esc(paciente.nombre)}` : " — paciente nuevo creado"}. Ya está en tu agenda.`,
      );
      if (citaId) await sincronizarCitaGoogle(admin, citaId as string).catch(() => undefined);
      return;
    }

    if (accion === "re") {
      const { data: actualizadas, error } = await admin
        .from("gestionesjj_solicitudes_cita")
        .update({ estado: "rechazada" })
        .eq("id", id)
        .eq("estado", "pendiente")
        .select("id");
      if (error || !actualizadas?.length) {
        await responder("La solicitud ya no está pendiente.");
        return;
      }
      await responder("Solicitud rechazada.");
      await editarMensaje(chatId, messageId, `${base}\n\n❌ <b>Rechazada</b>`);
      return;
    }
  }

  if (ambito === "gr" && id) {
    const accionReserva = accion === "vp" ? "vincular" : accion === "nv" ? "crear" : accion === "ig" ? "ignorar" : null;
    if (!accionReserva) {
      await responder("Acción no reconocida.");
      return;
    }
    const resultado = await resolverReserva(admin, config.ownerId, id, accionReserva, { config });
    await responder((resultado.ok ? resultado.mensaje : resultado.error).slice(0, 190));
    if (!resultado.ok) await enviarMensaje(chatId, `⚠️ ${esc(resultado.error)}`, { responderA: messageId });
    return;
  }

  if (ambito === "pen" && accion === "ok" && id) {
    const { data: item, error } = await admin
      .from("gestionesjj_pendientes_items")
      .update({ estado: "listo" })
      .eq("id", id)
      .select("titulo")
      .maybeSingle();
    if (error || !item) {
      await responder("No se encontró el pendiente.");
      return;
    }
    await responder(`Listo: ${item.titulo}`.slice(0, 190));
    await enviarMensaje(chatId, `✅ Marcado como listo: <b>${esc(item.titulo)}</b>`);
    return;
  }

  await responder("Acción no reconocida.");
}
