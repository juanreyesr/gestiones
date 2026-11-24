"use client";

import {
  Copy,
  Download,
  GraduationCap,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Roboto } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import {
  type Aspirante,
  type AspiranteInput,
  ESTADOS,
  type EstadoId,
  PRACTICAS,
  type PracticaId,
  borrarAspirante,
  enlaceWhatsApp,
  estadoDe,
  exportarAspirantesExcel,
  fetchAspirantes,
  guardarAspirante,
  normalizarAspirante,
  practicaDe,
  validarAspirante,
} from "@/lib/cas/aspirantes";

// Identidad visual de UPANA (www.upana.edu.gt): azul primario #00247B, verde de
// acento #9FD140, gris secundario #54595F y tipografía Roboto.
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

const AZUL = "#00247B";
const VERDE = "#9FD140";

const CAMPO_BASE =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#00247B] focus:ring-2 focus:ring-[#00247B]/15";
const CAMPO = `w-full ${CAMPO_BASE}`;
const BTN_AZUL =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#00247B] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0D1967] disabled:opacity-60";
const BTN_BORDE =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#00247B] hover:text-[#00247B] disabled:opacity-60";

const VACIO: AspiranteInput = {
  nombre_completo: "",
  carne: "",
  practica: "consejeria_cuarto",
  telefono: "",
  correo_institucional: "",
  correo_personal: "",
  estado: "aspirante",
  notas: "",
};

type FiltroPractica = "todas" | PracticaId;

/** Quita tildes y mayúsculas para que la búsqueda encuentre "Jose" en "José". */
const plano = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CasView() {
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [faltaTabla, setFaltaTabla] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPractica, setFiltroPractica] = useState<FiltroPractica>("todas");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoId>("todos");
  const [editando, setEditando] = useState<{ id: string | null; datos: AspiranteInput } | null>(null);
  const [porBorrar, setPorBorrar] = useState<Aspirante | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetchAspirantes();
    setAspirantes(res.data);
    setError(res.error ?? "");
    setFaltaTabla(res.faltaTabla);
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del módulo
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const filtrados = useMemo(() => {
    const q = plano(busqueda.trim());
    return aspirantes.filter((a) => {
      if (filtroPractica !== "todas" && a.practica !== filtroPractica) return false;
      if (filtroEstado !== "todos" && a.estado !== filtroEstado) return false;
      if (!q) return true;
      return plano(
        [a.nombre_completo, a.carne, a.telefono, a.correo_institucional, a.correo_personal].filter(Boolean).join(" "),
      ).includes(q);
    });
  }, [aspirantes, busqueda, filtroPractica, filtroEstado]);

  const conteo = useMemo(
    () => ({
      total: aspirantes.length,
      cuarto: aspirantes.filter((a) => a.practica === "consejeria_cuarto").length,
      quinto: aspirantes.filter((a) => a.practica === "profesional_quinto").length,
      aceptados: aspirantes.filter((a) => a.estado === "aceptado").length,
    }),
    [aspirantes],
  );

  const copiarCorreos = async () => {
    const correos = Array.from(
      new Set(filtrados.map((a) => a.correo_institucional || a.correo_personal).filter((c): c is string => Boolean(c))),
    );
    if (correos.length === 0) {
      setAviso("No hay correos en la lista filtrada.");
      return;
    }
    try {
      await navigator.clipboard.writeText(correos.join(", "));
      setAviso(`${correos.length} correo(s) copiados: pégalos en el campo «Para» o «CCO».`);
    } catch {
      setAviso("El navegador no permitió copiar al portapapeles.");
    }
  };

  const confirmarBorrado = async () => {
    if (!porBorrar) return;
    setBorrando(true);
    const { error: e } = await borrarAspirante(porBorrar.id);
    setBorrando(false);
    if (e) {
      setError(e);
      return;
    }
    setPorBorrar(null);
    setAviso("Aspirante eliminado.");
    void cargar();
  };

  return (
    <div className={`${roboto.className} overflow-hidden rounded-lg bg-slate-50 text-slate-800 shadow-xl`}>
      {/* Banda institucional */}
      <header className="relative overflow-hidden px-5 py-5 sm:px-7" style={{ backgroundColor: AZUL }}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático en /public */}
          <img alt="Universidad Panamericana" className="h-11 w-auto sm:h-14" src="/cas/upana-logo-blanco.webp" />
          <div className="hidden h-12 w-px bg-white/30 sm:block" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: VERDE }}>
              Facultad de Humanidades · Ciencias Psicológicas
            </p>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Centro de Asistencia Social · CAS</h2>
            <p className="text-sm text-white/75">Gestión de estudiantes aspirantes a práctica</p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: VERDE }} />
      </header>

      <div className="grid gap-5 p-4 sm:p-6">
        {faltaTabla ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : null}

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador etiqueta="Aspirantes" icono={Users} valor={conteo.total} />
          <Indicador etiqueta="Consejería · 4.º año" icono={GraduationCap} valor={conteo.cuarto} />
          <Indicador etiqueta="Profesional · 5.º año" icono={GraduationCap} valor={conteo.quinto} />
          <Indicador acento etiqueta="Aceptados" icono={UserCheck} valor={conteo.aceptados} />
        </div>

        {/* Barra de herramientas */}
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${CAMPO} pl-9`}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, ID, teléfono o correo"
                value={busqueda}
              />
            </div>
            <select
              aria-label="Filtrar por estado"
              className={`${CAMPO_BASE} w-full sm:w-auto`}
              onChange={(e) => setFiltroEstado(e.target.value as "todos" | EstadoId)}
              value={filtroEstado}
            >
              <option value="todos">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <button
              className={`${BTN_AZUL} w-full sm:w-auto`}
              disabled={faltaTabla}
              onClick={() => setEditando({ id: null, datos: { ...VACIO } })}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Nuevo aspirante
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              {(
                [
                  ["todas", "Todas"],
                  ["consejeria_cuarto", "Consejería · 4.º"],
                  ["profesional_quinto", "Profesional · 5.º"],
                ] as const
              ).map(([id, texto]) => (
                <button
                  className={`rounded px-3 py-1.5 transition ${
                    filtroPractica === id ? "bg-white text-[#00247B] shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  key={id}
                  onClick={() => setFiltroPractica(id)}
                  type="button"
                >
                  {texto}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={BTN_BORDE} disabled={filtrados.length === 0} onClick={copiarCorreos} type="button">
                <Copy className="h-4 w-4" />
                Copiar correos
              </button>
              <button
                className={BTN_BORDE}
                disabled={filtrados.length === 0}
                onClick={() => void exportarAspirantesExcel(filtrados)}
                type="button"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>
          {aviso ? <p className="text-xs font-semibold text-[#5E8F1A]">{aviso}</p> : null}
        </div>

        {/* Listado */}
        {cargando ? (
          <p className="py-8 text-center text-sm text-slate-500">Cargando aspirantes…</p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {aspirantes.length === 0
              ? "Aún no hay aspirantes registrados. Empieza con «Nuevo aspirante»."
              : "Ningún aspirante coincide con la búsqueda o los filtros."}
          </div>
        ) : (
          <>
            <p className="-mb-2 text-xs text-slate-500">
              Mostrando {filtrados.length} de {aspirantes.length}
            </p>

            {/* Escritorio: tabla */}
            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Estudiante</th>
                    <th className="px-4 py-3 font-semibold">Práctica</th>
                    <th className="px-4 py-3 font-semibold">Contacto</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrados.map((a) => (
                    <tr className="align-top transition hover:bg-slate-50" key={a.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{a.nombre_completo}</p>
                        <p className="text-xs text-slate-500">ID {a.carne}</p>
                      </td>
                      <td className="px-4 py-3">
                        <EtiquetaPractica practica={a.practica} />
                      </td>
                      <td className="px-4 py-3">
                        <Contacto aspirante={a} />
                      </td>
                      <td className="px-4 py-3">
                        <EtiquetaEstado estado={a.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <Acciones
                          onBorrar={() => setPorBorrar(a)}
                          onEditar={() => setEditando({ id: a.id, datos: aInput(a) })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Teléfono: tarjetas */}
            <div className="grid gap-3 md:hidden">
              {filtrados.map((a) => (
                <article className="rounded-lg border border-slate-200 bg-white p-4" key={a.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{a.nombre_completo}</p>
                      <p className="text-xs text-slate-500">ID {a.carne}</p>
                    </div>
                    <EtiquetaEstado estado={a.estado} />
                  </div>
                  <div className="mt-2">
                    <EtiquetaPractica practica={a.practica} />
                  </div>
                  <div className="mt-3">
                    <Contacto aspirante={a} />
                  </div>
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <Acciones
                      onBorrar={() => setPorBorrar(a)}
                      onEditar={() => setEditando({ id: a.id, datos: aInput(a) })}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {editando ? (
        <FormularioAspirante
          fuente={roboto.className}
          id={editando.id}
          inicial={editando.datos}
          onCerrar={() => setEditando(null)}
          onGuardado={(mensaje) => {
            setEditando(null);
            setAviso(mensaje);
            void cargar();
          }}
        />
      ) : null}

      <ConfirmDialog
        busy={borrando}
        message={
          porBorrar
            ? `Se eliminará a ${porBorrar.nombre_completo} (ID ${porBorrar.carne}) de la base de aspirantes. Si solo dejó el proceso, mejor cambia su estado a «No continúa».`
            : ""
        }
        onCancel={() => setPorBorrar(null)}
        onConfirm={() => void confirmarBorrado()}
        open={porBorrar !== null}
        title="¿Eliminar aspirante?"
      />
    </div>
  );
}

const aInput = (a: Aspirante): AspiranteInput => ({
  nombre_completo: a.nombre_completo,
  carne: a.carne,
  practica: a.practica,
  telefono: a.telefono ?? "",
  correo_institucional: a.correo_institucional ?? "",
  correo_personal: a.correo_personal ?? "",
  estado: a.estado,
  notas: a.notas ?? "",
});

function Indicador({
  acento,
  etiqueta,
  icono: Icono,
  valor,
}: {
  acento?: boolean;
  etiqueta: string;
  icono: React.ComponentType<{ className?: string }>;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: acento ? `${VERDE}33` : `${AZUL}14`, color: acento ? "#4D7A12" : AZUL }}
      >
        <Icono className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none" style={{ color: AZUL }}>
          {valor}
        </p>
        <p className="mt-1 text-xs leading-tight text-slate-500">{etiqueta}</p>
      </div>
    </div>
  );
}

function EtiquetaPractica({ practica }: { practica: PracticaId }) {
  const p = practicaDe(practica);
  return (
    <div>
      <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
      <p className="text-xs text-slate-500">{p.detalle}</p>
    </div>
  );
}

function EtiquetaEstado({ estado }: { estado: EstadoId }) {
  const e = estadoDe(estado);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${e.color}18`, color: e.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.color }} />
      {e.nombre}
    </span>
  );
}

function Contacto({ aspirante: a }: { aspirante: Aspirante }) {
  const wa = enlaceWhatsApp(a.telefono);
  return (
    <div className="grid gap-1 text-xs">
      {a.telefono ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          <a className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#00247B]" href={`tel:${a.telefono}`}>
            <Phone className="h-3.5 w-3.5" />
            {a.telefono}
          </a>
          {wa ? (
            <a
              className="inline-flex items-center gap-1 font-semibold text-[#4D7A12] hover:underline"
              href={wa}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          ) : null}
        </span>
      ) : null}
      {a.correo_institucional ? (
        <a
          className="inline-flex min-w-0 items-center gap-1.5 break-all text-slate-700 hover:text-[#00247B]"
          href={`mailto:${a.correo_institucional}`}
          title="Correo institucional"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: AZUL }} />
          {a.correo_institucional}
        </a>
      ) : null}
      {a.correo_personal ? (
        <a
          className="inline-flex min-w-0 items-center gap-1.5 break-all text-slate-500 hover:text-[#00247B]"
          href={`mailto:${a.correo_personal}`}
          title="Correo personal"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {a.correo_personal}
        </a>
      ) : null}
    </div>
  );
}

function Acciones({ onBorrar, onEditar }: { onBorrar: () => void; onEditar: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        aria-label="Editar"
        className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#00247B]"
        onClick={onEditar}
        title="Editar"
        type="button"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        aria-label="Eliminar"
        className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
        onClick={onBorrar}
        title="Eliminar"
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function FormularioAspirante({
  fuente,
  id,
  inicial,
  onCerrar,
  onGuardado,
}: {
  fuente: string;
  id: string | null;
  inicial: AspiranteInput;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [datos, setDatos] = useState<AspiranteInput>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const poner = <K extends keyof AspiranteInput>(campo: K, valor: AspiranteInput[K]) =>
    setDatos((d) => ({ ...d, [campo]: valor }));

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const limpio = normalizarAspirante(datos);
    const problema = validarAspirante(limpio);
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    const { error: e } = await guardarAspirante(id, limpio);
    setGuardando(false);
    if (e) {
      setError(e);
      return;
    }
    onGuardado(id ? "Cambios guardados." : `${limpio.nombre_completo} quedó registrado.`);
  };

  // Aviso suave (no bloquea): el dominio institucional aún no está confirmado.
  const correoInst = (datos.correo_institucional ?? "").trim().toLowerCase();
  const avisoDominio = correoInst.includes("@") && !correoInst.endsWith("upana.edu.gt");

  return (
    <ModalPortal>
      <div
        className="print-hidden fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 py-8"
        onClick={onCerrar}
      >
        <form
          className={`${fuente} w-full max-w-xl overflow-hidden rounded-lg bg-white text-slate-800 shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
          onSubmit={enviar}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: AZUL }}>
            <h3 className="text-lg font-bold text-white">{id ? "Editar aspirante" : "Nuevo aspirante"}</h3>
            <button aria-label="Cerrar" className="rounded p-1 text-white/80 hover:text-white" onClick={onCerrar} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-1" style={{ backgroundColor: VERDE }} />

          <div className="grid gap-4 p-5">
            <Campo etiqueta="Nombre completo *">
              <input
                autoFocus
                className={CAMPO}
                maxLength={160}
                onChange={(e) => poner("nombre_completo", e.target.value)}
                placeholder="Nombres y apellidos"
                value={datos.nombre_completo}
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="ID (carné) *">
                <input
                  className={CAMPO}
                  maxLength={40}
                  onChange={(e) => poner("carne", e.target.value)}
                  value={datos.carne}
                />
              </Campo>
              <Campo etiqueta="Teléfono">
                <input
                  className={CAMPO}
                  inputMode="tel"
                  maxLength={40}
                  onChange={(e) => poner("telefono", e.target.value)}
                  placeholder="5555 5555"
                  type="tel"
                  value={datos.telefono ?? ""}
                />
              </Campo>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Práctica a la que opta *</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRACTICAS.map((p) => {
                  const activa = datos.practica === p.id;
                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 transition ${
                        activa ? "border-[#00247B] bg-[#00247B]/5" : "border-slate-200 hover:border-slate-400"
                      }`}
                      key={p.id}
                    >
                      <input
                        checked={activa}
                        className="mt-1 accent-[#00247B]"
                        name="practica"
                        onChange={() => poner("practica", p.id)}
                        type="radio"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{p.nombre}</span>
                        <span className="block text-xs text-slate-500">{p.detalle}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Campo etiqueta="Correo institucional">
              <input
                autoCapitalize="off"
                className={CAMPO}
                inputMode="email"
                onChange={(e) => poner("correo_institucional", e.target.value)}
                type="email"
                value={datos.correo_institucional ?? ""}
              />
              {avisoDominio ? (
                <span className="text-xs text-amber-700">No termina en «upana.edu.gt»: verifica que sea el institucional.</span>
              ) : null}
            </Campo>
            <Campo etiqueta="Correo personal">
              <input
                autoCapitalize="off"
                className={CAMPO}
                inputMode="email"
                onChange={(e) => poner("correo_personal", e.target.value)}
                type="email"
                value={datos.correo_personal ?? ""}
              />
            </Campo>

            <Campo etiqueta="Estado">
              <select
                className={CAMPO}
                onChange={(e) => poner("estado", e.target.value as EstadoId)}
                value={datos.estado}
              >
                {ESTADOS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Notas">
              <textarea
                className={`${CAMPO} min-h-20`}
                maxLength={4000}
                onChange={(e) => poner("notas", e.target.value)}
                placeholder="Disponibilidad tentativa, sede, observaciones…"
                value={datos.notas ?? ""}
              />
            </Campo>

            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <button className={BTN_BORDE} onClick={onCerrar} type="button">
              Cancelar
            </button>
            <button className={BTN_AZUL} disabled={guardando} type="submit">
              {guardando ? "Guardando…" : id ? "Guardar cambios" : "Registrar aspirante"}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

function Campo({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{etiqueta}</span>
      {children}
    </label>
  );
}
