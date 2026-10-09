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

/** Saludo de cumpleaños para el paciente (boton del aviso de Telegram). */
export function mensajeCumpleanos(nombre: string) {
  const primerNombre = primerNombreDe(nombre);
  return `¡Feliz cumpleaños${primerNombre ? `, ${primerNombre}` : ""}! Espero que hoy pases un muy feliz cumpleaños. Que Dios te bendiga grandemente.`;
}
