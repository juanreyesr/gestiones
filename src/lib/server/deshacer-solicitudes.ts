import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarCoincidencia } from "@/lib/clinica/coincidencias";
import { deleteEvent, marcarEventoGestiones } from "./google-calendar";
import { botonesReserva, pacientesComparables, type ReservaRow, textoReserva } from "./reservas-google";
import { type TelegramConfig, editarMensaje } from "./telegram";

/**
 * "Deshacer" de una solicitud de /agendar (aprobada o rechazada) o de una
 * reserva de Calendly (vinculada, creada o ignorada), por si se eligio el
 * paciente equivocado. Quita la cita que se creo (y el paciente, si se creo
 * en ese momento y no tiene nada mas) y deja la solicitud otra vez pendiente.
 * Lo usan el boton "↩️ Deshacer" de Telegram y el panel de Clinica.
 */

export type ResultadoDeshacer = { ok: true; mensaje: string } | { ok: false; error: string };

/** Borra la cita creada al aprobar; el paciente solo si se creo con ella y quedo vacio. */
async function quitarCita(
  admin: SupabaseClient,
  citaId: string | null,
  pacienteId: string | null,
  opciones: { borrarEventoGoogle: boolean; pacienteCreado: boolean },
): Promise<string | null> {
  if (citaId) {
    const { data: cita } = await admin.from("gestionesjj_citas").select("id,estado,gcal_event_id").eq("id", citaId).maybeSingle();
    if (cita) {
      if (cita.estado === "completada") return "La cita ya se marcó como atendida; corrígela desde la agenda.";
      const { count } = await admin.from("gestionesjj_sesiones").select("id", { count: "exact", head: true }).eq("cita_id", citaId);
      if (count) return "La cita ya tiene una sesión registrada; corrígela desde el expediente.";
      // El evento de Calendly no se borra (es del paciente); el que creo la app, si.
      if (opciones.borrarEventoGoogle && cita.gcal_event_id) await deleteEvent(cita.gcal_event_id as string).catch(() => undefined);
      const { error } = await admin.from("gestionesjj_citas").delete().eq("id", citaId);
      if (error) return "No se pudo quitar la cita de la agenda.";
    }
  }

  if (pacienteId && opciones.pacienteCreado) {
    const [citas, sesiones] = await Promise.all([
      admin.from("gestionesjj_citas").select("id", { count: "exact", head: true }).eq("paciente_id", pacienteId),
      admin.from("gestionesjj_sesiones").select("id", { count: "exact", head: true }).eq("paciente_id", pacienteId),
    ]);
    if (!citas.count && !sesiones.count) await admin.from("gestionesjj_pacientes").delete().eq("id", pacienteId);
  }
  return null;
}

type RawSolicitud = {
  id: string;
  estado: string;
  nombre: string;
  telefono: string;
  created_at: string;
  paciente_id: string | null;
  cita_id: string | null;
};

export async function deshacerSolicitud(admin: SupabaseClient, solicitudId: string): Promise<ResultadoDeshacer> {
  const { data } = await admin
    .from("gestionesjj_solicitudes_cita")
    .select("id,estado,nombre,telefono,created_at,paciente_id,cita_id")
    .eq("id", solicitudId)
    .maybeSingle();
  const sol = data as RawSolicitud | null;
  if (!sol) return { ok: false, error: "La solicitud ya no existe." };
  if (sol.estado !== "aprobada" && sol.estado !== "rechazada") {
    return { ok: false, error: "Esta solicitud no está aprobada ni rechazada." };
  }

  if (sol.estado === "aprobada") {
    // Paciente creado al aprobar: registrado despues de la solicitud y con sus mismos datos.
    let pacienteCreado = false;
    if (sol.paciente_id) {
      const { data: paciente } = await admin
        .from("gestionesjj_pacientes")
        .select("nombre,telefono,created_at")
        .eq("id", sol.paciente_id)
        .maybeSingle();
      pacienteCreado = Boolean(
        paciente &&
          paciente.created_at >= sol.created_at &&
          paciente.nombre === sol.nombre &&
          paciente.telefono === sol.telefono,
      );
    }
    const error = await quitarCita(admin, sol.cita_id, sol.paciente_id, { borrarEventoGoogle: true, pacienteCreado });
    if (error) return { ok: false, error };
  }

  const { data: actualizada } = await admin
    .from("gestionesjj_solicitudes_cita")
    .update({ estado: "pendiente", paciente_id: null, cita_id: null })
    .eq("id", solicitudId)
    .eq("estado", sol.estado)
    .select("id");
  if (!actualizada?.length) return { ok: false, error: "La solicitud cambió mientras tanto; revisa el panel." };
  return {
    ok: true,
    mensaje: sol.estado === "aprobada" ? "Aprobación deshecha: la solicitud vuelve a estar pendiente." : "Rechazo deshecho: la solicitud vuelve a estar pendiente.",
  };
}

export async function deshacerReserva(
  admin: SupabaseClient,
  reservaId: string,
  config?: TelegramConfig | null,
): Promise<ResultadoDeshacer> {
  const { data } = await admin.from("gestionesjj_google_reservas").select("*").eq("id", reservaId).maybeSingle();
  const reserva = data as ReservaRow | null;
  if (!reserva) return { ok: false, error: "La reserva ya no existe." };
  const anterior = reserva.estado;
  if (anterior !== "vinculada" && anterior !== "creada" && anterior !== "ignorada") {
    return { ok: false, error: "Esta reserva no está resuelta." };
  }

  // Se "toma" la reserva para que Telegram y el panel no deshagan a la vez.
  const { data: tomada } = await admin
    .from("gestionesjj_google_reservas")
    .update({ estado: "procesando" })
    .eq("id", reservaId)
    .eq("estado", anterior)
    .select("id");
  if (!tomada?.length) return { ok: false, error: "La reserva cambió mientras tanto; revisa el panel." };

  if (anterior !== "ignorada") {
    const error = await quitarCita(admin, reserva.cita_id, reserva.paciente_id, {
      borrarEventoGoogle: false,
      pacienteCreado: anterior === "creada",
    });
    if (error) {
      await admin.from("gestionesjj_google_reservas").update({ estado: anterior }).eq("id", reservaId);
      return { ok: false, error };
    }
    await marcarEventoGestiones(reserva.calendario_id, reserva.evento_id, null).catch(() => undefined);
  }

  await admin
    .from("gestionesjj_google_reservas")
    .update({ estado: "pendiente", paciente_id: null, cita_id: null, resuelto_en: null })
    .eq("id", reservaId);

  // El mensaje de Telegram vuelve a mostrar los botones para elegir de nuevo.
  if (config?.chatId && reserva.telegram_message_id) {
    const coincidencia = buscarCoincidencia(await pacientesComparables(admin), reserva);
    await editarMensaje(
      config.chatId,
      Number(reserva.telegram_message_id),
      `${textoReserva(reserva, coincidencia)}\n\n↩️ <i>Deshecho: elige de nuevo.</i>`,
      botonesReserva(reserva, coincidencia),
    );
  }
  return { ok: true, mensaje: "Listo: la reserva vuelve a estar por revisar." };
}
