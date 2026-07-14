"use client";

import { Download, Eye, FileText, Link2, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { borrarArchivos, esImagen, esPdf, esPresentacionOffice, rutaArchivoCurso, subirArchivo, urlFirmada } from "@/lib/cursos/archivos";
import { deletePlanificacion, fetchPlanificaciones, insertPlanificacion } from "@/lib/cursos/planificaciones";
import { TIPO_PLANIFICACION_LABELS, type PlanificacionRow, type TipoPlanificacion } from "@/lib/cursos/types";
import { PresentacionArchivo } from "./presentacion-archivo";
import { BTN_GHOST, BTN_PRIMARY, Chip, EmptyState, ErrorBanner, Field } from "./ui";

export function CursoPlanificacionTab({ cursoId }: { cursoId: string }) {
  const [documentos, setDocumentos] = useState<PlanificacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminar, setEliminar] = useState<PlanificacionRow | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [visor, setVisor] = useState<PlanificacionRow | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchPlanificaciones(cursoId);
    setDocumentos(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga documentos al cambiar de curso
    void cargar();
  }, [cargar]);

  const handleVer = async (documento: PlanificacionRow) => {
    if (documento.archivo_path) {
      const presentable =
        esPdf(documento.archivo_mime, documento.archivo_nombre) ||
        esPresentacionOffice(documento.archivo_mime, documento.archivo_nombre) ||
        esImagen(documento.archivo_mime, documento.archivo_nombre);
      if (presentable) {
        setVisor(documento);
        return;
      }
      const { url } = await urlFirmada(documento.archivo_path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (documento.url_externa) window.open(documento.url_externa, "_blank", "noopener,noreferrer");
  };

  const handleDescargar = async (documento: PlanificacionRow) => {
    if (!documento.archivo_path) return;
    const { url } = await urlFirmada(documento.archivo_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleEliminar = async () => {
    if (!eliminar) return;
    setEliminando(true);
    if (eliminar.archivo_path) await borrarArchivos([eliminar.archivo_path]);
    const { error: deleteError } = await deletePlanificacion(eliminar.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminar(null);
    await cargar();
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-400">Planificaciones y calendarios generales del curso.</p>
      <ErrorBanner message={error} />

      <div className="flex justify-end">
        <button className={BTN_PRIMARY} onClick={() => setModalAbierto(true)} type="button">
          <Plus className="h-4 w-4" />
          Agregar documento
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : documentos.length === 0 ? (
        <EmptyState>Aún no hay planificaciones ni calendarios agregados.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {documentos.map((documento) => (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-3" key={documento.id}>
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-emerald-300" />
                <div>
                  <div className="flex items-center gap-2">
                    <Chip className="border-sky-300/40 bg-sky-300/15 text-sky-200">
                      {TIPO_PLANIFICACION_LABELS[documento.tipo]}
                    </Chip>
                    <span className="text-sm font-semibold text-white">{documento.titulo}</span>
                  </div>
                  {documento.descripcion ? <p className="mt-1 text-xs text-slate-400">{documento.descripcion}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className={BTN_GHOST} onClick={() => handleVer(documento)} type="button">
                  <Eye className="h-4 w-4" />
                  Ver
                </button>
                {documento.archivo_path ? (
                  <button className={BTN_GHOST} onClick={() => handleDescargar(documento)} type="button">
                    <Download className="h-4 w-4" />
                    Descargar
                  </button>
                ) : null}
                <button
                  className="flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-300"
                  onClick={() => setEliminar(documento)}
                  title="Eliminar"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto ? (
        <AgregarDocumentoModal
          cursoId={cursoId}
          onClose={() => setModalAbierto(false)}
          onGuardado={async () => {
            setModalAbierto(false);
            await cargar();
          }}
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
        message="Se eliminará este documento de la planificación general del curso."
        onCancel={() => setEliminar(null)}
        onConfirm={handleEliminar}
        open={eliminar !== null}
        title="Eliminar documento"
      />
    </div>
  );
}

function AgregarDocumentoModal({
  cursoId,
  onClose,
  onGuardado,
}: {
  cursoId: string;
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoPlanificacion>("planificacion");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [urlExterna, setUrlExterna] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!archivo && !urlExterna.trim()) {
      setError("Agrega un archivo o una URL externa.");
      return;
    }
    setGuardando(true);
    let archivoPath: string | null = null;
    if (archivo) {
      archivoPath = rutaArchivoCurso(cursoId, "planificaciones", archivo.name);
      const { error: uploadError } = await subirArchivo(archivoPath, archivo);
      if (uploadError) {
        setError(uploadError);
        setGuardando(false);
        return;
      }
    }

    const { error: insertError } = await insertPlanificacion({
      curso_id: cursoId,
      tipo,
      titulo: titulo.trim(),
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
          <h3 className="mb-4 text-lg font-semibold text-white">Agregar documento</h3>
          <div className="grid gap-3">
            <Field label="Tipo">
              <select className="field" onChange={(event) => setTipo(event.target.value as TipoPlanificacion)} value={tipo}>
                {(Object.keys(TIPO_PLANIFICACION_LABELS) as TipoPlanificacion[]).map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {TIPO_PLANIFICACION_LABELS[opcion]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Título">
              <input className="field" onChange={(event) => setTitulo(event.target.value)} value={titulo} />
            </Field>
            <Field label="Descripción">
              <textarea className="field" onChange={(event) => setDescripcion(event.target.value)} rows={2} value={descripcion} />
            </Field>
            <Field label="Archivo">
              <label className="flex cursor-pointer items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-300 hover:border-white/30">
                <Upload className="h-4 w-4" />
                {archivo ? archivo.name : "Seleccionar archivo"}
                <input
                  className="hidden"
                  onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
                  type="file"
                />
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
