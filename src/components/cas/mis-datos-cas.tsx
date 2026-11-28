"use client";

import { ArrowLeft, CheckCircle2, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CAMPUS, practicaDe } from "@/lib/cas/aspirantes";
import { AZUL, CAMPO, CORREO_RE, Campo, MarcoCas } from "./marco-cas";

type Datos = {
  nombre_completo: string;
  carne: string;
  practica: string;
  telefono: string | null;
  correo_institucional: string;
  correo_personal: string | null;
  campus: string | null;
  disponibilidad: string | null;
  orden_inscripcion: number | null;
};

type Paso = "identificar" | "editar" | "guardado";

const NO_DISPONIBLE = "Esta opción estará disponible muy pronto. Mientras tanto, comunícate con la coordinación de la práctica.";

/**
 * /cas/mis-datos: el estudiante se identifica con su carné y su correo
 * institucional y puede corregir nombre, teléfono, correo personal, campus y
 * disponibilidad. Carné, correo institucional y práctica solo los cambia la
 * coordinación.
 */
export function MisDatosCas() {
  const [paso, setPaso] = useState<Paso>("identificar");
  const [carne, setCarne] = useState("");
  const [correo, setCorreo] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correoPersonal, setCorreoPersonal] = useState("");
  const [campusOpcion, setCampusOpcion] = useState("");
  const [campusOtro, setCampusOtro] = useState("");
  const [disponibilidad, setDisponibilidad] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const llamar = async (cuerpo: Record<string, unknown>) => {
    const res = await fetch("/api/cas/mis-datos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carne, correoInstitucional: correo, ...cuerpo }),
    });
    if (res.status === 429) return { estado: "limite" } as { estado: string; datos?: Datos };
    return (await res.json().catch(() => ({ estado: "error" }))) as { estado: string; datos?: Datos };
  };

  const mensaje = (estado: string) =>
    estado === "limite"
      ? "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo."
      : estado === "no_disponible"
        ? NO_DISPONIBLE
        : estado === "no_encontrado"
          ? "No encontramos una preinscripción con ese carné y ese correo institucional. Revisa que estén escritos igual que cuando te preinscribiste."
          : estado === "invalido"
            ? "Algún dato no es válido. Revisa el formulario e inténtalo de nuevo."
            : "No se pudo completar en este momento. Inténtalo de nuevo en unos minutos.";

  const buscar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!carne.trim() || !CORREO_RE.test(correo.trim())) {
      setError("Escribe tu carné y tu correo institucional.");
      return;
    }
    setError("");
    setOcupado(true);
    try {
      const res = await llamar({ accion: "consultar" });
      if (res.estado !== "ok" || !res.datos) {
        setError(mensaje(res.estado));
        return;
      }
      const d = res.datos;
      setDatos(d);
      setNombre(d.nombre_completo);
      setTelefono(d.telefono ?? "");
      setCorreoPersonal(d.correo_personal ?? "");
      const principal = (CAMPUS as readonly string[]).includes(d.campus ?? "");
      setCampusOpcion(d.campus ? (principal ? d.campus : "otro") : "");
      setCampusOtro(d.campus && !principal ? d.campus : "");
      setDisponibilidad(d.disponibilidad ?? "");
      setPaso("editar");
    } catch {
      setError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const campus = campusOpcion === "otro" ? campusOtro.trim() : campusOpcion;
    if (nombre.trim().length < 3) return setError("Escribe tu nombre completo.");
    if (telefono.replace(/\D/g, "").length < 8) return setError("Escribe un número de teléfono válido (8 dígitos o más).");
    if (correoPersonal.trim() && !CORREO_RE.test(correoPersonal.trim())) return setError("El correo personal no es válido.");
    if (!campus) return setError("Elige el campus al que perteneces.");
    setError("");
    setOcupado(true);
    try {
      const res = await llamar({
        accion: "actualizar",
        nombre,
        telefono,
        correoPersonal,
        campus,
        disponibilidad,
      });
      if (res.estado !== "ok") {
        setError(mensaje(res.estado));
        return;
      }
      setPaso("guardado");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  const errorVisible = error ? (
    <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      {error}
    </p>
  ) : null;

  return (
    <MarcoCas titulo="Actualizar mis datos">
      {paso === "guardado" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-[#5E8F1A]" />
          <h2 className="mt-4 text-2xl font-bold" style={{ color: AZUL }}>
            Datos actualizados
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            Guardamos tus cambios. Tu número de inscripción no cambia
            {datos?.orden_inscripcion ? ` (sigues siendo el #${datos.orden_inscripcion})` : ""}.
          </p>
          <VolverAlFormulario />
        </section>
      ) : paso === "editar" && datos ? (
        <form className="grid gap-6" noValidate onSubmit={guardar}>
          <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preinscripción de</p>
                <p className="text-lg font-bold" style={{ color: AZUL }}>
                  {datos.nombre_completo}
                </p>
                <p className="text-sm text-slate-600">
                  ID {datos.carne} · {practicaDe(datos.practica).nombre} ({practicaDe(datos.practica).detalle})
                </p>
                <p className="text-sm text-slate-600">{datos.correo_institucional}</p>
              </div>
              {datos.orden_inscripcion ? (
                <div className="rounded-lg border-2 border-[#00247B]/15 bg-[#00247B]/5 px-4 py-2 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">N.º de inscripción</p>
                  <p className="text-2xl font-bold" style={{ color: AZUL }}>
                    #{datos.orden_inscripcion}
                  </p>
                </div>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Para cambiar tu carné, tu correo institucional o la práctica a la que optas, comunícate con la
              coordinación de la práctica.
            </p>
          </section>

          <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold" style={{ color: AZUL }}>
              Datos que puedes corregir
            </h2>
            <Campo etiqueta="Nombre completo" requerido>
              <input className={CAMPO} maxLength={160} onChange={(e) => setNombre(e.target.value)} value={nombre} />
            </Campo>
            <Campo etiqueta="Número de teléfono" requerido>
              <input
                className={CAMPO}
                inputMode="tel"
                maxLength={40}
                onChange={(e) => setTelefono(e.target.value)}
                type="tel"
                value={telefono}
              />
            </Campo>
            <Campo etiqueta="Correo electrónico personal">
              <input
                autoCapitalize="off"
                className={CAMPO}
                inputMode="email"
                maxLength={200}
                onChange={(e) => setCorreoPersonal(e.target.value)}
                type="email"
                value={correoPersonal}
              />
            </Campo>
            <Campo etiqueta="Campus al que perteneces" requerido>
              <select className={CAMPO} onChange={(e) => setCampusOpcion(e.target.value)} value={campusOpcion}>
                <option disabled value="">
                  Selecciona tu campus
                </option>
                {CAMPUS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="otro">Otro (escribirlo)</option>
              </select>
              {campusOpcion === "otro" ? (
                <input
                  className={CAMPO}
                  maxLength={80}
                  onChange={(e) => setCampusOtro(e.target.value)}
                  placeholder="Escribe el nombre de tu campus o sede"
                  value={campusOtro}
                />
              ) : null}
            </Campo>
            <Campo etiqueta="Disponibilidad tentativa (opcional)">
              <textarea
                className={`${CAMPO} min-h-24`}
                maxLength={1000}
                onChange={(e) => setDisponibilidad(e.target.value)}
                value={disponibilidad}
              />
            </Campo>
          </section>

          {errorVisible}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
              onClick={() => {
                setPaso("identificar");
                setError("");
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              disabled={ocupado}
              style={{ backgroundColor: AZUL }}
              type="submit"
            >
              {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {ocupado ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      ) : (
        <form className="grid gap-6" noValidate onSubmit={buscar}>
          <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm leading-6 text-slate-600">
              Escribe tu <strong className="text-slate-800">carné</strong> y tu{" "}
              <strong className="text-slate-800">correo institucional</strong> tal como los usaste al preinscribirte.
              Podrás ver tu número de inscripción y corregir tus datos de contacto.
            </p>
            <Campo etiqueta="ID (carné)" requerido>
              <input
                autoCapitalize="characters"
                className={CAMPO}
                maxLength={40}
                onChange={(e) => setCarne(e.target.value)}
                value={carne}
              />
            </Campo>
            <Campo etiqueta="Correo electrónico institucional" requerido>
              <input
                autoCapitalize="off"
                className={CAMPO}
                inputMode="email"
                maxLength={200}
                onChange={(e) => setCorreo(e.target.value)}
                type="email"
                value={correo}
              />
            </Campo>
          </section>

          {errorVisible}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <VolverAlFormulario />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              disabled={ocupado}
              style={{ backgroundColor: AZUL }}
              type="submit"
            >
              {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {ocupado ? "Buscando…" : "Buscar mi preinscripción"}
            </button>
          </div>
        </form>
      )}
    </MarcoCas>
  );
}

function VolverAlFormulario() {
  return (
    <Link
      className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#00247B] underline-offset-4 hover:underline sm:mt-0"
      href="/cas/registro"
    >
      <ArrowLeft className="h-4 w-4" />
      Ir al formulario de preinscripción
    </Link>
  );
}
