import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { normalizarPortada } from "../../../../../../sitio-web/plantilla.mjs";
import { requireOwner } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { TAG_PORTADA } from "@/lib/sitio/portada-servidor";

/**
 * Publica el borrador de la portada: lo valida, lo copia a 'publicado' y
 * vacía la caché para que /es y /en lo muestren de inmediato.
 */
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });

  const { data, error } = await admin
    .from("gestionesjj_sitio_portada")
    .select("contenido")
    .eq("id", "borrador")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudo leer el borrador." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No hay cambios para publicar." }, { status: 400 });

  const contenido = normalizarPortada((data as { contenido: unknown }).contenido);
  const ahora = new Date().toISOString();
  const { error: errorPublicar } = await admin
    .from("gestionesjj_sitio_portada")
    .upsert([
      { id: "publicado", contenido, updated_at: ahora },
      { id: "borrador", contenido, updated_at: ahora },
    ]);
  if (errorPublicar) return NextResponse.json({ error: "No se pudo publicar." }, { status: 500 });

  revalidateTag(TAG_PORTADA, { expire: 0 });
  return NextResponse.json({ ok: true, publicadoEn: ahora });
}
