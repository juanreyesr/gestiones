"use client";

import { CalendarCheck2, CalendarDays, ChevronLeft, Clock, HeartPulse, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { agruparSlotsPorDia, formatoFechaLarga, formatoHora, type SlotPublico } from "@/lib/clinica/slots";

type Paso = "cargando" | "inactivo" | "dia" | "hora" | "datos" | "enviado";

type BookingInfo = { activo: boolean; duracionMin: number; zonaHoraria: string };

export function BookingPage() {
  const [paso, setPaso] = useState<Paso>("cargando");
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [slots, setSlots] = useState<SlotPublico[]>([]);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [slotElegido, setSlotElegido] = useState<SlotPublico | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [empresa, setEmpresa] = useState(""); // honeypot
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const infoRes = await fetch("/api/booking/info");
      const infoData = (await infoRes.json()) as BookingInfo;
      if (!infoRes.ok || !infoData.activo) {
        setPaso("inactivo");
        return;
      }
      setInfo(infoData);

      const desde = new Date();
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + 45);
      const slotsRes = await fetch(
        `/api/booking/slots?desde=${desde.toISOString().slice(0, 10)}&hasta=${hasta.toISOString().slice(0, 10)}`
      );
      if (!slotsRes.ok) {
        setPaso("inactivo");
        return;
      }
      const slotsData = (await slotsRes.json()) as { slots: SlotPublico[] };
      setSlots(slotsData.slots);
      setPaso("dia");
    } catch {
      setPaso("inactivo");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const porDia = useMemo(() => agruparSlotsPorDia(slots), [slots]);
  const dias = useMemo(() => Array.from(porDia.keys()).sort(), [porDia]);

  const handleEnviar = async () => {
    if (enviando) return;
    if (!slotElegido || nombre.trim().length === 0 || telefono.trim().length === 0) {
      setError("El nombre y el teléfono son obligatorios.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const response = await fetch("/api/booking/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim() || null,
          motivo: motivo.trim() || null,
          inicio: slotElegido.inicio,
          empresa,
        }),
      });
      setEnviando(false);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "No se pudo enviar la solicitud. Intente de nuevo.");
        if (response.status === 409 || response.status === 422) {
          // El horario pudo haberse ocupado: recargar disponibilidad.
          void cargar();
        }
        return;
      }
      setPaso("enviado");
    } catch {
      setEnviando(false);
      setError("Error de conexión. Intente de nuevo.");
    }
  };

  return (
    <main className="relative min-h-screen bg-[#08111f] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(16_185_129/0.12),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23/0.4),rgb(2_6_23/0.9))]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-emerald-300/30 bg-emerald-300/10">
            <HeartPulse className="h-7 w-7 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Agendar una cita</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Elige el día y la hora que mejor te convenga. Tu solicitud será confirmada personalmente.
          </p>
        </header>

        <div className="border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-7">
          {paso === "cargando" ? (
            <p className="py-10 text-center text-sm text-slate-400">Cargando disponibilidad...</p>
          ) : null}

          {paso === "inactivo" ? (
            <div className="grid gap-3 py-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-500" />
              <p className="text-base font-semibold text-white">El agendamiento en línea no está disponible</p>
              <p className="text-sm leading-6 text-slate-400">
                Por el momento no es posible agendar citas desde esta página. Por favor comunícate directamente para
                coordinar tu cita.
              </p>
            </div>
          ) : null}

          {paso === "dia" ? (
            dias.length === 0 ? (
              <div className="grid gap-3 py-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-500" />
                <p className="text-base font-semibold text-white">No hay horarios disponibles</p>
                <p className="text-sm leading-6 text-slate-400">
                  Todos los espacios están ocupados por ahora. Intenta más tarde o comunícate directamente.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">1 · Elige el día</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {dias.map((dia) => {
                    const slotsDia = porDia.get(dia) ?? [];
                    return (
                      <button
                        key={dia}
                        className="flex items-center justify-between gap-3 border border-white/10 bg-white/4 p-4 text-left transition hover:border-emerald-300/60 hover:bg-white/8"
                        onClick={() => {
                          setDiaElegido(dia);
                          setPaso("hora");
                        }}
                        type="button"
                      >
                        <span className="text-sm font-semibold capitalize text-white">
                          {formatoFechaLarga(slotsDia[0].inicio)}
                        </span>
                        <span className="shrink-0 border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                          {slotsDia.length} {slotsDia.length === 1 ? "horario" : "horarios"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ) : null}

          {paso === "hora" && diaElegido ? (
            <div className="grid gap-4">
              <button
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-200"
                onClick={() => setPaso("dia")}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Cambiar de día
              </button>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                2 · Elige la hora ·{" "}
                <span className="capitalize text-white">{formatoFechaLarga((porDia.get(diaElegido) ?? [])[0]?.inicio ?? "")}</span>
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(porDia.get(diaElegido) ?? []).map((slot) => (
                  <button
                    key={slot.inicio}
                    className="flex items-center justify-center gap-2 border border-white/10 bg-white/4 px-3 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/60 hover:bg-emerald-300/10"
                    onClick={() => {
                      setSlotElegido(slot);
                      setPaso("datos");
                    }}
                    type="button"
                  >
                    <Clock className="h-4 w-4 text-emerald-300" />
                    {formatoHora(slot.inicio)}
                  </button>
                ))}
              </div>
              {info ? (
                <p className="text-xs text-slate-500">Cada sesión dura {info.duracionMin} minutos.</p>
              ) : null}
            </div>
          ) : null}

          {paso === "datos" && slotElegido ? (
            <div className="grid gap-4">
              <button
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-200"
                onClick={() => setPaso("hora")}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Cambiar de hora
              </button>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">3 · Tus datos</h2>
              <div className="border border-emerald-300/30 bg-emerald-300/8 p-3 text-sm text-emerald-200">
                <span className="capitalize">{formatoFechaLarga(slotElegido.inicio)}</span> · {formatoHora(slotElegido.inicio)}
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-400">Nombre completo *</span>
                <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-400">Teléfono *</span>
                <input className="field" onChange={(event) => setTelefono(event.target.value)} value={telefono} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-400">Correo electrónico</span>
                <input className="field" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-400">¿Qué te gustaría abordar? (opcional)</span>
                <textarea
                  className="field resize-y"
                  maxLength={500}
                  onChange={(event) => setMotivo(event.target.value)}
                  rows={3}
                  value={motivo}
                />
              </label>
              {/* Honeypot anti-bots: invisible para personas */}
              <input
                aria-hidden
                autoComplete="off"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                name="empresa"
                onChange={(event) => setEmpresa(event.target.value)}
                tabIndex={-1}
                value={empresa}
              />

              {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

              <button
                className="inline-flex items-center justify-center gap-2 bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
                disabled={enviando || nombre.trim().length === 0 || telefono.trim().length === 0}
                onClick={handleEnviar}
                type="button"
              >
                <Send className="h-4 w-4" />
                {enviando ? "Enviando solicitud..." : "Solicitar cita"}
              </button>
            </div>
          ) : null}

          {paso === "enviado" && slotElegido ? (
            <div className="grid gap-3 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-emerald-300/40 bg-emerald-300/10">
                <CalendarCheck2 className="h-7 w-7 text-emerald-300" />
              </div>
              <p className="text-lg font-semibold text-white">¡Solicitud enviada!</p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-300">
                Tu cita para el <span className="capitalize">{formatoFechaLarga(slotElegido.inicio)}</span> a las{" "}
                {formatoHora(slotElegido.inicio)} quedó pendiente de confirmación. Recibirás la confirmación por
                teléfono o correo.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="mt-6 text-center text-xs text-slate-600">Atención psicológica profesional</footer>
      </div>
    </main>
  );
}
