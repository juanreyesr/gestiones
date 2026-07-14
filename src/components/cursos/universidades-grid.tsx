"use client";

import { Building2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { esImagen, extensionDe, rutaLogoUniversidad, subirArchivo, urlFirmada } from "@/lib/cursos/archivos";
import { fetchConteoCursosPorUniversidad } from "@/lib/cursos/cursos";
import { COLORES_UNIVERSIDAD, type UniversidadRow } from "@/lib/cursos/types";
import { deleteUniversidad, insertUniversidad, updateUniversidad } from "@/lib/cursos/universidades";
import { BTN_GHOST, BTN_PRIMARY, CardBox, ErrorBanner, Field } from "./ui";

type ModalState = { open: false } | { open: true; universidad: UniversidadRow | null };

export function UniversidadesGrid({
  loading,
  onOpen,
  onRefresh,
  universidades,
}: {
  loading: boolean;
  onOpen: (universidad: UniversidadRow) => void;
  onRefresh: () => void | Promise<void>;
  universidades: UniversidadRow[];
}) {
  const [logoUrls, setLogoUrls] = useState<Record<string, string>>({});
  const [conteoCursos, setConteoCursos] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [eliminarId, setEliminarId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const cargarExtras = useCallback(async () => {
    const { data: conteo } = await fetchConteoCursosPorUniversidad();
    setConteoCursos(conteo);

    const pendientes = universidades.filter((u) => u.logo_path && !logoUrls[u.logo_path]);
    if (!pendientes.length) return;
    const entradas = await Promise.all(
      pendientes.map(async (universidad) => {
        const { url } = await urlFirmada(universidad.logo_path as string);
        return [universidad.logo_path as string, url] as const;
      }),
    );
    setLogoUrls((prev) => {
      const next = { ...prev };
      for (const [path, url] of entradas) {
        if (url) next[path] = url;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- logoUrls solo se usa para evitar refetch, no debe disparar el efecto
  }, [universidades]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza contadores y urls firmadas cuando cambia la lista de universidades
    void cargarExtras();
  }, [cargarExtras]);

  const handleEliminar = async () => {
    if (!eliminarId) return;
    setEliminando(true);
    const { error: deleteError } = await deleteUniversidad(eliminarId);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminarId(null);
    await onRefresh();
  };

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {universidades.map((universidad) => (
            <CardBox key={universidad.id} onClick={() => onOpen(universidad)}>
              <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                <button
                  className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-slate-200 hover:border-emerald-300/50"
                  onClick={(event) => {
                    event.stopPropagation();
                    setModal({ open: true, universidad });
                  }}
                  title="Editar universidad"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center border border-red-400/30 bg-slate-950/80 text-red-200 hover:border-red-300"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEliminarId(universidad.id);
                  }}
                  title="Eliminar universidad"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden text-lg font-bold text-slate-950 shadow-[0_0_24px_rgba(110,231,183,0.12)]"
                style={{ background: universidad.logo_path ? undefined : universidad.color || "#6ee7b7" }}
              >
                {universidad.logo_path && logoUrls[universidad.logo_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={universidad.nombre}
                    className="h-full w-full object-cover"
                    src={logoUrls[universidad.logo_path]}
                  />
                ) : (
                  <span>{(universidad.siglas || universidad.nombre).slice(0, 3).toUpperCase()}</span>
                )}
              </div>

              <div className="text-base font-semibold text-white">{universidad.nombre}</div>
              {universidad.siglas ? <div className="text-sm text-slate-400">{universidad.siglas}</div> : null}
              <div className="mt-2 text-xs text-slate-400">
                {conteoCursos[universidad.id] ?? 0} curso{(conteoCursos[universidad.id] ?? 0) === 1 ? "" : "s"}
              </div>
            </CardBox>
          ))}

          <button
            className="flex min-h-[168px] flex-col items-center justify-center gap-2 border border-dashed border-white/15 bg-white/4 text-sm font-semibold text-slate-300 transition hover:border-emerald-300/50 hover:text-white"
            onClick={() => setModal({ open: true, universidad: null })}
            type="button"
          >
            <Plus className="h-8 w-8" />
            Agregar universidad
          </button>
        </div>
      )}

      {!loading && universidades.length === 0 ? (
        <p className="border border-dashed border-white/15 bg-white/4 p-6 text-center text-sm text-slate-400">
          <Building2 className="mx-auto mb-2 h-6 w-6 text-slate-500" />
          Aún no hay universidades registradas.
        </p>
      ) : null}

      {modal.open ? (
        <UniversidadModal
          onClose={() => setModal({ open: false })}
          onSaved={async () => {
            setModal({ open: false });
            await onRefresh();
          }}
          universidad={modal.universidad}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará esta universidad junto con todos sus cursos, semanas, contenidos, estudiantes y calificaciones. Esta acción no se puede deshacer."
        onCancel={() => setEliminarId(null)}
        onConfirm={handleEliminar}
        open={eliminarId !== null}
        title="Eliminar universidad"
      />
    </div>
  );
}

function UniversidadModal({
  onClose,
  onSaved,
  universidad,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  universidad: UniversidadRow | null;
}) {
  const [nombre, setNombre] = useState(universidad?.nombre ?? "");
  const [siglas, setSiglas] = useState(universidad?.siglas ?? "");
  const [color, setColor] = useState(universidad?.color ?? COLORES_UNIVERSIDAD[0]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError("");

    if (universidad) {
      const { error: updateError } = await updateUniversidad(universidad.id, {
        nombre: nombre.trim(),
        siglas: siglas.trim() || null,
        color,
      });
      if (updateError) {
        setError(updateError);
        setGuardando(false);
        return;
      }
      if (logoFile) {
        const ext = extensionDe(logoFile.name) || "png";
        const path = rutaLogoUniversidad(universidad.id, ext);
        const { error: uploadError } = await subirArchivo(path, logoFile);
        if (!uploadError) await updateUniversidad(universidad.id, { logo_path: path });
      }
    } else {
      const { id, error: insertError } = await insertUniversidad({
        nombre: nombre.trim(),
        siglas: siglas.trim() || null,
        color,
      });
      if (insertError || !id) {
        setError(insertError ?? "No se pudo crear la universidad.");
        setGuardando(false);
        return;
      }
      if (logoFile) {
        const ext = extensionDe(logoFile.name) || "png";
        const path = rutaLogoUniversidad(id, ext);
        const { error: uploadError } = await subirArchivo(path, logoFile);
        if (!uploadError) await updateUniversidad(id, { logo_path: path });
      }
    }

    setGuardando(false);
    await onSaved();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-md border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">
            {universidad ? "Editar universidad" : "Agregar universidad"}
          </h3>

          <div className="grid gap-3">
            <Field label="Nombre">
              <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
            </Field>
            <Field label="Siglas">
              <input className="field" onChange={(event) => setSiglas(event.target.value)} value={siglas} />
            </Field>
            <Field label="Color de acento">
              <div className="flex flex-wrap gap-2">
                {COLORES_UNIVERSIDAD.map((opcion) => (
                  <button
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      color === opcion ? "border-white" : "border-transparent"
                    }`}
                    key={opcion}
                    onClick={() => setColor(opcion)}
                    style={{ background: opcion }}
                    type="button"
                  />
                ))}
              </div>
            </Field>
            <Field label="Logo (opcional)">
              <label className="flex cursor-pointer items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-300 hover:border-white/30">
                <Upload className="h-4 w-4" />
                {logoFile ? logoFile.name : "Seleccionar imagen"}
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setLogoFile(file);
                    if (file && esImagen(file.type, file.name)) {
                      setLogoPreview(URL.createObjectURL(file));
                    } else {
                      setLogoPreview(null);
                    }
                  }}
                  type="file"
                />
              </label>
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Vista previa del logo" className="mt-2 h-16 w-16 object-cover" src={logoPreview} />
              ) : null}
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
