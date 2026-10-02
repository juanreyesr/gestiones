import type { SupabaseClient } from "@supabase/supabase-js";
import { enlaceWhatsApp, telefonoWhatsApp } from "@/lib/clinica/recordatorio";
import { enviarMensaje, esc, fechaHora, type TelegramConfig } from "./telegram";

/** Intentos de aviso antes de dejar el mensaje con el error a la vista (igual que en la migracion 046). */
export const MAX_INTENTOS_MENSAJE = 5;

type RawMensaje = {
  id: string;
  telefono: string;
  mensaje: string;
  programado_para: string;
  intentos: number;
};

/**
 * Manda a Telegram los mensajes programados cuya hora ya llego, cada uno con
 * un boton que abre WhatsApp con el numero y el mensaje listos. Lo dispara
 * pg_cron cada minuto (migracion 046), solo cuando hay alguno vencido.
 *
 * Cada mensaje se "reclama" antes de enviarlo (avisado_at pasa de null a
 * ahora en un solo UPDATE): si dos ejecuciones se cruzan, solo una lo manda.
 * Si Telegram falla se libera y se reintenta el minuto siguiente.
 */
export async function enviarMensajesProgramados(admin: SupabaseClient, config: TelegramConfig | null) {
  const ahora = new Date().toISOString();

  if (!config?.chatId) {
    // Sin chat vinculado no hay a donde avisar: se cuenta el intento para que
    // el cron no siga llamando para siempre y la vista muestre el motivo.
    const { data: vencidos } = await admin
      .from("gestionesjj_mensajes_programados")
      .select("id,intentos")
      .is("avisado_at", null)
      .lt("intentos", MAX_INTENTOS_MENSAJE)
      .lte("programado_para", ahora);
    for (const fila of (vencidos ?? []) as { id: string; intentos: number }[]) {
      await admin
        .from("gestionesjj_mensajes_programados")
        .update({ intentos: fila.intentos + 1, error: "Telegram no está vinculado." })
        .eq("id", fila.id);
    }
    return 0;
  }

  const { data } = await admin
    .from("gestionesjj_mensajes_programados")
    .update({ avisado_at: ahora })
    .is("avisado_at", null)
    .lt("intentos", MAX_INTENTOS_MENSAJE)
    .lte("programado_para", ahora)
    .select("id,telefono,mensaje,programado_para,intentos");

  const mensajes = ((data ?? []) as RawMensaje[]).sort((a, b) => a.programado_para.localeCompare(b.programado_para));

  let enviados = 0;
  for (const fila of mensajes) {
    const numero = telefonoWhatsApp(fila.telefono);
    const texto = [
      `💬 <b>Mensaje programado</b> — ${esc(fechaHora(fila.programado_para))}`,
      `📱 Para: <b>+${esc(numero)}</b>`,
      "",
      esc(fila.mensaje),
    ].join("\n");

    let res = await enviarMensaje(config.chatId, texto, {
      botones: [[{ text: "📲 Enviar por WhatsApp", url: enlaceWhatsApp(fila.telefono, fila.mensaje) }]],
    });
    if (!res.ok) {
      // Un mensaje muy largo puede pasarse del limite de la URL del boton: se
      // abre el chat sin texto y el mensaje queda arriba para copiarlo.
      res = await enviarMensaje(config.chatId, `${texto}\n\n<i>Copia el mensaje y pégalo en el chat.</i>`, {
        botones: [[{ text: "📲 Abrir chat de WhatsApp", url: `https://wa.me/${numero}` }]],
      });
    }

    if (res.ok) {
      enviados += 1;
      if (fila.intentos) await admin.from("gestionesjj_mensajes_programados").update({ error: null }).eq("id", fila.id);
    } else {
      await admin
        .from("gestionesjj_mensajes_programados")
        .update({ avisado_at: null, intentos: fila.intentos + 1, error: res.error })
        .eq("id", fila.id);
    }
  }
  return enviados;
}
