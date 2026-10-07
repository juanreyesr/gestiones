"use client";

import { BellRing, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type EstadoAvisos, llamarAvisos } from "@/lib/estudiante/estudiante-client";
import { useIdioma } from "./idioma-context";

const SW_URL = "/sw-aula.js";
const SW_SCOPE = "/estudiante";

function claveABytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const datos = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(datos, (c) => c.charCodeAt(0));
}

function soportaPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function esIosSinInstalar() {
  if (typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  return ios && !instalada;
}

async function suscripcionActual() {
  if (!soportaPush()) return null;
  const registro = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  return (await registro?.pushManager.getSubscription()) ?? null;
}

/**
 * Activar avisos fuera del Aula: Telegram (bot de estudiantes) y las
 * notificaciones de este navegador o telefono. Va arriba de la lista de
 * notificaciones. Solo aparece si el estudiante tiene un curso activo.
 */
export function AvisosEstudiante() {
  const { t } = useIdioma();
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [pushAqui, setPushAqui] = useState(false);
  const [enlaceTelegram, setEnlaceTelegram] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"telegram" | "push" | null>(null);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    const [{ data }, suscripcion] = await Promise.all([llamarAvisos<EstadoAvisos>({ accion: "estado" }), suscripcionActual()]);
    if (data) setEstado(data);
    setPushAqui(Boolean(suscripcion));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void cargar();
    // Al volver de Telegram se actualiza el estado.
    const alVolver = () => void cargar();
    window.addEventListener("focus", alVolver);
    return () => window.removeEventListener("focus", alVolver);
  }, [cargar]);

  if (!estado?.tieneCurso) return null;
  const telegramDisponible = estado.telegram.disponible;
  const pushDisponible = Boolean(estado.push.clave);
  if (!telegramDisponible && !pushDisponible) return null;

  const activarTelegram = async () => {
    setOcupado("telegram");
    setAviso("");
    const { data, error } = await llamarAvisos<{ url: string }>({ accion: "telegram" });
    setOcupado(null);
    if (error || !data) {
      setAviso(error ?? "");
      return;
    }
    setEnlaceTelegram(data.url);
    window.open(data.url, "_blank", "noopener");
  };

  const desactivarTelegram = async () => {
    setOcupado("telegram");
    await llamarAvisos({ accion: "telegram-desactivar" });
    setOcupado(null);
    setEnlaceTelegram(null);
    await cargar();
  };

  const activarPush = async () => {
    setAviso("");
    if (!soportaPush()) {
      setAviso(t(esIosSinInstalar() ? "avisos_dispositivo_ios" : "avisos_dispositivo_no_soportado"));
      return;
    }
    setOcupado("push");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setAviso(t("avisos_dispositivo_bloqueado"));
        return;
      }
      const registro = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(estado.push.clave!) }));
      const { error } = await llamarAvisos({ accion: "push-suscribir", suscripcion: suscripcion.toJSON() });
      if (error) setAviso(error);
      await cargar();
    } catch {
      setAviso(t(esIosSinInstalar() ? "avisos_dispositivo_ios" : "avisos_dispositivo_no_soportado"));
    } finally {
      setOcupado(null);
    }
  };

  const desactivarPush = async () => {
    setOcupado("push");
    const suscripcion = await suscripcionActual();
    if (suscripcion) {
      await llamarAvisos({ accion: "push-cancelar", endpoint: suscripcion.endpoint });
      await suscripcion.unsubscribe().catch(() => undefined);
    }
    setOcupado(null);
    await cargar();
  };

  const boton = "rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60";
  const activo = "border border-emerald-300 bg-emerald-50 text-emerald-700";

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">{t("avisos_titulo")}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{t("avisos_sub")}</p>
      <div className="mt-2.5 grid gap-2">
        {telegramDisponible ? (
          <div className="flex flex-wrap items-center gap-2">
            <Send className="h-4 w-4 text-sky-500" />
            {estado.telegram.vinculado ? (
              <>
                <span className={`${boton} ${activo}`}>✓ {t("avisos_telegram_activo")}</span>
                <button className={`${boton} text-slate-500 hover:text-slate-800`} disabled={ocupado !== null} onClick={desactivarTelegram} type="button">
                  {t("avisos_desactivar")}
                </button>
              </>
            ) : (
              <>
                <button
                  className={`${boton} bg-sky-500 text-white hover:bg-sky-600`}
                  disabled={ocupado !== null}
                  onClick={activarTelegram}
                  type="button"
                >
                  {t("avisos_telegram_activar")}
                </button>
                {enlaceTelegram ? (
                  <a className="text-xs text-sky-600 underline" href={enlaceTelegram} rel="noreferrer" target="_blank">
                    {t("avisos_telegram_pasos")}
                  </a>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {pushDisponible ? (
          <div className="flex flex-wrap items-center gap-2">
            <BellRing className="h-4 w-4 text-emerald-500" />
            {pushAqui ? (
              <>
                <span className={`${boton} ${activo}`}>✓ {t("avisos_dispositivo_activo")}</span>
                <button className={`${boton} text-slate-500 hover:text-slate-800`} disabled={ocupado !== null} onClick={desactivarPush} type="button">
                  {t("avisos_desactivar")}
                </button>
              </>
            ) : (
              <button
                className={`${boton} bg-slate-900 text-white hover:bg-slate-700`}
                disabled={ocupado !== null}
                onClick={activarPush}
                type="button"
              >
                {t("avisos_dispositivo_activar")}
              </button>
            )}
          </div>
        ) : null}
      </div>
      {aviso ? <p className="mt-2 text-xs text-amber-700">{aviso}</p> : null}
      <p className="mt-2 text-[11px] text-slate-400">{t("avisos_cerrar_curso")}</p>
    </div>
  );
}
