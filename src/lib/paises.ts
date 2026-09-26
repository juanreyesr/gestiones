/**
 * Paises de los pacientes: codigo telefonico, largo del numero local y zona
 * horaria. Sirve para armar enlaces de WhatsApp (wa.me exige el codigo de
 * pais), comparar telefonos escritos de distintas formas y escribir la hora
 * de la cita en la hora del paciente.
 *
 * El pais de un paciente es opcional: si no se eligio, se deduce del
 * telefono cuando trae "+codigo" y, si no, se asume Guatemala (asi quedan
 * bien todos los expedientes que ya existen, sin tocarlos).
 */

export type Pais = {
  codigo: string; // ISO 3166-1 alfa-2
  nombre: string;
  bandera: string;
  prefijo: string; // codigo telefonico sin "+"
  digitosLocales: number[];
  zonas: { id: string; nombre: string }[];
};

export const PAIS_POR_DEFECTO = "GT";
export const ZONA_CONSULTORIO = "America/Guatemala";

export const PAISES: Pais[] = [
  { codigo: "GT", nombre: "Guatemala", bandera: "🇬🇹", prefijo: "502", digitosLocales: [8], zonas: [{ id: "America/Guatemala", nombre: "Guatemala" }] },
  { codigo: "SV", nombre: "El Salvador", bandera: "🇸🇻", prefijo: "503", digitosLocales: [8], zonas: [{ id: "America/El_Salvador", nombre: "El Salvador" }] },
  { codigo: "HN", nombre: "Honduras", bandera: "🇭🇳", prefijo: "504", digitosLocales: [8], zonas: [{ id: "America/Tegucigalpa", nombre: "Honduras" }] },
  { codigo: "NI", nombre: "Nicaragua", bandera: "🇳🇮", prefijo: "505", digitosLocales: [8], zonas: [{ id: "America/Managua", nombre: "Nicaragua" }] },
  { codigo: "CR", nombre: "Costa Rica", bandera: "🇨🇷", prefijo: "506", digitosLocales: [8], zonas: [{ id: "America/Costa_Rica", nombre: "Costa Rica" }] },
  { codigo: "PA", nombre: "Panamá", bandera: "🇵🇦", prefijo: "507", digitosLocales: [7, 8], zonas: [{ id: "America/Panama", nombre: "Panamá" }] },
  { codigo: "BZ", nombre: "Belice", bandera: "🇧🇿", prefijo: "501", digitosLocales: [7], zonas: [{ id: "America/Belize", nombre: "Belice" }] },
  {
    codigo: "MX",
    nombre: "México",
    bandera: "🇲🇽",
    prefijo: "52",
    digitosLocales: [10],
    zonas: [
      { id: "America/Mexico_City", nombre: "Centro (CDMX, Guadalajara)" },
      { id: "America/Cancun", nombre: "Quintana Roo (Cancún)" },
      { id: "America/Chihuahua", nombre: "Chihuahua" },
      { id: "America/Mazatlan", nombre: "Pacífico (Sinaloa, Nayarit)" },
      { id: "America/Hermosillo", nombre: "Sonora" },
      { id: "America/Tijuana", nombre: "Noroeste (Tijuana)" },
    ],
  },
  {
    codigo: "US",
    nombre: "Estados Unidos",
    bandera: "🇺🇸",
    prefijo: "1",
    digitosLocales: [10],
    zonas: [
      { id: "America/New_York", nombre: "Este (Nueva York, Miami)" },
      { id: "America/Chicago", nombre: "Centro (Chicago, Houston)" },
      { id: "America/Denver", nombre: "Montaña (Denver)" },
      { id: "America/Phoenix", nombre: "Arizona" },
      { id: "America/Los_Angeles", nombre: "Pacífico (Los Ángeles)" },
      { id: "America/Anchorage", nombre: "Alaska" },
      { id: "Pacific/Honolulu", nombre: "Hawái" },
    ],
  },
  {
    codigo: "CA",
    nombre: "Canadá",
    bandera: "🇨🇦",
    prefijo: "1",
    digitosLocales: [10],
    zonas: [
      { id: "America/Toronto", nombre: "Este (Toronto, Montreal)" },
      { id: "America/Winnipeg", nombre: "Centro (Winnipeg)" },
      { id: "America/Edmonton", nombre: "Montaña (Calgary)" },
      { id: "America/Vancouver", nombre: "Pacífico (Vancouver)" },
    ],
  },
  { codigo: "PR", nombre: "Puerto Rico", bandera: "🇵🇷", prefijo: "1", digitosLocales: [10], zonas: [{ id: "America/Puerto_Rico", nombre: "Puerto Rico" }] },
  { codigo: "DO", nombre: "República Dominicana", bandera: "🇩🇴", prefijo: "1", digitosLocales: [10], zonas: [{ id: "America/Santo_Domingo", nombre: "República Dominicana" }] },
  { codigo: "CU", nombre: "Cuba", bandera: "🇨🇺", prefijo: "53", digitosLocales: [8], zonas: [{ id: "America/Havana", nombre: "Cuba" }] },
  { codigo: "CO", nombre: "Colombia", bandera: "🇨🇴", prefijo: "57", digitosLocales: [10], zonas: [{ id: "America/Bogota", nombre: "Colombia" }] },
  { codigo: "VE", nombre: "Venezuela", bandera: "🇻🇪", prefijo: "58", digitosLocales: [10], zonas: [{ id: "America/Caracas", nombre: "Venezuela" }] },
  { codigo: "EC", nombre: "Ecuador", bandera: "🇪🇨", prefijo: "593", digitosLocales: [9], zonas: [{ id: "America/Guayaquil", nombre: "Ecuador" }] },
  { codigo: "PE", nombre: "Perú", bandera: "🇵🇪", prefijo: "51", digitosLocales: [9], zonas: [{ id: "America/Lima", nombre: "Perú" }] },
  { codigo: "BO", nombre: "Bolivia", bandera: "🇧🇴", prefijo: "591", digitosLocales: [8], zonas: [{ id: "America/La_Paz", nombre: "Bolivia" }] },
  { codigo: "CL", nombre: "Chile", bandera: "🇨🇱", prefijo: "56", digitosLocales: [9], zonas: [{ id: "America/Santiago", nombre: "Chile" }] },
  { codigo: "AR", nombre: "Argentina", bandera: "🇦🇷", prefijo: "54", digitosLocales: [10, 11], zonas: [{ id: "America/Argentina/Buenos_Aires", nombre: "Argentina" }] },
  { codigo: "UY", nombre: "Uruguay", bandera: "🇺🇾", prefijo: "598", digitosLocales: [8], zonas: [{ id: "America/Montevideo", nombre: "Uruguay" }] },
  { codigo: "PY", nombre: "Paraguay", bandera: "🇵🇾", prefijo: "595", digitosLocales: [9], zonas: [{ id: "America/Asuncion", nombre: "Paraguay" }] },
  { codigo: "BR", nombre: "Brasil", bandera: "🇧🇷", prefijo: "55", digitosLocales: [10, 11], zonas: [{ id: "America/Sao_Paulo", nombre: "Brasilia (São Paulo)" }] },
  { codigo: "ES", nombre: "España", bandera: "🇪🇸", prefijo: "34", digitosLocales: [9], zonas: [{ id: "Europe/Madrid", nombre: "Península" }, { id: "Atlantic/Canary", nombre: "Canarias" }] },
  { codigo: "IT", nombre: "Italia", bandera: "🇮🇹", prefijo: "39", digitosLocales: [9, 10], zonas: [{ id: "Europe/Rome", nombre: "Italia" }] },
  { codigo: "FR", nombre: "Francia", bandera: "🇫🇷", prefijo: "33", digitosLocales: [9], zonas: [{ id: "Europe/Paris", nombre: "Francia" }] },
  { codigo: "DE", nombre: "Alemania", bandera: "🇩🇪", prefijo: "49", digitosLocales: [10, 11], zonas: [{ id: "Europe/Berlin", nombre: "Alemania" }] },
  { codigo: "GB", nombre: "Reino Unido", bandera: "🇬🇧", prefijo: "44", digitosLocales: [10], zonas: [{ id: "Europe/London", nombre: "Reino Unido" }] },
];

const POR_CODIGO = new Map(PAISES.map((p) => [p.codigo, p]));

export function paisPorCodigo(codigo: string | null | undefined) {
  return (codigo && POR_CODIGO.get(codigo)) || POR_CODIGO.get(PAIS_POR_DEFECTO)!;
}

function digitosInternacionales(telefono: string) {
  const limpio = telefono.trim();
  if (limpio.startsWith("+")) return limpio.replace(/\D/g, "");
  if (limpio.startsWith("00")) return limpio.replace(/\D/g, "").slice(2);
  return null;
}

/**
 * Pais segun el "+codigo" del telefono (null si el numero no lo trae).
 * "+1" se asume Estados Unidos; Canada, Puerto Rico o Rep. Dominicana se
 * eligen a mano en el expediente.
 */
export function inferirPais(telefono: string | null | undefined): string | null {
  const digitos = telefono ? digitosInternacionales(telefono) : null;
  if (!digitos) return null;
  const candidatos = PAISES.filter((p) => digitos.startsWith(p.prefijo)).sort((a, b) => b.prefijo.length - a.prefijo.length);
  if (!candidatos.length) return null;
  if (candidatos[0].prefijo === "1") return "US";
  return candidatos[0].codigo;
}

export function paisDe(datos: { pais?: string | null; telefono?: string | null }) {
  return datos.pais || inferirPais(datos.telefono) || PAIS_POR_DEFECTO;
}

/**
 * Telefono en formato internacional, solo digitos (lo que pide wa.me):
 * "4000-1234" de Guatemala → "50240001234"; "+504 9999 8888" → "50499998888".
 * Si el numero ya trae el codigo del pais (con o sin "+") se respeta.
 */
export function telefonoInternacional(telefono: string | null | undefined, pais?: string | null) {
  if (!telefono) return "";
  const internacional = digitosInternacionales(telefono);
  if (internacional) return internacional;

  const digitos = telefono.replace(/\D/g, "");
  if (!digitos) return "";
  const info = paisPorCodigo(pais || PAIS_POR_DEFECTO);
  if (info.digitosLocales.includes(digitos.length)) return `${info.prefijo}${digitos}`;
  // Parece que ya trae el codigo (p. ej. "50240001234" guardado sin "+").
  return digitos;
}

export function zonaDe(datos: { pais?: string | null; zonaHoraria?: string | null; telefono?: string | null }) {
  return datos.zonaHoraria || paisPorCodigo(paisDe(datos)).zonas[0].id;
}

/** true si a esa hora la zona tiene el mismo horario que el consultorio (p. ej. Honduras o El Salvador). */
export function mismaHoraQueConsultorio(zona: string, instante: string | Date) {
  const formato = (tz: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", day: "2-digit", hour12: false }).format(
      new Date(instante),
    );
  return formato(zona) === formato(ZONA_CONSULTORIO);
}

export function nombreZona(zona: string) {
  for (const pais of PAISES) {
    const encontrada = pais.zonas.find((z) => z.id === zona);
    if (encontrada) return pais.zonas.length > 1 ? `${pais.nombre}, ${encontrada.nombre}` : pais.nombre;
  }
  return zona.split("/").pop()?.replace(/_/g, " ") ?? zona;
}

/** Zona horaria del navegador (solo en el cliente; en el servidor devuelve la del consultorio). */
export function zonaDelNavegador() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_CONSULTORIO;
  } catch {
    return ZONA_CONSULTORIO;
  }
}

/** Pais al que pertenece una zona horaria (Guatemala si no se reconoce). */
export function paisDeZona(zona: string) {
  return PAISES.find((p) => p.zonas.some((z) => z.id === zona))?.codigo ?? PAIS_POR_DEFECTO;
}
