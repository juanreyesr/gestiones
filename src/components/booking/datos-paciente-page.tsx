"use client";

import { CheckCircle2, ClipboardList, FileText, HeartPulse, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SituacionFields, type SituacionValue } from "@/components/clinica/situacion-fields";
import type { HijoInfo } from "@/lib/clinica/types";
import { inferirPais, PAISES, paisDeZona, paisPorCodigo, zonaDelNavegador } from "@/lib/paises";
import { CampoFecha } from "@/components/campo-fecha";
import { ConsentimientoModal } from "@/components/clinica/consentimiento-documento";
import {
  normalizarPlantilla,
  PARENTESCOS,
  PLANTILLA_INICIAL,
  RESPONSABLE_VACIO,
  TIPOS_IDENTIFICACION,
  type PlantillaConsentimiento,
  type Responsable,
} from "@/lib/clinica/consentimiento";

type Estado = "cargando" | "ok" | "completado" | "invalido" | "enviado";

type FormState = {
  nombre: string;
  telefono: string;
  email: string;
  fechaNacimiento: string;
  escolaridad: string;
  estadoCivil: string;
  direccion: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  emergenciaRelacion: string;
  referidoPor: string;
  pais: string;
  zonaHoraria: string;
};

const VACIO: FormState = {
  nombre: "",
  telefono: "",
  email: "",
  fechaNacimiento: "",
  escolaridad: "",
  estadoCivil: "",
  direccion: "",
  emergenciaNombre: "",
  emergenciaTelefono: "",
  emergenciaRelacion: "",
  referidoPor: "",
  pais: "GT",
  zonaHoraria: "",
};

const SITUACION_VACIA: SituacionValue = {
  tieneHijos: null,
  hijos: [],
  viveSolo: null,
  conviveCon: [],
  conviveOtros: "",
  ocupacion: "",
  horarioTrabajo: "",
};

type DatosRespuesta = Partial<Omit<FormState, "pais" | "zonaHoraria">> & {
  estado?: string;
  pais?: string | null;
  zonaHoraria?: string | null;
  ocupacion?: string | null;
  tieneHijos?: boolean | null;
  hijos?: HijoInfo[] | null;
  viveSolo?: boolean | null;
  conviveCon?: string[] | null;
  conviveOtros?: string | null;
  horarioTrabajo?: string | null;
  esMenor?: boolean;
  responsables?: Responsable[] | null;
  identificacion?: string | null;
  plantillaConsentimiento?: unknown;
};

function Campo({
  label,
  onChange,
  type,
  value,
}: {
  label: string;
  onChange: (v: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <input className="field-light" onChange={(e) => onChange(e.target.value)} type={type} value={value} />
    </label>
  );
}

export function DatosPacientePage({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [form, setForm] = useState<FormState>(VACIO);
  const [situacion, setSituacion] = useState<SituacionValue>(SITUACION_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  // Consentimiento informado (obligatorio) y, si es menor, padres o tutores que firman.
  const [esMenor, setEsMenor] = useState(false);
  const [responsables, setResponsables] = useState<Responsable[]>([{ ...RESPONSABLE_VACIO }]);
  const [identificacion, setIdentificacion] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [declaraTutela, setDeclaraTutela] = useState(false);
  const [asentimiento, setAsentimiento] = useState(false);
  const [verConsentimiento, setVerConsentimiento] = useState(false);
  const [plantilla, setPlantilla] = useState<PlantillaConsentimiento>(PLANTILLA_INICIAL);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/datos/${token}`);
      const data = (await res.json()) as DatosRespuesta;
      if (data.estado === "completado") {
        setEstado("completado");
        return;
      }
      if (data.estado !== "ok") {
        setEstado("invalido");
        return;
      }
      setForm({
        nombre: data.nombre ?? "",
        email: data.email ?? "",
        fechaNacimiento: data.fechaNacimiento ?? "",
        escolaridad: data.escolaridad ?? "",
        estadoCivil: data.estadoCivil ?? "",
        direccion: data.direccion ?? "",
        emergenciaNombre: data.emergenciaNombre ?? "",
        emergenciaTelefono: data.emergenciaTelefono ?? "",
        emergenciaRelacion: data.emergenciaRelacion ?? "",
        referidoPor: data.referidoPor ?? "",
        // Pais: el del expediente; si no, el del +codigo del telefono; si no hay telefono, el de la zona del navegador.
        ...(() => {
          const zonaNavegador = zonaDelNavegador();
          // Un numero guardado sin +codigo es de Guatemala; el navegador solo decide si no hay telefono.
          const pais =
            data.pais || inferirPais(data.telefono) || (data.telefono?.trim() ? "GT" : paisDeZona(zonaNavegador));
          const zonas = paisPorCodigo(pais).zonas;
          const zona = data.zonaHoraria || (zonas.some((z) => z.id === zonaNavegador) ? zonaNavegador : "");
          // El codigo del pais se muestra aparte: se quita del numero si ya lo traia.
          const prefijo = `+${paisPorCodigo(pais).prefijo}`;
          const telefono = (data.telefono ?? "").trim();
          return {
            pais,
            zonaHoraria: zonas.length > 1 && zona !== zonas[0].id ? zona : "",
            telefono: telefono.startsWith(prefijo) ? telefono.slice(prefijo.length).trim() : telefono,
          };
        })(),
      });
      setSituacion({
        tieneHijos: data.tieneHijos ?? null,
        hijos: Array.isArray(data.hijos) ? data.hijos : [],
        viveSolo: data.viveSolo ?? null,
        conviveCon: Array.isArray(data.conviveCon) ? data.conviveCon : [],
        conviveOtros: data.conviveOtros ?? "",
        ocupacion: data.ocupacion ?? "",
        horarioTrabajo: data.horarioTrabajo ?? "",
      });
      setEsMenor(Boolean(data.esMenor));
      setPlantilla(normalizarPlantilla(data.plantillaConsentimiento) ?? PLANTILLA_INICIAL);
      setIdentificacion(data.identificacion ?? "");
      if (Array.isArray(data.responsables) && data.responsables.length > 0) {
        setResponsables(data.responsables.slice(0, 2).map((r) => ({ ...RESPONSABLE_VACIO, ...r })));
      }
      setEstado("ok");
    } catch {
      setEstado("invalido");
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const set = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleGuardar = async () => {
    if (guardando) return;
    if (form.nombre.trim() === "" || form.telefono.trim() === "") {
      setError("El nombre y el teléfono son obligatorios.");
      return;
    }
    const firmantes = responsables.filter((r) => r.nombre.trim() || r.identificacion.trim());
    if (esMenor && (firmantes.length === 0 || firmantes.some((r) => !r.nombre.trim() || !r.identificacion.trim()))) {
      setError("Escriba el nombre y el número de identificación de cada padre, madre o tutor que firma el consentimiento.");
      return;
    }
    if (esMenor && !declaraTutela) {
      setError("Confirme que ejerce la patria potestad o tutela legal del menor.");
      return;
    }
    if (!acepta) {
      setError("Para guardar debe leer y aceptar el consentimiento informado.");
      return;
    }
    setGuardando(true);
    setError("");
    const telefono = form.telefono.trim();
    const payload = {
      ...form,
      // Se guarda con +codigo para que WhatsApp y el pais del expediente salgan bien.
      telefono: telefono.startsWith("+") ? telefono : `+${paisPorCodigo(form.pais).prefijo} ${telefono}`,
      ocupacion: situacion.ocupacion,
      horarioTrabajo: situacion.horarioTrabajo,
      tieneHijos: situacion.tieneHijos,
      hijos: situacion.tieneHijos
        ? situacion.hijos
            .map((h) => ({ nombre: h.nombre.trim(), edad: h.edad.trim() }))
            .filter((h) => h.nombre !== "" || h.edad !== "")
        : [],
      viveSolo: situacion.viveSolo,
      conviveCon: situacion.viveSolo === false ? situacion.conviveCon : [],
      conviveOtros: situacion.viveSolo === false ? situacion.conviveOtros : "",
      identificacion: esMenor ? "" : identificacion.trim(),
      responsables: esMenor ? firmantes : [],
      consentimiento: acepta,
      declaraTutela: esMenor ? declaraTutela : null,
      asentimientoMenor: esMenor ? asentimiento : null,
    };
    try {
      const res = await fetch(`/api/datos/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { estado?: string; error?: string };
      setGuardando(false);
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar. Intenta de nuevo.");
        return;
      }
      if (data.estado === "completado") {
        setEstado("completado");
        return;
      }
      setEstado("enviado");
    } catch {
      setGuardando(false);
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <HeartPulse className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Hoja de datos generales</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            {esMenor
              ? "Datos del niño, niña o adolescente y de sus padres o tutores. La información es confidencial y se usa únicamente para su atención."
              : "Completa tu información. Es confidencial y se usa únicamente para tu atención."}
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {estado === "cargando" ? (
            <p className="py-10 text-center text-sm text-slate-400">Cargando...</p>
          ) : null}

          {estado === "invalido" ? (
            <div className="grid gap-3 py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-base font-semibold text-slate-900">Enlace no válido</p>
              <p className="text-sm leading-6 text-slate-400">
                Este enlace no es válido o ya no está disponible. Solicita uno nuevo a tu terapeuta.
              </p>
            </div>
          ) : null}

          {estado === "completado" || estado === "enviado" ? (
            <div className="grid gap-3 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">¡Gracias!</p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">
                {estado === "enviado"
                  ? "Tu información quedó registrada. Ya no necesitas hacer nada más."
                  : "Esta información ya fue completada. No es necesario volver a llenarla."}
              </p>
            </div>
          ) : null}

          {estado === "ok" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  label={esMenor ? "Nombre completo del niño, niña o adolescente *" : "Nombre completo *"}
                  onChange={set("nombre")}
                  value={form.nombre}
                />
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase text-slate-400">País *</span>
                  <select
                    className="field-light"
                    onChange={(e) => setForm((prev) => ({ ...prev, pais: e.target.value, zonaHoraria: "" }))}
                    value={form.pais}
                  >
                    {PAISES.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.bandera} {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                {paisPorCodigo(form.pais).zonas.length > 1 ? (
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-slate-400">Zona horaria</span>
                    <select className="field-light" onChange={(e) => set("zonaHoraria")(e.target.value)} value={form.zonaHoraria}>
                      {paisPorCodigo(form.pais).zonas.map((z, i) => (
                        <option key={z.id} value={i === 0 ? "" : z.id}>
                          {z.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    {esMenor ? "Teléfono (WhatsApp) del padre, madre o tutor *" : "Teléfono (WhatsApp) *"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-600">
                      {paisPorCodigo(form.pais).bandera} +{paisPorCodigo(form.pais).prefijo}
                    </span>
                    <input
                      className="field-light min-w-0 flex-1"
                      inputMode="tel"
                      onChange={(e) => set("telefono")(e.target.value)}
                      value={form.telefono}
                    />
                  </span>
                </label>
                <Campo
                  label={esMenor ? "Correo electrónico del padre, madre o tutor" : "Correo electrónico"}
                  onChange={set("email")}
                  type="email"
                  value={form.email}
                />
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase text-slate-400">Fecha de nacimiento</span>
                  <CampoFecha
                    anioDesde={1920}
                    anioHasta={new Date().getFullYear()}
                    className="field-light"
                    onChange={set("fechaNacimiento")}
                    opcional
                    value={form.fechaNacimiento}
                  />
                </label>
                <Campo
                  label={esMenor ? "Grado escolar y centro educativo" : "Escolaridad"}
                  onChange={set("escolaridad")}
                  value={form.escolaridad}
                />
                {esMenor ? null : (
                  <>
                    <Campo label="Estado civil" onChange={set("estadoCivil")} value={form.estadoCivil} />
                    <Campo
                      label="Documento de identificación (DPI o pasaporte)"
                      onChange={setIdentificacion}
                      value={identificacion}
                    />
                  </>
                )}
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-400">Dirección</span>
                <textarea
                  className="field-light resize-y"
                  onChange={(e) => set("direccion")(e.target.value)}
                  rows={2}
                  value={form.direccion}
                />
              </label>

              <div className="border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contacto de emergencia
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo label="Nombre" onChange={set("emergenciaNombre")} value={form.emergenciaNombre} />
                <Campo label="Teléfono" onChange={set("emergenciaTelefono")} value={form.emergenciaTelefono} />
                <Campo label="Relación" onChange={set("emergenciaRelacion")} value={form.emergenciaRelacion} />
              </div>

              {esMenor ? (
                <ResponsablesFields onChange={setResponsables} value={responsables} />
              ) : (
                <>
                  <div className="border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Tu situación
                  </div>
                  <SituacionFields light onChange={setSituacion} value={situacion} />
                </>
              )}

              <Campo
                label={esMenor ? "¿Cómo llegaron a la consulta?" : "¿Cómo llegaste a la consulta?"}
                onChange={set("referidoPor")}
                value={form.referidoPor}
              />

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Consentimiento informado
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Incluye las condiciones de la atención presencial y virtual, la confidencialidad y sus límites
                  {esMenor ? " y lo propio de la atención de menores de edad" : ""}. Léalo antes de aceptarlo.
                </p>
                {esMenor ? (
                  <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <input
                      checked={declaraTutela}
                      className="mt-1 h-4 w-4 shrink-0"
                      onChange={(e) => setDeclaraTutela(e.target.checked)}
                      type="checkbox"
                    />
                    <span>Declaro que ejerzo la patria potestad o la tutela legal del menor. *</span>
                  </label>
                ) : null}
                {esMenor ? (
                  <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <input
                      checked={asentimiento}
                      className="mt-1 h-4 w-4 shrink-0"
                      onChange={(e) => setAsentimiento(e.target.checked)}
                      type="checkbox"
                    />
                    <span>Le explicamos al menor, según su edad, que asistirá a atención psicológica y está de acuerdo.</span>
                  </label>
                ) : null}
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-900">
                  <input
                    checked={acepta}
                    className="mt-1 h-4 w-4 shrink-0"
                    data-testid="acepta-consentimiento"
                    onChange={(e) => setAcepta(e.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Acepto los términos del{" "}
                    <button
                      className="font-semibold text-emerald-700 underline underline-offset-2"
                      onClick={(e) => {
                        e.preventDefault();
                        setVerConsentimiento(true);
                      }}
                      type="button"
                    >
                      consentimiento informado
                    </button>
                    . *
                  </span>
                </label>
              </div>
              {verConsentimiento ? (
                <ConsentimientoModal
                  datos={{
                    esMenor,
                    pacienteNombre: form.nombre,
                    pacienteIdentificacion: identificacion,
                    responsables: responsables.filter((r) => r.nombre.trim()),
                  }}
                  onAceptar={() => setAcepta(true)}
                  plantilla={plantilla}
                  onCerrar={() => setVerConsentimiento(false)}
                />
              ) : null}

              {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
                disabled={guardando || form.nombre.trim() === "" || form.telefono.trim() === "" || !acepta}
                onClick={handleGuardar}
                type="button"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : "Guardar mi información"}
              </button>
            </div>
          ) : null}
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">Atención psicológica profesional</footer>
      </div>
    </main>
  );
}

/** Padre, madre o tutor(es) que firman el consentimiento de un menor (uno obligatorio, hasta dos). */
export function ResponsablesFields({ onChange, value }: { onChange: (v: Responsable[]) => void; value: Responsable[] }) {
  const cambiar = (i: number, campo: keyof Responsable, v: string) =>
    onChange(value.map((r, j) => (j === i ? { ...r, [campo]: v } : r)));
  return (
    <div className="grid gap-4">
      <div className="border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Padres o tutores que firman el consentimiento
      </div>
      {value.map((r, i) => (
        <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2" key={i}>
          <div className="flex items-center justify-between sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">{i === 0 ? "Primer responsable *" : "Segundo responsable"}</span>
            {i > 0 ? (
              <button
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Quitar
              </button>
            ) : null}
          </div>
          <Campo label={`Nombre completo${i === 0 ? " *" : ""}`} onChange={(v) => cambiar(i, "nombre", v)} value={r.nombre} />
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase text-slate-400">Parentesco</span>
            <select className="field-light" onChange={(e) => cambiar(i, "parentesco", e.target.value)} value={r.parentesco}>
              <option value="">Seleccione…</option>
              {PARENTESCOS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase text-slate-400">Tipo de documento</span>
            <select
              className="field-light"
              onChange={(e) => cambiar(i, "tipoIdentificacion", e.target.value)}
              value={r.tipoIdentificacion}
            >
              {TIPOS_IDENTIFICACION.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <Campo
            label={`Número de identificación${i === 0 ? " *" : ""}`}
            onChange={(v) => cambiar(i, "identificacion", v)}
            value={r.identificacion}
          />
          <Campo label="Teléfono" onChange={(v) => cambiar(i, "telefono", v)} type="tel" value={r.telefono} />
        </div>
      ))}
      {value.length < 2 ? (
        <button
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          onClick={() => onChange([...value, { ...RESPONSABLE_VACIO }])}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Agregar al otro padre, madre o tutor
        </button>
      ) : null}
    </div>
  );
}
