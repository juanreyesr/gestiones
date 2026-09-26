import { getSupabaseClient } from "@/lib/supabase";

// Estado del recordatorio automatico de WhatsApp de una cita (migracion 041).
// Solo lectura: el servidor es quien envia y actualiza.

export type EstadoWhatsAppCita = {
  estado: "enviando" | "enviado" | "entregado" | "leido" | "fallido";
  error: string | null;
  respuesta: "confirmar" | "reprogramar" | null;
  enviadoEn: string;
  respondidoEn: string | null;
};

export async function fetchEstadoWhatsAppCita(citaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("gestionesjj_whatsapp_mensajes")
    .select("estado,error,respuesta,created_at,respondido_at")
    .eq("cita_id", citaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    estado: EstadoWhatsAppCita["estado"];
    error: string | null;
    respuesta: EstadoWhatsAppCita["respuesta"];
    created_at: string;
    respondido_at: string | null;
  };
  return {
    estado: row.estado,
    error: row.error,
    respuesta: row.respuesta,
    enviadoEn: row.created_at,
    respondidoEn: row.respondido_at,
  } satisfies EstadoWhatsAppCita;
}
