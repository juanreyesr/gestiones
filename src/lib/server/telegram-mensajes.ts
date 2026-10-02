import type { SupabaseClient } from "@supabase/supabase-js";
import { telefonoWhatsApp } from "@/lib/clinica/recordatorio";
import { fechaHoraLarga, instanteLocal, parsearFechaHora, ymdLocal } from "@/lib/fecha-hora-texto";
import { MAX_INTENTOS_MENSAJE } from "./mensajes-programados";
import { type BotonInline, type TelegramConfig, editarMensaje, enviarMensaje, esc, fechaHora, recortar } from "./telegram";

/**
 * /programar: el bot pregunta paso a paso el numero, el mensaje y la hora, y
 * antes de guardar muestra un resumen con botones para confirmar o corregir.
 * Cada respuesta se valida en el momento (numero con codigo de pais, fecha
 * que exista y que no haya pasado) y, si algo no cuadra, se vuelve a preguntar
 * ese mismo dato. El paso en curso vive en gestionesjj_telegram_borrador_mensaje
 * (migracion 047); al confirmar se crea el mensaje programado (migracion 046).
 *
 * Botones: callback_data "mpr:<accion>:<valor>".
 */

const TABLA = "gestionesjj_telegram_borrador_mensaje";
const MAX_MENSAJE = 2000;
const VIGENCIA_BORRADOR_MS = 30 * 60_000;

type Paso = "telefono" | "mensaje" | "hora" | "confirmar";
type Borrador = {
  chat_id: number;
  paso: Paso;
  telefono: string | null;
  mensaje: string | null;
  programado_para: string | null;
  updated_at: string;
};

const CANCELAR: BotonInline = { text: "❌ Cancelar", callback_data: "mpr:x" };

/** "programa un mensaje", "programar mensaje", "quiero programar un mensaje"... */
export function pideProgramarMensaje(texto: string) {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /\bprogram(a|ar|ame|emos)\b.*\bmensajes?\b/.test(t);
}

export async function leerBorrador(admin: SupabaseClient, chatId: number): Promise<Borrador | null> {
  const { data } = await admin.from(TABLA).select("*").eq("chat_id", chatId).maybeSingle();
  const borrador = data as Borrador | null;
  if (!borrador) return null;
  if (Date.now() - Date.parse(borrador.updated_at) > VIGENCIA_BORRADOR_MS) {
    await admin.from(TABLA).delete().eq("chat_id", chatId);
    return null;
  }
  return borrador;
}

export async function descartarBorrador(admin: SupabaseClient, chatId: number) {
  const { data } = await admin.from(TABLA).delete().eq("chat_id", chatId).select("chat_id");
  return Boolean(data?.length);
}

function siguientePaso(b: Pick<Borrador, "telefono" | "mensaje" | "programado_para">): Paso {
  if (!b.telefono) return "telefono";
  if (!b.mensaje) return "mensaje";
  if (!b.programado_para) return "hora";
  return "confirmar";
}

async function guardar(admin: SupabaseClient, borrador: Omit<Borrador, "paso" | "updated_at">) {
  const paso = siguientePaso(borrador);
  await admin.from(TABLA).upsert({ ...borrador, paso, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
  return { ...borrador, paso } as Borrador;
}

function numeroLegible(telefono: string) {
  return `+${telefonoWhatsApp(telefono)}`;
}

/** Valida lo escrito como numero: solo digitos y signos de telefono, 8 a 15 digitos con codigo de pais. */
function validarTelefono(texto: string): { ok: true; telefono: string } | { ok: false; motivo: string } {
  const limpio = texto.trim();
  if (!/^[+\d][\d\s().-]*$/.test(limpio)) {
    return { ok: false, motivo: "Eso no parece un número: escribe solo dígitos (puedes usar espacios, guiones o +)." };
  }
  const numero = telefonoWhatsApp(limpio);
  if (numero.length < 8 || numero.length > 15) {
    return { ok: false, motivo: `El número tiene ${numero.length} dígitos con el código de país; revisa que esté completo.` };
  }
  return { ok: true, telefono: limpio };
}

// ============================================================
// Preguntas de cada paso
// ============================================================

function botonesHora(): BotonInline[][] {
  const ahora = Date.now();
  const hoy = ymdLocal(ahora);
  const manana = ymdLocal(Date.parse(`${hoy}T12:00:00-06:00`) + 86_400_000);
  const opcion = (texto: string, instante: number): BotonInline => ({
    text: texto,
    callback_data: `mpr:h:${Math.round(instante / 60_000)}`,
  });
  const filas: BotonInline[][] = [[opcion("En 1 hora", ahora + 60 * 60_000)]];
  const hoyTarde = instanteLocal(hoy, 18, 0);
  if (hoyTarde - ahora > 10 * 60_000) filas[0].push(opcion("Hoy 6:00 p. m.", hoyTarde));
  filas.push([
    opcion("Mañana 7:00 a. m.", instanteLocal(manana, 7, 0)),
    opcion("Mañana 8:00 a. m.", instanteLocal(manana, 8, 0)),
  ]);
  filas.push([opcion("Mañana 12:00 p. m.", instanteLocal(manana, 12, 0)), CANCELAR]);
  return filas;
}

function textoResumen(b: Borrador) {
  return [
    "📋 <b>Revisa antes de programar</b>",
    `📱 Para: <b>${esc(numeroLegible(b.telefono!))}</b>`,
    `🕐 Cuándo: <b>${esc(fechaHoraLarga(b.programado_para!))}</b> (hora de Guatemala)`,
    "💬 Mensaje:",
    esc(b.mensaje!),
  ].join("\n");
}

const BOTONES_RESUMEN: BotonInline[][] = [
  [{ text: "✅ Programar", callback_data: "mpr:ok" }, CANCELAR],
  [
    { text: "✏️ Número", callback_data: "mpr:e:tel" },
    { text: "✏️ Mensaje", callback_data: "mpr:e:msg" },
    { text: "🕐 Hora", callback_data: "mpr:e:hora" },
  ],
];

async function preguntar(chatId: number, b: Borrador, aviso?: string) {
  const previo = aviso ? `⚠️ ${esc(aviso)}\n\n` : "";
  switch (b.paso) {
    case "telefono":
      await enviarMensaje(
        chatId,
        `${previo}🗓 <b>Programar mensaje</b> — paso 1 de 3\n📱 ¿A qué número de WhatsApp?\n<i>Ej. 4000-1234. Si no es de Guatemala, con +código: +52 55 1234 5678</i>`,
        { botones: [[CANCELAR]] },
      );
      return;
    case "mensaje":
      await enviarMensaje(
        chatId,
        `${previo}📱 Para: <b>${esc(numeroLegible(b.telefono!))}</b>\n\n💬 <b>Paso 2 de 3</b> — escribe el mensaje tal como lo quieres enviar.`,
        { botones: [[CANCELAR]] },
      );
      return;
    case "hora":
      await enviarMensaje(
        chatId,
        `${previo}🕐 <b>Paso 3 de 3</b> — ¿cuándo te lo recuerdo?\nToca una opción o escribe, por ejemplo: <i>mañana 7:30</i>, <i>viernes 9 am</i>, <i>15/10 14:30</i>, <i>15 de octubre 3 pm</i>, <i>en 2 horas</i>.`,
        { botones: botonesHora() },
      );
      return;
    case "confirmar":
      await enviarMensaje(chatId, `${previo}${textoResumen(b)}`, { botones: BOTONES_RESUMEN });
  }
}

// ============================================================
// Entradas desde procesarUpdate
// ============================================================

export async function iniciarProgramacion(admin: SupabaseClient, chatId: number, argumento: string) {
  const vacio = { chat_id: chatId, telefono: null, mensaje: null, programado_para: null };
  // "/programar 4000-1234" ya trae el numero.
  const telefono = argumento.trim() ? validarTelefono(argumento) : null;
  const borrador = await guardar(admin, telefono?.ok ? { ...vacio, telefono: telefono.telefono } : vacio);
  await preguntar(chatId, borrador, telefono && !telefono.ok ? telefono.motivo : undefined);
}

/** Respuesta escrita mientras hay un borrador en curso. */
export async function responderBorrador(admin: SupabaseClient, chatId: number, borrador: Borrador, texto: string) {
  if (!texto) {
    await preguntar(chatId, borrador, "Envíame la respuesta como texto.");
    return;
  }

  if (borrador.paso === "telefono") {
    const telefono = validarTelefono(texto);
    if (!telefono.ok) return preguntar(chatId, borrador, telefono.motivo);
    return preguntar(chatId, await guardar(admin, { ...borrador, telefono: telefono.telefono }));
  }

  if (borrador.paso === "mensaje") {
    if (texto.length > MAX_MENSAJE) {
      return preguntar(chatId, borrador, `El mensaje tiene ${texto.length} caracteres; el máximo es ${MAX_MENSAJE}.`);
    }
    return preguntar(chatId, await guardar(admin, { ...borrador, mensaje: texto }));
  }

  if (borrador.paso === "hora") {
    const fecha = parsearFechaHora(texto);
    if (!fecha.ok) return preguntar(chatId, borrador, fecha.motivo);
    return preguntar(chatId, await guardar(admin, { ...borrador, programado_para: fecha.iso }));
  }

  // Resumen a la vista: se confirma o corrige con los botones.
  await enviarMensaje(chatId, "Usa los botones del resumen de arriba para programarlo o corregir algo, o /cancelar.");
}

// ============================================================
// Botones (callback "mpr:...")
// ============================================================

export async function procesarCallbackProgramar(
  admin: SupabaseClient,
  config: TelegramConfig,
  chatId: number,
  messageId: number,
  accion: string,
  valor: string | undefined,
  responder: (texto: string) => Promise<unknown>,
) {
  if (accion === "dl" && valor) {
    const { data } = await admin.from("gestionesjj_mensajes_programados").delete().eq("id", valor).select("id");
    await responder(data?.length ? "Mensaje cancelado." : "Ese mensaje ya no existe.");
    const lista = await listaProgramados(admin);
    await editarMensaje(chatId, messageId, lista.texto, lista.botones);
    return;
  }

  if (accion === "del" && valor) {
    const { data } = await admin.from("gestionesjj_mensajes_programados").delete().eq("id", valor).select("id");
    await responder(data?.length ? "Mensaje cancelado." : "Ese mensaje ya no existe.");
    await editarMensaje(chatId, messageId, data?.length ? "🗑 <b>Mensaje programado cancelado.</b>" : "Ese mensaje programado ya no existe.");
    return;
  }

  const borrador = await leerBorrador(admin, chatId);

  if (accion === "x") {
    await descartarBorrador(admin, chatId);
    await responder("Cancelado.");
    await editarMensaje(chatId, messageId, "❌ Programación cancelada. Nada se guardó.");
    return;
  }

  if (!borrador) {
    await responder("Esta programación ya venció. Empieza de nuevo con /programar.");
    await editarMensaje(chatId, messageId, "⌛ Esta programación ya venció. Empieza de nuevo con /programar.");
    return;
  }

  if (accion === "h" && valor) {
    if (borrador.paso !== "hora") {
      await responder("Ese botón ya no aplica.");
      return;
    }
    const instante = Number(valor) * 60_000;
    if (!Number.isFinite(instante) || instante <= Date.now()) {
      await responder("Esa hora ya pasó; elige otra.");
      return;
    }
    await responder("Listo.");
    await editarMensaje(chatId, messageId, `🕐 Cuándo: <b>${esc(fechaHoraLarga(new Date(instante).toISOString()))}</b>`);
    await preguntar(chatId, await guardar(admin, { ...borrador, programado_para: new Date(instante).toISOString() }));
    return;
  }

  if (accion === "e") {
    const cambios =
      valor === "tel" ? { telefono: null } : valor === "msg" ? { mensaje: null } : valor === "hora" ? { programado_para: null } : null;
    if (!cambios) return;
    await responder("Dime el dato nuevo.");
    await editarMensaje(chatId, messageId, `${textoResumen(borrador)}\n\n<i>✏️ Corrigiendo…</i>`);
    await preguntar(chatId, await guardar(admin, { ...borrador, ...cambios }));
    return;
  }

  if (accion === "ok") {
    if (borrador.paso !== "confirmar") {
      await responder("Todavía faltan datos.");
      return;
    }
    if (Date.parse(borrador.programado_para!) <= Date.now()) {
      await responder("La hora ya pasó.");
      await preguntar(chatId, await guardar(admin, { ...borrador, programado_para: null }), "Mientras confirmabas, la hora ya pasó. Elige otra.");
      return;
    }
    const { data, error } = await admin
      .from("gestionesjj_mensajes_programados")
      .insert({
        created_by: config.ownerId,
        telefono: borrador.telefono,
        mensaje: borrador.mensaje,
        programado_para: borrador.programado_para,
      })
      .select("id")
      .single();
    if (error || !data) {
      await responder("No se pudo guardar.");
      await enviarMensaje(chatId, `⚠️ No se pudo guardar el mensaje: ${esc(error?.message ?? "error desconocido")}. Intenta otra vez con ✅ Programar.`);
      return;
    }
    await descartarBorrador(admin, chatId);
    await responder("¡Programado!");
    await editarMensaje(
      chatId,
      messageId,
      [
        "✅ <b>Mensaje programado</b>",
        `📱 Para: <b>${esc(numeroLegible(borrador.telefono!))}</b>`,
        `🕐 ${esc(fechaHoraLarga(borrador.programado_para!))}`,
        "💬 Mensaje:",
        esc(borrador.mensaje!),
        "",
        "<i>A esa hora te llega aquí con el botón para enviarlo por WhatsApp. También lo ves en Gestión de pendientes → Mensajes programados.</i>",
      ].join("\n"),
      [[{ text: "🗑 Cancelar este mensaje", callback_data: `mpr:del:${(data as { id: string }).id}` }]],
    );
  }
}

// ============================================================
// /programados
// ============================================================

async function listaProgramados(admin: SupabaseClient): Promise<{ texto: string; botones: BotonInline[][] }> {
  const { data } = await admin
    .from("gestionesjj_mensajes_programados")
    .select("id,telefono,mensaje,programado_para")
    .is("avisado_at", null)
    .lt("intentos", MAX_INTENTOS_MENSAJE)
    .order("programado_para")
    .limit(10);
  const filas = (data ?? []) as { id: string; telefono: string; mensaje: string; programado_para: string }[];

  if (!filas.length) {
    return { texto: "No tienes mensajes programados pendientes. Programa uno con /programar.", botones: [] };
  }

  const lineas = filas.map(
    (fila, i) =>
      `<b>${i + 1}.</b> ${esc(fechaHora(fila.programado_para))} → ${esc(numeroLegible(fila.telefono))}\n   <i>${esc(recortar(fila.mensaje.replace(/\s+/g, " "), 80))}</i>`,
  );
  // "dl" (desde la lista) vuelve a dibujar la lista tras cancelar uno.
  const botones = filas.map((fila, i) => [{ text: `🗑 Cancelar el ${i + 1}`, callback_data: `mpr:dl:${fila.id}` }]);
  return { texto: `🗓 <b>Mensajes programados</b>\n\n${lineas.join("\n")}`, botones };
}

export async function enviarListaProgramados(admin: SupabaseClient, chatId: number) {
  const lista = await listaProgramados(admin);
  await enviarMensaje(chatId, lista.texto, { botones: lista.botones });
}
