/**
 * Mensaje con la ubicacion del consultorio para enviar por WhatsApp a quien
 * agenda una cita presencial: direccion + enlaces de Google Maps y Waze.
 *
 * Si en Configuracion se pego un enlace de Google Maps con coordenadas
 * (".../@14.66,-90.81,17z" o "?q=14.66,-90.81"), Waze navega a ese punto
 * exacto; si no, ambos buscan por la direccion escrita.
 */

export type UbicacionConsultorio = { direccion: string | null; mapsUrl: string | null };

function coordenadas(mapsUrl: string | null) {
  if (!mapsUrl) return null;
  const match =
    mapsUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ??
    mapsUrl.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  return match ? { lat: match[1], lng: match[2] } : null;
}

export function enlacesUbicacion({ direccion, mapsUrl }: UbicacionConsultorio) {
  const texto = (direccion ?? "").trim();
  if (!texto && !mapsUrl) return null;
  const punto = coordenadas(mapsUrl);
  const google =
    mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(punto ? `${punto.lat},${punto.lng}` : texto)}`;
  const waze = punto
    ? `https://waze.com/ul?ll=${punto.lat},${punto.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(texto)}&navigate=yes`;
  return { google, waze };
}

export function mensajeUbicacion(nombreCompleto: string | null, ubicacion: UbicacionConsultorio) {
  const enlaces = enlacesUbicacion(ubicacion);
  if (!enlaces) return null;
  const nombre = (nombreCompleto ?? "").trim().split(" ")[0];
  return [
    `Hola${nombre ? ` ${nombre}` : ""}, esta es la ubicación del consultorio para tu cita:`,
    ubicacion.direccion?.trim() ? `📍 ${ubicacion.direccion.trim()}` : null,
    `Google Maps: ${enlaces.google}`,
    `Waze: ${enlaces.waze}`,
  ]
    .filter(Boolean)
    .join("\n");
}
