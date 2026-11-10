import { horaGuatemala, saludoPorHora } from "@/lib/control-revision-mensajes";
import { enlaceWhatsApp } from "./recordatorio";

/**
 * Inicio de un mensaje libre al paciente: "Buenas tardes, Ana, te escribo para "
 * (el saludo segun la hora de Guatemala en ese momento); lo demas lo escribe Juan.
 */
export function mensajeParaPaciente(nombre: string, hora = horaGuatemala()) {
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? "";
  return `${saludoPorHora(hora)}${primerNombre ? `, ${primerNombre}` : ""}, te escribo para `;
}

/** Enlace de WhatsApp con ese inicio de mensaje ya escrito. */
export const enlaceMensajePaciente = (paciente: { nombre: string; telefono: string | null; pais?: string | null }) =>
  enlaceWhatsApp(paciente.telefono, mensajeParaPaciente(paciente.nombre), paciente.pais);

const primerNombreDe = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? "";

/**
 * Mensaje para pedirle al paciente que llene la hoja de datos generales, con
 * el saludo segun la hora de Guatemala en el momento de enviarlo.
 */
export function mensajeHojaDatos(nombre: string, url: string, hora = horaGuatemala()) {
  const primerNombre = primerNombreDe(nombre);
  return [
    `${saludoPorHora(hora)}${primerNombre ? `, ${primerNombre}` : ""}, espero que estés bien. Quiero pedirte que llenes una pequeña hoja de datos generales, por favor:`,
    url,
    "Muchas gracias, saludos.",
  ].join("\n\n");
}

/**
 * Recordatorio de la hoja de datos generales y el consentimiento antes de la
 * cita. «cuando»: «mañana», «hoy» o «el martes 12 de noviembre». El saludo es
 * el de la hora de Guatemala en el momento de enviarlo.
 */
export function mensajeDatosAntesDeCita(nombre: string, url: string, cuando: string, hora = horaGuatemala()) {
  const primerNombre = primerNombreDe(nombre);
  return [
    `${saludoPorHora(hora)}${primerNombre ? `, ${primerNombre}` : ""}. Te recuerdo que ${cuando} tienes una cita agendada, por lo que quiero solicitarte que completes el siguiente formulario, por favor:`,
    url,
    "Nos vemos en sesión, saludos.",
  ].join("\n\n");
}

/** Saludo de cumpleaños para el paciente (boton del aviso de Telegram). */
export function mensajeCumpleanos(nombre: string) {
  const primerNombre = primerNombreDe(nombre);
  return `¡Feliz cumpleaños${primerNombre ? `, ${primerNombre}` : ""}! Espero que hoy pases un muy feliz cumpleaños. Que Dios te bendiga grandemente.`;
}

/**
 * Mensaje para enviar un cuestionario o evaluacion por WhatsApp. Si el
 * paciente es menor, va dirigido a los padres y pide que respondan por separado
 * cuando el enlace admite mas de una respuesta.
 */
export function mensajeEvaluacion(
  nombre: string,
  url: string,
  opciones: { esMenor: boolean; respuestas: number },
  hora = horaGuatemala()
) {
  const primerNombre = primerNombreDe(nombre);
  const cuerpo = opciones.esMenor
    ? `te comparto un breve cuestionario sobre ${primerNombre || "tu hijo o hija"} para nuestra próxima sesión.${
        opciones.respuestas > 1 ? " Si en casa hay dos cuidadores, es mejor que cada uno lo responda por separado desde el mismo enlace." : ""
      }`
    : "te comparto un breve cuestionario para nuestra próxima sesión.";
  return [
    `${saludoPorHora(hora)}, ${cuerpo} Tus respuestas son confidenciales y las revisaremos juntos en sesión:`,
    url,
    "Muchas gracias, saludos.",
  ].join("\n\n");
}

/** Mensaje para enviarle al paciente el enlace de su informe de resultados. */
export function mensajeInforme(nombre: string, url: string, hora = horaGuatemala()) {
  const primerNombre = primerNombreDe(nombre);
  return [
    `${saludoPorHora(hora)}${primerNombre ? `, ${primerNombre}` : ""}, te comparto el informe con los resultados de tu evaluación. Lo conversaremos en la próxima sesión:`,
    url,
    "Saludos.",
  ].join("\n\n");
}

/**
 * Mensaje de WhatsApp de un seguimiento programado: nueva aplicación del
 * cuestionario (para ver el avance) o recordatorio de uno que sigue pendiente.
 */
export function mensajeSeguimientoEvaluacion(
  nombre: string,
  url: string,
  opciones: { esMenor: boolean; recordatorio: boolean },
  hora = horaGuatemala()
) {
  const primerNombre = primerNombreDe(nombre);
  const saludo = `${saludoPorHora(hora)}${!opciones.esMenor && primerNombre ? `, ${primerNombre}` : ""}`;
  const cuerpo = opciones.recordatorio
    ? opciones.esMenor
      ? `te recuerdo el cuestionario sobre ${primerNombre || "tu hijo o hija"} que quedó pendiente. Te toma unos minutos y puedes continuar donde te quedaste:`
      : "te recuerdo el cuestionario que quedó pendiente. Te toma unos minutos y puedes continuar donde te quedaste:"
    : opciones.esMenor
      ? `como parte del seguimiento, te comparto de nuevo el cuestionario sobre ${primerNombre || "tu hijo o hija"}. Así podemos ver juntos cómo ha avanzado:`
      : "como parte de tu seguimiento, te comparto de nuevo el cuestionario. Así podemos ver juntos cómo has avanzado:";
  return [`${saludo}, ${cuerpo}`, url, "Tus respuestas son confidenciales. Muchas gracias, saludos."].join("\n\n");
}
