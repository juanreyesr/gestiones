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
