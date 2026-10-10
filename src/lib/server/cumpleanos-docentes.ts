import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cumpleanosProximos,
  DIAS_ALERTA_CUMPLE,
  type DocenteCumple,
  enlaceCumpleanosDocente,
  fechaEnTextoCumple,
  nombreConTitulo,
} from "@/lib/cumpleanos-docentes";
import { type BotonInline, esc, fechaLocal } from "./telegram";

// Aviso de cumpleaños de docentes activos por Telegram (cron de las 7:00 a. m.,
// ver /api/telegram/resumen-diario). El dia del cumpleaños trae un boton por
// docente que abre WhatsApp con la felicitacion y su trato ya escritos; ademas
// adelanta quien cumple dentro de 7 dias para tenerlo presente.

export async function avisoCumpleanosDocentes(
  admin: SupabaseClient,
): Promise<{ texto: string; botones: BotonInline[][] } | null> {
  const { data } = await admin
    .from("gestionesjj_docentes")
    .select("id,nombre,telefono,trato,femenino,fecha_nacimiento")
    .eq("activo", true)
    .not("fecha_nacimiento", "is", null);

  const proximos = cumpleanosProximos((data ?? []) as DocenteCumple[], fechaLocal());
  const hoy = proximos.filter((p) => p.diasFaltan === 0);
  const enUnaSemana = proximos.filter((p) => p.diasFaltan === DIAS_ALERTA_CUMPLE);
  if (hoy.length === 0 && enUnaSemana.length === 0) return null;

  const lineas: string[] = [];
  const botones: BotonInline[][] = [];
  if (hoy.length) {
    lineas.push("🎂 <b>Cumpleaños de docentes hoy</b>", "");
    for (const { docente } of hoy) {
      lineas.push(`• ${esc(nombreConTitulo(docente))}${docente.telefono ? "" : " (sin teléfono registrado)"}`);
      const primerNombre = docente.nombre.trim().split(/\s+/)[0] ?? docente.nombre;
      botones.push([{ text: `🎉 Felicitar a ${primerNombre} por WhatsApp`, url: enlaceCumpleanosDocente(docente) }]);
    }
    lineas.push("", "Toca el botón para abrir WhatsApp con la felicitación ya escrita.");
  }
  if (enUnaSemana.length) {
    if (lineas.length) lineas.push("");
    lineas.push(`🎈 <b>En una semana</b> (${esc(fechaEnTextoCumple(enUnaSemana[0].fecha))})`);
    for (const { docente } of enUnaSemana) lineas.push(`• ${esc(nombreConTitulo(docente))}`);
  }
  return { texto: lineas.join("\n"), botones };
}
