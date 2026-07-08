import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "lic.juanreyesr@gmail.com";

/**
 * Verifica que la petición venga del dueño de la plataforma: el navegador
 * envía el access token de Supabase en Authorization: Bearer.
 */
export async function requireOwner(request: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { ok: false, status: 500, error: "Faltan las variables de Supabase." };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return { ok: false, status: 401, error: "No autorizado." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || data.user.email !== OWNER_EMAIL) {
    return { ok: false, status: 401, error: "No autorizado." };
  }

  return { ok: true };
}
