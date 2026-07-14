import { getSupabaseClient } from "@/lib/supabase";
import { borrarArchivos, copiarArchivo, rutaArchivoCurso } from "./archivos";
import type { CursoConUniversidadRow, CursoImpartidoRow, EstadoCurso } from "./types";

export async function fetchCursosPorUniversidad(universidadId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CursoImpartidoRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_cursos_impartidos")
    .select("*")
    .eq("universidad_id", universidadId)
    .order("created_at", { ascending: false });

  if (error) return { data: [] as CursoImpartidoRow[], error: error.message };
  return { data: (data ?? []) as CursoImpartidoRow[], error: null };
}

export async function fetchConteoCursosPorUniversidad() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: {} as Record<string, number>, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_cursos_impartidos").select("universidad_id");
  if (error) return { data: {} as Record<string, number>, error: error.message };

  const conteo: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ universidad_id: string }>) {
    conteo[row.universidad_id] = (conteo[row.universidad_id] ?? 0) + 1;
  }
  return { data: conteo, error: null };
}

export async function fetchTodosLosCursos() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [] as CursoConUniversidadRow[], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase
    .from("gestionesjj_cursos_impartidos")
    .select("*, gestionesjj_universidades(nombre)")
    .order("created_at", { ascending: false });

  if (error) return { data: [] as CursoConUniversidadRow[], error: error.message };
  return { data: (data ?? []) as unknown as CursoConUniversidadRow[], error: null };
}

export async function insertCurso(payload: {
  universidad_id: string;
  nombre: string;
  codigo?: string | null;
  descripcion?: string | null;
  periodo?: string | null;
  horario?: string | null;
  estado?: EstadoCurso;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.from("gestionesjj_cursos_impartidos").insert(payload).select("id").single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function updateCurso(
  id: string,
  payload: {
    nombre?: string;
    codigo?: string | null;
    descripcion?: string | null;
    periodo?: string | null;
    horario?: string | null;
    estado?: EstadoCurso;
  },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_cursos_impartidos")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteCurso(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.from("gestionesjj_cursos_impartidos").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/**
 * Crea un curso nuevo a partir de uno existente, clonando sus planificaciones,
 * semanas y (por cada semana) sus contenidos y actividades. No clona
 * estudiantes, asistencias ni calificaciones: el curso nuevo empieza limpio
 * en esos aspectos. Los archivos se copian en storage bajo la ruta del curso
 * destino; si la copia de un archivo falla se conserva la ruta original como
 * respaldo. Si cualquier otro paso falla, se elimina el curso parcialmente
 * creado (y los archivos ya copiados) para no dejar registros huerfanos.
 */
export async function clonarCurso(
  origenId: string,
  destino: {
    universidad_id: string;
    nombre: string;
    codigo?: string | null;
    periodo?: string | null;
    horario?: string | null;
    descripcion?: string | null;
  },
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: null as string | null, error: "Faltan las variables de Supabase." };

  const { data: cursoNuevo, error: errorCurso } = await supabase
    .from("gestionesjj_cursos_impartidos")
    .insert({
      universidad_id: destino.universidad_id,
      nombre: destino.nombre,
      codigo: destino.codigo ?? null,
      periodo: destino.periodo ?? null,
      horario: destino.horario ?? null,
      descripcion: destino.descripcion ?? null,
      origen_curso_id: origenId,
    })
    .select("id")
    .single();

  if (errorCurso || !cursoNuevo?.id) return { id: null as string | null, error: errorCurso?.message ?? "No se pudo crear el curso." };
  const nuevoCursoId = cursoNuevo.id as string;
  const archivosCopiados: string[] = [];

  try {
    const { data: planificaciones, error: errorPlanificaciones } = await supabase
      .from("gestionesjj_curso_planificaciones")
      .select("*")
      .eq("curso_id", origenId);
    if (errorPlanificaciones) throw new Error(errorPlanificaciones.message);

    for (const planificacion of planificaciones ?? []) {
      let archivoPath: string | null = planificacion.archivo_path;
      if (planificacion.archivo_path) {
        const nuevaRuta = rutaArchivoCurso(nuevoCursoId, "planificaciones", planificacion.archivo_nombre ?? "archivo");
        const { error: errorCopia } = await copiarArchivo(planificacion.archivo_path, nuevaRuta);
        archivoPath = errorCopia ? planificacion.archivo_path : nuevaRuta;
        if (!errorCopia) archivosCopiados.push(nuevaRuta);
      }
      const { error: errorInsert } = await supabase.from("gestionesjj_curso_planificaciones").insert({
        curso_id: nuevoCursoId,
        tipo: planificacion.tipo,
        titulo: planificacion.titulo,
        descripcion: planificacion.descripcion,
        archivo_path: archivoPath,
        archivo_nombre: planificacion.archivo_nombre,
        archivo_mime: planificacion.archivo_mime,
        url_externa: planificacion.url_externa,
      });
      if (errorInsert) throw new Error(errorInsert.message);
    }

    const { data: semanas, error: errorSemanas } = await supabase
      .from("gestionesjj_curso_semanas")
      .select("*")
      .eq("curso_id", origenId)
      .order("numero", { ascending: true });
    if (errorSemanas) throw new Error(errorSemanas.message);

    for (const semana of semanas ?? []) {
      const { data: semanaNueva, error: errorSemanaNueva } = await supabase
        .from("gestionesjj_curso_semanas")
        .insert({
          curso_id: nuevoCursoId,
          numero: semana.numero,
          titulo: semana.titulo,
          fecha: semana.fecha,
          tipo_sesion: semana.tipo_sesion,
          notas: semana.notas,
        })
        .select("id")
        .single();
      if (errorSemanaNueva || !semanaNueva?.id) {
        throw new Error(errorSemanaNueva?.message ?? `No se pudo crear la semana ${semana.numero}.`);
      }
      const nuevaSemanaId = semanaNueva.id as string;

      const { data: contenidos, error: errorContenidos } = await supabase
        .from("gestionesjj_curso_contenidos")
        .select("*")
        .eq("semana_id", semana.id);
      if (errorContenidos) throw new Error(errorContenidos.message);

      for (const contenido of contenidos ?? []) {
        let archivoPath: string | null = contenido.archivo_path;
        if (contenido.archivo_path) {
          const nuevaRuta = rutaArchivoCurso(nuevoCursoId, "contenidos", contenido.archivo_nombre ?? "archivo");
          const { error: errorCopia } = await copiarArchivo(contenido.archivo_path, nuevaRuta);
          archivoPath = errorCopia ? contenido.archivo_path : nuevaRuta;
          if (!errorCopia) archivosCopiados.push(nuevaRuta);
        }
        const { error: errorInsert } = await supabase.from("gestionesjj_curso_contenidos").insert({
          semana_id: nuevaSemanaId,
          categoria: contenido.categoria,
          titulo: contenido.titulo,
          descripcion: contenido.descripcion,
          archivo_path: archivoPath,
          archivo_nombre: contenido.archivo_nombre,
          archivo_mime: contenido.archivo_mime,
          url_externa: contenido.url_externa,
          orden: contenido.orden,
        });
        if (errorInsert) throw new Error(errorInsert.message);
      }

      const { data: actividades, error: errorActividades } = await supabase
        .from("gestionesjj_curso_actividades")
        .select("*")
        .eq("semana_id", semana.id);
      if (errorActividades) throw new Error(errorActividades.message);

      for (const actividad of actividades ?? []) {
        const { error: errorInsert } = await supabase.from("gestionesjj_curso_actividades").insert({
          semana_id: nuevaSemanaId,
          tipo: actividad.tipo,
          titulo: actividad.titulo,
          descripcion: actividad.descripcion,
          punteo: actividad.punteo,
          entrega_proxima_semana: actividad.entrega_proxima_semana,
        });
        if (errorInsert) throw new Error(errorInsert.message);
      }
    }
  } catch (err) {
    // Revierte el clon parcial: el delete en cascada limpia las filas hijas y
    // se borran los archivos ya copiados al curso nuevo.
    await supabase.from("gestionesjj_cursos_impartidos").delete().eq("id", nuevoCursoId);
    if (archivosCopiados.length) await borrarArchivos(archivosCopiados);
    const mensaje = err instanceof Error ? err.message : "Error durante la clonacion del curso.";
    return { id: null as string | null, error: mensaje };
  }

  return { id: nuevoCursoId, error: null };
}
