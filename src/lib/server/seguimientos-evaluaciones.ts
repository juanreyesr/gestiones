import type { SupabaseClient } from "@supabase/supabase-js";
import { mensajeSeguimientoEvaluacion } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { nombreCortoInstrumento } from "@/lib/evaluaciones/registro";
import { appUrl, enviarMensaje, esc, fechaLocal, type TelegramConfig } from "./telegram";

/** Intentos de aviso antes de dejar el error a la vista (igual que la migración 063). */
export const MAX_INTENTOS_SEGUIMIENTO = 5;
/** Si el enlace anterior sigue sin responder, se vuelve a recordar a los N días. */
export const DIAS_RECORDATORIO = 3;

type Seguimiento = {
  id: string;
  created_by: string;
  paciente_id: string;
  instrumento: string;
  opciones: Record<string, unknown>;
  etiqueta: string | null;
  cada_dias: number;
  proxima_fecha: string;
  ultima_evaluacion_id: string | null;
  pendiente_evaluacion_id: string | null;
  pendiente_tipo: "nuevo" | "recordatorio" | null;
  avisos: number;
  intentos: number;
};
type Paciente = { nombre: string; telefono: string | null; pais: string | null; es_menor: boolean; responsables: { nombre: string; telefono: string }[] | null };
type Evaluacion = { id: string; token: string; estado: string; created_at: string; etiqueta: string | null };

const COLUMNAS =
  "id,created_by,paciente_id,instrumento,opciones,etiqueta,cada_dias,proxima_fecha,ultima_evaluacion_id,pendiente_evaluacion_id,pendiente_tipo,avisos,intentos";

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number) {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

const fechaLarga = (fecha: string) => {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12)).toLocaleDateString("es-GT", { day: "numeric", month: "long", timeZone: "UTC" });
};

/** «cada 4 semanas», «cada 10 días». */
export const textoFrecuencia = (dias: number) => (dias % 7 === 0 ? `cada ${dias / 7 === 1 ? "semana" : `${dias / 7} semanas`}` : `cada ${dias} días`);

/** Nombre del instrumento con sus opciones (escalas del EAPI, forma A/B…). */
const nombreInstrumento = (instrumento: string, opciones: Record<string, unknown>) => nombreCortoInstrumento(instrumento, opciones);

/** Teléfono al que va el mensaje: el del padre/madre del enlace (si es de un cuidador) o el del paciente. */
function destinatario(p: Paciente, etiqueta: string | null) {
  const primer = (etiqueta ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const r = primer
    ? (p.responsables ?? []).find((x) => x.telefono?.trim() && x.nombre?.trim().toLowerCase().startsWith(primer))
    : undefined;
  return r?.telefono ?? p.telefono ?? "";
}

/**
 * Procesa los seguimientos vencidos: crea el enlace nuevo (o recuerda el
 * pendiente) y avisa por Telegram con el botón de WhatsApp listo. Lo dispara
 * pg_cron cada hora de 8:00 a 20:00 (migración 063), solo si hay algo que avisar.
 */
export async function procesarSeguimientos(admin: SupabaseClient, config: TelegramConfig | null) {
  const hoy = fechaLocal();
  const { data } = await admin
    .from("gestionesjj_evaluacion_seguimientos")
    .select(COLUMNAS)
    .eq("activo", true)
    .lt("intentos", MAX_INTENTOS_SEGUIMIENTO)
    .or(`pendiente_evaluacion_id.not.is.null,proxima_fecha.lte.${hoy}`);
  const vencidos = (data ?? []) as Seguimiento[];
  const resultado = { nuevos: 0, recordatorios: 0, avisados: 0, errores: 0 };

  for (const s of vencidos) {
    let evaluacionId = s.pendiente_evaluacion_id;
    let tipo = s.pendiente_tipo ?? "nuevo";

    if (!evaluacionId) {
      // ¿El enlace anterior sigue sin responder? Entonces solo se recuerda.
      let anterior: Evaluacion | null = null;
      if (s.ultima_evaluacion_id) {
        const { data: ev } = await admin
          .from("gestionesjj_evaluaciones")
          .select("id,token,estado,created_at,etiqueta")
          .eq("id", s.ultima_evaluacion_id)
          .maybeSingle();
        anterior = ev as Evaluacion | null;
      }
      let nueva: string | null = null;
      if (anterior?.estado === "abierta") {
        tipo = "recordatorio";
        evaluacionId = anterior.id;
      } else {
        tipo = "nuevo";
        const { data: creada, error } = await admin
          .from("gestionesjj_evaluaciones")
          .insert({
            created_by: s.created_by,
            paciente_id: s.paciente_id,
            instrumento: s.instrumento,
            respuestas_permitidas: 1,
            etiqueta: s.etiqueta,
            nota: "Seguimiento programado",
            opciones: s.opciones ?? {},
          })
          .select("id")
          .single();
        if (error || !creada) {
          await admin
            .from("gestionesjj_evaluacion_seguimientos")
            .update({ intentos: s.intentos + 1, error: error?.message ?? "No se pudo crear el enlace." })
            .eq("id", s.id);
          resultado.errores += 1;
          continue;
        }
        nueva = (creada as { id: string }).id;
        evaluacionId = nueva;
      }
      // Reclamar el seguimiento: solo si nadie lo movió mientras tanto.
      const { data: reclamado } = await admin
        .from("gestionesjj_evaluacion_seguimientos")
        .update({
          proxima_fecha: sumarDias(hoy, tipo === "nuevo" ? s.cada_dias : DIAS_RECORDATORIO),
          ultima_evaluacion_id: tipo === "nuevo" ? nueva : s.ultima_evaluacion_id,
          pendiente_evaluacion_id: evaluacionId,
          pendiente_tipo: tipo,
        })
        .eq("id", s.id)
        .eq("proxima_fecha", s.proxima_fecha)
        .is("pendiente_evaluacion_id", null)
        .select("id");
      if (!reclamado?.length) {
        if (nueva) await admin.from("gestionesjj_evaluaciones").delete().eq("id", nueva);
        continue;
      }
      if (tipo === "nuevo") resultado.nuevos += 1;
      else resultado.recordatorios += 1;
    }

    // Aviso por Telegram con el mensaje de WhatsApp listo.
    if (!config?.chatId) {
      await admin
        .from("gestionesjj_evaluacion_seguimientos")
        .update({ intentos: s.intentos + 1, error: "Telegram no está vinculado." })
        .eq("id", s.id);
      resultado.errores += 1;
      continue;
    }
    const [{ data: ev }, { data: pac }] = await Promise.all([
      admin.from("gestionesjj_evaluaciones").select("id,token,estado,created_at,etiqueta").eq("id", evaluacionId!).maybeSingle(),
      admin.from("gestionesjj_pacientes").select("nombre,telefono,pais,es_menor,responsables").eq("id", s.paciente_id).maybeSingle(),
    ]);
    const evaluacion = ev as Evaluacion | null;
    const paciente = pac as Paciente | null;
    if (!evaluacion || !paciente || evaluacion.estado !== "abierta") {
      // El enlace se respondió, cerró o borró antes de avisar: no hay nada que mandar.
      await admin
        .from("gestionesjj_evaluacion_seguimientos")
        .update({ pendiente_evaluacion_id: null, pendiente_tipo: null })
        .eq("id", s.id);
      continue;
    }
    const url = `${appUrl() ?? "https://www.juanjreyes.org"}/evaluacion/${evaluacion.token}`;
    const recordatorio = tipo === "recordatorio";
    const mensaje = mensajeSeguimientoEvaluacion(paciente.nombre, url, { esMenor: paciente.es_menor, recordatorio });
    const telefono = destinatario(paciente, evaluacion.etiqueta);
    const instrumento = nombreInstrumento(s.instrumento, s.opciones ?? {});
    const proxima = sumarDias(hoy, recordatorio ? DIAS_RECORDATORIO : s.cada_dias);
    const texto = [
      recordatorio ? "⏰ <b>Recordatorio de evaluación pendiente</b>" : "🔁 <b>Seguimiento programado</b>",
      `👤 <b>${esc(paciente.nombre)}</b>${evaluacion.etiqueta ? ` · para ${esc(evaluacion.etiqueta)}` : ""}`,
      `📋 ${esc(instrumento)} · ${esc(textoFrecuencia(s.cada_dias))}`,
      recordatorio
        ? `Aún no responde el enlace enviado el ${esc(fechaLarga(evaluacion.created_at))}. Toca el botón para recordárselo por WhatsApp (el mensaje y el enlace ya van escritos).`
        : "Ya creé el enlace nuevo. Toca el botón para enviárselo por WhatsApp (el mensaje y el enlace ya van escritos).",
      recordatorio
        ? `Si sigue pendiente, te lo vuelvo a recordar el ${esc(fechaLarga(proxima))}.`
        : `Próxima aplicación: ${esc(fechaLarga(proxima))}.`,
      telefono ? "" : "\n<i>El expediente no tiene teléfono: elige el contacto en WhatsApp.</i>",
    ]
      .filter(Boolean)
      .join("\n");
    let res = await enviarMensaje(config.chatId, texto, {
      botones: [
        [{ text: "📲 Enviar por WhatsApp", url: enlaceWhatsApp(telefono, mensaje, paciente.pais) }],
        [{ text: "🔗 Ver el test", url }],
      ],
    });
    if (!res.ok) {
      // Sin botón de WhatsApp (por si la URL fue demasiado larga): el mensaje queda para copiar.
      res = await enviarMensaje(config.chatId, `${texto}\n\n<b>Mensaje para copiar:</b>\n${esc(mensaje)}`);
    }
    if (res.ok) {
      await admin
        .from("gestionesjj_evaluacion_seguimientos")
        .update({ pendiente_evaluacion_id: null, pendiente_tipo: null, ultimo_aviso_at: new Date().toISOString(), avisos: s.avisos + 1, intentos: 0, error: null })
        .eq("id", s.id);
      resultado.avisados += 1;
    } else {
      await admin.from("gestionesjj_evaluacion_seguimientos").update({ intentos: s.intentos + 1, error: res.error }).eq("id", s.id);
      resultado.errores += 1;
    }
  }
  return resultado;
}
