import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

/** Etiqueta de caché de la portada publicada: publicar la invalida. */
export const TAG_PORTADA = "sitio-portada";

/**
 * Contenido publicado de la portada (o null si aún no se publica nada o
 * Supabase no responde: entonces se usan los textos por defecto). Se guarda en
 * la caché de datos de Next hasta que "Publicar cambios" la invalida.
 */
export const leerPortadaPublicada = unstable_cache(
  async (): Promise<unknown> => {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from("gestionesjj_sitio_portada")
      .select("contenido")
      .eq("id", "publicado")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { contenido: unknown } | null)?.contenido ?? null;
  },
  ["sitio-portada-publicada"],
  { tags: [TAG_PORTADA], revalidate: 3600 },
);
