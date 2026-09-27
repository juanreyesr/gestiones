import { coordenadasDeEnlace, esEnlaceCortoMaps, type Coordenadas, type UbicacionConsultorio } from "@/lib/clinica/ubicacion";

/**
 * Coordenadas de un enlace corto de Google Maps (maps.app.goo.gl): se sigue
 * la redireccion, sin descargar la pagina, hasta el enlace largo que trae
 * "/maps/search/14.65,-90.81" o "@14.65,-90.81". Solo se siguen dominios de
 * Google (nada de URLs arbitrarias). Se recuerda en memoria por instancia.
 */

const cache = new Map<string, Coordenadas | null>();

function dominioGoogle(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "maps.app.goo.gl" || host === "goo.gl" || /(^|\.)google\.[a-z.]+$/.test(host);
  } catch {
    return false;
  }
}

export async function resolverCoordenadas(mapsUrl: string | null): Promise<Coordenadas | null> {
  if (!mapsUrl) return null;
  const directas = coordenadasDeEnlace(mapsUrl);
  if (directas || !esEnlaceCortoMaps(mapsUrl)) return directas;
  if (cache.has(mapsUrl)) return cache.get(mapsUrl) ?? null;

  let actual = mapsUrl.trim();
  let resultado: Coordenadas | null = null;
  for (let salto = 0; salto < 4 && dominioGoogle(actual); salto++) {
    try {
      const response = await fetch(actual, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const destino = response.headers.get("location");
      if (!destino) break;
      actual = new URL(destino, actual).toString();
      resultado = coordenadasDeEnlace(actual);
      if (resultado) break;
    } catch {
      break;
    }
  }
  cache.set(mapsUrl, resultado);
  return resultado;
}

export async function conCoordenadas(ubicacion: UbicacionConsultorio): Promise<UbicacionConsultorio> {
  return { ...ubicacion, coordenadas: ubicacion.coordenadas ?? (await resolverCoordenadas(ubicacion.mapsUrl)) };
}
