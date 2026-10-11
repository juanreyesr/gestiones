import { crearSitio, type Idioma } from "../../../../sitio-web/plantilla.mjs";
import configSitio from "../../../../public/config.json";
import { leerPortadaPublicada } from "@/lib/sitio/portada-servidor";

const sitio = crearSitio(configSitio);

/**
 * Portada pública (/es y /en, ver rewrites en next.config.ts). Usa la misma
 * plantilla que el resto del sitio estático con el contenido publicado desde
 * GestionesJJ → "Editar página"; si no hay nada publicado o Supabase falla,
 * muestra los textos por defecto.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ idioma: string }> }) {
  const { idioma } = await params;
  if (idioma !== "es" && idioma !== "en") return new Response("No encontrado", { status: 404 });

  let portada: unknown = null;
  try {
    portada = await leerPortadaPublicada();
  } catch (error) {
    console.error("Portada: no se pudo leer el contenido publicado", error);
  }

  return new Response(sitio.home(idioma as Idioma, portada), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Sin caché en el CDN: al publicar, el cambio se ve en la siguiente visita.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
