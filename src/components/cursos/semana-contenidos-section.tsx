"use client";

import { Download, FileText, Link2, Plus, Presentation, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { borrarArchivos, esImagen, esPdf, esPresentacionOffice, rutaArchivoCurso, subirArchivo, urlFirmada } from "@/lib/cursos/archivos";
import { deleteContenido, insertContenido } from "@/lib/cursos/contenidos";
import type { CategoriaContenido, ContenidoRow } from "@/lib/cursos/types";
import { PresentacionArchivo } from "./presentacion-archivo";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field } from "./ui";

export function SemanaContenidosSection({
  categoria,
  contenidos,
  cursoId,
  onReload,
  semanaId,
  titulo,
}: {
  categoria: CategoriaContenido;
  contenidos: ContenidoRow[];
  cursoId: string;
  onReload: () => void | Promise<void>;
  semanaId: string;
  titulo: string;
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminar, setEliminar] = useState<ContenidoRow | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState<ContenidoRow | null>(null);

  const handleEliminar = async () => {
    if (!eliminar) return;
    setEliminando(true);
    if (eliminar.archivo_path) await borrarArchivos([eliminar.archivo_path]);
    const { error: deleteError } = await deleteContenido(eliminar.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminar(null);
    await onReload();
  };

  const handleDescargar = async (contenido: ContenidoRow) => {
    if (!contenido.archivo_path) return;
    const { url } = await urlFirmada(contenido.archivo_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="border border-white/10 bg-white/6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{titulo}</h3>
        <button className={BTN_GHOST} onClick={() => setModalAbierto(true)} type="button">
          <Plus className="h-4 w-4" />
          Agregar {titulo.toLowerCase()}
        </button>
      </div>

      <ErrorBanner message={error} />

      {contenidos.length === 0 ? (
        <EmptyState>Aún no hay elementos en esta sección.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {contenidos.map((contenido) => {
            const presentable =
              esPdf(contenido.archivo_mime, contenido.archivo_nombre) ||
              esPresentacionOffice(contenido.archivo_mime, contenido.archivo_nombre) ||
              esImagen(contenido.archivo_mime, contenido.archivo_nombre);
            return (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-3" key={contenido.id}>
                <div className="flex items-start gap-3">
                  {contenido.url_externa && !contenido.archivo_path ? (
                    <Link2 className="mt-0.5 h-5 w-5 text-sky-300" />
                  ) : (
                    <FileText className="mt-0.5 h-5 w-5 text-emerald-300" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">{contenido.titulo}</div>
                    {contenido.descripcion ? <p className="mt-1 text-xs text-slate-400">{contenido.descripcion}</p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contenido.archivo_path && presentable ? (
                    <button className={BTN_GHOST} onClick={() => setVisor(contenido)} type="button">
                      <Presentation className="h-4 w-4" />
                      Modo presentación
                    </button>
                  ) : null}
                  {contenido.archivo_path ? (
                    <button className={BTN_GHOST} onClick={() => handleDescargar(contenido)} type="button">
                      <Download className="h-4 w-4" />
                      Descargar
                    </button>
                  ) : null}
                  {contenido.url_externa ? (
                    <button
                      className={BTN_GHOST}
                      onClick={() => window.open(contenido.url_externa as string, "_blank", "noopener,noreferrer")}
                      type="button"
                    >
                      <Link2 className="h-4 w-4" />
                      Abrir enlace
                    </button>
                  ) : null}
                  <button
                    className="flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-300"
                    onClick={() => setEliminar(contenido)}
                    title="Eliminar"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAbierto ? (
        <AgregarContenidoModal
          categoria={categoria}
          cursoId={cursoId}
          onClose={() => setModalAbierto(false)}
          onGuardado={async () => {
            setModalAbierto(false);
            await onReload();
          }}
          semanaId={semanaId}
        />
      ) : null}

      {visor ? (
        <PresentacionArchivo
          archivoMime={visor.archivo_mime}
          archivoNombre={visor.archivo_nombre}
          archivoPath={visor.archivo_path}
          onClose={() => setVisor(null)}
          titulo={visor.titulo}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará este elemento de la semana."
        onCancel={() => setEliminar(null)}
        onConfirm={handleEliminar}
        open={eliminar !== null}
        title="Eliminar elemento"
      />
    </section>
  );
}

function AgregarContenidoModal({
  categoria,
  cursoId,
  onClose,
  onGuardado,
  semanaId,
}: {
  categoria: CategoriaContenido;
  cursoId: string;
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
  semanaId: string;
}) {
  const [tituloValor, setTituloValor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [urlExterna, setUrlExterna] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!tituloValor.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    let archivoPath: string | null = null;
    if (archivo) {
      archivoPath = rutaArchivoCurso(cursoId, `semanas/${semanaId}/${categoria}`, archivo.name);
      const { error: uploadError } = await subirArchivo(archivoPath, archivo);
      if (uploadError) {
        setError(uploadError);
        setGuardando(false);
        return;
      }
    }

    const { error: insertError } = await insertContenido({
      semana_id: semanaId,
      categoria,
      titulo: tituloValor.trim(),
      descripcion: descripcion.trim() || null,
      archivo_path: archivoPath,
      archivo_nombre: archivo?.name ?? null,
      archivo_mime: archivo?.type ?? null,
      url_externa: urlExterna.trim() || null,
    });
    setGuardando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    await onGuardado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-md border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">Agregar contenido</h3>
          <div className="grid gap-3">
            <Field label="Título">
              <input className="field" onChange={(event) => setTituloValor(event.target.value)} value={tituloValor} />
            </Field>
            <Field label="Descripción">
              <textarea className="field" onChange={(event) => setDescripcion(event.target.value)} rows={2} value={descripcion} />
            </Field>
            <Field label="Archivo">
              <label className="flex cursor-pointer items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-300 hover:border-white/30">
                <Upload className="h-4 w-4" />
                {archivo ? archivo.name : "Seleccionar archivo"}
                <input className="hidden" onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} type="file" />
              </label>
            </Field>
            <Field label="O bien, URL externa">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-400" />
                <input
                  className="field"
                  onChange={(event) => setUrlExterna(event.target.value)}
                  placeholder="https://..."
                  value={urlExterna}
                />
              </div>
            </Field>
          </div>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleGuardar} type="button">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
