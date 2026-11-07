"use client";

import { Camera, Download, Eye, FileText, FileType2, Image as ImageIcon, Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACEPTA_ARCHIVOS,
  actualizarDocumento,
  CATEGORIAS_DOCUMENTO,
  eliminarDocumento,
  fetchDocumentos,
  MENSAJE_FALTA_MIGRACION,
  nombreCategoria,
  subirDocumento,
  tamanoLegible,
  tipoDocumento,
  urlDocumento,
  urlsMiniaturas,
  validarArchivo,
  type CategoriaDocumento,
  type DocumentoRow,
} from "@/lib/clinica/documentos";
import type { SesionRow } from "@/lib/clinica/types";
import { BTN_ACCENT, BTN_DANGER, BTN_GHOST, Field, SectionCard } from "./ui";

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaCorta = (f: string) => {
  const [a, m, d] = f.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};
const sinExtension = (n: string) => n.replace(/\.[^.]+$/, "");

/** Abre una URL firmada en otra pestaña (la pestaña se abre dentro del toque para que el navegador no la bloquee). */
async function abrirDocumento(doc: DocumentoRow, descargar: boolean) {
  const ventana = descargar ? null : window.open("", "_blank");
  const { url, error } = await urlDocumento(doc, descargar);
  if (!url) {
    ventana?.close();
    window.alert(error ?? "No se pudo abrir el archivo.");
    return;
  }
  if (ventana) ventana.location.href = url;
  else window.location.href = url;
}

function IconoTipo({ doc }: { doc: DocumentoRow }) {
  const tipo = tipoDocumento(doc.mime, doc.archivoNombre);
  if (tipo === "pdf") return <FileText className="h-8 w-8 text-red-300" />;
  if (tipo === "word") return <FileType2 className="h-8 w-8 text-sky-300" />;
  if (tipo === "imagen") return <ImageIcon className="h-8 w-8 text-emerald-300" />;
  return <Paperclip className="h-8 w-8 text-slate-400" />;
}

type Pendiente = { file: File; titulo: string };

/**
 * Documentos del expediente: fotografías, cartas, materiales, tareas, informes
 * externos y otros archivos (imágenes, PDF y Word). Se pueden asociar a una sesión.
 */
export function DocumentosPaciente({ pacienteId, sesiones }: { pacienteId: string; sesiones: SesionRow[] }) {
  const [docs, setDocs] = useState<DocumentoRow[] | null>(null);
  const [falta, setFalta] = useState(false);
  const [error, setError] = useState("");
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<CategoriaDocumento | "todas">("todas");
  // Formulario de subida
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [categoria, setCategoria] = useState<CategoriaDocumento>("foto");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(hoyLocal);
  const [sesionId, setSesionId] = useState("");
  const [subiendo, setSubiendo] = useState<{ hechos: number; total: number } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const numeroSesion = useMemo(() => Object.fromEntries(sesiones.map((s, i) => [s.id, sesiones.length - i])), [sesiones]);

  const cargar = useCallback(async () => {
    const r = await fetchDocumentos(pacienteId);
    setFalta(r.faltaMigracion);
    setError(r.faltaMigracion ? "" : (r.error ?? ""));
    setDocs(r.data);
    const imagenes = r.data.filter((d) => tipoDocumento(d.mime, d.archivoNombre) === "imagen").map((d) => d.archivoPath);
    setMiniaturas(await urlsMiniaturas(imagenes));
  }, [pacienteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void cargar();
  }, [cargar]);

  const elegir = (lista: FileList | null) => {
    if (!lista?.length) return;
    const archivos = Array.from(lista);
    const malos = archivos.map(validarArchivo).filter(Boolean) as string[];
    setError(malos.join(" "));
    const buenos = archivos.filter((f) => !validarArchivo(f));
    if (!buenos.length) return;
    setPendientes(buenos.map((file) => ({ file, titulo: sinExtension(file.name) })));
    setCategoria(buenos.every((f) => tipoDocumento(f.type, f.name) === "imagen") ? "foto" : "otro");
  };

  const subir = async () => {
    setError("");
    setSubiendo({ hechos: 0, total: pendientes.length });
    const errores: string[] = [];
    for (const [i, p] of pendientes.entries()) {
      const { error: e } = await subirDocumento({ pacienteId, file: p.file, categoria, titulo: p.titulo, nota, fecha, sesionId: sesionId || null });
      if (e) errores.push(e);
      setSubiendo({ hechos: i + 1, total: pendientes.length });
    }
    setSubiendo(null);
    if (errores.length) setError([...new Set(errores)].join(" "));
    else {
      setPendientes([]);
      setNota("");
    }
    await cargar();
  };

  const visibles = (docs ?? []).filter((d) => filtro === "todas" || d.categoria === filtro);
  const presentes = CATEGORIAS_DOCUMENTO.filter((c) => (docs ?? []).some((d) => d.categoria === c.id));

  return (
    <SectionCard
      plegable={{ id: "documentos", resumen: falta ? "pendiente de activar" : docs ? `${docs.length} archivo${docs.length === 1 ? "" : "s"}` : undefined }}
      title="Documentos y archivos"
    >
      <div className="grid gap-3" data-testid="documentos-paciente">
        {falta ? (
          <p className="border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{MENSAJE_FALTA_MIGRACION}</p>
        ) : (
          <>
            <p className="text-xs leading-5 text-slate-400">
              Fotografías, cartas, materiales, tareas, informes externos y otros archivos (imágenes, PDF y Word, hasta 20 MB). Se guardan
              de forma privada en el expediente; las fotos grandes se reducen automáticamente.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className={`${BTN_ACCENT} cursor-pointer`}>
                <Upload className="h-4 w-4" />
                Agregar archivos
                <input accept={ACEPTA_ARCHIVOS} className="sr-only" multiple onChange={(e) => (elegir(e.target.files), (e.target.value = ""))} type="file" />
              </label>
              <label className={`${BTN_GHOST} cursor-pointer`}>
                <Camera className="h-4 w-4" />
                Tomar foto
                <input accept="image/*" capture="environment" className="sr-only" onChange={(e) => (elegir(e.target.files), (e.target.value = ""))} type="file" />
              </label>
            </div>

            {pendientes.length ? (
              <div className="grid gap-3 border border-emerald-300/30 bg-emerald-300/5 p-3" data-testid="subida-documentos">
                <p className="text-sm font-semibold text-white">
                  {pendientes.length === 1 ? "1 archivo listo para subir" : `${pendientes.length} archivos listos para subir`}
                </p>
                <div className="grid gap-2">
                  {pendientes.map((p, i) => (
                    <Field key={`${p.file.name}-${i}`} label={`Título · ${p.file.name} (${tamanoLegible(p.file.size)})`}>
                      <input
                        className="field"
                        maxLength={160}
                        onChange={(e) => setPendientes((l) => l.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                        value={p.titulo}
                      />
                    </Field>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Categoría">
                    <select className="field" onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)} value={categoria}>
                      {CATEGORIAS_DOCUMENTO.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fecha">
                    <input className="field" onChange={(e) => setFecha(e.target.value)} type="date" value={fecha} />
                  </Field>
                  <Field label="Sesión (opcional)">
                    <select className="field" onChange={(e) => setSesionId(e.target.value)} value={sesionId}>
                      <option value="">Sin sesión</option>
                      {sesiones.map((s) => (
                        <option key={s.id} value={s.id}>
                          Sesión {numeroSesion[s.id]} · {fechaCorta(s.iniciadaAt)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Nota (opcional)">
                  <textarea className="field min-h-16" maxLength={2000} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: dibujo de la familia realizado en sesión; carta escrita a su padre." value={nota} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button className={BTN_ACCENT} disabled={!!subiendo} onClick={() => void subir()} type="button">
                    <Upload className="h-4 w-4" />
                    {subiendo ? `Subiendo ${subiendo.hechos} de ${subiendo.total}…` : "Guardar en el expediente"}
                  </button>
                  <button className={BTN_GHOST} disabled={!!subiendo} onClick={() => setPendientes([])} type="button">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            {presentes.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {[{ id: "todas" as const, nombre: "Todas" }, ...presentes].map((c) => (
                  <button
                    className={`border px-2.5 py-1 text-xs font-semibold ${filtro === c.id ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-100" : "border-white/10 text-slate-300"}`}
                    key={c.id}
                    onClick={() => setFiltro(c.id)}
                    type="button"
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            ) : null}

            {docs && !docs.length ? <p className="text-sm text-slate-400">Aún no hay archivos en este expediente.</p> : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {visibles.map((d) =>
                editando === d.id ? (
                  <EditarDocumento
                    doc={d}
                    key={d.id}
                    onCerrar={() => setEditando(null)}
                    onGuardado={() => {
                      setEditando(null);
                      void cargar();
                    }}
                    numeroSesion={numeroSesion}
                    sesiones={sesiones}
                  />
                ) : (
                  <div className="flex min-w-0 gap-3 border border-white/10 bg-white/4 p-2" data-documento={d.id} key={d.id}>
                    <button
                      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-slate-900"
                      onClick={() => void abrirDocumento(d, tipoDocumento(d.mime, d.archivoNombre) === "word")}
                      title="Abrir"
                      type="button"
                    >
                      {miniaturas[d.archivoPath] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase
                        <img alt={d.titulo} className="h-full w-full object-cover" src={miniaturas[d.archivoPath]} />
                      ) : (
                        <IconoTipo doc={d} />
                      )}
                    </button>
                    <div className="grid min-w-0 flex-1 content-start gap-0.5">
                      <p className="truncate text-sm font-semibold text-white">{d.titulo}</p>
                      <p className="text-[11px] text-slate-400">
                        {nombreCategoria(d.categoria)} · {fechaCorta(d.fecha)} · {tamanoLegible(d.tamano)}
                        {d.sesionId && numeroSesion[d.sesionId] ? ` · Sesión ${numeroSesion[d.sesionId]}` : ""}
                      </p>
                      {d.nota ? <p className="line-clamp-2 text-xs text-slate-300">{d.nota}</p> : null}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tipoDocumento(d.mime, d.archivoNombre) !== "word" ? (
                          <button className={`${BTN_GHOST} !px-2 !py-1 text-xs`} onClick={() => void abrirDocumento(d, false)} type="button">
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </button>
                        ) : null}
                        <button className={`${BTN_GHOST} !px-2 !py-1 text-xs`} onClick={() => void abrirDocumento(d, true)} type="button">
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </button>
                        <button className={`${BTN_GHOST} !px-2 !py-1 text-xs`} onClick={() => setEditando(d.id)} title="Editar datos" type="button">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={`${BTN_DANGER} !px-2 !py-1 text-xs`}
                          onClick={async () => {
                            if (!window.confirm(`¿Eliminar «${d.titulo}» del expediente? No se puede deshacer.`)) return;
                            const { error: e } = await eliminarDocumento(d);
                            if (e) setError(e);
                            void cargar();
                          }}
                          title="Eliminar"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function EditarDocumento({
  doc,
  numeroSesion,
  onCerrar,
  onGuardado,
  sesiones,
}: {
  doc: DocumentoRow;
  numeroSesion: Record<string, number>;
  onCerrar: () => void;
  onGuardado: () => void;
  sesiones: SesionRow[];
}) {
  const [titulo, setTitulo] = useState(doc.titulo);
  const [categoria, setCategoria] = useState<CategoriaDocumento>(doc.categoria);
  const [fecha, setFecha] = useState(doc.fecha);
  const [nota, setNota] = useState(doc.nota ?? "");
  const [sesionId, setSesionId] = useState(doc.sesionId ?? "");
  const [error, setError] = useState("");
  return (
    <div className="grid gap-2 border border-emerald-300/30 bg-emerald-300/5 p-3 sm:col-span-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Título">
          <input className="field" maxLength={160} onChange={(e) => setTitulo(e.target.value)} value={titulo} />
        </Field>
        <Field label="Categoría">
          <select className="field" onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)} value={categoria}>
            {CATEGORIAS_DOCUMENTO.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input className="field" onChange={(e) => setFecha(e.target.value)} type="date" value={fecha} />
        </Field>
        <Field label="Sesión">
          <select className="field" onChange={(e) => setSesionId(e.target.value)} value={sesionId}>
            <option value="">Sin sesión</option>
            {sesiones.map((s) => (
              <option key={s.id} value={s.id}>
                Sesión {numeroSesion[s.id]} · {fechaCorta(s.iniciadaAt)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Nota">
        <textarea className="field min-h-16" maxLength={2000} onChange={(e) => setNota(e.target.value)} value={nota} />
      </Field>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <div className="flex gap-2">
        <button
          className={BTN_ACCENT}
          onClick={async () => {
            if (!titulo.trim()) return setError("Escribe un título.");
            const { error: e } = await actualizarDocumento(doc.id, { titulo, categoria, fecha, nota, sesionId: sesionId || null });
            if (e) return setError(e);
            onGuardado();
          }}
          type="button"
        >
          Guardar
        </button>
        <button className={BTN_GHOST} onClick={onCerrar} type="button">
          Cancelar
        </button>
      </div>
    </div>
  );
}
