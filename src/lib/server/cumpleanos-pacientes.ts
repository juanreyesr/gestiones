import type { SupabaseClient } from "@supabase/supabase-js";
import { mensajeCumpleanos } from "@/lib/clinica/mensaje-paciente";
import { enlaceWhatsApp } from "@/lib/clinica/recordatorio";
import { type BotonInline, esc, fechaLocal } from "./telegram";

// Aviso de cumpleaños de pacientes por Telegram (lo manda el cron de las
// 7:00 a. m., ver /api/telegram/resumen-diario). Cada paciente trae un boton
// que abre WhatsApp con el saludo ya escrito; el mensaje no depende de la
// hora, asi que el enlace puede ir fijo en el boton.

type PacienteCumple = {
  nombre: string;
  telefono: string | null;
  pais: string | null;
  fecha_nacimiento: string;
  estado: string;
};

/** ¿La fecha de nacimiento (YYYY-MM-DD) cae hoy? Los del 29 de febrero se felicitan el 28 en años no bisiestos. */
export function cumpleHoy(fechaNacimiento: string, hoy: string) {
  const [anio, mes, dia] = hoy.split("-").map(Number);
  const nac = fechaNacimiento.slice(5, 10);
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  if (nac === "02-29" && !bisiesto) return mes === 2 && dia === 28;
  return nac === hoy.slice(5, 10);
}

export async function avisoCumpleanosPacientes(
  admin: SupabaseClient,
): Promise<{ texto: string; botones: BotonInline[][] } | null> {
  const { data } = await admin
    .from("gestionesjj_pacientes")
    .select("nombre,telefono,pais,fecha_nacimiento,estado")
    .not("fecha_nacimiento", "is", null);

  const hoy = fechaLocal();
  const anioHoy = Number(hoy.slice(0, 4));
  const cumpleaneros = ((data ?? []) as PacienteCumple[])
    .filter((p) => cumpleHoy(p.fecha_nacimiento, hoy))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (cumpleaneros.length === 0) return null;

  const lineas = [`🎂 <b>Cumpleaños de hoy</b>`, ""];
  const botones: BotonInline[][] = [];
  for (const p of cumpleaneros) {
    const edad = anioHoy - Number(p.fecha_nacimiento.slice(0, 4));
    const detalles = [
      edad > 0 && edad < 130 ? `cumple ${edad} años` : null,
      p.estado === "activo" ? null : p.estado === "alta" ? "de alta" : "inactivo",
      p.telefono ? null : "sin teléfono registrado",
    ].filter(Boolean);
    lineas.push(`• ${esc(p.nombre)}${detalles.length ? ` (${detalles.join(", ")})` : ""}`);
    const primerNombre = p.nombre.trim().split(/\s+/)[0] ?? p.nombre;
    botones.push([
      { text: `🎉 Felicitar a ${primerNombre} por WhatsApp`, url: enlaceWhatsApp(p.telefono, mensajeCumpleanos(p.nombre), p.pais) },
    ]);
  }
  lineas.push("", "Toca el botón para abrir WhatsApp con el saludo ya escrito.");
  return { texto: lineas.join("\n"), botones };
}
