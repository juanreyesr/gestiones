"use client";

import { BookOpen, Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FichaClinicaVista } from "@/components/bibliotecas/ficha-clinica-vista";
import { ModalPortal } from "@/components/modal-portal";
import { bibliotecaPorId, fichaClinicaPorId } from "@/lib/bibliotecas";
import { fichaClinicaHtml } from "@/lib/bibliotecas/html";
import { fetchMisBibliotecas } from "@/lib/estudiante/estudiante-client";
import { descargarPdfDeHtml, nombrePdf } from "@/lib/pdf-desde-html";
import { useIdioma } from "./idioma-context";

/** Ventana (tema claro) con una ficha en vista de estudiante y su PDF. */
function FichaEstudianteModal({ fichaId, onCerrar }: { fichaId: string; onCerrar: () => void }) {
  const { t } = useIdioma();
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const encontrada = fichaClinicaPorId(fichaId);
  if (!encontrada) return null;
  const { ficha, biblioteca } = encontrada;
  const descargar = async () => {
    setGenerando(true);
    setError("");
    try {
      await descargarPdfDeHtml(fichaClinicaHtml(ficha, biblioteca, "estudiante"), nombrePdf(`${biblioteca.titulo} ${ficha.nombre}`));
    } catch {
      setError(t("biblioteca_error_pdf"));
    } finally {
      setGenerando(false);
    }
  };
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-6" onClick={onCerrar}>
        <div
          aria-label={ficha.nombre}
          aria-modal="true"
          className="grid w-full max-w-3xl gap-4 rounded-2xl bg-white p-4 shadow-xl sm:p-6"
          data-testid="biblioteca-ficha-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <BookOpen className="h-4 w-4" /> {biblioteca.titulo}
            </span>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                disabled={generando}
                onClick={() => void descargar()}
                type="button"
              >
                <Download className="h-4 w-4" />
                {generando ? t("biblioteca_generando") : t("biblioteca_descargar")}
              </button>
              <button aria-label={t("biblioteca_cerrar")} className="rounded-lg border border-slate-200 px-2 text-slate-600 hover:bg-slate-50" onClick={onCerrar} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          <FichaClinicaVista ficha={ficha} tema="claro" vista="estudiante" />
        </div>
      </div>
    </ModalPortal>
  );
}

/**
 * Bibliotecas JJR activas en el curso (las activa el docente en la pestaña «Bibliotecas»).
 * Si no hay ninguna (o falta la migración 067), no dibuja nada.
 */
export function BibliotecaCurso({ cursoId }: { cursoId: string }) {
  const { t } = useIdioma();
  const [ids, setIds] = useState<string[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void fetchMisBibliotecas(cursoId).then((r) => {
      if (vivo) setIds(r);
    });
    return () => {
      vivo = false;
    };
  }, [cursoId]);

  const bibliotecas = ids.map((id) => bibliotecaPorId(id)).filter((b) => b !== null);
  if (!bibliotecas.length) return null;

  return (
    <section className="mt-10 grid gap-4" data-testid="biblioteca-curso">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BookOpen className="h-5 w-5 text-teal-700" /> {t("biblioteca_titulo")}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t("biblioteca_intro")}</p>
      </div>
      {bibliotecas.map((b) => (
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4" key={b.id}>
          <div>
            <h3 className="font-semibold text-slate-900">{b.titulo}</h3>
            <p className="text-xs text-slate-500">
              {b.descripcion} · {b.fichas.length} {t("biblioteca_fichas")}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {b.fichas.map((f) => (
              <button
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-teal-400 hover:bg-teal-50"
                key={f.id}
                onClick={() => setAbierta(f.id)}
                type="button"
              >
                <span className="block text-sm font-semibold text-slate-900">{f.nombre}</span>
                <span className="block text-xs text-slate-500">
                  DSM-5-TR {f.codigos.dsm} · CIE-11 {f.codigos.cie}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {abierta ? <FichaEstudianteModal fichaId={abierta} onCerrar={() => setAbierta(null)} /> : null}
    </section>
  );
}
