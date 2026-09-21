"use client";

import { ChevronDown, ChevronRight, ClipboardList, Download, FileText, Link2, Upload } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { Idioma } from "@/lib/cursos/types";
import { formatearFecha, formatearFechaHora, formatearFechaLimite } from "@/lib/cursos/types";
import { traducir } from "@/lib/estudiante/i18n";

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
 * estudiante (datos vía RPC, con entrega de archivos habilitada, en su
 * idioma preferido) y la vista previa "Ver como estudiante" del admin
 * (datos leídos directo por el owner, sin acciones de escritura: se omite
 * `tareas.onSubirArchivo`, siempre en español). Por eso traduce con la
 * función pura `traducir(idioma, clave)` en vez de un contexto de React:
 * así no depende de que el árbol del admin esté envuelto en
 * `IdiomaProvider`.
 */
export function CursoContenidoLista({
  cargandoSemanaId,
  contenidosPorSemana,
  idioma = "es",
  onAbrirArchivo,
  onExpandirSemana,
  semanas,
  tareas,
}: {
  cargandoSemanaId: string | null;
  contenidosPorSemana: Record<string, ContenidoEstudianteVista[] | undefined>;
  idioma?: Idioma;
  onAbrirArchivo: (contenido: ContenidoEstudianteVista) => void;
  onExpandirSemana: (semanaId: string) => void;
  semanas: SemanaEstudianteVista[];
  tareas?: TareasConfig;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const t = (clave: string) => traducir(idioma, clave);

  const toggle = (semanaId: string) => {
    const siguiente = abierta === semanaId ? null : semanaId;
    setAbierta(siguiente);
    if (siguiente && !contenidosPorSemana[semanaId]) onExpandirSemana(semanaId);
  };

  if (!semanas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {t("lista_sin_semanas")}
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
                  {t("lista_semana")} {semana.numero}
                  {semana.titulo ? ` — ${semana.titulo}` : ""}
                </p>
                <p className="text-xs text-slate-400">{formatearFecha(semana.fecha)}</p>
              </div>
              {estaAbierta ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {estaAbierta ? (
              <div className="grid gap-4 border-t border-slate-100 p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("lista_contenidos")}</p>
                  {cargandoSemanaId === semana.id ? (
                    <p className="text-sm text-slate-400">{t("central_cargando")}</p>
                  ) : !contenidos || contenidos.length === 0 ? (
                    <p className="text-sm text-slate-400">{t("lista_sin_contenido")}</p>
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
                                  {t("lista_ver_descargar")}
                                </button>
                              ) : contenido.urlExterna ? (
                                <button
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                                  onClick={() => window.open(contenido.urlExterna as string, "_blank", "noopener,noreferrer")}
                                  type="button"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                  {t("lista_abrir_enlace")}
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
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("lista_tareas")}</p>
                    {cargandoSemanaId === semana.id ? (
                      <p className="text-sm text-slate-400">{t("central_cargando")}</p>
                    ) : !tareasSemana || tareasSemana.length === 0 ? (
                      <p className="text-sm text-slate-400">{t("lista_sin_tareas")}</p>
                    ) : (
                      <div className="grid gap-2">
                        {tareasSemana.map((tarea) => (
                          <TareaItem
                            archivos={tareas.archivosPorTarea?.[tarea.id]}
                            idioma={idioma}
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
  idioma,
  onDescargarArchivoPropio,
  onSubirArchivo,
  onVerMisArchivos,
  subiendo,
  tarea,
}: {
  archivos: ArchivoPropioVista[] | undefined;
  idioma: Idioma;
  onDescargarArchivoPropio: TareasConfig["onDescargarArchivoPropio"];
  onSubirArchivo: TareasConfig["onSubirArchivo"];
  onVerMisArchivos: TareasConfig["onVerMisArchivos"];
  subiendo: boolean;
  tarea: TareaEstudianteVista;
}) {
  const [archivosAbiertos, setArchivosAbiertos] = useState(false);
  const t = (clave: string) => traducir(idioma, clave);
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
          {tarea.entregaHabilitada ? (
            <p className="mt-1 text-xs text-slate-400">
              {t("tarea_fecha_limite")}: {formatearFechaLimite(tarea.fechaLimite, idioma)}
            </p>
          ) : null}

          {tarea.miEntregadoEn ? (
            <p className={`mt-1 text-xs ${tarea.miTardia ? "font-semibold text-amber-600" : "text-emerald-600"}`}>
              {t("tarea_entregaste")} {formatearFechaHora(tarea.miEntregadoEn)}
              {tarea.miTardia ? ` ${t("tarea_tardia")}` : ""}
            </p>
          ) : tarea.entregaHabilitada ? (
            <p className="mt-1 text-xs text-slate-400">{t("tarea_no_entregado")}</p>
          ) : null}

          {publicada ? (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-xs font-semibold text-emerald-700">
                {t("tarea_nota")}: {tarea.miNota ?? "—"}
              </p>
              {tarea.miComentarioCalificacion ? <p className="mt-0.5 text-xs text-emerald-700">{tarea.miComentarioCalificacion}</p> : null}
            </div>
          ) : null}

          {tarea.entregaHabilitada ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {onSubirArchivo ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400">
                  <Upload className="h-3.5 w-3.5" />
                  {subiendo ? t("tarea_subiendo") : tarea.miEntregadoEn ? t("tarea_entregar_otro") : t("tarea_subir_archivo")}
                  <input className="hidden" disabled={subiendo} onChange={handleSeleccionarArchivo} type="file" />
                </label>
              ) : null}
              {tarea.miEntregadoEn ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                  onClick={handleVerArchivos}
                  type="button"
                >
                  {archivosAbiertos ? t("tarea_ocultar_archivos") : t("tarea_ver_archivos")}
                </button>
              ) : null}
            </div>
          ) : null}

          {archivosAbiertos ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {!archivos ? (
                <p className="text-xs text-slate-400">{t("central_cargando")}</p>
              ) : archivos.length === 0 ? (
                <p className="text-xs text-slate-400">{t("tarea_sin_archivos")}</p>
              ) : (
                archivos.map((archivo) => (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-400"
                    key={archivo.id}
                    onClick={() => onDescargarArchivoPropio?.(archivo)}
                    type="button"
                  >
                    <Download className="h-3 w-3" />
                    {archivo.nombre ?? t("tarea_archivo_generico")}
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
