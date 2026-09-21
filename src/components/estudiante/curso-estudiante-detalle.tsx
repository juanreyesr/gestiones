"use client";

import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  CursoContenidoLista,
  type ArchivoPropioVista,
  type ContenidoEstudianteVista,
  type TareaEstudianteVista,
} from "@/components/estudiante/curso-contenido-lista";
import {
  fetchMisActividades,
  fetchMisArchivosEntrega,
  fetchMisContenidos,
  fetchMisSemanas,
  obtenerUrlArchivoPropio,
  obtenerUrlContenido,
  subirEntrega,
  type MiCurso,
  type MiSemana,
} from "@/lib/estudiante/estudiante-client";

export function CursoEstudianteDetalle({ curso, onVolver }: { curso: MiCurso; onVolver: () => void }) {
  const [semanas, setSemanas] = useState<MiSemana[]>([]);
  const [contenidosPorSemana, setContenidosPorSemana] = useState<Record<string, ContenidoEstudianteVista[]>>({});
  const [tareasPorSemana, setTareasPorSemana] = useState<Record<string, TareaEstudianteVista[]>>({});
  const [archivosPorTarea, setArchivosPorTarea] = useState<Record<string, ArchivoPropioVista[]>>({});
  const [cargando, setCargando] = useState(true);
  const [cargandoSemanaId, setCargandoSemanaId] = useState<string | null>(null);
  const [subiendoTareaId, setSubiendoTareaId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de semanas al abrir el curso
    setCargando(true);
    fetchMisSemanas(curso.cursoId).then(({ data, error: fetchError }) => {
      if (cancelado) return;
      setSemanas(data);
      setError(fetchError ?? "");
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [curso.cursoId]);

  const handleExpandirSemana = useCallback(async (semanaId: string) => {
    setCargandoSemanaId(semanaId);
    const [{ data: contenidos, error: contenidosError }, { data: tareasData, error: tareasError }] = await Promise.all([
      fetchMisContenidos(semanaId),
      fetchMisActividades(semanaId),
    ]);
    setCargandoSemanaId(null);
    if (contenidosError || tareasError) {
      setError(contenidosError ?? tareasError ?? "No se pudo cargar la semana.");
      return;
    }
    setContenidosPorSemana((prev) => ({ ...prev, [semanaId]: contenidos }));
    setTareasPorSemana((prev) => ({ ...prev, [semanaId]: tareasData }));
  }, []);

  const handleAbrirArchivo = useCallback(async (contenido: ContenidoEstudianteVista) => {
    const { url, error: fetchError } = await obtenerUrlContenido(contenido.id);
    if (fetchError || !url) {
      setError(fetchError ?? "No se pudo abrir el archivo.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleSubirArchivo = useCallback(async (tarea: TareaEstudianteVista, archivo: File) => {
    setSubiendoTareaId(tarea.id);
    const { error: subirError } = await subirEntrega(tarea.id, archivo);
    setSubiendoTareaId(null);
    if (subirError) {
      setError(subirError);
      return;
    }
    setError("");
    // Recarga las tareas de todas las semanas cargadas para reflejar la entrega nueva.
    const semanaId = Object.keys(tareasPorSemana).find((id) => tareasPorSemana[id]?.some((t) => t.id === tarea.id));
    if (semanaId) {
      const { data: tareasData } = await fetchMisActividades(semanaId);
      setTareasPorSemana((prev) => ({ ...prev, [semanaId]: tareasData }));
    }
    setArchivosPorTarea((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== tarea.id)));
  }, [tareasPorSemana]);

  const handleVerMisArchivos = useCallback(async (tareaId: string) => {
    const { data, error: fetchError } = await fetchMisArchivosEntrega(tareaId);
    if (fetchError) {
      setError(fetchError);
      return;
    }
    setArchivosPorTarea((prev) => ({ ...prev, [tareaId]: data }));
  }, []);

  const handleDescargarArchivoPropio = useCallback(async (archivo: ArchivoPropioVista) => {
    const { url, error: fetchError } = await obtenerUrlArchivoPropio(archivo.id);
    if (fetchError || !url) {
      setError(fetchError ?? "No se pudo abrir el archivo.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div>
      <button className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800" onClick={onVolver} type="button">
        <ChevronLeft className="h-4 w-4" />
        Volver a mis cursos
      </button>

      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{curso.universidadNombre}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{curso.cursoNombre}</h1>
      <p className="mt-1 text-sm text-slate-500">{[curso.cursoCodigo, curso.periodo].filter(Boolean).join(" · ") || "Sin datos adicionales"}</p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8">
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : (
          <CursoContenidoLista
            cargandoSemanaId={cargandoSemanaId}
            contenidosPorSemana={contenidosPorSemana}
            onAbrirArchivo={handleAbrirArchivo}
            onExpandirSemana={handleExpandirSemana}
            semanas={semanas}
            tareas={{
              porSemana: tareasPorSemana,
              subiendoTareaId,
              onSubirArchivo: handleSubirArchivo,
              archivosPorTarea,
              onVerMisArchivos: handleVerMisArchivos,
              onDescargarArchivoPropio: handleDescargarArchivoPropio,
            }}
          />
        )}
      </div>
    </div>
  );
}
