/**
 * Seguimiento de metas terapéuticas (migración 071: gestionesjj_metas y
 * gestionesjj_meta_avances). Cada meta tiene indicador, plazo y estado; el avance
 * se puntúa de 0 a 10 por sesión (una puntuación por meta y sesión) o por fecha.
 */
import { getSupabaseClient } from "@/lib/supabase";

export type MetaEstado = "activa" | "lograda" | "pausada" | "descartada";
export type MetaOrigen = "manual" | "ia" | "ficha";

export type MetaAvance = {
  id: string;
  metaId: string;
  sesionId: string | null;
  puntuacion: number;
  nota: string | null;
  fecha: string;
};

export type MetaRow = {
  id: string;
  pacienteId: string;
  meta: string;
  indicador: string | null;
  plazo: string | null;
  estado: MetaEstado;
  origen: MetaOrigen;
  orden: number;
  estadoAt: string | null;
  createdAt: string;
  /** Ordenados del más antiguo al más reciente. */
  avances: MetaAvance[];
};

export const META_ESTADOS: { value: MetaEstado; label: string }[] = [
  { value: "activa", label: "Activa" },
  { value: "lograda", label: "Lograda" },
  { value: "pausada", label: "Pausada" },
  { value: "descartada", label: "Descartada" },
];

export const FALTA_MIGRACION_METAS =
  "Para guardar metas falta aplicar la migración 071 en Supabase (está en supabase/PENDIENTES.md). El resto del expediente funciona igual.";
const SIN_SUPABASE = "Faltan las variables de Supabase.";
const faltaTabla = (e: { code?: string; message: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message));
const errorMetas = (e: { code?: string; message: string } | null) => (e ? (faltaTabla(e) ? FALTA_MIGRACION_METAS : e.message) : null);

type RawMeta = {
  id: string;
  paciente_id: string;
  meta: string;
  indicador: string | null;
  plazo: string | null;
  estado: MetaEstado;
  origen: MetaOrigen;
  orden: number;
  estado_at: string | null;
  created_at: string;
};
type RawAvance = { id: string; meta_id: string; sesion_id: string | null; puntuacion: number; nota: string | null; fecha: string; created_at: string };

const mapAvance = (r: RawAvance): MetaAvance => ({ id: r.id, metaId: r.meta_id, sesionId: r.sesion_id, puntuacion: r.puntuacion, nota: r.nota, fecha: r.fecha });

export async function fetchMetas(pacienteId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as MetaRow[], error: SIN_SUPABASE, faltaMigracion: false };
  const [m, a] = await Promise.all([
    supabase
      .from("gestionesjj_metas")
      .select("id,paciente_id,meta,indicador,plazo,estado,origen,orden,estado_at,created_at")
      .eq("paciente_id", pacienteId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("gestionesjj_meta_avances")
      .select("id,meta_id,sesion_id,puntuacion,nota,fecha,created_at")
      .eq("paciente_id", pacienteId)
      .order("fecha", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  const err = m.error ?? a.error;
  if (err) return { data: [] as MetaRow[], error: errorMetas(err), faltaMigracion: faltaTabla(err) };
  const porMeta = new Map<string, MetaAvance[]>();
  for (const r of (a.data ?? []) as RawAvance[]) porMeta.set(r.meta_id, [...(porMeta.get(r.meta_id) ?? []), mapAvance(r)]);
  const data = ((m.data ?? []) as RawMeta[]).map(
    (r): MetaRow => ({
      id: r.id,
      pacienteId: r.paciente_id,
      meta: r.meta,
      indicador: r.indicador,
      plazo: r.plazo,
      estado: r.estado,
      origen: r.origen,
      orden: r.orden,
      estadoAt: r.estado_at,
      createdAt: r.created_at,
      avances: porMeta.get(r.id) ?? [],
    })
  );
  return { data, error: null, faltaMigracion: false };
}

const limpio = (t: string | null | undefined, max: number) => {
  const v = (t ?? "").trim().slice(0, max);
  return v || null;
};

export async function crearMeta(pacienteId: string, input: { meta: string; indicador?: string | null; plazo?: string | null; origen?: MetaOrigen; orden?: number }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const meta = limpio(input.meta, 300);
  if (!meta) return { error: "Escribe la meta." };
  const { error } = await supabase.from("gestionesjj_metas").insert({
    paciente_id: pacienteId,
    meta,
    indicador: limpio(input.indicador, 300),
    plazo: limpio(input.plazo, 100),
    origen: input.origen ?? "manual",
    orden: input.orden ?? 0,
  });
  return { error: errorMetas(error) };
}

export async function actualizarMeta(id: string, cambios: { meta?: string; indicador?: string | null; plazo?: string | null; estado?: MetaEstado }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const fila: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (cambios.meta !== undefined) {
    const meta = limpio(cambios.meta, 300);
    if (!meta) return { error: "La meta no puede quedar vacía." };
    fila.meta = meta;
  }
  if (cambios.indicador !== undefined) fila.indicador = limpio(cambios.indicador, 300);
  if (cambios.plazo !== undefined) fila.plazo = limpio(cambios.plazo, 100);
  if (cambios.estado !== undefined) {
    fila.estado = cambios.estado;
    fila.estado_at = cambios.estado === "activa" ? null : new Date().toISOString();
  }
  const { error } = await supabase.from("gestionesjj_metas").update(fila).eq("id", id);
  return { error: errorMetas(error) };
}

export async function eliminarMeta(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_metas").delete().eq("id", id);
  return { error: errorMetas(error) };
}

/** Fecha local AAAA-MM-DD. */
export const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Registra el avance de una meta (0 a 10). Con sesión, hay una sola puntuación
 * por meta y sesión: si ya existe, se actualiza.
 */
export async function registrarAvance(input: { metaId: string; pacienteId: string; puntuacion: number; nota?: string | null; sesionId?: string | null; fecha?: string }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const puntuacion = Math.round(input.puntuacion);
  if (!Number.isFinite(puntuacion) || puntuacion < 0 || puntuacion > 10) return { error: "La puntuación va de 0 a 10." };
  const nota = limpio(input.nota, 500);
  if (input.sesionId) {
    const { data: previa, error: errPrevia } = await supabase
      .from("gestionesjj_meta_avances")
      .select("id")
      .eq("meta_id", input.metaId)
      .eq("sesion_id", input.sesionId)
      .maybeSingle();
    if (errPrevia) return { error: errorMetas(errPrevia) };
    if (previa) {
      const { error } = await supabase.from("gestionesjj_meta_avances").update({ puntuacion, nota }).eq("id", (previa as { id: string }).id);
      return { error: errorMetas(error) };
    }
  }
  const { error } = await supabase.from("gestionesjj_meta_avances").insert({
    meta_id: input.metaId,
    paciente_id: input.pacienteId,
    sesion_id: input.sesionId ?? null,
    puntuacion,
    nota,
    fecha: input.fecha ?? hoyLocal(),
  });
  return { error: errorMetas(error) };
}

export async function eliminarAvance(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: SIN_SUPABASE };
  const { error } = await supabase.from("gestionesjj_meta_avances").delete().eq("id", id);
  return { error: errorMetas(error) };
}

/** Última puntuación y cambio frente a la primera (para la tendencia). */
export function tendencia(m: MetaRow) {
  const n = m.avances.length;
  if (n === 0) return { ultima: null as number | null, cambio: null as number | null };
  const ultima = m.avances[n - 1].puntuacion;
  return { ultima, cambio: n > 1 ? ultima - m.avances[0].puntuacion : null };
}

/** Evento para refrescar los paneles de metas (expediente, cierre de sesión, plan con IA). */
export const EVENTO_METAS_CAMBIO = "gjj-metas-cambio";
export const avisarCambioMetas = () => window.dispatchEvent(new CustomEvent(EVENTO_METAS_CAMBIO));
