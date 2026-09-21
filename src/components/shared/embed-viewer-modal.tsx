"use client";

import { X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";
import type { EmbedInfo } from "@/lib/estudiante/embed-links";

/** Visor embebido compartido (Prezi, YouTube, Drive), usado tanto en el panel admin como en el del estudiante. */
export function EmbedViewerModal({ embed, onClose, titulo }: { embed: EmbedInfo; onClose: () => void; titulo: string }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:border-white/50" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 px-4 pb-4">
          <iframe
            allow="autoplay; fullscreen"
            allowFullScreen
            className="h-full w-full rounded-lg border-0 bg-white"
            src={embed.embedUrl}
            title={titulo}
          />
        </div>
      </div>
    </ModalPortal>
  );
}
