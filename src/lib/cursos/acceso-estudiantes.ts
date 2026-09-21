import { getSupabaseClient } from "@/lib/supabase";

async function getAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function postOwner<T>(path: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  const token = await getAccessToken();
  if (!token) return { data: null, error: "Sesión no válida. Vuelve a iniciar." };

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok) {
      return { data: null, error: json?.error ?? "No se pudo completar la operación." };
    }
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "Error de conexión." };
  }
}

export type DarAccesoResultado = { estudianteId: string; correo: string; contrasena: string | null; reutilizado: boolean };

/** Crea/enlaza la cuenta de estudiante para una inscripción de curso. */
export function darAccesoEstudiante(payload: { cursoEstudianteId: string; nombre: string; correo: string; contrasena?: string }) {
  return postOwner<DarAccesoResultado>("/api/estudiantes/crear", payload);
}

export type RegenerarResultado = { correo: string; contrasena: string };

export function regenerarContrasenaEstudiante(estudianteId: string) {
  return postOwner<RegenerarResultado>("/api/estudiantes/regenerar", { estudianteId });
}

export type FichaEstudiante = { nombre: string; correo: string; contrasena: string };

export function obtenerFichaEstudiante(estudianteId: string) {
  return postOwner<FichaEstudiante>("/api/estudiantes/ficha", { estudianteId });
}

export type FichaCursoResultado = {
  fichas: Array<{ nombre: string; correo: string; contrasena: string; debeCambiarContrasena: boolean }>;
  sinAcceso: string[];
};

export function obtenerFichasCurso(cursoId: string) {
  return postOwner<FichaCursoResultado>("/api/estudiantes/fichas-curso", { cursoId });
}

/** Aprueba una solicitud de autoasignacion: crea la cuenta e inscribe al estudiante con el carné dado. */
export function aprobarSolicitud(solicitudId: string, carne: string) {
  return postOwner<{ ok: true }>("/api/estudiantes/aprobar-solicitud", { solicitudId, carne });
}

/** Activa o desactiva por completo la cuenta de acceso del estudiante (todas sus inscripciones). */
export async function setActivoEstudiante(estudianteId: string, activo: boolean) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Faltan las variables de Supabase." };

  const { error } = await supabase
    .from("gestionesjj_estudiantes")
    .update({ activo, updated_at: new Date().toISOString() })
    .eq("id", estudianteId);
  return { error: error?.message ?? null };
}
