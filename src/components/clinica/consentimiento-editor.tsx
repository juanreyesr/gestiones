"use client";

import { ArrowDown, ArrowUp, Eye, History, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MARCADORES, type AplicaA, type PlantillaConsentimiento, type SeccionPlantilla } from "@/lib/clinica/consentimiento";
import { fetchVersionesPlantilla, guardarVersionPlantilla, type VersionPlantilla } from "@/lib/clinica/consentimiento-plantillas";
import { formatoFechaHora } from "@/lib/clinica/slots";
import { ConsentimientoTexto } from "./consentimiento-documento";
import { BTN_ACCENT, BTN_DANGER, BTN_GHOST, Field, SectionCard } from "./ui";

const APLICA: { value: AplicaA; label: string }[] = [
  { value: "todos", label: "Todos los pacientes" },
  { value: "adulto", label: "Solo adultos" },
  { value: "menor", label: "Solo menores de edad" },
];

const EJEMPLO_MENOR = {
  esMenor: true,
  pacienteNombre: "Sofía Pérez",
  responsables: [
    { nombre: "Ana Pérez", parentesco: "Madre", tipoIdentificacion: "DPI", identificacion: "1234 56789 0101", telefono: "" },
  ],
};
const EJEMPLO_ADULTO = { esMenor: false, pacienteNombre: "Carlos Gómez", pacienteIdentificacion: "DPI 2345 67890 0101" };

const copiaDe = (p: PlantillaConsentimiento) => ({
  profesional: p.profesional,
  secciones: p.secciones.map((s) => ({ ...s })),
});

/**
 * Editor del consentimiento informado de la hoja de datos. Guardar crea una
 * versión nueva; lo ya aceptado por los pacientes conserva su texto original.
 */
export function ConsentimientoEditor() {
  const [versiones, setVersiones] = useState<VersionPlantilla[]>([]);
  const [profesional, setProfesional] = useState("");
  const [secciones, setSecciones] = useState<SeccionPlantilla[]>([]);
  const [base, setBase] = useState("");
  const [nota, setNota] = useState("");
  const [vista, setVista] = useState<"" | "adulto" | "menor">("");
  const [verHistorial, setVerHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarEnEditor = (p: PlantillaConsentimiento) => {
    const c = copiaDe(p);
    setProfesional(c.profesional);
    setSecciones(c.secciones);
  };

  const cargar = useCallback(async () => {
    const { data, error: err } = await fetchVersionesPlantilla();
    if (err) setError(err);
    setVersiones(data);
    const vigente = data[0];
    const c = copiaDe(vigente);
    setProfesional(c.profesional);
    setSecciones(c.secciones);
    setBase(JSON.stringify(c));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void cargar();
  }, [cargar]);

  const vigente = versiones[0] ?? null;
  const cambios = useMemo(() => JSON.stringify({ profesional, secciones }) !== base, [profesional, secciones, base]);
  const siguiente = vigente ? Number(vigente.version) + 1 : 2;
  const borrador: PlantillaConsentimiento = { version: String(siguiente), profesional, secciones };

  const cambiar = (i: number, cambio: Partial<SeccionPlantilla>) =>
    setSecciones((prev) => prev.map((s, j) => (j === i ? { ...s, ...cambio } : s)));
  const mover = (i: number, d: -1 | 1) =>
    setSecciones((prev) => {
      const n = [...prev];
      const j = i + d;
      if (j < 0 || j >= n.length) return prev;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const guardar = async () => {
    if (guardando) return;
    setError("");
    setMensaje("");
    if (!profesional.trim()) {
      setError("Escribe el nombre del profesional.");
      return;
    }
    if (secciones.some((s) => !s.titulo.trim() || !s.texto.trim())) {
      setError("Cada sección necesita título y texto (o elimínala).");
      return;
    }
    setGuardando(true);
    const { error: err } = await guardarVersionPlantilla(borrador, nota);
    setGuardando(false);
    if (err) {
      setError(err);
      return;
    }
    setNota("");
    setMensaje(`Versión ${siguiente} guardada. Desde ahora es la que verán los pacientes al llenar su hoja de datos.`);
    await cargar();
  };

  return (
    <SectionCard title="Consentimiento informado (hoja de datos)">
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-slate-300">
          Este es el texto que el paciente (o sus padres, si es menor) lee y acepta al llenar la hoja de datos. Cada vez que guardas se
          crea una versión nueva: los consentimientos ya aceptados conservan el texto que firmaron.
          {vigente ? (
            <span className="block text-xs text-slate-400">
              Vigente: versión {vigente.version}
              {vigente.createdAt ? ` · ${formatoFechaHora(vigente.createdAt)}` : " (inicial)"}
              {vigente.nota ? ` · ${vigente.nota}` : ""}
            </span>
          ) : null}
        </p>

        <Field label="Profesional (aparece en la identificación)">
          <input className="field" maxLength={120} onChange={(e) => setProfesional(e.target.value)} value={profesional} />
        </Field>

        <div className="border border-white/10 bg-white/4 p-3 text-xs leading-5 text-slate-400">
          <strong className="text-slate-300">Cómo escribir:</strong> cada línea es un párrafo. La sección «Identificación» y la numeración
          se agregan solas. Puedes usar:{" "}
          {MARCADORES.map((m, i) => (
            <span key={m.marcador}>
              {i > 0 ? "; " : ""}
              <code className="text-emerald-200">{m.marcador}</code> = {m.descripcion}
            </span>
          ))}
          .
        </div>

        {secciones.map((s, i) => (
          <div className="grid gap-2 border border-white/10 bg-white/4 p-3" key={i}>
            <div className="flex flex-wrap items-end gap-2">
              <span className="pb-2 text-xs font-semibold text-slate-500">{i + 1}.</span>
              <label className="grid min-w-48 flex-1 gap-1">
                <span className="text-[11px] font-semibold uppercase text-slate-500">Título</span>
                <input className="field" maxLength={120} onChange={(e) => cambiar(i, { titulo: e.target.value })} value={s.titulo} />
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase text-slate-500">Se muestra a</span>
                <select className="field" onChange={(e) => cambiar(i, { aplica: e.target.value as AplicaA })} value={s.aplica}>
                  {APLICA.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="flex gap-1">
                <button className={BTN_GHOST} disabled={i === 0} onClick={() => mover(i, -1)} title="Subir" type="button">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button className={BTN_GHOST} disabled={i === secciones.length - 1} onClick={() => mover(i, 1)} title="Bajar" type="button">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  className={BTN_DANGER}
                  onClick={() => {
                    if (window.confirm(`¿Quitar la sección «${s.titulo || "sin título"}»?`)) {
                      setSecciones((prev) => prev.filter((_, j) => j !== i));
                    }
                  }}
                  title="Quitar sección"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </div>
            <textarea
              className="field resize-y text-sm leading-6"
              maxLength={6000}
              onChange={(e) => cambiar(i, { texto: e.target.value })}
              rows={Math.min(14, Math.max(3, s.texto.split("\n").length + 2))}
              value={s.texto}
            />
          </div>
        ))}

        <button
          className={`${BTN_GHOST} w-fit`}
          disabled={secciones.length >= 40}
          onClick={() => setSecciones((prev) => [...prev, { titulo: "", texto: "", aplica: "todos" }])}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Agregar sección
        </button>

        <div className="flex flex-wrap gap-2">
          <button className={BTN_GHOST} onClick={() => setVista(vista === "adulto" ? "" : "adulto")} type="button">
            <Eye className="h-4 w-4" />
            {vista === "adulto" ? "Ocultar vista previa" : "Vista previa: adulto"}
          </button>
          <button className={BTN_GHOST} onClick={() => setVista(vista === "menor" ? "" : "menor")} type="button">
            <Eye className="h-4 w-4" />
            {vista === "menor" ? "Ocultar vista previa" : "Vista previa: menor de edad"}
          </button>
        </div>
        {vista ? (
          <div className="max-h-[70vh] overflow-y-auto rounded bg-white p-4 text-slate-800">
            <p className="mb-3 text-xs text-slate-500">Así lo verá {vista === "menor" ? "el padre o la madre" : "el paciente"} (datos de ejemplo).</p>
            <ConsentimientoTexto datos={vista === "menor" ? EJEMPLO_MENOR : EJEMPLO_ADULTO} plantilla={borrador} />
          </div>
        ) : null}

        <div className="grid gap-2 border-t border-white/10 pt-4">
          <Field label="¿Qué cambió? (opcional, queda en el historial)">
            <input
              className="field"
              maxLength={300}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. actualización por nueva normativa del Colegio"
              value={nota}
            />
          </Field>
          {error ? <div className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
          {mensaje ? <div className="border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-200">{mensaje}</div> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button className={BTN_ACCENT} disabled={!cambios || guardando} onClick={() => void guardar()} type="button">
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : `Guardar como versión ${siguiente}`}
            </button>
            {cambios ? (
              <button
                className={BTN_GHOST}
                onClick={() => {
                  if (vigente) cargarEnEditor(vigente);
                }}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Descartar cambios
              </button>
            ) : (
              <span className="text-xs text-slate-500">Sin cambios por guardar.</span>
            )}
            <button className={BTN_GHOST} onClick={() => setVerHistorial((v) => !v)} type="button">
              <History className="h-4 w-4" />
              Historial ({versiones.length})
            </button>
          </div>
        </div>

        {verHistorial ? (
          <ul className="grid gap-1.5">
            {versiones.map((v) => (
              <li className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/4 px-3 py-2 text-sm" key={v.version}>
                <span className="text-slate-200">
                  Versión {v.version}
                  <span className="text-xs text-slate-400">
                    {v.createdAt ? ` · ${formatoFechaHora(v.createdAt)}` : " · inicial"}
                    {v.nota ? ` · ${v.nota}` : ""}
                  </span>
                </span>
                <button
                  className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                  onClick={() => {
                    cargarEnEditor(v);
                    setMensaje(`Versión ${v.version} cargada en el editor. Revísala y guárdala para volver a usarla.`);
                  }}
                  type="button"
                >
                  Usar como base
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SectionCard>
  );
}
