import { formatoFechaLarga, formatoHora } from "./slots";
import type { CitaRow } from "./types";

/**
 * Numero listo para wa.me: solo digitos y con codigo de pais. Los telefonos
 * de Guatemala se guardan casi siempre con 8 digitos (sin el 502) y wa.me
 * no los encuentra sin el codigo, asi que se le antepone.
 */
export function telefonoWhatsApp(telefono: string | null | undefined) {
  const digitos = (telefono ?? "").replace(/[^\d]/g, "");
  return digitos.length === 8 ? `502${digitos}` : digitos;
}

export function textoRecordatorioCita(nombreCompleto: string, fechaLarga: string, hora: string) {
  const nombre = nombreCompleto.split(" ")[0];
  const saludo = nombre ? `Hola ${nombre}, ` : "Hola, ";
  return (
    `${saludo}te recuerdo tu cita el ${fechaLarga} a las ${hora}. ` +
    `Si no puedes asistir, avísame con anticipación. ¡Gracias!`
  );
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string) {
  const numero = telefonoWhatsApp(telefono);
  return numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Construye el mensaje y los enlaces para recordarle la cita al paciente.
 * Para pacientes registrados el teléfono/email vienen del expediente (contacto),
 * no de la cita; por eso se pueden pasar por parámetro.
 */
export function buildRecordatorio(
  cita: CitaRow,
  contacto?: { telefono?: string | null; email?: string | null; nombre?: string | null }
) {
  const nombreCompleto = contacto?.nombre ?? cita.pacienteNombre ?? cita.contactoNombre ?? "";
  const mensaje = textoRecordatorioCita(nombreCompleto, formatoFechaLarga(cita.inicio), formatoHora(cita.inicio));
  const email = contacto?.email ?? cita.contactoEmail;

  return {
    mensaje,
    whatsapp: enlaceWhatsApp(contacto?.telefono ?? cita.contactoTelefono, mensaje),
    mailto: email
      ? `mailto:${email}?subject=${encodeURIComponent("Recordatorio de tu cita")}&body=${encodeURIComponent(mensaje)}`
      : `mailto:?subject=${encodeURIComponent("Recordatorio de tu cita")}&body=${encodeURIComponent(mensaje)}`,
  };
}
