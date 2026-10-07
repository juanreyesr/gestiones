import { NextResponse } from "next/server";
import type { Idioma } from "@/lib/cursos/types";
import { traducir } from "@/lib/estudiante/i18n";
import { botApi, cursosActivos, leerConfigAvisos } from "@/lib/server/estudiantes-avisos";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { comparaSeguro, hashCodigo } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Update = {
  message?: { chat: { id: number; type: string }; text?: string };
  my_chat_member?: { chat: { id: number }; new_chat_member?: { status?: string } };
};

const idiomaDe = (valor: string | null | undefined): Idioma => (valor === "en" || valor === "pt" ? valor : "es");

/**
 * Webhook del bot de estudiantes (distinto del bot privado del owner). Solo
 * entiende /start <codigo> (vincular desde el Aula virtual) y /desactivar;
 * no da acceso a nada mas: los avisos los envia /api/estudiantes/avisos.
 */
export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  const config = admin ? await leerConfigAvisos(admin) : null;
  const secreto = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!admin || !config?.bot_token || !config.webhook_secret || !comparaSeguro(secreto, config.webhook_secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = config.bot_token;
  const update = (await request.json().catch(() => null)) as Update | null;

  // El estudiante bloqueo o borro el bot: se cierra su vinculo.
  if (update?.my_chat_member && ["kicked", "left"].includes(update.my_chat_member.new_chat_member?.status ?? "")) {
    await admin.from("gestionesjj_estudiante_telegram").delete().eq("chat_id", update.my_chat_member.chat.id);
    return NextResponse.json({ ok: true });
  }

  const mensaje = update?.message;
  if (!mensaje || mensaje.chat.type !== "private") return NextResponse.json({ ok: true });
  const chatId = mensaje.chat.id;
  const texto = (mensaje.text ?? "").trim();
  const responder = (t: string) => botApi(token, "sendMessage", { chat_id: chatId, text: t });

  const { data: vinculoActual } = await admin
    .from("gestionesjj_estudiante_telegram")
    .select("estudiante_id,gestionesjj_estudiantes(idioma)")
    .eq("chat_id", chatId)
    .maybeSingle();
  const idiomaActual = idiomaDe(
    (vinculoActual as unknown as { gestionesjj_estudiantes: { idioma: string | null } | null } | null)?.gestionesjj_estudiantes?.idioma,
  );

  const start = texto.match(/^\/start(?:@\w+)?(?:\s+(\S+))?$/);
  if (start) {
    const codigo = start[1];
    const { data: pendiente } = codigo
      ? await admin
          .from("gestionesjj_estudiante_telegram")
          .select("estudiante_id,codigo_expira,gestionesjj_estudiantes(nombre,idioma,activo)")
          .eq("codigo_hash", hashCodigo(codigo))
          .maybeSingle()
      : { data: null };
    const fila = pendiente as unknown as {
      estudiante_id: string;
      codigo_expira: string | null;
      gestionesjj_estudiantes: { nombre: string; idioma: string | null; activo: boolean } | null;
    } | null;
    if (!fila || !fila.codigo_expira || Date.parse(fila.codigo_expira) < Date.now() || !fila.gestionesjj_estudiantes?.activo) {
      await responder(traducir(idiomaActual, "tg_codigo_invalido"));
      return NextResponse.json({ ok: true });
    }
    const idioma = idiomaDe(fila.gestionesjj_estudiantes.idioma);
    const cursos = (await cursosActivos(admin, [fila.estudiante_id])).get(fila.estudiante_id);
    if (!cursos?.size) {
      await responder(traducir(idioma, "tg_sin_curso"));
      return NextResponse.json({ ok: true });
    }
    // Un chat solo puede estar vinculado a un estudiante.
    await admin.from("gestionesjj_estudiante_telegram").delete().eq("chat_id", chatId).neq("estudiante_id", fila.estudiante_id);
    await admin
      .from("gestionesjj_estudiante_telegram")
      .update({ chat_id: chatId, codigo_hash: null, codigo_expira: null, vinculado_en: new Date().toISOString() })
      .eq("estudiante_id", fila.estudiante_id);
    const nombre = fila.gestionesjj_estudiantes.nombre.trim().split(/\s+/)[0] ?? "";
    await responder(
      traducir(idioma, "tg_bienvenida").replace("{nombre}", nombre).replace("{cursos}", [...cursos.values()].join(", ")),
    );
    return NextResponse.json({ ok: true });
  }

  if (/^\/(desactivar|stop|parar|salir)(@\w+)?$/i.test(texto)) {
    await admin.from("gestionesjj_estudiante_telegram").delete().eq("chat_id", chatId);
    await responder(traducir(idiomaActual, "tg_desactivado"));
    return NextResponse.json({ ok: true });
  }

  await responder(traducir(idiomaActual, "tg_solo_avisos"));
  return NextResponse.json({ ok: true });
}
