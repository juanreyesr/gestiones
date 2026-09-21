import { getSupabaseClient } from "@/lib/supabase";

export async function loginEstudiante(correo: string, contrasena: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  return { error: error?.message ?? null };
}

export async function logoutEstudiante() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export type MiPerfil = { nombre: string; correo: string; debeCambiarContrasena: boolean };

export async function fetchMiPerfil(): Promise<{ data: MiPerfil | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_estudiante_mi_perfil");
  if (error) return { data: null, error: error.message };

  const fila = (Array.isArray(data) ? data[0] : data) as
    | { nombre: string; correo: string; debe_cambiar_contrasena: boolean }
    | null;
  if (!fila) return { data: null, error: null };

  return {
    data: { nombre: fila.nombre, correo: fila.correo, debeCambiarContrasena: Boolean(fila.debe_cambiar_contrasena) },
    error: null,
  };
}

export type MiCurso = {
  cursoId: string;
  cursoNombre: string;
  cursoCodigo: string | null;
  periodo: string | null;
  estado: string;
  universidadNombre: string;
};

export async function fetchMisCursos(): Promise<{ data: MiCurso[]; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_estudiante_mis_cursos");
  if (error) return { data: [], error: error.message };

  const filas = (data ?? []) as Array<{
    curso_id: string;
    curso_nombre: string;
    curso_codigo: string | null;
    periodo: string | null;
    estado: string;
    universidad_nombre: string;
  }>;

  return {
    data: filas.map((fila) => ({
      cursoId: fila.curso_id,
      cursoNombre: fila.curso_nombre,
      cursoCodigo: fila.curso_codigo,
      periodo: fila.periodo,
      estado: fila.estado,
      universidadNombre: fila.universidad_nombre,
    })),
    error: null,
  };
}

export type MiSemana = { id: string; numero: number; titulo: string | null; fecha: string | null };

export async function fetchMisSemanas(cursoId: string): Promise<{ data: MiSemana[]; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_estudiante_semanas_curso", { p_curso_id: cursoId });
  if (error) return { data: [], error: error.message };

  const filas = (data ?? []) as Array<{ id: string; numero: number; titulo: string | null; fecha: string | null }>;
  return { data: filas.map((fila) => ({ id: fila.id, numero: fila.numero, titulo: fila.titulo, fecha: fila.fecha })), error: null };
}

export type MiContenido = {
  id: string;
  categoria: "contenido" | "material_extra";
  titulo: string;
  descripcion: string | null;
  tieneArchivo: boolean;
  urlExterna: string | null;
};

export async function fetchMisContenidos(semanaId: string): Promise<{ data: MiContenido[]; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_estudiante_contenidos_semana", { p_semana_id: semanaId });
  if (error) return { data: [], error: error.message };

  const filas = (data ?? []) as Array<{
    id: string;
    categoria: "contenido" | "material_extra";
    titulo: string;
    descripcion: string | null;
    tiene_archivo: boolean;
    url_externa: string | null;
  }>;

  return {
    data: filas.map((fila) => ({
      id: fila.id,
      categoria: fila.categoria,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      tieneArchivo: Boolean(fila.tiene_archivo),
      urlExterna: fila.url_externa,
    })),
    error: null,
  };
}

export async function obtenerUrlContenido(contenidoId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null, error: "Faltan las variables de Supabase." };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { url: null, error: "Sesión no válida. Vuelve a iniciar." };

  try {
    const response = await fetch("/api/estudiante/contenido-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contenidoId }),
    });
    const json = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok) return { url: null, error: json?.error ?? "No se pudo abrir el archivo." };
    return { url: json?.url ?? null, error: null };
  } catch {
    return { url: null, error: "Error de conexión." };
  }
}

export type MiTarea = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  punteo: number | null;
  entregaHabilitada: boolean;
  fechaLimite: string | null;
  miEntregaId: string | null;
  miEntregadoEn: string | null;
  miTardia: boolean;
  miNota: number | null;
  miComentarioCalificacion: string | null;
};

export async function fetchMisActividades(semanaId: string): Promise<{ data: MiTarea[]; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_estudiante_actividades_semana", { p_semana_id: semanaId });
  if (error) return { data: [], error: error.message };

  const filas = (data ?? []) as Array<{
    id: string;
    tipo: string;
    titulo: string;
    descripcion: string | null;
    punteo: number | null;
    entrega_habilitada: boolean;
    fecha_limite: string | null;
    mi_entrega_id: string | null;
    mi_entregado_en: string | null;
    mi_tardia: boolean | null;
    mi_nota: number | null;
    mi_comentario_calificacion: string | null;
  }>;

  return {
    data: filas.map((fila) => ({
      id: fila.id,
      tipo: fila.tipo,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      punteo: fila.punteo,
      entregaHabilitada: fila.entrega_habilitada,
      fechaLimite: fila.fecha_limite,
      miEntregaId: fila.mi_entrega_id,
      miEntregadoEn: fila.mi_entregado_en,
      miTardia: Boolean(fila.mi_tardia),
      miNota: fila.mi_nota,
      miComentarioCalificacion: fila.mi_comentario_calificacion,
    })),
    error: null,
  };
}

export type MiArchivoEntrega = { id: string; nombre: string | null };

export async function fetchMisArchivosEntrega(actividadId: string): Promise<{ data: MiArchivoEntrega[]; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: "Faltan las variables de Supabase." };

  const { data, error } = await supabase.rpc("gestionesjj_estudiante_archivos_entrega", { p_actividad_id: actividadId });
  if (error) return { data: [], error: error.message };

  const filas = (data ?? []) as Array<{ id: string; archivo_nombre: string | null }>;
  return { data: filas.map((fila) => ({ id: fila.id, nombre: fila.archivo_nombre })), error: null };
}

async function getAuthToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function subirEntrega(actividadId: string, archivo: File): Promise<{ tardia: boolean | null; error: string | null }> {
  const token = await getAuthToken();
  if (!token) return { tardia: null, error: "Sesión no válida. Vuelve a iniciar." };

  const formData = new FormData();
  formData.append("actividadId", actividadId);
  formData.append("archivo", archivo);

  try {
    const response = await fetch("/api/estudiante/entrega/subir", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = (await response.json().catch(() => null)) as { tardia?: boolean; error?: string } | null;
    if (!response.ok) return { tardia: null, error: json?.error ?? "No se pudo subir el archivo." };
    return { tardia: json?.tardia ?? false, error: null };
  } catch {
    return { tardia: null, error: "Error de conexión." };
  }
}

export async function obtenerUrlArchivoPropio(archivoId: string): Promise<{ url: string | null; error: string | null }> {
  const token = await getAuthToken();
  if (!token) return { url: null, error: "Sesión no válida. Vuelve a iniciar." };

  try {
    const response = await fetch("/api/estudiante/entrega/archivo-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ archivoId }),
    });
    const json = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok) return { url: null, error: json?.error ?? "No se pudo abrir el archivo." };
    return { url: json?.url ?? null, error: null };
  } catch {
    return { url: null, error: "Error de conexión." };
  }
}

export async function cambiarMiContrasena(nuevaContrasena: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { error: "Sesión no válida. Vuelve a iniciar." };

  try {
    const response = await fetch("/api/estudiante/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nuevaContrasena }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return { error: json?.error ?? "No se pudo cambiar la contraseña." };
    return { error: null };
  } catch {
    return { error: "Error de conexión." };
  }
}
