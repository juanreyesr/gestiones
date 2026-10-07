import { NextResponse } from "next/server";
import type { Idioma } from "@/lib/cursos/types";
import { traducir } from "@/lib/estudiante/i18n";
import { requireEstudiante } from "@/lib/server/auth";
import { botApi, cursosActivos, leerConfigAvisos, llavesVapid } from "@/lib/server/estudiantes-avisos";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { generarCodigo, hashCodigo } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIGENCIA_CODIGO_MS = 15 * 60_000;

type Body = {
  accion?: "estado" | "telegram" | "telegram-desactivar" | "push-suscribir" | "push-cancelar";
  endpoint?: string;
  suscripcion?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
};

/**
 * Avisos del estudiante fuera del Aula: activar Telegram (enlace de un solo
 * uso al bot de estudiantes), desactivarlo y registrar o quitar las
 * notificaciones push de este navegador. Solo con un curso activo.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-avisos", limit: 30, windowMs: 60_000 })) return rateLimitResponse();
  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as Body | null;
  const accion = body?.accion ?? "estado";
  const config = await leerConfigAvisos(admin);
  const tieneCurso = Boolean((await cursosActivos(admin, [auth.estudianteId])).get(auth.estudianteId)?.size);

  if (accion === "estado") {
    const [{ data: vinculo }, { count }] = await Promise.all([
      admin.from("gestionesjj_estudiante_telegram").select("chat_id").eq("estudiante_id", auth.estudianteId).maybeSingle(),
      admin.from("gestionesjj_estudiante_push").select("id", { count: "exact", head: true }).eq("estudiante_id", auth.estudianteId),
    ]);
    const vapid = tieneCurso ? await llavesVapid(admin) : null;
    return NextResponse.json({
      tieneCurso,
      telegram: { disponible: Boolean(config?.bot_token && config.bot_username), vinculado: Boolean(vinculo?.chat_id) },
      push: { clave: vapid?.publica ?? null, suscripciones: count ?? 0 },
    });
  }

  if (!tieneCurso && (accion === "telegram" || accion === "push-suscribir")) {
    return NextResponse.json({ error: "No tienes cursos activos." }, { status: 409 });
  }

  if (accion === "telegram") {
    if (!config?.bot_token || !config.bot_username) {
      return NextResponse.json({ error: "Los avisos por Telegram aún no están disponibles." }, { status: 409 });
    }
    const codigo = generarCodigo();
    const { error } = await admin.from("gestionesjj_estudiante_telegram").upsert(
      {
        estudiante_id: auth.estudianteId,
        codigo_hash: hashCodigo(codigo),
        codigo_expira: new Date(Date.now() + VIGENCIA_CODIGO_MS).toISOString(),
      },
      { onConflict: "estudiante_id" },
    );
    if (error) return NextResponse.json({ error: "No se pudo preparar el enlace." }, { status: 500 });
    return NextResponse.json({ url: `https://t.me/${config.bot_username}?start=${codigo}` });
  }

  if (accion === "telegram-desactivar") {
    const { data: vinculo } = await admin
      .from("gestionesjj_estudiante_telegram")
      .select("chat_id,gestionesjj_estudiantes(idioma)")
      .eq("estudiante_id", auth.estudianteId)
      .maybeSingle();
    await admin.from("gestionesjj_estudiante_telegram").delete().eq("estudiante_id", auth.estudianteId);
    const fila = vinculo as unknown as { chat_id: number | null; gestionesjj_estudiantes: { idioma: string | null } | null } | null;
    if (config?.bot_token && fila?.chat_id) {
      const idioma: Idioma = fila.gestionesjj_estudiantes?.idioma === "en" || fila.gestionesjj_estudiantes?.idioma === "pt"
        ? fila.gestionesjj_estudiantes.idioma
        : "es";
      await botApi(config.bot_token, "sendMessage", { chat_id: fila.chat_id, text: traducir(idioma, "tg_desactivado") });
    }
    return NextResponse.json({ ok: true });
  }

  if (accion === "push-suscribir") {
    const s = body?.suscripcion;
    const endpoint = s?.endpoint ?? "";
    const p256dh = s?.keys?.p256dh ?? "";
    const authKey = s?.keys?.auth ?? "";
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !authKey || p256dh.length > 200 || authKey.length > 100) {
      return NextResponse.json({ error: "Suscripción no válida." }, { status: 422 });
    }
    const { error } = await admin
      .from("gestionesjj_estudiante_push")
      .upsert({ estudiante_id: auth.estudianteId, endpoint, p256dh, auth: authKey }, { onConflict: "endpoint" });
    if (error) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion === "push-cancelar") {
    const endpoint = body?.endpoint ?? "";
    await admin.from("gestionesjj_estudiante_push").delete().eq("estudiante_id", auth.estudianteId).eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 422 });
}
