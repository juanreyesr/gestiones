import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarCoincidencia, type Coincidencia, type PacienteComparable } from "@/lib/clinica/coincidencias";
import { parsearReserva } from "@/lib/clinica/reserva-google";
import {
  getStoredTokens,
  isGoogleConfigured,
  listarEventos,
  marcarEventoGestiones,
  obtenerEvento,
} from "./google-calendar";
import { type BotonInline, type TelegramConfig, editarMensaje, enviarMensaje, esc, fechaHora, recortar } from "./telegram";

/**
 * Reservas que llegan por Google Calendar desde Calendly u otro sistema de
 * citas. El job de cada 10 minutos las detecta y las deja en
 * gestionesjj_google_reservas; el owner las resuelve desde Telegram o desde
 * el panel (lo primero que haga): vincular a un paciente existente, crear el
 * paciente, o ignorar. Resolver crea la cita en la agenda de la clinica
 * enlazada al mismo evento de Google, sin duplicarlo.
 */

const DIAS_VENTANA = 45;
const MAX_AVISOS_POR_CORRIDA = 5;

export type ReservaRow = {
  id: string;
  evento_clave: string;
  calendario_id: string;
  evento_id: string;
  calendario_principal: boolean;
  inicio: string;
  fin: string;
  titulo: string | null;
  tipo_evento: string | null;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  motivo: string | null;
  notas: string | null;
  consentimiento: boolean;
  consentimiento_texto: string | null;
  estado: "pendiente" | "procesando" | "vinculada" | "creada" | "ignorada" | "cancelada";
  paciente_id: string | null;
  cita_id: string | null;
  telegram_message_id: number | string | null;
  created_at: string;
};

export async function pacientesComparables(admin: SupabaseClient): Promise<PacienteComparable[]> {
  const { data } = await admin.from("gestionesjj_pacientes").select("id,nombre,telefono,email").limit(5000);
  return (data ?? []) as PacienteComparable[];
}

// ============================================================
// Texto y botones (Telegram)
// ============================================================

export function textoReserva(r: ReservaRow, coincidencia: Coincidencia | null) {
  return [
    `📅 <b>Nueva reserva${r.tipo_evento ? ` — ${esc(r.tipo_evento)}` : ""}</b>`,
    `🗓 ${esc(fechaHora(r.inicio))}`,
    `👤 ${esc(r.nombre ?? "Sin nombre")}`,
    r.telefono || r.email ? `📞 ${esc([r.telefono, r.email].filter(Boolean).join(" · "))}` : null,
    r.motivo ? `📝 ${esc(recortar(r.motivo, 400))}` : null,
    r.notas ? `💬 ${esc(recortar(r.notas, 400))}` : null,
    r.consentimiento ? "✔️ Aceptó el consentimiento" : null,
    "",
    coincidencia
      ? `🔎 <b>Parece ser ${esc(coincidencia.paciente.nombre)}</b> (mismo ${coincidencia.por})`
      : "🔎 No coincide con ningún paciente registrado.",
  ]
    .filter((linea) => linea !== null)
    .join("\n");
}

export function botonesReserva(r: ReservaRow, coincidencia: Coincidencia | null): BotonInline[][] {
  const botones: BotonInline[][] = [];
  if (coincidencia) {
    botones.push([{ text: `✅ Es ${coincidencia.paciente.nombre.split(" ")[0]}: agendar en su expediente`, callback_data: `gr:vp:${r.id}` }]);
    botones.push([{ text: "➕ Es otra persona: crear paciente", callback_data: `gr:nv:${r.id}` }]);
  } else {
    botones.push([{ text: "➕ Crear paciente y agendar", callback_data: `gr:nv:${r.id}` }]);
  }
  botones.push([{ text: "🙈 Ignorar (no es una sesión)", callback_data: `gr:ig:${r.id}` }]);
  return botones;
}

// ============================================================
// Deteccion (job de cada 10 minutos o boton "Buscar ahora" del panel)
// ============================================================

export async function sincronizarReservas(admin: SupabaseClient, config: TelegramConfig | null) {
  if (!isGoogleConfigured()) return { nuevas: 0, conectado: false };
  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado !== "conectado") return { nuevas: 0, conectado: false };

  const ahora = Date.now();
  const desde = new Date(ahora - 12 * 3_600_000).toISOString();
  const { eventos, error } = await listarEventos(desde, new Date(ahora + DIAS_VENTANA * 86_400_000).toISOString());
  if (error) return { nuevas: 0, conectado: false };

  const nuevas: ReservaRow[] = [];
  const vistas = new Set<string>();
  const unicos = new Set<string>();

  for (const evento of eventos) {
    if (evento.gestionesId || evento.todoElDia) continue;
    const datos = parsearReserva({ titulo: evento.titulo, descripcion: evento.descripcion, invitados: evento.invitados });
    if (!datos.esReserva) continue;

    const unico = `${evento.id}|${Date.parse(evento.inicio)}`;
    if (unicos.has(unico)) continue; // la misma invitacion en dos calendarios
    unicos.add(unico);

    const clave = `${evento.calendarioId}:${evento.id}`;
    vistas.add(clave);
    const inicio = new Date(evento.inicio).toISOString();
    const fin = new Date(evento.fin).toISOString();

    const { data: insertada } = await admin
      .from("gestionesjj_google_reservas")
      .upsert(
        {
          evento_clave: clave,
          calendario_id: evento.calendarioId,
          evento_id: evento.id,
          calendario_principal: evento.calendarioPrincipal,
          inicio,
          fin,
          titulo: evento.titulo,
          tipo_evento: datos.tipoEvento,
          nombre: datos.nombre,
          telefono: datos.telefono,
          email: datos.email,
          motivo: datos.motivo,
          notas: datos.notas,
          consentimiento: datos.consentimiento,
          consentimiento_texto: datos.consentimientoTexto,
        },
        { onConflict: "evento_clave", ignoreDuplicates: true },
      )
      .select("*");

    if (insertada?.length) {
      nuevas.push(insertada[0] as ReservaRow);
    } else {
      // Ya existia: si la reprogramaron y sigue pendiente, se mantiene al dia el horario.
      await admin
        .from("gestionesjj_google_reservas")
        .update({ inicio, fin })
        .eq("evento_clave", clave)
        .eq("estado", "pendiente");
    }
  }

  await marcarCanceladas(admin, config, vistas, desde);

  if (nuevas.length && config?.chatId && config.preferencias.reservas_google) {
    const pacientes = await pacientesComparables(admin);
    for (const reserva of nuevas.slice(0, MAX_AVISOS_POR_CORRIDA)) {
      const coincidencia = buscarCoincidencia(pacientes, reserva);
      const res = await enviarMensaje(config.chatId, textoReserva(reserva, coincidencia), {
        botones: botonesReserva(reserva, coincidencia),
      });
      if (res.ok) {
        await admin
          .from("gestionesjj_google_reservas")
          .update({ telegram_message_id: res.result.message_id })
          .eq("id", reserva.id);
      }
    }
    if (nuevas.length > MAX_AVISOS_POR_CORRIDA) {
      await enviarMensaje(
        config.chatId,
        `📅 Hay ${nuevas.length - MAX_AVISOS_POR_CORRIDA} reserva(s) más por revisar en <b>Clínica → Solicitudes</b>.`,
      );
    }
  }

  return { nuevas: nuevas.length, conectado: true };
}

/** Reservas pendientes cuyo evento ya no aparece: se confirma con Google y, si se borro, se marcan canceladas. */
async function marcarCanceladas(admin: SupabaseClient, config: TelegramConfig | null, vistas: Set<string>, desde: string) {
  const { data } = await admin
    .from("gestionesjj_google_reservas")
    .select("*")
    .eq("estado", "pendiente")
    .gte("inicio", desde)
    .limit(50);

  for (const reserva of (data ?? []) as ReservaRow[]) {
    if (vistas.has(reserva.evento_clave)) continue;
    const actual = await obtenerEvento(reserva.calendario_id, reserva.evento_id);
    if (actual.estado !== "no_existe") continue; // si Google fallo no se decide nada

    await admin
      .from("gestionesjj_google_reservas")
      .update({ estado: "cancelada", resuelto_en: new Date().toISOString() })
      .eq("id", reserva.id)
      .eq("estado", "pendiente");
    if (config?.chatId && reserva.telegram_message_id) {
      await editarMensaje(
        config.chatId,
        Number(reserva.telegram_message_id),
        `${textoReserva(reserva, null)}\n\n🚫 <b>Cancelada</b>: el evento ya no está en Google Calendar.`,
      );
    }
  }
}

// ============================================================
// Resolver (Telegram o panel)
// ============================================================

export type AccionReserva = "vincular" | "crear" | "ignorar";

type ResultadoResolver =
  | { ok: true; mensaje: string; citaId: string | null; pacienteId: string | null }
  | { ok: false; error: string };

export async function resolverReserva(
  admin: SupabaseClient,
  ownerId: string,
  reservaId: string,
  accion: AccionReserva,
  opciones: {
    pacienteId?: string | null;
    datos?: { nombre?: string | null; telefono?: string | null; email?: string | null };
    config?: TelegramConfig | null;
  } = {},
): Promise<ResultadoResolver> {
  // Se "toma" la reserva: si Telegram y el panel actuan a la vez, solo uno gana.
  const { data: tomada } = await admin
    .from("gestionesjj_google_reservas")
    .update({ estado: "procesando", updated_at: new Date().toISOString() })
    .eq("id", reservaId)
    .eq("estado", "pendiente")
    .select("*");
  const reserva = (tomada?.[0] ?? null) as ReservaRow | null;
  if (!reserva) return { ok: false, error: "Esta reserva ya se resolvió o no existe." };

  const devolver = async (error: string): Promise<ResultadoResolver> => {
    await admin.from("gestionesjj_google_reservas").update({ estado: "pendiente" }).eq("id", reservaId);
    return { ok: false, error };
  };

  try {
    if (accion === "ignorar") {
      await admin
        .from("gestionesjj_google_reservas")
        .update({ estado: "ignorada", resuelto_en: new Date().toISOString() })
        .eq("id", reservaId);
      await actualizarTelegram(reserva, opciones.config, "🙈 <b>Ignorada</b>");
      return { ok: true, mensaje: "Reserva ignorada.", citaId: null, pacienteId: null };
    }

    let pacienteId: string | null = null;
    let pacienteNombre = "";
    let pacienteCreado = false;

    if (accion === "vincular") {
      pacienteId = opciones.pacienteId ?? null;
      if (!pacienteId) {
        const coincidencia = buscarCoincidencia(await pacientesComparables(admin), reserva);
        pacienteId = coincidencia?.paciente.id ?? null;
      }
      if (!pacienteId) return await devolver("No encontré a qué paciente vincularla. Elige uno desde el panel.");
      const { data: paciente } = await admin.from("gestionesjj_pacientes").select("id,nombre").eq("id", pacienteId).maybeSingle();
      if (!paciente) return await devolver("Ese paciente ya no existe.");
      pacienteNombre = paciente.nombre as string;
    } else {
      const nombre = (opciones.datos?.nombre ?? reserva.nombre ?? "").trim();
      const telefono = (opciones.datos?.telefono ?? reserva.telefono ?? "").trim();
      const email = (opciones.datos?.email ?? reserva.email ?? "").trim() || null;
      if (!nombre) return await devolver("Falta el nombre. Créalo desde Clínica → Solicitudes para escribirlo.");
      if (!telefono) return await devolver("Falta el teléfono. Créalo desde Clínica → Solicitudes para escribirlo.");

      const { data: nuevo, error } = await admin
        .from("gestionesjj_pacientes")
        .insert({
          created_by: ownerId,
          nombre,
          telefono,
          email,
          motivo_consulta: reserva.motivo,
          notas_generales: reserva.notas
            ? `Antes de iniciar (formulario de ${reserva.tipo_evento ?? "reserva"}): ${reserva.notas}`
            : null,
          consentimiento_texto: reserva.consentimiento ? reserva.consentimiento_texto : null,
          consentimiento_aceptado_at: reserva.consentimiento ? reserva.created_at : null,
        })
        .select("id,nombre")
        .single();
      if (error || !nuevo) return await devolver("No se pudo crear el paciente.");
      pacienteId = nuevo.id as string;
      pacienteNombre = nuevo.nombre as string;
      pacienteCreado = true;
    }

    const notasCita = [
      `Reservada por ${reserva.tipo_evento ? `Calendly (${reserva.tipo_evento})` : "un sistema externo"} vía Google Calendar.`,
      reserva.motivo ? `Motivo: ${reserva.motivo}` : null,
      reserva.notas ? `Antes de iniciar: ${reserva.notas}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: cita, error: citaError } = await admin
      .from("gestionesjj_citas")
      .insert({
        created_by: ownerId,
        paciente_id: pacienteId,
        inicio: reserva.inicio,
        fin: reserva.fin,
        estado: "confirmada",
        origen: "publica",
        motivo: reserva.motivo,
        notas: notasCita,
        // Solo se enlaza si el evento vive en el calendario que la app sincroniza.
        gcal_event_id: reserva.calendario_principal ? reserva.evento_id : null,
        gcal_sync_status: reserva.calendario_principal ? "sincronizada" : "no_configurado",
      })
      .select("id")
      .single();

    if (citaError || !cita) {
      if (pacienteCreado) await admin.from("gestionesjj_pacientes").delete().eq("id", pacienteId);
      return await devolver(
        citaError?.code === "23P01"
          ? "Ya hay otra cita en tu agenda en ese mismo horario."
          : "No se pudo crear la cita en la agenda.",
      );
    }

    await marcarEventoGestiones(reserva.calendario_id, reserva.evento_id, cita.id as string).catch(() => undefined);

    await admin
      .from("gestionesjj_google_reservas")
      .update({
        estado: pacienteCreado ? "creada" : "vinculada",
        paciente_id: pacienteId,
        cita_id: cita.id,
        resuelto_en: new Date().toISOString(),
      })
      .eq("id", reservaId);

    const mensaje = pacienteCreado
      ? `Paciente creado: ${pacienteNombre}. La cita ya está en tu agenda.`
      : `Cita agregada al expediente de ${pacienteNombre}.`;
    await actualizarTelegram(
      reserva,
      opciones.config,
      pacienteCreado ? `➕ <b>Paciente creado</b>: ${esc(pacienteNombre)}` : `✅ <b>Vinculada a ${esc(pacienteNombre)}</b>`,
    );
    return { ok: true, mensaje, citaId: cita.id as string, pacienteId };
  } catch {
    return await devolver("Ocurrió un error inesperado. Intenta de nuevo.");
  }
}

/** Deja el mensaje de Telegram de la reserva sin botones y con el resultado. */
async function actualizarTelegram(reserva: ReservaRow, config: TelegramConfig | null | undefined, resultado: string) {
  if (!config?.chatId || !reserva.telegram_message_id) return;
  await editarMensaje(config.chatId, Number(reserva.telegram_message_id), `${textoReserva(reserva, null)}\n\n${resultado}`);
}
