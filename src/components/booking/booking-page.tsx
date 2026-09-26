"use client";

import { CalendarCheck2, CalendarDays, ChevronLeft, Clock, HeartPulse, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { agruparSlotsPorDia, claveDiaLocal, formatoFechaLarga, formatoHora, type SlotPublico } from "@/lib/clinica/slots";
import {
  mismaHoraQueConsultorio,
  nombreZona,
  PAISES,
  paisDeZona,
  paisPorCodigo,
  ZONA_CONSULTORIO,
  zonaDelNavegador,
} from "@/lib/paises";

function horaEnGuatemala(iso: string) {
  return new Intl.DateTimeFormat("es-GT", { timeZone: ZONA_CONSULTORIO, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

type Paso = "cargando" | "inactivo" | "dia" | "hora" | "datos" | "enviado";

type BookingInfo = { activo: boolean; duracionMin: number; zonaHoraria: string; consentimientoTexto?: string | null };

export function BookingPage() {
  const [paso, setPaso] = useState<Paso>("cargando");
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [slots, setSlots] = useState<SlotPublico[]>([]);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [slotElegido, setSlotElegido] = useState<SlotPublico | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zonaVisitante] = useState(zonaDelNavegador);
  const [paisTelefono, setPaisTelefono] = useState(() => paisDeZona(zonaDelNavegador()));
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [empresa, setEmpresa] = useState(""); // honeypot
  const [tipoPaciente, setTipoPaciente] = useState<"nuevo" | "existente" | null>(null);
  const [darSeguimiento, setDarSeguimiento] = useState(false);
  const [modalidad, setModalidad] = useState<"presencial" | "virtual" | null>(null);
  const [necesitaUbicacion, setNecesitaUbicacion] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
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
        `/api/booking/slots?desde=${claveDiaLocal(desde)}&hasta=${claveDiaLocal(hasta)}`
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

  const datosCompletos =
    Boolean(slotElegido) &&
    nombre.trim().length > 0 &&
    telefono.trim().length > 0 &&
    tipoPaciente !== null &&
    modalidad !== null &&
    consentimiento;
  // Las sesiones presenciales son en el consultorio, en Guatemala.
  const presencialDisponible = paisTelefono === "GT";

  const handleEnviar = async () => {
    if (enviando) return;
    if (!datosCompletos || !slotElegido) {
      setError("Completa los campos obligatorios y acepta el consentimiento.");
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
          // Se guarda con "+codigo" para que el WhatsApp y el pais del paciente salgan bien.
          telefono: telefono.trim().startsWith("+")
            ? telefono.trim()
            : `+${paisPorCodigo(paisTelefono).prefijo} ${telefono.trim()}`,
          email: email.trim() || null,
          motivo: motivo.trim() || null,
          inicio: slotElegido.inicio,
          consentimiento,
          yaEsPaciente: tipoPaciente === "existente",
          primeraSesion: tipoPaciente === "nuevo",
          darSeguimiento: tipoPaciente === "existente" ? darSeguimiento : false,
          modalidad,
          necesitaUbicacion: modalidad === "presencial" ? necesitaUbicacion : false,
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
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <HeartPulse className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Agendar una cita</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Elige el día y la hora que mejor te convenga. Tu solicitud será confirmada personalmente.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {paso === "cargando" ? (
            <p className="py-10 text-center text-sm text-slate-400">Cargando disponibilidad...</p>
          ) : null}

          {paso === "inactivo" ? (
            <div className="grid gap-3 py-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-base font-semibold text-slate-900">El agendamiento en línea no está disponible</p>
              <p className="text-sm leading-6 text-slate-500">
                Por el momento no es posible agendar citas desde esta página. Por favor comunícate directamente para
                coordinar tu cita.
              </p>
            </div>
          ) : null}

          {paso === "dia" ? (
            dias.length === 0 ? (
              <div className="grid gap-3 py-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-base font-semibold text-slate-900">No hay horarios disponibles</p>
                <p className="text-sm leading-6 text-slate-500">
                  Todos los espacios están ocupados por ahora. Intenta más tarde o comunícate directamente.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1 · Elige el día</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {dias.map((dia) => {
                    const slotsDia = porDia.get(dia) ?? [];
                    return (
                      <button
                        key={dia}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
                        onClick={() => {
                          setDiaElegido(dia);
                          setPaso("hora");
                        }}
                        type="button"
                      >
                        <span className="text-sm font-semibold capitalize text-slate-900">
                          {formatoFechaLarga(slotsDia[0].inicio)}
                        </span>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                onClick={() => setPaso("dia")}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Cambiar de día
              </button>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                2 · Elige la hora ·{" "}
                <span className="capitalize text-slate-900">{formatoFechaLarga((porDia.get(diaElegido) ?? [])[0]?.inicio ?? "")}</span>
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(porDia.get(diaElegido) ?? []).map((slot) => (
                  <button
                    key={slot.inicio}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50"
                    onClick={() => {
                      setSlotElegido(slot);
                      setPaso("datos");
                    }}
                    type="button"
                  >
                    <Clock className="h-4 w-4 text-emerald-600" />
                    {formatoHora(slot.inicio)}
                  </button>
                ))}
              </div>
              {info ? (
                <p className="text-xs text-slate-400">Cada sesión dura {info.duracionMin} minutos.</p>
              ) : null}
              {(porDia.get(diaElegido) ?? [])[0] && !mismaHoraQueConsultorio(zonaVisitante, (porDia.get(diaElegido) ?? [])[0].inicio) ? (
                <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  🌎 Los horarios se muestran en <b>tu hora local</b> ({nombreZona(zonaVisitante)}). El consultorio está en
                  Guatemala.
                </p>
              ) : null}
            </div>
          ) : null}

          {paso === "datos" && slotElegido ? (
            <div className="grid gap-4">
              <button
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                onClick={() => setPaso("hora")}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Cambiar de hora
              </button>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">3 · Tus datos</h2>
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                <span className="capitalize">{formatoFechaLarga(slotElegido.inicio)}</span> · {formatoHora(slotElegido.inicio)}
                {!mismaHoraQueConsultorio(zonaVisitante, slotElegido.inicio) ? (
                  <span className="block text-xs text-emerald-800/80">
                    Tu hora ({nombreZona(zonaVisitante)}). En Guatemala serán las {horaEnGuatemala(slotElegido.inicio)}.
                  </span>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">¿Es tu primera vez? *</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${tipoPaciente === "nuevo" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                    onClick={() => setTipoPaciente("nuevo")}
                    type="button"
                  >
                    Es mi primera sesión
                  </button>
                  <button
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${tipoPaciente === "existente" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                    onClick={() => setTipoPaciente("existente")}
                    type="button"
                  >
                    Ya soy paciente
                  </button>
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Nombre completo *</span>
                <input className="field-light" onChange={(event) => setNombre(event.target.value)} value={nombre} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Teléfono (WhatsApp) *</span>
                <span className="flex gap-2">
                  <select
                    aria-label="País del teléfono"
                    className="field-light w-32 shrink-0"
                    onChange={(event) => {
                      setPaisTelefono(event.target.value);
                      // Fuera de Guatemala solo hay sesiones virtuales.
                      if (event.target.value !== "GT" && modalidad === "presencial") {
                        setModalidad("virtual");
                        setNecesitaUbicacion(false);
                      }
                    }}
                    value={paisTelefono}
                  >
                    {PAISES.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.bandera} +{p.prefijo}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-light min-w-0 flex-1"
                    inputMode="tel"
                    onChange={(event) => setTelefono(event.target.value)}
                    placeholder={paisTelefono === "GT" ? "5555 1234" : "Número"}
                    value={telefono}
                  />
                </span>
              </label>
              <div className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Modalidad de la sesión *</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${modalidad === "presencial" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                    disabled={!presencialDisponible}
                    onClick={() => setModalidad("presencial")}
                    type="button"
                  >
                    🏢 Presencial
                  </button>
                  <button
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${modalidad === "virtual" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                    onClick={() => {
                      setModalidad("virtual");
                      setNecesitaUbicacion(false);
                    }}
                    type="button"
                  >
                    💻 Virtual
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  {presencialDisponible
                    ? "Presencial: en el consultorio, en Guatemala."
                    : "Las sesiones presenciales son solo en Guatemala; desde otro país la sesión es virtual."}
                </span>
                {modalidad === "presencial" ? (
                  <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <input
                      checked={necesitaUbicacion}
                      className="mt-0.5 h-4 w-4 accent-emerald-600"
                      onChange={(event) => setNecesitaUbicacion(event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      <b>Necesito la ubicación</b>
                      <span className="block text-xs text-slate-500">Te enviaremos la dirección por WhatsApp, con enlaces para Waze y Google Maps.</span>
                    </span>
                  </label>
                ) : null}
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Correo electrónico</span>
                <input className="field-light" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
              </label>

              <div className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">¿Qué te gustaría abordar?</span>
                {tipoPaciente === "existente" ? (
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
                    <input
                      checked={darSeguimiento}
                      className="h-4 w-4 accent-emerald-600"
                      onChange={(event) => setDarSeguimiento(event.target.checked)}
                      type="checkbox"
                    />
                    Dar seguimiento a la sesión anterior
                  </label>
                ) : null}
                <textarea
                  className="field-light resize-y"
                  maxLength={500}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder={darSeguimiento ? "Opcional: algo puntual que quieras agregar" : "Cuéntame brevemente el tema (opcional)"}
                  rows={3}
                  value={motivo}
                />
              </div>

              {info?.consentimientoTexto ? (
                <label className="grid cursor-pointer gap-2 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      checked={consentimiento}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                      onChange={(event) => setConsentimiento(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-sm font-semibold text-slate-900">He leído y acepto el consentimiento informado *</span>
                  </div>
                  <p className="max-h-32 overflow-y-auto text-xs leading-5 text-slate-500">{info.consentimientoTexto}</p>
                </label>
              ) : null}

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

              {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                disabled={enviando || !datosCompletos}
                onClick={handleEnviar}
                type="button"
              >
                <Send className="h-4 w-4" />
                {enviando ? "Enviando solicitud..." : "Solicitar cita"}
              </button>
              {!datosCompletos ? (
                <p className="text-center text-xs text-slate-400">
                  Completa nombre, teléfono, si es tu primera vez y acepta el consentimiento para habilitar el botón.
                </p>
              ) : null}
            </div>
          ) : null}

          {paso === "enviado" && slotElegido ? (
            <div className="grid gap-3 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CalendarCheck2 className="h-7 w-7" />
              </div>
              <p className="text-lg font-semibold text-slate-900">¡Solicitud enviada!</p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600">
                Tu cita para el <span className="capitalize">{formatoFechaLarga(slotElegido.inicio)}</span> a las{" "}
                {formatoHora(slotElegido.inicio)} quedó pendiente de confirmación. Recibirás la confirmación por
                teléfono o correo.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">Atención psicológica profesional</footer>
      </div>
    </main>
  );
}
