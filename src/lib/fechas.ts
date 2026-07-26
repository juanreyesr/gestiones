// Utilidades de fecha del area Iglesia.
//
// Todas las fechas viajan como "YYYY-MM-DD" (columna date de Postgres). Se
// parsean a mano y no con new Date("YYYY-MM-DD"), porque esa forma se
// interpreta en UTC y en Guatemala (UTC-6) muestra el dia anterior.

export function parseFecha(valor: string | null): Date | null {
  if (!valor) return null;
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

export function fechaISO(fecha: Date) {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0");
  const dia = `${fecha.getDate()}`.padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export const hoyISO = () => fechaISO(new Date());

const FORMATO_CORTO = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short" });
const FORMATO_LARGO = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "long", year: "numeric" });
const FORMATO_COMPLETO = new Intl.DateTimeFormat("es-GT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatoCorto(valor: string | null) {
  const fecha = parseFecha(valor);
  return fecha ? FORMATO_CORTO.format(fecha) : "";
}

export function formatoLargo(valor: string | null) {
  const fecha = parseFecha(valor);
  return fecha ? FORMATO_LARGO.format(fecha) : "";
}

export function formatoCompleto(valor: string | null) {
  const fecha = parseFecha(valor);
  if (!fecha) return "";
  const texto = FORMATO_COMPLETO.format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "8:30 a. m." a partir de "08:30:00". */
export function formatoHora(valor: string | null) {
  if (!valor) return "";
  const [horas, minutos] = valor.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return "";
  const fecha = new Date(2000, 0, 1, horas, minutos);
  return new Intl.DateTimeFormat("es-GT", { hour: "numeric", minute: "2-digit", hour12: true }).format(fecha);
}

/** Dias entre hoy y la fecha dada; negativo = vencida. */
export function diasRestantes(valor: string | null) {
  const fecha = parseFecha(valor);
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000);
}

/** Etiqueta humana del vencimiento: "Hoy", "Mañana", "Hace 3 días"... */
export function etiquetaVencimiento(valor: string | null) {
  const dias = diasRestantes(valor);
  if (dias === null) return "";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  if (dias > 1) return `En ${dias} días`;
  return `Hace ${Math.abs(dias)} días`;
}

export function fechaHoraLegible(valor: string) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(fecha);
}
