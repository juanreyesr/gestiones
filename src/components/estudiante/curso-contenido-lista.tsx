"use client";

import { ChevronDown, ChevronRight, Download, FileText, Link2, Presentation } from "lucide-react";
import { useState } from "react";
import { EmbedViewerModal } from "@/components/shared/embed-viewer-modal";
import { formatearFecha } from "@/lib/cursos/types";
import { getEmbedInfo, type EmbedInfo } from "@/lib/estudiante/embed-links";

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

/**
 * Lista de semanas/contenidos visibles para un estudiante, en acordeón.
 * Presentacional y compartida: la usa el panel real del estudiante (datos
 * vía RPC) y la vista previa "Ver como estudiante" del admin (datos leídos
 * directo por el owner), cada uno con su propia forma de abrir un archivo.
 */
export function CursoContenidoLista({
  cargandoSemanaId,
  contenidosPorSemana,
  onAbrirArchivo,
  onExpandirSemana,
  semanas,
}: {
  cargandoSemanaId: string | null;
  contenidosPorSemana: Record<string, ContenidoEstudianteVista[] | undefined>;
  onAbrirArchivo: (contenido: ContenidoEstudianteVista) => void;
  onExpandirSemana: (semanaId: string) => void;
  semanas: SemanaEstudianteVista[];
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [embed, setEmbed] = useState<{ info: EmbedInfo; titulo: string } | null>(null);

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
              <div className="border-t border-slate-100 p-4">
                {cargandoSemanaId === semana.id ? (
                  <p className="text-sm text-slate-400">Cargando...</p>
                ) : !contenidos || contenidos.length === 0 ? (
                  <p className="text-sm text-slate-400">Aún no hay contenido publicado en esta semana.</p>
                ) : (
                  <div className="grid gap-2">
                    {contenidos.map((contenido) => {
                      const info = contenido.urlExterna ? getEmbedInfo(contenido.urlExterna) : null;
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
                            {info ? (
                              <button
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                                onClick={() => setEmbed({ info, titulo: contenido.titulo })}
                                type="button"
                              >
                                <Presentation className="h-3.5 w-3.5" />
                                Ver aquí
                              </button>
                            ) : null}
                            {contenido.tieneArchivo ? (
                              <button
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
                                onClick={() => onAbrirArchivo(contenido)}
                                type="button"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Ver / descargar
                              </button>
                            ) : contenido.urlExterna && !info ? (
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
            ) : null}
          </div>
        );
      })}

      {embed ? <EmbedViewerModal embed={embed.info} onClose={() => setEmbed(null)} titulo={embed.titulo} /> : null}
    </div>
  );
}
