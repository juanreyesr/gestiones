"use client";

import { CheckCircle2, PartyPopper, Send, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type PreguntaPublica = {
  id: string;
  tipo: "opcion_multiple" | "nube_palabras" | "abierta" | "escala";
  texto: string;
  opciones: Array<{ id: string; texto: string }> | null;
  escalaMin: number | null;
  escalaMax: number | null;
};

type Paso = "pin" | "verificando" | "invalido" | "apodo" | "esperando" | "pregunta" | "respondido" | "cerrada";

const PIN_RE = /^\d{6}$/;

export function VivoPage({ pinInicial }: { pinInicial?: string }) {
  const [paso, setPaso] = useState<Paso>("pin");
  const [pin, setPin] = useState(pinInicial ?? "");
  const [recursoTitulo, setRecursoTitulo] = useState("");
  const [apodo, setApodo] = useState("");
  const [participanteId, setParticipanteId] = useState<string | null>(null);
  const [participantesCount, setParticipantesCount] = useState(0);
  const [pregunta, setPregunta] = useState<PreguntaPublica | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const preguntaAnteriorId = useRef<string | null>(null);

  const verificarPin = useCallback(async (pinValor: string) => {
    setError("");
    setPaso("verificando");
    try {
      const res = await fetch(`/api/recursos/sesion?pin=${pinValor}`);
      const data = (await res.json().catch(() => null)) as { recursoTitulo?: string; error?: string } | null;
      if (!res.ok || !data) {
        setError(data?.error ?? "El PIN no es válido.");
        setPaso("invalido");
        return;
      }
      setRecursoTitulo(data.recursoTitulo ?? "");
      setPin(pinValor);
      setPaso("apodo");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setPaso("invalido");
    }
  }, []);

  useEffect(() => {
    if (pinInicial && PIN_RE.test(pinInicial)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- verifica el PIN recibido por la URL al montar
      void verificarPin(pinInicial);
    }
  }, [pinInicial, verificarPin]);

  const handleUnirse = async () => {
    if (!apodo.trim()) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/recursos/unirse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, apodo: apodo.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { participanteId?: string; error?: string } | null;
      setEnviando(false);
      if (!res.ok || !data?.participanteId) {
        setError(data?.error ?? "No se pudo unir a la sesión.");
        return;
      }
      setParticipanteId(data.participanteId);
      setPaso("esperando");
    } catch {
      setEnviando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  useEffect(() => {
    if (!participanteId) return;

    let activo = true;

    const consultar = async () => {
      try {
        const res = await fetch(`/api/recursos/estado?participanteId=${participanteId}`);
        const data = (await res.json().catch(() => null)) as {
          estado?: string;
          participantesCount?: number;
          pregunta?: PreguntaPublica | null;
          yaRespondio?: boolean;
        } | null;
        if (!activo || !data) return;

        setParticipantesCount(data.participantesCount ?? 0);

        if (data.estado === "cerrada") {
          setPaso("cerrada");
          return;
        }

        if (data.estado === "espera" || !data.pregunta) {
          setPaso((actual) => (actual === "respondido" || actual === "esperando" ? actual : "esperando"));
          if (!data.pregunta) preguntaAnteriorId.current = null;
          return;
        }

        if (data.pregunta.id !== preguntaAnteriorId.current) {
          preguntaAnteriorId.current = data.pregunta.id;
          setPregunta(data.pregunta);
          setRespuestaTexto("");
          setPaso(data.yaRespondio ? "respondido" : "pregunta");
        } else if (data.yaRespondio) {
          setPaso("respondido");
        }
      } catch {
        // Se reintenta en el siguiente ciclo.
      }
    };

    void consultar();
    const interval = setInterval(consultar, 1500);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [participanteId]);

  const handleResponder = async (valor: Record<string, unknown>) => {
    if (!pregunta || !participanteId || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/recursos/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId, preguntaId: pregunta.id, valor }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setEnviando(false);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar la respuesta.");
        return;
      }
      setPaso("respondido");
    } catch {
      setEnviando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <main className="relative min-h-screen bg-[#08111f] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(16_185_129/0.12),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23/0.4),rgb(2_6_23/0.9))]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="border border-white/10 bg-white/6 p-6 backdrop-blur-xl sm:p-8">
          {paso === "pin" || paso === "verificando" || paso === "invalido" ? (
            <div className="grid gap-4 text-center">
              <h1 className="text-2xl font-semibold text-white">Únete a la actividad</h1>
              <p className="text-sm text-slate-400">Ingresa el PIN de 6 dígitos que se muestra en pantalla.</p>
              <input
                className="field text-center text-2xl tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && PIN_RE.test(pin)) void verificarPin(pin);
                }}
                placeholder="000000"
                value={pin}
              />
              {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
              <button
                className="inline-flex h-12 items-center justify-center gap-2 bg-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
                disabled={!PIN_RE.test(pin) || paso === "verificando"}
                onClick={() => void verificarPin(pin)}
                type="button"
              >
                {paso === "verificando" ? "Verificando..." : "Continuar"}
              </button>
            </div>
          ) : null}

          {paso === "apodo" ? (
            <div className="grid gap-4 text-center">
              <h1 className="text-xl font-semibold text-white">{recursoTitulo || "Actividad en vivo"}</h1>
              <p className="text-sm text-slate-400">¿Cómo quieres que te vean los demás?</p>
              <input
                autoFocus
                className="field text-center"
                maxLength={40}
                onChange={(event) => setApodo(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && apodo.trim()) void handleUnirse();
                }}
                placeholder="Tu apodo"
                value={apodo}
              />
              {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
              <button
                className="inline-flex h-12 items-center justify-center gap-2 bg-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
                disabled={!apodo.trim() || enviando}
                onClick={() => void handleUnirse()}
                type="button"
              >
                {enviando ? "Entrando..." : "Entrar"}
              </button>
            </div>
          ) : null}

          {paso === "esperando" ? (
            <div className="grid gap-3 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-emerald-300/40 bg-emerald-300/10">
                <Users className="h-7 w-7 text-emerald-300" />
              </div>
              <p className="text-lg font-semibold text-white">¡Estás dentro!</p>
              <p className="text-sm leading-6 text-slate-400">Esperando a que el presentador active una pregunta...</p>
              <p className="text-xs text-slate-500">{participantesCount} participantes conectados</p>
            </div>
          ) : null}

          {paso === "pregunta" && pregunta ? (
            <div className="grid gap-4">
              <p className="text-center text-lg font-semibold leading-6 text-white">{pregunta.texto}</p>

              {pregunta.tipo === "opcion_multiple" && pregunta.opciones ? (
                <div className="grid gap-2">
                  {pregunta.opciones.map((opcion) => (
                    <button
                      className="border border-white/10 bg-white/4 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-emerald-300/60 hover:bg-emerald-300/10 disabled:opacity-50"
                      disabled={enviando}
                      key={opcion.id}
                      onClick={() => void handleResponder({ opcion_id: opcion.id })}
                      type="button"
                    >
                      {opcion.texto}
                    </button>
                  ))}
                </div>
              ) : null}

              {pregunta.tipo === "escala" ? (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from(
                    { length: (pregunta.escalaMax ?? 5) - (pregunta.escalaMin ?? 1) + 1 },
                    (_, index) => (pregunta.escalaMin ?? 1) + index,
                  ).map((valor) => (
                    <button
                      className="flex h-14 items-center justify-center border border-white/10 bg-white/4 text-lg font-bold text-white transition hover:border-emerald-300/60 hover:bg-emerald-300/10 disabled:opacity-50"
                      disabled={enviando}
                      key={valor}
                      onClick={() => void handleResponder({ valor })}
                      type="button"
                    >
                      {valor}
                    </button>
                  ))}
                </div>
              ) : null}

              {pregunta.tipo === "abierta" || pregunta.tipo === "nube_palabras" ? (
                <div className="grid gap-2">
                  <input
                    autoFocus
                    className="field"
                    maxLength={pregunta.tipo === "nube_palabras" ? 40 : 500}
                    onChange={(event) => setRespuestaTexto(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && respuestaTexto.trim()) void handleResponder({ texto: respuestaTexto.trim() });
                    }}
                    placeholder={pregunta.tipo === "nube_palabras" ? "Una palabra o frase corta" : "Tu respuesta"}
                    value={respuestaTexto}
                  />
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
                    disabled={!respuestaTexto.trim() || enviando}
                    onClick={() => void handleResponder({ texto: respuestaTexto.trim() })}
                    type="button"
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </button>
                </div>
              ) : null}

              {error ? <p className="text-center text-sm font-semibold text-red-300">{error}</p> : null}
            </div>
          ) : null}

          {paso === "respondido" ? (
            <div className="grid gap-3 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-emerald-300/40 bg-emerald-300/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-300" />
              </div>
              <p className="text-lg font-semibold text-white">¡Respuesta enviada!</p>
              <p className="text-sm leading-6 text-slate-400">Espera la siguiente pregunta.</p>
            </div>
          ) : null}

          {paso === "cerrada" ? (
            <div className="grid gap-3 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-emerald-300/40 bg-emerald-300/10">
                <PartyPopper className="h-7 w-7 text-emerald-300" />
              </div>
              <p className="text-lg font-semibold text-white">La actividad ha terminado</p>
              <p className="text-sm leading-6 text-slate-400">Gracias por participar.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
