import { urlFirmada } from "@/lib/cursos/archivos";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * "Ver como estudiante" (admin): la pantalla completa del Aula virtual con los
 * datos de UN curso, leidos con la sesion del owner (RLS de owner) en vez de
 * con las RPCs del estudiante. Las funciones de estudiante-client consultan
 * este modulo primero: si la vista previa esta activa devuelven estos datos;
 * las acciones que escriben (enviar mensaje, entregar, guardar perfil) no
 * hacen nada y avisan que es una vista previa.
 *
 * Mismo filtro que las RPCs del estudiante: semanas habilitadas y contenidos
 * o tareas que no esten ocultos.
 */

export const AVISO_VISTA_PREVIA = "Vista previa: esta acción solo la puede hacer el estudiante.";

let cursoVistaPrevia: string | null = null;
// Ruta del archivo de cada contenido, para abrirlo desde la vista previa.
const archivos = new Map<string, string>();

export function activarVistaPrevia(cursoId: string) {
  cursoVistaPrevia = cursoId;
}

export const vistaPreviaActiva = () => cursoVistaPrevia !== null;

export async function vpCursos() {
  const supabase = getSupabaseClient();
  if (!supabase || !cursoVistaPrevia) return [];
  const { data } = await supabase
    .from("gestionesjj_cursos_impartidos")
    .select("id,nombre,codigo,periodo,estado,docente_nombre,gestionesjj_universidades(nombre)")
    .eq("id", cursoVistaPrevia)
    .maybeSingle();
  const c = data as unknown as {
    id: string;
    nombre: string;
    codigo: string | null;
    periodo: string | null;
    estado: string;
    docente_nombre: string | null;
    gestionesjj_universidades: { nombre: string } | null;
  } | null;
  if (!c) return [];
  return [
    {
      cursoId: c.id,
      cursoNombre: c.nombre,
      cursoCodigo: c.codigo,
      periodo: c.periodo,
      estado: c.estado,
      universidadNombre: c.gestionesjj_universidades?.nombre ?? "",
      docenteNombre: c.docente_nombre,
    },
  ];
}

export async function vpSemanas(cursoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("gestionesjj_curso_semanas")
    .select("id,numero,titulo,fecha")
    .eq("curso_id", cursoId)
    .eq("habilitado_estudiantes", true)
    .order("numero");
  return (data ?? []) as { id: string; numero: number; titulo: string | null; fecha: string | null }[];
}

export async function vpContenidos(semanaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("gestionesjj_curso_contenidos")
    .select("id,categoria,titulo,descripcion,descripcion_en,descripcion_pt,archivo_path,url_externa")
    .eq("semana_id", semanaId)
    .neq("visible_estudiantes", "oculto")
    .order("orden")
    .order("created_at");
  type Fila = {
    id: string;
    categoria: "contenido" | "material_extra";
    titulo: string;
    descripcion: string | null;
    descripcion_en: string | null;
    descripcion_pt: string | null;
    archivo_path: string | null;
    url_externa: string | null;
  };
  return ((data ?? []) as Fila[]).map((f) => {
    if (f.archivo_path) archivos.set(f.id, f.archivo_path);
    return {
      id: f.id,
      categoria: f.categoria,
      titulo: f.titulo,
      descripcion: f.descripcion,
      descripcionEn: f.descripcion_en,
      descripcionPt: f.descripcion_pt,
      tieneArchivo: Boolean(f.archivo_path),
      urlExterna: f.url_externa,
    };
  });
}

export async function vpUrlContenido(contenidoId: string) {
  const path = archivos.get(contenidoId);
  if (!path) return { url: null, error: "No se encontró el archivo." };
  return urlFirmada(path);
}

export async function vpActividades(semanaId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("gestionesjj_curso_actividades")
    .select("id,tipo,titulo,descripcion,descripcion_en,descripcion_pt,punteo,entrega_habilitada,fecha_limite")
    .eq("semana_id", semanaId)
    .neq("visible_estudiantes", "oculto")
    .order("created_at");
  type Fila = {
    id: string;
    tipo: string;
    titulo: string;
    descripcion: string | null;
    descripcion_en: string | null;
    descripcion_pt: string | null;
    punteo: number | null;
    entrega_habilitada: boolean;
    fecha_limite: string | null;
  };
  return ((data ?? []) as Fila[]).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    titulo: f.titulo,
    descripcion: f.descripcion,
    descripcionEn: f.descripcion_en,
    descripcionPt: f.descripcion_pt,
    punteo: f.punteo,
    entregaHabilitada: f.entrega_habilitada,
    fechaLimite: f.fecha_limite,
    miEntregaId: null,
    miEntregadoEn: null,
    miTardia: false,
    miNota: null,
    miComentarioCalificacion: null,
  }));
}
