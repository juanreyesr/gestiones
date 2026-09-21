"use client";

import { Award, Bell, BookOpen, ClipboardList, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatearFechaHora } from "@/lib/cursos/types";
import {
  fetchMisNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  type MiCurso,
  type MiNotificacion,
} from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";

const ICONOS = {
  contenido: BookOpen,
  tarea: ClipboardList,
  calificacion: Award,
  mensaje: MessageCircle,
} as const;

function textoDetalle(notificacion: MiNotificacion, semanaLabel: string): string | null {
  const meta = notificacion.meta;
  if (notificacion.tipo === "contenido") {
    const numero = typeof meta.numero === "number" ? meta.numero : null;
    const titulo = typeof meta.titulo === "string" ? meta.titulo : null;
    if (numero === null) return titulo;
    return `${semanaLabel} ${numero}${titulo ? ` — ${titulo}` : ""}`;
  }
  if (notificacion.tipo === "tarea" || notificacion.tipo === "calificacion") {
    return typeof meta.titulo === "string" ? meta.titulo : null;
  }
  return typeof meta.extracto === "string" ? meta.extracto : null;
}

export function NotificacionesModal({
  cursos,
  onAbrirChat,
  onAbrirCurso,
  onClose,
  onLeido,
}: {
  cursos: MiCurso[];
  onAbrirChat: () => void;
  onAbrirCurso: (curso: MiCurso) => void;
  onClose: () => void;
  onLeido: () => void | Promise<void>;
}) {
  const [notificaciones, setNotificaciones] = useState<MiNotificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const { t } = useIdioma();

  const cargar = useCallback(async () => {
    const { data } = await fetchMisNotificaciones();
    setNotificaciones(data);
  }, []);

  useEffect(() => {
    (async () => {
      setCargando(true);
      await cargar();
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se ejecuta al montar
  }, []);

  const handleClickNotificacion = async (notificacion: MiNotificacion) => {
    if (!notificacion.leida) {
      setNotificaciones((prev) => prev.map((n) => (n.id === notificacion.id ? { ...n, leida: true } : n)));
      await marcarNotificacionLeida(notificacion.id);
      await onLeido();
    }
    if (notificacion.tipo === "mensaje") {
      onAbrirChat();
      return;
    }
    const curso = cursos.find((c) => c.cursoId === notificacion.cursoId);
    if (curso) onAbrirCurso(curso);
  };

  const handleMarcarTodas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await marcarTodasNotificacionesLeidas();
    await onLeido();
  };

  const hayNoLeidas = notificaciones.some((n) => !n.leida);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20 sm:items-center sm:pt-4" onClick={onClose}>
      <div
        className="flex max-h-[75vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">{t("notif_titulo")}</h3>
          </div>
          {hayNoLeidas ? (
            <button className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => void handleMarcarTodas()} type="button">
              {t("notif_marcar_todas")}
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("central_cargando")}</p>
          ) : notificaciones.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("notif_vacio")}</p>
          ) : (
            <div className="grid gap-1.5">
              {notificaciones.map((notificacion) => {
                const Icono = ICONOS[notificacion.tipo];
                const detalle = textoDetalle(notificacion, t("lista_semana"));
                return (
                  <button
                    className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                      notificacion.leida ? "" : "bg-slate-50"
                    }`}
                    key={notificacion.id}
                    onClick={() => void handleClickNotificacion(notificacion)}
                    type="button"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        notificacion.leida ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white"
                      }`}
                    >
                      <Icono className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${notificacion.leida ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                        {t(`notif_tipo_${notificacion.tipo}`)}
                      </span>
                      {notificacion.cursoNombre || detalle ? (
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {[notificacion.cursoNombre, detalle].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{formatearFechaHora(notificacion.creadoEn)}</span>
                    </span>
                    {!notificacion.leida ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
