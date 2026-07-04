import type { AnioCarrera, CarreraRow, Trimestre } from "@/data/evaluacion";
import { getSupabaseClient } from "@/lib/supabase";

export type CursoAdminRow = {
  id: string;
  nombre: string;
  horario: string | null;
  edificio: string | null;
  anio: number;
  trimestre: Trimestre;
  anioCarrera: AnioCarrera;
  carreraId: string;
  docenteId: string | null;
  docenteNombre: string | null;
  activo: boolean;
};

type RawCursoAdmin = {
  id: string;
  nombre: string;
  horario: string | null;
  edificio: string | null;
  anio: number;
  trimestre: Trimestre;
  anio_carrera: AnioCarrera;
  carrera_id: string;
  docente_id: string | null;
  activo: boolean;
  gestionesjj_docentes: { nombre: string } | null;
};

export async function fetchCarreras() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CarreraRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_carreras").select("id,nombre").order("nombre");
  if (error) return { data: [] as CarreraRow[], error: error.message };
  return { data: (data ?? []) as CarreraRow[], error: null };
}

export async function createCarrera(nombre: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_carreras").insert({ nombre }).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function fetchCursosAdmin() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CursoAdminRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_cursos")
    .select("id,nombre,horario,edificio,anio,trimestre,anio_carrera,carrera_id,docente_id,activo,gestionesjj_docentes(nombre)")
    .order("nombre");

  if (error) return { data: [] as CursoAdminRow[], error: error.message };

  const rows: CursoAdminRow[] = ((data ?? []) as unknown as RawCursoAdmin[]).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    horario: row.horario,
    edificio: row.edificio,
    anio: row.anio,
    trimestre: row.trimestre,
    anioCarrera: row.anio_carrera,
    carreraId: row.carrera_id,
    docenteId: row.docente_id,
    docenteNombre: row.gestionesjj_docentes?.nombre ?? null,
    activo: row.activo,
  }));

  return { data: rows, error: null };
}

export type CursoAdminPayload = {
  nombre: string;
  horario: string | null;
  edificio: string | null;
  anio: number;
  trimestre: Trimestre;
  anio_carrera: AnioCarrera;
  carrera_id: string;
  docente_id: string | null;
  activo: boolean;
};

function formatCursoError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Ya existe un curso en ese horario para ese año de la carrera en el mismo periodo. Elige otro horario.";
  }
  return error.message;
}

export async function upsertCursoAdmin(id: string | null, payload: CursoAdminPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  if (id) {
    const { error } = await supabase.from("gestionesjj_cursos").update(payload).eq("id", id);
    return { error: error ? formatCursoError(error) : null };
  }

  const { error } = await supabase.from("gestionesjj_cursos").insert(payload);
  return { error: error ? formatCursoError(error) : null };
}

export async function deleteCursoAdmin(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };
  const { error } = await supabase.from("gestionesjj_cursos").delete().eq("id", id);
  return { error: error?.message ?? null };
}
