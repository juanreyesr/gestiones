import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Idioma } from "@/lib/cursos/types";
import { traducir } from "@/lib/estudiante/i18n";
import { zonaDe } from "@/lib/paises";

/**
 * Avisos del Aula virtual fuera de la plataforma (migracion 053): Telegram
 * con un bot propio de estudiantes (distinto del bot privado del owner) y
 * notificaciones push del navegador. Solo se reenvia lo del curso del
 * estudiante: las notificaciones que ya crean los triggers (mensaje del
 * docente, semana habilitada, tarea publicada, calificacion) mas el
 * recordatorio de fecha de vencimiento que se genera aqui.
 *
 * Curso activo = curso "activo" con acceso de estudiantes e inscripcion
 * "activa". Si un estudiante ya no tiene ninguno (curso cerrado o retirado),
 * se le avisa una vez, se cierra su vinculo de Telegram y se borran sus
 * suscripciones push.
 */

const AULA_URL = "https://www.juanjreyes.org/estudiante";
const VENTANA_PENDIENTES_MS = 6 * 3_600_000;
const ANTICIPACION_VENCIMIENTO_MS = 24 * 3_600_000;

export type ConfigAvisos = {
  bot_token: string | null;
  bot_username: string | null;
  webhook_secret: string | null;
  vapid_public: string | null;
  vapid_private: string | null;
};

export async function leerConfigAvisos(admin: SupabaseClient): Promise<ConfigAvisos | null> {
  const { data } = await admin
    .from("gestionesjj_estudiantes_avisos_config")
    .select("bot_token,bot_username,webhook_secret,vapid_public,vapid_private")
    .eq("id", true)
    .maybeSingle();
  return (data as ConfigAvisos | null) ?? null;
}

/** Llaves VAPID para push; se generan la primera vez y se guardan (solo servidor). */
export async function llavesVapid(admin: SupabaseClient) {
  const config = await leerConfigAvisos(admin);
  if (config?.vapid_public && config.vapid_private) return { publica: config.vapid_public, privada: config.vapid_private };
  const llaves = webpush.generateVAPIDKeys();
  await admin
    .from("gestionesjj_estudiantes_avisos_config")
    .upsert({ id: true, vapid_public: llaves.publicKey, vapid_private: llaves.privateKey, updated_at: new Date().toISOString() });
  // Si dos peticiones las generaron a la vez, gana la que quedo guardada.
  const guardada = await leerConfigAvisos(admin);
  return { publica: guardada?.vapid_public ?? llaves.publicKey, privada: guardada?.vapid_private ?? llaves.privateKey };
}

// ============================================================
// Bot de estudiantes (Bot API con su propio token)
// ============================================================

export async function botApi<T = unknown>(
  token: string,
  metodo: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string; codigo?: number }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok: boolean; result?: T; description?: string; error_code?: number }
      | null;
    if (!json?.ok) return { ok: false, error: json?.description ?? `HTTP ${response.status}`, codigo: json?.error_code };
    return { ok: true, result: json.result as T };
  } catch {
    return { ok: false, error: "Sin conexión con Telegram." };
  }
}

const esc = (valor: string | null | undefined) =>
  (valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function enviarAlEstudiante(token: string, chatId: number, texto: string, idioma: Idioma) {
  return botApi(token, "sendMessage", {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: `📚 ${traducir(idioma, "aviso_abrir_aula")}`, url: AULA_URL }]] },
  });
}

// ============================================================
// Cursos activos
// ============================================================

type Inscripcion = {
  estudiante_id: string | null;
  curso_id: string;
  gestionesjj_cursos_impartidos: { nombre: string; estado: string; acceso_estudiantes: boolean } | null;
};

/** estudiante_id -> (curso_id -> nombre) de sus cursos activos. */
export async function cursosActivos(admin: SupabaseClient, estudianteIds: string[]) {
  const mapa = new Map<string, Map<string, string>>();
  if (!estudianteIds.length) return mapa;
  const { data } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("estudiante_id,curso_id,gestionesjj_cursos_impartidos(nombre,estado,acceso_estudiantes)")
    .in("estudiante_id", estudianteIds)
    .eq("estado", "activo");
  for (const fila of (data ?? []) as unknown as Inscripcion[]) {
    const curso = fila.gestionesjj_cursos_impartidos;
    if (!fila.estudiante_id || !curso || curso.estado !== "activo" || !curso.acceso_estudiantes) continue;
    if (!mapa.has(fila.estudiante_id)) mapa.set(fila.estudiante_id, new Map());
    mapa.get(fila.estudiante_id)!.set(fila.curso_id, curso.nombre);
  }
  return mapa;
}

// ============================================================
// Texto de cada aviso (en el idioma del estudiante)
// ============================================================

type Notificacion = {
  id: string;
  estudiante_id: string;
  tipo: "contenido" | "tarea" | "calificacion" | "mensaje" | "vencimiento";
  curso_id: string | null;
  meta: Record<string, unknown>;
};

const ICONO: Record<Notificacion["tipo"], string> = {
  contenido: "📚",
  tarea: "📝",
  calificacion: "🏅",
  mensaje: "💬",
  vencimiento: "⏰",
};

const LOCALE: Record<Idioma, string> = { es: "es-GT", en: "en-US", pt: "pt-BR" };

function fechaVence(iso: string, idioma: Idioma, zona: string) {
  return new Intl.DateTimeFormat(LOCALE[idioma], {
    timeZone: zona,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function detalle(n: Notificacion, idioma: Idioma, zona: string) {
  const meta = n.meta ?? {};
  const titulo = typeof meta.titulo === "string" ? meta.titulo : null;
  if (n.tipo === "contenido") {
    const numero = typeof meta.numero === "number" ? meta.numero : null;
    return numero === null ? titulo : `${traducir(idioma, "lista_semana")} ${numero}${titulo ? ` — ${titulo}` : ""}`;
  }
  if (n.tipo === "mensaje") return typeof meta.extracto === "string" && meta.extracto ? `«${meta.extracto}»` : null;
  if (n.tipo === "vencimiento") {
    const fecha = typeof meta.fecha_limite === "string" ? fechaVence(meta.fecha_limite, idioma, zona) : null;
    return [titulo, fecha ? `${traducir(idioma, "aviso_vence")}: ${fecha}` : null].filter(Boolean).join("\n");
  }
  return titulo;
}

function armarAviso(n: Notificacion, idioma: Idioma, zona: string, curso: string | null) {
  const encabezado = traducir(idioma, `notif_tipo_${n.tipo}`);
  const cuerpo = detalle(n, idioma, zona);
  return {
    telegram: [`${ICONO[n.tipo]} <b>${esc(encabezado)}</b>${curso ? ` — ${esc(curso)}` : ""}`, cuerpo ? esc(cuerpo) : null]
      .filter(Boolean)
      .join("\n"),
    push: { titulo: `${ICONO[n.tipo]} ${encabezado}`, cuerpo: [curso, cuerpo].filter(Boolean).join("\n") || encabezado },
  };
}

// ============================================================
// Proceso de cada minuto (/api/estudiantes/avisos)
// ============================================================

type Estudiante = { id: string; nombre: string; idioma: string | null; pais: string | null };
type Vinculo = { estudiante_id: string; chat_id: number | null };
type Suscripcion = { id: string; estudiante_id: string; endpoint: string; p256dh: string; auth: string };

const idiomaDe = (e: Estudiante | undefined): Idioma => (e?.idioma === "en" || e?.idioma === "pt" ? e.idioma : "es");

/** Crea los recordatorios de tareas que vencen en las proximas 24 horas (una vez por tarea y estudiante). */
async function generarVencimientos(admin: SupabaseClient) {
  const ahora = Date.now();
  const { data } = await admin
    .from("gestionesjj_curso_actividades")
    .select("id,titulo,fecha_limite,visible_estudiantes,gestionesjj_curso_semanas!inner(curso_id,habilitado_estudiantes)")
    .eq("entrega_habilitada", true)
    .neq("visible_estudiantes", "oculto")
    .gt("fecha_limite", new Date(ahora).toISOString())
    .lte("fecha_limite", new Date(ahora + ANTICIPACION_VENCIMIENTO_MS).toISOString())
    .limit(100);
  type Actividad = {
    id: string;
    titulo: string;
    fecha_limite: string;
    gestionesjj_curso_semanas: { curso_id: string; habilitado_estudiantes: boolean } | null;
  };
  const actividades = ((data ?? []) as unknown as Actividad[]).filter((a) => a.gestionesjj_curso_semanas?.habilitado_estudiantes);
  if (!actividades.length) return;

  for (const actividad of actividades) {
    const cursoId = actividad.gestionesjj_curso_semanas!.curso_id;
    const [{ data: curso }, { data: inscritos }, { data: entregas }, { data: avisados }] = await Promise.all([
      admin.from("gestionesjj_cursos_impartidos").select("estado,acceso_estudiantes").eq("id", cursoId).maybeSingle(),
      admin.from("gestionesjj_curso_estudiantes").select("estudiante_id").eq("curso_id", cursoId).eq("estado", "activo"),
      admin.from("gestionesjj_curso_entregas").select("estudiante_id").eq("actividad_id", actividad.id),
      admin.from("gestionesjj_estudiante_vencimientos_avisados").select("estudiante_id").eq("actividad_id", actividad.id),
    ]);
    if (!curso || curso.estado !== "activo" || !curso.acceso_estudiantes) continue;
    const excluidos = new Set([...(entregas ?? []), ...(avisados ?? [])].map((f) => f.estudiante_id as string));
    const pendientes = [
      ...new Set((inscritos ?? []).map((f) => f.estudiante_id as string | null).filter((id): id is string => Boolean(id))),
    ].filter((id) => !excluidos.has(id));
    if (!pendientes.length) continue;

    // Primero se reserva el aviso (clave unica): si dos corridas se cruzan, solo una lo crea.
    const { data: reservados } = await admin
      .from("gestionesjj_estudiante_vencimientos_avisados")
      .upsert(
        pendientes.map((estudiante_id) => ({ actividad_id: actividad.id, estudiante_id })),
        { onConflict: "actividad_id,estudiante_id", ignoreDuplicates: true },
      )
      .select("estudiante_id");
    const nuevos = (reservados ?? []).map((f) => f.estudiante_id as string);
    if (!nuevos.length) continue;
    await admin.from("gestionesjj_estudiante_notificaciones").insert(
      nuevos.map((estudiante_id) => ({
        estudiante_id,
        tipo: "vencimiento",
        curso_id: cursoId,
        meta: { titulo: actividad.titulo, fecha_limite: actividad.fecha_limite, actividad_id: actividad.id },
      })),
    );
  }
}

export async function procesarAvisosEstudiantes(admin: SupabaseClient) {
  const config = await leerConfigAvisos(admin);
  const token = config?.bot_token ?? null;
  const pushListo = Boolean(config?.vapid_public && config.vapid_private);
  if (!token && !pushListo) return { enviados: 0, cerrados: 0 };
  if (pushListo) webpush.setVapidDetails("mailto:lic.juanreyesr@gmail.com", config!.vapid_public!, config!.vapid_private!);

  const [{ data: vinculosData }, { data: suscripcionesData }] = await Promise.all([
    admin.from("gestionesjj_estudiante_telegram").select("estudiante_id,chat_id").not("chat_id", "is", null),
    admin.from("gestionesjj_estudiante_push").select("id,estudiante_id,endpoint,p256dh,auth"),
  ]);
  const vinculos = (vinculosData ?? []) as Vinculo[];
  const suscripciones = (suscripcionesData ?? []) as Suscripcion[];
  // Los recordatorios de vencimiento tambien quedan en la campana del Aula.
  await generarVencimientos(admin);

  const conCanal = [...new Set([...vinculos.map((v) => v.estudiante_id), ...suscripciones.map((s) => s.estudiante_id)])];
  if (!conCanal.length) {
    // Nadie tiene avisos externos: las notificaciones se dan por enviadas.
    await admin
      .from("gestionesjj_estudiante_notificaciones")
      .update({ externo_enviado_at: new Date().toISOString() })
      .is("externo_enviado_at", null);
    return { enviados: 0, cerrados: 0 };
  }

  const [{ data: estudiantesData }, activos] = await Promise.all([
    admin.from("gestionesjj_estudiantes").select("id,nombre,idioma,pais").in("id", conCanal),
    cursosActivos(admin, conCanal),
  ]);
  const estudiantes = new Map(((estudiantesData ?? []) as Estudiante[]).map((e) => [e.id, e]));

  // 1) Cierre: sin cursos activos → despedida, se cierra Telegram y se borra push.
  let cerrados = 0;
  for (const vinculo of vinculos) {
    if (activos.get(vinculo.estudiante_id)?.size) continue;
    const idioma = idiomaDe(estudiantes.get(vinculo.estudiante_id));
    if (token && vinculo.chat_id) {
      await botApi(token, "sendMessage", { chat_id: vinculo.chat_id, text: traducir(idioma, "tg_curso_cerrado") });
    }
    await admin.from("gestionesjj_estudiante_telegram").delete().eq("estudiante_id", vinculo.estudiante_id);
    cerrados += 1;
  }
  const sinCurso = suscripciones.filter((s) => !activos.get(s.estudiante_id)?.size).map((s) => s.id);
  if (sinCurso.length) await admin.from("gestionesjj_estudiante_push").delete().in("id", sinCurso);

  // 2) Notificaciones nuevas: se "reclaman" antes de enviar para no duplicar.
  const desde = new Date(Date.now() - VENTANA_PENDIENTES_MS).toISOString();
  const { data: pendientesData } = await admin
    .from("gestionesjj_estudiante_notificaciones")
    .select("id")
    .is("externo_enviado_at", null)
    .gte("created_at", desde)
    .order("created_at")
    .limit(300);
  const ids = (pendientesData ?? []).map((f) => f.id as string);
  // Las muy viejas (servicio caido horas) ya no se envian.
  await admin
    .from("gestionesjj_estudiante_notificaciones")
    .update({ externo_enviado_at: new Date().toISOString() })
    .is("externo_enviado_at", null)
    .lt("created_at", desde);
  if (!ids.length) return { enviados: 0, cerrados };

  const { data: reclamadas } = await admin
    .from("gestionesjj_estudiante_notificaciones")
    .update({ externo_enviado_at: new Date().toISOString() })
    .in("id", ids)
    .is("externo_enviado_at", null)
    .select("id,estudiante_id,tipo,curso_id,meta");

  const chatDe = new Map(vinculos.filter((v) => activos.get(v.estudiante_id)?.size).map((v) => [v.estudiante_id, v.chat_id]));
  let enviados = 0;
  for (const n of (reclamadas ?? []) as Notificacion[]) {
    const cursos = activos.get(n.estudiante_id);
    if (!cursos?.size) continue;
    // Solo lo de sus cursos activos (el chat con el docente no tiene curso).
    if (n.curso_id && !cursos.has(n.curso_id)) continue;
    const estudiante = estudiantes.get(n.estudiante_id);
    const idioma = idiomaDe(estudiante);
    const aviso = armarAviso(n, idioma, zonaDe({ pais: estudiante?.pais }), n.curso_id ? cursos.get(n.curso_id) ?? null : null);

    const chatId = chatDe.get(n.estudiante_id);
    if (token && chatId) {
      const res = await enviarAlEstudiante(token, chatId, aviso.telegram, idioma);
      if (res.ok) enviados += 1;
      // Bloqueo el bot o borro el chat: se cierra el vinculo.
      else if (res.codigo === 403 || res.codigo === 400) {
        await admin.from("gestionesjj_estudiante_telegram").delete().eq("estudiante_id", n.estudiante_id);
        chatDe.delete(n.estudiante_id);
      }
    }

    if (pushListo) {
      for (const s of suscripciones.filter((x) => x.estudiante_id === n.estudiante_id)) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ titulo: aviso.push.titulo, cuerpo: aviso.push.cuerpo, url: AULA_URL }),
            { TTL: 24 * 3600 },
          );
          enviados += 1;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await admin.from("gestionesjj_estudiante_push").delete().eq("id", s.id);
        }
      }
    }
  }
  return { enviados, cerrados };
}
