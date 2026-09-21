"use client";

import { ChevronDown, ChevronUp, KeyRound, MessageCircle, Pencil, Printer, ShieldCheck, ShieldOff, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import {
  darAccesoEstudiante,
  obtenerFichaEstudiante,
  obtenerFichasCurso,
  regenerarContrasenaEstudiante,
  setActivoEstudiante,
} from "@/lib/cursos/acceso-estudiantes";
import {
  deleteEstudiante,
  fetchEstadosAccesoGlobal,
  fetchEstudiantes,
  fetchEventos,
  insertEstudiante,
  reincorporarEstudiante,
  retirarEstudiante,
  updateEstudiante,
} from "@/lib/cursos/estudiantes";
import { exportFichasCredencialesPdf } from "@/lib/cursos/fichas-pdf";
import { fetchMensajesNoLeidosPorEstudiante } from "@/lib/cursos/mensajes";
import {
  TIPO_EVENTO_LABELS,
  formatearFechaHora,
  type EstudianteEventoRow,
  type EstudianteRow,
} from "@/lib/cursos/types";
import { ChatEstudianteModal } from "./chat-estudiante-modal";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field } from "./ui";

export function CursoEstudiantesTab({ cursoId, cursoNombre }: { cursoId: string; cursoNombre: string }) {
  const [estudiantes, setEstudiantes] = useState<EstudianteRow[]>([]);
  const [eventos, setEventos] = useState<EstudianteEventoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [carne, setCarne] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [retirarObjetivo, setRetirarObjetivo] = useState<EstudianteRow | null>(null);
  const [editarObjetivo, setEditarObjetivo] = useState<EstudianteRow | null>(null);
  const [eliminarObjetivo, setEliminarObjetivo] = useState<EstudianteRow | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [accesoObjetivo, setAccesoObjetivo] = useState<EstudianteRow | null>(null);
  const [credencial, setCredencial] = useState<{ nombre: string; correo: string; contrasena: string } | null>(null);
  const [imprimiendoFichas, setImprimiendoFichas] = useState(false);
  const [procesandoAccesoId, setProcesandoAccesoId] = useState<string | null>(null);
  const [estadosAcceso, setEstadosAcceso] = useState<Record<string, boolean>>({});
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState<Record<string, number>>({});
  const [chatObjetivo, setChatObjetivo] = useState<EstudianteRow | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [{ data: estudiantesData, error: errorEstudiantes }, { data: eventosData }] = await Promise.all([
      fetchEstudiantes(cursoId),
      fetchEventos(cursoId),
    ]);
    setEstudiantes(estudiantesData);
    setEventos(eventosData);
    setError(errorEstudiantes ?? "");
    setLoading(false);

    const idsConAcceso = estudiantesData.map((e) => e.estudiante_id).filter((id): id is string => Boolean(id));
    const [{ data: estados }, { data: noLeidos }] = await Promise.all([
      fetchEstadosAccesoGlobal(idsConAcceso),
      fetchMensajesNoLeidosPorEstudiante(idsConAcceso),
    ]);
    setEstadosAcceso(estados);
    setMensajesNoLeidos(noLeidos);
  }, [cursoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga estudiantes al cambiar de curso
    void cargar();
  }, [cargar]);

  const handleAgregar = async () => {
    if (!nombre.trim()) {
      setError("El nombre del estudiante es obligatorio.");
      return;
    }
    setGuardando(true);
    const { error: insertError } = await insertEstudiante({
      curso_id: cursoId,
      nombre: nombre.trim(),
      correo: correo.trim() || null,
      carne: carne.trim() || null,
    });
    setGuardando(false);
    if (insertError) {
      setError(insertError);
      return;
    }
    setNombre("");
    setCorreo("");
    setCarne("");
    setError("");
    await cargar();
  };

  const handleEliminar = async () => {
    if (!eliminarObjetivo) return;
    setEliminando(true);
    const { error: deleteError } = await deleteEstudiante(eliminarObjetivo.id);
    setEliminando(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEliminarObjetivo(null);
    await cargar();
  };

  const handleRegenerar = async (estudiante: EstudianteRow) => {
    if (!estudiante.estudiante_id) return;
    setProcesandoAccesoId(estudiante.id);
    const { data, error: regenerarError } = await regenerarContrasenaEstudiante(estudiante.estudiante_id);
    setProcesandoAccesoId(null);
    if (regenerarError || !data) {
      setError(regenerarError ?? "No se pudo regenerar la contraseña.");
      return;
    }
    setCredencial({ nombre: estudiante.nombre, correo: data.correo, contrasena: data.contrasena });
  };

  const handleVerFicha = async (estudiante: EstudianteRow) => {
    if (!estudiante.estudiante_id) return;
    setProcesandoAccesoId(estudiante.id);
    const { data, error: fichaError } = await obtenerFichaEstudiante(estudiante.estudiante_id);
    setProcesandoAccesoId(null);
    if (fichaError || !data) {
      setError(fichaError ?? "No se pudo obtener la ficha.");
      return;
    }
    setCredencial(data);
  };

  const handleToggleActivo = async (estudiante: EstudianteRow, activo: boolean) => {
    if (!estudiante.estudiante_id) return;
    setProcesandoAccesoId(estudiante.id);
    const { error: toggleError } = await setActivoEstudiante(estudiante.estudiante_id, activo);
    setProcesandoAccesoId(null);
    if (toggleError) {
      setError(toggleError);
      return;
    }
    await cargar();
  };

  const handleImprimirFichasCurso = async () => {
    setImprimiendoFichas(true);
    const { data, error: fichasError } = await obtenerFichasCurso(cursoId);
    setImprimiendoFichas(false);
    if (fichasError || !data) {
      setError(fichasError ?? "No se pudieron generar las fichas.");
      return;
    }
    if (!data.fichas.length) {
      setError("Ningún estudiante activo tiene acceso otorgado todavía.");
      return;
    }
    await exportFichasCredencialesPdf(data.fichas, cursoNombre);
  };

  const activos = estudiantes.filter((e) => e.estado === "activo");
  const retirados = estudiantes.filter((e) => e.estado === "retirado");
  const estudiantesPorId = new Map(estudiantes.map((e) => [e.id, e.nombre]));
  const activosConAcceso = activos.filter((e) => e.estudiante_id).length;

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Acceso de estudiantes al curso</p>
          <p className="text-xs text-slate-400">{activosConAcceso} de {activos.length} estudiantes activos con acceso otorgado.</p>
        </div>
        <button className={BTN_GHOST} disabled={imprimiendoFichas || !activosConAcceso} onClick={handleImprimirFichasCurso} type="button">
          <Printer className="h-4 w-4" />
          {imprimiendoFichas ? "Generando..." : "Imprimir fichas de credenciales"}
        </button>
      </div>

      <div className="grid gap-3 border border-white/10 bg-white/6 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="Nombre">
          <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
        </Field>
        <Field label="Correo">
          <input className="field" onChange={(event) => setCorreo(event.target.value)} value={correo} />
        </Field>
        <Field label="Carné">
          <input className="field" onChange={(event) => setCarne(event.target.value)} value={carne} />
        </Field>
        <div className="flex items-end">
          <button className={BTN_PRIMARY} disabled={guardando} onClick={handleAgregar} type="button">
            <UserPlus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-300">Cargando...</p>
      ) : estudiantes.length === 0 ? (
        <EmptyState>Aún no hay estudiantes registrados en este curso.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {[...activos, ...retirados].map((estudiante) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/6 p-3"
              key={estudiante.id}
            >
              <div>
                <div className="text-sm font-semibold text-white">{estudiante.nombre}</div>
                <div className="text-xs text-slate-400">
                  {[estudiante.correo, estudiante.carne].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </div>
                <div className="text-xs text-slate-500">Asignado: {formatearFechaHora(estudiante.asignado_en)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {estudiante.estado === "activo" ? (
                  <AccesoEstudianteControles
                    activoGlobal={estudiante.estudiante_id ? (estadosAcceso[estudiante.estudiante_id] ?? true) : false}
                    estudiante={estudiante}
                    onDarAcceso={() => setAccesoObjetivo(estudiante)}
                    onRegenerar={() => handleRegenerar(estudiante)}
                    onToggleActivo={(activo) => handleToggleActivo(estudiante, activo)}
                    onVerFicha={() => handleVerFicha(estudiante)}
                    procesando={procesandoAccesoId === estudiante.id}
                  />
                ) : null}
                {estudiante.estado === "activo" && estudiante.estudiante_id ? (
                  <button
                    className="relative flex h-9 w-9 items-center justify-center border border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                    onClick={() => setChatObjetivo(estudiante)}
                    title="Chatear con este estudiante"
                    type="button"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {mensajesNoLeidos[estudiante.estudiante_id] ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-bold text-slate-950">
                        {mensajesNoLeidos[estudiante.estudiante_id]}
                      </span>
                    ) : null}
                  </button>
                ) : null}
                <button
                  className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                  onClick={() => setEditarObjetivo(estudiante)}
                  title="Editar datos del estudiante"
                  type="button"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {estudiante.estado === "activo" ? (
                  <button
                    className={BTN_GHOST}
                    onClick={() => setRetirarObjetivo(estudiante)}
                    type="button"
                  >
                    <UserMinus className="h-4 w-4" />
                    Retirar
                  </button>
                ) : (
                  <>
                    <span className="border border-slate-400/40 bg-slate-400/15 px-2 py-1 text-xs font-semibold text-slate-300">
                      Retirado el {formatearFechaHora(estudiante.retirado_en)}
                    </span>
                    <button
                      className={BTN_GHOST}
                      onClick={async () => {
                        const { error: reincorporarError } = await reincorporarEstudiante(estudiante.id, cursoId);
                        if (reincorporarError) {
                          // No recargamos aqui: cargar() limpiaria el mensaje de error.
                          setError(reincorporarError);
                          return;
                        }
                        await cargar();
                      }}
                      type="button"
                    >
                      <UserPlus className="h-4 w-4" />
                      Reincorporar
                    </button>
                    <button
                      className="flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 hover:border-red-300"
                      onClick={() => setEliminarObjetivo(estudiante)}
                      title="Eliminar definitivamente"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-white/10 bg-white/6">
        <button
          className="flex w-full items-center justify-between p-3 text-sm font-semibold text-slate-200"
          onClick={() => setHistorialAbierto((prev) => !prev)}
          type="button"
        >
          Historial de movimientos
          {historialAbierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {historialAbierto ? (
          <div className="grid gap-1.5 border-t border-white/10 p-3">
            {eventos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin movimientos registrados.</p>
            ) : (
              eventos.map((evento) => (
                <p className="text-xs text-slate-400" key={evento.id}>
                  {formatearFechaHora(evento.ocurrido_en)} · {estudiantesPorId.get(evento.estudiante_id) ?? "Estudiante"} ·{" "}
                  {TIPO_EVENTO_LABELS[evento.tipo]}
                  {evento.nota ? ` — ${evento.nota}` : ""}
                </p>
              ))
            )}
          </div>
        ) : null}
      </div>

      {editarObjetivo ? (
        <EditarEstudianteModal
          estudiante={editarObjetivo}
          onClose={() => setEditarObjetivo(null)}
          onGuardado={async () => {
            setEditarObjetivo(null);
            await cargar();
          }}
        />
      ) : null}

      {retirarObjetivo ? (
        <RetirarModal
          cursoId={cursoId}
          estudiante={retirarObjetivo}
          onClose={() => setRetirarObjetivo(null)}
          onRetirado={async () => {
            setRetirarObjetivo(null);
            await cargar();
          }}
        />
      ) : null}

      <ConfirmDialog
        busy={eliminando}
        message="Se eliminará este estudiante de forma definitiva, junto con su historial, asistencias y calificaciones."
        onCancel={() => setEliminarObjetivo(null)}
        onConfirm={handleEliminar}
        open={eliminarObjetivo !== null}
        title="Eliminar estudiante"
      />

      {accesoObjetivo ? (
        <DarAccesoModal
          estudiante={accesoObjetivo}
          onClose={() => setAccesoObjetivo(null)}
          onOtorgado={async (resultado) => {
            setAccesoObjetivo(null);
            if (resultado.contrasena) {
              setCredencial({ nombre: accesoObjetivo.nombre, correo: resultado.correo, contrasena: resultado.contrasena });
            }
            await cargar();
          }}
        />
      ) : null}

      {credencial ? <CredencialModal credencial={credencial} cursoNombre={cursoNombre} onClose={() => setCredencial(null)} /> : null}

      {chatObjetivo?.estudiante_id ? (
        <ChatEstudianteModal
          estudianteId={chatObjetivo.estudiante_id}
          estudianteNombre={chatObjetivo.nombre}
          onClose={() => setChatObjetivo(null)}
          onLeido={async () => {
            const idsConAcceso = estudiantes.map((e) => e.estudiante_id).filter((id): id is string => Boolean(id));
            const { data: noLeidos } = await fetchMensajesNoLeidosPorEstudiante(idsConAcceso);
            setMensajesNoLeidos(noLeidos);
          }}
        />
      ) : null}
    </div>
  );
}

function AccesoEstudianteControles({
  activoGlobal,
  estudiante,
  onDarAcceso,
  onRegenerar,
  onToggleActivo,
  onVerFicha,
  procesando,
}: {
  activoGlobal: boolean;
  estudiante: EstudianteRow;
  onDarAcceso: () => void;
  onRegenerar: () => void;
  onToggleActivo: (activo: boolean) => void;
  onVerFicha: () => void;
  procesando: boolean;
}) {
  if (!estudiante.estudiante_id) {
    return (
      <button className={BTN_GHOST} disabled={procesando} onClick={onDarAcceso} type="button">
        <KeyRound className="h-4 w-4" />
        Dar acceso
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`border px-2 py-1 text-[11px] font-semibold ${
          activoGlobal ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-slate-400/40 bg-slate-400/15 text-slate-300"
        }`}
      >
        {activoGlobal ? "Con acceso" : "Acceso desactivado"}
      </span>
      <button className={BTN_GHOST} disabled={procesando} onClick={onVerFicha} title="Ver/reimprimir su ficha" type="button">
        <Printer className="h-4 w-4" />
      </button>
      <button className={BTN_GHOST} disabled={procesando} onClick={onRegenerar} title="Regenerar contraseña" type="button">
        <KeyRound className="h-4 w-4" />
      </button>
      {activoGlobal ? (
        <button
          className={BTN_GHOST}
          disabled={procesando}
          onClick={() => onToggleActivo(false)}
          title="Desactivar su cuenta (ya no podrá entrar a ningún curso)"
          type="button"
        >
          <ShieldOff className="h-4 w-4" />
        </button>
      ) : (
        <button className={BTN_GHOST} disabled={procesando} onClick={() => onToggleActivo(true)} title="Reactivar su cuenta" type="button">
          <ShieldCheck className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DarAccesoModal({
  estudiante,
  onClose,
  onOtorgado,
}: {
  estudiante: EstudianteRow;
  onClose: () => void;
  onOtorgado: (resultado: { correo: string; contrasena: string | null }) => void | Promise<void>;
}) {
  const [correo, setCorreo] = useState(estudiante.correo ?? "");
  const [contrasena, setContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!correo.trim()) {
      setError("El correo es obligatorio: será su usuario para entrar.");
      return;
    }
    setGuardando(true);
    const { data, error: darError } = await darAccesoEstudiante({
      cursoEstudianteId: estudiante.id,
      nombre: estudiante.nombre,
      correo: correo.trim(),
      contrasena: contrasena.trim() || undefined,
    });
    setGuardando(false);
    if (darError || !data) {
      setError(darError ?? "No se pudo dar acceso.");
      return;
    }
    await onOtorgado({ correo: data.correo, contrasena: data.contrasena });
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-1 text-lg font-semibold text-white">Dar acceso a {estudiante.nombre}</h3>
          <p className="mb-4 text-xs text-slate-400">
            Si este correo ya tiene acceso en otro curso, se usará su misma cuenta.
          </p>
          <div className="grid gap-3">
            <Field label="Correo (será su usuario)">
              <input className="field" onChange={(event) => setCorreo(event.target.value)} value={correo} />
            </Field>
            <Field label="Contraseña (déjalo vacío para generar una)">
              <input className="field" onChange={(event) => setContrasena(event.target.value)} value={contrasena} />
            </Field>
          </div>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleGuardar} type="button">
              {guardando ? "Guardando..." : "Dar acceso"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function CredencialModal({
  credencial,
  cursoNombre,
  onClose,
}: {
  credencial: { nombre: string; correo: string; contrasena: string };
  cursoNombre: string;
  onClose: () => void;
}) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm border border-emerald-300/30 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center gap-2 text-emerald-200">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-white">Credenciales de {credencial.nombre}</h3>
          </div>
          <div className="grid gap-2 border border-white/10 bg-white/6 p-4 text-sm">
            <p className="text-slate-300">
              Usuario: <span className="font-semibold text-white">{credencial.correo}</span>
            </p>
            <p className="text-slate-300">
              Contraseña: <span className="font-semibold text-white">{credencial.contrasena}</span>
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Anótala o imprímela ahora: por seguridad no volverá a mostrarse así de fácil más adelante.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              className={BTN_GHOST}
              onClick={() =>
                exportFichasCredencialesPdf(
                  [{ nombre: credencial.nombre, correo: credencial.correo, contrasena: credencial.contrasena }],
                  cursoNombre,
                )
              }
              type="button"
            >
              <Printer className="h-4 w-4" />
              Imprimir ficha
            </button>
            <button className={BTN_PRIMARY} onClick={onClose} type="button">
              Listo
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function RetirarModal({
  cursoId,
  estudiante,
  onClose,
  onRetirado,
}: {
  cursoId: string;
  estudiante: EstudianteRow;
  onClose: () => void;
  onRetirado: () => void | Promise<void>;
}) {
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleRetirar = async () => {
    setGuardando(true);
    const { error: retirarError } = await retirarEstudiante(estudiante.id, cursoId, nota.trim() || null);
    setGuardando(false);
    if (retirarError) {
      setError(retirarError);
      return;
    }
    await onRetirado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-3 text-lg font-semibold text-white">Retirar a {estudiante.nombre}</h3>
          <Field label="Nota (opcional)">
            <textarea className="field" onChange={(event) => setNota(event.target.value)} rows={2} value={nota} />
          </Field>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleRetirar} type="button">
              {guardando ? "Guardando..." : "Confirmar retiro"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function EditarEstudianteModal({
  estudiante,
  onClose,
  onGuardado,
}: {
  estudiante: EstudianteRow;
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [nombre, setNombre] = useState(estudiante.nombre);
  const [correo, setCorreo] = useState(estudiante.correo ?? "");
  const [carne, setCarne] = useState(estudiante.carne ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre del estudiante es obligatorio.");
      return;
    }
    setGuardando(true);
    const { error: updateError } = await updateEstudiante(estudiante.id, {
      nombre: nombre.trim(),
      correo: correo.trim() || null,
      carne: carne.trim() || null,
    });
    setGuardando(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    await onGuardado();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm border border-white/10 bg-slate-950 p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-4 text-lg font-semibold text-white">Editar estudiante</h3>
          <div className="grid gap-3">
            <Field label="Nombre">
              <input className="field" onChange={(event) => setNombre(event.target.value)} value={nombre} />
            </Field>
            <Field label="Correo">
              <input className="field" onChange={(event) => setCorreo(event.target.value)} value={correo} />
            </Field>
            <Field label="Carné">
              <input className="field" onChange={(event) => setCarne(event.target.value)} value={carne} />
            </Field>
          </div>
          <ErrorBanner message={error} />
          <div className="mt-5 flex justify-end gap-3">
            <button className={BTN_GHOST} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className={BTN_PRIMARY} disabled={guardando} onClick={handleGuardar} type="button">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
