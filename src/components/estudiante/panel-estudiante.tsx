"use client";

import { Bell, GraduationCap, KeyRound, LogOut, MessageCircle, UserCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchMisMensajesNoLeidos,
  fetchMisNotificacionesNoLeidas,
  guardarIdioma,
  logoutEstudiante,
  type MiCurso,
  type MiPerfil,
} from "@/lib/estudiante/estudiante-client";
import { CambiarContrasenaModal } from "./cambiar-contrasena-modal";
import { ChatModal } from "./chat-modal";
import { CursoEstudianteDetalle } from "./curso-estudiante-detalle";
import { useIdioma } from "./idioma-context";
import { NotificacionesModal } from "./notificaciones-modal";
import { PerfilModal } from "./perfil-modal";
import { SelectorIdioma } from "./selector-idioma";

export function PanelEstudiante({
  cursos,
  onCambioContrasena,
  perfil,
}: {
  cursos: MiCurso[];
  onCambioContrasena: () => void | Promise<void>;
  perfil: MiPerfil;
}) {
  const [modalContrasenaAbierto, setModalContrasenaAbierto] = useState(perfil.debeCambiarContrasena);
  const [cursoAbierto, setCursoAbierto] = useState<MiCurso | null>(null);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const { t } = useIdioma();

  const ESTADO_LABEL: Record<string, string> = {
    activo: t("estado_en_curso"),
    finalizado: t("estado_finalizado"),
    archivado: t("estado_archivado"),
  };

  const cargarNoLeidos = useCallback(async () => {
    const { data } = await fetchMisMensajesNoLeidos();
    setMensajesNoLeidos(data);
  }, []);

  const cargarNotificacionesNoLeidas = useCallback(async () => {
    const { data } = await fetchMisNotificacionesNoLeidas();
    setNotificacionesNoLeidas(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consulta inicial de mensajes/notificaciones sin leer al montar el panel
    void cargarNoLeidos();
    void cargarNotificacionesNoLeidas();
    const interval = setInterval(() => {
      void cargarNoLeidos();
      void cargarNotificacionesNoLeidas();
    }, 15000);
    return () => clearInterval(interval);
  }, [cargarNoLeidos, cargarNotificacionesNoLeidas]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-10">
        <div className="flex items-center gap-2 text-slate-500">
          <GraduationCap className="h-5 w-5" />
          <span className="text-sm font-medium">GestionesJJ</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold text-slate-900">
              {t("panel_saludo")}, {perfil.nombre.split(" ")[0]}
            </p>
            <p className="truncate text-xs text-slate-400">{perfil.correo}</p>
          </div>
          <SelectorIdioma onChange={(nuevo) => void guardarIdioma(nuevo)} />
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            onClick={() => setNotificacionesAbiertas(true)}
            title={t("notif_titulo")}
            type="button"
          >
            <Bell className="h-4 w-4" />
            {notificacionesNoLeidas > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                {notificacionesNoLeidas}
              </span>
            ) : null}
          </button>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            onClick={() => setChatAbierto(true)}
            title={t("panel_chat_titulo")}
            type="button"
          >
            <MessageCircle className="h-4 w-4" />
            {mensajesNoLeidos > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                {mensajesNoLeidos}
              </span>
            ) : null}
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            onClick={() => setPerfilAbierto(true)}
            title={t("perfil_titulo")}
            type="button"
          >
            <UserCircle2 className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            onClick={() => setModalContrasenaAbierto(true)}
            title={t("panel_cambiar_contrasena")}
            type="button"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            onClick={() => logoutEstudiante()}
            title={t("panel_salir")}
            type="button"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
        {cursoAbierto ? (
          <CursoEstudianteDetalle curso={cursoAbierto} onVolver={() => setCursoAbierto(null)} />
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-slate-900">{t("panel_mis_cursos")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("panel_mis_cursos_sub")}</p>

            {cursos.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-sm text-slate-500">
                  {t("panel_sin_cursos_1")}
                  <br />
                  {t("panel_sin_cursos_2")}
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {cursos.map((curso) => (
                  <button
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    key={curso.cursoId}
                    onClick={() => setCursoAbierto(curso)}
                    type="button"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{curso.universidadNombre}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{curso.cursoNombre}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {[curso.cursoCodigo, curso.periodo].filter(Boolean).join(" · ") || t("panel_sin_datos")}
                    </p>
                    {curso.docenteNombre ? (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {t("panel_docente")}: {curso.docenteNombre}
                      </p>
                    ) : null}
                    <span className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {ESTADO_LABEL[curso.estado] ?? curso.estado}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {modalContrasenaAbierto ? (
        <CambiarContrasenaModal
          onCambiada={async () => {
            setModalContrasenaAbierto(false);
            await onCambioContrasena();
          }}
          onClose={() => setModalContrasenaAbierto(false)}
        />
      ) : null}

      {chatAbierto ? <ChatModal onClose={() => setChatAbierto(false)} onLeido={cargarNoLeidos} /> : null}

      {perfilAbierto ? <PerfilModal onClose={() => setPerfilAbierto(false)} /> : null}

      {notificacionesAbiertas ? (
        <NotificacionesModal
          cursos={cursos}
          onAbrirChat={() => {
            setNotificacionesAbiertas(false);
            setChatAbierto(true);
          }}
          onAbrirCurso={(curso) => {
            setNotificacionesAbiertas(false);
            setCursoAbierto(curso);
          }}
          onClose={() => setNotificacionesAbiertas(false)}
          onLeido={cargarNotificacionesNoLeidas}
        />
      ) : null}
    </div>
  );
}
