"use client";

import { FileText, Printer, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import type { ConsentimientoRow } from "@/lib/clinica/pacientes";
import { formatoFechaHora } from "@/lib/clinica/slots";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function imprimir(c: ConsentimientoRow) {
  const ventana = window.open("", "_blank");
  if (!ventana) return;
  const firmas = c.firmantes
    .map(
      (f) =>
        `<p>${esc(f.nombre)}${f.parentesco ? ` · ${esc(f.parentesco)}` : ""}${f.identificacion ? ` · ${esc(f.tipoIdentificacion || "Documento")} ${esc(f.identificacion)}` : ""}</p>`
    )
    .join("");
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Consentimiento informado</title>
<style>body{font:13px/1.55 system-ui,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}pre{white-space:pre-wrap;font:inherit}
.f{margin-top:20px;border-top:1px solid #ccc;padding-top:10px;font-size:12px}</style></head><body>
<pre>${esc(c.texto)}</pre>
<div class="f"><strong>Aceptado electrónicamente el ${esc(formatoFechaHora(c.aceptadoAt))}</strong> (versión ${esc(c.version)}).${firmas}
${c.esMenor ? `<p>Declara ejercer la patria potestad o tutela: ${c.declaraTutela ? "Sí" : "No"} · Asentimiento del menor: ${c.asentimientoMenor ? "Sí" : "No indicado"}</p>` : ""}</div>
</body></html>`);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

/** Consentimientos aceptados (historial) con su texto completo tal como se aceptó. */
export function ConsentimientosPaciente({
  aceptadoAt,
  consentimientos,
}: {
  aceptadoAt: string | null;
  consentimientos: ConsentimientoRow[];
}) {
  const [abierto, setAbierto] = useState<ConsentimientoRow | null>(null);

  if (consentimientos.length === 0) {
    return aceptadoAt ? (
      <p className="mt-3 inline-flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
        Consentimiento aceptado el {formatoFechaHora(aceptadoAt)} (al agendar)
      </p>
    ) : (
      <p className="mt-3 border-t border-white/10 pt-3 text-xs text-amber-300">Aún no hay consentimiento informado aceptado.</p>
    );
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Consentimiento informado</div>
      {consentimientos.map((c) => (
        <button
          className="flex items-start gap-2 text-left text-xs text-slate-300 transition hover:text-white"
          key={c.id}
          onClick={() => setAbierto(c)}
          type="button"
        >
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span>
            Aceptado el {formatoFechaHora(c.aceptadoAt)} · v{c.version}
            {c.esMenor ? " · menor de edad" : ""}
            <span className="block text-slate-400">
              Firma: {c.firmantes.map((f) => `${f.nombre}${f.parentesco && f.parentesco !== "Paciente" ? ` (${f.parentesco})` : ""}`).join(", ")}
            </span>
          </span>
        </button>
      ))}

      {abierto ? (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setAbierto(null)} role="dialog">
            <div
              className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/10 bg-slate-900 text-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
                <span className="inline-flex items-center gap-2 font-semibold text-white">
                  <FileText className="h-4 w-4 text-emerald-300" />
                  Consentimiento · {formatoFechaHora(abierto.aceptadoAt)}
                </span>
                <span className="flex gap-2">
                  <button className="p-1.5 text-slate-300 hover:text-white" onClick={() => imprimir(abierto)} title="Imprimir o guardar PDF" type="button">
                    <Printer className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 text-slate-300 hover:text-white" onClick={() => setAbierto(null)} title="Cerrar" type="button">
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </div>
              <div className="overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{abierto.texto}</pre>
                <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
                  {abierto.firmantes.map((f, i) => (
                    <p key={i}>
                      {f.nombre}
                      {f.parentesco ? ` · ${f.parentesco}` : ""}
                      {f.identificacion ? ` · ${f.tipoIdentificacion || "Documento"} ${f.identificacion}` : ""}
                      {f.telefono ? ` · ${f.telefono}` : ""}
                    </p>
                  ))}
                  {abierto.esMenor ? (
                    <p>
                      Declara patria potestad o tutela: {abierto.declaraTutela ? "Sí" : "No"} · Asentimiento del menor:{" "}
                      {abierto.asentimientoMenor ? "Sí" : "No indicado"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
