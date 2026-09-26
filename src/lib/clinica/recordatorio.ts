import { mismaHoraQueConsultorio, nombreZona, paisDe, telefonoInternacional, ZONA_CONSULTORIO, zonaDe } from "@/lib/paises";
import type { CitaRow } from "./types";

/**
 * Numero listo para wa.me: solo digitos y con codigo de pais. Si el numero
 * no trae "+codigo" se usa el pais del paciente (Guatemala por defecto),
 * porque wa.me no encuentra numeros sin el codigo.
 */
export function telefonoWhatsApp(telefono: string | null | undefined, pais?: string | null) {
  return telefonoInternacional(telefono, pais);
}

function formatear(inicioIso: string, zona: string) {
  const fecha = new Intl.DateTimeFormat("es-GT", {
    timeZone: zona,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(inicioIso));
  const hora = new Intl.DateTimeFormat("es-GT", { timeZone: zona, hour: "numeric", minute: "2-digit" }).format(
    new Date(inicioIso),
  );
  return { fecha, hora };
}

/**
 * Texto del recordatorio para el paciente, con la fecha y hora en SU zona
 * horaria. Si no coincide con la del consultorio se aclara ambas, para que
 * nadie se conecte una hora antes o despues.
 */
export function textoRecordatorioCita(nombreCompleto: string, inicioIso: string, zonaPaciente: string = ZONA_CONSULTORIO) {
  const nombre = nombreCompleto.split(" ")[0];
  const saludo = nombre ? `Hola ${nombre}, ` : "Hola, ";
  const local = formatear(inicioIso, zonaPaciente);
  const aclaracion = mismaHoraQueConsultorio(zonaPaciente, inicioIso)
    ? ""
    : ` (hora de ${nombreZona(zonaPaciente).replace(/\s*\(.*?\)/g, "")}; en Guatemala serán las ${formatear(inicioIso, ZONA_CONSULTORIO).hora})`;
  const frase = `${saludo}te recuerdo tu cita el ${local.fecha} a las ${local.hora}${aclaracion}`;
  // "3:00 p. m." ya termina en punto: no se agrega otro.
  return `${frase}${frase.endsWith(".") ? "" : "."} Si no puedes asistir, avísame con anticipación. ¡Gracias!`;
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string, pais?: string | null) {
  const numero = telefonoWhatsApp(telefono, pais);
  return numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Construye el mensaje y los enlaces para recordarle la cita al paciente.
 * Para pacientes registrados el teléfono/email/pais vienen del expediente
 * (contacto), no de la cita; por eso se pueden pasar por parámetro.
 */
export function buildRecordatorio(
  cita: CitaRow,
  contacto?: {
    telefono?: string | null;
    email?: string | null;
    nombre?: string | null;
    pais?: string | null;
    zonaHoraria?: string | null;
  }
) {
  const nombreCompleto = contacto?.nombre ?? cita.pacienteNombre ?? cita.contactoNombre ?? "";
  const telefono = contacto?.telefono ?? cita.contactoTelefono;
  // Sin pais guardado se deduce del "+codigo" del telefono; si no lo trae, Guatemala.
  const pais = paisDe({ pais: contacto?.pais, telefono });
  const zona = zonaDe({ pais: contacto?.pais, zonaHoraria: contacto?.zonaHoraria, telefono });
  const mensaje = textoRecordatorioCita(nombreCompleto, cita.inicio, zona);
  const email = contacto?.email ?? cita.contactoEmail;

  return {
    mensaje,
    whatsapp: enlaceWhatsApp(telefono, mensaje, pais),
    mailto: email
      ? `mailto:${email}?subject=${encodeURIComponent("Recordatorio de tu cita")}&body=${encodeURIComponent(mensaje)}`
      : `mailto:?subject=${encodeURIComponent("Recordatorio de tu cita")}&body=${encodeURIComponent(mensaje)}`,
  };
}
