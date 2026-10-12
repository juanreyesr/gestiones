// Tipos de sitio-web/plantilla.mjs (la usan la portada dinámica y el editor de /admin).
export type Idioma = "es" | "en";

export interface TextosPortada {
  hero: { eyebrow: string; titulo1: string; titulo2: string; texto: string; boton1: string; boton2: string };
  stats: { valor: string; texto: string }[];
  areas: { eyebrow: string; titulo: string; items: { titulo: string; texto: string; boton: string }[] };
  manifiesto: { eyebrow: string; titulo: string; texto: string };
  bio: { eyebrow: string; titulo: string; texto: string; boton: string };
}

export interface Portada {
  es: TextosPortada;
  en: TextosPortada;
  /** Carrusel del encabezado; vacío = retrato fijo. */
  imagenes: string[];
  /** Carrusel junto al título de las áreas ("Cada historia..."); vacío = sin imagen. */
  imagenesAreas: string[];
  /** Carrusel de la sección "Sobre Juan J."; vacío = retrato por defecto. */
  fotosBio: string[];
  /** Segundos entre imagen e imagen (todos los carruseles). */
  intervalo: number;
}

export interface ConfigSitio {
  aulaURL?: string | null;
  bookingURL?: string | null;
  email?: string | null;
  whatsapp?: string | null;
}

export const origin: string;
export const MAX_IMAGENES: number;
export const INTERVALO_MIN: number;
export const INTERVALO_MAX: number;
export function portadaPorDefecto(): Portada;
export function normalizarPortada(entrada: unknown): Portada;
export function limpiarUrlImagen(valor: unknown): string | null;
export function crearSitio(config: ConfigSitio): {
  home: (idioma: Idioma, portada?: unknown) => string;
  page: (idioma: Idioma, clave: string) => string;
};
