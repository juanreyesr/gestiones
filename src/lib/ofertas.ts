import { HORARIOS_FIJOS, type AnioCarrera, type Trimestre } from "@/data/evaluacion";
import type { CursoAdminRow } from "@/lib/cursos-admin";
import { getSupabaseClient } from "@/lib/supabase";

export type OfertaCurso = {
  id: string; // uuid local (crypto.randomUUID())
  anioCarrera: AnioCarrera; // 1-5
  nombre: string;
  docenteId: string | null;
  horario: string | null; // uno de HORARIOS_FIJOS o null
  edificio: string;
  nrc: string;
  noEstudiantes: string;
  /** Curso virtual: toma el ultimo horario del anio y no se intercambia. */
  virtual: boolean;
  /** Curso impartido por CAS (no es un docente): ultimo horario disponible o sin horario. */
  esCas: boolean;
};

export type OfertaRow = {
  id: string;
  carreraId: string;
  anio: number;
  trimestre: Trimestre;
  estado: "borrador" | "confirmada";
  cursos: OfertaCurso[];
};

type RawOferta = {
  id: string;
  carrera_id: string;
  anio: number;
  trimestre: Trimestre;
  estado: "borrador" | "confirmada";
  cursos: OfertaCurso[] | null;
};

export async function fetchOferta(carreraId: string, anio: number, trimestre: Trimestre) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as OfertaRow | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_ofertas")
    .select("id,carrera_id,anio,trimestre,estado,cursos")
    .eq("carrera_id", carreraId)
    .eq("anio", anio)
    .eq("trimestre", trimestre)
    .maybeSingle();

  if (error) return { data: null as OfertaRow | null, error: error.message };
  if (!data) return { data: null as OfertaRow | null, error: null };

  const row = data as RawOferta;
  const oferta: OfertaRow = {
    id: row.id,
    carreraId: row.carrera_id,
    anio: row.anio,
    trimestre: row.trimestre,
    estado: row.estado,
    // Borradores guardados antes de que existieran virtual/esCas
    cursos: (row.cursos ?? []).map((curso) => ({ ...curso, virtual: curso.virtual ?? false, esCas: curso.esCas ?? false })),
  };
  return { data: oferta, error: null };
}

export async function upsertOferta(payload: {
  carreraId: string;
  anio: number;
  trimestre: Trimestre;
  estado: "borrador" | "confirmada";
  cursos: OfertaCurso[];
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_ofertas")
    .upsert(
      {
        carrera_id: payload.carreraId,
        anio: payload.anio,
        trimestre: payload.trimestre,
        estado: payload.estado,
        cursos: payload.cursos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "carrera_id,anio,trimestre" },
    )
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

/**
 * Ejecuta la confirmacion de una oferta en 3 pasos secuenciales (supabase-js no
 * ofrece transacciones desde el cliente): desactiva los cursos actuales del
 * periodo, inserta los cursos de la oferta y marca la oferta como confirmada.
 * Si algun paso falla se aborta y se reporta el error sin continuar.
 */
export async function confirmarOferta(oferta: OfertaRow) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error: desactivarError } = await supabase
    .from("gestionesjj_cursos")
    .update({ activo: false })
    .eq("carrera_id", oferta.carreraId)
    .eq("anio", oferta.anio)
    .eq("trimestre", oferta.trimestre);
  if (desactivarError) return { error: desactivarError.message };

  const cursosValidos = oferta.cursos.filter((curso) => curso.nombre.trim());
  if (cursosValidos.length) {
    const payload = cursosValidos.map((curso) => ({
      nombre: curso.nombre.trim(),
      horario: curso.horario,
      edificio: curso.edificio || null,
      anio: oferta.anio,
      trimestre: oferta.trimestre,
      anio_carrera: curso.anioCarrera,
      carrera_id: oferta.carreraId,
      docente_id: curso.esCas ? null : curso.docenteId,
      virtual: curso.virtual,
      es_cas: curso.esCas,
      activo: true,
    }));
    const { error: insertError } = await supabase.from("gestionesjj_cursos").insert(payload);
    if (insertError) return { error: insertError.message };
  }

  const { error: confirmarError } = await supabase
    .from("gestionesjj_ofertas")
    .update({ estado: "confirmada", updated_at: new Date().toISOString() })
    .eq("id", oferta.id);
  if (confirmarError) return { error: confirmarError.message };

  return { error: null };
}

/**
 * El periodo siguiente al ultimo con cursos activos de la carrera: T1->T2->T3
 * y despues del T3 sigue el T1 del anio siguiente. Sin cursos activos,
 * propone el anio actual y trimestre 1.
 */
export function siguientePeriodo(cursosAdmin: CursoAdminRow[], carreraId: string): { anio: number; trimestre: Trimestre } {
  const activos = cursosAdmin.filter((curso) => curso.carreraId === carreraId && curso.activo);
  if (!activos.length) return { anio: new Date().getFullYear(), trimestre: 1 };

  let anio = activos[0].anio;
  let trimestre = activos[0].trimestre;
  for (const curso of activos) {
    if (curso.anio > anio || (curso.anio === anio && curso.trimestre > trimestre)) {
      anio = curso.anio;
      trimestre = curso.trimestre;
    }
  }
  return trimestre === 3 ? { anio: anio + 1, trimestre: 1 } : { anio, trimestre: (trimestre + 1) as Trimestre };
}

/**
 * Ultimo salon asignado a cada anio de carrera (el edificio del periodo mas
 * reciente que tenga salon), para proponerlo automaticamente en la oferta.
 */
export function salonesPorAnioCarrera(cursosAdmin: CursoAdminRow[], carreraId: string): Map<AnioCarrera, string> {
  const recientes = new Map<AnioCarrera, { anio: number; trimestre: number; edificio: string }>();
  for (const curso of cursosAdmin) {
    if (curso.carreraId !== carreraId || !curso.edificio) continue;
    const previo = recientes.get(curso.anioCarrera);
    if (!previo || curso.anio > previo.anio || (curso.anio === previo.anio && curso.trimestre > previo.trimestre)) {
      recientes.set(curso.anioCarrera, { anio: curso.anio, trimestre: curso.trimestre, edificio: curso.edificio });
    }
  }
  return new Map(Array.from(recientes.entries()).map(([anioCarrera, valor]) => [anioCarrera, valor.edificio]));
}

/**
 * Completa el salon de los cursos que no tengan uno con el ultimo salon
 * asignado a su anio de carrera.
 */
export function completarSalones(
  cursos: OfertaCurso[],
  cursosAdmin: CursoAdminRow[],
  carreraId: string,
): OfertaCurso[] {
  const salones = salonesPorAnioCarrera(cursosAdmin, carreraId);
  return cursos.map((curso) =>
    curso.edificio ? curso : { ...curso, edificio: salones.get(curso.anioCarrera) ?? "" },
  );
}

/**
 * Propone los cursos de una oferta a partir del anio mas reciente con cursos
 * registrados para esa carrera y trimestre. Prefiere anios anteriores al
 * anio objetivo, pero si el unico historial es el mismo anio destino (por
 * ejemplo, los cursos del trimestre ya cargados este anio) usa ese. Solo
 * considera cursos activos, salvo que no exista ninguno activo. Los cursos
 * sin salon toman el ultimo salon asignado a su anio de carrera.
 */
export function proponerCursos(
  cursosAdmin: CursoAdminRow[],
  carreraId: string,
  trimestre: Trimestre,
  anioObjetivo: number,
): { anioFuente: number | null; cursos: OfertaCurso[] } {
  const delTrimestre = cursosAdmin.filter(
    (curso) => curso.carreraId === carreraId && curso.trimestre === trimestre,
  );
  const activos = delTrimestre.filter((curso) => curso.activo);
  const universo = activos.length ? activos : delTrimestre;

  const anteriores = universo.filter((curso) => curso.anio < anioObjetivo);
  const candidatos = anteriores.length ? anteriores : universo;
  if (!candidatos.length) return { anioFuente: null, cursos: [] };

  const anioFuente = Math.max(...candidatos.map((curso) => curso.anio));
  const cursos = candidatos
    .filter((curso) => curso.anio === anioFuente)
    .map((curso) => ({
      id: crypto.randomUUID(),
      anioCarrera: curso.anioCarrera,
      nombre: curso.nombre,
      docenteId: curso.esCas ? null : curso.docenteId,
      horario: curso.horario,
      edificio: curso.edificio ?? "",
      nrc: "",
      noEstudiantes: "",
      virtual: curso.virtual,
      esCas: curso.esCas,
    }));

  return { anioFuente, cursos: completarSalones(cursos, cursosAdmin, carreraId) };
}

/**
 * Reordena los horarios de un anio de carrera: los cursos presenciales toman
 * los primeros bloques en su orden actual, despues los cursos CAS y de
 * ultimo los virtuales, sin dejar horarios muertos entre medio. Los cursos
 * CAS sin horario no consumen bloque. Devuelve la lista completa de cursos
 * con los horarios del anio recalculados.
 */
export function reordenarHorariosAnio(cursos: OfertaCurso[], anioCarrera: AnioCarrera): OfertaCurso[] {
  const delAnio = cursos.filter((curso) => curso.anioCarrera === anioCarrera);
  const indice = (curso: OfertaCurso) => {
    const idx = curso.horario ? HORARIOS_FIJOS.indexOf(curso.horario) : -1;
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const normales = [...delAnio.filter((curso) => !curso.virtual && !curso.esCas)].sort((a, b) => indice(a) - indice(b));
  const cas = delAnio.filter((curso) => curso.esCas && !curso.virtual);
  const virtuales = delAnio.filter((curso) => curso.virtual);

  const asignaciones = new Map<string, string | null>();
  let slot = 0;
  const tomarSiguiente = () => {
    const horario = HORARIOS_FIJOS[slot] ?? null;
    if (slot < HORARIOS_FIJOS.length) slot += 1;
    return horario;
  };

  for (const curso of normales) {
    asignaciones.set(curso.id, tomarSiguiente());
  }
  for (const curso of cas) {
    // Un curso CAS puede quedarse deliberadamente sin horario.
    asignaciones.set(curso.id, curso.horario === null ? null : tomarSiguiente());
  }
  for (const curso of virtuales) {
    asignaciones.set(curso.id, tomarSiguiente());
  }

  return cursos.map((curso) =>
    asignaciones.has(curso.id) ? { ...curso, horario: asignaciones.get(curso.id) ?? null } : curso,
  );
}
