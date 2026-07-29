"use client";

import {
  CalendarRange,
  Check,
  ClipboardList,
  FileSpreadsheet,
  ListOrdered,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT, Modal } from "@/components/ui-comun";
import { formatoCompleto } from "@/lib/fechas";
import {
  crearMes,
  deleteCierrePersona,
  deleteMes,
  deletePredicador,
  fetchAsignaciones,
  fetchCierresPersonas,
  fetchMeses,
  fetchPredicadores,
  fetchTemas,
  fetchUsoPredicadores,
  generarCelebraciones,
  insertCierrePersona,
  insertPredicador,
  updateAsignacion,
  updateCierrePersona,
  updateMes,
  updatePredicador,
  type AsignacionEditable,
} from "@/lib/iglesia/predicas";
import { exportPredicasToExcel } from "@/lib/iglesia/predicas-excel";
import {
  HORARIO_LABEL,
  MESES_LABEL,
  mesLabel,
  type AsignacionPredicaRow,
  type CierrePersonaRow,
  type MesPredicasRow,
  type PredicadorRow,
  type TemaAnioRow,
} from "@/lib/iglesia/types";
import { TextoPlano } from "./texto-plano";
import { PersonasPanel } from "./personas-panel";
import { SelectorPersona, type ValorPersona } from "./selector-persona";
import { TemasPanel } from "./temas-panel";

type Guardado = "limpio" | "guardando" | "guardado";
type Catalogo = "predicadores" | "cierres";

export function PredicasView() {
  const [meses, setMeses] = useState<MesPredicasRow[]>([]);
  const [mesActivoId, setMesActivoId] = useState<string | null>(null);
  const [predicadores, setPredicadores] = useState<PredicadorRow[]>([]);
  const [cierres, setCierres] = useState<CierrePersonaRow[]>([]);
  const [temas, setTemas] = useState<TemaAnioRow[]>([]);
  const [uso, setUso] = useState<Record<string, number>>({});
  const [asignaciones, setAsignaciones] = useState<AsignacionPredicaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState<Guardado>("limpio");

  const [tema, setTema] = useState("");
  const [instrucciones, setInstrucciones] = useState("");

  const [catalogoAbierto, setCatalogoAbierto] = useState<Catalogo | null>(null);
  const [temasAbierto, setTemasAbierto] = useState(false);
  const [textoAbierto, setTextoAbierto] = useState(false);
  const [nuevoMesAbierto, setNuevoMesAbierto] = useState(false);
  const [mesAEliminar, setMesAEliminar] = useState<MesPredicasRow | null>(null);
  const [exportando, setExportando] = useState(false);

  // Celebraciones de domingo en las que se pidio asignar cierre. Normalmente no
  // se designa a nadie (cierra el pastor de la celebracion), asi que la casilla
  // arranca apagada y el selector solo aparece al marcarla.
  const [cierresAbiertos, setCierresAbiertos] = useState<Set<string>>(new Set());

  const mesActivo = meses.find((mes) => mes.id === mesActivoId) ?? null;

  // ----------------------------------------------------------------
  // Carga
  // ----------------------------------------------------------------

  const cargarCatalogos = useCallback(async () => {
    const [predicadoresRes, cierresRes, usoRes, temasRes] = await Promise.all([
      fetchPredicadores(),
      fetchCierresPersonas(),
      fetchUsoPredicadores(),
      fetchTemas(),
    ]);
    setPredicadores(predicadoresRes.data);
    setCierres(cierresRes.data);
    setUso(usoRes.data);
    setTemas(temasRes.data);
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
      await Promise.all([cargarCatalogos(), cargarMeses()]);
      setCargando(false);
    })();
  }, [cargarCatalogos, cargarMeses]);

  const cargarMesActivo = useCallback(async () => {
    if (!mesActivo) {
      setAsignaciones([]);
      return;
    }
    // Completa las celebraciones que falten (por si el mes quedo a medias por
    // un error de red).
    await generarCelebraciones(mesActivo);
    const { data, error: fetchError } = await fetchAsignaciones(mesActivo.id);
    setAsignaciones(data);
    setTema(mesActivo.tema ?? "");
    setInstrucciones(mesActivo.instrucciones ?? "");
    setCierresAbiertos(new Set());
    if (fetchError) setError(fetchError);
  }, [mesActivo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga el calendario al cambiar de mes
    void cargarMesActivo();
  }, [cargarMesActivo]);

  // ----------------------------------------------------------------
  // Autoguardado del tema y las instrucciones
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
      if (asignacion.cierre_persona_id) {
        conteo[asignacion.cierre_persona_id] = (conteo[asignacion.cierre_persona_id] ?? 0) + 1;
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

  const predicadoresActivos = useMemo(() => predicadores.filter((persona) => persona.activo), [predicadores]);
  const cierresActivos = useMemo(() => cierres.filter((persona) => persona.activo), [cierres]);

  // ----------------------------------------------------------------
  // Edicion de celdas (guarda con cada cambio)
  // ----------------------------------------------------------------

  const guardarCambios = async (asignacionId: string, cambios: AsignacionEditable) => {
    setAsignaciones((previas) => previas.map((fila) => (fila.id === asignacionId ? { ...fila, ...cambios } : fila)));
    setGuardado("guardando");

    const { error: updateError } = await updateAsignacion(asignacionId, cambios);
    if (updateError) {
      setError(updateError);
      setGuardado("limpio");
      await cargarMesActivo();
      return;
    }
    setGuardado("guardado");
  };

  const asignarPredica = (asignacion: AsignacionPredicaRow, valor: ValorPersona) =>
    guardarCambios(asignacion.id, { predicador_id: valor.personaId, predicador_texto: valor.texto });

  const asignarCierre = (asignacion: AsignacionPredicaRow, valor: ValorPersona) =>
    guardarCambios(asignacion.id, { cierre_persona_id: valor.personaId, cierre_texto: valor.texto });

  const alternarCierre = (asignacion: AsignacionPredicaRow, activar: boolean) => {
    setCierresAbiertos((previo) => {
      const siguiente = new Set(previo);
      if (activar) siguiente.add(asignacion.id);
      else siguiente.delete(asignacion.id);
      return siguiente;
    });
    // Al desmarcar se limpia lo que hubiera, para que el documento diga "No asignado".
    if (!activar && (asignacion.cierre_persona_id || asignacion.cierre_texto !== null)) {
      void guardarCambios(asignacion.id, { cierre_persona_id: null, cierre_texto: null });
    }
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
      await exportPredicasToExcel({
        asignaciones,
        cierres,
        mes: { ...mesActivo, tema, instrucciones },
        predicadores,
      });
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
  const asignadas = asignaciones.filter(
    (asignacion) => asignacion.predicador_id || asignacion.predicador_texto,
  ).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarRange className="h-5 w-5 text-emerald-200" />
          Prédicas del mes
        </h3>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className={BTN_GHOST} onClick={() => setCatalogoAbierto("predicadores")} type="button">
            <Users className="h-4 w-4" />
            Predicadores ({predicadoresActivos.length})
          </button>
          <button className={BTN_GHOST} onClick={() => setCatalogoAbierto("cierres")} type="button">
            <UserCheck className="h-4 w-4" />
            Cierres ({cierresActivos.length})
          </button>
          <button className={BTN_GHOST} onClick={() => setTemasAbierto(true)} type="button">
            <ListOrdered className="h-4 w-4" />
            Temas del año
          </button>
          {mesActivo ? (
            <>
              <button className={BTN_GHOST} onClick={() => setTextoAbierto(true)} type="button">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Texto para enviar</span>
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
        Cada domingo tiene tres celebraciones (7:30, 9:30 y 11:30) y el martes una (7:00 PM). En domingo el cierre solo
        se pide si marcas la casilla; si no, el documento sale como &quot;No asignado&quot;. Todo se guarda solo.
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
              const esDomingo = celebraciones[0]?.horario !== "19:00";
              return (
                <section
                  className="border border-white/10 bg-white/5 p-3"
                  key={fecha}
                  style={{ borderLeftWidth: 3, borderLeftColor: esDomingo ? "#6d5bd0" : "#00c875" }}
                >
                  <h4 className="mb-2 text-sm font-bold capitalize text-white">{formatoCompleto(fecha)}</h4>

                  <div className="grid gap-3">
                    {celebraciones.map((asignacion) => {
                      const tieneCierre =
                        Boolean(asignacion.cierre_persona_id) || asignacion.cierre_texto !== null;
                      const mostrarCierre = !esDomingo || tieneCierre || cierresAbiertos.has(asignacion.id);

                      return (
                        <div className="grid gap-1.5 sm:grid-cols-[76px_1fr] sm:gap-2" key={asignacion.id}>
                          <span className="pt-2 text-xs font-bold text-slate-300">
                            {HORARIO_LABEL[asignacion.horario]}
                          </span>

                          <div className="grid gap-1.5">
                            <div>
                              <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-500">
                                Predica
                              </span>
                              <SelectorPersona
                                conteos={conteoPredicas}
                                onChange={(valor) => void asignarPredica(asignacion, valor)}
                                personas={predicadoresActivos}
                                placeholderInvitado="Nombre del predicador invitado"
                                repetido={repeticiones.marcados.has(asignacion.id)}
                                valor={{
                                  personaId: asignacion.predicador_id,
                                  texto: asignacion.predicador_texto,
                                }}
                              />
                            </div>

                            {esDomingo ? (
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                                <input
                                  checked={mostrarCierre}
                                  className="h-3.5 w-3.5 accent-emerald-400"
                                  onChange={(evento) => alternarCierre(asignacion, evento.target.checked)}
                                  type="checkbox"
                                />
                                Asignar persona de cierre
                              </label>
                            ) : (
                              <span className="block text-[10px] font-bold uppercase text-slate-500">Cierre</span>
                            )}

                            {mostrarCierre ? (
                              <SelectorPersona
                                conteos={conteoCierres}
                                onChange={(valor) => void asignarCierre(asignacion, valor)}
                                personas={cierresActivos}
                                placeholderInvitado="Nombre de quien cierra"
                                valor={{
                                  personaId: asignacion.cierre_persona_id,
                                  texto: asignacion.cierre_texto,
                                }}
                              />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            El número entre paréntesis es cuántas veces lleva asignada esa persona en el mes (predicando o cerrando,
            según la columna). Las celdas en ámbar repiten a alguien en el mismo horario. &quot;Invitado…&quot; abre un
            espacio para escribir el nombre y no se guarda en ningún catálogo.
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

      {catalogoAbierto === "predicadores" ? (
        <PersonasPanel
          acciones={{
            actualizar: updatePredicador,
            eliminar: deletePredicador,
            insertar: async (payload) => {
              const { error: insertError } = await insertPredicador(payload);
              return { error: insertError };
            },
          }}
          descripcion="Agrega a los predicadores con los que sueles contar. Después los asignas en el calendario del mes."
          etiqueta="del predicador"
          onCambio={cargarCatalogos}
          onCerrar={() => setCatalogoAbierto(null)}
          personas={predicadores}
          titulo="Predicadores disponibles"
          uso={uso}
        />
      ) : null}

      {catalogoAbierto === "cierres" ? (
        <PersonasPanel
          acciones={{
            actualizar: updateCierrePersona,
            eliminar: deleteCierrePersona,
            insertar: async (payload) => {
              const { error: insertError } = await insertCierrePersona(payload);
              return { error: insertError };
            },
          }}
          descripcion="Este listado es aparte del de predicadores: lo que agregues o quites aquí no afecta al otro."
          etiqueta="de la persona"
          onCambio={cargarCatalogos}
          onCerrar={() => setCatalogoAbierto(null)}
          personas={cierres}
          titulo="Personas de cierre"
          uso={uso}
        />
      ) : null}

      {temasAbierto ? (
        <TemasPanel onCambio={cargarCatalogos} onCerrar={() => setTemasAbierto(false)} temas={temas} />
      ) : null}

      {textoAbierto && mesActivo ? (
        <TextoPlano
          asignaciones={asignaciones}
          cierres={cierres}
          mes={{ ...mesActivo, tema, instrucciones }}
          onCerrar={() => setTextoAbierto(false)}
          predicadores={predicadores}
        />
      ) : null}

      {nuevoMesAbierto ? (
        <NuevoMes meses={meses} onCerrar={() => setNuevoMesAbierto(false)} onCrear={crearNuevoMes} temas={temas} />
      ) : null}

      <ConfirmDialog
        message={`Se eliminará ${mesAEliminar ? `${mesLabel(mesAEliminar.mes)} ${mesAEliminar.anio}` : "el mes"} con todas sus asignaciones. Los catálogos y los temas del año no se tocan.`}
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

/** Alta de un mes: propone el siguiente al ultimo creado y muestra su tema. */
function NuevoMes({
  meses,
  onCerrar,
  onCrear,
  temas,
}: {
  meses: MesPredicasRow[];
  onCerrar: () => void;
  onCrear: (anio: number, mes: number) => Promise<void>;
  temas: TemaAnioRow[];
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
  const temaDelAnio = temas.find((fila) => fila.anio === anio && fila.mes === mes)?.tema ?? "";

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

        {temaDelAnio ? (
          <p className="border border-emerald-300/30 bg-emerald-300/8 p-2 text-xs text-emerald-100">
            Tema que se cargará: <strong>{temaDelAnio}</strong>
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Este mes no tiene tema definido en &quot;Temas del año&quot;; podrás escribirlo después.
          </p>
        )}

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
