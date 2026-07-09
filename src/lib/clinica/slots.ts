import type { HorarioSemanal } from "./types";

export const DIAS_SEMANA: { dow: number; nombre: string; corto: string }[] = [
  { dow: 1, nombre: "Lunes", corto: "Lun" },
  { dow: 2, nombre: "Martes", corto: "Mar" },
  { dow: 3, nombre: "Miércoles", corto: "Mié" },
  { dow: 4, nombre: "Jueves", corto: "Jue" },
  { dow: 5, nombre: "Viernes", corto: "Vie" },
  { dow: 6, nombre: "Sábado", corto: "Sáb" },
  { dow: 0, nombre: "Domingo", corto: "Dom" },
];

export function formatoFechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
}

export function formatoFechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatoHora(iso: string) {
  return new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export function formatoFechaHora(iso: string) {
  return `${formatoFechaCorta(iso)} · ${formatoHora(iso)}`;
}

/** Fecha local YYYY-MM-DD (para inputs type=date y claves de agrupacion). */
export function claveDiaLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function inicioDeSemana(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day; // semana inicia lunes
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function agregarDias(date: Date, dias: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + dias);
  return copy;
}

export type SlotPublico = { inicio: string; fin: string };

export function agruparSlotsPorDia(slots: SlotPublico[]) {
  const grupos = new Map<string, SlotPublico[]>();
  for (const slot of slots) {
    const clave = claveDiaLocal(new Date(slot.inicio));
    const lista = grupos.get(clave) ?? [];
    lista.push(slot);
    grupos.set(clave, lista);
  }
  return grupos;
}

export function seTraslapan(aInicio: string, aFin: string, bInicio: string, bFin: string) {
  return new Date(aInicio) < new Date(bFin) && new Date(bInicio) < new Date(aFin);
}

/**
 * Vista previa de slots generados localmente a partir del horario semanal.
 * Refleja la misma logica que la RPC gestionesjj_public_slots pero sin
 * restar citas (es solo una previsualizacion en la configuracion).
 */
export function previewSlotsSemana(horario: HorarioSemanal, duracionMin: number, bufferMin: number) {
  const resultado: { dow: number; horas: string[] }[] = [];
  for (const dia of DIAS_SEMANA) {
    const rangos = horario[String(dia.dow)] ?? [];
    const horas: string[] = [];
    for (const rango of rangos) {
      const [hInicio, mInicio] = rango.inicio.split(":").map(Number);
      const [hFin, mFin] = rango.fin.split(":").map(Number);
      let minutos = hInicio * 60 + mInicio;
      const finMinutos = hFin * 60 + mFin;
      while (minutos + duracionMin <= finMinutos) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        horas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        minutos += duracionMin + bufferMin;
      }
    }
    resultado.push({ dow: dia.dow, horas });
  }
  return resultado;
}
