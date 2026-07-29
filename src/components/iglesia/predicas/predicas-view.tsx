"use client";

import {
  CalendarRange,
  Check,
  ClipboardPaste,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT, Modal } from "@/components/ui-comun";
import { formatoCompleto } from "@/lib/fechas";
import {
  crearMes,
  deleteMes,
  fetchAsignaciones,
  fetchMeses,
  fetchPredicadores,
  fetchUsoPredicadores,
  generarCelebraciones,
  updateAsignacion,
  updateAsignaciones,
  updateMes,
} from "@/lib/iglesia/predicas";
import { exportPredicasToExcel } from "@/lib/iglesia/predicas-excel";
import {
  CIERRE_PASTORES,
  HORARIO_LABEL,
  MESES_LABEL,
  mesLabel,
  type AsignacionPredicaRow,
  type MesPredicasRow,
  type PredicadorRow,
} from "@/lib/iglesia/types";
import { ImportarTexto } from "./importar-texto";
import { PredicadoresPanel } from "./predicadores-panel";
import { SelectorPersona, type ValorPersona } from "./selector-persona";

type Guardado = "limpio" | "guardando" | "guardado";

export function PredicasView() {
  const [meses, setMeses] = useState<MesPredicasRow[]>([]);
  const [mesActivoId, setMesActivoId] = useState<string | null>(null);
  const [predicadores, setPredicadores] = useState<PredicadorRow[]>([]);
  const [uso, setUso] = useState<Record<string, number>>({});
  const [asignaciones, setAsignaciones] = useState<AsignacionPredicaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState<Guardado>("limpio");

  const [tema, setTema] = useState("");
  const [instrucciones, setInstrucciones] = useState("");

  const [rosterAbierto, setRosterAbierto] = useState(false);
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [nuevoMesAbierto, setNuevoMesAbierto] = useState(false);
  const [mesAEliminar, setMesAEliminar] = useState<MesPredicasRow | null>(null);
  const [exportando, setExportando] = useState(false);

  const mesActivo = meses.find((mes) => mes.id === mesActivoId) ?? null;

  // ----------------------------------------------------------------
  // Carga
  // ----------------------------------------------------------------

  const cargarCatalogo = useCallback(async () => {
    const [predicadoresRes, usoRes] = await Promise.all([fetchPredicadores(), fetchUsoPredicadores()]);
    setPredicadores(predicadoresRes.data);
    setUso(usoRes.data);
    if (predicadoresRes.error) setError(predicadoresRes.error);
  }, []);

  const cargarMeses = useCallback(async () => {
    const { data, error: fetchError } = await fetchMeses();
    setMeses(data);
    if (fetchError) setError(fetchError);
    setMesActivoId((previo) => previo ?? data[0]?.id ?? null);
    return data;
  }, []);

  useEffect(() => {
    void (async () => {
      setCargando(true);
      await Promise.all([cargarCatalogo(), cargarMeses()]);
      setCargando(false);
    })();
  }, [cargarCatalogo, cargarMeses]);

  const cargarMesActivo = useCallback(async () => {
    if (!mesActivo) {
      setAsignaciones([]);
      return;
    }
    // Completa las celebraciones que falten (por si el mes se creo antes de
    // agregar un horario, o quedo a medias por un error de red).
    await generarCelebraciones(mesActivo);
    const { data, error: fetchError } = await fetchAsignaciones(mesActivo.id);
    setAsignaciones(data);
    setTema(mesActivo.tema ?? "");
    setInstrucciones(mesActivo.instrucciones ?? "");
    if (fetchError) setError(fetchError);
  }, [mesActivo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga el calendario al cambiar de mes
    void cargarMesActivo();
  }, [cargarMesActivo]);

  // ----------------------------------------------------------------
  // Autoguardado de los campos de texto del mes
  // ----------------------------------------------------------------

  const primerRender = useRef(true);
  useEffect(() => {
    if (!mesActivo) return;
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    if ((mesActivo.tema ?? "") === tema && (mesActivo.instrucciones ?? "") === instrucciones) return;

    const temporizador = setTimeout(async () => {
      const { error: updateError } = await updateMes(mesActivo.id, {
        tema: tema.trim() || null,
        instrucciones: instrucciones.trim() || null,
      });
      if (updateError) {
        setError(updateError);
        setGuardado("limpio");
        return;
      }
      setMeses((previos) =>
        previos.map((mes) =>
          mes.id === mesActivo.id
            ? { ...mes, tema: tema.trim() || null, instrucciones: instrucciones.trim() || null }
            : mes,
        ),
      );
      setGuardado("guardado");
    }, 700);

    return () => clearTimeout(temporizador);
  }, [instrucciones, mesActivo, tema]);

  // ----------------------------------------------------------------
  // Conteos y advertencias
  // ----------------------------------------------------------------

  const conteoPredicas = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const asignacion of asignaciones) {
      if (asignacion.predicador_id) conteo[asignacion.predicador_id] = (conteo[asignacion.predicador_id] ?? 0) + 1;
    }
    return conteo;
  }, [asignaciones]);

  const conteoCierres = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const asignacion of asignaciones) {
      if (asignacion.cierre_predicador_id) {
        conteo[asignacion.cierre_predicador_id] = (conteo[asignacion.cierre_predicador_id] ?? 0) + 1;
      }
    }
    return conteo;
  }, [asignaciones]);

  /**
   * Un predicador repetido en el MISMO horario dentro del mes. Es lo que se
   * quiere evitar, asi que se marca en ambar (aviso, no bloqueo).
   */
  const repeticiones = useMemo(() => {
    const porHorario = new Map<string, string[]>();
    for (const asignacion of asignaciones) {
      if (!asignacion.predicador_id) continue;
      const clave = `${asignacion.horario}|${asignacion.predicador_id}`;
      porHorario.set(clave, [...(porHorario.get(clave) ?? []), asignacion.id]);
    }

    const marcados = new Set<string>();
    const resumen: Array<{ horario: string; predicadorId: string; veces: number }> = [];
    for (const [clave, ids] of porHorario) {
      if (ids.length < 2) continue;
      for (const id of ids) marcados.add(id);
      const [horario, predicadorId] = clave.split("|");
      resumen.push({ horario, predicadorId, veces: ids.length });
    }
    return { marcados, resumen };
  }, [asignaciones]);

  const nombreDe = useCallback(
    (id: string | null) => predicadores.find((predicador) => predicador.id === id)?.nombre ?? "",
    [predicadores],
  );

  const activos = useMemo(() => predicadores.filter((predicador) => predicador.activo), [predicadores]);

  // ----------------------------------------------------------------
  // Edicion de celdas (guarda con cada cambio)
  // ----------------------------------------------------------------

  const asignar = async (asignacion: AsignacionPredicaRow, campo: "predica" | "cierre", valor: ValorPersona) => {
    const cambios =
      campo === "predica"
        ? { predicador_id: valor.predicadorId }
        : { cierre_predicador_id: valor.predicadorId, cierre_texto: valor.texto };

    setAsignaciones((previas) =>
      previas.map((fila) => (fila.id === asignacion.id ? { ...fila, ...cambios } : fila)),
    );
    setGuardado("guardando");

    const { error: updateError } = await updateAsignacion(asignacion.id, cambios);
    if (updateError) {
      setError(updateError);
      setGuardado("limpio");
      await cargarMesActivo();
      return;
    }
    setGuardado("guardado");
  };

  const crearNuevoMes = async (anio: number, mes: number) => {
    const instruccionesPrevias = meses[0]?.instrucciones ?? null;
    const { data, error: crearError } = await crearMes(anio, mes, instruccionesPrevias);
    if (crearError || !data) {
      setError(crearError ?? "No se pudo crear el mes.");
      return;
    }
    setNuevoMesAbierto(false);
    const lista = await cargarMeses();
    setMesActivoId(lista.find((fila) => fila.id === data.id)?.id ?? data.id);
  };

  const exportar = async () => {
    if (!mesActivo) return;
    setExportando(true);
    try {
      await exportPredicasToExcel({ asignaciones, mes: { ...mesActivo, tema, instrucciones }, predicadores });
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo generar el Excel.");
    }
    setExportando(false);
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  const porFecha = useMemo(() => {
    const mapa = new Map<string, AsignacionPredicaRow[]>();
    for (const asignacion of [...asignaciones].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario),
    )) {
      mapa.set(asignacion.fecha, [...(mapa.get(asignacion.fecha) ?? []), asignacion]);
    }
    return [...mapa.entries()];
  }, [asignaciones]);

  const totalCelebraciones = asignaciones.length;
  const asignadas = asignaciones.filter((asignacion) => asignacion.predicador_id).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarRange className="h-5 w-5 text-emerald-200" />
          Prédicas del mes
        </h3>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className={BTN_GHOST} onClick={() => setRosterAbierto(true)} type="button">
            <Users className="h-4 w-4" />
            Predicadores ({activos.length})
          </button>
          {mesActivo ? (
            <>
              <button className={BTN_GHOST} onClick={() => setImportarAbierto(true)} type="button">
                <ClipboardPaste className="h-4 w-4" />
                <span className="hidden sm:inline">Importar texto</span>
              </button>
              <button className={BTN_GHOST} disabled={exportando} onClick={() => void exportar()} type="button">
                <FileSpreadsheet className="h-4 w-4" />
                {exportando ? "Generando..." : "Excel"}
              </button>
            </>
          ) : null}
          <button className={BTN_PRIMARY} onClick={() => setNuevoMesAbierto(true)} type="button">
            <Plus className="h-4 w-4" />
            Nuevo mes
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Cada domingo tiene tres celebraciones (7:30, 9:30 y 11:30) y el martes una (7:00 PM). Selecciona quién predica
        y quién cierra; todo se guarda solo y se puede cambiar cuando quieras.
      </p>

      <ErrorBanner message={error} />

      {cargando ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : !meses.length ? (
        <EmptyState>
          <CalendarRange className="mx-auto mb-2 h-6 w-6 text-slate-500" />
          Todavía no has armado ningún mes. Crea el primero y aparecerán todos sus domingos y martes listos para
          asignar.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            <select
              className="border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-emerald-300/60"
              onChange={(evento) => setMesActivoId(evento.target.value)}
              value={mesActivoId ?? ""}
            >
              {meses.map((mes) => (
                <option key={mes.id} value={mes.id}>
                  {mesLabel(mes.mes)} {mes.anio}
                </option>
              ))}
            </select>

            <span className="text-xs text-slate-500">
              {asignadas}/{totalCelebraciones} celebraciones con predicador
            </span>

            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold">
              {guardado === "guardando" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  <span className="text-slate-400">Guardando...</span>
                </>
              ) : guardado === "guardado" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-emerald-300">Guardado</span>
                </>
              ) : null}
            </span>

            {mesActivo ? (
              <button
                className="text-slate-500 transition hover:text-red-300"
                onClick={() => setMesAEliminar(mesActivo)}
                title="Eliminar este mes"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <Field label="Tema del mes">
            <input
              className={INPUT}
              onChange={(evento) => {
                setTema(evento.target.value);
                setGuardado("guardando");
              }}
              placeholder="Ej. Protejamos a nuestra familia"
              value={tema}
            />
          </Field>

          {repeticiones.resumen.length ? (
            <div className="border border-amber-400/40 bg-amber-400/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <TriangleAlert className="h-4 w-4" />
                Repeticiones en el mismo horario
              </p>
              <ul className="mt-1.5 grid gap-0.5 text-xs text-amber-100/90">
                {repeticiones.resumen.map((repeticion) => (
                  <li key={`${repeticion.horario}-${repeticion.predicadorId}`}>
                    <strong>{nombreDe(repeticion.predicadorId)}</strong> predica {repeticion.veces} veces a las{" "}
                    {HORARIO_LABEL[repeticion.horario as keyof typeof HORARIO_LABEL]} este mes.
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-amber-100/70">
                Es solo un aviso: puedes dejarlo así si es lo que quieres.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            {porFecha.map(([fecha, celebraciones]) => {
              const esDomingo = celebraciones.length > 1 || celebraciones[0]?.horario !== "19:00";
              return (
                <section
                  className="border border-white/10 bg-white/5 p-3"
                  key={fecha}
                  style={{ borderLeftWidth: 3, borderLeftColor: esDomingo ? "#6d5bd0" : "#00c875" }}
                >
                  <h4 className="mb-2 text-sm font-bold capitalize text-white">{formatoCompleto(fecha)}</h4>

                  <div className="hidden grid-cols-[76px_1fr_1fr] gap-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
                    <span />
                    <span>Predica</span>
                    <span>Cierre</span>
                  </div>

                  <div className="grid gap-2">
                    {celebraciones.map((asignacion) => (
                      <div
                        className="grid gap-1.5 sm:grid-cols-[76px_1fr_1fr] sm:items-center sm:gap-2"
                        key={asignacion.id}
                      >
                        <span className="text-xs font-bold text-slate-300">{HORARIO_LABEL[asignacion.horario]}</span>

                        <div>
                          <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500 sm:hidden">
                            Predica
                          </span>
                          <SelectorPersona
                            conteos={conteoPredicas}
                            onChange={(valor) => void asignar(asignacion, "predica", valor)}
                            predicadores={activos}
                            repetido={repeticiones.marcados.has(asignacion.id)}
                            valor={{ predicadorId: asignacion.predicador_id, texto: null }}
                          />
                        </div>

                        <div>
                          <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500 sm:hidden">
                            Cierre
                          </span>
                          <SelectorPersona
                            conteos={conteoCierres}
                            onChange={(valor) => void asignar(asignacion, "cierre", valor)}
                            opcionesFijas={[CIERRE_PASTORES]}
                            predicadores={activos}
                            valor={{
                              predicadorId: asignacion.cierre_predicador_id,
                              texto: asignacion.cierre_texto,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            El número entre paréntesis es cuántas veces lleva asignada esa persona en el mes (predicando o cerrando,
            según la columna). Las celdas en ámbar repiten a alguien en el mismo horario.
          </p>

          <Field label="Instrucciones extra (una por línea, salen al pie del Excel)">
            <textarea
              className={`${INPUT} min-h-[110px]`}
              onChange={(evento) => {
                setInstrucciones(evento.target.value);
                setGuardado("guardando");
              }}
              placeholder={"Recordarles invitar a uno más con las tarjetas de invitación\nRecordarles la canasta de peticiones"}
              value={instrucciones}
            />
          </Field>
        </>
      )}

      {rosterAbierto ? (
        <PredicadoresPanel
          onCambio={async () => {
            await cargarCatalogo();
          }}
          onCerrar={() => setRosterAbierto(false)}
          predicadores={predicadores}
          uso={uso}
        />
      ) : null}

      {importarAbierto && mesActivo ? (
        <ImportarTexto
          asignaciones={asignaciones}
          mes={mesActivo}
          onAplicar={async (cambios) => {
            if (cambios.tema) setTema(cambios.tema);
            const { error: aplicarError } = await updateAsignaciones(cambios.asignaciones);
            if (aplicarError) {
              setError(aplicarError);
              return;
            }
            if (cambios.tema) await updateMes(mesActivo.id, { tema: cambios.tema });
            await cargarMesActivo();
            await cargarCatalogo();
            setGuardado("guardado");
          }}
          onCerrar={() => setImportarAbierto(false)}
          onPredicadoresCambiados={cargarCatalogo}
          predicadores={predicadores}
        />
      ) : null}

      {nuevoMesAbierto ? <NuevoMes meses={meses} onCerrar={() => setNuevoMesAbierto(false)} onCrear={crearNuevoMes} /> : null}

      <ConfirmDialog
        message={`Se eliminará ${mesAEliminar ? `${mesLabel(mesAEliminar.mes)} ${mesAEliminar.anio}` : "el mes"} con todas sus asignaciones. El catálogo de predicadores no se toca.`}
        onCancel={() => setMesAEliminar(null)}
        onConfirm={async () => {
          if (!mesAEliminar) return;
          const { error: deleteError } = await deleteMes(mesAEliminar.id);
          setMesAEliminar(null);
          if (deleteError) {
            setError(deleteError);
            return;
          }
          setMesActivoId(null);
          await cargarMeses();
        }}
        open={Boolean(mesAEliminar)}
        title="Eliminar mes"
      />
    </div>
  );
}

/** Alta de un mes: propone el siguiente al ultimo creado. */
function NuevoMes({
  meses,
  onCerrar,
  onCrear,
}: {
  meses: MesPredicasRow[];
  onCerrar: () => void;
  onCrear: (anio: number, mes: number) => Promise<void>;
}) {
  const siguiente = useMemo(() => {
    const hoy = new Date();
    if (!meses.length) return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
    const ultimo = meses[0];
    return ultimo.mes === 12 ? { anio: ultimo.anio + 1, mes: 1 } : { anio: ultimo.anio, mes: ultimo.mes + 1 };
  }, [meses]);

  const [anio, setAnio] = useState(siguiente.anio);
  const [mes, setMes] = useState(siguiente.mes);
  const [creando, setCreando] = useState(false);

  const yaExiste = meses.some((existente) => existente.anio === anio && existente.mes === mes);

  return (
    <Modal ancho="max-w-sm" onClose={onCerrar} titulo="Nuevo mes">
      <form
        className="grid gap-4"
        onSubmit={async (evento) => {
          evento.preventDefault();
          setCreando(true);
          await onCrear(anio, mes);
          setCreando(false);
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mes">
            <select className={INPUT} onChange={(evento) => setMes(Number(evento.target.value))} value={mes}>
              {MESES_LABEL.map((etiqueta, indice) => (
                <option key={etiqueta} value={indice + 1}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Año">
            <input
              className={INPUT}
              max={2100}
              min={2000}
              onChange={(evento) => setAnio(Number(evento.target.value))}
              type="number"
              value={anio}
            />
          </Field>
        </div>

        <p className="text-xs text-slate-500">
          Se crearán todas las celebraciones del mes: tres por domingo y una por martes. Las instrucciones extra se
          copian del último mes.
        </p>

        {yaExiste ? <p className="text-xs text-amber-300">Ese mes ya está creado.</p> : null}

        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cancelar
          </button>
          <button className={BTN_PRIMARY} disabled={creando || yaExiste} type="submit">
            {creando ? "Creando..." : "Crear mes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
