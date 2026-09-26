"use client";

import { Bell, ExternalLink, Link2Off, RefreshCw, Send, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { NOTIFICACIONES, type Preferencias, type TipoNotificacion } from "@/lib/telegram-tipos";
import { ModalPortal } from "./modal-portal";

type Estado = {
  configurado: boolean;
  faltan: string[];
  usuario?: string | null;
  vinculado?: boolean;
  chatNombre?: string | null;
  vinculadoEn?: string | null;
  preferencias?: Preferencias;
  webhook?: { activo: boolean; ultimoError: string | null };
};

async function llamar<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: sesion } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = sesion.session?.access_token;
  if (!token) return { data: null, error: "Sesión no válida. Vuelve a iniciar." };
  try {
    const response = await fetch("/api/telegram/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok) return { data: null, error: json?.error ?? "No se pudo completar la operación." };
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "Error de conexión." };
  }
}

/**
 * Conecta GestionesJJ con un bot privado de Telegram: vincula el chat con un
 * enlace de un solo uso (o su QR), elige que avisos llegan y prueba el envio.
 */
export function TelegramModal({ onClose, open }: { onClose: () => void; open: boolean }) {
  // Se monta solo mientras esta abierto: cada apertura parte de un estado limpio.
  return open ? <TelegramPanel onClose={onClose} /> : null;
}

function TelegramPanel({ onClose }: { onClose: () => void }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enlace, setEnlace] = useState<{ url: string; qr: string } | null>(null);

  const aplicarEstado = useCallback((resultado: { data: Estado | null; error: string | null }) => {
    setCargando(false);
    setError(resultado.error ?? "");
    if (!resultado.error) {
      setEstado(resultado.data);
      if (resultado.data?.vinculado) setEnlace(null);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    aplicarEstado(await llamar<Estado>({ accion: "estado" }));
  }, [aplicarEstado]);

  useEffect(() => {
    let vigente = true;
    void llamar<Estado>({ accion: "estado" }).then((resultado) => {
      if (vigente) aplicarEstado(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [aplicarEstado]);

  const vincular = async () => {
    setCargando(true);
    setError("");
    setAviso("");
    const { data, error: err } = await llamar<{ enlace: string }>({ accion: "vincular" });
    setCargando(false);
    if (err || !data) {
      setError(err ?? "No se pudo generar el enlace.");
      return;
    }
    const qr = await QRCode.toDataURL(data.enlace, { margin: 1, width: 240 }).catch(() => "");
    setEnlace({ url: data.enlace, qr });
  };

  const accionSimple = async (accion: "prueba" | "desvincular", mensajeOk: string) => {
    setCargando(true);
    setError("");
    setAviso("");
    const { error: err } = await llamar({ accion });
    setCargando(false);
    if (err) setError(err);
    else {
      setAviso(mensajeOk);
      if (accion === "desvincular") void cargar();
    }
  };

  const cambiarPreferencia = async (id: TipoNotificacion, valor: boolean) => {
    if (!estado?.preferencias) return;
    const anterior = estado.preferencias;
    setEstado({ ...estado, preferencias: { ...anterior, [id]: valor } });
    const { error: err } = await llamar({ accion: "preferencias", preferencias: { [id]: valor } });
    if (err) {
      setError(err);
      setEstado((actual) => (actual ? { ...actual, preferencias: anterior } : actual));
    }
  };

  return (
    <ModalPortal>
      <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Send className="h-5 w-5 text-sky-300" />
              Conectar Telegram
            </h3>
            <button onClick={onClose} type="button">
              <X className="h-5 w-5 text-slate-400 hover:text-white" />
            </button>
          </div>

          {!estado && cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

          {estado && !estado.configurado ? (
            <div className="grid gap-3 text-sm leading-6 text-slate-300">
              <p>Falta configurar el bot en el servidor. Define en Vercel estas variables y vuelve a desplegar:</p>
              <ul className="list-disc pl-5 font-mono text-xs text-amber-200">
                {estado.faltan.map((variable) => (
                  <li key={variable}>{variable}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">
                El token se obtiene de @BotFather en Telegram (/newbot). Los pasos completos están en el README, sección
                “Telegram”.
              </p>
            </div>
          ) : null}

          {estado?.configurado ? (
            <div className="grid gap-4">
              <div className="border border-white/10 bg-white/5 p-3 text-sm">
                {estado.vinculado ? (
                  <p className="text-emerald-200">
                    ✅ Vinculado con <b>{estado.chatNombre}</b>
                    {estado.vinculadoEn ? ` desde ${new Date(estado.vinculadoEn).toLocaleDateString("es-GT")}` : ""}.
                  </p>
                ) : (
                  <p className="text-slate-300">Aún no hay un chat de Telegram vinculado.</p>
                )}
                {estado.usuario ? <p className="mt-1 text-xs text-slate-400">Bot: @{estado.usuario}</p> : null}
                {estado.webhook?.ultimoError ? (
                  <p className="mt-1 text-xs text-amber-300">Último error del webhook: {estado.webhook.ultimoError}</p>
                ) : null}
              </div>

              {enlace ? (
                <div className="grid justify-items-center gap-3 border border-sky-400/30 bg-sky-400/10 p-4 text-center text-sm text-sky-100">
                  <p>Abre el enlace en el teléfono donde tienes Telegram (o escanea el QR) y pulsa <b>Iniciar</b>. Vence en 15 minutos.</p>
                  {enlace.qr ? <img alt="QR para vincular Telegram" className="h-48 w-48 bg-white" src={enlace.qr} /> : null}
                  <a
                    className="inline-flex items-center gap-2 border border-sky-300/40 bg-sky-400/20 px-4 py-2 font-semibold text-white hover:bg-sky-400/30"
                    href={enlace.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Telegram
                  </a>
                  <button
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
                    onClick={() => void cargar()}
                    type="button"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Ya lo abrí, comprobar
                  </button>
                </div>
              ) : null}

              {estado.vinculado && estado.preferencias ? (
                <div className="grid gap-2">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <Bell className="h-3.5 w-3.5" />
                    Avisos que llegan a Telegram
                  </p>
                  {NOTIFICACIONES.map((item) => (
                    <label className="flex items-center gap-3 text-sm text-slate-200" key={item.id}>
                      <input
                        checked={estado.preferencias![item.id]}
                        className="h-4 w-4 accent-sky-400"
                        onChange={(event) => void cambiarPreferencia(item.id, event.target.checked)}
                        type="checkbox"
                      />
                      {item.etiqueta}
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 border border-sky-300/40 bg-sky-400/15 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400/25 disabled:opacity-60"
                  disabled={cargando}
                  onClick={() => void vincular()}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                  {estado.vinculado ? "Vincular otro chat" : "Vincular Telegram"}
                </button>
                {estado.vinculado ? (
                  <>
                    <button
                      className="inline-flex items-center gap-2 border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-white/30 disabled:opacity-60"
                      disabled={cargando}
                      onClick={() => void accionSimple("prueba", "Mensaje de prueba enviado. Revisa Telegram.")}
                      type="button"
                    >
                      <Bell className="h-4 w-4" />
                      Enviar prueba
                    </button>
                    <button
                      className="inline-flex items-center gap-2 border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/20 disabled:opacity-60"
                      disabled={cargando}
                      onClick={() => void accionSimple("desvincular", "Telegram desvinculado.")}
                      type="button"
                    >
                      <Link2Off className="h-4 w-4" />
                      Desvincular
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {aviso ? <p className="mt-3 border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{aviso}</p> : null}
          {error ? <p className="mt-3 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
        </div>
      </div>
    </ModalPortal>
  );
}
