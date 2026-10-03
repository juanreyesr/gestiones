import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoEvaluacion } from "@/lib/control-revision";
import {
  agruparPorDocente,
  entraAlControl,
  fechaEnTexto,
  lunesSiguiente,
  mensajeFelicitacion,
  mensajeRecordatorio,
  nombreCorto,
  type OcasionAviso,
} from "@/lib/control-revision-mensajes";
import { enlaceWhatsApp, telefonoWhatsApp } from "@/lib/clinica/recordatorio";
import { urlFelicitacion } from "./enlace-felicitacion";
import { enviarMensaje, esc, fechaLocal, type TelegramConfig } from "./telegram";

type RawPeriodo = {
  id: string;
  anio: number;
  trimestre: number;
  tipo: TipoEvaluacion;
  fecha_limite: string;
  aviso_limite_at: string | null;
  aviso_lunes_at: string | null;
};

type RawCurso = {
  id: string;
  nombre: string;
  activo: boolean;
  virtual: boolean | null;
  anio: number;
  trimestre: number;
  docente_id: string | null;
  gestionesjj_docentes: { nombre: string; telefono: string | null; trato: string | null } | null;
};

type RawFila = { curso_id: string; estado_entrega: "Pendiente" | "Entregado"; fecha_recepcion: string | null };

/**
 * Manda un mensaje con boton de WhatsApp; si la URL es muy larga, abre el chat
 * sin texto. `url` reemplaza el enlace directo (p. ej. el firmado de la felicitacion).
 */
async function enviarConBoton(
  chatId: number,
  texto: string,
  etiqueta: string,
  telefono: string | null,
  mensaje: string,
  url?: string | null,
) {
  const res = await enviarMensaje(chatId, texto, {
    botones: [[{ text: etiqueta, url: url ?? enlaceWhatsApp(telefono, mensaje) }]],
  });
  if (res.ok) return res;
  const numero = telefonoWhatsApp(telefono);
  return enviarMensaje(chatId, `${texto}\n\n<i>Copia el mensaje y pégalo en el chat:</i>\n\n${esc(mensaje)}`, {
    botones: [[{ text: "📲 Abrir chat de WhatsApp", url: numero ? `https://wa.me/${numero}` : "https://wa.me/" }]],
  });
}

/**
 * Envia a Telegram los avisos de un periodo del control de revision: un resumen
 * y un mensaje por docente (recordatorio si tiene pendientes, felicitacion si
 * entrego todo a tiempo). El lunes automatico solo van los recordatorios. Devuelve
 * cuantos mensajes salieron; si no hay nada que avisar el lunes, no manda nada.
 */
export async function enviarAvisosPeriodo(
  admin: SupabaseClient,
  chatId: number,
  periodo: Pick<RawPeriodo, "anio" | "trimestre" | "tipo" | "fecha_limite">,
  ocasion: OcasionAviso,
  felicitar = ocasion !== "lunes",
  /** Solo estos docentes (seguimiento individual desde la vista); sin lista, todos. */
  soloDocentes?: string[],
) {
  const [resCursos, resFilas] = await Promise.all([
    admin
      .from("gestionesjj_cursos")
      .select("id,nombre,activo,virtual,anio,trimestre,docente_id,gestionesjj_docentes(nombre,telefono,trato)")
      .eq("anio", periodo.anio)
      .eq("trimestre", periodo.trimestre),
    admin
      .from("gestionesjj_control_revision_filas")
      .select("curso_id,estado_entrega,fecha_recepcion")
      .eq("anio", periodo.anio)
      .eq("trimestre", periodo.trimestre)
      .eq("tipo", periodo.tipo),
  ]);
  if (resCursos.error || resFilas.error) return { enviados: 0, error: resCursos.error?.message ?? resFilas.error?.message };

  const estados = new Map(((resFilas.data ?? []) as RawFila[]).map((f) => [f.curso_id, f]));
  const filas = ((resCursos.data ?? []) as unknown as RawCurso[])
    .filter((c) =>
      entraAlControl(
        { activo: c.activo, virtual: c.virtual ?? false, anio: c.anio, trimestre: c.trimestre, docenteId: c.docente_id },
        periodo.anio,
        periodo.trimestre,
        c.gestionesjj_docentes?.nombre,
      ),
    )
    .map((c) => {
      const estado = estados.get(c.id);
      return {
        docenteId: c.docente_id as string,
        nombre: c.gestionesjj_docentes?.nombre ?? "Docente",
        telefono: c.gestionesjj_docentes?.telefono ?? null,
        trato: c.gestionesjj_docentes?.trato ?? null,
        curso: c.nombre,
        estado: estado?.estado_entrega ?? ("Pendiente" as const),
        fechaRecepcion: estado?.fecha_recepcion ?? null,
      };
    });

  const todos = agruparPorDocente(filas, periodo.fecha_limite);
  const elegidos = soloDocentes ? new Set(soloDocentes) : null;
  const docentes = elegidos ? todos.filter((d) => elegidos.has(d.docenteId)) : todos;
  // El resumen solo tiene sentido cuando el aviso va a todos; para uno o
  // algunos docentes salen directo sus mensajes.
  const conResumen = !elegidos || docentes.length === todos.length;
  const pendientes = docentes.filter((d) => d.pendientes.length);
  const puntuales = felicitar ? docentes.filter((d) => d.puntual) : [];
  if (!pendientes.length && !puntuales.length) return { enviados: 0, error: null };

  const tipoTexto = periodo.tipo === "parcial" ? "parcial" : "final";
  const encabezado = [
    `📋 <b>Control de revisión — evaluación ${tipoTexto}, T${periodo.trimestre} ${periodo.anio}</b>`,
    ocasion === "limite"
      ? `Fecha límite: <b>hoy, ${esc(fechaEnTexto(periodo.fecha_limite))}</b>`
      : ocasion === "antes"
        ? `Fecha límite: <b>${esc(fechaEnTexto(periodo.fecha_limite))}</b>`
        : `La fecha límite fue el ${esc(fechaEnTexto(periodo.fecha_limite))}.`,
    "",
    pendientes.length
      ? `⏳ <b>${pendientes.length} docente${pendientes.length === 1 ? "" : "s"} con pendientes</b>\n${pendientes
          .map((d) => `• ${esc(nombreCorto(d.nombre))}: ${esc(d.pendientes.join(", "))}`)
          .join("\n")}`
      : "✅ <b>Todos los docentes entregaron.</b>",
    ...(puntuales.length
      ? ["", `🎉 <b>Entregaron a tiempo (${puntuales.length})</b>\n${puntuales.map((d) => `• ${esc(nombreCorto(d.nombre))}`).join("\n")}`]
      : []),
    "",
    "<i>Abajo va un mensaje por docente con el botón de WhatsApp listo.</i>",
  ].join("\n");

  let enviados = 0;
  if (conResumen) {
    const resumen = await enviarMensaje(chatId, encabezado);
    if (!resumen.ok) return { enviados, error: resumen.error };
    enviados += 1;
  }

  for (const d of pendientes) {
    const mensaje = mensajeRecordatorio({
      nombre: d.nombre,
      trato: d.trato,
      tipo: periodo.tipo,
      cursos: d.pendientes,
      fechaLimite: periodo.fecha_limite,
      ocasion,
    });
    const res = await enviarConBoton(
      chatId,
      `⏳ <b>${esc(d.nombre)}</b>\nPendiente: ${esc(d.pendientes.join(", "))}`,
      "📲 Enviar recordatorio por WhatsApp",
      d.telefono,
      mensaje,
    );
    if (res.ok) enviados += 1;
  }

  for (const d of puntuales) {
    // El saludo (Buenos días / tardes / noches) se calcula al tocar el boton.
    const mensaje = mensajeFelicitacion({ trato: d.trato, tipo: periodo.tipo, cursos: d.cursos });
    const res = await enviarConBoton(
      chatId,
      `🎉 <b>${esc(d.nombre)}</b>\nEntregó a tiempo: ${esc(d.cursos.join(", "))}`,
      "📲 Enviar felicitación por WhatsApp",
      d.telefono,
      mensaje,
      urlFelicitacion({ telefono: d.telefono, trato: d.trato, tipo: periodo.tipo, cursos: d.cursos }),
    );
    if (res.ok) enviados += 1;
  }

  return { enviados, error: null };
}

/**
 * Lo dispara pg_cron a las 7:00 p. m. de Guatemala (migracion 049): avisa los
 * periodos cuya fecha limite es hoy, y los que tuvieron su fecha limite antes
 * del lunes de hoy. Cada aviso se marca para no repetirse.
 */
export async function enviarAvisosControlRevision(admin: SupabaseClient, config: TelegramConfig) {
  if (!config.chatId || !config.preferencias.control_revision_avisos) return 0;

  const hoy = fechaLocal();
  const { data } = await admin
    .from("gestionesjj_control_revision_periodos")
    .select("id,anio,trimestre,tipo,fecha_limite,aviso_limite_at,aviso_lunes_at")
    .gte("fecha_limite", fechaLocal(-7))
    .lte("fecha_limite", hoy);

  let enviados = 0;
  for (const periodo of (data ?? []) as RawPeriodo[]) {
    let ocasion: OcasionAviso | null = null;
    let columna: "aviso_limite_at" | "aviso_lunes_at" | null = null;
    if (periodo.fecha_limite === hoy && !periodo.aviso_limite_at) {
      ocasion = "limite";
      columna = "aviso_limite_at";
    } else if (lunesSiguiente(periodo.fecha_limite) === hoy && !periodo.aviso_lunes_at) {
      ocasion = "lunes";
      columna = "aviso_lunes_at";
    }
    if (!ocasion || !columna) continue;

    // Se reclama antes de enviar: si dos ejecuciones se cruzan, solo una avisa.
    const { data: reclamado } = await admin
      .from("gestionesjj_control_revision_periodos")
      .update({ [columna]: new Date().toISOString() })
      .eq("id", periodo.id)
      .is(columna, null)
      .select("id");
    if (!reclamado?.length) continue;

    const res = await enviarAvisosPeriodo(admin, config.chatId, periodo, ocasion);
    if (res.error && res.enviados === 0) {
      await admin.from("gestionesjj_control_revision_periodos").update({ [columna]: null }).eq("id", periodo.id);
    }
    enviados += res.enviados;
  }
  return enviados;
}
