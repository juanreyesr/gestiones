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
