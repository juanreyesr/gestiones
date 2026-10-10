import type { SupabaseClient } from "@supabase/supabase-js";
import { paisDe, telefonoInternacional, ZONA_CONSULTORIO, zonaDe } from "@/lib/paises";
import type { AvisoPago } from "./paypal";
import { esc } from "./telegram";
import { enviarPlantilla, whatsAppConectado } from "./whatsapp";

/** Parametros de la plantilla: {{1}} primer nombre, {{2}} monto, {{3}} fecha de la cita. */
function parametrosPago(nombreCompleto: string, monto: string, inicioIso: string, zona: string) {
  const fecha = new Intl.DateTimeFormat("es-GT", { timeZone: zona, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(inicioIso),
  );
  return [nombreCompleto.split(" ")[0] || "Hola", monto, fecha];
}

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

  const res = await enviarPlantilla({
    telefono: numero,
    plantilla,
    cuerpo: parametrosPago(paciente.nombre, aviso.monto ?? "tu pago", aplicado.citaInicio, zonaDe(datos)),
  });
  return res.ok
    ? "📲 Le confirmé el pago por WhatsApp."
    : `⚠️ No se envió la confirmación por WhatsApp: <i>${esc(res.error)}</i>`;
}

/**
 * Envia la plantilla de pago a un numero para probarla sin un pago real
 * (/probarpago en Telegram). Usa un monto y una cita de manana de ejemplo.
 */
export async function enviarPruebaPagoWhatsApp(telefono: string, nombre: string) {
  const plantilla = process.env.WHATSAPP_TEMPLATE_PAGO;
  if (!whatsAppConectado()) {
    return { ok: false as const, error: "WhatsApp no está configurado en el servidor (faltan variables en Vercel)." };
  }
  if (!plantilla) {
    return { ok: false as const, error: "Falta WHATSAPP_TEMPLATE_PAGO en Vercel (nombre de la plantilla aprobada, p. ej. pago_recibido)." };
  }
  const numero = telefonoInternacional(telefono, paisDe({ telefono }));
  if (numero.length < 8) return { ok: false as const, error: "Ese número no parece válido." };
  const manana = new Date(Date.now() + 86_400_000);
  manana.setUTCHours(16, 0, 0, 0); // 10:00 a. m. en Guatemala
  const res = await enviarPlantilla({
    telefono: numero,
    plantilla,
    cuerpo: parametrosPago(nombre, "50.00 USD", manana.toISOString(), ZONA_CONSULTORIO),
  });
  return res.ok ? { ok: true as const, numero } : { ok: false as const, error: res.error, numero };
}
