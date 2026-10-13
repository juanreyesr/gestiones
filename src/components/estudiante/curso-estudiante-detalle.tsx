"use client";

import { CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  CursoContenidoLista,
  type ArchivoPropioVista,
  type ContenidoEstudianteVista,
  type TareaEstudianteVista,
} from "@/components/estudiante/curso-contenido-lista";
import {
  fetchMiBloqueoPerfil,
  fetchMiEstadoCurso,
  fetchMisActividades,
  fetchMisArchivosEntrega,
  fetchMisContenidos,
  fetchMisSemanas,
  obtenerUrlArchivoPropio,
  obtenerUrlContenido,
  subirEntrega,
  type MiCurso,
  type MiEstadoCurso,
  type MiSemana,
} from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";
import { PerfilModal } from "./perfil-modal";

export function CursoEstudianteDetalle({ curso, onVolver }: { curso: MiCurso; onVolver: () => void }) {
  const [semanas, setSemanas] = useState<MiSemana[]>([]);
  const [contenidosPorSemana, setContenidosPorSemana] = useState<Record<string, ContenidoEstudianteVista[]>>({});
  const [tareasPorSemana, setTareasPorSemana] = useState<Record<string, TareaEstudianteVista[]>>({});
  const [archivosPorTarea, setArchivosPorTarea] = useState<Record<string, ArchivoPropioVista[]>>({});
  const [estadoCurso, setEstadoCurso] = useState<MiEstadoCurso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoSemanaId, setCargandoSemanaId] = useState<string | null>(null);
  const [subiendoTareaId, setSubiendoTareaId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [bloqueoDesdeSemana, setBloqueoDesdeSemana] = useState<number | null>(null);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const { idioma, t } = useIdioma();

  useEffect(() => {
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de semanas al abrir el curso
    setCargando(true);
    Promise.all([fetchMisSemanas(curso.cursoId), fetchMiEstadoCurso(curso.cursoId), fetchMiBloqueoPerfil(curso.cursoId)]).then(
      ([{ data, error: fetchError }, { data: estado }, { data: bloqueo }]) => {
        if (cancelado) return;
        setSemanas(data);
        setEstadoCurso(estado);
        setBloqueoDesdeSemana(bloqueo);
        setError(fetchError ?? "");
        setCargando(false);
      },
    );
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
      setError(contenidosError ?? tareasError ?? t("curso_error_semana"));
      return;
    }
    setContenidosPorSemana((prev) => ({ ...prev, [semanaId]: contenidos }));
    setTareasPorSemana((prev) => ({ ...prev, [semanaId]: tareasData }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() cambia de identidad cada render (nueva función), no debe reprogramar el callback
  }, []);

  const handleAbrirArchivo = useCallback(async (contenido: ContenidoEstudianteVista) => {
    const { url, error: fetchError } = await obtenerUrlContenido(contenido.id);
    if (fetchError || !url) {
      setError(fetchError ?? t("curso_error_archivo"));
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() cambia de identidad cada render (nueva función), no debe reprogramar el callback
  }, []);

  const handleSubirArchivo = useCallback(async (tarea: TareaEstudianteVista, archivo: File) => {
    setSubiendoTareaId(tarea.id);
    const { error: subirError } = await subirEntrega(tarea.id, archivo);
    setSubiendoTareaId(null);
    if (subirError) {
      setError(subirError);
      return false;
    }
    setError("");
    // Recarga las tareas de todas las semanas cargadas para reflejar la entrega nueva.
    const semanaId = Object.keys(tareasPorSemana).find((id) => tareasPorSemana[id]?.some((t) => t.id === tarea.id));
    if (semanaId) {
      const { data: tareasData } = await fetchMisActividades(semanaId);
      setTareasPorSemana((prev) => ({ ...prev, [semanaId]: tareasData }));
    }
    setArchivosPorTarea((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== tarea.id)));
    return true;
  }, [tareasPorSemana]);

  const handleVerMisArchivos = useCallback(async (tareaId: string) => {
    const { data, error: fetchError } = await fetchMisArchivosEntrega(tareaId);
    if (fetchError) {
      setError(fetchError);
      return;
    }
    setArchivosPorTarea((prev) => ({ ...prev, [tareaId]: data }));
  }, []);

  // Al guardar o cerrar "Mi perfil" se vuelve a revisar el bloqueo; si se
  // levantó, se recargan las tareas de las semanas ya abiertas.
  const revisarBloqueo = useCallback(async () => {
    const { data: bloqueo } = await fetchMiBloqueoPerfil(curso.cursoId);
    setBloqueoDesdeSemana(bloqueo);
    if (bloqueo !== null || bloqueoDesdeSemana === null) return;
    const semanasCargadas = Object.keys(tareasPorSemana);
    const recargadas = await Promise.all(semanasCargadas.map((semanaId) => fetchMisActividades(semanaId)));
    setTareasPorSemana((prev) => {
      const siguiente = { ...prev };
      semanasCargadas.forEach((semanaId, i) => {
        siguiente[semanaId] = recargadas[i].data;
      });
      return siguiente;
    });
  }, [bloqueoDesdeSemana, curso.cursoId, tareasPorSemana]);

  const handleDescargarArchivoPropio = useCallback(async (archivo: ArchivoPropioVista) => {
    const { url, error: fetchError } = await obtenerUrlArchivoPropio(archivo.id);
    if (fetchError || !url) {
      setError(fetchError ?? t("curso_error_archivo"));
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() cambia de identidad cada render (nueva función), no debe reprogramar el callback
  }, []);

  return (
    <div>
      <button className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800" onClick={onVolver} type="button">
        <ChevronLeft className="h-4 w-4" />
        {t("curso_volver")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{curso.universidadNombre}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{curso.cursoNombre}</h1>
          <p className="mt-1 text-sm text-slate-500">{[curso.cursoCodigo, curso.periodo].filter(Boolean).join(" · ") || t("panel_sin_datos")}</p>
          {curso.docenteNombre ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {t("panel_docente")}: {curso.docenteNombre}
            </p>
          ) : null}
        </div>
        {estadoCurso?.aprobado !== null && estadoCurso?.aprobado !== undefined ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
              estadoCurso.aprobado ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {estadoCurso.aprobado ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {estadoCurso.aprobado ? t("curso_aprobado") : t("curso_reprobado")}
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8">
        {cargando ? (
          <p className="text-sm text-slate-400">{t("central_cargando")}</p>
        ) : (
          <CursoContenidoLista
            cargandoSemanaId={cargandoSemanaId}
            contenidosPorSemana={contenidosPorSemana}
            idioma={idioma}
            onAbrirArchivo={handleAbrirArchivo}
            onExpandirSemana={handleExpandirSemana}
            semanas={semanas}
            tareas={{
              porSemana: tareasPorSemana,
              bloqueoPerfil:
                bloqueoDesdeSemana !== null ? { desdeSemana: bloqueoDesdeSemana, onCompletarPerfil: () => setPerfilAbierto(true) } : null,
              subiendoTareaId,
              onSubirArchivo: handleSubirArchivo,
              archivosPorTarea,
              onVerMisArchivos: handleVerMisArchivos,
              onDescargarArchivoPropio: handleDescargarArchivoPropio,
            }}
          />
        )}
      </div>

      {perfilAbierto ? (
        <PerfilModal
          onClose={() => {
            setPerfilAbierto(false);
            void revisarBloqueo();
          }}
          onGuardado={() => void revisarBloqueo()}
        />
      ) : null}
    </div>
  );
}
