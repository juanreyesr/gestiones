"use client";

import { GraduationCap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type EstadoBot = { conectado: boolean; username: string | null; telegram: number; push: number };

async function llamar<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: sesion } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = sesion.session?.access_token;
  if (!token) return { data: null, error: "Sesión no válida. Vuelve a iniciar." };
  try {
    const response = await fetch("/api/telegram/estudiantes/admin", {
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
 * Bot de Telegram para estudiantes (distinto del bot privado): solo envia
 * avisos de su curso. Se conecta pegando el token de @BotFather.
 */
export function BotEstudiantesSection() {
  const [estado, setEstado] = useState<EstadoBot | null>(null);
  const [token, setToken] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await llamar<EstadoBot>({ accion: "estado" });
    if (data) setEstado(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void cargar();
  }, [cargar]);

  const conectar = async () => {
    setOcupado(true);
    setMensaje(null);
    const { data, error } = await llamar<{ username: string }>({ accion: "conectar", token });
    setOcupado(false);
    if (error || !data) {
      setMensaje({ ok: false, texto: error ?? "No se pudo conectar." });
      return;
    }
    setToken("");
    setMensaje({ ok: true, texto: `Bot @${data.username} conectado. Los estudiantes ya pueden activarlo desde la campana del Aula.` });
    await cargar();
  };

  const desconectar = async () => {
    if (!window.confirm("¿Desconectar el bot de estudiantes? Todos dejarán de recibir avisos por Telegram.")) return;
    setOcupado(true);
    await llamar({ accion: "desconectar" });
    setOcupado(false);
    await cargar();
  };

  if (!estado) return null;

  return (
    <div className="mt-5 grid gap-3 border-t border-white/10 pt-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
        <GraduationCap className="h-3.5 w-3.5" />
        Bot de estudiantes (Aula virtual)
      </p>
      {estado.conectado ? (
        <div className="grid gap-2 text-sm text-slate-300">
          <p>
            ✅ Conectado: <b className="text-white">@{estado.username}</b>
          </p>
          <p className="text-xs text-slate-400">
            Con avisos activos: {estado.telegram} en Telegram · {estado.push} con notificaciones del teléfono o navegador. Al cerrar
            un curso (archivarlo o quitarle el acceso) sus estudiantes dejan de recibir avisos y se cierra su Telegram.
          </p>
          <button
            className="w-fit border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-400/20 disabled:opacity-60"
            disabled={ocupado}
            onClick={() => void desconectar()}
            type="button"
          >
            Desconectar bot de estudiantes
          </button>
        </div>
      ) : (
        <div className="grid gap-2 text-sm text-slate-300">
          <p className="text-xs leading-5 text-slate-400">
            En Telegram abre <b>@BotFather</b> → /newbot, ponle un nombre (p. ej. «Aula virtual JJ») y pega aquí el token que te da.
            Es un bot aparte: los estudiantes solo reciben avisos de su curso y nunca ven tu bot privado.
          </p>
          <input
            autoComplete="off"
            className="field font-mono text-xs"
            onChange={(event) => setToken(event.target.value)}
            placeholder="123456789:AA..."
            value={token}
          />
          <button
            className="w-fit border border-sky-300/40 bg-sky-400/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400/25 disabled:opacity-60"
            disabled={ocupado || !token.trim()}
            onClick={() => void conectar()}
            type="button"
          >
            {ocupado ? "Conectando…" : "Conectar bot de estudiantes"}
          </button>
        </div>
      )}
      {mensaje ? <p className={`text-xs ${mensaje.ok ? "text-emerald-200" : "text-red-200"}`}>{mensaje.texto}</p> : null}
    </div>
  );
}
