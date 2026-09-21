"use client";

import { ChevronDown, ChevronRight, ClipboardList, Download, FileText, Link2, Upload } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { formatearFecha, formatearFechaHora, formatearFechaLimite } from "@/lib/cursos/types";

export type ContenidoEstudianteVista = {
  id: string;
  categoria: "contenido" | "material_extra";
  titulo: string;
  descripcion: string | null;
  tieneArchivo: boolean;
  urlExterna: string | null;
};

export type SemanaEstudianteVista = {
  id: string;
  numero: number;
  titulo: string | null;
  fecha: string | null;
};

export type TareaEstudianteVista = {
  id: string;
  titulo: string;
  descripcion: string | null;
  punteo: number | null;
  entregaHabilitada: boolean;
  fechaLimite: string | null;
  miEntregadoEn: string | null;
  miTardia: boolean;
  miNota: number | null;
  miComentarioCalificacion: string | null;
};

export type ArchivoPropioVista = { id: string; nombre: string | null };

type TareasConfig = {
  porSemana: Record<string, TareaEstudianteVista[] | undefined>;
  subiendoTareaId?: string | null;
  onSubirArchivo?: (tarea: TareaEstudianteVista, archivo: File) => void | Promise<void>;
  archivosPorTarea?: Record<string, ArchivoPropioVista[] | undefined>;
  onVerMisArchivos?: (tareaId: string) => void | Promise<void>;
  onDescargarArchivoPropio?: (archivo: ArchivoPropioVista) => void | Promise<void>;
};

/**
 * Lista de semanas/contenidos/tareas visibles para un estudiante, en
 * acordeón. Presentacional y compartida: la usa el panel real del
 * estudiante (datos vía RPC, con entrega de archivos habilitada) y la
 * vista previa "Ver como estudiante" del admin (datos leídos directo por
 * el owner, sin acciones de escritura: se omite `tareas.onSubirArchivo`).
 */
export function CursoContenidoLista({
  cargandoSemanaId,
  contenidosPorSemana,
  onAbrirArchivo,
  onExpandirSemana,
  semanas,
  tareas,
}: {
  cargandoSemanaId: string | null;
  contenidosPorSemana: Record<string, ContenidoEstudianteVista[] | undefined>;
  onAbrirArchivo: (contenido: ContenidoEstudianteVista) => void;
  onExpandirSemana: (semanaId: string) => void;
  semanas: SemanaEstudianteVista[];
  tareas?: TareasConfig;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  const toggle = (semanaId: string) => {
    const siguiente = abierta === semanaId ? null : semanaId;
    setAbierta(siguiente);
    if (siguiente && !contenidosPorSemana[semanaId]) onExpandirSemana(semanaId);
  };

  if (!semanas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Aún no hay semanas habilitadas para este curso.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {semanas.map((semana) => {
        const contenidos = contenidosPorSemana[semana.id];
        const tareasSemana = tareas?.porSemana[semana.id];
        const estaAbierta = abierta === semana.id;
        return (
          <div className="rounded-xl border border-slate-200 bg-white" key={semana.id}>
            <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => toggle(semana.id)} type="button">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Semana {semana.numero}
                  {semana.titulo ? ` — ${semana.titulo}` : ""}
                </p>
                <p className="text-xs text-slate-400">{formatearFecha(semana.fecha)}</p>
              </div>
              {estaAbierta ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {estaAbierta ? (
              <div className="grid gap-4 border-t border-slate-100 p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Contenidos</p>
                  {cargandoSemanaId === semana.id ? (
                    <p className="text-sm text-slate-400">Cargando...</p>
                  ) : !contenidos || contenidos.length === 0 ? (
                    <p className="text-sm text-slate-400">Aún no hay contenido publicado en esta semana.</p>
                  ) : (
                    <div className="grid gap-2">
                      {contenidos.map((contenido) => {
                        return (
                          <div
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            key={contenido.id}
                          >
                            <div className="flex items-center gap-2">
                              {contenido.urlExterna && !contenido.tieneArchivo ? (
                                <Link2 className="h-4 w-4 text-sky-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-emerald-600" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-800">{contenido.titulo}</p>
                                {contenido.descripcion ? <p className="text-xs text-slate-400">{contenido.descripcion}</p> : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {contenido.tieneArchivo ? (
                                <button
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                                  onClick={() => onAbrirArchivo(contenido)}
                                  type="button"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Ver / descargar
                                </button>
                              ) : contenido.urlExterna ? (
                                <button
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                                  onClick={() => window.open(contenido.urlExterna as string, "_blank", "noopener,noreferrer")}
                                  type="button"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                  Abrir enlace
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {tareas ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tareas</p>
                    {cargandoSemanaId === semana.id ? (
                      <p className="text-sm text-slate-400">Cargando...</p>
                    ) : !tareasSemana || tareasSemana.length === 0 ? (
                      <p className="text-sm text-slate-400">Aún no hay tareas publicadas en esta semana.</p>
                    ) : (
                      <div className="grid gap-2">
                        {tareasSemana.map((tarea) => (
                          <TareaItem
                            archivos={tareas.archivosPorTarea?.[tarea.id]}
                            key={tarea.id}
                            onDescargarArchivoPropio={tareas.onDescargarArchivoPropio}
                            onSubirArchivo={tareas.onSubirArchivo}
                            onVerMisArchivos={tareas.onVerMisArchivos}
                            subiendo={tareas.subiendoTareaId === tarea.id}
                            tarea={tarea}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TareaItem({
  archivos,
  onDescargarArchivoPropio,
  onSubirArchivo,
  onVerMisArchivos,
  subiendo,
  tarea,
}: {
  archivos: ArchivoPropioVista[] | undefined;
  onDescargarArchivoPropio: TareasConfig["onDescargarArchivoPropio"];
  onSubirArchivo: TareasConfig["onSubirArchivo"];
  onVerMisArchivos: TareasConfig["onVerMisArchivos"];
  subiendo: boolean;
  tarea: TareaEstudianteVista;
}) {
  const [archivosAbiertos, setArchivosAbiertos] = useState(false);
  const publicada = tarea.miNota !== null || tarea.miComentarioCalificacion !== null;

  const handleSeleccionarArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (archivo && onSubirArchivo) void onSubirArchivo(tarea, archivo);
  };

  const handleVerArchivos = () => {
    const siguiente = !archivosAbiertos;
    setArchivosAbiertos(siguiente);
    if (siguiente && !archivos && onVerMisArchivos) void onVerMisArchivos(tarea.id);
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <ClipboardList className="mt-0.5 h-4 w-4 text-violet-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">
            {tarea.titulo}
            {tarea.punteo !== null ? ` · ${tarea.punteo} pts` : ""}
          </p>
          {tarea.descripcion ? <p className="mt-0.5 text-xs text-slate-500">{tarea.descripcion}</p> : null}
          {tarea.entregaHabilitada ? <p className="mt-1 text-xs text-slate-400">Fecha límite: {formatearFechaLimite(tarea.fechaLimite)}</p> : null}

          {tarea.miEntregadoEn ? (
            <p className={`mt-1 text-xs ${tarea.miTardia ? "font-semibold text-amber-600" : "text-emerald-600"}`}>
              Entregaste el {formatearFechaHora(tarea.miEntregadoEn)}
              {tarea.miTardia ? " (tardía)" : ""}
            </p>
          ) : tarea.entregaHabilitada ? (
            <p className="mt-1 text-xs text-slate-400">Aún no has entregado.</p>
          ) : null}

          {publicada ? (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-xs font-semibold text-emerald-700">Nota: {tarea.miNota ?? "—"}</p>
              {tarea.miComentarioCalificacion ? <p className="mt-0.5 text-xs text-emerald-700">{tarea.miComentarioCalificacion}</p> : null}
            </div>
          ) : null}

          {tarea.entregaHabilitada ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {onSubirArchivo ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400">
                  <Upload className="h-3.5 w-3.5" />
                  {subiendo ? "Subiendo..." : tarea.miEntregadoEn ? "Entregar otro archivo" : "Subir archivo"}
                  <input className="hidden" disabled={subiendo} onChange={handleSeleccionarArchivo} type="file" />
                </label>
              ) : null}
              {tarea.miEntregadoEn ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                  onClick={handleVerArchivos}
                  type="button"
                >
                  {archivosAbiertos ? "Ocultar mis archivos" : "Ver mis archivos"}
                </button>
              ) : null}
            </div>
          ) : null}

          {archivosAbiertos ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {!archivos ? (
                <p className="text-xs text-slate-400">Cargando...</p>
              ) : archivos.length === 0 ? (
                <p className="text-xs text-slate-400">Sin archivos.</p>
              ) : (
                archivos.map((archivo) => (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-400"
                    key={archivo.id}
                    onClick={() => onDescargarArchivoPropio?.(archivo)}
                    type="button"
                  >
                    <Download className="h-3 w-3" />
                    {archivo.nombre ?? "Archivo"}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
