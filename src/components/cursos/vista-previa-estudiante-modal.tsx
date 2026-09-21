"use client";

import { GraduationCap, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { CursoContenidoLista, type ContenidoEstudianteVista, type TareaEstudianteVista } from "@/components/estudiante/curso-contenido-lista";
import { fetchActividades } from "@/lib/cursos/actividades";
import { urlFirmada } from "@/lib/cursos/archivos";
import { fetchContenidos } from "@/lib/cursos/contenidos";
import { fetchSemanas } from "@/lib/cursos/semanas";
import type { ContenidoRow, SemanaRow } from "@/lib/cursos/types";

/**
 * Vista previa de lo que vería un estudiante genérico de este curso: mismas
 * semanas habilitadas, mismos contenidos visibles, leídos directo por el
 * owner (que ya puede ver todo) en vez de por las RPCs del estudiante.
 */
export function VistaPreviaEstudianteModal({
  cursoId,
  cursoNombre,
  onClose,
  universidadNombre,
}: {
  cursoId: string;
  cursoNombre: string;
  onClose: () => void;
  universidadNombre: string;
}) {
  const [semanas, setSemanas] = useState<SemanaRow[]>([]);
  const [contenidosPorSemana, setContenidosPorSemana] = useState<Record<string, ContenidoRow[]>>({});
  const [tareasPorSemana, setTareasPorSemana] = useState<Record<string, TareaEstudianteVista[]>>({});
  const [cargando, setCargando] = useState(true);
  const [cargandoSemanaId, setCargandoSemanaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de semanas al abrir la vista previa
    setCargando(true);
    fetchSemanas(cursoId).then(({ data }) => {
      if (cancelado) return;
      setSemanas(data.filter((semana) => semana.habilitado_estudiantes));
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [cursoId]);

  const handleExpandirSemana = useCallback(async (semanaId: string) => {
    setCargandoSemanaId(semanaId);
    const [{ data: contenidos }, { data: actividades }] = await Promise.all([fetchContenidos(semanaId), fetchActividades(semanaId)]);
    setCargandoSemanaId(null);
    setContenidosPorSemana((prev) => ({ ...prev, [semanaId]: contenidos.filter((c) => c.visible_estudiantes !== "oculto") }));
    setTareasPorSemana((prev) => ({
      ...prev,
      [semanaId]: actividades
        .filter((a) => a.visible_estudiantes !== "oculto")
        .map((a) => ({
          id: a.id,
          titulo: a.titulo,
          descripcion: a.descripcion,
          punteo: a.punteo,
          entregaHabilitada: a.entrega_habilitada,
          fechaLimite: a.fecha_limite,
          miEntregadoEn: null,
          miTardia: false,
          miNota: null,
          miComentarioCalificacion: null,
        })),
    }));
  }, []);

  const handleAbrirArchivo = useCallback(
    async (contenido: ContenidoEstudianteVista) => {
      const original = Object.values(contenidosPorSemana)
        .flat()
        .find((c) => c.id === contenido.id);
      if (!original?.archivo_path) return;
      const { url } = await urlFirmada(original.archivo_path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    },
    [contenidosPorSemana],
  );

  const semanasVista = semanas.map((semana) => ({ id: semana.id, numero: semana.numero, titulo: semana.titulo, fecha: semana.fecha }));
  const contenidosVista: Record<string, ContenidoEstudianteVista[]> = Object.fromEntries(
    Object.entries(contenidosPorSemana).map(([semanaId, contenidos]) => [
      semanaId,
      contenidos.map((c) => ({
        id: c.id,
        categoria: c.categoria,
        titulo: c.titulo,
        descripcion: c.descripcion,
        tieneArchivo: Boolean(c.archivo_path),
        urlExterna: c.url_externa,
      })),
    ]),
  );

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-white text-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Vista previa · así lo ve un estudiante
            </span>
            <button className="text-slate-300 hover:text-white" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{universidadNombre}</p>
                <h3 className="text-lg font-semibold text-slate-900">{cursoNombre}</h3>
              </div>
            </div>

            {cargando ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : (
              <CursoContenidoLista
                cargandoSemanaId={cargandoSemanaId}
                contenidosPorSemana={contenidosVista}
                onAbrirArchivo={handleAbrirArchivo}
                onExpandirSemana={handleExpandirSemana}
                semanas={semanasVista}
                tareas={{ porSemana: tareasPorSemana }}
              />
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
