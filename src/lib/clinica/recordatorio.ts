import { formatoFechaLarga, formatoHora } from "./slots";
import type { CitaRow } from "./types";

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
  const nombre = nombreCompleto.split(" ")[0];
  const saludo = nombre ? `Hola ${nombre}, ` : "Hola, ";
  const mensaje =
    `${saludo}te recuerdo tu cita el ${formatoFechaLarga(cita.inicio)} a las ${formatoHora(cita.inicio)}. ` +
    `Si no puedes asistir, avísame con anticipación. ¡Gracias!`;

  const telefono = (contacto?.telefono ?? cita.contactoTelefono ?? "").replace(/[^\d]/g, "");
  const email = contacto?.email ?? cita.contactoEmail;

  return {
    mensaje,
    whatsapp: telefono
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
    mailto: email
      ? `mailto:${email}?subject=${encodeURIComponent("Recordatorio de tu cita")}&body=${encodeURIComponent(mensaje)}`
      : `mailto:?subject=${encodeURIComponent("Recordatorio de tu cita")}&body=${encodeURIComponent(mensaje)}`,
  };
}
