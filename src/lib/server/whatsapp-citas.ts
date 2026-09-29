import type { SupabaseClient } from "@supabase/supabase-js";
import { mismaHoraQueConsultorio, nombreZona, paisDe, telefonoInternacional, ZONA_CONSULTORIO, zonaDe } from "@/lib/paises";
import { enviarMensaje, esc, fechaHora, notificar, type TelegramConfig } from "./telegram";
import { enviarPlantilla, enviarTexto, isWhatsAppConfigured, type WebhookWhatsApp } from "./whatsapp";

/** El recordatorio sale 24 h antes de la cita. */
export const HORAS_ANTES_WHATSAPP = 24;
/** Citas agendadas con menos anticipacion que esto no reciben recordatorio (ya estan frescas). */
const MINIMO_HORAS_ANTES = 2;
/**
 * Un envio que WhatsApp rechazo (plantilla aun sin aprobar, numero mal
 * configurado...) se reintenta cada tanto mientras la cita siga en la ventana.
 * Los que fallaron despues de salir (sin entrega) no se reintentan.
 */
const MINUTOS_ENTRE_REINTENTOS = 30;

type RawCitaWhatsApp = {
  id: string;
  inicio: string;
  estado: string;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  gestionesjj_pacientes: {
    nombre: string;
    telefono: string | null;
    pais: string | null;
    zona_horaria: string | null;
    whatsapp_recordatorios: boolean | null;
  } | null;
};

const SELECT_CITA =
  "id,inicio,estado,contacto_nombre,contacto_telefono,gestionesjj_pacientes(nombre,telefono,pais,zona_horaria,whatsapp_recordatorios)";

function datosPaciente(cita: RawCitaWhatsApp) {
  const telefono = cita.gestionesjj_pacientes?.telefono ?? cita.contacto_telefono;
  const datos = { pais: cita.gestionesjj_pacientes?.pais, zonaHoraria: cita.gestionesjj_pacientes?.zona_horaria, telefono };
  return {
    nombre: cita.gestionesjj_pacientes?.nombre ?? cita.contacto_nombre ?? "",
    numero: telefonoInternacional(telefono, paisDe(datos)),
    zona: zonaDe(datos),
  };
}

/**
 * Parametros de la plantilla: {{1}} nombre, {{2}} fecha y {{3}} hora, en la
 * zona horaria del paciente (si no es la de Guatemala, se aclara).
 */
export function parametrosRecordatorio(nombreCompleto: string, inicioIso: string, zona: string) {
  const instante = new Date(inicioIso);
  const fecha = new Intl.DateTimeFormat("es-GT", { timeZone: zona, weekday: "long", day: "numeric", month: "long" }).format(instante);
  const hora = new Intl.DateTimeFormat("es-GT", { timeZone: zona, hour: "numeric", minute: "2-digit" }).format(instante);
  const horaGt = new Intl.DateTimeFormat("es-GT", { timeZone: ZONA_CONSULTORIO, hour: "numeric", minute: "2-digit" }).format(instante);
  const aclaracion = mismaHoraQueConsultorio(zona, instante)
    ? ""
    : ` (hora de ${nombreZona(zona).replace(/\s*\(.*?\)/g, "")}; en Guatemala: ${horaGt})`;
  return [nombreCompleto.split(" ")[0] || "Hola", fecha, `${hora}${aclaracion}`];
}

/**
 * Envia el recordatorio de WhatsApp de las citas que empiezan entre 2 y 24
 * horas desde ahora. Lo llama el cron de cada 10 minutos. Cada cita se
 * recuerda una sola vez por horario (si se reprograma, se vuelve a recordar).
 */
export async function enviarRecordatoriosWhatsApp(admin: SupabaseClient, config: TelegramConfig | null) {
  if (!isWhatsAppConfigured()) return 0;

  const ahora = Date.now();
  const { data } = await admin
    .from("gestionesjj_citas")
    .select(SELECT_CITA)
    .gte("inicio", new Date(ahora + MINIMO_HORAS_ANTES * 3_600_000).toISOString())
    .lte("inicio", new Date(ahora + HORAS_ANTES_WHATSAPP * 3_600_000).toISOString())
    .in("estado", ["pendiente", "confirmada"])
    .order("inicio")
    .limit(40);

  let enviados = 0;
  for (const cita of (data ?? []) as unknown as RawCitaWhatsApp[]) {
    if (cita.gestionesjj_pacientes?.whatsapp_recordatorios === false) continue;
    const { nombre, numero, zona } = datosPaciente(cita);
    if (!numero) continue;

    // Se registra antes de enviar: si dos ejecuciones se cruzan, solo una gana.
    const { data: registro } = await admin
      .from("gestionesjj_whatsapp_mensajes")
      .upsert({ cita_id: cita.id, inicio: cita.inicio, telefono: numero }, { onConflict: "cita_id,inicio", ignoreDuplicates: true })
      .select("id");
    let registroId = (registro as Array<{ id: string }> | null)?.[0]?.id;
    let reintento = false;
    if (!registroId) {
      // Ya habia registro: solo se toma de nuevo si WhatsApp rechazo el envio hace rato.
      const { data: previo } = await admin
        .from("gestionesjj_whatsapp_mensajes")
        .update({ estado: "enviando", error: null, telefono: numero })
        .eq("cita_id", cita.id)
        .eq("inicio", cita.inicio)
        .eq("estado", "fallido")
        .is("wa_message_id", null)
        .lt("updated_at", new Date(ahora - MINUTOS_ENTRE_REINTENTOS * 60_000).toISOString())
        .select("id");
      registroId = (previo as Array<{ id: string }> | null)?.[0]?.id;
      reintento = true;
    }
    if (!registroId) continue;

    const res = await enviarPlantilla({
      telefono: numero,
      plantilla: process.env.WHATSAPP_TEMPLATE_CITA as string,
      cuerpo: parametrosRecordatorio(nombre, cita.inicio, zona),
      payloadsBotones: [`confirmar:${cita.id}`, `reprogramar:${cita.id}`],
    });

    if (res.ok) {
      enviados += 1;
      await admin.from("gestionesjj_whatsapp_mensajes").update({ wa_message_id: res.id, estado: "enviado" }).eq("id", registroId);
      if (reintento && config?.chatId) {
        await enviarMensaje(
          config.chatId,
          `✅ <b>Recordatorio de WhatsApp enviado</b> (reintento)\n👤 ${esc(nombre || "Paciente")} · ${esc(fechaHora(cita.inicio))}`,
        );
      }
    } else {
      await admin.from("gestionesjj_whatsapp_mensajes").update({ estado: "fallido", error: res.error }).eq("id", registroId);
      // Se avisa solo la primera vez; los reintentos fallidos no llenan el chat.
      if (!reintento && config?.chatId) {
        await enviarMensaje(
          config.chatId,
          `⚠️ <b>No se envió el recordatorio de WhatsApp</b>\n👤 ${esc(nombre || "Paciente")} · ${esc(fechaHora(cita.inicio))}\n<i>${esc(res.error)}</i>\n\nLo reintento cada ${MINUTOS_ENTRE_REINTENTOS} min hasta ${MINIMO_HORAS_ANTES} h antes de la cita. Puedes probar la plantilla con /probarwhatsapp.`,
        );
      }
    }
  }
  return enviados;
}

const ORDEN_ESTADO = { enviando: 0, enviado: 1, entregado: 2, leido: 3, fallido: 4 } as const;
const ESTADO_WA: Record<string, keyof typeof ORDEN_ESTADO> = {
  sent: "enviado",
  delivered: "entregado",
  read: "leido",
  failed: "fallido",
};

/** Ultimos 8 digitos: compara numeros aunque uno traiga el codigo de pais y el otro no. */
const ultimos8 = (numero: string) => numero.replace(/\D/g, "").slice(-8);

/**
 * Procesa lo que Meta manda al webhook: estados de entrega de los
 * recordatorios y las respuestas del paciente a los botones.
 */
export async function procesarWebhookWhatsApp(admin: SupabaseClient, cuerpo: WebhookWhatsApp) {
  for (const entry of cuerpo.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      for (const status of value.statuses ?? []) {
        const nuevo = ESTADO_WA[status.status];
        if (!nuevo) continue;
        // Los estados pueden llegar desordenados: nunca se retrocede (leido no vuelve a entregado).
        const anteriores = (Object.keys(ORDEN_ESTADO) as Array<keyof typeof ORDEN_ESTADO>).filter(
          (estado) => ORDEN_ESTADO[estado] < ORDEN_ESTADO[nuevo],
        );
        const error = status.errors?.[0];
        await admin
          .from("gestionesjj_whatsapp_mensajes")
          .update({
            estado: nuevo,
            ...(nuevo === "fallido" ? { error: error?.message ?? error?.title ?? `Error ${error?.code ?? ""}`.trim() } : {}),
          })
          .eq("wa_message_id", status.id)
          .in("estado", anteriores);
      }

      for (const mensaje of value.messages ?? []) {
        const payload = mensaje.button?.payload ?? mensaje.interactive?.button_reply?.id ?? "";
        const prueba = /^prueba:(confirmar|reprogramar)$/i.exec(payload);
        if (prueba) {
          await procesarRespuestaPrueba(prueba[1].toLowerCase(), mensaje.from);
          continue;
        }
        const coincide = /^(confirmar|reprogramar):([0-9a-f-]{36})$/i.exec(payload);
        if (!coincide) continue; // Cualquier otro mensaje se atiende desde la app de WhatsApp.
        await procesarRespuesta(admin, coincide[1].toLowerCase() as "confirmar" | "reprogramar", coincide[2], mensaje.from);
      }
    }
  }
}

async function procesarRespuesta(admin: SupabaseClient, accion: "confirmar" | "reprogramar", citaId: string, remitente: string) {
  const { data: registros } = await admin
    .from("gestionesjj_whatsapp_mensajes")
    .select("id,telefono,respuesta")
    .eq("cita_id", citaId)
    .order("created_at", { ascending: false })
    .limit(1);
  const registro = (registros as Array<{ id: string; telefono: string; respuesta: string | null }> | null)?.[0];
  // Solo cuenta si responde el mismo numero al que se le envio el recordatorio.
  if (!registro || ultimos8(registro.telefono) !== ultimos8(remitente)) return;
  if (registro.respuesta === accion) return; // Toco el mismo boton dos veces.

  await admin
    .from("gestionesjj_whatsapp_mensajes")
    .update({ respuesta: accion, respondido_at: new Date().toISOString() })
    .eq("id", registro.id);

  const { data: citaData } = await admin.from("gestionesjj_citas").select(SELECT_CITA).eq("id", citaId).maybeSingle();
  const cita = citaData as unknown as RawCitaWhatsApp | null;
  if (!cita) return;
  const { nombre } = datosPaciente(cita);
  const vigente = ["pendiente", "confirmada"].includes(cita.estado) && Date.parse(cita.inicio) > Date.now();

  if (accion === "confirmar") {
    if (vigente && cita.estado !== "confirmada") {
      await admin.from("gestionesjj_citas").update({ estado: "confirmada" }).eq("id", citaId);
    }
    await enviarTexto(registro.telefono, "¡Gracias! Tu cita quedó confirmada. Te espero.");
    await notificar(
      "whatsapp_respuestas",
      `✅ <b>${esc(nombre || "Paciente")} confirmó su cita</b>\n📅 ${esc(fechaHora(cita.inicio))}`,
    );
    return;
  }

  await enviarTexto(registro.telefono, "Gracias por avisar. En breve te escribo para buscar otro horario.");
  await notificar(
    "whatsapp_respuestas",
    `🔁 <b>${esc(nombre || "Paciente")} pide reprogramar</b>\n📅 ${esc(fechaHora(cita.inicio))}\n<i>La cita sigue en la agenda hasta que la muevas.</i>`,
    { botones: [[{ text: "💬 Escribirle por WhatsApp", url: `https://wa.me/${registro.telefono}` }]] },
  );
}

// ============================================================
// Prueba desde Telegram (/probarwhatsapp)
// ============================================================

/**
 * Envia la plantilla de recordatorio a un numero para probarla sin esperar a
 * una cita real. Los botones llevan payload "prueba:..." para que la
 * respuesta confirme tambien que el webhook funciona, sin tocar ninguna cita.
 */
export async function enviarPruebaWhatsApp(telefono: string, nombre: string) {
  if (!isWhatsAppConfigured()) return { ok: false as const, error: "WhatsApp no está configurado en el servidor (faltan variables en Vercel)." };
  const numero = telefonoInternacional(telefono, paisDe({ telefono }));
  if (numero.length < 8) return { ok: false as const, error: "Ese número no parece válido." };
  const manana = new Date(Date.now() + 86_400_000);
  manana.setUTCHours(16, 0, 0, 0); // 10:00 a. m. en Guatemala
  const res = await enviarPlantilla({
    telefono: numero,
    plantilla: process.env.WHATSAPP_TEMPLATE_CITA as string,
    cuerpo: parametrosRecordatorio(nombre, manana.toISOString(), ZONA_CONSULTORIO),
    payloadsBotones: ["prueba:confirmar", "prueba:reprogramar"],
  });
  return res.ok ? { ok: true as const, numero } : { ok: false as const, error: res.error, numero };
}

async function procesarRespuestaPrueba(accion: string, remitente: string) {
  await enviarTexto(remitente, "✅ Prueba recibida: los botones del recordatorio funcionan.");
  await notificar(
    "whatsapp_respuestas",
    `🧪 <b>Respuesta de prueba recibida</b>\nTocaste «${accion === "confirmar" ? "Confirmo" : "Necesito reprogramar"}» desde +${esc(remitente)}. El webhook de WhatsApp funciona: las confirmaciones de los pacientes llegarán aquí.`,
  );
}
