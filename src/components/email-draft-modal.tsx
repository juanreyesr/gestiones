"use client";

import { Mail, X } from "lucide-react";
import { useState } from "react";
import { ModalPortal } from "./modal-portal";

export function EmailDraftModal(props: {
  body: string;
  correo: string | null | undefined;
  onClose: () => void;
  open: boolean;
  setBody: (value: string) => void;
  setSubject: (value: string) => void;
  subject: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!props.open) return null;

  const handleCopy = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        console.warn("Clipboard API not available");
        return;
      }
      await navigator.clipboard.writeText(`Asunto: ${props.subject}\n\n${props.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const mailtoHref = props.correo
    ? `mailto:${encodeURIComponent(props.correo)}?subject=${encodeURIComponent(props.subject)}&body=${encodeURIComponent(props.body)}`
    : undefined;
  const mailtoTooLong = Boolean(mailtoHref && mailtoHref.length > 2000);

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={props.onClose}>
        <div
          className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Mail className="h-5 w-5 text-sky-300" />
              Correo para el docente
            </h3>
            <button onClick={props.onClose} type="button">
              <X className="h-5 w-5 text-slate-400 hover:text-white" />
            </button>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Asunto</span>
              <input className="field" onChange={(event) => props.setSubject(event.target.value)} value={props.subject} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Cuerpo del correo</span>
              <textarea
                className="field min-h-72 resize-y"
                onChange={(event) => props.setBody(event.target.value)}
                value={props.body}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
              onClick={handleCopy}
              type="button"
            >
              {copied ? "Copiado!" : "Copiar texto"}
            </button>
            {mailtoHref ? (
              <div className="flex flex-col gap-1">
                <a
                  className={`inline-flex items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-bold text-slate-100 transition hover:border-white/30 ${
                    mailtoTooLong ? "pointer-events-none opacity-40" : ""
                  }`}
                  href={mailtoTooLong ? undefined : mailtoHref}
                  title={mailtoTooLong ? "El correo es muy largo para abrirlo directamente. Usa \"Copiar texto\" en su lugar." : undefined}
                >
                  Abrir en tu correo
                </a>
                {mailtoTooLong ? (
                  <span className="text-xs text-amber-300">
                    El correo es muy largo para abrirlo directamente en tu cliente de correo. Copia el texto y pegalo manualmente.
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Agrega el correo del docente para habilitar &quot;Abrir en tu correo&quot;.</span>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
