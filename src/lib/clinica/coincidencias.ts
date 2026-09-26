/**
 * Busca si una persona que agenda (desde /agendar, Calendly o cualquier
 * evento de Google Calendar) ya es paciente. Se usa igual en el servidor
 * (Telegram) y en el panel, para que ambos sugieran lo mismo.
 *
 * Prioridad: telefono (ultimos 8 digitos, asi da igual si trae +502,
 * espacios o guiones), luego correo, luego nombre completo identico
 * (sin tildes ni mayusculas). Nunca decide sola: solo sugiere.
 */

export type PacienteComparable = { id: string; nombre: string; telefono: string | null; email: string | null };

export type Coincidencia<P extends PacienteComparable = PacienteComparable> = {
  paciente: P;
  por: "teléfono" | "correo" | "nombre";
};

export function ultimos8(telefono: string | null | undefined) {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  return digitos.length >= 8 ? digitos.slice(-8) : null;
}

export function normalizarNombre(nombre: string | null | undefined) {
  return (nombre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buscarCoincidencia<P extends PacienteComparable>(
  pacientes: P[],
  datos: { nombre?: string | null; telefono?: string | null; email?: string | null },
): Coincidencia<P> | null {
  const tel = ultimos8(datos.telefono);
  if (tel) {
    const paciente = pacientes.find((p) => ultimos8(p.telefono) === tel);
    if (paciente) return { paciente, por: "teléfono" };
  }

  const email = (datos.email ?? "").trim().toLowerCase();
  if (email) {
    const paciente = pacientes.find((p) => (p.email ?? "").trim().toLowerCase() === email);
    if (paciente) return { paciente, por: "correo" };
  }

  const nombre = normalizarNombre(datos.nombre);
  if (nombre.includes(" ")) {
    const paciente = pacientes.find((p) => normalizarNombre(p.nombre) === nombre);
    if (paciente) return { paciente, por: "nombre" };
  }

  return null;
}
