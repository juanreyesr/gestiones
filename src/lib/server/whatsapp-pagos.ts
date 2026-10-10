import type { SupabaseClient } from "@supabase/supabase-js";
import { paisDe, telefonoInternacional, zonaDe } from "@/lib/paises";
import type { AvisoPago } from "./paypal";
import { esc } from "./telegram";
import { enviarPlantilla, whatsAppConectado } from "./whatsapp";

/**
 * Confirmacion de pago al paciente por WhatsApp, despues de que el webhook de
 * PayPal aplico el pago a su cita. Usa la plantilla WHATSAPP_TEMPLATE_PAGO
 * (categoria Utilidad): {{1}} nombre, {{2}} monto y {{3}} fecha de la cita.
 * Sin esa variable no se envia nada.
 *
 * Devuelve la linea que se agrega al aviso de Telegram (null si no aplica).
 */
export async function confirmarPagoPorWhatsApp(
  admin: SupabaseClient,
  aviso: AvisoPago,
  aplicado: { pacienteId: string; citaInicio: string },
): Promise<string | null> {
  const plantilla = process.env.WHATSAPP_TEMPLATE_PAGO;
  if (!plantilla || !whatsAppConectado()) return null;

  const { data } = await admin
    .from("gestionesjj_pacientes")
    .select("nombre,telefono,pais,zona_horaria,whatsapp_recordatorios")
    .eq("id", aplicado.pacienteId)
    .maybeSingle();
  const paciente = data as {
    nombre: string;
    telefono: string | null;
    pais: string | null;
    zona_horaria: string | null;
    whatsapp_recordatorios: boolean | null;
  } | null;
  if (!paciente) return null;
  // La misma casilla de la ficha apaga todos los mensajes automaticos de WhatsApp.
  if (paciente.whatsapp_recordatorios === false) {
    return "ℹ️ No le envié la confirmación por WhatsApp: tiene apagados los mensajes automáticos.";
  }

  const datos = { pais: paciente.pais, zonaHoraria: paciente.zona_horaria, telefono: paciente.telefono };
  const numero = telefonoInternacional(paciente.telefono, paisDe(datos));
  if (!numero) return "ℹ️ No le envié la confirmación por WhatsApp: no tiene teléfono en su ficha.";

  const fecha = new Intl.DateTimeFormat("es-GT", {
    timeZone: zonaDe(datos),
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(aplicado.citaInicio));

  const res = await enviarPlantilla({
    telefono: numero,
    plantilla,
    cuerpo: [paciente.nombre.split(" ")[0] || "Hola", aviso.monto ?? "tu pago", fecha],
  });
  return res.ok
    ? "📲 Le confirmé el pago por WhatsApp."
    : `⚠️ No se envió la confirmación por WhatsApp: <i>${esc(res.error)}</i>`;
}
